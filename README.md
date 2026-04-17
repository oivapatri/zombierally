# Zombie Racing: Last Outrun

Top-down zombie car combat -peli HTML5 Canvasilla.

## Sisalto
- Nopearytminen ajelu kaupungissa zombilaumoja vastaan
- Aseet, kranaatit, nitro, pickupit ja wave-pohjainen eteneminen
- Boss-viholliset, combo-pisteytys ja paikallinen high score
- LAN host/join -moninpeli (host synkkaa maailman)

## Kontrollit
- `WASD` tai nuolinappaimet: aja autoa
- `Shift`: nitro
- `Space` tai `F`: ammu
- `G`: heita kranaatti
- `P`: co-op tukituli

## Kaynnistys
1. Asenna riippuvuudet:
   - `npm install`
2. Kaynnista palvelin:
   - `npm start`
3. Avaa peli selaimessa:
   - `http://localhost:8080/`

## LAN-moninpeli
1. Host avaa pelin ja painaa `Host LAN`.
2. Muut verkon laitteet avaavat hostin IP-osoitteen (`http://HOST_IP:8080/`) ja painavat `Join LAN`.

## Projektin tiedostot
- `zombie_racing.html`: UI ja canvas-sivu
- `zombie_game.js`: pelilogiikka, grafiikka, aanet
- `lan_server.js`: Express + WebSocket LAN-palvelin