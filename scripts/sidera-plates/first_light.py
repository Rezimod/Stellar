"""First Light's plates that have no drawing yet: a typographic placeholder.

Same three layers as every plate — sky, object, survey — with nothing drawn on
the object layer but grain. The survey layer carries the name, the designation
and the tier mark in the plate's own mono face. Replace a card here with a real
drawing by pointing ART (build.py) at it.
"""
from drawing import grain, svg, LBL, reticle
from more import sky, top, W, H, HF

GLYPH = {'common': '◇', 'rare': '◈', 'epic': '◆', 'legendary': '✦'}

NAME = "font-family: 'JetBrains Mono', monospace; font-size: 22px; letter-spacing: 3px"


def placeholder(name, des, tier, colours, seed, full=False):
    h = HF if full else H

    def draw(u):
        bg = sky(u, h, colours, 240, seed, 4)
        obj = svg(W, h, grain(u + 'o', W, h, .12))
        cx, cy = W / 2, h * .46
        lines = name.upper().split(' ')
        rows, row = [], ''
        for w in lines:
            if len(row) + len(w) + 1 > 18 and row:
                rows.append(row); row = w
            else:
                row = (row + ' ' + w).strip()
        rows.append(row)
        y0 = cy - 14 * (len(rows) - 1)
        text = ''.join('<text x="%s" y="%s" text-anchor="middle" fill="rgba(245,241,232,.9)" style="%s">%s</text>' % (
            cx, y0 + i * 28, NAME, r) for i, r in enumerate(rows))
        ann = [
            top('PLATE PENDING · DRAWN FROM THE RECORD WHEN IT EXISTS'),
            reticle(cx, cy, 118, 72, 6, .16),
            text,
            '<text x="%s" y="%s" text-anchor="middle" fill="rgba(245,241,232,.5)" style="%s">%s</text>' % (cx, y0 + len(rows) * 28 + 6, LBL, des),
            '<text x="%s" y="%s" text-anchor="middle" fill="rgba(245,241,232,.6)" style="%s">%s %s</text>' % (
                cx, y0 + len(rows) * 28 + 26, LBL, GLYPH[tier], tier.upper()),
        ]
        return bg, obj, svg(W, h, ''.join(ann))

    return draw


NIGHT = ('#111a33', '#080e20', '#03060e')
WARM = ('#2a1d12', '#140d08', '#050302')
STONE = ('#1a1a1f', '#0e0e12', '#050506')
MOON = ('#1b2440', '#0c1226', '#04060f')
RED = ('#2a1410', '#150a07', '#050302')
ICE = ('#122a3a', '#081521', '#03070c')

PLACEHOLDERS = {
    'FIRST-LIGHT': placeholder('First Light', 'FIRST-LIGHT · NODE 01 · 000001', 'legendary', NIGHT, 1, full=True),
    'IMILAC': placeholder('Imilac', 'IMILAC · PALLASITE · ATACAMA, 1822', 'legendary', WARM, 1822, full=True),
    'LUNAR-FRAGMENT': placeholder('A Piece of the Moon', 'LUNAR-FRAGMENT · LUNAR METEORITE', 'legendary', STONE, 384, full=True),
    'TYCHO': placeholder('Tycho', 'TYCHO · LUNAR CRATER · 86 KM', 'rare', MOON, 43),
    'OLYMPUS-MONS': placeholder('Olympus Mons', 'OLYMPUS-MONS · VOLCANO ON MARS', 'common', RED, 22),
    'EUROPA': placeholder('Europa', 'EUROPA · MOON OF JUPITER', 'common', ICE, 3122),
    'KRAKEN-MARE': placeholder('Kraken Mare', 'KRAKEN-MARE · SEA ON TITAN', 'common', WARM, 179),
    'VOYAGER-1': placeholder('Voyager 1', 'VOYAGER-1 · SPACECRAFT · 1977', 'common', NIGHT, 1977),
    'M1': placeholder('The Crab', 'M1 · SUPERNOVA REMNANT · NGC 1952', 'epic', NIGHT, 1054),
    'SGR-A': placeholder('Sagittarius A*', 'SGR-A · BLACK HOLE · EHT 2022', 'common', WARM, 2022),
    'ORIONIDS': placeholder('The Orionids', 'ORIONIDS · METEOR SHOWER · 21–22 OCT 2026', 'common', NIGHT, 1021),
    'HUNTERS-MOON': placeholder("Hunter's Moon", 'HUNTERS-MOON · FULL MOON · 26 OCT 2026', 'common', MOON, 1026),
    'PLEIADES-OCCULTATION': placeholder('The Moon Takes the Pleiades', 'PLEIADES-OCCULTATION · 24 NOV 2026', 'rare', MOON, 1124),
    'GEMINIDS': placeholder('The Geminids', 'GEMINIDS · METEOR SHOWER · 13–14 DEC 2026', 'rare', NIGHT, 1213),
    'CHRISTMAS-SUPERMOON': placeholder('Christmas Eve Supermoon', 'CHRISTMAS-SUPERMOON · 24 DEC 2026', 'rare', MOON, 1224),
    'DOUBLE-OPPOSITION': placeholder('The Double Opposition', 'DOUBLE-OPPOSITION · FEB 2027', 'epic', RED, 211),
    'SNOW-MOON-ECLIPSE': placeholder('The Snow Moon Eclipse', 'SNOW-MOON-ECLIPSE · 20 FEB 2027', 'epic', MOON, 220),
    'GREAT-ECLIPSE': placeholder('The Great Eclipse', 'GREAT-ECLIPSE · TOTAL · 2 AUG 2027', 'legendary', STONE, 802, full=True),
}
