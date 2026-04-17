# Zombie Racing: Last Outrun

Selainpohjainen zombie-survival-ajopeli, jossa ohjaat panssaroitua muscle-autoa läpi sortuneen neon-kaupungin. Murskaa zombilauma, kerää tarvikkeita ja selviä 20 aallon verran kohti viimeistä evacuointiväylää.

---

## Mitä pelissä tehdään

Olet viimeinen ajaja karanteenikaupungissa. Sinun tehtäväsi on selviytyä kahdestakymmenestä zombiaallosta pitämällä auto liikkeessä, ampumalla, törmäämällä ja heittämällä kranaatteja. Jokainen aalto tuo kentälle enemmän ja vaarallisempia zombeja. Kahdeskymmenes aalto on loppukoe: kentälle ilmestyy jättiläismäinen **Doom Behemoth** -bossizombi, joka on tuhottava voiton saavuttamiseksi.

Peli päättyy joko kun kaikki 20 aaltoa on selvitetty (voitto) tai kun auton kestävyys putoaa nollaan (häviö).

---

## Pelin käynnistys

### Yksinpeli (offline)

Avaa `zombie_racing.html` suoraan selaimessa — palvelinta ei tarvita.

### LAN-moninpeli

1. Asenna riippuvuudet projektikansiossa:
   ```
   npm install
   ```
2. Käynnistä LAN-palvelin host-koneella:
   ```
   npm start
   ```
3. Avaa host-koneella peli selaimessa osoitteesta:
   ```
   http://HOST_IP:8080
   ```
4. Host painaa sivupaneelista **Host LAN**.
5. Muut pelaajat samassa verkossa avaavat saman osoitteen omassa selaimessaan ja painavat **Join LAN**.

> **Huom:** Host ajaa autoa ja hallitsee maailman tilan. Liittyneet pelaajat ajavat omaa autoaan ja voivat ampua sekä heittää kranaatteja — heidän syöttämänsä komennot välitetään hostille reaaliajassa.

---

## Kontrollit

| Näppäin | Toiminto |
|---|---|
| **WASD** tai **nuolinäppäimet** | Ohjaa autoa |
| **Shift** | Nitro — kasvattaa nopeutta ja tappovoimaa |
| **Välilyönti** tai **F** | Ammu eteenpäin |
| **G** | Heitä kranaatti |
| **P** | Tukiampujan tuli (co-op) |
| **Enter** | Aloita uudelleen game overin tai voiton jälkeen |

---

## Pelimekaniikka

### Resurssit

Autolla on kolme resurssia, joita on hallittava koko pelin ajan:

| Resurssi | Alkuarvo | Kuvaus |
|---|---|---|
| **Hull Integrity** (terveys) | 200 / 200 | Zombit ja miinat vähentävät kestävyyttä. Nolla = häviö. |
| **Ammo Reserve** (ammukset) | 180 | Ampuminen kuluttaa ammuksia. Loppuu, kun varastot ovat tyhjät. |
| **Nitro Core** | 100 % | Nitro kuluu käytössä ja latautuu hitaasti ajan myötä. |
| **Grenades** (kranaatit) | 5 | Aiheuttavat aluevahinkoa. Täydennettävissä supply dropein. |

### Zombie-tyypit

| Tyyppi | Kestävyys | Nopeus | Vahinko | Pistepalkinto | Erityispiirre |
|---|---|---|---|---|---|
| **Walker** | 70 | Hidas | 11 | 110 | Perus-zombie, liikkuu hitaasti |
| **Runner** | 42 | Nopea | 8 | 135 | Kiidättää autoa kohti |
| **Brute** | 220 | Hidas | 18 | 300 | Tankkaa paljon osumia |
| **Spitter** | 90 | Hidas | 9 | 190 | Sylkee happoa, jättää happokenttiä tielle |
| **Doom Behemoth** | 620 | Kohtalainen | 26 | 1250 | Lopullinen bossizombi aallossa 20 |

### Asejärjestelmä

Ase paranee automaattisesti kills-määrän kasvaessa. Uusi taso avataan 100 tappoa kohden:

| Taso | Nimi | Luodimäärä | Vahinko | Tulinopeus |
|---|---|---|---|---|
| 0 | **Street Repeater** | 1 | 36 | Nopea |
| 1 | **Twin Fang** | 2 | 34 × 2 | Nopea |
| 2 | **Riot Lance** | 4 | 34 × 4 | Nopein |

### Aalto-systeemi

- Peli etenee **20 aallon** verran.
- Jokainen aalto alkaa bannerin ilmestyessä ruudulle.
- Aaltojen välissä on lyhyt **hengähdystauko** (intermission), jonka aikana kentälle putoaa supply drop -paketteja.
- Aallot kasvavat progressiivisesti vaikeammiksi: enemmän zombeja, nopeampia tyyppejä ja korkeampi uhkataso.
- **Aalto 20** on boss-aalto, jossa Doom Behemoth ilmestyy kentälle tavallisten zombien lisäksi.

### Supply Dropit

Aaltojen välissä kentälle ilmestyy kerättäviä paketteja:

