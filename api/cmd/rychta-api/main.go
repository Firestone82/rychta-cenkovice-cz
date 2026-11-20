// Command rychta-api runs the management API of the Rychta Čenkovice website.
//
//	rychta-api serve            start the HTTP server (default)
//	rychta-api import-photos    download the photos of the original site and build gallery sizes
//	rychta-api create-admin     create or reset an administrator account
//	rychta-api seed-demo        add example bookings and messages (for trying things out)
package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"rychtacenkovice.cz/api/internal/auth"
	"rychtacenkovice.cz/api/internal/config"
	"rychtacenkovice.cz/api/internal/db"
	"rychtacenkovice.cz/api/internal/httpapi"
	"rychtacenkovice.cz/api/internal/mail"
	"rychtacenkovice.cz/api/internal/seed"
	"rychtacenkovice.cz/api/internal/store"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
	cmd := "serve"
	args := os.Args[1:]
	if len(args) > 0 && !strings.HasPrefix(args[0], "-") {
		cmd, args = args[0], args[1:]
	}
	if err := run(cmd, args); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run(cmd string, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	conn, err := db.Open(cfg.DBPath)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer conn.Close()
	st := store.New(conn)
	ctx := context.Background()

	if err := seed.Content(ctx, st); err != nil {
		return fmt.Errorf("seed content: %w", err)
	}

	switch cmd {
	case "serve":
		return serve(ctx, cfg, st)
	case "import-photos":
		fs := flag.NewFlagSet(cmd, flag.ExitOnError)
		dir := fs.String("dir", "", "local folder with the original /userFiles tree (instead of downloading)")
		replace := fs.Bool("replace", false, "re-import photos that are already imported")
		_ = fs.Parse(args)
		res, err := seed.ImportPhotos(ctx, st, seed.ImportOptions{Dir: *dir, BaseURL: cfg.PhotoSourceURL, Replace: *replace, MediaDir: cfg.MediaDir})
		if err != nil {
			return err
		}
		fmt.Printf("imported %d, skipped %d, failed %d\n", res.Imported, res.Skipped, len(res.Failed))
		for _, f := range res.Failed {
			fmt.Println("  failed:", f)
		}
		return nil
	case "create-admin":
		fs := flag.NewFlagSet(cmd, flag.ExitOnError)
		email := fs.String("email", "", "administrator e-mail")
		name := fs.String("name", "Administrátor", "display name")
		_ = fs.Parse(args)
		if *email == "" {
			return errors.New("usage: rychta-api create-admin -email you@example.com (the password is read from RC_ADMIN_PASSWORD or the terminal)")
		}
		password := cfg.AdminPassword
		if password == "" {
			fmt.Print("Password (at least 12 characters): ")
			line, _ := bufio.NewReader(os.Stdin).ReadString('\n')
			password = strings.TrimRight(line, "\r\n")
		}
		return upsertAdmin(ctx, st, *email, *name, password)
	case "seed-demo":
		return seed.Demo(ctx, st)
	default:
		return fmt.Errorf("unknown command %q (serve, import-photos, create-admin, seed-demo)", cmd)
	}
}

func upsertAdmin(ctx context.Context, st *store.Store, email, name, password string) error {
	if len([]rune(password)) < auth.MinPasswordLength {
		return fmt.Errorf("the password must have at least %d characters", auth.MinPasswordLength)
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	if u, err := st.UserByEmail(ctx, email); err == nil {
		if err := st.SetPassword(ctx, u.ID, hash); err != nil {
			return err
		}
		fmt.Println("password updated for", u.Email)
		return nil
	}
	if _, err := st.CreateUser(ctx, email, name, hash); err != nil {
		return err
	}
	fmt.Println("administrator created:", email)
	return nil
}

// bootstrapAdmin makes sure the very first start has an account to sign in with.
func bootstrapAdmin(ctx context.Context, cfg *config.Config, st *store.Store) error {
	n, err := st.CountUsers(ctx)
	if err != nil || n > 0 {
		return err
	}
	switch {
	case cfg.AdminEmail != "" && cfg.AdminPassword != "":
		return upsertAdmin(ctx, st, cfg.AdminEmail, "Administrátor", cfg.AdminPassword)
	case cfg.Env != "production":
		raw := make([]byte, 12)
		if _, err := rand.Read(raw); err != nil {
			return err
		}
		password := base64.RawURLEncoding.EncodeToString(raw)
		if err := upsertAdmin(ctx, st, "admin@rychtacenkovice.cz", "Administrátor", password); err != nil {
			return err
		}
		fmt.Printf("\n  Development administrator created\n  e-mail:   admin@rychtacenkovice.cz\n  password: %s\n  (shown once; change it in the administration)\n\n", password)
		return nil
	default:
		slog.Warn("no administrator exists: set RC_ADMIN_EMAIL and RC_ADMIN_PASSWORD, or run `rychta-api create-admin`")
		return nil
	}
}

func serve(ctx context.Context, cfg *config.Config, st *store.Store) error {
	if err := bootstrapAdmin(ctx, cfg, st); err != nil {
		return err
	}
	am := auth.NewManager(st.DB, cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTTL, cfg.RefreshTTL, cfg.SessionTTL)
	sender := mail.NewSender(cfg.SMTP, cfg.MailFrom, filepath.Join(filepath.Dir(cfg.DBPath), "outbox"))
	if !sender.Enabled() {
		slog.Warn("RC_SMTP_HOST not set: e-mails are written to the outbox folder instead of being sent")
	}
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.New(cfg, st, am, sender).Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       2 * time.Minute,
		WriteTimeout:      2 * time.Minute,
		IdleTimeout:       2 * time.Minute,
	}

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() { // forget finished sessions once a day
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			if n, err := am.Cleanup(ctx); err == nil && n > 0 {
				slog.Info("auth: removed expired sessions", "count", n)
			}
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()

	errc := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", cfg.Addr, "env", cfg.Env, "access_ttl", cfg.AccessTTL.String())
		errc <- srv.ListenAndServe()
	}()
	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return srv.Shutdown(shutdown)
}
