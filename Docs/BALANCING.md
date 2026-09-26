# Balancing — Ablauf und Werkzeuge

Wie ein Balancing-Run laeuft, welche Zahlen wo stehen und wie man sie prueft.
Stand: 2026-09-25.

## Grundgedanke der Kurve

- **Mauern entscheiden.** Fuer den Schaden an einer Welle zaehlt nicht die
  Turmzahl, sondern die Zeit unter Feuer. Eine laengere Route allein bringt
  nichts — ein Turm feuert nur, solange die Route in seinem Radius liegt.
  Entscheidend ist, die Route **mehrfach durch dieselbe Feuerzone zu falten**.
  Deshalb ist die Mauer das billigste Bauteil (30 E) mit fast flacher
  Kostenkurve (`wallCostStep` 0.02 gegen `towerCostStep` 0.15).
- **Eine fliessende Kurve ueber die 12 Level** (`levelCurve`): Leben, Tempo,
  Gegnerzahl und Abstand der Gegner steigen von Level zu Level um denselben
  Faktor, ohne Saegezahn je Planet. Ein Gegnertyp bringt ueberall dieselbe
  Energie und dieselben XP; es gibt keine weiteren Faktoren je Mission.
  Einzelne Level werden ueber Wellenzahl und Gegnermix justiert
  (`mission.waves`, `mission.pattern`, `mission.earlyLight`).
- **Planeten-Eigenschaften bleiben** (`PLANETS[].mods`) als Teil des
  Planeten-Charakters: Pyra Gegner 4 % schneller, Verdant 2 % langsamer und
  Reparatur ×1,35, Umbra 2 % schneller und Energieprämien ×0,88 (plus die
  Turm-Eigenschaften je Planet wie Mauerbremse oder Railgun-Durchschuss).
- **Energie ist der einzige Begrenzer der Turmzahl.** Es gibt bewusst keinen
  harten Turm-Deckel; die Energie reicht nicht, um alle Bauplaetze zu fuellen.
  Am Missionsende sollen nur wenige hundert Energie uebrig sein.
- **XP ist knapp.** Ein Durchlauf aller Missionen deckt rund 82 % des Bedarfs
  fuer alle Freischaltungen plus Volltuning (`tools/balance_expectation.py`).
- **Das Arsenal waechst mit der Kampagne.** Start nur mit Ion-Gatling und
  Feldmauer; wann welcher Turm freischaltbar ist, steht in `TOWER_UNLOCKS` am
  Anfang von `game.js` (dort, weil der Spielstand vor `GAME_BALANCE` geladen
  wird). Der Pulslaser wird mit den ersten Luftgegnern automatisch frei.

## Wo die Zahlen stehen

Alles in `game.js` im Block `GAME_BALANCE`:

| Schraube | Wirkung |
|---|---|
| `levelCurve` | Je Level: Leben, Tempo, Gegnerzahl, Abstand der Gegner. Die ganze Kampagnen-Steigerung in einer Tabelle. |
| `enemyHpLateStep` | Ab Welle 6 zusaetzlicher HP-Zuwachs pro Welle. Trifft **nur das Endspiel**. |
| `enemyPattern` | Gegnermix je Stufe (Abstaende in der Spawn-Reihenfolge). |
| `tuningCost` | XP-Kurve der Dauer-Upgrades. |
| `waveReward`, `enemies[*].bounty` | Energie-Zufluss. |
| `UNLOCK_XP_FACTOR` | XP-Preis einer Freischaltung als Vielfaches des Baupreises. Freischalten kostet **nur XP** und laeuft ueber die Arsenal-Uebersicht. |
| `towerCostStep`, `wallCostStep` | Kostensteigerung je weiterer Anlage. |
| `baseRepair`, `bomb` | Preis und Wirkung von Basis-Reparatur und Orbitalschlag. Der Bot nutzt beides nicht. |
| `TOWER_UNLOCKS` | Starter, ab welchem Level ein Turm freischaltbar ist, Auto-Freischaltung. |

Pro Mission in `PLANETS`: `credits` (Startenergie), `waves`, optional `pattern`
(ueberschreibt einzelne Werte aus `enemyPattern`: `eliteLate`, `eliteFinal`,
`eliteMid` = die zwei Kommandopanzer mitten in der letzten Welle) und optional
`earlyLight` (zusaetzliche Sondendrohnen in den ersten Wellen). `level` dient
nur noch intern fuer Gegnermix, Eingaenge und Hindernisdichte; angezeigt werden
Levelnummer und Sterne.