| Paketti | Väri | Sisältö |
|---|---|---|
| **AMMO** | Keltainen | Täydentää ammuksia |
| **N2O** | Sininen | Täydentää nitron |
| **MED** | Punainen | Korjaa auton kestävyyttä |
| **BOOM** | Vihreä | Antaa lisää kranaatteja |

### Roadkill-mekaniikka

Kun ajat zombin päälle riittävällä nopeudella, auto tekee **roadkillin**: zombie roiskuu ja saat pisteet suoraan törmäyksestä. Nitro + suora törmäys = maksimivahinkoa ja -pisteitä.

### Combo-järjestelmä

Nopeiden tappojen ketjuttaminen kasvattaa combo-kerrointa, joka moninkertaistaa jokaisen tapon pistearvon. Combotimer nollautuu, jos tappoja ei tule riittävän nopeasti.

### Boost-alustat

Radalla on 7 boost-alustaa, jotka antavat auton nopeuden hetkellisesti kasvaa. Jäähdytysaika estää niiden jatkuvan käytön.

### Miinat

Radalla on 8 miinaa, jotka räjähtävät auton ajaessa niiden päälle ja aiheuttavat vahinkoa.

### Pelikenttä

Maailma on laaja 2600 × 1600 pikselin kaupunkiympäristö, jossa on:

- **Tieverkko**: suorat kadut, kaartuvat tiet ja risteykset
- **Rakennukset**: NOVA BAR, GRAND HOTEL, AUTO FIX, CLINIC, MOONLIGHT DINER, ARCADE, NIGHT CLUB, BANK jne.
- **Neon-kyltit** kaupunkitunnelman luojana
- **Liikennevalot**, suojatiet ja liikennemerkit
- **Katuvalaistus** ympäri kaupunkia

---

## Pisteytysjärjestelmä

- Jokainen tapettu zombie antaa pisteitä zombityypin mukaan (110–1250).
- **Combo-kerroin** moninkertaistaa pisteet nopeiden tappoketjujen aikana.
- Pelin korkein pistemäärä tallennetaan paikallisesti selaimeen ja näkyy **Top Run** -kentässä.

---

## LAN-moninpeli — tekninen kuvaus

Palvelin (`lan_server.js`) käyttää **Express**-kehystä staattisten tiedostojen tarjoamiseen ja **WebSocket**-protokollaa reaaliaikaiseen viestintään.

### Roolit

- **Host**: Ajaa autoa, hallitsee pelimaailmaa ja lähettää koko pelitilan (zombit, ammukset, pickup-tavarat jne.) kaikille asiakkaille noin 8 kertaa sekunnissa.
- **Client (Join)**: Ajaa omaa autoaan paikallisesti. Lähettää omat kontrollit (ampuminen, kranaatti, sijainti) hostille, joka käsittelee ne pelilogiikassa. Vastaanottaa maailman tilan hostilta.

### Viestiprotokolla

| Viestityyppi | Lähettäjä | Kuvaus |
|---|---|---|
| `host` | Client → Server | Ilmoittaa hostin rooli |
| `join` | Client → Server | Liittyy pelisessioon |
| `input` | Join-client → Host | Lähettää kontrollit (ampu, kranaatti, sijainti) |
| `state` | Host → Kaikki | Lähettää koko pelimaailman tilan |
| `playerState` | Kaikki → Kaikki | Jakaa oman auton sijainnin muille |
| `remoteInput` | Server → Host | Välittää join-clientin kontrollit hostille |

---

## Super-kilpa-ajelu (`index.html`)

Tiedostossa `index.html` on erillinen Mario-tyylinen kilpa-ajopeli:

- **Tavoite**: Suorita kierros radalla mahdollisimman nopeasti.
- **Kontrollit**: Nuolinäppäimet ohjaavat autoa.
- **HUD**: Näyttää nopeuden (km/h), kierrokset ja kierrosajan.
- **Rata**: Bezier-käyrillä piirretty ovaalinmuotoinen suljettu rata, jossa on maaliviiva, väkijoukko, eläimiä, kysymyspalikoita ja tiiliseinäkoristeita.
- **Äänet**: Moottorin ääni, törmäysääni ja taustamusiikki.

---

## Tekninen rakenne

| Tiedosto | Kuvaus |
|---|---|
| `zombie_racing.html` | Pääpelin HTML-rakenne ja CSS-tyyli |
| `zombie_game.js` | Koko pääpelin logiikka (n. 5 000 riviä) |
| `index.html` | Super-kilpa-ajelu -pelin HTML ja CSS |
| `script.js` | Super-kilpa-ajelu -pelin logiikka |
| `style.css` | Super-kilpa-ajelun ulkoasutyylit |
| `lan_server.js` | LAN-moninpelin WebSocket-palvelin |
| `package.json` | Node.js-riippuvuudet (express, ws) |

### Teknologiat

- **HTML5 Canvas** — kaikki grafiikka piirretään ohjelmallisesti, ei kuvatiedostoja
- **Web Audio API** — proseduraalinen moottorin ääni, renkaan kitka ja aseen äänet
- **WebSocket** — reaaliaikainen LAN-moninpeli
- **localStorage** — korkein pistemäärä tallennetaan selaimen muistiin