// Package media turns an uploaded or imported photo into the files the
// gallery needs: responsive JPEG sizes, a tiny blurred placeholder and the
// dominant colour (shown while the real image is still loading).
package media

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
	"regexp"

	"github.com/disintegration/imaging"
)

// Widths are the responsive sizes generated for each photo.
var Widths = []int{480, 960, 1600}

// MaxUploadBytes limits a single uploaded photo.
const MaxUploadBytes = 25 << 20

type Processed struct {
	File        string // base name; files on disk are <File>-<width>.jpg
	Width       int    // dimensions of the largest generated size
	Height      int
	Widths      []int
	Color       string // average colour, #rrggbb
	Placeholder string // data URI of a ~24 px wide blurred JPEG
}

// Process decodes the image (respecting EXIF orientation) and writes the sizes into dir.
func Process(r io.Reader, dir string) (*Processed, error) {
	img, err := imaging.Decode(io.LimitReader(r, MaxUploadBytes+1), imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("media: cannot read image: %w", err)
	}
	b := img.Bounds()
	if b.Dx() < 16 || b.Dy() < 16 {
		return nil, fmt.Errorf("media: image is too small (%dx%d)", b.Dx(), b.Dy())
	}
	if b.Dx()*b.Dy() > 80_000_000 {
		return nil, fmt.Errorf("media: image is too large (%dx%d)", b.Dx(), b.Dy())
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, err
	}
	id := make([]byte, 8)
	if _, err := rand.Read(id); err != nil {
		return nil, err
	}
	out := &Processed{File: hex.EncodeToString(id)}

	widths := []int{}
	for _, w := range Widths {
		if w < b.Dx() {
			widths = append(widths, w)
		}
	}
	if len(widths) < len(Widths) {
		// The original is smaller than the next size: keep it at its own width.
		widths = append(widths, b.Dx())
	}
	for _, w := range widths {
		var sized image.Image = img
		if w != b.Dx() {
			sized = imaging.Resize(img, w, 0, imaging.Lanczos)
		}
		quality := 82
		if w <= 480 {
			quality = 78
		}
		path := filepath.Join(dir, fmt.Sprintf("%s-%d.jpg", out.File, w))
		f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o640)
		if err != nil {
			return nil, err
		}
		err = jpeg.Encode(f, sized, &jpeg.Options{Quality: quality})
		if cerr := f.Close(); err == nil {
			err = cerr
		}
		if err != nil {
			return nil, err
		}
		out.Widths = append(out.Widths, w)
		out.Width, out.Height = sized.Bounds().Dx(), sized.Bounds().Dy()
	}

	tiny := imaging.Blur(imaging.Resize(img, 24, 0, imaging.Box), 0.8)
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, tiny, &jpeg.Options{Quality: 55}); err != nil {
		return nil, err
	}
	out.Placeholder = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())

	px := imaging.Resize(img, 1, 1, imaging.Box)
	cr, cg, cb, _ := px.At(0, 0).RGBA()
	out.Color = fmt.Sprintf("#%02x%02x%02x", cr>>8, cg>>8, cb>>8)
	return out, nil
}

// Remove deletes all generated sizes of a photo.
func Remove(dir, file string, widths []int) {
	if !validBase.MatchString(file) {
		return
	}
	for _, w := range widths {
		_ = os.Remove(filepath.Join(dir, fmt.Sprintf("%s-%d.jpg", file, w)))
	}
}

var validBase = regexp.MustCompile(`^[a-f0-9]{16}$`)

// ValidName reports whether name is a media file this package generated ("<16 hex>-<width>.jpg").
var ValidName = regexp.MustCompile(`^[a-f0-9]{16}-\d{2,4}\.jpg$`).MatchString
