package store

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"
)

const DateLayout = "2006-01-02"

type Booking struct {
	ID           int64   `json:"id"`
	Code         string  `json:"code"`
	Kind         string  `json:"kind"`   // guest | block
	Status       string  `json:"status"` // pending | confirmed | cancelled
	Source       string  `json:"source"` // web | admin
	CheckIn      string  `json:"check_in"`
	CheckOut     string  `json:"check_out"`
	Nights       int     `json:"nights"`
	Guests       int     `json:"guests"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Phone        string  `json:"phone"`
	Note         string  `json:"note"`
	AdminNote    string  `json:"admin_note"`
	TotalPrice   *int    `json:"total_price"`
	Language     string  `json:"language"`
	MessageID    *int64  `json:"message_id"`
	CreatedBy    *int64  `json:"-"`
	ApartmentIDs []int64 `json:"apartment_ids"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// Nights between two ISO dates; 0 when either is invalid.
func NightsBetween(checkIn, checkOut string) int {
	a, err1 := time.Parse(DateLayout, checkIn)
	b, err2 := time.Parse(DateLayout, checkOut)
	if err1 != nil || err2 != nil {
		return 0
	}
	return int(b.Sub(a).Hours() / 24)
}

const bookingCols = `id, code, kind, status, source, check_in, check_out, guests, name, email, phone, note, admin_note, total_price, language, message_id, created_at, updated_at`

func scanBooking(row scanner) (*Booking, error) {
	b := &Booking{}
	var price, msg sql.NullInt64
	if err := row.Scan(&b.ID, &b.Code, &b.Kind, &b.Status, &b.Source, &b.CheckIn, &b.CheckOut, &b.Guests, &b.Name, &b.Email, &b.Phone,
		&b.Note, &b.AdminNote, &price, &b.Language, &msg, &b.CreatedAt, &b.UpdatedAt); err != nil {
		return nil, err
	}
	if price.Valid {
		v := int(price.Int64)
		b.TotalPrice = &v
	}
	if msg.Valid {
		b.MessageID = &msg.Int64
	}
	b.Nights = NightsBetween(b.CheckIn, b.CheckOut)
	b.ApartmentIDs = []int64{}
	return b, nil
}

type querier interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func placeholders(n int) string {
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}

func loadUnits(ctx context.Context, q querier, bookings []*Booking) error {
	if len(bookings) == 0 {
		return nil
	}
	byID := make(map[int64]*Booking, len(bookings))
	args := make([]any, 0, len(bookings))
	for _, b := range bookings {
		byID[b.ID] = b
		args = append(args, b.ID)
	}
	rows, err := q.QueryContext(ctx, `SELECT booking_id, apartment_id FROM booking_units WHERE booking_id IN (`+placeholders(len(args))+`) ORDER BY apartment_id`, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var bid, aid int64
		if err := rows.Scan(&bid, &aid); err != nil {
			return err
		}
		byID[bid].ApartmentIDs = append(byID[bid].ApartmentIDs, aid)
	}
	return rows.Err()
}

// conflicts returns the apartments (out of ids) that already have a pending or confirmed
// booking overlapping [checkIn, checkOut). The departure day is free for a new arrival.
func conflicts(ctx context.Context, q querier, ids []int64, checkIn, checkOut string, excludeBooking int64) ([]int64, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	args := []any{checkOut, checkIn, excludeBooking}
	for _, id := range ids {
		args = append(args, id)
	}
	rows, err := q.QueryContext(ctx, `SELECT DISTINCT u.apartment_id FROM booking_units u JOIN bookings b ON b.id = u.booking_id
		WHERE b.status IN ('pending','confirmed') AND b.check_in < ? AND b.check_out > ? AND b.id <> ?
		AND u.apartment_id IN (`+placeholders(len(ids))+`) ORDER BY u.apartment_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// UnavailableApartments lists the apartments that are taken for the given stay.
func (s *Store) UnavailableApartments(ctx context.Context, checkIn, checkOut string) ([]int64, error) {
	rows, err := s.DB.QueryContext(ctx, `SELECT DISTINCT u.apartment_id FROM booking_units u JOIN bookings b ON b.id = u.booking_id
		WHERE b.status IN ('pending','confirmed') AND b.check_in < ? AND b.check_out > ?`, checkOut, checkIn)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// CreateBooking checks availability and inserts the booking in one write transaction,
// so two simultaneous requests can never both get the same apartment.
func (s *Store) CreateBooking(ctx context.Context, b *Booking) error {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if b.Status != "cancelled" {
		taken, err := conflicts(ctx, tx, b.ApartmentIDs, b.CheckIn, b.CheckOut, 0)
		if err != nil {
			return err
		}
		if len(taken) > 0 {
			return &ErrUnavailable{ApartmentIDs: taken}
		}
	}
	ts := now()
	var res sql.Result
	for attempt := 0; ; attempt++ {
		b.Code = NewBookingCode()
		res, err = tx.ExecContext(ctx, `INSERT INTO bookings (code, kind, status, source, check_in, check_out, guests, name, email, phone, note, admin_note,
			total_price, language, message_id, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			b.Code, b.Kind, b.Status, b.Source, b.CheckIn, b.CheckOut, b.Guests, b.Name, b.Email, b.Phone, b.Note, b.AdminNote,
			b.TotalPrice, b.Language, b.MessageID, b.CreatedBy, ts, ts)
		if err == nil {
			break
		}
		if attempt >= 4 || !strings.Contains(err.Error(), "UNIQUE") {
			return err
		}
	}
	if b.ID, err = res.LastInsertId(); err != nil {
		return err
	}
	for _, aid := range b.ApartmentIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO booking_units (booking_id, apartment_id) VALUES (?,?)`, b.ID, aid); err != nil {
			return err
		}
	}
	b.CreatedAt, b.UpdatedAt = ts, ts
	b.Nights = NightsBetween(b.CheckIn, b.CheckOut)
	return tx.Commit()
}

// UpdateBooking saves all editable fields, re-checking availability when the booking is active.
func (s *Store) UpdateBooking(ctx context.Context, b *Booking) error {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if b.Status != "cancelled" {
		taken, err := conflicts(ctx, tx, b.ApartmentIDs, b.CheckIn, b.CheckOut, b.ID)
		if err != nil {
			return err
		}
		if len(taken) > 0 {
			return &ErrUnavailable{ApartmentIDs: taken}
		}
	}
	ts := now()
	res, err := tx.ExecContext(ctx, `UPDATE bookings SET kind=?, status=?, check_in=?, check_out=?, guests=?, name=?, email=?, phone=?, note=?, admin_note=?,
		total_price=?, language=?, updated_at=? WHERE id=?`,
		b.Kind, b.Status, b.CheckIn, b.CheckOut, b.Guests, b.Name, b.Email, b.Phone, b.Note, b.AdminNote, b.TotalPrice, b.Language, ts, b.ID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM booking_units WHERE booking_id = ?`, b.ID); err != nil {
		return err
	}
	for _, aid := range b.ApartmentIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO booking_units (booking_id, apartment_id) VALUES (?,?)`, b.ID, aid); err != nil {
			return err
		}
	}
	b.UpdatedAt = ts
	b.Nights = NightsBetween(b.CheckIn, b.CheckOut)
	return tx.Commit()
}

func (s *Store) BookingByID(ctx context.Context, id int64) (*Booking, error) {
	b, err := scanBooking(s.DB.QueryRowContext(ctx, `SELECT `+bookingCols+` FROM bookings WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return b, loadUnits(ctx, s.DB, []*Booking{b})
}

