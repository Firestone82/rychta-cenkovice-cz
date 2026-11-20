package httpapi

import (
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"rychtacenkovice.cz/api/internal/media"
	"rychtacenkovice.cz/api/internal/store"
)

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	d, err := s.st.DashboardData(r.Context(), s.today())
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"today": s.today(), "dashboard": d})
}

// ---------- bookings ----------

func (s *Server) handleAdminBookings(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := s.st.ListBookings(r.Context(), store.BookingFilter{
		Status: q.Get("status"), Kind: q.Get("kind"), From: q.Get("from"), To: q.Get("to"), Query: q.Get("q"), Order: q.Get("order"),
	})
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list})
}

func (s *Server) handleAdminBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	b, err := s.st.BookingByID(r.Context(), id)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}

// adminBookingInput uses pointers so that PATCH only changes the fields that were sent.
type adminBookingInput struct {
	Kind         *string  `json:"kind"`
	Status       *string  `json:"status"`
	ApartmentIDs *[]int64 `json:"apartment_ids"`
	CheckIn      *string  `json:"check_in"`
	CheckOut     *string  `json:"check_out"`
	Guests       *int     `json:"guests"`
	Name         *string  `json:"name"`
	Email        *string  `json:"email"`
	Phone        *string  `json:"phone"`
	Note         *string  `json:"note"`
	AdminNote    *string  `json:"admin_note"`
	// TotalPrice: a number sets the price; AutoPrice recalculates it from the nightly prices.
	TotalPrice *int    `json:"total_price"`
	ClearPrice bool    `json:"clear_price"`
	AutoPrice  bool    `json:"auto_price"`
	Language   *string `json:"language"`
	MessageID  *int64  `json:"message_id"`
	// Notify sends the guest an e-mail about the confirmation or cancellation.
	Notify bool `json:"notify"`
}

func (in *adminBookingInput) apply(b *store.Booking) {
	set := func(dst *string, src *string) {
		if src != nil {
			*dst = strings.TrimSpace(*src)
		}
	}
	set(&b.Kind, in.Kind)
	set(&b.Status, in.Status)
	set(&b.CheckIn, in.CheckIn)
	set(&b.CheckOut, in.CheckOut)
	set(&b.Name, in.Name)
	set(&b.Email, in.Email)
	set(&b.Phone, in.Phone)
	set(&b.Note, in.Note)
	set(&b.AdminNote, in.AdminNote)
	if in.Language != nil {
		b.Language = lang(*in.Language)
	}
	if in.Guests != nil {
		b.Guests = *in.Guests
	}
	if in.ApartmentIDs != nil {
		b.ApartmentIDs = *in.ApartmentIDs
	}
	if in.TotalPrice != nil {
		b.TotalPrice = in.TotalPrice
	}
	if in.ClearPrice {
		b.TotalPrice = nil
	}
}

func (s *Server) validateAdminBooking(r *http.Request, b *store.Booking, autoPrice bool) (map[string]string, []*store.Apartment) {
	fields := map[string]string{}
	if b.Kind != "guest" && b.Kind != "block" {
		fields["kind"] = "invalid"
	}
	if b.Status != "pending" && b.Status != "confirmed" && b.Status != "cancelled" {
		fields["status"] = "invalid"
	}
	if b.Kind == "guest" {
		if n := utf8.RuneCountInString(b.Name); n < 2 || n > 120 {
			fields["name"] = "required"
		}
		if b.Email != "" && !validEmail(b.Email) {
			fields["email"] = "invalid"
		}
		if b.Phone != "" && !phoneRe.MatchString(b.Phone) {
			fields["phone"] = "invalid"
		}
		if b.Guests < 1 || b.Guests > 200 {
			fields["guests"] = "invalid"
		}
	} else {
		b.Guests = 0
		if b.Status == "pending" {
			b.Status = "confirmed"
		}
	}
	if utf8.RuneCountInString(b.Note) > 2000 || utf8.RuneCountInString(b.AdminNote) > 4000 {
		fields["note"] = "too_long"
	}
	if b.TotalPrice != nil && (*b.TotalPrice < 0 || *b.TotalPrice > 100_000_000) {
		fields["total_price"] = "invalid"
	}
	selected, auto := s.validateStay(r, b.ApartmentIDs, b.CheckIn, b.CheckOut, b.Guests, false, fields)
	if autoPrice {
		b.TotalPrice = auto
	}
	ids := make([]int64, 0, len(selected))
	for _, a := range selected {
		ids = append(ids, a.ID)
	}
	b.ApartmentIDs = ids
	return fields, selected
}

