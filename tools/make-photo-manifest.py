import json
G = []
def add(cat, folder, names, apt=None):
    for n in names.split():
        p = (folder + "/" + n) if folder else n
        if any(x["path"] == p for x in G):
            continue
        G.append({"category": cat, "apartment": apt, "path": p})

add("house", "galerie", "001.jpg 002.jpg 003.jpg 004.jpg 005.jpg")
add("house", "img", "i3.jpg i2.jpg")
add("surroundings", "fotky-okoli-rychty", "jaro-pod-skalou.jpg 20211010_091006.jpg 20211010_091121.jpg 20211010_100519.jpg 20211010_103622.jpg 20211010_103851.jpg 20220115_111405.jpg 20220115_111416.jpg 20220122_160024.jpg 20220129_091218.jpg 20220923_175105.jpg 20220923_175544.jpg 20221009_111750.jpg 20250323_081856.jpg 20250323_082002.jpg 20250927_172415.jpg 20260503_094526.jpg jaro-pod-skalou.jpg kravy-podzim.jpg bledule-2.jpg")
add("surroundings", "galerie", "g11.jpg g12.jpg g13.jpg g14.jpg")
add("apartment", "apartman-1", "uvodni.jpg chodba.jpg kuchyn.jpg spani.jpg 1000054003.jpg 1000054004.jpg 1000054005.jpg 1000054006.jpg 1000054007.jpg", 1)
add("apartment", "apartman-2", "celkovy-pohled.jpg jidelna.jpg spani.jpg 1000054021.jpg 1000054022.jpg 1000054024.jpg 1000054023.jpg 1000054026.jpg 1000054028.jpg", 2)
add("apartment", "apartman-3", "pohled-do-kuchyne.jpg detsky-2.jpg detsky.jpg jidelna.jpg loznice-1.jpg loznice-2.jpg obyvak-a-spani.jpg obyvak.jpg spani-obyvak.jpg koupelna.jpg umyvadla.jpg", 3)
add("apartment", "apartman-4-garsonka", "1000053994.jpg kuchyn.jpg 1000053992.jpg 1000053990.jpg koupelna.jpg 1000053991.jpg 1000053993.jpg 1000053995.jpg 1000053996.jpg", 4)
add("apartment", "apartman-5", "kuchyn-a-jidelna.jpg 20180602_1647070.jpg 1000054050.jpg obyvak-1.jpg obyvak.jpg sedacka.jpg loznice.jpg detsky.jpg 1000054047.jpg 1000054051.jpg chodba.jpg 1000054000.jpg 1000053998.jpg 1000054049.jpg 1000053999.jpg koupelna.jpg", 5)
add("apartment", "galerie", "obyvak-velky.jpg", 6)
add("apartment", "apartman-6", "1000054035.jpg 1000054080.jpg 1000054079.jpg 1000054037.jpg 1000054077.jpg 1000054076.jpg 1000054038.jpg 1000054034.jpg", 6)
add("apartment", "galerie", "obyvak-velky.jpg", 6)
add("common-room", "spolecenska", "stoly.jpg 1000053976.jpg stoly-1.jpg kulabr.jpg 1000053969.jpg 1000053975.jpg 1000053978.jpg 1000053979.jpg 1000053980.jpg 1000053981.jpg 1000054045.jpg 1000054001.jpg")
add("facilities", "", "garazove-stani.jpg 20211023_170643.jpg pergola.jpg 20260502_161949.jpg garazove-stani-1.jpg garazove-stani-2.jpg terasa-1.jpg terasa.jpg sud-zima-rychta.jpg sud.jpg lyzarna-1.jpg")
add("facilities", "zazemi", "garazove-stani.jpg tereasa-.jpg 1000054155.jpg trampolina.jpg 1000054052.jpg 1000054053.jpg 1000054054.jpg")
add("wellness", "sauna", "1000053944.jpg budova.jpg 1000053943.jpg sauna.jpg sauna-2.jpg sauna-3.jpg 1000053945.jpg 1000053946.jpg 1000053948.jpg 1000053950.jpg sud.jpg 20180602_165308.jpg")
add("trips", "vylety", "cenkovice-pohled-jizni-svahy.jpg louka.jpg neratov-2.jpg zemska-brana.jpg dolni-morava.jpg socha.jpeg zamberk-park.jpg krizova-hora.jpg jablonne.jpg castalovice-2.jpg castalovice.jpg jizni-poprasek.jpg leto.jpg litomysl.jpg muchomurky.jpg neratov-strecha.jpg neratov.jpg podzim-suchac.jpg dolni-morava-stezka.jpeg bouda.jpg")
add("trips", "", "hedec.jpg bukovka.jpg hurka.jpg")
add("winter", "zima", "zima-bukovka7.jpg 20250215_092045.jpg 20250215_092058.jpg 20250215_092106.jpg 20250215_092127.jpg 20250215_134900.jpg 20250216_093551.jpg 20250216_094613.jpg 20251123_123541.jpg svitava.jpg zima-bukovka7.jpg zima-sjezdovky-2.jpg zima-sjezdovky.jpg zima-suchac.jpg zima.jpg")
json.dump(G, open("internal/seed/photos.json", "w"), indent=1, ensure_ascii=False)
print(len(G))
