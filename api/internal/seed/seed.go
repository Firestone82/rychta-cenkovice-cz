// Package seed fills an empty database with the apartments and the photo list
// taken over from the original rychtacenkovice.cz website.
package seed

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"path"
	"strings"

	"rychtacenkovice.cz/api/internal/store"
)

//go:embed photos.json
var photosJSON []byte

type manifestPhoto struct {
	Category  string `json:"category"`
	Apartment *int   `json:"apartment"`
	Path      string `json:"path"`
}

const (
	kitchenCs = "plně vybavený kuchyňský kout"
	kitchenEn = "fully equipped kitchenette"
	bathCs    = "samostatná koupelna se dvěma umyvadly, sprchovým koutem a WC"
	bathEn    = "separate bathroom with two washbasins, a shower and a toilet"
	connectCs = "Apartmány 4 a 5 lze propojit. Každý má ve své části dveře, které si host může odemknout."
	connectEn = "Apartments 4 and 5 can be connected. Each has a door on its own side that guests can unlock."
)

// What the original site lists for every kitchenette and bathroom.
var (
	baseAmenities = []string{"kitchenette", "fridge", "dishwasher", "microwave", "hob", "oven", "kettle", "bathroom", "shower", "dining-area"}
	fullAmenities = append(append([]string{}, baseAmenities...), "tv", "sofa", "entrance-hall")
	connectLabel  = []store.L10n{{Cs: "Lze propojit", En: "Can be connected"}}
)

func apartments() []*store.Apartment {
	return []*store.Apartment{
		{
			Slug: "apartman-1", Number: 1, Floor: 3, Area: 40, Beds: 4, Amenities: fullAmenities,
			Layout: store.L10n{Cs: "dvoulůžko + dvoulůžko", En: "two double beds"},
			Features: store.L10nList{
				Cs: []string{"vstupní chodbička", bathCs, "obývací pokoj se dvěma dvoulůžky, sedačkou a TV", kitchenCs, "jídelní kout"},
				En: []string{"entrance hall", bathEn, "living room with two double beds, a sofa and a TV", kitchenEn, "dining area"},
			},
		},
		{
			Slug: "apartman-2", Number: 2, Floor: 3, Area: 50, Beds: 6, Amenities: fullAmenities,
			Layout: store.L10n{Cs: "dvoulůžko + dvě samostatná lůžka + samostatné lůžko rozložitelné na dvoulůžko", En: "a double bed + two single beds + a single bed that folds out into a double"},
			Features: store.L10nList{
				Cs: []string{"vstupní chodbička", bathCs, "obývací pokoj se sedačkou a TV", kitchenCs, "jídelní kout"},
				En: []string{"entrance hall", bathEn, "living room with a sofa and a TV", kitchenEn, "dining area"},
			},
		},
		{
			Slug: "apartman-3", Number: 3, Floor: 2, Area: 92, Beds: 9, FlatType: "3+1", Amenities: fullAmenities,
			Layout: store.L10n{Cs: "dvoulůžko v samostatné ložnici + dvoulůžko v obývacím pokoji + dětský pokoj se dvěma patrovými postelemi a jedním samostatným lůžkem", En: "a double bed in a separate bedroom + a double bed in the living room + a children's room with two bunk beds and one single bed"},
			Features: store.L10nList{
				Cs: []string{"vstupní chodbička", bathCs, "obývací pokoj se dvěma sedacími soupravami a TV", kitchenCs, "jídelní kout"},
				En: []string{"entrance hall", bathEn, "living room with two sofa sets and a TV", kitchenEn, "dining area"},
			},
		},
		{
			Slug: "apartman-4", Number: 4, Floor: 2, Area: 30, Beds: 3, FlatType: "1+1", Amenities: baseAmenities, Labels: connectLabel,
			Layout: store.L10n{Cs: "dvoulůžko + jednolůžko", En: "a double bed + a single bed"},
			Features: store.L10nList{
				Cs: []string{"samostatná ložnice se třemi lůžky", "samostatná koupelna s umyvadlem, sprchovým koutem a WC", kitchenCs, "jídelní kout"},
				En: []string{"separate bedroom with three beds", "separate bathroom with a washbasin, a shower and a toilet", kitchenEn, "dining area"},
			},
			Note: store.L10n{Cs: connectCs, En: connectEn},
		},
		{
			Slug: "apartman-5", Number: 5, Floor: 2, Area: 72, Beds: 6, ExtraBeds: 3, FlatType: "3+1", Amenities: fullAmenities, Labels: connectLabel,
			Layout: store.L10n{Cs: "dvoulůžko v samostatné ložnici + dvoulůžko a dvě rozkládací sedací soupravy v obývacím pokoji + dětský pokoj s patrovou postelí a rozkládacím futonem", En: "a double bed in a separate bedroom + a double bed and two sofa beds in the living room + a children's room with a bunk bed and a fold-out futon"},
			Features: store.L10nList{
				Cs: []string{"vstupní chodbička", bathCs, "obývací pokoj se dvěma dvoulůžky, sedačkou a TV", kitchenCs, "jídelní kout"},
				En: []string{"entrance hall", bathEn, "living room with two double beds, a sofa and a TV", kitchenEn, "dining area"},
			},
			Note: store.L10n{Cs: connectCs, En: connectEn},
		},
		{
			Slug: "apartman-6", Number: 6, Floor: 1, Area: 55, Beds: 6, Accessible: true, FlatType: "2+1", Amenities: fullAmenities,
			Layout: store.L10n{Cs: "dvoulůžko + samostatné lůžko + patrová postel + samostatné lůžko v obývacím pokoji", En: "a double bed + a single bed + a bunk bed + a single bed in the living room"},
			Features: store.L10nList{
				Cs: []string{"vstupní chodbička", bathCs, "obývací pokoj se dvěma dvoulůžky, sedačkou a TV", kitchenCs, "jídelní kout"},
				En: []string{"entrance hall", bathEn, "living room with two double beds, a sofa and a TV", kitchenEn, "dining area"},
			},
		},
	}
}

