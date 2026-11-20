package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"rychtacenkovice.cz/api/internal/auth"
	"rychtacenkovice.cz/api/internal/config"
	"rychtacenkovice.cz/api/internal/db"
	"rychtacenkovice.cz/api/internal/mail"
	"rychtacenkovice.cz/api/internal/seed"
	"rychtacenkovice.cz/api/internal/store"
)

type testEnv struct {
	t      *testing.T
	srv    *httptest.Server
	client *http.Client
	st     *store.Store
	am     *auth.Manager
	token  string
}

func newEnv(t *testing.T) *testEnv { t.Helper(); return newEnvWith(t, nil) }

// newEnvWith starts a test server; adjust may change the configuration first.
func newEnvWith(t *testing.T, adjust func(*config.Config)) *testEnv {
	t.Helper()
	dir := t.TempDir()
	conn, err := db.Open(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	st := store.New(conn)
	if err := seed.Content(context.Background(), st); err != nil {
		t.Fatal(err)
	}
	hash, _ := auth.HashPassword("correct horse battery")
	if _, err := st.CreateUser(context.Background(), "admin@example.com", "Admin", hash); err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{Env: "development", MediaDir: filepath.Join(dir, "media"), AllowedOrigins: []string{"http://localhost:4200"},
		MailTo: "owner@example.com", MailFrom: "Rychta <noreply@example.com>", PublicURL: "http://localhost:4200"}
	if adjust != nil {
		adjust(cfg)
	}
	am := auth.NewManager(conn, []byte("0123456789abcdef0123456789abcdef"), "test", 10*time.Minute, time.Hour, 24*time.Hour)
	srv := httptest.NewServer(New(cfg, st, am, mail.NewSender(config.SMTP{}, cfg.MailFrom, "")).Handler())
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &testEnv{t: t, srv: srv, client: &http.Client{Jar: jar}, st: st, am: am}
}

func (e *testEnv) do(method, path string, body any, out any) int {
	e.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req, _ := http.NewRequest(method, e.srv.URL+"/api/v1"+path, &buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Requested-With", "rychta-web")
	if e.token != "" {
		req.Header.Set("Authorization", "Bearer "+e.token)
	}
	resp, err := e.client.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer resp.Body.Close()
	if out != nil {
		_ = json.NewDecoder(resp.Body).Decode(out)
	}
	return resp.StatusCode
}

func (e *testEnv) login() {
	e.t.Helper()
	var s sessionResponse
	if code := e.do("POST", "/auth/login", map[string]string{"email": "admin@example.com", "password": "correct horse battery"}, &s); code != 200 {
		e.t.Fatalf("login: status %d", code)
	}
	e.token = s.AccessToken
}

func day(offset int) string { return time.Now().AddDate(0, 0, offset).Format(store.DateLayout) }

func TestBookingFlow(t *testing.T) {
	e := newEnv(t)
	var apts struct{ Items []store.Apartment }
	if code := e.do("GET", "/apartments", nil, &apts); code != 200 || len(apts.Items) != 6 {
		t.Fatalf("apartments: status %d, %d items", code, len(apts.Items))
	}
	a1, a2 := apts.Items[0].ID, apts.Items[1].ID
	req := map[string]any{"apartment_ids": []int64{a1}, "check_in": day(10), "check_out": day(13), "guests": 3,
		"name": "Jan Test", "email": "jan@example.com", "phone": "+420 600 000 000", "consent": true, "language": "cs"}

	var created struct{ Code, Status string }
	if code := e.do("POST", "/bookings", req, &created); code != 201 || created.Status != "pending" || created.Code == "" {
		t.Fatalf("create booking: status %d %+v", code, created)
	}
	// The same apartment cannot be requested again for overlapping dates.
	req["check_in"], req["check_out"] = day(12), day(15)
	if code := e.do("POST", "/bookings", req, nil); code != http.StatusConflict {
		t.Fatalf("overlap: want 409, got %d", code)
	}
	// Arriving on the previous guest's departure day is fine.
	req["check_in"], req["check_out"] = day(13), day(15)
	if code := e.do("POST", "/bookings", req, nil); code != 201 {
		t.Fatalf("back-to-back: want 201, got %d", code)
	}
	// Validation: too many guests, missing consent, past date.
	bad := map[string]any{"apartment_ids": []int64{a2}, "check_in": day(-1), "check_out": day(2), "guests": 40,
		"name": "X", "email": "nope", "phone": "1", "consent": false}
	var verr struct {
		Error struct{ Fields map[string]string }
	}
	if code := e.do("POST", "/bookings", bad, &verr); code != 422 {
		t.Fatalf("validation: want 422, got %d", code)
	}
	for _, f := range []string{"name", "email", "phone", "consent", "check_in", "guests"} {
		if verr.Error.Fields[f] == "" {
			t.Errorf("expected a validation error for %q, got %v", f, verr.Error.Fields)
		}
	}
	// Public availability shows the held dates without guest data.
	var av struct{ Ranges []store.OccupiedRange }
	if code := e.do("GET", "/availability?from="+day(0)+"&to="+day(30), nil, &av); code != 200 || len(av.Ranges) != 2 {
		t.Fatalf("availability: status %d, ranges %+v", code, av.Ranges)
	}
	if av.Ranges[0].Status != "pending" {
		t.Errorf("want pending range, got %+v", av.Ranges[0])
	}

	// Admin endpoints need a token.
	if code := e.do("GET", "/admin/bookings", nil, nil); code != 401 {
		t.Fatalf("admin without token: want 401, got %d", code)
	}
	e.login()
	var list struct{ Items []store.Booking }
	if code := e.do("GET", "/admin/bookings?status=pending", nil, &list); code != 200 || len(list.Items) != 2 {
		t.Fatalf("admin list: status %d, %d items", code, len(list.Items))
	}
	// Confirm the first request, cancel the second; the cancelled dates become free again.
	var b store.Booking
	if code := e.do("PATCH", "/admin/bookings/"+itoa(list.Items[0].ID), map[string]any{"status": "confirmed", "notify": true}, &b); code != 200 || b.Status != "confirmed" {
		t.Fatalf("confirm: status %d %+v", code, b)
	}
	if code := e.do("PATCH", "/admin/bookings/"+itoa(list.Items[1].ID), map[string]any{"status": "cancelled"}, nil); code != 200 {
		t.Fatalf("cancel: status %d", code)
	}
	// Manual booking by the administrator over several apartments.
	manual := map[string]any{"apartment_ids": []int64{a1, a2}, "check_in": day(13), "check_out": day(16), "guests": 8, "name": "Skupina Novák", "phone": "+420 777 111 222"}
	if code := e.do("POST", "/admin/bookings", manual, &b); code != 201 || b.Status != "confirmed" || b.Source != "admin" || len(b.ApartmentIDs) != 2 {
		t.Fatalf("manual booking: status %d %+v", code, b)
	}
	// Moving it onto the confirmed stay is refused.
	if code := e.do("PATCH", "/admin/bookings/"+itoa(b.ID), map[string]any{"check_in": day(11)}, nil); code != http.StatusConflict {
		t.Fatalf("admin overlap: want 409, got %d", code)
	}
	// A maintenance block needs no guest.
	block := map[string]any{"kind": "block", "apartment_ids": []int64{a2}, "check_in": day(20), "check_out": day(22), "name": "Malování"}
	if code := e.do("POST", "/admin/bookings", block, &b); code != 201 || b.Kind != "block" {
		t.Fatalf("block: status %d %+v", code, b)
	}
}

func itoa(v int64) string { b, _ := json.Marshal(v); return string(b) }

func TestAuthRefreshRotation(t *testing.T) {
	e := newEnv(t)
	if code := e.do("POST", "/auth/login", map[string]string{"email": "admin@example.com", "password": "wrong"}, nil); code != 401 {
		t.Fatalf("wrong password: want 401, got %d", code)
	}
	e.login()
	if code := e.do("GET", "/auth/me", nil, nil); code != 200 {
		t.Fatalf("me: %d", code)
	}
	first := e.refreshCookie()

	var s sessionResponse
	if code := e.do("POST", "/auth/refresh", nil, &s); code != 200 || s.AccessToken == "" {
		t.Fatalf("refresh: %d", code)
	}
	second := e.refreshCookie()
	if first == second {
		t.Fatal("refresh token was not rotated")
	}

	// Replaying the old token right away is treated as a two-tab race...
	if _, _, err := e.am.Rotate(context.Background(), first, "", ""); err != auth.ErrRefreshRace {
		t.Fatalf("want ErrRefreshRace, got %v", err)
	}
	// ...but replaying it later revokes the whole session, including the newest token.
	e.am.SetClock(func() time.Time { return time.Now().Add(time.Minute) })
	if _, _, err := e.am.Rotate(context.Background(), first, "", ""); err != auth.ErrTokenReuse {
		t.Fatalf("want ErrTokenReuse, got %v", err)
	}
	if code := e.do("POST", "/auth/refresh", nil, nil); code != 401 {
		t.Fatalf("refresh after reuse: want 401, got %d", code)
	}

	// An expired access token is rejected.
	e.am.SetClock(func() time.Time { return time.Now().Add(11 * time.Minute) })
	if code := e.do("GET", "/auth/me", nil, nil); code != 401 {
		t.Fatalf("expired access token: want 401, got %d", code)
	}
}

func (e *testEnv) refreshCookie() string {
	req, _ := http.NewRequest("GET", e.srv.URL+refreshCookiePath, nil)
	for _, c := range e.client.Jar.Cookies(req.URL) {
		if c.Name == refreshCookie {
			return c.Value
		}
	}
	e.t.Fatal("no refresh cookie")
	return ""
}

func TestLoginRateLimitAndCSRFHeader(t *testing.T) {
	e := newEnv(t)
	for i := 0; i < 5; i++ {
		e.do("POST", "/auth/login", map[string]string{"email": "admin@example.com", "password": "wrong"}, nil)
	}
	if code := e.do("POST", "/auth/login", map[string]string{"email": "admin@example.com", "password": "correct horse battery"}, nil); code != 429 {
		t.Fatalf("want 429 after 5 failures, got %d", code)
	}
	req, _ := http.NewRequest("POST", e.srv.URL+"/api/v1/auth/refresh", nil)
	resp, err := e.client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 403 {
		t.Fatalf("refresh without X-Requested-With: want 403, got %d", resp.StatusCode)
	}
}

func TestContactAndLogout(t *testing.T) {
	e := newEnv(t)
	msg := map[string]any{"name": "Eva", "email": "eva@example.com", "message": "Dobrý den, máte volno o Silvestru?", "consent": true}
	if code := e.do("POST", "/contact", msg, nil); code != 204 {
		t.Fatalf("contact: %d", code)
	}
	e.login()
	var list struct{ Items []store.Message }
	if code := e.do("GET", "/admin/messages", nil, &list); code != 200 || len(list.Items) != 1 || list.Items[0].Status != "new" {
		t.Fatalf("messages: %d %+v", code, list.Items)
	}
	// Creating a booking from the message links the two and marks the message as read.
	var apts struct{ Items []store.Apartment }
	e.do("GET", "/apartments", nil, &apts)
	var b store.Booking
	in := map[string]any{"apartment_ids": []int64{apts.Items[2].ID}, "check_in": day(40), "check_out": day(42), "guests": 4,
		"name": "Eva", "email": "eva@example.com", "message_id": list.Items[0].ID}
	if code := e.do("POST", "/admin/bookings", in, &b); code != 201 {
		t.Fatalf("booking from message: %d", code)
	}
	e.do("GET", "/admin/messages", nil, &list)
	if list.Items[0].Status != "read" || list.Items[0].BookingID == nil || *list.Items[0].BookingID != b.ID {
		t.Fatalf("message not linked: %+v", list.Items[0])
	}
	if code := e.do("POST", "/auth/logout", nil, nil); code != 204 {
		t.Fatalf("logout: %d", code)
	}
	if code := e.do("POST", "/auth/refresh", nil, nil); code != 401 {
		t.Fatalf("refresh after logout: want 401, got %d", code)
	}
}

func TestApartmentOptions(t *testing.T) {
	e := newEnv(t)
	e.login()
	const path = "/admin/apartments/1"

	if got := e.do("PATCH", path, map[string]any{"flat_type": "castle"}, nil); got != http.StatusUnprocessableEntity {
		t.Fatalf("unknown flat type: got %d", got)
	}
	if got := e.do("PATCH", path, map[string]any{"amenities": []string{"wifi", "helipad"}}, nil); got != http.StatusUnprocessableEntity {
		t.Fatalf("unknown amenity: got %d", got)
	}
	if got := e.do("PATCH", path, map[string]any{"floor": 7}, nil); got != http.StatusUnprocessableEntity {
		t.Fatalf("unknown floor: got %d", got)
	}

	var a store.Apartment
	body := map[string]any{
		"flat_type": "2+kk",
		"floor":     2,
		"amenities": []string{"wifi", "fridge", "wifi"},
		"labels": []map[string]string{
			{"cs": " Pro rodiny ", "en": "Good for families"},
			{"cs": "", "en": "Attic"},
			{"cs": "", "en": ""},
		},
	}
	if got := e.do("PATCH", path, body, &a); got != http.StatusOK {
		t.Fatalf("valid options: got %d", got)
	}
	if a.FlatType != "2+kk" || a.Floor != 2 {
		t.Fatalf("flat type or floor not saved: %+v", a)
	}
	// Amenities come back once each, in the order of the fixed list.
	if len(a.Amenities) != 2 || a.Amenities[0] != "fridge" || a.Amenities[1] != "wifi" {
		t.Fatalf("amenities: %v", a.Amenities)
	}
	// Labels are trimmed, an English-only label is used for Czech too, empty ones are dropped.
	if len(a.Labels) != 2 || a.Labels[0].Cs != "Pro rodiny" || a.Labels[1].Cs != "Attic" {
		t.Fatalf("labels: %+v", a.Labels)
	}

	var public store.Apartment
	if got := e.do("GET", "/apartments/apartman-1", nil, &public); got != http.StatusOK || public.FlatType != "2+kk" || len(public.Labels) != 2 {
		t.Fatalf("public apartment: %d %+v", got, public)
	}
}

// With hCaptcha keys set, both public forms need an answer that the hCaptcha service accepts.
func TestFormsNeedCaptcha(t *testing.T) {
	down := false
	var seen url.Values
	verify := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if down {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		_ = r.ParseForm()
		seen = r.PostForm
		ok := r.PostForm.Get("secret") == "test-secret" && r.PostForm.Get("response") == "good-answer"
		_ = json.NewEncoder(w).Encode(map[string]any{"success": ok})
	}))
	defer verify.Close()
	e := newEnvWith(t, func(c *config.Config) {
		c.HCaptchaSiteKey, c.HCaptchaSecret, c.HCaptchaVerifyURL = "test-sitekey", "test-secret", verify.URL
	})

	var conf struct {
		Key string `json:"hcaptcha_sitekey"`
	}
	if code := e.do("GET", "/config", nil, &conf); code != 200 || conf.Key != "test-sitekey" {
		t.Fatalf("config: %d %+v", code, conf)
	}

	type verr struct {
		Error struct {
			Code   string
			Fields map[string]string
		}
	}
	msg := map[string]any{"name": "Eva", "email": "eva@example.com", "message": "Dobrý den, máte volno?", "consent": true}
	var got verr
	if code := e.do("POST", "/contact", msg, &got); code != 422 || got.Error.Fields["captcha"] != "required" {
		t.Fatalf("contact without an answer: %d %+v", code, got)
	}
	msg["captcha_token"] = "wrong-answer"
	got = verr{}
	if code := e.do("POST", "/contact", msg, &got); code != 422 || got.Error.Fields["captcha"] != "invalid" {
		t.Fatalf("contact with a wrong answer: %d %+v", code, got)
	}
	// Other mistakes are reported first, without spending the answer.
	seen = nil
	msg["captcha_token"], msg["email"] = "good-answer", "nope"
	got = verr{}
	if code := e.do("POST", "/contact", msg, &got); code != 422 || got.Error.Fields["email"] == "" || seen != nil {
		t.Fatalf("contact with a bad e-mail: %d %+v, hCaptcha asked: %v", code, got, seen != nil)
	}
	msg["email"] = "eva@example.com"
	if code := e.do("POST", "/contact", msg, nil); code != 204 {
		t.Fatalf("contact with a good answer: %d", code)
	}
	if seen.Get("sitekey") != "test-sitekey" || seen.Get("remoteip") == "" {
		t.Errorf("verify request: %v", seen)
	}

	var apts struct{ Items []store.Apartment }
	e.do("GET", "/apartments", nil, &apts)
	req := map[string]any{"apartment_ids": []int64{apts.Items[0].ID}, "check_in": day(10), "check_out": day(13), "guests": 2,
		"name": "Jan Test", "email": "jan@example.com", "phone": "+420 600 000 000", "consent": true}
	got = verr{}
	if code := e.do("POST", "/bookings", req, &got); code != 422 || got.Error.Fields["captcha"] != "required" {
		t.Fatalf("booking without an answer: %d %+v", code, got)
	}
	// hCaptcha out of reach: nothing is stored and the visitor is asked to try again.
	down = true
	req["captcha_token"] = "good-answer"
	got = verr{}
	if code := e.do("POST", "/bookings", req, &got); code != 503 || got.Error.Code != "captcha_unavailable" {
		t.Fatalf("booking while hCaptcha is down: %d %+v", code, got)
	}
	down = false
	if code := e.do("POST", "/bookings", req, nil); code != 201 {
		t.Fatalf("booking with a good answer: %d", code)
	}
	e.login()
	var list struct{ Items []store.Booking }
	if code := e.do("GET", "/admin/bookings", nil, &list); code != 200 || len(list.Items) != 1 {
		t.Fatalf("bookings stored: %d, %d items", code, len(list.Items))
	}
}

func TestWebCSP(t *testing.T) {
	if off := webCSP(false); strings.Contains(off, "hcaptcha") || !strings.Contains(off, "frame-src 'none'") {
		t.Errorf("policy without hCaptcha: %s", off)
	}
	on := webCSP(true)
	for _, part := range []string{"script-src 'self' https://hcaptcha.com https://*.hcaptcha.com;", "frame-src https://hcaptcha.com https://*.hcaptcha.com;", "connect-src 'self' https://hcaptcha.com"} {
		if !strings.Contains(on, part) {
			t.Errorf("policy with hCaptcha misses %q: %s", part, on)
		}
	}
}
