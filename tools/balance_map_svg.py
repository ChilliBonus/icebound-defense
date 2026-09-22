#!/usr/bin/env python3
"""Rendert einen Icebound-Spielstand aus kompakten Rohdaten als SVG."""
import json, sys
d = json.load(open(sys.argv[1]))
C, PAD, TOP, COLS, ROWS = 42, 22, 74, 20, 13
CO = {'rail':'#8deaff','drone':'#a594ff','rocket':'#ffd36a','mortar':'#ff9e6a',
      'laser':'#ff6f91','cryo':'#8fffe1','gatling':'#ffc45d','disruptor':'#d58cff'}
GL = {'rail':'RAIL','drone':'DRN','rocket':'RKT','mortar':'MRT','laser':'LSR',
      'cryo':'KRY','gatling':'GAT','disruptor':'BRC'}
W, H = COLS*C+2*PAD, ROWS*C+TOP+(58 if d.get('note') else 38)
X = lambda g: PAD+g*C
Y = lambda g: TOP+g*C
o = []
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="ui-monospace,monospace">')
o.append(f'<rect width="{W}" height="{H}" fill="#08111c"/>')
o.append(f'<text x="{PAD}" y="28" fill="#8defff" font-size="17" font-weight="bold">{d["title"]}</text>')
o.append(f'<text x="{PAD}" y="50" fill="#7d99a8" font-size="11.5">{d["sub"]}</text>')
o.append(f'<rect x="{PAD}" y="{TOP}" width="{COLS*C}" height="{ROWS*C}" fill="#0f1d2b"/>')
g = ''.join(f'M{X(x)} {TOP}V{TOP+ROWS*C}' for x in range(COLS+1))
g += ''.join(f'M{PAD} {Y(y)}H{PAD+COLS*C}' for y in range(ROWS+1))
o.append(f'<path d="{g}" stroke="#16283a" fill="none"/>')
paths = [[tuple(map(int, c.split(','))) for c in p.split(';') if c] for p in d['paths']]
use = {}
for p in paths:
    for c in p:
        use[c] = use.get(c, 0) + 1
r1 = ''.join(f'M{X(x)} {Y(y)}h{C}v{C}h{-C}z' for (x, y), n in use.items() if n == 1)
r2 = ''.join(f'M{X(x)} {Y(y)}h{C}v{C}h{-C}z' for (x, y), n in use.items() if n > 1)
o.append(f'<path d="{r1}" fill="#4a3413" fill-opacity=".5"/><path d="{r2}" fill="#6b4715" fill-opacity=".8"/>')
for p, col in zip(paths, ['#ffbe6a', '#ff8f5f', '#ffe0a0']):
    pts = ' '.join(f'{X(x)+C//2},{Y(y)+C//2}' for x, y in p)
    o.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2.4" stroke-opacity=".8"/>')
ob = ''.join(f'M{X(x)+4} {Y(y)+4}h{C-8}v{C-8}h{-(C-8)}z' for x, y in (tuple(map(int, c.split(','))) for c in d['obstacles']))
o.append(f'<path d="{ob}" fill="#2b3d49" stroke="#4d6675"/>')
wl = ''.join(f'M{X(t["x"])+6} {Y(t["y"])+6}h{C-13}v{C-13}h{-(C-13)}z' for t in d['towers'] if t['t'] == 'wall')
o.append(f'<path d="{wl}" fill="#c3d8cc" fill-opacity=".85"/>')
for t in d['towers']:
    if t['t'] == 'wall':
        continue
    c, x, y = CO.get(t['t'], '#fff'), X(t['x']), Y(t['y'])
    o.append(f'<rect x="{x+2}" y="{y+2}" width="{C-5}" height="{C-5}" rx="6" fill="{c}" fill-opacity=".18" stroke="{c}" stroke-width="1.8"/>')
    o.append(f'<text x="{x+C//2}" y="{y+C//2}" fill="{c}" font-size="8.5" text-anchor="middle" font-weight="bold">{GL.get(t["t"],"?")}</text>')
    dv = t.get('dmg')
    lab = (f'{dv/1000:.0f}k' if dv and dv >= 1000 else str(dv or 0))
    o.append(f'<text x="{x+C//2}" y="{y+C-6}" fill="#e6f4fa" font-size="9.5" text-anchor="middle">{lab}</text>')
bx, by = d['base']
o.append(f'<rect x="{X(bx)+1}" y="{Y(by)+1}" width="{C-3}" height="{C-3}" rx="5" fill="#48e0b0" fill-opacity=".3" stroke="#48e0b0" stroke-width="2.2"/>')
o.append(f'<text x="{X(bx)+C//2}" y="{Y(by)+C//2+6}" fill="#9dffe4" font-size="15" text-anchor="middle">B</text>')
for sx, sy in d['spawns']:
    o.append(f'<rect x="{X(sx)+1}" y="{Y(sy)+1}" width="{C-3}" height="{C-3}" rx="5" fill="#ff5fb7" fill-opacity=".28" stroke="#ff5fb7" stroke-width="1.8"/>')
    o.append(f'<text x="{X(sx)+C//2}" y="{Y(sy)+C//2+6}" fill="#ffa9d8" font-size="14" text-anchor="middle">S</text>')
o.append(f'<text x="{PAD}" y="{TOP+ROWS*C+22}" fill="#7d99a8" font-size="11">S Eingang  B Basis  grau = Gelaende  hell = Mauer  farbig = Waffe (Zahl = angerichteter Schaden)  orange = Route</text>')
if d.get('note'):
    o.append(f'<text x="{PAD}" y="{TOP+ROWS*C+40}" fill="#e0885f" font-size="11">{d["note"]}</text>')
o.append('</svg>')
open(sys.argv[2], 'w').write(''.join(o))
print(sys.argv[2])