// handleAdminCreateBooking lets the administrator enter a booking by hand, for example
// from a phone call or from a message sent through the contact form.
func (s *Server) handleAdminCreateBooking(w http.ResponseWriter, r *http.Request) {
	var in adminBookingInput
	if !decode(w, r, &in) {
		return
	}
	b := &store.Booking{Kind: "guest", Status: "confirmed", Source: "admin", Language: "cs", Guests: 1}
	in.apply(b)
	uid := currentUser(r).ID
	b.CreatedBy = &uid
	if in.MessageID != nil && *in.MessageID > 0 {
		if _, err := s.st.MessageByID(r.Context(), *in.MessageID); err != nil {
			writeValidation(w, map[string]string{"message_id": "unknown"})
			return
		}
		b.MessageID = in.MessageID
	}
	fields, selected := s.validateAdminBooking(r, b, in.AutoPrice || (in.TotalPrice == nil && !in.ClearPrice))
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	if err := s.st.CreateBooking(r.Context(), b); err != nil {
		s.storeError(w, r, err)
		return
	}
	if b.MessageID != nil {
		_ = s.st.SetMessageStatus(r.Context(), *b.MessageID, "read")
	}
	if in.Notify && b.Kind == "guest" && b.Email != "" && b.Status == "confirmed" {
		s.mail.SendAsync(s.mailGuestBooking(b, selected, "confirmed"))
	}
	writeJSON(w, http.StatusCreated, b)
}

func (s *Server) handleAdminUpdateBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	var in adminBookingInput
	if !decode(w, r, &in) {
		return
	}
	b, err := s.st.BookingByID(r.Context(), id)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	before := b.Status
	in.apply(b)
	fields, selected := s.validateAdminBooking(r, b, in.AutoPrice)
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	if err := s.st.UpdateBooking(r.Context(), b); err != nil {
		s.storeError(w, r, err)
		return
	}
	if in.Notify && b.Kind == "guest" && b.Email != "" && b.Status != before {
		switch b.Status {
		case "confirmed":
			s.mail.SendAsync(s.mailGuestBooking(b, selected, "confirmed"))
		case "cancelled":
			s.mail.SendAsync(s.mailGuestBooking(b, selected, "cancelled"))
		}
	}
	writeJSON(w, http.StatusOK, b)
}

func (s *Server) handleAdminDeleteBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	if err := s.st.DeleteBooking(r.Context(), id); err != nil {
		s.serverError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- messages ----------

func (s *Server) handleAdminMessages(w http.ResponseWriter, r *http.Request) {
	list, err := s.st.ListMessages(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list})
}

