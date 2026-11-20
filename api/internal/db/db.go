// Package db opens the SQLite database and applies schema migrations.
package db

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// migrations are applied in order; PRAGMA user_version stores how many have run.
var migrations = []string{
	`
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL
);

CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  family_expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  user_agent TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_refresh_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

CREATE TABLE apartments (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  number INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  area INTEGER NOT NULL,
  beds INTEGER NOT NULL,
  extra_beds INTEGER NOT NULL DEFAULT 0,
  accessible INTEGER NOT NULL DEFAULT 0,
  type_cs TEXT NOT NULL DEFAULT '',
  type_en TEXT NOT NULL DEFAULT '',
  layout_cs TEXT NOT NULL DEFAULT '',
  layout_en TEXT NOT NULL DEFAULT '',
  features_cs TEXT NOT NULL DEFAULT '[]',
  features_en TEXT NOT NULL DEFAULT '[]',
  note_cs TEXT NOT NULL DEFAULT '',
  note_en TEXT NOT NULL DEFAULT '',
  price_per_night INTEGER,
  min_nights INTEGER NOT NULL DEFAULT 2,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'cs',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_messages_status ON messages(status, created_at);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'guest' CHECK (kind IN ('guest','block')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web','admin')),
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  total_price INTEGER,
  language TEXT NOT NULL DEFAULT 'cs',
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (check_out > check_in)
);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE TABLE booking_units (
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
  PRIMARY KEY (booking_id, apartment_id)
);
CREATE INDEX idx_booking_units_apartment ON booking_units(apartment_id);

CREATE TABLE photos (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL,
  source_path TEXT NOT NULL DEFAULT '',
  file TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  widths TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  placeholder TEXT NOT NULL DEFAULT '',
  alt_cs TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_photos_category ON photos(category, sort);
CREATE INDEX idx_photos_apartment ON photos(apartment_id, sort);

CREATE TABLE news (
  id INTEGER PRIMARY KEY,
  title_cs TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  body_cs TEXT NOT NULL,
  body_en TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`,
	`
ALTER TABLE apartments ADD COLUMN description_cs TEXT NOT NULL DEFAULT '';
ALTER TABLE apartments ADD COLUMN description_en TEXT NOT NULL DEFAULT '';
`,
}

// Open opens (and creates if needed) the database at path and migrates it.
func Open(path string) (*sql.DB, error) {
	if path != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
			return nil, err
		}
	}
	q := url.Values{}
	q.Add("_pragma", "foreign_keys(1)")
	q.Add("_pragma", "busy_timeout(5000)")
	q.Add("_pragma", "journal_mode(WAL)")
	q.Add("_pragma", "synchronous(NORMAL)")
	// Write transactions take the lock up front so availability checks cannot race.
	q.Add("_txlock", "immediate")
	dsn := "file:" + path + "?" + q.Encode()
	if path == ":memory:" {
		dsn = "file::memory:?cache=shared&" + q.Encode()
	}
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	if path == ":memory:" {
		conn.SetMaxOpenConns(1)
	} else {
		conn.SetMaxOpenConns(4)
	}
	if err := migrate(conn); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

func migrate(conn *sql.DB) error {
	var version int
	if err := conn.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return err
	}
	for i := version; i < len(migrations); i++ {
		tx, err := conn.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(migrations[i]); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %d: %w", i+1, err)
		}
		if _, err := tx.Exec(fmt.Sprintf("PRAGMA user_version = %d", i+1)); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}
