// Package mail sends plain-text e-mails over SMTP. Without an SMTP host it
// writes them to an outbox folder instead, which is handy during development.
package mail

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"rychtacenkovice.cz/api/internal/config"
)

type Message struct {
	To      string
	ReplyTo string
	Subject string
	Body    string
}

type Sender struct {
	cfg    config.SMTP
	from   string
	outbox string
}

func NewSender(cfg config.SMTP, from, outboxDir string) *Sender {
	return &Sender{cfg: cfg, from: from, outbox: outboxDir}
}

// Enabled reports whether real delivery is configured.
func (s *Sender) Enabled() bool { return s.cfg.Host != "" }

// SendAsync delivers in the background and logs the outcome; a failing mail
// server must never fail the booking or contact request itself.
func (s *Sender) SendAsync(m Message) {
	go func() {
		if err := s.Send(m); err != nil {
			slog.Error("mail: delivery failed", "to", m.To, "subject", m.Subject, "err", err)
		}
	}()
}

func clean(header string) string {
	return strings.NewReplacer("\r", " ", "\n", " ").Replace(header)
}

func (s *Sender) build(m Message) ([]byte, string, error) {
	from, err := mail.ParseAddress(s.from)
	if err != nil {
		return nil, "", fmt.Errorf("mail: invalid from address: %w", err)
	}
	to, err := mail.ParseAddress(m.To)
	if err != nil {
		return nil, "", fmt.Errorf("mail: invalid recipient: %w", err)
	}
	id := make([]byte, 12)
	_, _ = rand.Read(id)
	domain := "localhost"
	if at := strings.LastIndex(from.Address, "@"); at >= 0 {
		domain = from.Address[at+1:]
	}
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "From: %s\r\n", from.String())
	fmt.Fprintf(&buf, "To: %s\r\n", to.String())
	if m.ReplyTo != "" {
		if rt, err := mail.ParseAddress(m.ReplyTo); err == nil {
			fmt.Fprintf(&buf, "Reply-To: %s\r\n", rt.String())
		}
	}
	fmt.Fprintf(&buf, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", clean(m.Subject)))
	fmt.Fprintf(&buf, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(&buf, "Message-ID: <%s@%s>\r\n", hex.EncodeToString(id), domain)
	buf.WriteString("MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n")
	enc := base64.StdEncoding.EncodeToString([]byte(strings.ReplaceAll(m.Body, "\r\n", "\n")))
	for len(enc) > 76 {
		buf.WriteString(enc[:76] + "\r\n")
		enc = enc[76:]
	}
	buf.WriteString(enc + "\r\n")
	return buf.Bytes(), to.Address, nil
}

func (s *Sender) Send(m Message) error {
	raw, rcpt, err := s.build(m)
	if err != nil {
		return err
	}
	if !s.Enabled() {
		return s.writeOutbox(m, raw)
	}
	from, _ := mail.ParseAddress(s.from)
	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprint(s.cfg.Port))
	dialer := &net.Dialer{Timeout: 15 * time.Second}
	tlsCfg := &tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}

	var conn net.Conn
	if s.cfg.TLS == "tls" {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
	} else {
		conn, err = dialer.Dial("tcp", addr)
	}
	if err != nil {
		return err
	}
	_ = conn.SetDeadline(time.Now().Add(45 * time.Second))
	c, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		conn.Close()
		return err
	}
	defer c.Close()
	if s.cfg.TLS == "starttls" {
		if ok, _ := c.Extension("STARTTLS"); !ok {
			return fmt.Errorf("mail: server %s does not offer STARTTLS", s.cfg.Host)
		}
		if err := c.StartTLS(tlsCfg); err != nil {
			return err
		}
	}
	if s.cfg.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)); err != nil {
			return err
		}
	}
	if err := c.Mail(from.Address); err != nil {
		return err
	}
	if err := c.Rcpt(rcpt); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(raw); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}

func (s *Sender) writeOutbox(m Message, raw []byte) error {
	slog.Info("mail: SMTP not configured, e-mail saved to outbox", "to", m.To, "subject", m.Subject)
	if s.outbox == "" {
		return nil
	}
	if err := os.MkdirAll(s.outbox, 0o750); err != nil {
		return err
	}
	id := make([]byte, 4)
	_, _ = rand.Read(id)
	name := fmt.Sprintf("%s-%s.txt", time.Now().UTC().Format("20060102-150405"), hex.EncodeToString(id))
	readable := fmt.Sprintf("To: %s\nReply-To: %s\nSubject: %s\n\n%s\n", m.To, m.ReplyTo, m.Subject, m.Body)
	return os.WriteFile(filepath.Join(s.outbox, name), []byte(readable), 0o640)
}
