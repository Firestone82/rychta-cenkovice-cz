// Package httpapi exposes the REST API of the Rychta Čenkovice website.
package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime/debug"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
	_ "time/tzdata" // the server may run in a minimal container without zoneinfo

	"rychtacenkovice.cz/api/internal/auth"
	"rychtacenkovice.cz/api/internal/captcha"
	"rychtacenkovice.cz/api/internal/config"
	"rychtacenkovice.cz/api/internal/mail"
	"rychtacenkovice.cz/api/internal/media"
	"rychtacenkovice.cz/api/internal/store"
)

type Server struct {
	cfg   *config.Config
	st    *store.Store
	auth  *auth.Manager
	mail  *mail.Sender
	tz    *time.Location
	login *limiter // failed sign-in attempts
	forms *limiter // public form submissions

	captcha *captcha.Verifier // nil when hCaptcha is not configured
	webCSP  string
}

func New(cfg *config.Config, st *store.Store, am *auth.Manager, ms *mail.Sender) *Server {
	tz, err := time.LoadLocation("Europe/Prague")
	if err != nil {
		tz = time.UTC
	}
	cv := captcha.New(cfg.HCaptchaSiteKey, cfg.HCaptchaSecret, cfg.HCaptchaVerifyURL)
	return &Server{
		cfg: cfg, st: st, auth: am, mail: ms, tz: tz,
		login:   newLimiter(5, 15*time.Minute),
		forms:   newLimiter(8, 10*time.Minute),
		captcha: cv,
		webCSP:  webCSP(cv.Enabled()),
	}
}

// today is the current date at the house (Europe/Prague).
func (s *Server) today() string { return time.Now().In(s.tz).Format(store.DateLayout) }

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	const v1 = "/api/v1"

	// Public
	mux.HandleFunc("GET "+v1+"/health", s.handleHealth)
	mux.HandleFunc("GET "+v1+"/config", s.handleConfig)
	mux.HandleFunc("GET "+v1+"/apartments", s.handleApartments)
	mux.HandleFunc("GET "+v1+"/apartments/{slug}", s.handleApartment)
	mux.HandleFunc("GET "+v1+"/availability", s.handleAvailability)
	mux.HandleFunc("GET "+v1+"/availability/check", s.handleAvailabilityCheck)
	mux.HandleFunc("POST "+v1+"/bookings", s.handleCreateBookingRequest)
	mux.HandleFunc("POST "+v1+"/contact", s.handleContact)
	mux.HandleFunc("GET "+v1+"/photos", s.handlePhotos)
	mux.HandleFunc("GET "+v1+"/photos/covers", s.handlePhotoCovers)
	mux.HandleFunc("GET "+v1+"/news", s.handleNews)

	// Authentication
	mux.HandleFunc("POST "+v1+"/auth/login", s.handleLogin)
	mux.HandleFunc("POST "+v1+"/auth/refresh", s.handleRefresh)
	mux.HandleFunc("POST "+v1+"/auth/logout", s.handleLogout)
	mux.Handle("GET "+v1+"/auth/me", s.requireAdmin(s.handleMe))
	mux.Handle("POST "+v1+"/auth/change-password", s.requireAdmin(s.handleChangePassword))

	// Administration (access token required)
	admin := func(pattern string, h http.HandlerFunc) { mux.Handle(pattern, s.requireAdmin(h)) }
	admin("GET "+v1+"/admin/dashboard", s.handleDashboard)
	admin("GET "+v1+"/admin/bookings", s.handleAdminBookings)
	admin("POST "+v1+"/admin/bookings", s.handleAdminCreateBooking)
	admin("GET "+v1+"/admin/bookings/{id}", s.handleAdminBooking)
	admin("PATCH "+v1+"/admin/bookings/{id}", s.handleAdminUpdateBooking)
	admin("DELETE "+v1+"/admin/bookings/{id}", s.handleAdminDeleteBooking)
	admin("GET "+v1+"/admin/messages", s.handleAdminMessages)
	admin("PATCH "+v1+"/admin/messages/{id}", s.handleAdminUpdateMessage)
	admin("DELETE "+v1+"/admin/messages/{id}", s.handleAdminDeleteMessage)
	admin("GET "+v1+"/admin/apartments", s.handleAdminApartments)
	admin("PATCH "+v1+"/admin/apartments/{id}", s.handleAdminUpdateApartment)
	admin("GET "+v1+"/admin/photos", s.handleAdminPhotos)
	admin("POST "+v1+"/admin/photos", s.handleAdminUploadPhoto)
	admin("PATCH "+v1+"/admin/photos/{id}", s.handleAdminUpdatePhoto)
	admin("DELETE "+v1+"/admin/photos/{id}", s.handleAdminDeletePhoto)
	admin("GET "+v1+"/admin/news", s.handleAdminNews)
	admin("POST "+v1+"/admin/news", s.handleAdminSaveNews)
	admin("PATCH "+v1+"/admin/news/{id}", s.handleAdminSaveNews)
	admin("DELETE "+v1+"/admin/news/{id}", s.handleAdminDeleteNews)

	mux.HandleFunc(v1+"/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "Unknown API endpoint.")
	})

	mux.HandleFunc("GET /media/{name}", s.handleMedia)

	if s.cfg.WebDir != "" {
		mux.HandleFunc("/", s.handleWebApp)
	}

	return s.recoverer(s.logger(s.securityHeaders(s.cors(mux))))
}