### Reihenfolge beim Nachjustieren

1. Gesamtverlauf zu steil oder zu flach → `levelCurve` (Anfangs- und
   Endwert einer Spalte, dazwischen gleichmaessige Schritte).
2. Einzelnes Level → Wellenzahl, Gegnermix, `earlyLight`.
3. **Vorsicht bei `mission.credits`.** Das Startkapital entscheidet, ob das
   Labyrinth vor dem Mittelspiel steht. Zu wenig kippt eine Mission schlagartig
   von "knapper Sieg" auf "Niederlage in Welle 10", ohne dass ein Gegner
   staerker wurde. Das ist ein Kipppunkt, keine Stellschraube.

## Erwartetes XP-Budget berechnen

```bash
python3 tools/balance_expectation.py
```

Gibt aus, wieviel XP an jeder Schwer-Mission verfuegbar ist, was Freischaltungen
kosten und welche gleichmaessige Tuning-Stufe damit bezahlbar ist. Diese Stufe
ist der Eingabewert fuer den Testbot.

Wichtig: Die Werte im Skript sind eine Kopie der Spielwerte. Nach Aenderungen an
`GAME_BALANCE` muessen `XP`, `DIFF`, `PAT` und die Tuning-Kurve dort nachgezogen
werden.

## Mission vom Bot durchspielen lassen

Der Bot rechnet Missionen **ohne Zeichnen** durch — eine 20-Wellen-Mission
dauert Sekunden statt Minuten.

1. Server starten (Plain-HTTP genuegt und vermeidet Service-Worker-Aerger):
   ```bash
   python3 -m http.server 8767
   ```
2. Im Browser `http://127.0.0.1:8767/index.html?balance-probe` oeffnen.
   Der Schalter `?balance-probe` schaltet `window.ICEBOUND_PROBE` frei; ohne ihn
   existiert das Objekt nicht.
3. Fortschritt setzen, damit die gewuenschte Mission waehlbar ist:
   ```js
   localStorage.setItem('icebound-arsenal-v1', JSON.stringify({
     xp: 0, upgrades: {},
     unlocked: ['rail','gatling','wall','drone','rocket','mortar','laser','cryo','disruptor'],
     cleared: ['nivalis:0','nivalis:1','nivalis:2','pyra:0','pyra:1','pyra:2',
               'verdant:0','verdant:1','verdant:2','umbra:0','umbra:1']
   }));
   location.reload();
   ```
4. Inhalt von `tools/balance_bot.js` in die Konsole einfuegen.
5. Laufen lassen, `tune` ist die Stufe aus Schritt "XP-Budget":
   ```js
   __run('nivalis', 2, {tune:1, airCount:1})     // Welt 1 SCHWER
   __run('pyra',    2, {tune:2, airCount:2})
   __run('verdant', 2, {tune:3, airCount:2})
   __run('umbra',   2, {tune:4, airCount:4})     // Finale
   ```

### Karte als Bild

```js
__dump('Titel', 'Untertitel', 'Notiz')   // Ausgabe in eine .json-Datei speichern
```

```bash
python3 tools/balance_map_svg.py run.json run.svg
```

Zeigt Route, Mauern, Hindernisse und je Turm den **angerichteten Schaden**.

> Abschusszahlen pro Turm sind irrefuehrend: der Abschuss wird dem letzten
> Treffer zugeschrieben. In einem Labyrinth sammeln die hinteren Tuerme die
> Abschuesse ein, obwohl die vorderen den Schaden machen. Immer den Schaden
> bewerten.

## Wichtige Bot-Optionen

| Option | Standard | Bedeutung |
|---|---|---|
| `tune` | 0 | Alle Waffen auf diese Stufe (0–5) |
| `airCount` | 0 | Zahl der Luftabwehr-Anlagen |
| `mode` | `'maze'` | `'nomaze'` baut bewusst kein Labyrinth (Gegenprobe) |
| `baseZone` | 4 | Radius um die Basis, in dem nicht gebaut wird |
| `maxBarriers` | 4 | Obergrenze fuer Riegel |
| `saveAfter` | 8 | Ab so vielen Tuermen wird fuer Riegel gespart |
| `openingTowers` | 4 | Grundverteidigung vor dem ersten Riegel |

