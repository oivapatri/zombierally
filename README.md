# Zombie Racing Apocalypse

Täysin uusi peli jossa ajat autolla zombien päältä isolla kilparadalla!

## Pelin ominaisuudet:
- **3rd person -näkymä**: Kamera seuraa autoa takaa
- **Zombie-häviö**: 20 zombia jotka seuraavat sinua
- **Aseet ja räjähteet**: Autossa on konekivääri (välilyönti)
- **Zombie-räjäytykset**: Kun ajat zombin päältä nopeasti, se räjähtää vereen ja goreen
- **Pistemäärä**: Saat pisteitä zombien tappamisesta
- **Terveys ja ammukset**: Hallitse auton terveyttä ja ammuksia

## Kontrollit:
- **Nuolinäppäimet**: Liiku autolla
- **Välilyönti**: Ammu zombeja

## Tekniikka:
- HTML5 Canvas
- JavaScript
- 2D-grafiikka
- Äänitehosteet

Avaa `zombie_racing.html` selaimessa aloittaaksesi pelin!

## LAN-moninpeli (host/join)

Peli tukee nyt LAN-moninpelia host/join-mallilla.

1. Asenna riippuvuudet projektikansiossa:
	- `npm install`
2. Kaynnista LAN-palvelin host-koneella:
	- `npm start`
3. Avaa host-koneella peli selaimeen osoitteesta:
	- `http://HOST_IP:8080/zombie_racing.html`
4. Host painaa pelin sivupaneelista `Host LAN`.
5. Muut laitteet samassa verkossa avaavat saman sivun omassa selaimessa ja painavat `Join LAN`.

Huom:
- Host ajaa autoa ja hallitsee maailmaa.
- Liittyneet pelaajat voivat osallistua tukitulena (ampuminen/kranaatti verkon yli).