// ---------- responses ----------

type apiError struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": apiError{Code: code, Message: message}})
}

func writeValidation(w http.ResponseWriter, fields map[string]string) {
	writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": apiError{
		Code: "validation", Message: "Some fields are missing or invalid.", Fields: fields,
	}})
}

func (s *Server) serverError(w http.ResponseWriter, r *http.Request, err error) {
	slog.Error("request failed", "method", r.Method, "path", r.URL.Path, "err", err)
	writeError(w, http.StatusInternalServerError, "internal", "Something went wrong on the server.")
}

func (s *Server) storeError(w http.ResponseWriter, r *http.Request, err error) {
	var unavailable *store.ErrUnavailable
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
	case errors.As(err, &unavailable):
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":         apiError{Code: "unavailable", Message: "Some of the selected apartments are no longer free for these dates."},
			"apartment_ids": unavailable.ApartmentIDs,
		})
	default:
		s.serverError(w, r, err)
	}
}

// decode reads a JSON body of at most 1 MiB.
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "The request body is not valid JSON.")
		return false
	}
	return true
}

func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}

// ---------- middleware ----------

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (s *Server) logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			slog.Info("http", "method", r.Method, "path", r.URL.Path, "status", sw.status, "ms", time.Since(start).Milliseconds(), "ip", s.clientIP(r))
		}
	})
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic", "err", rec, "stack", string(debug.Stack()))
				writeError(w, http.StatusInternalServerError, "internal", "Something went wrong on the server.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// webCSP is the content security policy of the website. With hCaptcha switched on, its
// script, styles, frame and requests are allowed from hcaptcha.com and nowhere else.
func webCSP(hcaptcha bool) string {
	h := ""
	if hcaptcha {
		h = " https://hcaptcha.com https://*.hcaptcha.com"
	}
	return "default-src 'self'; script-src 'self'" + h + "; style-src 'self' 'unsafe-inline'" + h + "; img-src 'self' data:; " +
		"font-src 'self'; media-src 'self'; connect-src 'self'" + h + "; frame-src" + orNone(h) + "; object-src 'none'; " +
		"base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
}

func orNone(s string) string {
	if s == "" {
		return " 'none'"
	}
	return s
}

// hashedFile matches build output whose name carries a content hash (main-PZMW6HP2.js).
var hashedFile = regexp.MustCompile(`-[A-Z0-9]{8}\.(js|css)$`)

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("X-Frame-Options", "DENY")
		if s.cfg.Env == "production" {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
			if strings.Contains(r.URL.Path, "/auth/") || strings.Contains(r.URL.Path, "/admin/") {
				h.Set("Cache-Control", "no-store")
			}
		} else {
			// The website loads everything from its own origin. Inline styles stay allowed
			// because Angular injects component styles at runtime; scripts are never inline.
			h.Set("Content-Security-Policy", s.webCSP)
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) originAllowed(origin string) bool {
	return slices.Contains(s.cfg.AllowedOrigins, strings.TrimRight(origin, "/"))
}

// cors allows the configured website origins to call the API with credentials.
// Requests without an Origin header (same-origin, curl, the dev proxy) pass through.
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && s.originAllowed(origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Allow-Credentials", "true")
			h.Add("Vary", "Origin")
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With")
				h.Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) clientIP(r *http.Request) string {
	if s.cfg.TrustProxy {
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			parts := strings.Split(fwd, ",")
			return strings.TrimSpace(parts[len(parts)-1])
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

type ctxKey int

const userKey ctxKey = 1

type sessionUser struct {
	ID   int64
	Role string
	Name string
}

func currentUser(r *http.Request) *sessionUser {
	u, _ := r.Context().Value(userKey).(*sessionUser)
	return u
}

// requireAdmin checks the short-lived access token from the Authorization header.
func (s *Server) requireAdmin(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			w.Header().Set("WWW-Authenticate", `Bearer realm="rychta-admin"`)
			writeError(w, http.StatusUnauthorized, "unauthorized", "Sign in to continue.")
			return
		}
		claims, id, err := s.auth.ParseAccess(token)
		if err != nil {
			w.Header().Set("WWW-Authenticate", `Bearer realm="rychta-admin", error="invalid_token"`)
			writeError(w, http.StatusUnauthorized, "token_expired", "The access token is invalid or has expired.")
			return
		}
		if claims.Role != "admin" {
			writeError(w, http.StatusForbidden, "forbidden", "This account cannot use the administration.")
			return
		}
		ctx := context.WithValue(r.Context(), userKey, &sessionUser{ID: id, Role: claims.Role, Name: claims.Name})
		next(w, r.WithContext(ctx))
	})
}