Die Gegenprobe `mode:'nomaze'` ist der wichtigste Test fuer die Vision: ohne
Labyrinth muss ab MITTEL klar verloren werden.

## Grenzen des Verfahrens

- Der Bot waehlt Turmtypen nach einer festen Reihenfolge und positioniert nach
  Routen-Deckung. Er spezialisiert **nicht** (Kryo vor die Gerade, Brecher zu den
  Schildtraegern). Diese letzten ~20 % soll der Mensch leisten — dass der Bot
  manche Mission knapp verliert, ist gewollt.
- Die Labyrinth-Qualitaet schwankt je Karte (gemessen ×1.49 bis ×2.78). Diese
  Streuung ist momentan groesser als die meisten Balance-Effekte. Ein einzelner
  Lauf ist deshalb kein Beweis; im Zweifel mehrere Karten vergleichen.
- Der Bot ruestet waehrend einer Mission nicht auf (kein Tuning im Einsatz) und
  reisst nichts ab.

## Kampagne Level fuer Level

```js
__level(1)                                            // Aurora-Senke unter Kampagnenbedingungen
__level(1, {openingTowers:2, saveAfter:2, maxBarriers:6})   // frueh ein Labyrinth bauen
__level(12, {tune:5})                                 // Finale voll getunt
__levels(1, 12)                                       // Tabelle aller Level
```

`__level(n)` setzt den Spielstand so, als waeren alle vorherigen Level
geschafft, schaltet frei, was laut `TOWER_UNLOCKS` bis dahin verfuegbar ist,
und waehlt Tuning und Luftabwehr nach dem XP-Budget eines ersten Durchlaufs.
Fuer Vorher-nachher-Vergleiche kann die Testschnittstelle Werte zur Laufzeit
ueberschreiben: `ICEBOUND_PROBE.override('rail', {cost:145})`,
`ICEBOUND_PROBE.mission(1, {waves:12})`, `ICEBOUND_PROBE.unlocks()`.

## Feste Labyrinth-Plaene

Der frei bauende Bot baut schwache Labyrinthe (Routen hoechstens ×1,6). Fuer
Kampagnen-Pruefungen baut er deshalb je Level einen festen Maeander aus
`tools/maze_plans.json` nach:

```js
const plans = await (await fetch('tools/maze_plans.json')).json()
// Mission starten, dann:
__followPlan(plans[level - 1])
```

Jeder Plan ist eine Liste von Bauschritten (Typ, Feld, Kosten). Der Bot baut
sie stur in dieser Reihenfolge und wartet, wenn die Energie fuer den naechsten
Schritt fehlt. Die Regeln hinter den Plaenen: Riegel auf Spalten mit vielen
vorhandenen Hindernissen, Luecke abwechselnd oben und unten, mindestens drei
Spalten Abstand, jede dritte Zelle eine Mauer, jeder Riegel vom Ende
gegenueber der Luecke aus gebaut, damit jeder Stein den Weg sofort verlaengert.

Das Spiel zaehlt dabei je Gegnertyp mit, wie viele erscheinen, mit wie viel
Leben und wer durchbricht (`ICEBOUND_PROBE.stats()`); `setTuning(typ, stufe)`
tunt einzelne Tuerme.

## Turmstaerke im Arsenal-Test

```js
await __ramp('zero', 'mixed')          // ungetunt, gemischte Gegner
await __ramp('max', 'mixed', 60, 14)   // voll getunt gegen Gegner der Welle 14
```

Jede Waffe steht allein auf ihrer Bahn, Welle n schickt n Gegner. Ergebnis ist
die Welle, in der ihr Lager faellt. Luftwaffen bekommen nur Luftgegner und sind
nur untereinander vergleichbar. Vorher die Seite neu laden.

Messung 2026-09-25 (alte Werte, Lager faellt in Welle):

| Waffe | ungetunt | voll getunt, Welle-14-Gegner |
|---|---|---|
| Railgun | 21 | 6 |
| Pulslaser (Luft) | 13 | 9 |
| Schild-Brecher | 12 | 7 |
| Drohnennest | 11 | 7 |
| Kryo-Projektor | 10 | 6 |
| Ion-Gatling | 10 | 7 |
| Plasma-Moerser | 8 | 6 |

Ungetunt dominierte die Railgun, voll getunt liegen alle nah beieinander.
Deshalb wurden Preise und Freischaltzeitpunkte geaendert, nicht Schaden oder
Takt (einzige Ausnahme: Gatling 7 → 9, siehe unten).

