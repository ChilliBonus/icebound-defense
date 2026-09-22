# Icebound // Stellar Frontier

Spielbarer, installierbarer Tower-Defense-Prototyp für den Browser. Die PWA besitzt keine externen Laufzeitabhängigkeiten und funktioniert nach dem ersten Laden auch offline. Zwölf Einsatzgebiete auf vier Planeten nutzen eine natürliche RTS-artige 2.5D-Draufsicht mit prozeduralen Bodenmaterialien, spektakulären Himmeln, gerichteten Schatten, räumlichen Baukörpern, Tiefensortierung und ballistischen Effekten. Die technische Richtung steht in [GRAPHICS_STRATEGY.md](GRAPHICS_STRATEGY.md).

## Start

Zum Spielen reicht es, `index.html` direkt im Browser zu öffnen. Für Installation und Offline-Cache muss die App über `localhost` oder HTTPS ausgeliefert werden. Im Projektordner:

```bash
python3 rehost_icebound.py
```

Danach `http://localhost:8446/` öffnen. Der Server braucht nur die Python-Standardbibliothek. Einen anderen Port setzt `--port`. Für das Handy im WLAN muss die App über HTTPS mit einem Zertifikat laufen, dem das Gerät vertraut; `--certfile` und `--keyfile` nehmen ein eigenes Zertifikat entgegen, zusammen mit `--serve --host 0.0.0.0`.

Wer die App als einzelne HTML-Datei weitergeben möchte: [Docs/DISTRIBUTION.md](Docs/DISTRIBUTION.md).

Der `⇩`-Knopf öffnet in unterstützten Chromium-Browsern den Installationsdialog. Auf Safari/iOS und Browsern ohne direkten Installationsdialog zeigt er den passenden Weg über das Teilen- beziehungsweise Browsermenü. Nach dem ersten vollständigen Laden bleibt die App-Hülle offline startbar.

## Spielprinzip

Die zentrale, für Spieler unsichtbare **Balancing-Tabelle** steht in `game.js` direkt unter dem Kommentar `BALANCING-TABELLE — HIER ZAHLEN ÄNDERN`. Im Objekt `GAME_BALANCE` lassen sich Basis-Haltbarkeit, Gegner-Basis-HP, HP-Zuwachs pro Welle, alternative Spawn-Tiefe, Level-Faktoren sowie Kosten, Schaden, Takt, Reichweite und sämtliche Gegnerwerte von Hand ändern. Schwere und finale Missionen lassen Gegner an mehreren Positionen erscheinen, jedoch ausschließlich im hinteren Routendrittel.

Direkt hinter der Tabelle erzeugen `BALANCE_REPORT` und `ENEMY_HP_REPORT` automatisch vergleichbare Werte: für alle acht Waffen voll getunte HP/s, Reichweitenfaktor und geschätzte effektive HP/s sowie für jeden Gegnertyp normale und durch Panzerung effektive HP in Welle 1 und 14. Beide Berichte erscheinen als Tabellen in der Entwicklerkonsole und sind dort über `ICEBOUND_BALANCE` erreichbar. Flächen-, Ketten-, Durchschuss- und Statuseffekte zählen bewusst nicht in den Einzelziel-Grundwert hinein.

Die Entwickler-Seite `scorecard.html` lädt ihre Abbildungen direkt aus dem echten Spielrenderer und ihre Werte direkt aus `types`, `enemyTypes` und `GAME_BALANCE`. Sie zeigt Waffen, Gegner, alle Hindernisse, die vier Flora-Typen, Basis, Spawn, Route und Baufeld mit eindeutigem Code. Die Live-Spalte lässt eine Drohne auf einer Kreisroute um den Turm laufen und verwendet dafür die echte Zielerfassung, Schussrate, Waffenlogik, Projektilbewegung, Treffer- und Schadensberechnung des Spiels. Aus Leistungsgründen kämpft immer nur die Live-Karte, die der Bildschirmmitte am nächsten liegt. Die Scorecard ist nicht Teil der sichtbaren Spieloberfläche.

