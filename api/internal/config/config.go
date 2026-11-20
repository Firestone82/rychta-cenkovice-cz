// Package config loads the API configuration from environment variables.
package config

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

type SMTP struct {
	Host     string
	Port     int
	Username string
	Password string
	// TLS mode: "starttls" (default, port 587), "tls" (implicit, port 465) or "none".
	TLS string
}

type Config struct {
	Env  string // "development" or "production"
	Addr string

	DBPath   string
	MediaDir string
	// WebDir, when set, makes the API also serve the built Angular app (single-binary deployment).
	WebDir string

	JWTSecret  []byte
	JWTIssuer  string
	AccessTTL  time.Duration // lifetime of an access token (short)
	RefreshTTL time.Duration // idle lifetime of a refresh token (sliding)
	SessionTTL time.Duration // absolute lifetime of a login session

	CookieSecure   bool
	AllowedOrigins []string
	TrustProxy     bool

	PublicURL string // public URL of the website, used in e-mails
	MailFrom  string
	MailTo    string // where booking requests and contact messages are delivered
	SMTP      SMTP

	// Bootstrap administrator, created on first start when no user exists.
	AdminEmail    string
	AdminPassword string

	// Where the import-photos command downloads the original photos from.
	PhotoSourceURL string
}

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return def
}

func envDuration(key string, def time.Duration) (time.Duration, error) {
	v := env(key, "")
	if v == "" {
		return def, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return d, nil
}

func envBool(key string, def bool) bool {
	v := env(key, "")
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

// Load reads the configuration. In production a strong RC_JWT_SECRET is mandatory.
func Load() (*Config, error) {
	c := &Config{
		Env:            env("RC_ENV", "development"),
		Addr:           env("RC_ADDR", ":8080"),
		DBPath:         env("RC_DB_PATH", "data/rychta.db"),
		MediaDir:       env("RC_MEDIA_DIR", "data/media"),
		WebDir:         env("RC_WEB_DIR", ""),
		JWTIssuer:      env("RC_JWT_ISSUER", "rychtacenkovice.cz"),
		TrustProxy:     envBool("RC_TRUST_PROXY", false),
		PublicURL:      strings.TrimRight(env("RC_PUBLIC_URL", "http://localhost:4200"), "/"),
		MailFrom:       env("RC_MAIL_FROM", "Rychta Čenkovice <rezervace@rychtacenkovice.cz>"),
		MailTo:         env("RC_MAIL_TO", "rychtacenkovice@seznam.cz"),
		AdminEmail:     env("RC_ADMIN_EMAIL", ""),
		AdminPassword:  env("RC_ADMIN_PASSWORD", ""),
		PhotoSourceURL: strings.TrimRight(env("RC_PHOTO_SOURCE_URL", "https://www.rychtacenkovice.cz/userFiles"), "/"),
	}
	prod := c.Env == "production"

	var err error
	if c.AccessTTL, err = envDuration("RC_ACCESS_TTL", 10*time.Minute); err != nil {
		return nil, err
	}
	if c.RefreshTTL, err = envDuration("RC_REFRESH_TTL", 7*24*time.Hour); err != nil {
		return nil, err
	}
	if c.SessionTTL, err = envDuration("RC_SESSION_TTL", 30*24*time.Hour); err != nil {
		return nil, err
	}
	if c.AccessTTL > 30*time.Minute {
		return nil, errors.New("RC_ACCESS_TTL must be 30m or less: access tokens are meant to be short-lived")
	}

	c.CookieSecure = envBool("RC_COOKIE_SECURE", prod)

	origins := env("RC_ALLOWED_ORIGINS", "http://localhost:4200")
	for _, o := range strings.Split(origins, ",") {
		if o = strings.TrimRight(strings.TrimSpace(o), "/"); o != "" {
			c.AllowedOrigins = append(c.AllowedOrigins, o)
		}
	}

	secret := env("RC_JWT_SECRET", "")
	switch {
	case len(secret) >= 32:
		c.JWTSecret = []byte(secret)
	case prod:
		return nil, errors.New("RC_JWT_SECRET must be set to at least 32 random characters in production")
	default:
		// Development: a random per-process secret. Access tokens stop working on restart,
		// the refresh token (stored in the database) signs the administrator back in.
		c.JWTSecret = make([]byte, 48)
		if _, err := rand.Read(c.JWTSecret); err != nil {
			return nil, err
		}
		slog.Warn("RC_JWT_SECRET not set, using a random development secret")
	}

	port, _ := strconv.Atoi(env("RC_SMTP_PORT", "587"))
	c.SMTP = SMTP{
		Host:     env("RC_SMTP_HOST", ""),
		Port:     port,
		Username: env("RC_SMTP_USERNAME", ""),
		Password: env("RC_SMTP_PASSWORD", ""),
		TLS:      strings.ToLower(env("RC_SMTP_TLS", "starttls")),
	}
	return c, nil
}
