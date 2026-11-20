// Package auth implements password hashing, short-lived JWT access tokens and
// rotating refresh tokens with reuse detection.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("auth: invalid token")
	// ErrRefreshRace means the token was rotated a moment ago (two tabs refreshing at once).
	// The browser already holds the successor cookie, so the client may simply retry.
	ErrRefreshRace = errors.New("auth: refresh token was just rotated")
	// ErrTokenReuse means an already rotated token was presented again: the session is revoked.
	ErrTokenReuse = errors.New("auth: refresh token reuse detected")
)

const audience = "rychta-admin"

// reuseGrace is how long after rotation a repeated token is treated as a benign race.
const reuseGrace = 20 * time.Second

type Claims struct {
	Role string `json:"role"`
	Name string `json:"name"`
	jwt.RegisteredClaims
}

type Manager struct {
	db         *sql.DB
	secret     []byte
	issuer     string
	accessTTL  time.Duration
	refreshTTL time.Duration
	sessionTTL time.Duration
	now        func() time.Time
}

func NewManager(db *sql.DB, secret []byte, issuer string, accessTTL, refreshTTL, sessionTTL time.Duration) *Manager {
	return &Manager{db: db, secret: secret, issuer: issuer, accessTTL: accessTTL, refreshTTL: refreshTTL, sessionTTL: sessionTTL, now: time.Now}
}

// SetClock replaces the time source (tests).
func (m *Manager) SetClock(now func() time.Time) { m.now = now }

func (m *Manager) AccessTTL() time.Duration { return m.accessTTL }

// IssueAccess signs a short-lived access token for the user.
func (m *Manager) IssueAccess(userID int64, role, name string) (string, time.Time, error) {
	now := m.now().UTC()
	exp := now.Add(m.accessTTL)
	jti, err := randomToken(12)
	if err != nil {
		return "", time.Time{}, err
	}
	claims := Claims{
		Role: role,
		Name: name,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   strconv.FormatInt(userID, 10),
			Audience:  jwt.ClaimStrings{audience},
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			ExpiresAt: jwt.NewNumericDate(exp),
			ID:        jti,
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
	return signed, exp, err
}

// ParseAccess validates signature, algorithm, issuer, audience and expiry.
func (m *Manager) ParseAccess(token string) (*Claims, int64, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) { return m.secret, nil },
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(audience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(m.now),
	)
	if err != nil {
		return nil, 0, ErrInvalidToken
	}
	id, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		return nil, 0, ErrInvalidToken
	}
	return claims, id, nil
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func ts(t time.Time) string { return t.UTC().Format(time.RFC3339) }

// Refresh describes an issued refresh token. Only its SHA-256 hash is stored.
type Refresh struct {
	Token     string
	ExpiresAt time.Time
}

// StartSession creates a new refresh token family for a fresh login.
func (m *Manager) StartSession(ctx context.Context, userID int64, userAgent, ip string) (*Refresh, error) {
	family, err := randomToken(16)
	if err != nil {
		return nil, err
	}
	now := m.now().UTC()
	return m.insertRefresh(ctx, m.db, userID, family, now, now.Add(m.sessionTTL), userAgent, ip)
}

type execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func (m *Manager) insertRefresh(ctx context.Context, ex execer, userID int64, family string, now, familyExp time.Time, userAgent, ip string) (*Refresh, error) {
	token, err := randomToken(32)
	if err != nil {
		return nil, err
	}
	exp := now.Add(m.refreshTTL)
	if exp.After(familyExp) {
		exp = familyExp
	}
	if len(userAgent) > 300 {
		userAgent = userAgent[:300]
	}
	_, err = ex.ExecContext(ctx, `INSERT INTO refresh_tokens (user_id, family_id, token_hash, created_at, expires_at, family_expires_at, user_agent, ip)
		VALUES (?,?,?,?,?,?,?,?)`, userID, family, hashToken(token), ts(now), ts(exp), ts(familyExp), userAgent, ip)
	if err != nil {
		return nil, err
	}
	return &Refresh{Token: token, ExpiresAt: exp}, nil
}

// Rotate exchanges a valid refresh token for a new one (single use). Presenting a
// token that has already been rotated revokes the whole session, because it means
// the token was copied.
func (m *Manager) Rotate(ctx context.Context, token, userAgent, ip string) (int64, *Refresh, error) {
	if token == "" {
		return 0, nil, ErrInvalidToken
	}
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, nil, err
	}
	defer tx.Rollback()

	var (
		id                         int64
		userID                     int64
		family, expires, familyExp string
		usedAt, revokedAt          sql.NullString
	)
	err = tx.QueryRowContext(ctx, `SELECT id, user_id, family_id, expires_at, family_expires_at, used_at, revoked_at
		FROM refresh_tokens WHERE token_hash = ?`, hashToken(token)).Scan(&id, &userID, &family, &expires, &familyExp, &usedAt, &revokedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil, ErrInvalidToken
	}
	if err != nil {
		return 0, nil, err
	}
	now := m.now().UTC()
	if revokedAt.Valid {
		return 0, nil, ErrInvalidToken
	}
	if usedAt.Valid {
		used, _ := time.Parse(time.RFC3339, usedAt.String)
		if now.Sub(used) <= reuseGrace {
			return 0, nil, ErrRefreshRace
		}
		if _, err := tx.ExecContext(ctx, `UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL`, ts(now), family); err != nil {
			return 0, nil, err
		}
		if err := tx.Commit(); err != nil {
			return 0, nil, err
		}
		return 0, nil, ErrTokenReuse
	}
	exp, err := time.Parse(time.RFC3339, expires)
	if err != nil || !now.Before(exp) {
		return 0, nil, ErrInvalidToken
	}
	famExp, err := time.Parse(time.RFC3339, familyExp)
	if err != nil || !now.Before(famExp) {
		return 0, nil, ErrInvalidToken
	}
	if _, err := tx.ExecContext(ctx, `UPDATE refresh_tokens SET used_at = ? WHERE id = ?`, ts(now), id); err != nil {
		return 0, nil, err
	}
	next, err := m.insertRefresh(ctx, tx, userID, family, now, famExp, userAgent, ip)
	if err != nil {
		return 0, nil, err
	}
	if err := tx.Commit(); err != nil {
		return 0, nil, err
	}
	return userID, next, nil
}

// RevokeByToken ends the session the token belongs to (logout).
func (m *Manager) RevokeByToken(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	_, err := m.db.ExecContext(ctx, `UPDATE refresh_tokens SET revoked_at = ?
		WHERE revoked_at IS NULL AND family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = ?)`,
		ts(m.now()), hashToken(token))
	return err
}

// RevokeUser ends every session of a user (password change).
func (m *Manager) RevokeUser(ctx context.Context, userID int64) error {
	_, err := m.db.ExecContext(ctx, `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, ts(m.now()), userID)
	return err
}

// Cleanup deletes refresh tokens whose session ended more than a day ago.
func (m *Manager) Cleanup(ctx context.Context) (int64, error) {
	res, err := m.db.ExecContext(ctx, `DELETE FROM refresh_tokens WHERE family_expires_at < ?`, ts(m.now().Add(-24*time.Hour)))
	if err != nil {
		return 0, fmt.Errorf("cleanup refresh tokens: %w", err)
	}
	return res.RowsAffected()
}