func (s *Server) handleAdminUpdateMessage(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	var in struct {
		Status string `json:"status"`
	}
	if !ok || !decode(w, r, &in) {
		if !ok {
			writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		}
		return
	}
	if in.Status != "new" && in.Status != "read" && in.Status != "archived" {
		writeValidation(w, map[string]string{"status": "invalid"})
		return
	}
	if err := s.st.SetMessageStatus(r.Context(), id, in.Status); err != nil {
		s.storeError(w, r, err)
		return
	}
	m, err := s.st.MessageByID(r.Context(), id)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleAdminDeleteMessage(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	if err := s.st.DeleteMessage(r.Context(), id); err != nil {
		s.serverError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- apartments ----------

func (s *Server) handleAdminApartments(w http.ResponseWriter, r *http.Request) {
	list, err := s.st.ListApartments(r.Context(), false)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list})
}

func (s *Server) handleAdminUpdateApartment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	a, err := s.st.ApartmentByID(r.Context(), id)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	var in struct {
		Area          *int            `json:"area"`
		Beds          *int            `json:"beds"`
		ExtraBeds     *int            `json:"extra_beds"`
		Accessible    *bool           `json:"accessible"`
		Type          *store.L10n     `json:"type"`
		Layout        *store.L10n     `json:"layout"`
		Features      *store.L10nList `json:"features"`
		Note          *store.L10n     `json:"note"`
		PricePerNight *int            `json:"price_per_night"`
		ClearPrice    bool            `json:"clear_price"`
		MinNights     *int            `json:"min_nights"`
		Active        *bool           `json:"active"`
	}
	if !decode(w, r, &in) {
		return
	}
	fields := map[string]string{}
	if in.Area != nil {
		a.Area = *in.Area
	}
	if in.Beds != nil {
		a.Beds = *in.Beds
	}
	if in.ExtraBeds != nil {
		a.ExtraBeds = *in.ExtraBeds
	}
	if in.Accessible != nil {
		a.Accessible = *in.Accessible
	}
	if in.Type != nil {
		a.Type = *in.Type
	}
	if in.Layout != nil {
		a.Layout = *in.Layout
	}
	if in.Features != nil {
		a.Features = *in.Features
	}
	if in.Note != nil {
		a.Note = *in.Note
	}
	if in.PricePerNight != nil {
		a.PricePerNight = in.PricePerNight
	}
	if in.ClearPrice {
		a.PricePerNight = nil
	}
	if in.MinNights != nil {
		a.MinNights = *in.MinNights
	}
	if in.Active != nil {
		a.Active = *in.Active
	}
	if a.Area < 1 || a.Area > 1000 {
		fields["area"] = "invalid"
	}
	if a.Beds < 1 || a.Beds > 50 {
		fields["beds"] = "invalid"
	}
	if a.ExtraBeds < 0 || a.ExtraBeds > 20 {
		fields["extra_beds"] = "invalid"
	}
	if a.MinNights < 1 || a.MinNights > 30 {
		fields["min_nights"] = "invalid"
	}
	if a.PricePerNight != nil && (*a.PricePerNight < 0 || *a.PricePerNight > 1_000_000) {
		fields["price_per_night"] = "invalid"
	}
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	if err := s.st.SaveApartment(r.Context(), a); err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// ---------- photos ----------

var photoCategories = map[string]bool{
	"house": true, "surroundings": true, "apartment": true, "common-room": true,
	"facilities": true, "wellness": true, "trips": true, "winter": true, "misc": true,
}

func (s *Server) handleAdminPhotos(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := store.PhotoFilter{Category: q.Get("category"), Limit: 200}
	f.Offset, _ = strconv.Atoi(q.Get("offset"))
	f.ApartmentID, _ = strconv.ParseInt(q.Get("apartment"), 10, 64)
	items, total, err := s.st.ListPhotos(r.Context(), f)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

func (s *Server) photoTarget(r *http.Request, category string, apartment int64, fields map[string]string) *int64 {
	if !photoCategories[category] {
		fields["category"] = "invalid"
		return nil
	}
	if category != "apartment" {
		return nil
	}
	if _, err := s.st.ApartmentByID(r.Context(), apartment); err != nil {
		fields["apartment_id"] = "unknown"
		return nil
	}
	return &apartment
}

func (s *Server) handleAdminUploadPhoto(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, media.MaxUploadBytes+1<<20)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "too_large", "The photo is larger than 25 MB or the upload is malformed.")
		return
	}
	defer r.MultipartForm.RemoveAll()
	fields := map[string]string{}
	category := r.FormValue("category")
	apartment, _ := strconv.ParseInt(r.FormValue("apartment_id"), 10, 64)
	aptID := s.photoTarget(r, category, apartment, fields)
	file, _, err := r.FormFile("file")
	if err != nil {
		fields["file"] = "required"
	}
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	defer file.Close()
	processed, err := media.Process(file, s.cfg.MediaDir)
	if err != nil {
		writeValidation(w, map[string]string{"file": "not_an_image"})
		return
	}
	sort, err := s.st.NextPhotoSort(r.Context())
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	id, err := s.st.InsertPhoto(r.Context(), store.PhotoInput{
		Category: category, ApartmentID: aptID, File: processed.File, Width: processed.Width, Height: processed.Height,
		Widths: processed.Widths, Color: processed.Color, Placeholder: processed.Placeholder,
		Alt:  store.L10n{Cs: strings.TrimSpace(r.FormValue("alt_cs")), En: strings.TrimSpace(r.FormValue("alt_en"))},
		Sort: sort,
	})
	if err != nil {
		media.Remove(s.cfg.MediaDir, processed.File, processed.Widths)
		s.serverError(w, r, err)
		return
	}
	p, err := s.st.PhotoByID(r.Context(), id)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) handleAdminUpdatePhoto(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	p, err := s.st.PhotoByID(r.Context(), id)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	var in struct {
		Category    *string     `json:"category"`
		ApartmentID *int64      `json:"apartment_id"`
		Alt         *store.L10n `json:"alt"`
		Sort        *int        `json:"sort"`
	}
	if !decode(w, r, &in) {
		return
	}
	category := p.Category
	if in.Category != nil {
		category = *in.Category
	}
	var apartment int64
	if p.ApartmentID != nil {
		apartment = *p.ApartmentID
	}
	if in.ApartmentID != nil {
		apartment = *in.ApartmentID
	}
	fields := map[string]string{}
	aptID := s.photoTarget(r, category, apartment, fields)
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	if in.Alt != nil {
		p.Alt = store.L10n{Cs: strings.TrimSpace(in.Alt.Cs), En: strings.TrimSpace(in.Alt.En)}
	}
	if in.Sort != nil {
		p.Sort = *in.Sort
	}
	if err := s.st.UpdatePhotoMeta(r.Context(), id, category, aptID, p.Alt, p.Sort); err != nil {
		s.storeError(w, r, err)
		return
	}
	p, err = s.st.PhotoByID(r.Context(), id)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleAdminDeletePhoto(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	p, err := s.st.PhotoByID(r.Context(), id)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	if err := s.st.DeletePhoto(r.Context(), id); err != nil {
		s.serverError(w, r, err)
		return
	}
	media.Remove(s.cfg.MediaDir, p.File, p.Widths)
	w.WriteHeader(http.StatusNoContent)
}

// ---------- news ----------

func (s *Server) handleAdminNews(w http.ResponseWriter, r *http.Request) {
	items, err := s.st.ListNews(r.Context(), false)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) handleAdminSaveNews(w http.ResponseWriter, r *http.Request) {
	var n store.News
	if !decode(w, r, &n) {
		return
	}
	n.ID = 0
	if r.Method == http.MethodPatch {
		id, ok := pathID(r)
		if !ok {
			writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
			return
		}
		n.ID = id
	}
	n.Title.Cs, n.Title.En = strings.TrimSpace(n.Title.Cs), strings.TrimSpace(n.Title.En)
	n.Body.Cs, n.Body.En = strings.TrimSpace(n.Body.Cs), strings.TrimSpace(n.Body.En)
	fields := map[string]string{}
	if n.Title.Cs == "" || utf8.RuneCountInString(n.Title.Cs) > 200 {
		fields["title_cs"] = "required"
	}
	if n.Body.Cs == "" || utf8.RuneCountInString(n.Body.Cs) > 20000 {
		fields["body_cs"] = "required"
	}
	if n.PublishedAt == "" {
		n.PublishedAt = s.today()
	} else if _, err := time.Parse(store.DateLayout, n.PublishedAt); err != nil {
		fields["published_at"] = "invalid"
	}
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	id, err := s.st.SaveNews(r.Context(), &n)
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	n.ID = id
	status := http.StatusOK
	if r.Method == http.MethodPost {
		status = http.StatusCreated
	}
	writeJSON(w, status, n)
}

func (s *Server) handleAdminDeleteNews(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "The record does not exist.")
		return
	}
	if err := s.st.DeleteNews(r.Context(), id); err != nil {
		s.serverError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
