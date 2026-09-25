#!/usr/bin/env python3
"""Erwartetes XP-Budget und daraus bezahlbares Tuning je Schwer-Mission."""
import math
rnd = lambda x: math.floor(x + 0.5)

XP = dict(shard=2, runner=3, armored=5, regenerator=4, splitter=5, splinter=1, phaser=6, elite=30)
DIFF = dict(LEICHT=1.00, MITTEL=1.30, SCHWER=1.36, FINAL=1.55)
PAT = {
 'LEICHT': dict(phaser=0, splitter=5, armored=5, regenerator=4, runner=3, eliteLate=1, eliteFinal=3),
 'MITTEL': dict(phaser=0, splitter=5, armored=5, regenerator=4, runner=3, eliteLate=1, eliteFinal=3),
 'SCHWER': dict(phaser=7, splitter=5, armored=5, regenerator=4, runner=3, eliteLate=2, eliteFinal=4),
 'FINAL':  dict(phaser=5, splitter=6, armored=4, regenerator=4, runner=3, eliteLate=3, eliteFinal=6)}
# Wellenzahl wie in game.js (Stand 2026-09: Anfang verkuerzt). Die Aurora-Senke
# schickt weniger Kommandopanzer; das Modell unten rechnet mit dem Standardmix
# und ueberschaetzt dort das XP leicht.
MISSIONS = [
 ('nivalis', 'AURORA-SENKE', 'LEICHT', 8, 1.00), ('nivalis', 'SCHERBENPASS', 'MITTEL', 12, 1.12),
 ('nivalis', 'NULLLICHT-RISS', 'SCHWER', 16, 1.30),
 ('pyra', 'ASCHEHAFEN', 'LEICHT', 10, 1.00), ('pyra', 'CALDERA-KREUZ', 'MITTEL', 14, 1.14),
 ('pyra', 'HOELLENSCHLUND', 'SCHWER', 18, 1.33),
 ('verdant', 'SPORENHAIN', 'LEICHT', 12, 1.02), ('verdant', 'TITANWURZEL', 'MITTEL', 16, 1.16),
 ('verdant', 'SMARAGD-ABGRUND', 'SCHWER', 20, 1.35),
 ('umbra', 'DAEMMERFELD', 'LEICHT', 12, 1.04), ('umbra', 'EKLIPSENBRUCH', 'MITTEL', 16, 1.20),
 ('umbra', 'EVENT-HORIZONT', 'FINAL', 25, 1.48)]


def kind(i, w, mw, lvl, total):
    p = PAT[lvl]
    if w == mw:
        if i in {total - 1 - k for k in range(p['eliteFinal'])} | {math.floor(total * .55), math.floor(total * .8)}:
            return 'elite'
    if w >= math.ceil(mw * .72) and w < mw:
        if i in {math.floor(total * (.6 + .16 * k)) for k in range(p['eliteLate'])}:
            return 'elite'
    if p['phaser'] and w >= 4 and i % p['phaser'] == 3:
        return 'phaser'
    if w >= 5 and i % p['splitter'] == 2:
        return 'splitter'
    if w >= 4 and i % p['armored'] == 4 % p['armored']:
        return 'armored'
    if w >= 3 and i % p['regenerator'] == 1:
        return 'regenerator'
    if w >= 2 and i % p['runner'] == 2 % p['runner']:
        return 'runner'
    return 'shard'


def mission_xp(waves, count, lvl):
    tot = 0
    for w in range(1, waves + 1):
        n = max(5, rnd((6 + w) * count * DIFF[lvl]))
        for i in range(n):
            k = kind(i, w, waves, lvl, n)
            tot += XP[k]
            if k == 'splitter':
                tot += 2 * XP['splinter']
    return tot


def cum_costs():
    out, a, s = [], [0, 0, 0], 0
    for i in range(15):
        ax = i % 3
        s += 40 + a[ax] * 54 + (sum(a) // 3) * 22
        a[ax] += 1
        if (i + 1) % 3 == 0:
            out.append(s)
    return out


PER = cum_costs()
COSTS = dict(rail=175, drone=200, rocket=215, mortar=175, laser=145, cryo=150, gatling=120, disruptor=190)
# Kopie von TOWER_UNLOCKS in game.js: ab welchem Level (1-12) freischaltbar.
# Starter kosten nichts, der Pulslaser wird automatisch freigeschaltet.
AVAILABLE = dict(gatling=1, mortar=2, cryo=2, disruptor=3, laser=3, rocket=3, drone=5, rail=6)
FREE = {'gatling', 'laser'}
UNLOCK = {t: rnd(c * 2.4) for t, c in COSTS.items() if t not in FREE}

print(f"Tuning je Waffe:  1/1/1={PER[0]}  2/2/2={PER[1]}  3/3/3={PER[2]}  4/4/4={PER[3]}  5/5/5={PER[4]} XP")
print(f"Alle 8 Waffen:    {[p*8 for p in PER]}")
print(f"Freischaltungen:  {sum(UNLOCK.values())} XP  {UNLOCK}\n")

# XP, die vor dem Start von Level n bereits verdient sind (erster Durchlauf).
before = [0]
for pid, name, lvl, waves, count in MISSIONS:
    before.append(before[-1] + mission_xp(waves, count, lvl))

print(f"{'Turm':10} {'XP':>5} {'verfuegbar ab':>14} {'leistbar ab (alle vorher gekauft)':>34}")
spent = 0
for t in sorted(AVAILABLE, key=lambda t: (AVAILABLE[t], COSTS[t])):
    spent += UNLOCK.get(t, 0)
    level = next((n for n in range(AVAILABLE[t], 13) if before[n - 1] >= spent), None)
    print(f"{t:10} {UNLOCK.get(t, 0):>5} {'Level ' + str(AVAILABLE[t]):>14} {('Level ' + str(level)) if level else 'nie':>34}")
print()

rows = []
for n, (pid, name, lvl, waves, count) in enumerate(MISSIONS, start=1):
    if lvl in ('SCHWER', 'FINAL'):
        cum = before[n - 1]
        unlock = sum(c for t, c in UNLOCK.items() if AVAILABLE[t] <= n)
        rest = cum - unlock
        level = 0
        for i, c in enumerate(PER):
            if rest >= c * 8:
                level = i + 1
        spent = unlock + (PER[level - 1] * 8 if level else 0)
        rows.append((pid, name, lvl, cum, unlock, level, spent, cum - spent))
cum = before[-1]

print(f"{'Mission':26} {'XP da':>7} {'Freischalt':>10} {'Tuning':>7} {'ausgegeben':>10} {'Rest':>6}")
for pid, name, lvl, avail, unlock, level, spent, left in rows:
    print(f"{pid+'/'+name:26} {avail:>7} {unlock:>10} {f'{level}/{level}/{level}':>7} {spent:>10} {left:>6}")
print(f"\nGesamteinnahmen ganze Kampagne: {cum} XP")
print(f"Bedarf fuer alles (8x 5/5/5 + Freischaltung): {PER[4]*8 + sum(UNLOCK.values())} XP")
print(f"Deckung durch einen Durchlauf: {cum/(PER[4]*8+sum(UNLOCK.values()))*100:.0f} %")
