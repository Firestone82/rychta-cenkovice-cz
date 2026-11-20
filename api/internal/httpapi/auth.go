package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"rychtacenkovice.cz/api/internal/auth"
	"rychtacenkovice.cz/api/internal/store"
)

const (
	refreshCookie = "rc_refresh"
	// The refresh cookie is only ever sent to the auth endpoints.
	refreshCookiePath = "/api/v1/auth"
)

func (s *Server) setRefreshCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    token,
		Path:     refreshCookiePath,
		Expires:  expires,
		MaxAge:   int(time.Until(expires).Seconds()),
		HttpOnly: true, // not readable from JavaScript
		Secure:   s.cfg.CookieSecure,
		SameSite: http.SameSiteStrictMode,
	})
}

func (s *Server) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: refreshCookie, Value: "", Path: refreshCookiePath, MaxAge: -1,
		HttpOnly: true, Secure: s.cfg.CookieSecure, SameSite: http.SameSiteStrictMode,
	})
}

// sameSiteRequest hardens the cookie-authenticated endpoints against CSRF on top of
// SameSite=Strict: the custom header cannot be sent cross-origin without a CORS
// preflight, and a present Origin header must be one of the allowed origins.
func (s *Server) sameSiteRequest(w http.ResponseWriter, r *http.Request) bool {
	if r.Header.Get("X-Requested-With") != "rychta-web" {
		writeError(w, http.StatusForbidden, "forbidden", "Missing X-Requested-With header.")
		return false
	}
	if origin := r.Header.Get("Origin"); origin != "" && !s.originAllowed(origin) {
		scheme := "http://"
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			scheme = "https://"
		}
		if origin != scheme+r.Host {
			writeError(w, http.StatusForbidden, "forbidden", "Origin not allowed.")
			return false
		}
	}
	return true
}

type sessionResponse struct {
	AccessToken string      `json:"access_token"`
	TokenType   string      `json:"token_type"`
	ExpiresIn   int         `json:"expires_in"`
	User        *store.User `json:"user"`
}

func (s *Server) writeSession(w http.ResponseWriter, r *http.Request, u *store.User, refresh *auth.Refresh) {
	access, _, err := s.auth.IssueAccess(u.ID, u.Role, u.Name)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	s.setRefreshCookie(w, refresh.Token, refresh.ExpiresAt)
	writeJSON(w, http.StatusOK, sessionResponse{
		AccessToken: access,
		TokenType:   "Bearer",
		ExpiresIn:   int(s.auth.AccessTTL().Seconds()),
		User:        u,
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !s.sameSiteRequest(w, r) {
		return
	}
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decode(w, r, &in) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	ip := s.clientIP(r)
	keys := []string{"ip:" + ip, "acct:" + email}
	for _, k := range keys {
		if blocked, wait := s.login.blocked(k); blocked {
			tooMany(w, wait)
			return
		}
	}
	if email == "" || in.Password == "" || len(in.Password) > 256 {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Wrong e-mail or password.")
		return
	}
	u, err := s.st.UserByEmail(r.Context(), email)
	ok := false
	switch {
	case errors.Is(err, store.ErrNotFound):
		auth.VerifyDummy(in.Password) // same work for unknown accounts
	case err != nil:
		s.serverError(w, r, err)
		return
	default:
		ok, _ = auth.VerifyPassword(u.PasswordHash, in.Password)
	}
	if !ok {
		for _, k := range keys {
			s.login.hit(k)
		}
		slog.Warn("auth: failed sign-in", "email", email, "ip", ip)
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Wrong e-mail or password.")
		return
	}
	s.login.clear("acct:" + email)
	refresh, err := s.auth.StartSession(r.Context(), u.ID, r.UserAgent(), ip)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	slog.Info("auth: signed in", "user", u.ID, "ip", ip)
	s.writeSession(w, r, u, refresh)
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	if !s.sameSiteRequest(w, r) {
		return
	}
	cookie, err := r.Cookie(refreshCookie)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "no_session", "Not signed in.")
		return
	}
	userID, next, err := s.auth.Rotate(r.Context(), cookie.Value, r.UserAgent(), s.clientIP(r))
	switch {
	case errors.Is(err, auth.ErrRefreshRace):
		// Another tab refreshed a moment ago; the browser already has the new cookie.
		writeError(w, http.StatusConflict, "refresh_race", "The session was just refreshed. Retry.")
		return
	case errors.Is(err, auth.ErrTokenReuse):
		slog.Warn("auth: refresh token reuse, session revoked", "ip", s.clientIP(r))
		s.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "session_revoked", "The session was ended for security reasons. Sign in again.")
		return
	case errors.Is(err, auth.ErrInvalidToken):
		s.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "session_expired", "The session has expired. Sign in again.")
		return
	case err != nil:
		s.serverError(w, r, err)
		return
	}
	u, err := s.st.UserByID(r.Context(), userID)
	if err != nil {
		s.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "session_expired", "The session has expired. Sign in again.")
		return
	}
	s.writeSession(w, r, u, next)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if !s.sameSiteRequest(w, r) {
		return
	}
	if cookie, err := r.Cookie(refreshCookie); err == nil {
		if err := s.auth.RevokeByToken(r.Context(), cookie.Value); err != nil {
			s.serverError(w, r, err)
			return
		}
	}
	s.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	u, err := s.st.UserByID(r.Context(), currentUser(r).ID)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Current string `json:"current_password"`
		New     string `json:"new_password"`
	}
	if !decode(w, r, &in) {
		return
	}
	u, err := s.st.UserByID(r.Context(), currentUser(r).ID)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	if ok, _ := auth.VerifyPassword(u.PasswordHash, in.Current); !ok {
		writeValidation(w, map[string]string{"current_password": "wrong"})
		return
	}
	if len([]rune(in.New)) < auth.MinPasswordLength || len(in.New) > 256 {
		writeValidation(w, map[string]string{"new_password": "too_short"})
		return
	}
	hash, err := auth.HashPassword(in.New)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	if err := s.st.SetPassword(r.Context(), u.ID, hash); err != nil {
		s.serverError(w, r, err)
		return
	}
	// Sign out everywhere, then start a fresh session for this browser.
	if err := s.auth.RevokeUser(r.Context(), u.ID); err != nil {
		s.serverError(w, r, err)
		return
	}
	refresh, err := s.auth.StartSession(r.Context(), u.ID, r.UserAgent(), s.clientIP(r))
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	s.writeSession(w, r, u, refresh)
}
