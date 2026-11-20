// Package captcha checks hCaptcha answers from the public forms with the hCaptcha service.
package captcha

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DefaultVerifyURL is where hCaptcha checks an answer.
const DefaultVerifyURL = "https://api.hcaptcha.com/siteverify"

// ErrUnavailable means hCaptcha could not be reached or did not answer properly, so the
// answer is neither accepted nor rejected.
var ErrUnavailable = errors.New("captcha: verification service unavailable")

// Verifier checks answers for one site key. The zero value and nil are "switched off".
type Verifier struct {
	SiteKey string
	secret  string
	url     string
	client  *http.Client
}

// New returns nil when no secret is configured: the forms then work without a captcha.
func New(siteKey, secret, verifyURL string) *Verifier {
	if siteKey == "" || secret == "" {
		return nil
	}
	if verifyURL == "" {
		verifyURL = DefaultVerifyURL
	}
	return &Verifier{SiteKey: siteKey, secret: secret, url: verifyURL, client: &http.Client{Timeout: 8 * time.Second}}
}

// Enabled reports whether forms must carry a captcha answer.
func (v *Verifier) Enabled() bool { return v != nil }

// Verify reports whether token is a valid, unused answer. remoteIP is optional.
func (v *Verifier) Verify(ctx context.Context, token, remoteIP string) (bool, error) {
	if v == nil {
		return true, nil
	}
	if token = strings.TrimSpace(token); token == "" || len(token) > 8192 {
		return false, nil
	}
	form := url.Values{"secret": {v.secret}, "response": {token}, "sitekey": {v.SiteKey}}
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, v.url, strings.NewReader(form.Encode()))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := v.client.Do(req)
	if err != nil {
		return false, fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return false, fmt.Errorf("%w: status %d", ErrUnavailable, res.StatusCode)
	}
	var out struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(nil, res.Body, 1<<16)).Decode(&out); err != nil {
		return false, fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	if !out.Success {
		// A wrong secret or site key is our configuration, not the visitor's answer.
		for _, code := range out.ErrorCodes {
			if code == "missing-input-secret" || code == "invalid-input-secret" || code == "sitekey-secret-mismatch" {
				return false, fmt.Errorf("%w: %s", ErrUnavailable, code)
			}
		}
	}
	return out.Success, nil
}
