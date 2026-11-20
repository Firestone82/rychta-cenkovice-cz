package httpapi

import (
	"net/http"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"rychtacenkovice.cz/api/internal/store"
)

func (s *Server) handleApartments(w http.ResponseWriter, r *http.Request) {
	list, err := s.st.ListApartments(r.Context(), true)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, map[string]any{"items": list})
}

func (s *Server) handleApartment(w http.ResponseWriter, r *http.Request) {
	a, err := s.st.ApartmentBySlug(r.Context(), r.PathValue("slug"))
	if err == nil && !a.Active {
		err = store.ErrNotFound
	}
	if err != nil {
		s.storeError(w, r, err)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, a)
}

func validDate(v string) (time.Time, bool) {
	t, err := time.Parse(store.DateLayout, v)
	return t, err == nil
}

// handleAvailability returns the taken date ranges of every apartment, without guest data.
func (s *Server) handleAvailability(w http.ResponseWriter, r *http.Request) {
	from, to := r.URL.Query().Get("from"), r.URL.Query().Get("to")
	f, ok1 := validDate(from)
	t, ok2 := validDate(to)
	if !ok1 || !ok2 || !t.After(f) || t.Sub(f) > 800*24*time.Hour {
		writeValidation(w, map[string]string{"from": "invalid", "to": "invalid"})
		return
	}
	ranges, err := s.st.Occupancy(r.Context(), from, to)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"from": from, "to": to, "ranges": ranges})
}

// handleAvailabilityCheck tells which apartments are free for one concrete stay.
func (s *Server) handleAvailabilityCheck(w http.ResponseWriter, r *http.Request) {
	in, out := r.URL.Query().Get("check_in"), r.URL.Query().Get("check_out")
	a, ok1 := validDate(in)
	b, ok2 := validDate(out)
	if !ok1 || !ok2 || !b.After(a) {
		writeValidation(w, map[string]string{"check_in": "invalid", "check_out": "invalid"})
		return
	}
	taken, err := s.st.UnavailableApartments(r.Context(), in, out)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"check_in": in, "check_out": out, "nights": store.NightsBetween(in, out), "unavailable_ids": taken})
}

var phoneRe = regexp.MustCompile(`^\+?[0-9 ()./-]{6,24}$`)

func validEmail(v string) bool {
	if len(v) > 254 || strings.ContainsAny(v, " \r\n<>") {
		return false
	}
	addr, err := mail.ParseAddress(v)
	if err != nil || addr.Address != v {
		return false
	}
	at := strings.LastIndex(v, "@")
	return at > 0 && strings.Contains(v[at+1:], ".")
}

func lang(v string) string {
	if v == "en" {
		return "en"
	}
	return "cs"
}