type label struct{ key, cs, en string }

// altHints derive a description from the original file name.
var altHints = []label{
	{"kuchyn-a-jidelna", "Kuchyň a jídelna", "Kitchen and dining area"},
	{"pohled-do-kuchyne", "Pohled do kuchyně", "View into the kitchen"},
	{"kuchyn", "Kuchyňský kout", "Kitchenette"},
	{"koupelna", "Koupelna", "Bathroom"},
	{"umyvadla", "Umyvadla v koupelně", "Bathroom washbasins"},
	{"loznice", "Ložnice", "Bedroom"},
	{"obyvak-a-spani", "Obývací pokoj s lůžky", "Living room with beds"},
	{"spani-obyvak", "Lůžka v obývacím pokoji", "Beds in the living room"},
	{"obyvak", "Obývací pokoj", "Living room"},
	{"detsky", "Dětský pokoj", "Children's room"},
	{"jidelna", "Jídelní kout", "Dining area"},
	{"chodba", "Chodba", "Hallway"},
	{"spani", "Lůžka", "Beds"},
	{"sedacka", "Sedačka", "Sofa"},
	{"celkovy-pohled", "Celkový pohled na apartmán", "Overall view of the apartment"},
	{"uvodni", "Pohled do apartmánu", "View of the apartment"},
	{"sud-zima", "Horký sud v zimě", "Hot tub in winter"},
	{"sauna", "Sauna", "Sauna"},
	{"sud", "Venkovní horký sud", "Outdoor hot tub"},
	{"budova", "Budova wellness", "The wellness building"},
	{"terasa", "Terasa", "Terrace"},
	{"tereasa", "Terasa", "Terrace"},
	{"garazove", "Kryté parkovací stání", "Covered parking"},
	{"pergola", "Pergola", "Pergola"},
	{"trampolina", "Trampolína", "Trampoline"},
	{"lyzarna", "Lyžárna", "Ski room"},
	{"stoly", "Stoly ve společenské místnosti", "Tables in the common room"},
	{"kulabr", "Kulečník", "Billiards table"},
	{"neratov-strecha", "Skleněná střecha kostela v Neratově", "Glass roof of the church in Neratov"},
	{"neratov", "Kostel v Neratově", "Church in Neratov"},
	{"litomysl", "Litomyšl", "Litomyšl"},
	{"dolni-morava-stezka", "Stezka v oblacích, Dolní Morava", "Sky Walk, Dolní Morava"},
	{"dolni-morava", "Dolní Morava", "Dolní Morava"},
	{"zemska-brana", "Zemská brána", "Zemská brána"},
	{"krizova-hora", "Křížová hora", "Křížová hora"},
	{"jablonne", "Jablonné nad Orlicí", "Jablonné nad Orlicí"},
	{"castalovice", "Častolovice", "Častolovice"},
	{"zamberk", "Zámecký park v Žamberku", "Castle park in Žamberk"},
	{"muchomurky", "Muchomůrky v lese", "Fly agarics in the forest"},
	{"podzim-suchac", "Podzim na Suchém vrchu", "Autumn on Suchý vrch"},
	{"zima-suchac", "Zima na Suchém vrchu", "Winter on Suchý vrch"},
	{"bouda", "Tvrz Bouda", "Bouda fortress"},
	{"hurka", "Tvrz Hůrka", "Hůrka fortress"},
	{"zima-bukovka", "Zima na Bukové hoře", "Winter on Buková hora"},
	{"bukovka", "Buková hora", "Buková hora"},
	{"hedec", "Klášter Hora Matky Boží", "Hora Matky Boží monastery"},
	{"sjezdovky", "Sjezdovky v Čenkovicích", "Ski slopes in Čenkovice"},
	{"jizni-poprasek", "Čerstvý sníh na jižních svazích", "Fresh snow on the southern slopes"},
	{"cenkovice-pohled", "Čenkovice, pohled na jižní svahy", "Čenkovice, view of the southern slopes"},
	{"bledule", "Bledule", "Spring snowflakes"},
	{"kravy", "Krávy na podzimní pastvě", "Cows on an autumn pasture"},
	{"jaro-pod-skalou", "Jaro pod skálou", "Spring below the rock"},
	{"louka", "Louka", "Meadow"},
	{"leto", "Léto v Čenkovicích", "Summer in Čenkovice"},
	{"svitava", "Zimní svítání", "Winter dawn"},
	{"zima", "Zima v Čenkovicích", "Winter in Čenkovice"},
}