- Auf dem Startbildschirm aktiviert **ARSENAL-TEST** einen vierwelligen Testmodus mit 2600 Energie und sofort gemischten Gegnertypen, damit alle acht Waffen direkt verglichen werden können.
- Vor Missionsbeginn werden Planet und Einsatzgebiet gewählt. Leichte Einsätze besitzen sieben bis acht, mittlere neun bis zehn und schwere elf Wellen. **Event-Horizont** bildet mit 14 stark eskalierenden Wellen und drei Brutmüttern das herausfordernde Finale.
- **Nivalis** bringt Sternennacht, Mond und animierte Sonnenwind-Auroren; sein Kryo-Netz verstärkt Feldmauern. **Pyra** zeigt ein Doppelmondsystem über einer glühenden Caldera und vergrößert Raketen- und Mörserexplosionen. **Verdant** liegt unter einem Ringriesen, startet einen zusätzlichen Jäger je Drohnennest und stärkt gegnerische Regeneration. **Umbra** kämpft unter einer totalen Eklipse, gibt Railguns zwei zusätzliche Durchschläge, reduziert aber Energieprämien.
- Ein Verteidigungssystem rechts auswählen, bereits im Baumodus mit XP tunen und anschließend beliebig oft nacheinander auf dem Gelände platzieren. Der gewählte Typ bleibt nach jedem Bau aktiv; `Esc`, Rechtsklick oder erneutes Anklicken des Bausymbols beendet den Baumodus. Die Zahlentasten `1` bis `8` wählen Waffen und `W` die Feldmauer.
- Das schlanke Tactical-Control-Panel zeigt die fünf Bausysteme als Symbolleiste. Auswahl-/Tuningdetails und Feind-Intel lassen sich unabhängig auf- und zuklappen; eine neue Auswahl öffnet automatisch den passenden Detailbereich.
- Mit `↩` wird der laufende Einsatz vollständig verworfen und die Planeten-/Kartenauswahl geöffnet. Der aktuelle Sektor bleibt markiert, bis ein anderer gewählt wird.
- Vorgebaute Felsen, planetenspezifische Rücken, Kristallfelder und Wrackteile blockieren Bauplätze und formen auf allen zwölf Karten unterschiedliche Routen.
- Vegetation, Geröll, organische Bodeninseln und Erosionsspuren sind in der statischen Landschaft vorgerendert. Die Gegnerroute erscheint nur als dünne taktische Linie. Die Basis ist ein Astro-Außenposten mit Druckkuppel, Luftschleuse, Forschungsmodulen, Solarpaneelen, Tanks und Kommunikationsschüssel.
- Railgun, Drohnennest, Raketenrack, Plasma-Mörser und Feldmauer besitzen auch im adaptiven Performance-Modus klar unterschiedliche Silhouetten.
- Türme verändern den Gegnerpfad; ein vollständiges Blockieren wird verhindert.
- Nach jeder gesäuberten Welle startet automatisch eine kurze Baupause; anschließend rückt die nächste Welle an. Der Wellenknopf oder die Leertaste zieht sie vor. Gegnerzahl, Lebenspunkte und Tempo steigen zum Ende hin deutlich; Durchbrüche verursachen je nach Gegnertyp 8 bis 40 Prozent Integritätsschaden.
- Jeder vernichtete Gegner vergibt in regulären Missionen und im Arsenal-Test je nach Typ 2 bis 25 XP. Eine goldene `+XP`-Anzeige bestätigt die Vergabe direkt am Gegner. XP und Arsenal-Upgrades werden lokal im Browser gespeichert und bleiben über Missionen und Neustarts hinweg erhalten.
- Platzierte Kampftürme anklicken, um Feuerkraft, Taktung und Reichweite in je fünf Stufen dauerhaft für den gesamten Turmtyp aufzuwerten. Zehnteilige Balken vergleichen jeden aktuellen Wert mit dem höchsten Wert, den irgendeine vollständig getunte Waffe in derselben Kategorie erreichen kann. Deshalb bedeutet 100 Prozent immer das echte Arsenalmaximum und erscheint erst beim passenden Vollausbau. Upgrades kosten ausschließlich XP, nicht Einsatzenergie.
- Jeder ausgewählte Turm und jede Mauer kann abgerissen werden. Zurückgezahlt werden 50 Prozent des gesamten investierten Werts einschließlich aller Tunings; Drohnen, Wegführung und Verlangsamungsfelder werden dabei sofort bereinigt.
- Feldmauern kosten nur 30 Energie, verändern die Route und verlangsamen Gegner in angrenzenden Rasterfeldern planetenabhängig. Der Weg darf nie vollständig blockiert werden.
- Railgun: durchschlägt mindestens fünf Gegner in einer Linie und ignoriert Panzerung; auf Umbra kommen zwei Ziele hinzu.
- Drohnennest: startet drei autonome Jäger mit Zwillingssalven, längeren Angriffsläufen und höherem Tempo. Verdant und Feuerkraft-Stufe 2 ergänzen weitere Jäger.
- Raketenwerfer: feuert beschleunigende Lenkraketen mit begrenzter Drehrate, sichtbarer Kurvenbahn, Zielerfassung und Flächenschaden.
- Plasma-Mörser: langsames ballistisches Geschoss mit schwerem Flächenschaden.
- Pulslaser: extrem schnelle Präzisionstreffer mit geringem Einzelschaden.
- Kryo-Projektor: halbiert das Tempo getroffener Gegner für kurze Zeit.
- Ion-Gatling: höchste Feuerrate, dafür kürzeste Reichweite und niedrigster Einzelschaden.
- Schild-Brecher: überlädt gegnerische Schilde mit 140 Prozent Bonusschaden.
- Gegner treten als schwebende Sonden- und Abfangdrohnen, schwere Kettenpanzer, vierbeinige Reparatur- und Trägerläufer sowie ein geschützter Kommandopanzer auf.
- Ein Klick auf einen Gegner öffnet einen Live-Scan mit Lebenspunkten, Tempo, Panzerung, Prämie, Durchbruchsschaden und Spezialfähigkeit.
- Musik und Geräusche werden ohne externe Audiodateien im Browser synthetisiert. Der `♫`-Knopf schaltet den gesamten Ton stumm.
- Statische Landschaft, Materialtexturen, Wege, Mauern und das Bauraster liegen in getrennten Caches. Ein wiederverwendetes weiches Schattensprite und der adaptive Detailgrad halten die zusätzlichen Geländedetails günstig.

Wie die Missionen ausbalanciert und mit einem Testbot durchgespielt werden, steht in [Docs/BALANCING.md](Docs/BALANCING.md).

Spätere Ausbaustufen: Tower-Synergien, zusätzliche planetenspezifische Gefahren und Gegnertypen mit Resistenzen.
