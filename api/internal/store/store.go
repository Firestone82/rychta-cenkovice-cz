// Package store contains the database queries of the API.
package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var ErrNotFound = errors.New("store: not found")

// ErrUnavailable is returned when a booking overlaps existing ones.
type ErrUnavailable struct{ ApartmentIDs []int64 }

func (e *ErrUnavailable) Error() string {
	return fmt.Sprintf("store: apartments %v are not available for the selected dates", e.ApartmentIDs)
}

type Store struct{ DB *sql.DB }

func New(db *sql.DB) *Store { return &Store{DB: db} }

func now() string { return time.Now().UTC().Format(time.RFC3339) }

// L10n is a text in both supported languages.
type L10n struct {
	Cs string `json:"cs"`
	En string `json:"en"`
}

type L10nList struct {
	Cs []string `json:"cs"`
	En []string `json:"en"`
}

// ---------- users ----------

type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	PasswordHash string `json:"-"`
}

func (s *Store) CountUsers(ctx context.Context) (int, error) {
	var n int
	err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

func (s *Store) CreateUser(ctx context.Context, email, name, hash string) (int64, error) {
	res, err := s.DB.ExecContext(ctx, `INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,'admin',?)`,
		strings.ToLower(strings.TrimSpace(email)), name, hash, now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) scanUser(row *sql.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (s *Store) UserByEmail(ctx context.Context, email string) (*User, error) {
	return s.scanUser(s.DB.QueryRowContext(ctx, `SELECT id, email, name, role, password_hash FROM users WHERE email = ?`, strings.TrimSpace(email)))
}

func (s *Store) UserByID(ctx context.Context, id int64) (*User, error) {
	return s.scanUser(s.DB.QueryRowContext(ctx, `SELECT id, email, name, role, password_hash FROM users WHERE id = ?`, id))
}

func (s *Store) SetPassword(ctx context.Context, id int64, hash string) error {
	_, err := s.DB.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, hash, id)
	return err
}

// ---------- photos ----------

type Photo struct {
	ID          int64  `json:"id"`
	Category    string `json:"category"`
	ApartmentID *int64 `json:"apartment_id"`
	File        string `json:"file"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	Widths      []int  `json:"widths"`
	Color       string `json:"color"`
	Placeholder string `json:"placeholder"`
	Alt         L10n   `json:"alt"`
	Sort        int    `json:"sort"`
	SourcePath  string `json:"-"`
}

const photoCols = `id, category, apartment_id, file, width, height, widths, color, placeholder, alt_cs, alt_en, sort, source_path`

type scanner interface{ Scan(dest ...any) error }

func scanPhoto(row scanner) (*Photo, error) {
	p := &Photo{}
	var apt sql.NullInt64
	var widths string
	if err := row.Scan(&p.ID, &p.Category, &apt, &p.File, &p.Width, &p.Height, &widths, &p.Color, &p.Placeholder, &p.Alt.Cs, &p.Alt.En, &p.Sort, &p.SourcePath); err != nil {
		return nil, err
	}
	if apt.Valid {
		p.ApartmentID = &apt.Int64
	}
	p.Widths = []int{}
	for _, w := range strings.Split(widths, ",") {
		if n, err := strconv.Atoi(w); err == nil {
			p.Widths = append(p.Widths, n)
		}
	}
	return p, nil
}

type PhotoFilter struct {
	Category    string
	ApartmentID int64
	Offset      int
	Limit       int
	// IncludeMissing also returns photos whose file has not been imported yet (admin).
	IncludeMissing bool
}

// ListPhotos returns one page of photos and the total count for the filter.
func (s *Store) ListPhotos(ctx context.Context, f PhotoFilter) ([]*Photo, int, error) {
	where := []string{"1=1"}
	args := []any{}
	if !f.IncludeMissing {
		where = append(where, "file <> ''")
	}
	if f.Category != "" {
		where = append(where, "category = ?")
		args = append(args, f.Category)
	} else if !f.IncludeMissing {
		where = append(where, "category <> 'misc'")
	}
	if f.ApartmentID > 0 {
		where = append(where, "apartment_id = ?")
		args = append(args, f.ApartmentID)
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM photos WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 24
	}
	rows, err := s.DB.QueryContext(ctx, `SELECT `+photoCols+` FROM photos WHERE `+w+` ORDER BY sort, id LIMIT ? OFFSET ?`, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []*Photo{}
	for rows.Next() {
		p, err := scanPhoto(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	return out, total, rows.Err()
}

func (s *Store) PhotoByID(ctx context.Context, id int64) (*Photo, error) {
	p, err := scanPhoto(s.DB.QueryRowContext(ctx, `SELECT `+photoCols+` FROM photos WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

// PhotoCategories returns the number of imported photos per category.
func (s *Store) PhotoCategories(ctx context.Context) (map[string]int, error) {
	rows, err := s.DB.QueryContext(ctx, `SELECT category, COUNT(*) FROM photos WHERE file <> '' AND category <> 'misc' GROUP BY category`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var c string
		var n int
		if err := rows.Scan(&c, &n); err != nil {
			return nil, err
		}
		out[c] = n
	}
	return out, rows.Err()
}

type PhotoInput struct {
	Category    string
	ApartmentID *int64
	SourcePath  string
	File        string
	Width       int
	Height      int
	Widths      []int
	Color       string
	Placeholder string
	Alt         L10n
	Sort        int
}

func widthsCSV(w []int) string {
	parts := make([]string, len(w))
	for i, n := range w {
		parts[i] = strconv.Itoa(n)
	}
	return strings.Join(parts, ",")
}

func (s *Store) InsertPhoto(ctx context.Context, in PhotoInput) (int64, error) {
	res, err := s.DB.ExecContext(ctx, `INSERT INTO photos (category, apartment_id, source_path, file, width, height, widths, color, placeholder, alt_cs, alt_en, sort, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		in.Category, in.ApartmentID, in.SourcePath, in.File, in.Width, in.Height, widthsCSV(in.Widths), in.Color, in.Placeholder, in.Alt.Cs, in.Alt.En, in.Sort, now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// SetPhotoFile stores the processed image data of a photo.
func (s *Store) SetPhotoFile(ctx context.Context, id int64, file string, width, height int, widths []int, color, placeholder string) error {
	_, err := s.DB.ExecContext(ctx, `UPDATE photos SET file=?, width=?, height=?, widths=?, color=?, placeholder=? WHERE id=?`,
		file, width, height, widthsCSV(widths), color, placeholder, id)
	return err
}

func (s *Store) UpdatePhotoMeta(ctx context.Context, id int64, category string, apartmentID *int64, alt L10n, sort int) error {
	res, err := s.DB.ExecContext(ctx, `UPDATE photos SET category=?, apartment_id=?, alt_cs=?, alt_en=?, sort=? WHERE id=?`,
		category, apartmentID, alt.Cs, alt.En, sort, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeletePhoto(ctx context.Context, id int64) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM photos WHERE id = ?`, id)
	return err
}

func (s *Store) NextPhotoSort(ctx context.Context) (int, error) {
	var n sql.NullInt64
	err := s.DB.QueryRowContext(ctx, `SELECT MAX(sort) FROM photos`).Scan(&n)
	return int(n.Int64) + 10, err
}

// ---------- apartments ----------

type Apartment struct {
	ID            int64    `json:"id"`
	Slug          string   `json:"slug"`
	Number        int      `json:"number"`
	Floor         int      `json:"floor"`
	Area          int      `json:"area"`
	Beds          int      `json:"beds"`
	ExtraBeds     int      `json:"extra_beds"`
	Accessible    bool     `json:"accessible"`
	Type          L10n     `json:"type"`
	Layout        L10n     `json:"layout"`
	Features      L10nList `json:"features"`
	Note          L10n     `json:"note"`
	PricePerNight *int     `json:"price_per_night"`
	MinNights     int      `json:"min_nights"`
	Active        bool     `json:"active"`
	Cover         *Photo   `json:"cover"`
	Photos        []*Photo `json:"photos,omitempty"`
}

const apartmentCols = `id, slug, number, floor, area, beds, extra_beds, accessible, type_cs, type_en, layout_cs, layout_en, features_cs, features_en, note_cs, note_en, price_per_night, min_nights, active`

func scanApartment(row scanner) (*Apartment, error) {
	a := &Apartment{}
	var fcs, fen string
	var price sql.NullInt64
	if err := row.Scan(&a.ID, &a.Slug, &a.Number, &a.Floor, &a.Area, &a.Beds, &a.ExtraBeds, &a.Accessible, &a.Type.Cs, &a.Type.En,
		&a.Layout.Cs, &a.Layout.En, &fcs, &fen, &a.Note.Cs, &a.Note.En, &price, &a.MinNights, &a.Active); err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(fcs), &a.Features.Cs)
	_ = json.Unmarshal([]byte(fen), &a.Features.En)
	if a.Features.Cs == nil {
		a.Features.Cs = []string{}
	}
	if a.Features.En == nil {
		a.Features.En = []string{}
	}
	if price.Valid {
		v := int(price.Int64)
		a.PricePerNight = &v
	}
	return a, nil
}

func (s *Store) ListApartments(ctx context.Context, onlyActive bool) ([]*Apartment, error) {
	q := `SELECT ` + apartmentCols + ` FROM apartments`
	if onlyActive {
		q += ` WHERE active = 1`
	}
	rows, err := s.DB.QueryContext(ctx, q+` ORDER BY sort, number`)
	if err != nil {
		return nil, err
	}
	out := []*Apartment{}
	for rows.Next() {
		a, err := scanApartment(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, a)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, a := range out {
		photos, _, err := s.ListPhotos(ctx, PhotoFilter{ApartmentID: a.ID, Limit: 1})
		if err != nil {
			return nil, err
		}
		if len(photos) > 0 {
			a.Cover = photos[0]
		}
	}
	return out, nil
}

func (s *Store) ApartmentBySlug(ctx context.Context, slug string) (*Apartment, error) {
	a, err := scanApartment(s.DB.QueryRowContext(ctx, `SELECT `+apartmentCols+` FROM apartments WHERE slug = ?`, slug))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	photos, _, err := s.ListPhotos(ctx, PhotoFilter{ApartmentID: a.ID, Limit: 100})
	if err != nil {
		return nil, err
	}
	a.Photos = photos
	if len(photos) > 0 {
		a.Cover = photos[0]
	}
	return a, nil
}

func (s *Store) ApartmentByID(ctx context.Context, id int64) (*Apartment, error) {
	a, err := scanApartment(s.DB.QueryRowContext(ctx, `SELECT `+apartmentCols+` FROM apartments WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

func (s *Store) SaveApartment(ctx context.Context, a *Apartment) error {
	fcs, _ := json.Marshal(a.Features.Cs)
	fen, _ := json.Marshal(a.Features.En)
	_, err := s.DB.ExecContext(ctx, `UPDATE apartments SET floor=?, area=?, beds=?, extra_beds=?, accessible=?, type_cs=?, type_en=?, layout_cs=?, layout_en=?,
		features_cs=?, features_en=?, note_cs=?, note_en=?, price_per_night=?, min_nights=?, active=? WHERE id=?`,
		a.Floor, a.Area, a.Beds, a.ExtraBeds, a.Accessible, a.Type.Cs, a.Type.En, a.Layout.Cs, a.Layout.En, string(fcs), string(fen),
		a.Note.Cs, a.Note.En, a.PricePerNight, a.MinNights, a.Active, a.ID)
	return err
}

func (s *Store) InsertApartment(ctx context.Context, a *Apartment) (int64, error) {
	fcs, _ := json.Marshal(a.Features.Cs)
	fen, _ := json.Marshal(a.Features.En)
	res, err := s.DB.ExecContext(ctx, `INSERT INTO apartments (slug, number, floor, area, beds, extra_beds, accessible, type_cs, type_en, layout_cs, layout_en,
		features_cs, features_en, note_cs, note_en, price_per_night, min_nights, active, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		a.Slug, a.Number, a.Floor, a.Area, a.Beds, a.ExtraBeds, a.Accessible, a.Type.Cs, a.Type.En, a.Layout.Cs, a.Layout.En, string(fcs), string(fen),
		a.Note.Cs, a.Note.En, a.PricePerNight, a.MinNights, a.Active, a.Number)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ---------- messages ----------

type Message struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Body      string `json:"body"`
	Language  string `json:"language"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	// BookingID is set when the administrator created a booking from this message.
	BookingID *int64 `json:"booking_id"`
}

func (s *Store) CreateMessage(ctx context.Context, m *Message) (int64, error) {
	res, err := s.DB.ExecContext(ctx, `INSERT INTO messages (name, email, phone, body, language, status, created_at) VALUES (?,?,?,?,?,'new',?)`,
		m.Name, m.Email, m.Phone, m.Body, m.Language, now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

const messageSelect = `SELECT m.id, m.name, m.email, m.phone, m.body, m.language, m.status, m.created_at,
	(SELECT b.id FROM bookings b WHERE b.message_id = m.id ORDER BY b.id DESC LIMIT 1) FROM messages m`

func scanMessage(row scanner) (*Message, error) {
	m := &Message{}
	var bid sql.NullInt64
	if err := row.Scan(&m.ID, &m.Name, &m.Email, &m.Phone, &m.Body, &m.Language, &m.Status, &m.CreatedAt, &bid); err != nil {
		return nil, err
	}
	if bid.Valid {
		m.BookingID = &bid.Int64
	}
	return m, nil
}

// ListMessages returns messages by status: "" is the inbox (everything not archived),
// "all" is every message, anything else is that one status.
func (s *Store) ListMessages(ctx context.Context, status string) ([]*Message, error) {
	q := messageSelect
	args := []any{}
	switch status {
	case "":
		q += ` WHERE m.status <> 'archived'`
	case "all":
	default:
		q += ` WHERE m.status = ?`
		args = append(args, status)
	}
	rows, err := s.DB.QueryContext(ctx, q+` ORDER BY m.created_at DESC, m.id DESC LIMIT 500`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Message{}
	for rows.Next() {
		m, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) MessageByID(ctx context.Context, id int64) (*Message, error) {
	m, err := scanMessage(s.DB.QueryRowContext(ctx, messageSelect+` WHERE m.id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

func (s *Store) SetMessageStatus(ctx context.Context, id int64, status string) error {
	res, err := s.DB.ExecContext(ctx, `UPDATE messages SET status = ? WHERE id = ?`, status, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeleteMessage(ctx context.Context, id int64) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM messages WHERE id = ?`, id)
	return err
}

// ---------- news ----------

type News struct {
	ID          int64  `json:"id"`
	Title       L10n   `json:"title"`
	Body        L10n   `json:"body"`
	Published   bool   `json:"published"`
	PublishedAt string `json:"published_at"`
}

func (s *Store) ListNews(ctx context.Context, onlyPublished bool) ([]*News, error) {
	q := `SELECT id, title_cs, title_en, body_cs, body_en, published, published_at FROM news`
	if onlyPublished {
		q += ` WHERE published = 1`
	}
	rows, err := s.DB.QueryContext(ctx, q+` ORDER BY published_at DESC, id DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*News{}
	for rows.Next() {
		n := &News{}
		if err := rows.Scan(&n.ID, &n.Title.Cs, &n.Title.En, &n.Body.Cs, &n.Body.En, &n.Published, &n.PublishedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (s *Store) SaveNews(ctx context.Context, n *News) (int64, error) {
	if n.ID == 0 {
		res, err := s.DB.ExecContext(ctx, `INSERT INTO news (title_cs, title_en, body_cs, body_en, published, published_at, created_at) VALUES (?,?,?,?,?,?,?)`,
			n.Title.Cs, n.Title.En, n.Body.Cs, n.Body.En, n.Published, n.PublishedAt, now())
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}
	res, err := s.DB.ExecContext(ctx, `UPDATE news SET title_cs=?, title_en=?, body_cs=?, body_en=?, published=?, published_at=? WHERE id=?`,
		n.Title.Cs, n.Title.En, n.Body.Cs, n.Body.En, n.Published, n.PublishedAt, n.ID)
	if err != nil {
		return 0, err
	}
	if c, _ := res.RowsAffected(); c == 0 {
		return 0, ErrNotFound
	}
	return n.ID, nil
}

func (s *Store) DeleteNews(ctx context.Context, id int64) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM news WHERE id = ?`, id)
	return err
}

// ---------- helpers ----------

const codeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // no look-alikes (0/O, 1/I/L)

// NewBookingCode returns a short reference the guest can quote, e.g. RC-7KQ2MX.
func NewBookingCode() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = codeAlphabet[int(b[i])%len(codeAlphabet)]
	}
	return "RC-" + string(b)
}

// PhotoCovers returns the first imported photo of every category.
func (s *Store) PhotoCovers(ctx context.Context) (map[string]*Photo, error) {
	rows, err := s.DB.QueryContext(ctx, `SELECT `+photoCols+` FROM photos p WHERE file <> '' AND category <> 'apartment'
		AND NOT EXISTS (SELECT 1 FROM photos q WHERE q.category = p.category AND q.file <> '' AND (q.sort < p.sort OR (q.sort = p.sort AND q.id < p.id)))`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]*Photo{}
	for rows.Next() {
		p, err := scanPhoto(rows)
		if err != nil {
			return nil, err
		}
		out[p.Category] = p
	}
	return out, rows.Err()
}