var categoryLabels = map[string]label{
	"house":        {"", "Rychta Čenkovice", "Rychta Čenkovice"},
	"surroundings": {"", "Okolí Rychty", "Around the Rychta"},
	"common-room":  {"", "Společenská místnost", "Common room"},
	"facilities":   {"", "Zázemí objektu", "Facilities"},
	"wellness":     {"", "Domácí wellness", "Private wellness"},
	"trips":        {"", "Výlety v okolí", "Trips nearby"},
	"winter":       {"", "Zima", "Winter"},
	"misc":         {"", "Rychta Čenkovice", "Rychta Čenkovice"},
}

// AltFor builds a bilingual alt text for a photo of the original site.
func AltFor(category string, apartment *int, sourcePath string, index int) store.L10n {
	base := categoryLabels[category]
	if category == "apartment" && apartment != nil {
		base = label{"", fmt.Sprintf("Apartmán %d", *apartment), fmt.Sprintf("Apartment %d", *apartment)}
	}
	name := strings.ToLower(path.Base(sourcePath))
	for _, h := range altHints {
		if strings.Contains(name, h.key) {
			if category == "apartment" || category == "common-room" || category == "wellness" || category == "facilities" {
				return store.L10n{Cs: base.cs + ": " + lowerFirst(h.cs), En: base.en + ": " + lowerFirst(h.en)}
			}
			return store.L10n{Cs: h.cs, En: h.en}
		}
	}
	return store.L10n{Cs: fmt.Sprintf("%s, fotografie %d", base.cs, index), En: fmt.Sprintf("%s, photo %d", base.en, index)}
}

func lowerFirst(s string) string {
	r := []rune(s)
	if len(r) == 0 {
		return s
	}
	return strings.ToLower(string(r[0])) + string(r[1:])
}

// Content seeds apartments and the photo list when the database is empty.
func Content(ctx context.Context, st *store.Store) error {
	existing, err := st.ListApartments(ctx, false)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}
	ids := map[int]int64{}
	for _, a := range apartments() {
		a.Active = true
		a.MinNights = 1
		id, err := st.InsertApartment(ctx, a)
		if err != nil {
			return fmt.Errorf("seed apartment %d: %w", a.Number, err)
		}
		ids[a.Number] = id
	}
	var manifest []manifestPhoto
	if err := json.Unmarshal(photosJSON, &manifest); err != nil {
		return err
	}
	counters := map[string]int{}
	for i, p := range manifest {
		key := p.Category
		var aptID *int64
		if p.Apartment != nil {
			key = fmt.Sprintf("apartment-%d", *p.Apartment)
			id := ids[*p.Apartment]
			aptID = &id
		}
		counters[key]++
		if _, err := st.InsertPhoto(ctx, store.PhotoInput{
			Category:    p.Category,
			ApartmentID: aptID,
			SourcePath:  p.Path,
			Alt:         AltFor(p.Category, p.Apartment, p.Path, counters[key]),
			Sort:        (i + 1) * 10,
		}); err != nil {
			return fmt.Errorf("seed photo %s: %w", p.Path, err)
		}
	}
	return nil
}