// ---------- rate limiting ----------

type limiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	hits   map[string]*bucket
}

type bucket struct {
	count int
	reset time.Time
}

func newLimiter(max int, window time.Duration) *limiter {
	return &limiter{max: max, window: window, hits: map[string]*bucket{}}
}

// blocked reports whether key has used up its allowance, and for how long.
func (l *limiter) blocked(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.hits[key]
	if !ok || time.Now().After(b.reset) {
		return false, 0
	}
	return b.count >= l.max, time.Until(b.reset)
}

func (l *limiter) hit(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if len(l.hits) > 10000 {
		for k, b := range l.hits {
			if now.After(b.reset) {
				delete(l.hits, k)
			}
		}
	}
	b, ok := l.hits[key]
	if !ok || now.After(b.reset) {
		l.hits[key] = &bucket{count: 1, reset: now.Add(l.window)}
		return
	}
	b.count++
}

func (l *limiter) clear(key string) {
	l.mu.Lock()
	delete(l.hits, key)
	l.mu.Unlock()
}

func tooMany(w http.ResponseWriter, wait time.Duration) {
	w.Header().Set("Retry-After", strconv.Itoa(int(wait.Seconds())+1))
	writeJSON(w, http.StatusTooManyRequests, map[string]any{
		"error":       apiError{Code: "rate_limited", Message: "Too many attempts. Try again later."},
		"retry_after": int(wait.Seconds()) + 1,
	})
}

// ---------- static files ----------

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if err := s.st.DB.PingContext(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "unavailable", "Database is not reachable.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleMedia(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if !media.ValidName(name) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, filepath.Join(s.cfg.MediaDir, name))
}

// handleWebApp serves the built Angular application with a fallback to index.html
// for client-side routes (used when the API and the website run as one process).
func (s *Server) handleWebApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.NotFound(w, r)
		return
	}
	clean := filepath.Clean("/" + r.URL.Path)
	full := filepath.Join(s.cfg.WebDir, clean)
	if info, err := os.Stat(full); err == nil && !info.IsDir() {
		switch {
		case hashedFile.MatchString(clean):
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		case filepath.Ext(clean) == ".html":
			w.Header().Set("Cache-Control", "no-cache")
		default: // fonts, bundled images, the video, icons
			w.Header().Set("Cache-Control", "public, max-age=604800")
		}
		http.ServeFile(w, r, full)
		return
	}
	if filepath.Ext(clean) != "" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, filepath.Join(s.cfg.WebDir, "index.html"))
}
