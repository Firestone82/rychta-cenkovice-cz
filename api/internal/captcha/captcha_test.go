package captcha

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func service(t *testing.T, handler http.HandlerFunc) *Verifier {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return New("site", "secret", srv.URL)
}

func TestVerify(t *testing.T) {
	ctx := context.Background()

	if New("", "", "").Enabled() {
		t.Fatal("no keys must mean switched off")
	}
	if ok, err := (*Verifier)(nil).Verify(ctx, "", ""); !ok || err != nil {
		t.Fatalf("switched off must accept: %v %v", ok, err)
	}

	v := service(t, func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil || r.Form.Get("secret") != "secret" || r.Form.Get("sitekey") != "site" || r.Form.Get("remoteip") != "203.0.113.7" {
			t.Errorf("unexpected request: %v %v", err, r.Form)
		}
		if r.Form.Get("response") == "good" {
			w.Write([]byte(`{"success":true}`))
			return
		}
		w.Write([]byte(`{"success":false,"error-codes":["invalid-input-response"]}`))
	})
	if ok, err := v.Verify(ctx, "good", "203.0.113.7"); !ok || err != nil {
		t.Fatalf("good answer: %v %v", ok, err)
	}
	if ok, err := v.Verify(ctx, "bad", "203.0.113.7"); ok || err != nil {
		t.Fatalf("bad answer: %v %v", ok, err)
	}
	if ok, err := v.Verify(ctx, "  ", "203.0.113.7"); ok || err != nil {
		t.Fatalf("empty answer must be refused without a request: %v %v", ok, err)
	}

	down := service(t, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusBadGateway) })
	if ok, err := down.Verify(ctx, "good", ""); ok || !errors.Is(err, ErrUnavailable) {
		t.Fatalf("service down: %v %v", ok, err)
	}
	misconfigured := service(t, func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"success":false,"error-codes":["invalid-input-secret"]}`))
	})
	if ok, err := misconfigured.Verify(ctx, "good", ""); ok || !errors.Is(err, ErrUnavailable) {
		t.Fatalf("wrong secret: %v %v", ok, err)
	}
}