## Ergebnis Turm- und Level-Balancing (Stand 2026-09-26)

| Bereich | Vorher | Jetzt |
|---|---|---|
| Start-Arsenal | Railgun, Gatling, Mauer | Gatling, Mauer |
| Gatling | Luft + Boden, 130 E, Schaden 7 | nur Boden, 120 E, Schaden 9,45 |
| Freischaltung | alles ab Start per XP | Moerser, Kryo ab Level 2 (je 130 XP); Brecher, Laser, Rakete ab 3; Drohne ab 5; Railgun ab 6; Laser automatisch in Level 3 |
| Turmkosten | Railgun 145, Drohne 175, Moerser 185, Laser 135, Kryo 155, Brecher 205 | Railgun 175, Drohne 200, Moerser 175, Laser 145, Kryo 150, Brecher 190 |
| Railgun-Schaden | 108 | 91,8 (−15 %) |
| Uebrige Bodenwaffen | – | +5 % Schaden |
| Laser / Rakete | Schaden 10 / 105 | 19,25 / 201,7 (+92 %) |
| Level-Verlauf | Saegezahn je Planet (Leicht/Mittel/Schwer), Faktoren je Planet und Mission | eine Level-Tabelle `levelCurve`: Leben, Tempo, Anzahl, Abstand, Startenergie (520–780), Wellen (8–25), Luftgegner ab Level 3, Kommandopanzer – alles gleichmaessig steigend |
| Praemie | je Mission und Planet unterschiedlich, Finale −40 % | ueberall gleich, keine Kuerzung |
| Anzeige | Leicht/Mittel/Schwer | Levelnummer und Sterne (1–5) |


Bot-Pruefung mit festen Labyrinth-Plaenen (`tools/maze_plans.json`, inklusive
Ausbau-Phase bis die Energie verbraucht ist), Ausstattung eines ersten
Durchlaufs, vier Tuning-Strategien je Level. Mit Level-Tabelle und
Planeten-Eigenschaften: **12 von 12 Leveln schaffbar** (Stand 2026-09-26),
nachdem nur der Bot angepasst wurde: Level 5 baut vier Grundtuerme und drei
Laser vor dem ersten Riegel, Level 10–12 bauen im Ausbau zusaetzlich
Luftabwehr (5/5/6 Tuerme). Knapp: Level 5 (20 % Integritaet, nur eine
Strategie) und Level 6 (9 %).

Erkenntnisse, die man beim naechsten Mal nicht neu herausfinden muss:

- Die Railgun trug den Einstieg allein; ohne sie entscheiden die
  Kommandopanzer (Schild plus Panzerung) die ersten Level.
- Die Eingaenge schicken der Reihe nach (`activeSpawnLane`): erst die ersten
  1/n der Wellen aus Eingang 1, dann Eingang 2 usw.
- Mehr Startenergie ist ein grober Hebel (+69 % bis +181 % fuer einen Sieg,
  das Finale gar nicht).
- Gegnerzahl als Hebel ist schwach, weil mehr Gegner auch mehr Energie bringen.
- Das Tuning entscheidet mit: kleine Verschiebungen (z. B. Kryo und Brecher auf
  Stufe 1 statt einer zweiten Moerser-Stufe) kippen einzelne Level.

## Letztes Ergebnis (2026-07-30)

Schwerster Level jeder Welt, mit dem Tuning aus einem einzigen Durchlauf:

| Welt | Tuning | Ergebnis | Labyrinth | Energie verbaut / uebrig |
|---|---|---|---|---|
| 1 NULLLICHT-RISS | 1/1/1 | Niederlage Welle 16/20 | ×1.86 | 4177 / 30 |
| 2 HOELLENSCHLUND | 2/2/2 | Niederlage Welle 15/20 | ×2.00 | 3640 / 210 |
| 3 SMARAGD-ABGRUND | 3/3/3 | Sieg 20/20, 40 % Integritaet | ×2.73 | 6109 / 174 |
| 4 EVENT-HORIZONT | 4/4/4 | Niederlage Welle 18/25 | ×1.49 | 4927 / 33 |

Das Finale faellt auch mit 5/5/5 nicht (Welle 19/25), weil der Bot dort nur ×1.49
erreicht. Mit einem richtigen Maeander ist es schaffbar.