func (s *Store) DeleteBooking(ctx context.Context, id int64) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM bookings WHERE id = ?`, id)
	return err
}

type BookingFilter struct {
	Status string // pending | confirmed | cancelled | active (pending+confirmed) | ""
	Kind   string
	From   string // overlap window start (inclusive)
	To     string // overlap window end (exclusive)
	Query  string
	Order  string // "created" (newest first) or "arrival" (default)
	Limit  int
}

func (s *Store) ListBookings(ctx context.Context, f BookingFilter) ([]*Booking, error) {
	where := []string{"1=1"}
	args := []any{}
	switch f.Status {
	case "pending", "confirmed", "cancelled":
		where = append(where, "status = ?")
		args = append(args, f.Status)
	case "active":
		where = append(where, "status IN ('pending','confirmed')")
	}
	if f.Kind != "" {
		where = append(where, "kind = ?")
		args = append(args, f.Kind)
	}
	if f.From != "" {
		where = append(where, "check_out > ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		where = append(where, "check_in < ?")
		args = append(args, f.To)
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		like := "%" + strings.NewReplacer("%", "", "_", "").Replace(q) + "%"
		where = append(where, "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR code LIKE ?)")
		args = append(args, like, like, like, like)
	}
	order := "check_in, id"
	if f.Order == "created" {
		order = "created_at DESC, id DESC"
	}
	if f.Limit <= 0 || f.Limit > 1000 {
		f.Limit = 500
	}
	rows, err := s.DB.QueryContext(ctx, `SELECT `+bookingCols+` FROM bookings WHERE `+strings.Join(where, " AND ")+` ORDER BY `+order+` LIMIT ?`, append(args, f.Limit)...)
	if err != nil {
		return nil, err
	}
	out := []*Booking{}
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, b)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, loadUnits(ctx, s.DB, out)
}

// OccupiedRange is a public, anonymous view of one apartment being taken.
type OccupiedRange struct {
	ApartmentID int64  `json:"apartment_id"`
	From        string `json:"from"`
	To          string `json:"to"`
	Status      string `json:"status"` // booked | pending
}

// Occupancy returns the taken ranges of all apartments overlapping [from, to), without guest data.
func (s *Store) Occupancy(ctx context.Context, from, to string) ([]OccupiedRange, error) {
	rows, err := s.DB.QueryContext(ctx, `SELECT u.apartment_id, b.check_in, b.check_out, b.status FROM booking_units u JOIN bookings b ON b.id = u.booking_id
		WHERE b.status IN ('pending','confirmed') AND b.check_in < ? AND b.check_out > ? ORDER BY u.apartment_id, b.check_in`, to, from)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []OccupiedRange{}
	for rows.Next() {
		var r OccupiedRange
		var status string
		if err := rows.Scan(&r.ApartmentID, &r.From, &r.To, &status); err != nil {
			return nil, err
		}
		r.Status = "booked"
		if status == "pending" {
			r.Status = "pending"
		}
		out = append(out, r)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].ApartmentID != out[j].ApartmentID {
			return out[i].ApartmentID < out[j].ApartmentID
		}
		return out[i].From < out[j].From
	})
	return out, rows.Err()
}

type Dashboard struct {
	PendingBookings int        `json:"pending_bookings"`
	NewMessages     int        `json:"new_messages"`
	OccupiedTonight int        `json:"occupied_tonight"`
	Apartments      int        `json:"apartments"`
	GuestsInHouse   int        `json:"guests_in_house"`
	Arrivals        []*Booking `json:"arrivals"`
	Departures      []*Booking `json:"departures"`
	Pending         []*Booking `json:"pending"`
}

// DashboardData summarises today and the next 14 days for the administrator.
func (s *Store) DashboardData(ctx context.Context, today string) (*Dashboard, error) {
	d := &Dashboard{}
	t, err := time.Parse(DateLayout, today)
	if err != nil {
		return nil, err
	}
	horizon := t.AddDate(0, 0, 14).Format(DateLayout)
	if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM bookings WHERE status = 'pending'`).Scan(&d.PendingBookings); err != nil {
		return nil, err
	}
	if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM messages WHERE status = 'new'`).Scan(&d.NewMessages); err != nil {
		return nil, err
	}
	if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM apartments WHERE active = 1`).Scan(&d.Apartments); err != nil {
		return nil, err
	}
	if err := s.DB.QueryRowContext(ctx, `SELECT COUNT(DISTINCT u.apartment_id) FROM booking_units u JOIN bookings b ON b.id = u.booking_id
		WHERE b.status = 'confirmed' AND b.check_in <= ? AND b.check_out > ?`, today, today).Scan(&d.OccupiedTonight); err != nil {
		return nil, err
	}
	if err := s.DB.QueryRowContext(ctx, `SELECT COALESCE(SUM(guests),0) FROM bookings
		WHERE status = 'confirmed' AND kind = 'guest' AND check_in <= ? AND check_out > ?`, today, today).Scan(&d.GuestsInHouse); err != nil {
		return nil, err
	}
	list := func(where string, args ...any) ([]*Booking, error) {
		rows, err := s.DB.QueryContext(ctx, `SELECT `+bookingCols+` FROM bookings WHERE `+where+` LIMIT 50`, args...)
		if err != nil {
			return nil, err
		}
		out := []*Booking{}
		for rows.Next() {
			b, err := scanBooking(rows)
			if err != nil {
				rows.Close()
				return nil, err
			}
			out = append(out, b)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
		return out, loadUnits(ctx, s.DB, out)
	}
	if d.Arrivals, err = list(`status = 'confirmed' AND kind = 'guest' AND check_in >= ? AND check_in <= ? ORDER BY check_in, id`, today, horizon); err != nil {
		return nil, err
	}
	if d.Departures, err = list(`status = 'confirmed' AND kind = 'guest' AND check_out >= ? AND check_out <= ? ORDER BY check_out, id`, today, horizon); err != nil {
		return nil, err
	}
	if d.Pending, err = list(`status = 'pending' ORDER BY created_at, id`); err != nil {
		return nil, err
	}
	return d, nil
}
