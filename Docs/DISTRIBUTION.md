# Icebound verteilen

## Single-File bauen

Im Projektordner ausführen:

```sh
python3 build_single_file.py
```

Das Script erzeugt `dist/icebound.html`. Es liest die
Stylesheets, Scripts, das Manifest und die Icons aus den Tags in `index.html`,
bettet sie ein und bricht ab, falls eine externe `src`-/`href`-Referenz, ein
`icons/`-Pfad oder eine externe CSS-URL übrig bleibt. Es benötigt nur Python 3
mit Standardbibliothek; ein zweiter Lauf mit denselben Quellen erzeugt dieselbe
Datei.

## Was die Datei kann

`icebound.html` kann auf einem Desktop-Rechner per Doppelklick und damit über
eine `file://`-URL geöffnet werden. Spielcode, Layout, Manifest und Bilder sind
in der Datei enthalten; zum Spielen ist keine Internetverbindung nötig. Die
Single-File-Variante enthält alle vier Planeten, die Missionen und den
Arsenal-Test. Fortschritt wird wie in der normalen Variante in `localStorage`
gespeichert, soweit der jeweilige Browser lokalen Dateien dauerhaften Speicher
gewährt.

Die Datei kann per Mail, Messenger oder AirDrop weitergegeben werden. Manche
Mail- und Messenger-Dienste blockieren HTML-Anhänge oder benennen sie aus
Sicherheitsgründen um. Dann muss die Datei beispielsweise als ZIP übertragen
und vor dem Öffnen wieder entpackt werden.

## Grenzen

- Die Single-File-Variante registriert grundsätzlich keinen Service Worker,
  auch nicht über HTTPS. Ein Service Worker braucht ein separates, vom gleichen
  Ursprung geladenes Script, und genau das existiert in der Einzeldatei nicht.
  Das Buildscript setzt dafür die Markierung `__ICEBOUND_SINGLE_FILE__`, die
  `pwa.js` auswertet; so entsteht auch beim Hosten kein fehlschlagender
  Registrierungsversuch. Das Spiel bleibt trotzdem offline spielbar, weil
  bereits alles in der HTML-Datei steckt.
- Eine lokal geöffnete HTML-Datei ist keine verlässlich installierbare PWA.
  Chrome hat zwar seit Chrome 108 (mobil) beziehungsweise 112 (Desktop) den
  Service-Worker-`fetch`-Handler als Voraussetzung für die Installation über
  das Browsermenü entfernt. Das macht `file://` aber nicht zu einem sicheren,
  installierbaren Web-Ursprung. Für eine reguläre Installation muss Icebound
  über HTTPS (oder für Entwicklung über `localhost`) ausgeliefert werden.
- Die eingebetteten Base64-Bilder vergrößern die HTML-Datei gegenüber den
  ursprünglichen Binärdateien. Das kann Größenlimits von Mail- oder
  Messenger-Diensten treffen.
- Auf iPhone und iPad können Dateianhänge je nach App nur in einer Vorschau
  oder gar nicht als aktive HTML-Seite geöffnet werden. Selbst wenn die Datei
  in Safari erscheint, ist „Zum Home-Bildschirm“ für eine `file://`-Datei kein
  verlässlicher PWA-Installationsweg. Außerdem kann Browser-Speicher zwischen
  Safari und einer Home-Screen-Web-App getrennt sein; gespeicherter Fortschritt
  muss daher nicht übernommen werden.

## Handy und PWA-Installation

Zum direkten Spielen kann die HTML-Datei auf Android in einem Browser geöffnet
werden, sofern Browser und Datei-App lokale HTML-Dateien zulassen. Auf iOS ist
das Öffnen lokaler HTML-Anhänge stärker von der verwendeten App abhängig und
nicht als einheitlicher Verteilungsweg anzusehen.

Für eine echte Installation die normale Multi-File-Version oder die erzeugte
HTML-Datei über eine HTTPS-Website bereitstellen. Die Multi-File-Version behält
dabei ihren Service Worker und bietet den vollständigeren Offline- und
Update-Pfad; die gehostete Einzeldatei kann installierbar sein, bleibt aber
ohne Service Worker und damit ohne dessen Cache- und Update-Steuerung. Unter iOS/iPadOS erfolgt die Installation über „Teilen → Zum
Home-Bildschirm“, in Chromium-Browsern über den Installationspunkt im
Browsermenü beziehungsweise den Installationsbutton, sofern der Browser die
Seite als installierbar bewertet.

Quellen zur Browser-Situation:

- [Chrome: Überarbeitung der Installierbarkeitskriterien](https://developer.chrome.com/blog/update-install-criteria?hl=de)
- [MDN: Service Worker sind nur in sicheren Kontexten verfügbar](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker/scriptURL)
- [WebKit: Home-Screen-Web-Apps und HTTP(S)-Voraussetzung auf iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
