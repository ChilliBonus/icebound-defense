# Grafikstrategie

## Entscheidung

Der Prototyp bleibt vorerst bei Canvas 2D mit einer festen 2.5D-Kamera. Die vorhandene Spielmechanik, Projektilphysik und Wegfindung bleiben dadurch stabil. Die zusätzliche Qualität kommt über vorgerenderte Materialebenen, konsistentes Licht und bessere Silhouetten statt über mehr Effekte pro Frame.

| Option | Stärke | Nachteil | Entscheidung |
| --- | --- | --- | --- |
| Canvas 2D weiterentwickeln | Sofort nutzbar, keine Abhängigkeiten, vorhandene Caches bleiben erhalten | Kein echtes 3D-Licht | **Jetzt umsetzen** |
| PixiJS/WebGL mit Sprite-Atlanten | Gute GPU-Bündelung, Filter und große Sprite-Mengen | Renderer- und Asset-Pipeline müssten umgebaut werden | Später bei echten Art-Assets prüfen |
| Three.js mit 3D-Modellen | Höchste räumliche Tiefe und echtes Licht | Größter Umbau, neue Modelle, Kameralogik und Leistungsrisiko | Für diesen Prototyp nicht sinnvoll |

## Visuelles Ziel

- Geerdete RTS-Landschaft statt holografischer Spielfläche
- Vier klar getrennte Planetenmaterialien: Aurora-Eis, Vulkanasche, Bio-Mond und Eklipsengestein
- Sichtbarer Nachthimmel mit Sternen sowie je Welt ein Leitmotiv: Sonnenwind, Doppelmonde, Ringriese oder totale Eklipse
- Ein gemeinsamer Lichtvektor für Gelände, Gebäude, Türme und Gegner
- Weniger Neon auf Materialien; Leuchten bleibt Waffen, Statuslampen und Biologie vorbehalten
- Lesbare Formen aus der Spielperspektive, auch wenn der adaptive Detailgrad sinkt

## Umgesetzte Sofortmaßnahmen

- Wiederholbares, prozedurales Oberflächenmaterial aus einem kleinen Offscreen-Canvas
- Mehrskalige Bodenflecken, Steine, Flechten, Gräser, Zweige und Schneeverwehungen im statischen Terrain-Cache
- Windschiefe Nadelgehölze an den Kartenrändern
- Organische, perspektivisch verzerrte Bodeninseln, Moose, Geröll, Frostadern und unregelmäßige Erosionsspuren ohne sichtbare Kachelung
- Der Navigationspfad ist keine gebaute Straße mehr, sondern eine dünne taktische Routenlinie mit Richtungsmarkierungen
- Vier deterministische Weltgeneratoren speisen zwölf eigenständige Hindernislayouts und Materialpaletten
- Neue Astro-Basis mit Druckkuppel, Luftschleuse, Solarpaneelen, Tanks und Kommunikationsschüssel
- Eigene Voll- und Low-Detail-Silhouette für jede Waffenklasse
- Weiche, gerichtete Sonnen-Schatten aus einem wiederverwendeten Shadow-Sprite
- Gedämpfte Metallmaterialien für Türme und Drohnen; farbige Energie nur noch als Akzent
- Organischere Gegner mit Beinen, Körperkern und weniger flächigem Leuchten
- Vignette und warm-kalte Farbmodellierung direkt im Terrain-Cache

## Performance-Regeln

- Geländequalität darf aufwendig sein, wird aber nur einmal vorgerendert.
- Die Routenmarkierung wird nur nach einer Wegänderung neu gezeichnet.
- Mauern bleiben in ihrem eigenen Cache.
- Dynamische Schatten benötigen pro Objekt nur ein Bild statt mehrerer Blur-Pfade.
- Teure Canvas-Filter werden im laufenden Kampf vermieden; der vorhandene adaptive Detailgrad bleibt maßgeblich.

## Nächste sinnvolle Ausbaustufe

1. Ein kleiner Sprite-Atlas mit acht Blickrichtungen pro Turm und Gegnertyp würde den größten weiteren Qualitätssprung bringen.
2. Danach kann ein PixiJS-Testbranch prüfen, ob Sprite-Bündelung und Normal-Map-Licht den Umbau rechtfertigen.
3. Erst mit belastbaren 3D-Modellen und einer zweiten Karte wäre ein Three.js-Prototyp wirtschaftlich sinnvoll.

## Technische Quellen

- [web.dev: Canvas-Performance und Vorberechnung](https://web.dev/articles/canvas-performance)
- [MDN: Canvas-Muster aus Offscreen-Canvases](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern)
- [MDN: Compositing im Canvas](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
- [PixiJS: Performance-Hinweise](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [Three.js: Viele Objekte optimieren](https://threejs.org/manual/en/optimize-lots-of-objects.html)
