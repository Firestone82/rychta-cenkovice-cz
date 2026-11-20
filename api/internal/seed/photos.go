package seed

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"rychtacenkovice.cz/api/internal/media"
	"rychtacenkovice.cz/api/internal/store"
)

type ImportOptions struct {
	// Dir is a local folder mirroring the original site's /userFiles tree. When empty, photos are downloaded from BaseURL.
	Dir     string
	BaseURL string
	// Replace re-imports photos that already have files.
	Replace  bool
	MediaDir string
}

type ImportResult struct {
	Imported int
	Skipped  int
	Failed   []string
}

// ImportPhotos fetches every photo of the seeded list and generates its gallery sizes.
func ImportPhotos(ctx context.Context, st *store.Store, opt ImportOptions) (*ImportResult, error) {
	photos, _, err := st.ListPhotos(ctx, store.PhotoFilter{IncludeMissing: true, Limit: 200})
	if err != nil {
		return nil, err
	}
	// ListPhotos caps a page at 200 rows; page through everything.
	all := photos
	for offset := len(photos); len(photos) == 200; offset += len(photos) {
		photos, _, err = st.ListPhotos(ctx, store.PhotoFilter{IncludeMissing: true, Limit: 200, Offset: offset})
		if err != nil {
			return nil, err
		}
		all = append(all, photos...)
	}
	res := &ImportResult{}
	client := &http.Client{Timeout: 3 * time.Minute}
	for _, p := range all {
		if p.SourcePath == "" || (p.File != "" && !opt.Replace) {
			res.Skipped++
			continue
		}
		r, err := openSource(ctx, client, opt, p.SourcePath)
		if err != nil {
			slog.Warn("import: source missing", "path", p.SourcePath, "err", err)
			res.Failed = append(res.Failed, p.SourcePath)
			continue
		}
		processed, err := media.Process(r, opt.MediaDir)
		r.Close()
		if err != nil {
			slog.Warn("import: cannot process", "path", p.SourcePath, "err", err)
			res.Failed = append(res.Failed, p.SourcePath)
			continue
		}
		oldFile, oldWidths := p.File, p.Widths
		if err := st.SetPhotoFile(ctx, p.ID, processed.File, processed.Width, processed.Height, processed.Widths, processed.Color, processed.Placeholder); err != nil {
			return res, err
		}
		if oldFile != "" {
			media.Remove(opt.MediaDir, oldFile, oldWidths)
		}
		res.Imported++
		if res.Imported%20 == 0 {
			slog.Info("import: progress", "imported", res.Imported)
		}
	}
	return res, nil
}

func openSource(ctx context.Context, client *http.Client, opt ImportOptions, sourcePath string) (io.ReadCloser, error) {
	if opt.Dir != "" {
		clean := filepath.Clean("/" + sourcePath) // keeps the path inside Dir
		return os.Open(filepath.Join(opt.Dir, clean))
	}
	parts := strings.Split(sourcePath, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, opt.BaseURL+"/"+strings.Join(parts, "/"), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "rychta-photo-import/1.0")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return resp.Body, nil
}

// Demo adds a few example bookings and messages so the administration is not empty
// while trying the application out. It is never run automatically.
func Demo(ctx context.Context, st *store.Store) error {
	apts, err := st.ListApartments(ctx, true)
	if err != nil {
		return err
	}
	if len(apts) < 6 {
		return fmt.Errorf("seed demo: apartments missing")
	}
	day := func(offset int) string { return time.Now().AddDate(0, 0, offset).Format(store.DateLayout) }
	id := func(n int) int64 { return apts[n-1].ID }

	msgID, err := st.CreateMessage(ctx, &store.Message{
		Name: "Jana Dvořáková", Email: "jana.dvorakova@example.com", Phone: "+420 777 123 456", Language: "cs",
		Body: "Dobrý den, měli bychom zájem o pobyt pro 14 lidí (dvě rodiny s dětmi) od " + day(40) + " do " + day(44) + ". Je možné propojit apartmány 4 a 5? Děkuji.",
	})
	if err != nil {
		return err
	}
	if _, err := st.CreateMessage(ctx, &store.Message{
		Name: "Tom Becker", Email: "tom.becker@example.com", Language: "en",
		Body: "Hello, is the hot tub available in winter and can we bring our own skis into the ski room? We are thinking about the second week of February.",
	}); err != nil {
		return err
	}
	_ = msgID

	demo := []*store.Booking{
		{Kind: "guest", Status: "confirmed", Source: "admin", CheckIn: day(-2), CheckOut: day(3), Guests: 9, Name: "Petr Novák", Email: "petr.novak@example.com", Phone: "+420 602 111 222", Language: "cs", ApartmentIDs: []int64{id(3)}, AdminNote: "Záloha zaplacena převodem."},
		{Kind: "guest", Status: "confirmed", Source: "web", CheckIn: day(1), CheckOut: day(4), Guests: 4, Name: "Lucie Králová", Email: "lucie.kralova@example.com", Phone: "+420 731 555 010", Language: "cs", ApartmentIDs: []int64{id(1)}},
		{Kind: "guest", Status: "confirmed", Source: "admin", CheckIn: day(6), CheckOut: day(13), Guests: 28, Name: "Lyžařský oddíl Sokol", Email: "sokol@example.com", Phone: "+420 603 987 654", Language: "cs", ApartmentIDs: []int64{id(1), id(2), id(3), id(5), id(6)}, Note: "Celý týden, přijedeme autobusem."},
		{Kind: "guest", Status: "pending", Source: "web", CheckIn: day(15), CheckOut: day(18), Guests: 6, Name: "Anna Schmidt", Email: "anna.schmidt@example.com", Phone: "+49 170 5550123", Language: "en", ApartmentIDs: []int64{id(2)}, Note: "We arrive late on Friday, around 9 pm."},
		{Kind: "guest", Status: "pending", Source: "web", CheckIn: day(20), CheckOut: day(23), Guests: 5, Name: "Martin Svoboda", Email: "martin.svoboda@example.com", Phone: "+420 724 000 321", Language: "cs", ApartmentIDs: []int64{id(6)}},
		{Kind: "block", Status: "confirmed", Source: "admin", CheckIn: day(8), CheckOut: day(11), Guests: 0, Name: "Malování", Language: "cs", ApartmentIDs: []int64{id(4)}, AdminNote: "Malování a drobné opravy."},
		{Kind: "guest", Status: "cancelled", Source: "web", CheckIn: day(25), CheckOut: day(27), Guests: 3, Name: "Eva Malá", Email: "eva.mala@example.com", Language: "cs", ApartmentIDs: []int64{id(4)}},
	}
	for _, b := range demo {
		if err := st.CreateBooking(ctx, b); err != nil {
			return fmt.Errorf("seed demo booking %s: %w", b.Name, err)
		}
	}
	return nil
}
