package httpapi

import (
	"fmt"
	"strings"
	"time"

	"rychtacenkovice.cz/api/internal/mail"
	"rychtacenkovice.cz/api/internal/store"
)

func fmtDate(iso, language string) string {
	t, err := time.Parse(store.DateLayout, iso)
	if err != nil {
		return iso
	}
	if language == "en" {
		return t.Format("2 January 2006")
	}
	return fmt.Sprintf("%d. %d. %d", t.Day(), int(t.Month()), t.Year())
}

func fmtPrice(v *int, language string) string {
	if v == nil {
		if language == "en" {
			return "we will confirm the price by e-mail"
		}
		return "cenu vám potvrdíme e-mailem"
	}
	digits := fmt.Sprint(*v)
	var out []string
	for len(digits) > 3 {
		out = append([]string{digits[len(digits)-3:]}, out...)
		digits = digits[:len(digits)-3]
	}
	out = append([]string{digits}, out...)
	return strings.Join(out, " ") + " Kč"
}

func apartmentNames(apts []*store.Apartment, language string) string {
	word := "Apartmán"
	if language == "en" {
		word = "Apartment"
	}
	names := make([]string, len(apts))
	for i, a := range apts {
		names[i] = fmt.Sprintf("%s %d", word, a.Number)
	}
	return strings.Join(names, ", ")
}

func (s *Server) mailAdminBookingRequest(b *store.Booking, apts []*store.Apartment) mail.Message {
	body := fmt.Sprintf(`Nová poptávka rezervace z webu.

Kód: %s
Termín: %s – %s (%d nocí)
Apartmány: %s
Počet osob: %d
Orientační cena: %s

Jméno: %s
E-mail: %s
Telefon: %s

Poznámka hosta:
%s

Poptávku potvrdíte nebo odmítnete v administraci:
%s/admin/bookings/%d

Termín je do vašeho rozhodnutí pro ostatní hosty blokovaný.
`, b.Code, fmtDate(b.CheckIn, "cs"), fmtDate(b.CheckOut, "cs"), b.Nights, apartmentNames(apts, "cs"), b.Guests,
		fmtPrice(b.TotalPrice, "cs"), b.Name, b.Email, b.Phone, orDash(b.Note), s.cfg.PublicURL, b.ID)
	return mail.Message{
		To:      s.cfg.MailTo,
		ReplyTo: b.Email,
		Subject: fmt.Sprintf("Nová poptávka %s: %s – %s, %s", b.Code, fmtDate(b.CheckIn, "cs"), fmtDate(b.CheckOut, "cs"), b.Name),
		Body:    body,
	}
}

func orDash(v string) string {
	if strings.TrimSpace(v) == "" {
		return "–"
	}
	return v
}

// mailGuestBooking writes to the guest in their language. kind: received | confirmed | cancelled.
// message is the owner's own note to the guest; it goes right after the opening paragraph.
func (s *Server) mailGuestBooking(b *store.Booking, apts []*store.Apartment, kind, message string) mail.Message {
	l := b.Language
	if message = strings.TrimSpace(message); message != "" {
		if l == "en" {
			message = "A message from us:\n" + message + "\n\n"
		} else {
			message = "Zpráva od nás:\n" + message + "\n\n"
		}
	}
	summaryCs := fmt.Sprintf("Kód rezervace: %s\nTermín: %s – %s (%d nocí)\nApartmány: %s\nPočet osob: %d\nCena: %s\n",
		b.Code, fmtDate(b.CheckIn, "cs"), fmtDate(b.CheckOut, "cs"), b.Nights, apartmentNames(apts, "cs"), b.Guests, fmtPrice(b.TotalPrice, "cs"))
	summaryEn := fmt.Sprintf("Booking code: %s\nDates: %s – %s (%d nights)\nApartments: %s\nGuests: %d\nPrice: %s\n",
		b.Code, fmtDate(b.CheckIn, "en"), fmtDate(b.CheckOut, "en"), b.Nights, apartmentNames(apts, "en"), b.Guests, fmtPrice(b.TotalPrice, "en"))
	signCs := "\nRychta Čenkovice\nČenkovice 106, 561 64 Čenkovice\n+420 606 734 911\n" + s.cfg.PublicURL + "\n"
	signEn := signCs

	var subject, body string
	switch {
	case kind == "received" && l == "en":
		subject = "We have received your booking request " + b.Code
		body = "Hello " + b.Name + ",\n\nthank you for your request. We are holding the dates for you and will confirm availability and the price as soon as we can. You do not pay anything yet.\n\n" + summaryEn + "\nIf anything changes, just reply to this e-mail.\n" + signEn
	case kind == "received":
		subject = "Přijali jsme vaši poptávku " + b.Code
		body = "Dobrý den,\n\nděkujeme za vaši poptávku. Termín pro vás držíme a co nejdříve vám potvrdíme volno a cenu. Zatím nic neplatíte.\n\n" + summaryCs + "\nKdyby se cokoli změnilo, stačí odpovědět na tento e-mail.\n" + signCs
	case kind == "confirmed" && l == "en":
		subject = "Your booking " + b.Code + " is confirmed"
		body = "Hello " + b.Name + ",\n\nyour stay at Rychta Čenkovice is confirmed. You will pick up the keys on the day of arrival; we will send the details before your stay.\n\n" + message + summaryEn + signEn
	case kind == "confirmed":
		subject = "Vaše rezervace " + b.Code + " je potvrzena"
		body = "Dobrý den,\n\nváš pobyt na Rychtě Čenkovice je potvrzen. Klíče si převezmete v den příjezdu, podrobnosti vám pošleme před pobytem.\n\n" + message + summaryCs + signCs
	case l == "en":
		subject = "Your booking " + b.Code + " was cancelled"
		body = "Hello " + b.Name + ",\n\nyour booking request below was cancelled. If this is a mistake or you would like other dates, reply to this e-mail or call us.\n\n" + message + summaryEn + signEn
	default:
		subject = "Vaše rezervace " + b.Code + " byla zrušena"
		body = "Dobrý den,\n\nníže uvedená rezervace byla zrušena. Pokud jde o omyl nebo byste chtěli jiný termín, odpovězte na tento e-mail nebo nám zavolejte.\n\n" + message + summaryCs + signCs
	}
	return mail.Message{To: b.Email, ReplyTo: s.cfg.MailTo, Subject: subject, Body: body}
}

func (s *Server) mailAdminContact(m *store.Message) mail.Message {
	body := fmt.Sprintf(`Nová zpráva z kontaktního formuláře.

Jméno: %s
E-mail: %s
Telefon: %s

%s

Ze zprávy můžete rovnou vytvořit rezervaci v administraci:
%s/admin/messages
`, m.Name, m.Email, orDash(m.Phone), m.Body, s.cfg.PublicURL)
	return mail.Message{To: s.cfg.MailTo, ReplyTo: m.Email, Subject: "Zpráva z webu: " + m.Name, Body: body}
}