type bookingRequest struct {
	ApartmentIDs []int64 `json:"apartment_ids"`
	CheckIn      string  `json:"check_in"`
	CheckOut     string  `json:"check_out"`
	Guests       int     `json:"guests"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Phone        string  `json:"phone"`
	Note         string  `json:"note"`
	Consent      bool    `json:"consent"`
	Language     string  `json:"language"`
	Website      string  `json:"website"` // honeypot: real visitors never fill this in
}

// validateStay checks dates, apartments and guest count shared by public and admin bookings.
// It returns the selected apartments and the automatic price (nil when any price is unknown).
func (s *Server) validateStay(r *http.Request, ids []int64, checkIn, checkOut string, guests int, public bool, fields map[string]string) ([]*store.Apartment, *int) {
	in, ok1 := validDate(checkIn)
	out, ok2 := validDate(checkOut)
	nights := 0
	switch {
	case !ok1:
		fields["check_in"] = "invalid"
	case !ok2:
		fields["check_out"] = "invalid"
	case !out.After(in):
		fields["check_out"] = "before_check_in"
	default:
		nights = int(out.Sub(in).Hours() / 24)
		if (public && nights > 90) || nights > 400 {
			fields["check_out"] = "too_long"
		}
		if public {
			today, _ := validDate(s.today())
			if in.Before(today) {
				fields["check_in"] = "in_past"
			} else if in.After(today.AddDate(2, 0, 0)) {
				fields["check_in"] = "too_far"
			}
		}
	}
	if len(ids) == 0 {
		fields["apartment_ids"] = "required"
		return nil, nil
	}
	seen := map[int64]bool{}
	var selected []*store.Apartment
	capacity := 0
	total := 0
	priced := true
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		a, err := s.st.ApartmentByID(r.Context(), id)
		if err != nil || (public && !a.Active) {
			fields["apartment_ids"] = "unknown"
			return nil, nil
		}
		selected = append(selected, a)
		capacity += a.Beds + a.ExtraBeds
		if a.PricePerNight == nil {
			priced = false
		} else {
			total += *a.PricePerNight * nights
		}
		if public && nights > 0 && nights < a.MinNights {
			fields["check_out"] = "min_nights"
		}
	}
	if public && (guests < 1 || guests > capacity) {
		fields["guests"] = "over_capacity"
	}
	if !priced || nights == 0 {
		return selected, nil
	}
	return selected, &total
}

func (s *Server) formLimited(w http.ResponseWriter, r *http.Request) bool {
	key := "form:" + s.clientIP(r)
	if blocked, wait := s.forms.blocked(key); blocked {
		tooMany(w, wait)
		return true
	}
	s.forms.hit(key)
	return false
}

// handleCreateBookingRequest stores a guest's booking request as "pending". The dates are
// held for the guest until the administrator confirms or declines the request.
func (s *Server) handleCreateBookingRequest(w http.ResponseWriter, r *http.Request) {
	var in bookingRequest
	if !decode(w, r, &in) {
		return
	}
	if in.Website != "" { // bot: answer as if it worked, store nothing
		writeJSON(w, http.StatusCreated, map[string]any{"code": store.NewBookingCode(), "status": "pending"})
		return
	}
	if s.formLimited(w, r) {
		return
	}
	in.Name, in.Email, in.Phone, in.Note = strings.TrimSpace(in.Name), strings.TrimSpace(in.Email), strings.TrimSpace(in.Phone), strings.TrimSpace(in.Note)
	fields := map[string]string{}
	if n := utf8.RuneCountInString(in.Name); n < 2 || n > 120 {
		fields["name"] = "required"
	}
	if !validEmail(in.Email) {
		fields["email"] = "invalid"
	}
	if !phoneRe.MatchString(in.Phone) {
		fields["phone"] = "invalid"
	}
	if utf8.RuneCountInString(in.Note) > 2000 {
		fields["note"] = "too_long"
	}
	if !in.Consent {
		fields["consent"] = "required"
	}
	selected, total := s.validateStay(r, in.ApartmentIDs, in.CheckIn, in.CheckOut, in.Guests, true, fields)
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	b := &store.Booking{
		Kind: "guest", Status: "pending", Source: "web",
		CheckIn: in.CheckIn, CheckOut: in.CheckOut, Guests: in.Guests,
		Name: in.Name, Email: in.Email, Phone: in.Phone, Note: in.Note,
		TotalPrice: total, Language: lang(in.Language),
	}
	for _, a := range selected {
		b.ApartmentIDs = append(b.ApartmentIDs, a.ID)
	}
	if err := s.st.CreateBooking(r.Context(), b); err != nil {
		s.storeError(w, r, err)
		return
	}
	s.mail.SendAsync(s.mailAdminBookingRequest(b, selected))
	s.mail.SendAsync(s.mailGuestBooking(b, selected, "received"))
	writeJSON(w, http.StatusCreated, map[string]any{
		"code": b.Code, "status": b.Status, "check_in": b.CheckIn, "check_out": b.CheckOut,
		"nights": b.Nights, "total_price": b.TotalPrice,
	})
}

func (s *Server) handleContact(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Message  string `json:"message"`
		Consent  bool   `json:"consent"`
		Language string `json:"language"`
		Website  string `json:"website"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Website != "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if s.formLimited(w, r) {
		return
	}
	in.Name, in.Email, in.Phone, in.Message = strings.TrimSpace(in.Name), strings.TrimSpace(in.Email), strings.TrimSpace(in.Phone), strings.TrimSpace(in.Message)
	fields := map[string]string{}
	if n := utf8.RuneCountInString(in.Name); n < 2 || n > 120 {
		fields["name"] = "required"
	}
	if !validEmail(in.Email) {
		fields["email"] = "invalid"
	}
	if in.Phone != "" && !phoneRe.MatchString(in.Phone) {
		fields["phone"] = "invalid"
	}
	if n := utf8.RuneCountInString(in.Message); n < 5 {
		fields["message"] = "required"
	} else if n > 4000 {
		fields["message"] = "too_long"
	}
	if !in.Consent {
		fields["consent"] = "required"
	}
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	m := &store.Message{Name: in.Name, Email: in.Email, Phone: in.Phone, Body: in.Message, Language: lang(in.Language)}
	id, err := s.st.CreateMessage(r.Context(), m)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	m.ID = id
	s.mail.SendAsync(s.mailAdminContact(m))
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handlePhotos(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := store.PhotoFilter{Category: q.Get("category")}
	f.Offset, _ = strconv.Atoi(q.Get("offset"))
	f.Limit, _ = strconv.Atoi(q.Get("limit"))
	f.ApartmentID, _ = strconv.ParseInt(q.Get("apartment"), 10, 64)
	if f.Offset < 0 {
		f.Offset = 0
	}
	if f.Limit <= 0 || f.Limit > 60 {
		f.Limit = 24
	}
	items, total, err := s.st.ListPhotos(r.Context(), f)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	resp := map[string]any{"items": items, "total": total, "next_offset": nil}
	if f.Offset+len(items) < total {
		resp["next_offset"] = f.Offset + len(items)
	}
	if f.Offset == 0 {
		cats, err := s.st.PhotoCategories(r.Context())
		if err != nil {
			s.serverError(w, r, err)
			return
		}
		resp["categories"] = cats
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleNews(w http.ResponseWriter, r *http.Request) {
	items, err := s.st.ListNews(r.Context(), true)
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// handlePhotoCovers returns one lead photo per gallery category (used for teasers).
func (s *Server) handlePhotoCovers(w http.ResponseWriter, r *http.Request) {
	covers, err := s.st.PhotoCovers(r.Context())
	if err != nil {
		s.serverError(w, r, err)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, map[string]any{"covers": covers})
}
