"""The Frontier: ten original science-fiction worlds, drawn in the manner of drawing.py.

Full-art plates at 582 × 832. Far sky on the sky layer, the subject and the
foreground on the object layer, the survey layer no more than a quiet label.
"""
import math, random
from drawing import f, blob, starfield, SPIKE_DEFS, grain, svg, LBL
from more import sky, top, spike_star, W, HF

H = HF


def blur(u, name, sd, pad=30):
    return '<filter id="%s%s" x="-%d%%" y="-%d%%" width="%d%%" height="%d%%"><feGaussianBlur stdDeviation="%s"/></filter>' % (u, name, pad, pad, 100 + 2 * pad, 100 + 2 * pad, f(sd))


def noise(u, name, freq, octaves, seed, sat=0):
    return ('<filter id="%s%s" x="0" y="0" width="100%%" height="100%%"><feTurbulence type="fractalNoise" baseFrequency="%s" numOctaves="%d" seed="%d"/>'
            '<feColorMatrix type="saturate" values="%s"/></filter>') % (u, name, freq, octaves, seed, sat)


def g4(x):
    return ('%.4f' % x).rstrip('0').rstrip('.') or '0'


def lin(u, name, stops, x1=0, y1=0, x2=0, y2=1, units=''):
    st = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (g4(o), c, '' if a is None else ' stop-opacity="%s"' % g4(a)) for o, c, a in stops)
    return '<linearGradient id="%s%s" x1="%s" y1="%s" x2="%s" y2="%s"%s>%s</linearGradient>' % (u, name, g4(x1), g4(y1), g4(x2), g4(y2), units, st)


def rad(u, name, stops, cx=.5, cy=.5, r=.5, extra=''):
    st = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (g4(o), c, '' if a is None else ' stop-opacity="%s"' % g4(a)) for o, c, a in stops)
    return '<radialGradient id="%s%s" cx="%s" cy="%s" r="%s"%s>%s</radialGradient>' % (u, name, g4(cx), g4(cy), g4(r), extra, st)


def smooth(pts, closed=True):
    """A closed (or open) curve through the midpoints of pts, the points themselves as controls."""
    if closed:
        mids = [((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) for a, b in zip(pts, pts[1:] + pts[:1])]
        return 'M%s %s' % (f(mids[-1][0]), f(mids[-1][1])) + ''.join('Q%s %s %s %s' % (f(p[0]), f(p[1]), f(m[0]), f(m[1])) for p, m in zip(pts, mids)) + 'Z'
    d = 'M%s %s' % (f(pts[0][0]), f(pts[0][1]))
    for i in range(1, len(pts) - 1):
        m = ((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
        d += 'Q%s %s %s %s' % (f(pts[i][0]), f(pts[i][1]), f(m[0]), f(m[1]))
    return d + 'L%s %s' % (f(pts[-1][0]), f(pts[-1][1]))


def arc(cx, cy, r, a0, a1, rx=None, ry=None):
    """An arc from angle a0 to a1 (radians, clockwise on screen)."""
    rx = r if rx is None else rx; ry = r if ry is None else ry
    large = 1 if abs(a1 - a0) > math.pi else 0
    return 'M%s %sA%s %s 0 %d 1 %s %s' % (f(cx + rx * math.cos(a0)), f(cy + ry * math.sin(a0)), f(rx), f(ry), large, f(cx + rx * math.cos(a1)), f(cy + ry * math.sin(a1)))


def dots(rnd, n, xr, yr, rr, cols, op):
    return ''.join('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (
        f(rnd.uniform(*xr)), f(rnd.uniform(*yr)), f(rnd.uniform(*rr)), rnd.choice(cols), f(rnd.uniform(*op))) for _ in range(n))


def frontier_top(text):
    return top('THE FRONTIER · %s' % text)


# ================================================================= WORMHOLE
def wormhole(u):
    rnd = random.Random(4401)
    cx, cy, R = 262, 392, 124
    gx, gy, GR, gt = 492, 132, 236, -22          # the ringed giant, high right, and its ring tilt
    # --------------------------------------------------------- sky: the giant is far behind the throat
    gdefs = blur(u, 'bm', 22) + blur(u, 'gb2', 2.5) + (
        '<clipPath id="%sgd"><circle cx="%d" cy="%d" r="%d"/></clipPath>'
        '<filter id="%sgturb" x="-10%%" y="-10%%" width="120%%" height="120%%"><feTurbulence type="fractalNoise" baseFrequency=".003 .04" numOctaves="3" seed="44"/><feDisplacementMap in="SourceGraphic" scale="16"/><feGaussianBlur stdDeviation="1.4"/></filter>') % (u, gx, gy, GR, u) + rad(
        u, 'gsh', [(0, '#000', 0), (.3, '#000', 0), (.5, '#03050c', .6), (.66, '#010208', .93), (1, '#010207', .97)], -.05, .72, 1.05) + rad(
        u, 'glimb', [(.62, '#000', 0), (.9, '#000', .35), (1, '#000', .8)]) + rad(
        u, 'gglo', [(.9, '#b8e0ff', .16), (1, '#b8e0ff', 0)]) + lin(
        u, 'rlit', [(0, '#fff', 1), (.5, '#fff', .55), (1, '#fff', .15)], 0, 0, 1, 0)
    cols = ['#3a5670', '#56788c', '#a8b4b0', '#8a765e', '#6a8a9a', '#c4c0b0', '#2c4458', '#7e9aa4', '#9a8468', '#46647a', '#b4b6aa']
    gb = []
    y = gy - GR - 60; i = 0
    while y < gy + GR + 60:
        hgt = rnd.uniform(6, 22)
        gb.append('<rect x="%d" y="%s" width="%d" height="%s" fill="%s"/>' % (gx - GR - 80, f(y), 2 * GR + 160, f(hgt + 1), cols[i % len(cols)]))
        y += hgt; i += 1
    for _ in range(40):
        yy = rnd.uniform(gy - GR, gy + GR)
        gb.append('<path d="M%d %sH%d" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (gx - GR - 80, f(yy), gx + GR + 80, rnd.choice(['#f4f0e4', '#1a2c3a']), f(rnd.uniform(.08, .22)), f(rnd.uniform(.5, 2))))
    globe = '<g transform="rotate(%d %d %d)" opacity=".82"><g filter="url(#%sgturb)">%s</g></g>' % (gt, gx, gy, u, ''.join(gb))
    rings_b, rings_f = [], []
    r0, q = GR * 1.3, .15
    while r0 < GR * 2.3:
        t = (r0 - GR * 1.3) / GR
        op = (.1 + .42 * math.sin(t * math.pi) ** .5 + .1 * rnd.uniform(-1, 1)) * (0 if .6 < t < .64 else 1)
        c = rnd.choice(['#e8eef0', '#c8d6dc', '#f0ece0', '#b0c2cc'])
        if op > .02:
            rings_b.append('<path d="M%s 0A%s %s 0 0 1 %s 0" stroke="%s" stroke-opacity="%s"/>' % (f(-r0), f(r0), f(r0 * q), f(r0), c, f(op * .8)))
            rings_f.append('<path d="M%s 0A%s %s 0 0 0 %s 0" stroke="%s" stroke-opacity="%s"/>' % (f(-r0), f(r0), f(r0 * q), f(r0), c, f(op)))
        r0 += 1.8
    rg = '<g fill="none" stroke="url(#%srlit)" stroke-width="1.9"><g stroke="none">%%s</g>%%s</g>' % u
    ringsB = '<g fill="none" stroke-width="1.9">%s</g>' % ''.join(rings_b)
    ringsF = '<g fill="none" stroke-width="1.9">%s</g>' % ''.join(rings_f)
    # the ring's shadow on the cloud tops, cast up and right by a sun low on the left
    rsh = '<path d="M%s 0A%s %s 0 0 0 %s 0L%s 0A%s %s 0 0 1 %s 0Z" fill="#01030a" opacity=".6" transform="translate(10 -34)"/>' % (
        f(-GR * 2.3), f(GR * 2.3), f(GR * 2.3 * q), f(GR * 2.3), f(GR * 1.3), f(GR * 1.3), f(GR * 1.3 * q), f(-GR * 1.3))
    giant = ('<circle cx="%d" cy="%d" r="%d" fill="url(#%sgglo)"/>' % (gx, gy, GR + 24, u) +
             '<g transform="translate(%d %d) rotate(%d)">%s</g>' % (gx, gy, gt, ringsB) +
             '<g clip-path="url(#%sgd)">%s<g transform="translate(%d %d) rotate(%d)">%s</g><circle cx="%d" cy="%d" r="%d" fill="url(#%sgsh)"/><circle cx="%d" cy="%d" r="%d" fill="url(#%sglimb)"/></g>' % (
                 u, globe, gx, gy, gt, rsh, gx, gy, GR, u, gx, gy, GR, u) +
             '<path d="%s" fill="none" stroke="#e8f4ff" stroke-opacity=".75" stroke-width="3" filter="url(#%sgb2)"/>' % (arc(gx, gy, GR - 1, math.radians(118), math.radians(250)), u) +
             '<g transform="translate(%d %d) rotate(%d)">%s</g>' % (gx, gy, gt, ringsF))
    band = '<ellipse cx="260" cy="470" rx="560" ry="80" fill="#5a62a8" opacity=".12" transform="rotate(-58 260 470)" filter="url(#%sbm)"/>' % u
    bg = sky(u, H, ('#141838', '#080a1e', '#020309'), 300, 4401, 5, cy='.55', extra=band + giant, extra_defs=gdefs)

    # --------------------------------------------------------- the throat
    defs = blur(u, 'b1', .9) + blur(u, 'b3', 3) + blur(u, 'b8', 8) + blur(u, 'b20', 20, 60) + (
        '<clipPath id="%sthroat"><circle cx="%d" cy="%d" r="%d"/></clipPath>' % (u, cx, cy, R)) + rad(
        u, 'inner', [(0, '#4a2a70', None), (.45, '#241650', None), (.8, '#100a2c', None), (1, '#060414', None)], .58, .36, .7) + rad(
        u, 'fres', [(0, '#fff', 0), (.78, '#e8e0ff', 0), (.93, '#e8e0ff', .12), (.985, '#f4faff', .45), (1, '#ffffff', .8)]) + rad(
        u, 'halo', [(.44, '#dff0ff', .4), (.5, '#bfe0ff', .16), (.64, '#9fc0ff', .05), (1, '#6a7ad0', 0)]) + rad(
        u, 'dark', [(.5, '#02030a', 0), (.7, '#02030a', .3), (1, '#02030a', 0)]) + rad(
        u, 'gal', [(0, '#fff8ea', 1), (.1, '#ffe4c0', .85), (.35, '#ff9ad0', .25), (1, '#8a5adf', 0)]) + rad(
        u, 'spec', [(0, '#ffffff', .6), (1, '#ffffff', 0)])
    o = ['<circle cx="%d" cy="%d" r="%s" fill="url(#%sdark)"/>' % (cx, cy, f(R * 2), u),
         '<circle cx="%d" cy="%d" r="%s" fill="url(#%shalo)"/>' % (cx, cy, f(R * 2.2), u)]
    # our own sky bent around the sphere: arcs close in, ordinary stars further out
    arcs, smears = [], []
    for _ in range(50):
        e = rnd.random() ** 1.4
        r = R * (1.02 + .5 * e)
        a0 = rnd.uniform(0, 2 * math.pi)
        L = (.16 * (1 - e) ** 3 + .008) * rnd.uniform(.3, 1)
        arcs.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            arc(cx, cy, r, a0, a0 + L), rnd.choice(['#ffffff', '#dfe8ff', '#cfe0ff', '#fff1dc']), f(rnd.uniform(.2, .6) * (1 - .5 * e)), f(rnd.uniform(.4, .9))))
    for _ in range(46):
        r = R * (1.03 + .3 * rnd.random() ** 1.5); a0 = rnd.uniform(0, 2 * math.pi)
        smears.append('<path d="%s" fill="none" stroke="#dfe8ff" stroke-opacity="%s" stroke-width="%s"/>' % (arc(cx, cy, r, a0, a0 + rnd.uniform(.4, 1.6)), f(rnd.uniform(.05, .16)), f(rnd.uniform(.8, 2.4))))
    o.append('<g filter="url(#%sb3)">%s</g>' % (u, ''.join(smears)))
    o.append(''.join(arcs))
    # the giant and its rings, lensed: a banded sliver hugging the limb on its side, a ghost on the other
    ga = math.atan2(gy - cy, gx - cx)
    lg = []
    for k, c in enumerate(['#5d8aa0', '#e2dcc8', '#3a5f78', '#c8d4cc', '#e8f4ff', '#a88a6a']):
        r = R * (1.03 + .011 * k)
        span = .5 - .05 * k
        lg.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="2" stroke-linecap="round"/>' % (arc(cx, cy, r, ga - span, ga + span), c, f(.7 - .06 * k)))
    o.append('<g filter="url(#%sb1)">%s</g>' % (u, ''.join(lg)))
    for sgn in (-1, 1):   # the ring plane, bent into two thin horns either side of the image
        a = ga + sgn * .72
        o.append('<path d="%s" fill="none" stroke="#f0f4f4" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>' % arc(cx, cy, R * 1.05, min(a, a + sgn * .5), max(a, a + sgn * .5)))
    o.append('<path d="%s" fill="none" stroke="#dce8f0" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round" filter="url(#%sb1)"/>' % (arc(cx, cy, R * 1.016, ga + math.pi - .26, ga + math.pi + .26), u))

    # inside: a different galaxy's sky, the whole of it folded into the disc
    def lens(sx, sy):
        s = math.hypot(sx, sy); k = 1 / math.sqrt(1 + s * s)
        return cx + R * sx * k, cy + R * sy * k, 1 + s * s
    ins = ['<circle cx="%d" cy="%d" r="%d" fill="url(#%sinner)"/>' % (cx, cy, R, u)]
    for _ in range(8):
        sx, sy = rnd.uniform(-1.3, 1.3), rnd.uniform(-1.3, 1.3)
        x, y, st = lens(sx, sy)
        ins.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s" filter="url(#%sb20)"/>' % (
            f(x), f(y), f(rnd.uniform(22, 48)), f(rnd.uniform(12, 28)), rnd.choice(['#ff5fb0', '#4fd0ff', '#9a6aff', '#ff8a6a']), f(rnd.uniform(.2, .36)), u))
    gcx, gcy, grot, gq = .34, -.22, math.radians(-32), .5
    gx0, gy0, _ = lens(gcx, gcy)
    ins.append('<ellipse cx="%s" cy="%s" rx="66" ry="34" fill="url(#%sgal)" transform="rotate(-28 %s %s)" opacity=".9"/>' % (f(gx0), f(gy0), u, f(gx0), f(gy0)))
    gp = []
    for i in range(560):
        arm = i % 2; t = rnd.random() ** 1.15
        rr_ = .03 + 1.0 * t; th = arm * math.pi + t * 3.4 * math.pi
        px = rr_ * math.cos(th) + rnd.gauss(0, .025 + .07 * t); py = (rr_ * math.sin(th) + rnd.gauss(0, .025 + .07 * t)) * gq
        sx = gcx + px * math.cos(grot) - py * math.sin(grot); sy = gcy + px * math.sin(grot) + py * math.cos(grot)
        x, y, st = lens(sx, sy)
        c = '#ffe6c4' if t < .18 else rnd.choice(['#ffffff', '#ffd0ec', '#d8c8ff', '#bfe0ff', '#ff9ad0'])
        gp.append('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(.35 + .8 * rnd.random() ** 2), c, f(.3 + .6 * rnd.random())))
    ins.append(''.join(gp))
    ins.append('<circle cx="%s" cy="%s" r="5" fill="#fff" filter="url(#%sb3)"/><circle cx="%s" cy="%s" r="1.8" fill="#fff"/>' % (f(gx0), f(gy0), u, f(gx0), f(gy0)))
    sp = []
    for _ in range(380):
        s = 4.2 * rnd.random() ** .85; a = rnd.uniform(0, 2 * math.pi)
        x, y, st = lens(s * math.cos(a), s * math.sin(a))
        c = rnd.choice(['#ffffff', '#ffe0f0', '#d8e4ff', '#fff0d8', '#c8b8ff'])
        if st < 2.4:
            sp.append('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(.4 + 1.1 * rnd.random() ** 3), c, f(.4 + .6 * rnd.random())))
        else:
            L = min(.4, .007 * st * rnd.uniform(.6, 1.4))
            sp.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (arc(cx, cy, math.hypot(x - cx, y - cy), a - L / 2, a + L / 2), c, f(rnd.uniform(.35, .9)), f(rnd.uniform(.5, 1))))
    for _ in range(3):
        s = rnd.uniform(.3, .9); a = rnd.uniform(0, 2 * math.pi)
        x, y, st = lens(s * math.cos(a), s * math.sin(a))
        sp.append(spike_star(x, y, rnd.uniform(1, 1.5), rnd.choice(['#ffd0ec', '#d8e4ff']), rnd.uniform(6, 10), .9, .6))
    ins.append(''.join(sp))
    ins.append('<circle cx="%d" cy="%d" r="%s" fill="none" stroke="#e8d8ff" stroke-opacity=".22" stroke-width="7" filter="url(#%sb3)"/>' % (cx, cy, f(R - 5), u))
    ins.append('<circle cx="%d" cy="%d" r="%d" fill="url(#%sfres)"/>' % (cx, cy, R, u))
    # glass: a soft reflection of the giant's lit limb upper right, a cool sheen lower left
    ins.append('<path d="%s" fill="none" stroke="url(#%sspec)" stroke-width="18" stroke-linecap="round" opacity=".32" filter="url(#%sb8)"/>' % (arc(cx, cy, R * .8, ga - .55, ga + .45), u, u))
    ins.append('<path d="%s" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="2.4" stroke-linecap="round" filter="url(#%sb1)"/>' % (arc(cx, cy, R * .88, ga - .35, ga + .2), u))
    ins.append('<path d="%s" fill="none" stroke="#9fc8ff" stroke-opacity=".14" stroke-width="12" stroke-linecap="round" filter="url(#%sb8)"/>' % (arc(cx, cy, R * .82, ga + math.pi - .5, ga + math.pi + .5), u))
    o.append('<g clip-path="url(#%sthroat)">%s</g>' % (u, ''.join(ins)))
    # the Einstein ring: piled-up starlight at the edge, beaded where it is brightest
    o.append('<circle cx="%d" cy="%d" r="%s" fill="none" stroke="#dcecff" stroke-width="6" opacity=".4" filter="url(#%sb3)"/>' % (cx, cy, f(R + 1.5), u))
    o.append('<circle cx="%d" cy="%d" r="%s" fill="none" stroke="#ffffff" stroke-width="1.1" opacity=".95"/>' % (cx, cy, f(R + .6)))
    beads = ''.join('<path d="%s" fill="none" stroke="#ffffff" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
        arc(cx, cy, R + 2, a, a + rnd.uniform(.04, .2)), f(rnd.uniform(.4, .9)), f(rnd.uniform(1, 2.2))) for a in [rnd.uniform(0, 2 * math.pi) for _ in range(22)])
    o.append('<g filter="url(#%sb1)">%s</g>' % (u, beads))
    for a in (-2.5, .7):
        o.append(spike_star(cx + (R + 2) * math.cos(a), cy + (R + 2) * math.sin(a), 1.7, '#eaf4ff', 18, .95, .7))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .11), defs)
    return bg, obj, svg(W, H, frontier_top('A THROAT 1,400 KM ACROSS · ANOTHER GALAXY INSIDE'))


# ================================================================= TWIN SUNS
def twin_suns(u):
    rnd = random.Random(4402)
    hz = 468
    ax, ay, ar = 206, 430, 31         # the larger, gold
    bx, by, br = 300, 457, 15         # the smaller, orange-red, touching the far hills
    bdefs = SPIKE_DEFS.format(u=u) + blur(u, 'b6', 6) + blur(u, 'b24', 24, 60) + lin(
        u, 'sky', [(0, '#100d2c', None), (.2, '#261c4a', None), (.38, '#5a2c5a', None), (.48, '#a8465c', None), (.54, '#e0704a', None), (.58, '#ffa860', None), (.6, '#ffd08e', None), (1, '#ffd08e', None)]) + rad(
        u, 'ga', [(0, '#fffbee', 1), (.07, '#fff0c4', .9), (.2, '#ffc978', .42), (.5, '#ff8a4a', .12), (1, '#ff6a3a', 0)]) + rad(
        u, 'gb', [(0, '#fff2e0', 1), (.1, '#ffb080', .8), (.3, '#ff6a3a', .3), (1, '#e0402a', 0)])
    stars = '<g opacity=".75">%s</g>' % starfield(W, 240, 110, 4402, 2, u=u)
    streaks = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s" filter="url(#%sb6)"/>' % (
        f(rnd.uniform(20, 560)), f(rnd.uniform(340, 445)), f(rnd.uniform(60, 190)), f(rnd.uniform(1.2, 3.5)), rnd.choice(['#ffb27a', '#ff8a6a', '#ffd0a0', '#c8607a']), f(rnd.uniform(.25, .55)), u) for _ in range(13))
    rays = ''.join('<path d="M%d %dL%s %sL%s %sZ" fill="#ffd0a0" opacity="%s"/>' % (
        ax, ay, f(ax + 900 * math.cos(t - .03)), f(ay + 900 * math.sin(t - .03)), f(ax + 900 * math.cos(t + .03)), f(ay + 900 * math.sin(t + .03)), f(rnd.uniform(.03, .07)))
        for t in [rnd.uniform(-math.pi * .95, -math.pi * .05) for _ in range(8)])
    suns = ('<circle cx="%d" cy="%d" r="240" fill="url(#%sga)"/><circle cx="%d" cy="%d" r="120" fill="url(#%sgb)"/>' % (ax, ay, u, bx, by, u) +
            '<circle cx="%d" cy="%d" r="%d" fill="#fff" filter="url(#%sb6)" opacity=".8"/><ellipse cx="%d" cy="%d" rx="%d" ry="%s" fill="#fff8e6"/>' % (ax, ay, ar + 5, u, ax, ay, ar, f(ar * .96)) +
            '<circle cx="%d" cy="%d" r="%d" fill="#ffc49a"/><circle cx="%d" cy="%d" r="%d" fill="#ffe8d8"/>' % (bx, by, br, bx, by, br - 5))
    bg = svg(W, H, '<rect width="%d" height="%d" fill="url(#%ssky)"/>' % (W, H, u) + stars + '<g filter="url(#%sb24)">%s</g>' % (u, rays) + suns + streaks, bdefs)

    defs = blur(u, 'b1', 1) + blur(u, 'b2', 2) + blur(u, 'b4', 4) + blur(u, 'b10', 10, 40) + noise(u, 'sand', '.9 .3', 2, 7) + lin(
        u, 'lit', [(0, '#ffc890', 1), (.18, '#f09a62', 1), (.5, '#b0584c', 1), (1, '#5a2238', 1)], .7, 0, .3, 1) + lin(
        u, 'rock', [(0, '#6a2a24', None), (.5, '#3a1618', None), (1, '#1c0a10', None)], 0, 0, 1, 0) + lin(
        u, 'haze', [(0, '#ffc488', 0), (.6, '#ffb070', .4), (1, '#ffb070', 0)]) + lin(
        u, 'sh0', [(0, '#a05a72', None), (1, '#6a2e4a', None)]) + lin(
        u, 'sh1', [(0, '#7a3a5c', None), (.5, '#4a1c3a', None), (1, '#2a0e22', None)]) + lin(
        u, 'sh2', [(0, '#5e2a4e', None), (.4, '#36142e', None), (1, '#16060f', None)]) + lin(
        u, 'hz1', [(0, '#ffb890', .55), (1, '#ffb890', 0)]) + lin(
        u, 'hz2', [(0, '#f0908a', .3), (1, '#f0908a', 0)]) + rad(
        u, 'scat', [(0, '#ffd8a0', .5), (.35, '#ff9a60', .2), (1, '#ff7a50', 0)]) + (
        '<filter id="%ssandc" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .04" numOctaves="4" seed="21"/>'
        '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .75  0 0 0 0 .55  1.2 0 0 0 -.5"/></filter>') % u
    o = []
    far = [(-10, hz + 6)]
    x = -10
    while x < W + 20:
        x += rnd.uniform(30, 80); far.append((x, hz - rnd.uniform(3, 14) if rnd.random() < .6 else hz - rnd.uniform(0, 4)))
    far += [(W + 20, hz + 40), (-10, hz + 40)]
    o.append('<path d="%s" fill="#a85a74" opacity=".9"/>' % smooth(far))
    for mx, mw, mh in ((452, 64, 24), (520, 36, 16), (72, 56, 18)):
        o.append('<path d="M%s %dL%s %dL%s %dL%s %dZ" fill="#96506a"/>' % (f(mx - mw / 2 - 12), hz + 4, f(mx - mw / 2), hz - mh, f(mx + mw / 2), hz - mh - 2, f(mx + mw / 2 + 14), hz + 4))
    o.append('<rect y="%d" width="%d" height="40" fill="url(#%shaze)"/>' % (hz - 24, W, u))

    # dunes: a sharp crest each, the slope facing the suns lit, the slip face in violet shadow
    def dune(px, py, wl, wr, by, shade, litc, k, ripples):
        body = 'M%s %sQ%s %s %s %sQ%s %s %s %sL%s %dL%s %dZ' % (
            f(px - wl), f(by), f(px - wl * .45), f(py + (by - py) * .12), f(px), f(py), f(px + wr * .25), f(py + (by - py) * .55), f(px + wr), f(by + 8), f(px + wr), H, f(px - wl), H)
        lit = 'M%s %sQ%s %s %s %sQ%s %s %s %sQ%s %s %s %dL%s %dZ' % (
            f(px - wl), f(by), f(px - wl * .45), f(py + (by - py) * .12), f(px), f(py), f(px + wl * .02), f(py + (by - py) * .7), f(px - wl * .12), f(by + (by - py) * .6),
            f(px - wl * .3), f(by + (by - py) * 1.4), f(px - wl * .5), H, f(px - wl - 60), H)
        crest = 'M%s %sQ%s %s %s %s' % (f(px - wl), f(by), f(px - wl * .45), f(py + (by - py) * .12), f(px), f(py))
        ridge = 'M%s %sQ%s %s %s %sQ%s %s %s %d' % (f(px), f(py), f(px + wl * .02), f(py + (by - py) * .7), f(px - wl * .12), f(by + (by - py) * .6), f(px - wl * .3), f(by + (by - py) * 1.4), f(px - wl * .5), H)
        g = ['<path d="%s" fill="%s"/>' % (body, shade)]
        g.append('<path d="%s" fill="%s" opacity=".35" filter="url(#%sb4)" transform="translate(-3 2)"/>' % (lit, litc, u))
        g.append('<path d="%s" fill="%s"/>' % (lit, litc))
        cid = '%sdn%d' % (u, len(o))
        rp = []
        for j in range(ripples):
            yy = rnd.uniform(py, min(H, by + (by - py) * 2.2)); xx = rnd.uniform(px - wl, px)
            wv = rnd.uniform(10, 34) * (1 + (yy - hz) / 180)
            rp.append('<path d="M%s %sq%s %s %s %st%s %s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width=".8"/>' % (
                f(xx), f(yy), f(wv / 2), f(-2), f(wv), f(1), f(wv), f(-1), rnd.choice(['#ffe0b0', '#6a2a2a']), f(rnd.uniform(.12, .35))))
        g.append('<clipPath id="%s"><path d="%s"/></clipPath><g clip-path="url(#%s)">%s</g>' % (cid, lit, cid, ''.join(rp)))
        g.append('<path d="%s" fill="none" stroke="#ffc890" stroke-opacity=".25" stroke-width="%s" filter="url(#%sb2)"/>' % (ridge, f(3 + k), u))
        g.append('<path d="%s" fill="none" stroke="#ffd8a8" stroke-opacity=".8" stroke-width="%s"/>' % (crest, f(.8 + k * .15)))
        g.append('<path d="%s" fill="none" stroke="#ffc890" stroke-opacity=".35" stroke-width="%s" filter="url(#%sb2)"/>' % (crest, f(3 + k), u))
        return ''.join(g)

    fars = [(60, hz + 2, 120, 110, hz + 18), (250, hz + 6, 140, 120, hz + 22), (420, hz + 4, 110, 140, hz + 20)]
    for k, (px, py, wl, wr, by) in enumerate(fars):
        o.append(dune(px, py, wl, wr, by, 'url(#%ssh0)' % u, '#cc786c', 0, 0))
    o.append('<rect y="%d" width="%d" height="70" fill="url(#%shz1)"/>' % (hz - 4, W, u))
    mids = [(150, hz + 16, 210, 170, hz + 64), (400, hz + 22, 170, 220, hz + 70)]
    for k, (px, py, wl, wr, by) in enumerate(mids):
        o.append(dune(px, py, wl, wr, by, 'url(#%ssh1)' % u, 'url(#%slit)' % u, 1, 30))
    o.append('<rect y="%d" width="%d" height="110" fill="url(#%shz2)"/>' % (hz + 30, W, u))
    nears = [(-40, hz + 90, 260, 380, hz + 200), (330, hz + 118, 300, 360, hz + 250)]
    for k, (px, py, wl, wr, by) in enumerate(nears):
        o.append(dune(px, py, wl, wr, by, 'url(#%ssh2)' % u, 'url(#%slit)' % u, 2 + k, 90))
    o.append('<rect y="%d" width="%d" height="%d" filter="url(#%ssand)" opacity=".2" style="mix-blend-mode: overlay"/>' % (hz, W, H - hz, u))
    o.append('<rect y="%d" width="%d" height="%d" filter="url(#%ssandc)" opacity=".18" style="mix-blend-mode: soft-light"/>' % (hz, W, H - hz, u))
    # light scattering in the dusty air, low over the sand toward the suns
    o.append('<ellipse cx="%d" cy="%d" rx="420" ry="170" fill="url(#%sscat)" style="mix-blend-mode: screen"/>' % (ax + 30, hz + 10, u))
    # spindrift: sand blowing off the crests, lit from behind
    sd = []
    for px, py, wl, wr, by in mids + nears:
        for _ in range(9):
            tt = rnd.uniform(.15, 1)
            x0 = px - wl + wl * tt; y0 = by + (py - by) * (1 - (1 - tt) ** 2) - 2
            sd.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#ffd8a8" opacity="%s" transform="rotate(-6 %s %s)"/>' % (
                f(x0 + 18), f(y0 - 3), f(rnd.uniform(14, 40)), f(rnd.uniform(1.5, 4)), f(rnd.uniform(.08, .22)), f(x0), f(y0)))
    o.append('<g filter="url(#%sb4)">%s</g>' % (u, ''.join(sd)))
    o.append('ARCH')

    # the arch, carved by the wind out of a rock fin on the right
    outer = [(348, 616), (362, 560), (372, 500), (366, 446), (378, 384), (398, 330), (432, 290), (474, 268), (520, 262), (560, 272), (596, 296), (610, 340), (612, 630)]
    hole = [(392, 596), (400, 540), (402, 482), (412, 424), (430, 378), (460, 346), (496, 334), (526, 342), (548, 372), (556, 420), (560, 484), (566, 550), (572, 600)]
    ad = smooth(outer) + smooth(hole[::-1])
    ag = ['<path d="%s" fill="url(#%srock)" fill-rule="evenodd"/>' % (ad, u)]
    strata = ''.join('<path d="M340 %sq60 %s 120 %st120 %st60 0" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (
        f(y), f(rnd.uniform(-5, 5)), f(rnd.uniform(-3, 3)), f(rnd.uniform(-3, 3)), rnd.choice(['#ff9a6a', '#0a0408', '#c86a4a', '#0a0408']), f(rnd.uniform(.1, .3)), f(rnd.uniform(.6, 2.6))) for y in [262 + i * 8 + rnd.uniform(-2, 2) for i in range(46)])
    pits = ''.join('<path d="%s" fill="#0a0408" opacity="%s"/>' % (blob(rnd.uniform(360, 610), rnd.uniform(270, 620), rnd.uniform(2, 10), rnd.uniform(1, 4), rnd, 8, .4), f(rnd.uniform(.25, .55))) for _ in range(110))
    ag.append('<clipPath id="%sarch"><path d="%s" fill-rule="evenodd" clip-rule="evenodd"/></clipPath><g clip-path="url(#%sarch)">%s%s' % (u, ad, u, strata, pits))
    ag.append('<path d="%s" fill="none" stroke="#ff9a5a" stroke-width="10" stroke-opacity=".5" filter="url(#%sb4)"/>' % (smooth(outer[:8], False), u))
    ag.append('<path d="%s" fill="none" stroke="#ffb070" stroke-width="8" stroke-opacity=".32" filter="url(#%sb4)"/>' % (smooth(hole[6:], False), u))
    ag.append('<rect x="560" y="250" width="60" height="400" fill="#0e0508" opacity=".5" filter="url(#%sb10)"/>' % u)
    ag.append('<rect x="340" y="560" width="280" height="80" fill="#0e0508" opacity=".45" filter="url(#%sb10)"/></g>' % u)
    ag.append('<path d="%s" fill="none" stroke="#ffe0b0" stroke-opacity=".8" stroke-width="1.1"/>' % smooth(outer[:8], False))
    ag.append('<path d="%s" fill="none" stroke="#ffd0a0" stroke-opacity=".5" stroke-width=".9"/>' % smooth(hole[6:], False))
    # a talus of fallen blocks at its feet
    talus = ''.join('<path d="%s" fill="%s"/>' % (blob(x, y, s, s * .55, rnd, 7, .3), rnd.choice(['#2a1016', '#3a1618', '#1c0a10'])) for x, y, s in
                    [(rnd.uniform(330, 610), rnd.uniform(598, 628), rnd.uniform(5, 16)) for _ in range(22)])
    # doubled shadows, reaching toward us: one from each sun, in two colours
    sh = []
    for (sx, sy), tint, op in (((ax, hz), '#24082a', .6), ((bx, hz), '#3a0c1c', .45)):
        for bx0, bw in ((376, 40), (590, 44)):
            dx, dy = bx0 - sx, 612 - sy
            k = 2.2
            sh.append('<path d="M%s 612L%s 612L%s %sL%s %sZ" fill="%s" opacity="%s"/>' % (
                f(bx0 - bw / 2), f(bx0 + bw / 2), f(bx0 + bw * 1.2 + dx * k), f(612 + dy * k), f(bx0 - bw * .8 + dx * k), f(612 + dy * k), tint, f(op)))
    arch = '<g filter="url(#%sb4)">%s</g>' % (u, ''.join(sh)) + ''.join(ag) + talus
    # a few stones on the near dune, each with its pair of shadows
    stones = []
    for sx0, sy0, s in ((118, 676, 16), (204, 724, 9), (58, 770, 24)):
        for (lx, ly), tint, op in (((ax, hz), '#1e0820', .6), ((bx, hz), '#2a0a14', .45)):
            dx, dy = sx0 - lx, sy0 - ly
            L = 1.5
            stones.append('<path d="M%s %sL%s %sL%s %sL%s %sZ" fill="%s" opacity="%s" filter="url(#%sb1)"/>' % (
                f(sx0 - s * .8), f(sy0), f(sx0 + s * .8), f(sy0), f(sx0 + s * .5 + dx * L), f(sy0 + dy * L), f(sx0 - s * .5 + dx * L), f(sy0 + dy * L), tint, f(op), u))
        stones.append('<path d="%s" fill="#2a1016"/>' % blob(sx0, sy0 - s * .45, s, s * .6, rnd, 9, .25))
        stones.append('<path d="M%s %sq%s %s %s %s" fill="none" stroke="#ffb070" stroke-opacity=".7" stroke-width="1"/>' % (f(sx0 - s * .9), f(sy0 - s * .4), f(s * .4), f(-s * .7), f(s * 1.1), f(-s * .5)))
    o = ''.join(o).replace('ARCH', arch)
    obj = svg(W, H, o + ''.join(stones) + grain(u + 'o', W, H, .16), defs)
    return bg, obj, svg(W, H, frontier_top('TWO SUNS, ONE DUSK · TWO SHADOWS FOR EVERYTHING'))


# ================================================================= HOUR SEA
def hour_sea(u):
    rnd = random.Random(4403)
    cx, cy, S = 291, 262, 54          # the hole and its shadow
    hz = 500
    tilt = -4
    Rb, Rf, q = S * 2.3, 640, .07     # the lensed far side's reach, the near plane's reach and its foreshortening
    bdefs = lin(u, 'sky', [(0, '#020309', None), (.3, '#060818', None), (.5, '#141630', None), (.6, '#2e2a44', None)]) + rad(
        u, 'wash', [(0, '#ffe6c0', .4), (.25, '#ffb070', .18), (.6, '#5a4a8a', .07), (1, '#000', 0)])
    bg = svg(W, H, '<rect width="%d" height="%d" fill="url(#%ssky)"/>' % (W, H, u) + starfield(W, 490, 190, 4403, 3, u=u) +
             '<ellipse cx="%d" cy="%d" rx="560" ry="300" fill="url(#%swash)"/>' % (cx, cy + 20, u), SPIKE_DEFS.format(u=u) + bdefs)

    dop = ('<stop offset="0" stop-color="#d4e4ff"/><stop offset=".25" stop-color="#f8faff"/><stop offset=".45" stop-color="#fff0d4"/>'
           '<stop offset=".62" stop-color="#ffc07a"/><stop offset=".82" stop-color="#e86e30"/><stop offset="1" stop-color="#9a3414"/>')
    defs = blur(u, 'b1', 1) + blur(u, 'b2', 2) + blur(u, 'b4', 4) + blur(u, 'b10', 10, 50) + blur(u, 'b30', 30, 80) + (
        '<linearGradient id="%sdop" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="660" y2="0">%s</linearGradient>'
        '<radialGradient id="%sbi" gradientUnits="userSpaceOnUse" cx="%d" cy="%d" r="%s"><stop offset="%s" stop-color="#fff"/><stop offset="%s" stop-color="#eee"/><stop offset=".78" stop-color="#555"/><stop offset="1" stop-color="#000"/></radialGradient>'
        '<radialGradient id="%sfi"><stop offset="0" stop-color="#fff"/><stop offset=".12" stop-color="#fff"/><stop offset=".3" stop-color="#999"/><stop offset=".62" stop-color="#333"/><stop offset="1" stop-color="#000"/></radialGradient>'
        '<filter id="%splasma" x="-10%%" y="-30%%" width="120%%" height="160%%"><feTurbulence type="fractalNoise" baseFrequency=".01 .14" numOctaves="3" seed="4403"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>'
        '<filter id="%ssmear" x="-5%%" y="-20%%" width="110%%" height="140%%"><feTurbulence type="fractalNoise" baseFrequency=".003 .11" numOctaves="2" seed="7" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="18" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="1.6 5"/></filter>'
        '<clipPath id="%ssea"><rect y="%d" width="%d" height="%d"/></clipPath>') % (
        u, dop, u, cx, cy, f(Rb), g4(S / Rb), g4(S * 1.5 / Rb), u, u, u, u, hz, W, H - hz) + lin(
        u, 'seag', [(0, '#161c2c', None), (.2, '#0a0f1a', None), (1, '#03050a', None)]) + lin(
        u, 'wave', [(0, '#2a3246', None), (.3, '#121a28', None), (1, '#070b12', None)]) + lin(
        u, 'foam', [(0, '#fff', 0), (1, '#fff', .12)])
    # the far side of the disk, bent over the top of the shadow (and a thin image under it)
    back = arc(cx, cy, 0, math.pi, 2 * math.pi, Rb * 1.1, Rb * .92) + 'L%s %sA%s %s 0 0 0 %s %sZ' % (
        f(cx + S * 1.03 * 1.08), f(cy), f(S * 1.03 * 1.08), f(S * 1.03), f(cx - S * 1.03 * 1.08), f(cy))
    under = arc(cx, cy, 0, .08, math.pi - .08, S * 1.18, S * 1.12) + 'L%s %sA%s %s 0 0 0 %s %sZ' % (
        f(cx - S * 1.03 * math.cos(.08)), f(cy + S * math.sin(.08)), f(S * 1.03), f(S * 1.0), f(cx + S * 1.03 * math.cos(.08)), f(cy + S * math.sin(.08)))
    plane = 'M%s %sA%s %s 0 1 0 %s %sA%s %s 0 1 0 %s %sZM%s %sA%s %s 0 1 1 %s %sA%s %s 0 1 1 %s %sZ' % (
        f(cx - Rf), f(cy), f(Rf), f(Rf * q), f(cx + Rf), f(cy), f(Rf), f(Rf * q), f(cx - Rf), f(cy),
        f(cx - S * 1.3), f(cy), f(S * 1.3), f(S * 1.3 * q), f(cx + S * 1.3), f(cy), f(S * 1.3), f(S * 1.3 * q), f(cx - S * 1.3), f(cy))
    nearhalf = '<clipPath id="%snh"><rect x="-200" y="%d" width="1000" height="200"/></clipPath>' % (u, cy)
    defs += ('<mask id="%smb" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1000" height="900"><path d="%s" fill="url(#%sbi)"/><path d="%s" fill="#fff" opacity=".8"/></mask>'
             '<mask id="%smf" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1000" height="900"><ellipse cx="%d" cy="%d" rx="%d" ry="%s" fill="url(#%sfi)"/></mask>') % (
        u, back, u, under, u, cx, cy, Rf, f(Rf * q * 1.6), u) + nearhalf + '<clipPath id="%splane"><path d="%s" fill-rule="evenodd" clip-rule="evenodd"/></clipPath>' % (u, plane)

    def disk(streaks=True, hole=True):
        r_ = random.Random(77)
        g = ['<ellipse cx="%d" cy="%d" rx="600" ry="170" fill="#ffc890" opacity=".13" filter="url(#%sb30)"/>' % (cx, cy, u),
             '<ellipse cx="%d" cy="%d" rx="%s" ry="%s" fill="#fff0d8" opacity=".3" filter="url(#%sb30)"/>' % (cx, cy - 16, f(Rb), f(Rb * .8), u)]
        g.append('<rect x="-200" y="-100" width="1000" height="700" fill="url(#%sdop)" mask="url(#%smb)"/>' % (u, u))
        pl = '<g clip-path="url(#%splane)"><rect x="-200" y="-100" width="1000" height="700" fill="url(#%sdop)" mask="url(#%smf)"/></g>' % (u, u, u)
        g.append(pl)
        st = []
        if streaks:
            for i in range(22):
                r = S * (1.1 + 1.1 * (i / 21) ** 1.2)
                st.append('<path d="%s" fill="none" stroke="#fff" stroke-opacity="%s" stroke-width="%s"/>' % (
                    arc(cx, cy, 0, math.pi + r_.uniform(0, .5), 2 * math.pi - r_.uniform(0, .5), r * 1.1, r * .92), f(r_.uniform(.08, .3) * (1 - i / 24)), f(r_.uniform(.6, 1.6))))
            g.append('<g filter="url(#%splasma)">%s</g>' % (u, ''.join(st)))
        g.append('<path d="%s" fill="none" stroke="#fffaf0" stroke-width="9" stroke-opacity=".75" filter="url(#%sb4)"/>' % (arc(cx, cy, 0, math.pi + .15, 2 * math.pi - .15, S * 1.2, S * 1.08), u))
        g.append('<circle cx="%d" cy="%d" r="%d" fill="#fff6e4" opacity=".7" filter="url(#%sb4)"/>' % (cx, cy, S + 2, u))
        if hole:
            g.append('<circle cx="%d" cy="%d" r="%d" fill="#000"/>' % (cx, cy, S))
            g.append('<circle cx="%d" cy="%d" r="%s" fill="none" stroke="#fffaf0" stroke-width="1.4" opacity=".95"/>' % (cx, cy, f(S + 1.2)))
        # the near half of the plane crosses in front of the shadow
        g.append('<g clip-path="url(#%snh)">%s</g>' % (u, pl))
        if streaks:
            fs = []
            for i in range(26):
                rx = S * 1.4 + 520 * (i / 25) ** 1.5
                a0 = r_.uniform(0, .6); a1 = math.pi - r_.uniform(0, .6)
                fs.append('<path d="%s" fill="none" stroke="#fff" stroke-opacity="%s" stroke-width="%s"/>' % (
                    arc(cx, cy, 0, a0, a1, rx, rx * q), f(r_.uniform(.06, .26) * (1 - i / 30)), f(r_.uniform(.5, 1.4))))
            g.append('<g filter="url(#%splasma)">%s</g>' % (u, ''.join(fs)))
        g.append('<ellipse cx="%d" cy="%d" rx="160" ry="5" fill="#f4f8ff" opacity=".55" filter="url(#%sb4)"/>' % (cx - 130, cy + 4, u))
        g.append('<ellipse cx="%d" cy="%d" rx="90" ry="1.6" fill="#ffffff" opacity=".85" filter="url(#%sb1)"/>' % (cx - 100, cy + 4, u))
        return '<g transform="rotate(%d %d %d)">%s</g>' % (tilt, cx, cy, ''.join(g))

    o = []
    o.append(''.join('<path d="%s" fill="none" stroke="#fff4e0" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
        arc(cx, cy, r, a, a + rnd.uniform(.04, .2)), f(rnd.uniform(.2, .55)), f(rnd.uniform(.4, 1))) for r, a in [(S * rnd.uniform(2.5, 3.8), rnd.uniform(0, 2 * math.pi)) for _ in range(46)]))
    o.append(disk())
    # the sea, a dark mirror, the disk's reflection smeared long and broken into bars by the swell
    o.append('<rect y="%d" width="%d" height="%d" fill="url(#%sseag)"/>' % (hz, W, H - hz, u))
    r2 = ['<g opacity=".6" filter="url(#%ssmear)"><g transform="translate(0 %d) scale(1 -1)">%s</g></g>' % (u, 2 * hz, disk(False, False))]
    y = hz + 1
    while y < H:
        k = (y - hz) / (H - hz)
        th = .8 + 6 * k * k
        x = -20
        while x < W:
            L = rnd.uniform(40, 260) * (.4 + k)
            r2.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#060a12" opacity="%s"/>' % (f(x), f(y), f(L), f(th * rnd.uniform(.3, .7)), f(th / 2), f(rnd.uniform(.25, .6))))
            x += L + rnd.uniform(40, 260)
        y += th * rnd.uniform(1.6, 3.2)
    o.append('<g clip-path="url(#%ssea)">%s</g>' % (u, ''.join(r2)))
    # the wave: a wall of water on the horizon, kilometres high, running toward us
    wv = [(-30, hz + 2), (-30, hz - 168), (40, hz - 188), (130, hz - 198), (220, hz - 192), (300, hz - 170), (360, hz - 138), (410, hz - 96), (452, hz - 52), (490, hz - 24), (540, hz - 12), (612, hz - 6), (612, hz + 2)]
    wd = smooth(wv)
    crest = smooth(wv[1:-1], False)
    defs += lin(u, 'wave2', [(0, '#1c4654', None), (.12, '#12283a', None), (.45, '#0a1420', None), (1, '#05080e', None)], 0, hz - 200, 0, hz, ' gradientUnits="userSpaceOnUse"') + land_filter(
        u, 'lace', '.012 .06', 9, (.9, .95, 1), 7, .6) + blur(u, 'b18', 18, 60) + rad(u, 'mist', [(0, '#e8e4ec', .5), (1, '#e8e4ec', 0)])
    # the plume torn off the crest and blown back, backlit by the disk
    plume = []
    for _ in range(40):
        x, y = wv[rnd.randint(1, 8)]
        x += rnd.uniform(-20, 30)
        plume.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (
            f(x - rnd.uniform(0, 50)), f(y - rnd.uniform(10, 90)), f(rnd.uniform(30, 100)), f(rnd.uniform(10, 30)), rnd.choice(['#f4e8dc', '#ffd8b0', '#c8ccd8']), f(rnd.uniform(.1, .26))))
    o.append('<g filter="url(#%sb18)">%s</g>' % (u, ''.join(plume)))
    o.append('<path d="%s" fill="url(#%swave2)"/>' % (wd, u))
    face = []
    # light through the thin water under the lip: teal, glowing
    face.append('<path d="%s" fill="none" stroke="#34a8a0" stroke-width="26" stroke-opacity=".5" filter="url(#%sb10)" transform="translate(0 12)"/>' % (crest, u))
    face.append('<path d="%s" fill="none" stroke="#7ad8c8" stroke-width="10" stroke-opacity=".3" filter="url(#%sb4)" transform="translate(0 5)"/>' % (crest, u))
    face.append('<ellipse cx="%d" cy="%d" rx="200" ry="60" fill="#ffc890" opacity=".1" filter="url(#%sb10)"/>' % (cx - 110, hz - 130, u))
    # sheets of water drawn down the face
    for _ in range(130):
        x = rnd.uniform(-30, 480)
        top_y = hz - 200 + max(0, x - 250) * .6
        y0 = top_y + rnd.uniform(0, 40); L = rnd.uniform(50, 200)
        face.append('<path d="M%s %sq%s %s %s %s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            f(x), f(y0), f(rnd.uniform(4, 12)), f(L * .5), f(rnd.uniform(10, 26)), f(L), rnd.choice(['#6a8898', '#01030a', '#01030a', '#01030a']), f(rnd.uniform(.03, .09)), f(rnd.uniform(.6, 5))))
    for i in range(16):   # foam bands sliding down the face
        yy = hz - 176 + i * 11 + rnd.uniform(-3, 3)
        face.append('<path d="M-30 %sQ150 %s 300 %sT%s %s" fill="none" stroke="#dfe6f4" stroke-opacity="%s" stroke-width="%s" filter="url(#%sb1)"/>' % (
            f(yy), f(yy + rnd.uniform(-8, 8)), f(yy + 6), f(470 + i * 6), f(hz - 6), f(rnd.uniform(.02, .06)), f(rnd.uniform(.8, 2.5)), u))
    face.append('<rect x="-20" y="%d" width="%d" height="%d" filter="url(#%slace)" opacity=".08"/>' % (hz - 120, W + 40, 120, u))
    face.append('<rect x="-20" y="%d" width="%d" height="30" fill="url(#%sfoam)" filter="url(#%sb4)"/>' % (hz - 30, W + 40, u, u))
    o.append('<clipPath id="%swv"><path d="%s"/></clipPath><g clip-path="url(#%swv)">%s</g>' % (u, wd, u, ''.join(face)))
    # the lip: spray streaming off it, rimmed with the disk's light
    spray = []
    for _ in range(110):
        x, y = wv[rnd.randint(1, 9)]
        x += rnd.uniform(-30, 30); y += rnd.uniform(-2, 8)
        spray.append('<path d="M%s %sq%s %s %s %s" fill="none" stroke="#fff0dc" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            f(x), f(y), f(-rnd.uniform(6, 24)), f(-rnd.uniform(8, 22)), f(-rnd.uniform(24, 80)), f(-rnd.uniform(8, 40)), f(rnd.uniform(.06, .28)), f(rnd.uniform(1, 6))))
    o.append('<g filter="url(#%sb2)">%s</g>' % (u, ''.join(spray)))
    o.append('<g filter="url(#%sb10)" opacity=".8">%s</g>' % (u, ''.join(spray[::2])))
    o.append('<path d="%s" fill="none" stroke="#ffe8c8" stroke-width="9" stroke-opacity=".32" filter="url(#%sb4)"/>' % (crest, u))
    o.append('<path d="%s" fill="none" stroke="#fff6e8" stroke-width="1.3" stroke-opacity=".95"/>' % crest)
    # for scale: a sea stack a hundred metres tall, a lamp on it, dwarfed at the wave's foot
    stx = 468
    o.append('<path d="M%d %dL%d %dL%d %dL%d %dL%d %dL%d %dZ" fill="#05070b"/>' % (stx - 14, hz + 2, stx - 8, hz - 12, stx - 3, hz - 26, stx + 2, hz - 27, stx + 6, hz - 10, stx + 13, hz + 2))
    o.append('<path d="M%d %dL%d %dL%d %dZ" fill="#05070b"/>' % (stx + 16, hz + 2, stx + 22, hz - 9, stx + 28, hz + 2))
    o.append('<circle cx="%d" cy="%d" r="5" fill="#ffc870" opacity=".5" filter="url(#%sb2)"/><circle cx="%d" cy="%d" r="1" fill="#fff4d8"/>' % (stx, hz - 28, u, stx, hz - 28))
    o.append('<path d="M%d %dh%d" stroke="#e8eef8" stroke-opacity=".5" stroke-width="1.2" filter="url(#%sb1)"/>' % (stx - 20, hz + 2, 52, u))
    # mist thrown ahead of it along the whole foot of the wave
    o.append('<ellipse cx="%d" cy="%d" rx="360" ry="22" fill="url(#%smist)" opacity=".6"/>' % (220, hz - 2, u))
    o.append(''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#dfe0ea" opacity="%s" filter="url(#%sb10)"/>' % (
        f(rnd.uniform(-20, 500)), f(hz + rnd.uniform(-8, 26)), f(rnd.uniform(40, 120)), f(rnd.uniform(4, 10)), f(rnd.uniform(.05, .14)), u) for _ in range(12)))
    # the trough ahead of it: the sea drawn down, pale
    o.append('<rect x="-10" y="%d" width="%d" height="8" fill="#9aa4c0" opacity=".16" filter="url(#%sb2)"/>' % (hz + 2, W + 20, u))
    # the shallows, ripples catching the disk, dark sand showing through
    rip = []
    for i in range(70):
        y = hz + 16 + (H - hz - 16) * (i / 70) ** 1.4
        k = (y - hz) / (H - hz)
        x = rnd.uniform(-40, W)
        L = rnd.uniform(30, 140) * (.4 + k * 1.6)
        near = max(0, 1 - abs(x + L / 2 - cx + 80) / 230)
        rip.append('<path d="M%s %sq%s %s %s 0" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (
            f(x), f(y), f(L / 2), f(-1 - 2 * k), f(L), '#fff0d8' if near > .2 else '#8a90b0', f((.08 + .4 * near) * rnd.uniform(.5, 1)), f(.5 + 1.4 * k)))
    o.append(''.join(rip))
    sandbars = ''.join('<path d="%s" fill="#07090e" opacity="%s"/>' % (blob(rnd.uniform(0, W), rnd.uniform(660, 800), rnd.uniform(40, 130), rnd.uniform(3, 9), rnd, 12, .35), f(rnd.uniform(.35, .6))) for _ in range(8))
    o.append('<g filter="url(#%sb2)">%s</g>' % (u, sandbars))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .14), defs)
    return bg, obj, svg(W, H, frontier_top('A SEA UNDER A HOLE IN THE SKY · CLOCKS RUN SLOW'))




def sphere(lat, lon, tilt):
    """A point on the unit sphere, the pole tipped toward us by tilt (radians): x right, y down, z toward the eye."""
    x = math.cos(lat) * math.sin(lon); y = -math.sin(lat); z = math.cos(lat) * math.cos(lon)
    return x, y * math.cos(tilt) - z * math.sin(tilt), y * math.sin(tilt) + z * math.cos(tilt)


def land_filter(u, name, freq, seed, rgb, k, t):
    """Fractal noise cut to hard coasts: alpha = k·(noise − t)."""
    return ('<filter id="%s%s" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="%s" numOctaves="5" seed="%d"/>'
            '<feColorMatrix type="matrix" values="0 0 0 0 %s  0 0 0 0 %s  0 0 0 0 %s  %s 0 0 0 %s"/></filter>') % (u, name, freq, seed, f(rgb[0]), f(rgb[1]), f(rgb[2]), f(k), f(-k * t))


def globe(u, k, cx, cy, R, tilt, rot, light, seed, pal, conts, city=0, extra=''):
    """A living world: fractal continents on the sphere, biomes, shelves, cloud systems casting shadows,
    an ocean glint, a true terminator and (optionally) coastal cities on the night side. Returns (defs, body)."""
    rnd = random.Random(seed)
    lx, ly, lz = light
    ln = math.sqrt(lx * lx + ly * ly + lz * lz); lx, ly, lz = lx / ln, ly / ln, lz / ln
    t = math.radians(rot)
    ct, st_ = math.cos(t), math.sin(t)
    K = u + k

    def P(x, y):
        return cx + R * (x * ct - y * st_), cy + R * (x * st_ + y * ct)

    def pt(lat, lon):
        x, y, z = sphere(lat, lon, tilt)
        if z < 0:
            n = math.hypot(x, y) or 1
            x, y = x / n, y / n
        return P(x, y), z

    def dark(lat, lon):
        x, y, z = sphere(lat, lon, tilt)
        return x * lx + y * ly + z * lz, z

    def path(pts):
        return 'M' + 'L'.join('%s %s' % (round(x), round(y)) for x, y in pts) + 'Z'

    def shape(lat0, lon0, rb, n=70, rough=.36, top=22):
        amps = [(h, rnd.uniform(-1, 1) * rough / h ** .85, rnd.uniform(0, 6.3)) for h in range(2, top)]
        pts, verts, vis = [], [], False
        for i in range(n):
            a = 2 * math.pi * i / n
            r = max(rb * .12, rb * (1 + sum(A * math.sin(h * a + ph) for h, A, ph in amps)))
            la = max(-1.55, min(1.55, lat0 + r * math.sin(a)))
            lo = lon0 + r * math.cos(a) / max(.25, math.cos(lat0))
            (X, Y), z = pt(la, lo)
            pts.append((X, Y)); verts.append((la, lo, z))
            vis = vis or z > 0
        return (path(pts), verts) if vis else (None, None)

    lands, coast, biome = [], [], {b: [] for b in ('forest', 'desert', 'grass', 'snow')}
    ridges = []
    for lat0, lon0, size, nb in conts:
        for j in range(nb):
            la, lo = lat0 + rnd.gauss(0, size * .55), lon0 + rnd.gauss(0, size * .7)
            d, verts = shape(la, lo, size * rnd.uniform(.35, .8))
            if not d: continue
            lands.append(d); coast += verts
            for _ in range(2):
                bl, bo = la + rnd.gauss(0, size * .25), lo + rnd.gauss(0, size * .3)
                kind = 'desert' if abs(bl) < .45 and rnd.random() < pal.get('dry', .4) else ('snow' if abs(bl) > 1.05 else rnd.choice(['forest', 'forest', 'grass']))
                bd, _ = shape(bl, bo, size * rnd.uniform(.12, .32), 48, .45, 12)
                if bd: biome[kind].append(bd)
            if rnd.random() < .7:   # a mountain chain along the continent
                a = rnd.uniform(0, math.pi); L = size * rnd.uniform(.4, .9)
                rp = []
                for s in range(14):
                    q = (s / 13 - .5) * L
                    (X, Y), z = pt(la + q * math.sin(a) + rnd.gauss(0, .006), lo + q * math.cos(a) / max(.3, math.cos(la)))
                    if z > .05: rp.append((X, Y))
                if len(rp) > 3: ridges.append('M' + 'L'.join('%s %s' % (f(x), f(y)) for x, y in rp))
    # archipelagos: island chains curving across the ocean
    for _ in range(pal.get('isles', 4)):
        la, lo = rnd.uniform(-.9, .9), rnd.uniform(-2.2, 2.2)
        a = rnd.uniform(0, 6.3)
        for s in range(rnd.randint(5, 11)):
            la += .035 * math.sin(a); lo += .05 * math.cos(a); a += rnd.uniform(-.3, .3)
            d, verts = shape(la, lo, rnd.uniform(.01, .03), 14, .5, 6)
            if d: lands.append(d); coast += verts
    for sgn in (1, -1):   # polar ice
        d, _ = shape(sgn * 1.5, 0, .28, 90, .25, 14)
        if d: biome['snow'].append(d)
    land = ''.join(lands)
    sx_, sy_ = lx * ct - ly * st_, lx * st_ + ly * ct
    sl = math.hypot(sx_, sy_) or 1; sx_, sy_ = sx_ / sl, sy_ / sl
    phi = math.degrees(math.atan2(sy_, sx_))

    # ---------------- clouds, in the sphere's own frame
    cl_soft, cl_crisp = [], []

    def poly(pts_ll, width, op, soft=True, col='#ffffff'):
        seg = []
        for la, lo in pts_ll:
            (X, Y), z = pt(la, lo)
            if z > .02: seg.append((X, Y, z))
            elif len(seg) > 1: break
        if len(seg) < 2: return
        zz = sum(p[2] for p in seg) / len(seg)
        d = 'M' + 'L'.join('%d %d' % (round(x), round(y)) for x, y, _ in seg)
        s = '<path d="%s" stroke-opacity="%s" stroke-width="%s"/>' % (d, f(op), f(width * (.35 + .65 * zz ** .5)))
        (cl_soft if soft else cl_crisp).append(s)
    for c in range(pal.get('cyclones', 4)):
        la0 = rnd.choice([-1, 1]) * rnd.uniform(.5, .95) if c else rnd.uniform(.2, .35) * rnd.choice([-1, 1])
        lo0 = rnd.uniform(-1.3, 1.3)
        sp = 1 if la0 > 0 else -1
        size = rnd.uniform(.9, 1.4)
        for arm in range(2):
            pts_ll = []
            for s in range(40):
                th = s / 39 * 2.3 * math.pi
                r = (.01 + .016 * th ** 1.15) * size
                an = sp * th + arm * math.pi + rnd.gauss(0, .04)
                pts_ll.append((la0 + r * math.sin(an), lo0 + r * math.cos(an) / math.cos(la0)))
            poly(pts_ll, 18 * size, .5)
            poly(pts_ll, 6 * size, .7, False)
        (X0, Y0), z0 = pt(la0, lo0)
        if z0 > .1:
            cl_soft.append('<circle cx="%s" cy="%s" r="%s" fill="#fff" opacity=".6"/>' % (f(X0), f(Y0), f(R * .03 * size * z0 ** .5)))
        # the trailing front, sweeping toward the equator
        pts_ll = [(la0 - sp * s * .03 - rnd.gauss(0, .004), lo0 - s * .05 - (s * s) * .0025) for s in range(24)]
        poly(pts_ll, 16 * size, .45)
        poly(pts_ll, 5 * size, .6, False)
    for _ in range(int(230 * pal.get('streaks', 1))):   # streaks in the storm tracks and along the doldrums
        la = rnd.choice([rnd.gauss(.8, .15), rnd.gauss(-.8, .15), rnd.gauss(.08, .06)])
        lo = rnd.uniform(-2, 2); L = rnd.uniform(.08, .5)
        pts_ll = [(la + rnd.gauss(0, .004) + .02 * math.sin(s), lo + L * s / 7) for s in range(8)]
        poly(pts_ll, rnd.uniform(5, 14), rnd.uniform(.25, .5))
        if rnd.random() < .5: poly(pts_ll, rnd.uniform(.8, 2.2), rnd.uniform(.3, .6), False)
    puffs = []
    for _ in range(int(260 * pal.get('puffs', 1))):   # fair-weather cumulus
        la, lo = rnd.uniform(-.75, .75), rnd.uniform(-1.6, 1.6)
        x, y, z = sphere(la, lo, tilt)
        if z < .1: continue
        X, Y = P(x, y)
        puffs.append('M%s %sh.01' % (f(X), f(Y)))
    cloud = ('<g filter="url(#%scwisp)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><g filter="url(#%scb)">%s<path d="%s" stroke="#ffffff" stroke-opacity=".7" stroke-width="%s" stroke-linecap="round"/></g>%s</g>' % (
        K, K, ''.join(cl_soft), ''.join(puffs), f(R * .03), ''.join(cl_crisp)))
    ghx, ghy, ghz = lx, ly, lz + 1
    gn = math.sqrt(ghx * ghx + ghy * ghy + ghz * ghz)
    GX, GY = P(ghx / gn, ghy / gn)
    tz = max(.02, abs(lz))
    night = 'M0 -1A1 1 0 0 0 0 1A%s 1 0 0 %d 0 -1Z' % (g4(tz), 1 if lz > 0 else 0)
    defs = (('<clipPath id="%sdisk"><circle cx="%s" cy="%s" r="%s"/></clipPath><path id="%slp" d="%s"/><clipPath id="%sland"><use href="#%slp"/></clipPath>'
             '<filter id="%scb" x="-10%%" y="-10%%" width="120%%" height="120%%"><feGaussianBlur stdDeviation="%s"/></filter>'
             '<filter id="%scsh" x="-10%%" y="-10%%" width="120%%" height="120%%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .01  0 0 0 0 .03  0 0 0 0 .08  0 0 0 .55 0"/><feGaussianBlur stdDeviation="%s"/></filter>'
             '<filter id="%stex" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="%s" numOctaves="4" seed="%d"/><feColorMatrix type="saturate" values="0"/></filter>'
             '<filter id="%snt1" x="-20%%" y="-20%%" width="140%%" height="140%%"><feGaussianBlur stdDeviation=".07"/></filter>'
             '<filter id="%snt2" x="-20%%" y="-20%%" width="140%%" height="140%%"><feGaussianBlur stdDeviation=".018"/></filter>'
             '<filter id="%sb2" x="-20%%" y="-20%%" width="140%%" height="140%%"><feGaussianBlur stdDeviation="%s"/></filter>'
             '<filter id="%sb6" x="-20%%" y="-20%%" width="140%%" height="140%%"><feGaussianBlur stdDeviation="%s"/></filter>'
             '<filter id="%scwisp" x="-5%%" y="-5%%" width="110%%" height="110%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="%s" numOctaves="4" seed="%d" result="n"/>'
             '<feDisplacementMap in="SourceGraphic" in2="n" scale="%s" xChannelSelector="R" yChannelSelector="G" result="d"/>'
             '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -.95" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>'
             '<g id="%scloud">%s</g>') % (
        K, f(cx), f(cy), f(R), K, land, K, K, K, f(R * .012), K, f(R * .01), K, g4(8 / R), seed % 97, K, K, K, f(R * .008), K, f(R * .025), K, g4(6 / R), seed % 89 + 3, f(R * .09), K, cloud) +
        rad(K, 'sea', pal['sea'], .5 + .28 * sx_, .5 + .28 * sy_, .75) +
        rad(K, 'glint', [(0, '#fffaf0', .55), (.25, '#dff0ff', .22), (1, '#dff0ff', 0)]) +
        rad(K, 'limb', [(.72, '#000', 0), (.94, '#000', .3), (1, '#000', .6)]) +
        rad(K, 'haze', [(.78, pal['haze'], 0), (.96, pal['haze'], .32), (1, pal['haze'], .6)]) +
        rad(K, 'sheen', [(0, '#fff', .16), (1, '#fff', 0)]))
    L_ = pal['land']
    b = ['<circle cx="%s" cy="%s" r="%s" fill="url(#%ssea)"/>' % (f(cx), f(cy), f(R), K),
         '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%sglint)"/>' % (f(GX), f(GY), f(R * .32), f(R * .26), K),
         '<use href="#%slp" fill="none" stroke="%s" stroke-width="%s" stroke-opacity=".5" filter="url(#%sb6)"/>' % (K, pal['shelf'], f(R * .05), K),
         '<use href="#%slp" fill="none" stroke="%s" stroke-width="%s" stroke-opacity=".45" filter="url(#%sb2)"/>' % (K, pal['shelf'], f(R * .014), K),
         '<use href="#%slp" fill="%s"/>' % (K, L_)]
    inner = ['<path d="%s" fill="%s" opacity=".8" filter="url(#%sb2)"/>' % (''.join(v), pal[kk], K) for kk, v in biome.items() if v and kk != 'snow']
    inner.append('<rect x="%s" y="%s" width="%s" height="%s" filter="url(#%stex)" opacity=".4" style="mix-blend-mode: multiply"/>' % (f(cx - R), f(cy - R), f(2 * R), f(2 * R), K))
    if ridges:
        rd = ''.join(ridges)
        inner.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-opacity=".45" stroke-linecap="round" filter="url(#%sb6)"/>' % (rd, pal['mount'], f(R * .035), K))
        inner.append('<path d="%s" fill="none" stroke="#f4ecd8" stroke-width="%s" stroke-opacity=".3" stroke-linecap="round" filter="url(#%sb2)" transform="translate(%s %s)"/>' % (rd, f(R * .01), K, f(sx_ * 2), f(sy_ * 2)))
    b.append('<g clip-path="url(#%sland)">%s</g>' % (K, ''.join(inner)))
    b.append('<use href="#%slp" fill="none" stroke="#f4f0e0" stroke-opacity=".18" stroke-width=".5"/>' % K)
    if biome['snow']:
        b.append('<path d="%s" fill="#f4f8fc" opacity=".92" filter="url(#%sb2)"/>' % (''.join(biome['snow']), K))
    b.append('<use href="#%scloud" filter="url(#%scsh)" transform="translate(%s %s)"/>' % (K, K, f(-sx_ * R * .018), f(-sy_ * R * .018)))
    b.append('<use href="#%scloud"/>' % K)
    b.append(extra)
    b.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%shaze)"/>' % (f(cx), f(cy), f(R), K))
    b.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%ssheen)"/>' % (f(cx + sx_ * R * .4), f(cy + sy_ * R * .4), f(R * .7), f(R * .7), K))
    b.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%slimb)"/>' % (f(cx), f(cy), f(R), K))
    tf = 'translate(%s %s) rotate(%s) scale(%s)' % (f(cx), f(cy), f(phi), f(R))
    b.append('<g transform="%s"><path d="%s" fill="%s" opacity=".6" filter="url(#%snt1)"/><path d="%s" fill="%s" opacity=".86" filter="url(#%snt2)"/>'
             '<path d="%s" fill="none" stroke="#ff9a5a" stroke-opacity=".22" stroke-width=".05" filter="url(#%snt1)"/></g>' % (
                 tf, night, pal['night'], K, night, pal['night'], K, 'M0 -1A%s 1 0 0 %d 0 1' % (g4(tz), 0 if lz > 0 else 1), K))
    if city:
        dots_, glows = [], []
        for la, lo, z in coast[::2]:
            dd, zz = dark(la, lo)
            if zz < .08 or dd > -.05 or rnd.random() > city: continue
            (X, Y), _ = pt(la, lo)
            for _ in range(rnd.randint(1, 4)):
                dots_.append('M%s %sh.01' % (f(X + rnd.gauss(0, 2.2 * zz)), f(Y + rnd.gauss(0, 1.6 * zz))))
            if rnd.random() < .08: glows.append('<circle cx="%s" cy="%s" r="%s" fill="#ffb850"/>' % (f(X), f(Y), f(1.5 + 2 * zz)))
        b.append('<g filter="url(#%sb2)" opacity=".4">%s</g>' % (K, ''.join(glows)))
        b.append('<path d="%s" stroke="#ffd890" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>' % ''.join(dots_))
    body = '<g clip-path="url(#%sdisk)">%s</g>' % (K, ''.join(b))
    body += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-opacity=".5" filter="url(#%sb6)"/>' % (arc(cx, cy, R * 1.01, math.radians(phi - 95), math.radians(phi + 95)), pal['rim'], f(R * .035), K)
    body += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-opacity=".85" filter="url(#%sb2)"/>' % (arc(cx, cy, R * 1.003, math.radians(phi - 80), math.radians(phi + 80)), pal['rim'], f(R * .009), K)
    return defs, body


EARTH = {'sea': [(0, '#2f7fc4', None), (.45, '#15508e', None), (.85, '#0a2c5c', None), (1, '#061a3a', None)],
         'shelf': '#5ac0d8', 'land': '#5a7a44', 'forest': '#2c5a2e', 'grass': '#8a9a5a', 'desert': '#c8a870', 'mount': '#3a3226',
         'haze': '#8ec8ff', 'rim': '#a8dcff', 'night': '#01040c', 'dry': .5}


# ================================================================= ORBITAL RING
def orbital_ring(u):
    rnd = random.Random(4404)
    cx, cy, R = 291, 500, 250
    tilt, rot = math.radians(-12), -9         # we look down on the equator a little; the whole system leans
    RR = 1.34                                 # the ring's radius, in planet radii
    lx, ly, lz = -.62, -.5, .6                # the sun: left, above, in front
    ln = math.sqrt(lx * lx + ly * ly + lz * lz); lx, ly, lz = lx / ln, ly / ln, lz / ln
    bg = sky(u, H, ('#0c1430', '#050a1c', '#010309'), 280, 4404, 5, cy='.4',
             extra='<circle cx="-40" cy="60" r="260" fill="url(#%ssun)"/>' % u + '<circle cx="500" cy="150" r="13" fill="url(#%smoon)"/><path d="M500 137A13 13 0 0 1 500 163A7 13 0 0 0 500 137Z" fill="#02040a" opacity=".85" transform="rotate(40 500 150)"/>' % u,
             extra_defs=rad(u, 'sun', [(0, '#fff6e0', .5), (.2, '#ffe0b0', .16), (1, '#ffe0b0', 0)]) + rad(u, 'moon', [(0, '#e8e4dc', None), (.7, '#9a968e', None), (1, '#4a4844', None)], .3, .3, .8))
    defs = blur(u, 'b1', .8) + blur(u, 'b2', 2) + blur(u, 'b5', 5) + lin(
        u, 'face', [(0, '#f4f8ff', None), (.3, '#b8c2d2', None), (1, '#5a6478', None)])
    o = []

    def P(x, y, z=0):
        t = math.radians(rot)
        X, Y = x * R, y * R
        return cx + X * math.cos(t) - Y * math.sin(t), cy + X * math.sin(t) + Y * math.cos(t)

    def ring_pt(lon, r=RR):
        x, y, z = sphere(0, lon, tilt)
        return P(x * r, y * r), z

    def ring_path(l0, l1, r=RR, n=90):
        pts = [ring_pt(l0 + (l1 - l0) * i / n, r)[0] for i in range(n + 1)]
        return 'M' + 'L'.join('%s %s' % (f(x), f(y)) for x, y in pts)

    def lit(lon):   # is this point of the ring in sunlight (outside the planet's shadow)?
        x, y, z = sphere(0, lon, tilt)
        x, y, z = x * RR, y * RR, z * RR
        d = x * lx + y * ly + z * lz
        if d > 0: return True
        px, py, pz = x - d * lx, y - d * ly, z - d * lz
        return px * px + py * py + pz * pz > 1
    def band(l0, l1, n, hgt, lit_col, dark_col, op=1):
        out = []
        for i in range(n):
            a0 = l0 + (l1 - l0) * i / n; a1 = a0 + (l1 - l0) / n * 1.04
            (x0, y0), _ = ring_pt(a0); (x1, y1), _ = ring_pt(a1)
            on = lit((a0 + a1) / 2)
            out.append('<path d="M%s %sL%s %sL%s %sL%s %sZ" fill="%s" opacity="%s"/>' % (
                f(x0), f(y0), f(x1), f(y1), f(x1), f(y1 + hgt), f(x0), f(y0 + hgt), lit_col if on else dark_col, f(op)))
        return ''.join(out)
    # the far half of the ring, behind the globe: we see its inner wall
    o.append(band(math.pi / 2, math.pi * 1.5, 90, 4, '#9aa6b8', '#1a1e28', .9))
    o.append('<path d="%s" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".8"/>' % ring_path(math.pi / 2, math.pi * 1.5))
    rsh = ''
    # the ring's shadow, thrown across the clouds
    sh = []
    for i in range(120):
        lon = math.pi * .5 + math.pi * i / 119 - .15
        x, y, z = sphere(0, lon, tilt)
        x, y, z = x * RR, y * RR, z * RR
        # march along the sunlight until the ray meets the globe
        b = x * lx + y * ly + z * lz; c = x * x + y * y + z * z - 1
        disc = b * b - c
        if disc < 0: continue
        t = -b - math.sqrt(disc)
        if t < 0: continue
        sx_, sy_, sz_ = x + t * lx, y + t * ly, z + t * lz
        if sz_ < 0: continue
        sh.append(P(sx_, sy_))
    if len(sh) > 2:
        rsh = '<path d="M%s" fill="none" stroke="#01040c" stroke-opacity=".55" stroke-width="6" filter="url(#%sb2)"/>' % ('L'.join('%s %s' % (f(x), f(y)) for x, y in sh), u)
    conts = [(.6, -.8, .36, 5), (-.35, -.5, .3, 4), (.25, .75, .42, 6), (-.7, 1.1, .24, 3), (1.0, .2, .22, 3)]
    gd, gb = globe(u, 'e', cx, cy, R, tilt, rot, (lx, ly, lz), 4404, dict(EARTH, cyclones=5), conts, city=.55, extra=rsh)
    defs += gd
    o.append(gb)
    # tethers: from anchor stations on the near ring straight down to the equator
    teth = []
    for lon in (-1.25, -.72, -.25, .25, .72, 1.25):
        (x0, y0), z0 = ring_pt(lon)
        (x1, y1), z1 = ring_pt(lon, 1.0)
        on = lit(lon)
        teth.append('<path d="M%s %sL%s %s" stroke="%s" stroke-opacity="%s" stroke-width="1"/>' % (f(x0), f(y0), f(x1), f(y1), '#e8f0ff' if on else '#ffc870', '.8' if on else '.55'))
        teth.append('<path d="M%s %sL%s %s" stroke="#e8f0ff" stroke-opacity=".25" stroke-width="4" filter="url(#%sb2)"/>' % (f(x0), f(y0), f(x1), f(y1), u))
        teth.append('<circle cx="%s" cy="%s" r="2.6" fill="%s"/>' % (f(x1), f(y1), '#fff4dc'))
        teth.append('<rect x="%s" y="%s" width="7" height="4" fill="#dfe6f0" transform="rotate(%d %s %s)"/>' % (f(x0 - 3.5), f(y0 - 2), rot, f(x0), f(y0)))
        for k in range(1, 4):   # climbers on the tether
            t = rnd.uniform(.15, .9)
            teth.append('<circle cx="%s" cy="%s" r=".9" fill="#fff"/>' % (f(x0 + (x1 - x0) * t), f(y0 + (y1 - y0) * t)))
    # the near half of the ring: bright in sunlight, a string of lamps where it passes through the night
    o.append(''.join(teth))
    o.append('<path d="%s" fill="none" stroke="#dfe8ff" stroke-width="12" stroke-opacity=".18" filter="url(#%sb5)"/>' % (ring_path(-math.pi / 2, -.15), u))
    o.append(band(-math.pi / 2, math.pi / 2, 150, 9, 'url(#%sface)' % u, '#0c1018'))
    o.append('<path d="%s" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity=".95"/>' % ring_path(-math.pi / 2, -.2))
    o.append('<path d="%s" fill="none" stroke="#8a96aa" stroke-width=".8" stroke-opacity=".8"/>' % ring_path(-.2, math.pi / 2))
    lamps = []
    for i in range(80):
        lon = -math.pi / 2 + math.pi * i / 79
        if lit(lon): continue
        (x, y), z = ring_pt(lon)
        lamps.append('<circle cx="%s" cy="%s" r="%s" fill="#ffd890"/>' % (f(x), f(y + 3.5), f(rnd.uniform(.6, 1.2))))
    o.append('<g filter="url(#%sb2)">%s</g>%s' % (u, ''.join(lamps), ''.join(lamps)))
    o.append('<path d="%s" fill="none" stroke="#ffffff" stroke-width="8" stroke-opacity=".25" filter="url(#%sb5)"/>' % (ring_path(-math.pi / 2, -.3), u))
    # a glint where the ring catches the sun
    gx, gy = ring_pt(-1.35)[0]
    o.append(spike_star(gx, gy, 2, '#ffffff', 26, 1, .8))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .1), defs)
    return bg, obj, svg(W, H, frontier_top('A RING AROUND THE WORLD · SIX ROADS TO IT'))


# ================================================================= DYSON SWARM
def quad(X, Y, ang, s, k=.35):
    c, sn = math.cos(ang), math.sin(ang)
    ux, uy, vx, vy = s * c, s * sn, -s * k * sn, s * k * c
    return 'M%s %sl%s %sl%s %sl%s %sz' % (f(X - ux - vx), f(Y - uy - vy), f(2 * ux), f(2 * uy), f(2 * vx), f(2 * vy), f(-2 * ux), f(-2 * uy))


def dyson_swarm(u):
    rnd = random.Random(4405)
    cx, cy, R = 291, 330, 86
    bg = sky(u, H, ('#1c1310', '#0a0708', '#020203'), 280, 4405, 4, tints=('#ffffff', '#fff1dc', '#ffe2c0', '#dfe8ff'), cy='.4')
    defs = blur(u, 'b1', .8) + blur(u, 'b3', 3) + blur(u, 'b8', 8) + blur(u, 'b30', 34, 80) + noise(u, 'gran', '.16', 3, 9) + rad(
        u, 'cor', [(0, '#fff8e8', .9), (.12, '#ffe6b0', .55), (.3, '#ffb060', .18), (.6, '#c0501a', .05), (1, '#000', 0)]) + rad(
        u, 'star', [(0, '#ffffff', None), (.5, '#fff8e4', None), (.82, '#ffdc98', None), (.95, '#ffb050', None), (1, '#f08a30', None)]) + (
        '<clipPath id="%ssd"><circle cx="%d" cy="%d" r="%d"/></clipPath>' % (u, cx, cy, R))
    o = ['<circle cx="%d" cy="%d" r="360" fill="url(#%scor)"/>' % (cx, cy, u)]
    far = {c: [] for c in ('#ffd890', '#ffe8b8', '#ffc060', '#fff4dc', '#8a5a2a', '#a8743a', '#5a3a1c')}
    sparks, near_dark, near_black, dims, orbits = [], [], [], [], []
    # three families of orbits: a broad inclined disk of collectors, a steep band half built, a tight inner ring
    bands = [((130, 350), .26, -12, 2000, (0, 2 * math.pi)), ((196, 220), .56, 58, 440, (-.3 * math.pi, 1.15 * math.pi)), ((112, 126), .4, -44, 240, (0, 2 * math.pi))]
    for (a0, a1), q, tilt, n, (t0, t1) in bands:
        t = math.radians(tilt)
        am = (a0 + a1) / 2
        span = (a1 - a0) if (t1 - t0) > 6 else (a1 - a0)
        orbits.append('<path d="%s" fill="none" stroke="#ffc878" stroke-opacity=".16" stroke-width="%s" transform="rotate(%d %d %d)"/>' % (
            arc(cx, cy, 0, max(t0, math.pi), min(t1, 2 * math.pi), am, am * q), f(max(8, span * q * 1.1)), tilt, cx, cy))
        orbits.append('<path d="%s" fill="none" stroke="#0a0604" stroke-opacity=".3" stroke-width="%s" transform="rotate(%d %d %d)"/>' % (
            arc(cx, cy, 0, max(t0, 0), min(t1, math.pi), am, am * q), f(max(8, span * q * 1.1)), tilt, cx, cy))
        dims.append('<path d="%s" fill="none" stroke="#1a0c04" stroke-opacity=".32" stroke-width="%s" transform="rotate(%d %d %d)"/>' % (arc(cx, cy, 0, .05, math.pi - .05, am, am * q), f(max(4, (a1 - a0) * q * .9)), tilt, cx, cy))
        for i in range(n):
            th = rnd.uniform(t0, t1)
            rr_ = a0 + (a1 - a0) * rnd.random() ** .8
            x, y = rr_ * math.cos(th), rr_ * q * math.sin(th) + rnd.gauss(0, 1.6)
            X, Y = cx + x * math.cos(t) - y * math.sin(t), cy + x * math.sin(t) + y * math.cos(t)
            depth = math.sin(th)
            s = (1.8 + 1.8 * depth) * rnd.uniform(.6, 1.3) * (rr_ / 220) ** .5
            tx, ty = -rr_ * math.sin(th), rr_ * q * math.cos(th)
            ang = math.atan2(ty, tx) + t
            inside = (X - cx) ** 2 + (Y - cy) ** 2 < (R + 1) ** 2
            if depth < 0:
                if inside: continue
                glint = rnd.random() ** 3
                c = rnd.choice(['#ffd890', '#ffe8b8', '#ffc060', '#fff4dc']) if glint > .12 else rnd.choice(['#8a5a2a', '#a8743a', '#5a3a1c'])
                far[c].append(quad(X, Y, ang, s))
                if glint > .93 and len(sparks) < 7:
                    sparks.append(spike_star(X, Y, .8, '#fff4dc', 4 + 8 * glint, .8, .45))
            else:
                (near_black if inside else near_dark).append(quad(X, Y, ang, s))
    o.append('<g filter="url(#%sb8)">%s</g>' % (u, ''.join(orbits[::2])))
    o.append(''.join('<path d="%s" fill="%s" opacity="%s"/>' % (''.join(v), c, '.95' if c.startswith('#ff') else '.7') for c, v in far.items() if v))
    o.append(''.join(sparks))
    # the star, the collectors' dimming shadow across it
    o.append('<circle cx="%d" cy="%d" r="%d" fill="#ffe6b0" opacity=".65" filter="url(#%sb8)"/>' % (cx, cy, R + 10, u))
    o.append('<circle cx="%d" cy="%d" r="%d" fill="url(#%sstar)"/>' % (cx, cy, R, u))
    o.append('<rect x="%d" y="%d" width="%d" height="%d" filter="url(#%sgran)" opacity=".16" style="mix-blend-mode: multiply" clip-path="url(#%ssd)"/>' % (cx - R, cy - R, 2 * R, 2 * R, u, u))
    o.append('<g clip-path="url(#%ssd)" filter="url(#%sb3)">%s</g>' % (u, u, ''.join(dims)))
    o.append('<g filter="url(#%sb8)">%s</g>' % (u, ''.join(orbits[1::2])))
    o.append('<path d="%s" fill="#24160c" stroke="#ffd8a0" stroke-opacity=".22" stroke-width=".35"/>' % ''.join(near_dark))
    o.append('<path d="%s" fill="#060302"/>' % ''.join(near_black))
    # the nearest collectors, big and dark, drifting through the glare
    for X, Y, s, ang in ((128, 540, 28, -22), (478, 170, 15, 26), (420, 576, 11, -10)):
        a = math.radians(ang)
        o.append('<path d="%s" fill="#0c0806" stroke="#ffd8a0" stroke-opacity=".45" stroke-width=".7"/>' % quad(X, Y, a, s, .3))
        o.append('<path d="%s" stroke="#3a2a1a" stroke-width=".5"/>' % ''.join('M%s %sl%s %s' % (
            f(X + (k / 3 - 1) * s * math.cos(a) + .3 * s * math.sin(a)), f(Y + (k / 3 - 1) * s * math.sin(a) - .3 * s * math.cos(a)), f(-.6 * s * math.sin(a)), f(.6 * s * math.cos(a))) for k in range(1, 6)))
    o.append('<circle cx="%d" cy="%d" r="%d" fill="#fff" opacity=".3" filter="url(#%sb30)"/>' % (cx, cy, R, u))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .1), defs)
    return bg, obj, svg(W, H, frontier_top('A STAR BEHIND A BILLION MIRRORS · HALF ITS LIGHT KEPT'))


# ================================================================= ECUMENOPOLIS
def ecumenopolis(u):
    rnd = random.Random(4406)
    cx, cy, R = 300, 362, 264
    tilt, rot = math.radians(9), 18
    lx, ly, lz = -.9, -.1, .36
    ln = math.sqrt(lx * lx + ly * ly + lz * lz); lx, ly, lz = lx / ln, ly / ln, lz / ln
    t = math.radians(rot)
    sx_, sy_ = lx * math.cos(t) - ly * math.sin(t), lx * math.sin(t) + ly * math.cos(t)     # the sun's direction on screen
    sl = math.hypot(sx_, sy_); sx_, sy_ = sx_ / sl, sy_ / sl
    t0 = .5 + .5 * lz
    bg = sky(u, H, ('#0c1022', '#05070f', '#010206'), 300, 4406, 5, cy='.4')
    defs = blur(u, 'b1', .7) + blur(u, 'b2', 1.8) + blur(u, 'b6', 6) + blur(u, 'b16', 16, 40) + (
        '<clipPath id="%sdisk"><circle cx="%d" cy="%d" r="%d"/></clipPath>'
        '<filter id="%splates" x="0" y="0" width="100%%" height="100%%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="6"/><feColorMatrix type="saturate" values="0"/>'
        '<feComponentTransfer><feFuncR type="discrete" tableValues=".3 .5 .38 .6 .44 .7 .34 .55"/><feFuncG type="discrete" tableValues=".3 .5 .38 .6 .44 .7 .34 .55"/><feFuncB type="discrete" tableValues=".34 .55 .42 .66 .48 .74 .38 .6"/></feComponentTransfer></filter>') % (u, cx, cy, R, u) + noise(u, 'fine', '.3 .12', 2, 3) + rad(
        u, 'base', [(0, '#d4d8de', None), (.45, '#9aa0aa', None), (1, '#40444e', None)], .22, .4, .8) + rad(
        u, 'limb', [(.7, '#000', 0), (.93, '#000', .3), (1, '#000', .6)]) + lin(
        u, 'term', [(0, '#000', 0), (t0 - .1, '#000', 0), (t0 - .04, '#2a1206', .35), (t0 + .02, '#04050c', .9), (1, '#010206', .97)],
        .5 - .5 * (-sx_), .5 - .5 * (-sy_), .5 + .5 * (-sx_), .5 + .5 * (-sy_)) + lin(
        u, 'dusk', [(0, '#ff9a4a', 0), (t0 - .05, '#ff9a4a', 0), (t0 - .025, '#ffb070', .13), (t0 - .005, '#ff7a3a', 0), (1, '#ff7a3a', 0)],
        .5 - .5 * (-sx_), .5 - .5 * (-sy_), .5 + .5 * (-sx_), .5 + .5 * (-sy_)) + rad(
        u, 'atm', [(.92, '#9fe0ff', 0), (.957, '#bfe8ff', .45), (.975, '#6ab8ff', .14), (1, '#4a80ff', 0)])

    def P(x, y):
        X, Y = x * R, y * R
        return cx + X * math.cos(t) - Y * math.sin(t), cy + X * math.sin(t) + Y * math.cos(t)

    def light(x, y, z):
        return x * lx + y * ly + z * lz
    g = ['<circle cx="%d" cy="%d" r="%d" fill="url(#%sbase)"/>' % (cx, cy, R, u),
         '<rect x="%d" y="%d" width="%d" height="%d" filter="url(#%splates)" opacity=".5" style="mix-blend-mode: multiply"/>' % (cx - R, cy - R, 2 * R, 2 * R, u)]
    # districts: plates of metal of every tone, laid on the curve of the world, no two alike
    tones = {c: [] for c in ('#e4e8ee', '#c4c8d0', '#9aa0aa', '#7a808a', '#5a606a', '#c8bca4', '#a8b8c4')}
    step = math.radians(3.6)
    lat = -math.pi / 2 + step
    while lat < math.pi / 2 - step:
        lon = -math.pi
        while lon < math.pi:
            if rnd.random() < .7:
                w = step * rnd.choice([1, 1, 2, 3]) ; hh = step * rnd.choice([1, 1, 2])
                c = [sphere(lat, lon, tilt), sphere(lat, lon + w, tilt), sphere(lat + hh, lon + w, tilt), sphere(lat + hh, lon, tilt)]
                zc = sum(p[2] for p in c) / 4
                if zc > .08:
                    xm, ym = sum(p[0] for p in c) / 4, sum(p[1] for p in c) / 4
                    if light(xm, ym, zc) > -.12:
                        pts = [P(p[0], p[1]) for p in c]
                        mx, my = sum(p[0] for p in pts) / 4, sum(p[1] for p in pts) / 4
                        pts = [(x + (mx - x) * .14, y + (my - y) * .14) for x, y in pts]
                        tones[rnd.choice(list(tones))].append('M%sZ' % 'L'.join('%s %s' % (f(x), f(y)) for x, y in pts))
            lon += step * rnd.choice([1, 1, 2])
        lat += step
    g.append(''.join('<path d="%s" fill="%s" opacity=".26"/>' % (''.join(v), c) for c, v in tones.items() if v))
    g.append('<rect x="%d" y="%d" width="%d" height="%d" filter="url(#%sfine)" opacity=".35" style="mix-blend-mode: multiply"/>' % (cx - R, cy - R, 2 * R, 2 * R, u))
    # arcologies: round towers seen from above, each with its shadow
    for _ in range(16):
        la, lo = rnd.uniform(-1.1, 1.1), rnd.uniform(-1.5, .3)
        x, y, z = sphere(la, lo, tilt)
        if z < .25 or light(x, y, z) < .05: continue
        X, Y = P(x, y); r = rnd.uniform(4, 11) * z
        g.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#1a1c22" opacity=".45" transform="rotate(%d %s %s)"/>' % (f(X - sx_ * r * .8), f(Y - sy_ * r * .8), f(r), f(r * z), rot, f(X), f(Y)))
        g.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#e8ecf0" stroke="#6a707a" stroke-width=".6" transform="rotate(%d %s %s)"/>' % (f(X), f(Y), f(r * .8), f(r * .8 * z), rot, f(X), f(Y)))
    # canals of shadow: long trenches following great circles
    for _ in range(3):
        a1, a2 = rnd.uniform(-1.2, 1.2), rnd.uniform(-1.2, 1.2)
        pts = []
        for k in range(40):
            la = a1 + (a2 - a1) * k / 39; lo = -1.6 + 2.2 * k / 39 + rnd.uniform(-.005, .005)
            x, y, z = sphere(la, lo, tilt)
            if z > .05: pts.append(P(x, y))
        if len(pts) > 2:
            d = 'M' + 'L'.join('%s %s' % (f(x), f(y)) for x, y in pts)
            g.append('<path d="%s" fill="none" stroke="#2a2e36" stroke-opacity=".3" stroke-width="3"/><path d="%s" fill="none" stroke="#f4f6fa" stroke-opacity=".35" stroke-width=".6" transform="translate(%s %s)"/>' % (d, d, f(sx_ * 1.5), f(sy_ * 1.5)))
    hx, hy = cx + sx_ * R * .55, cy + sy_ * R * .55
    g.append('<ellipse cx="%s" cy="%s" rx="80" ry="64" fill="#fff8ea" opacity=".28" filter="url(#%sb16)"/>' % (f(hx), f(hy), u))
    g.append('<circle cx="%d" cy="%d" r="%d" fill="url(#%slimb)"/>' % (cx, cy, R, u))
    g.append('<circle cx="%d" cy="%d" r="%d" fill="url(#%sterm)"/>' % (cx, cy, R, u))
    g.append('<circle cx="%d" cy="%d" r="%d" fill="url(#%sdusk)"/>' % (cx, cy, R, u))
    # the night side: metropolises of light, knit together by highways
    def on_night(la, lo, margin=-.02):
        x, y, z = sphere(la, lo, tilt)
        return z > .03 and light(x, y, z) < margin, (x, y, z)
    metros = []
    while len(metros) < 40:
        la, lo = math.asin(rnd.uniform(-.96, .96)), rnd.uniform(-math.pi, math.pi)
        ok, p = on_night(la, lo)
        if ok: metros.append((la, lo))
    fine, roads, hubs, glow = [], [], [], []
    for la0, lo0 in metros:
        pts = []
        for _ in range(rnd.randint(14, 32)):
            la, lo = la0 + rnd.gauss(0, .06), lo0 + rnd.gauss(0, .08)
            ok, (x, y, z) = on_night(la, lo)
            if ok: pts.append(P(x, y) + (z,))
        for i, (X, Y, z) in enumerate(pts):
            near = sorted(pts, key=lambda p: (p[0] - X) ** 2 + (p[1] - Y) ** 2)[1:3]
            for X2, Y2, z2 in near:
                roads.append('M%s %sL%s %s' % (f(X), f(Y), f(X2), f(Y2)))
            fine.append('M%s %sh.9' % (f(X), f(Y)))
        ok, (x, y, z) = on_night(la0, lo0)
        X, Y = P(x, y)
        hubs.append('<circle cx="%s" cy="%s" r="%s" fill="#fff8e6"/>' % (f(X), f(Y), f(1 + 1.4 * z)))
        glow.append('<circle cx="%s" cy="%s" r="%s" fill="#ffc050"/>' % (f(X), f(Y), f(9 + 10 * z)))
    # highways between neighbouring metropolises, along the curve
    hw = []
    for i, (la0, lo0) in enumerate(metros):
        near = sorted(metros, key=lambda m: (m[0] - la0) ** 2 + ((m[1] - lo0) * math.cos(la0)) ** 2)[1:3]
        for la1, lo1 in near:
            seg = []
            for k in range(13):
                ok, (x, y, z) = on_night(la0 + (la1 - la0) * k / 12, lo0 + (lo1 - lo0) * k / 12, .05)
                if ok: seg.append(P(x, y))
            if len(seg) > 2:
                hw.append('M' + 'L'.join('%s %s' % (f(x), f(y)) for x, y in seg))
    for _ in range(2600):   # the city everywhere between
        la, lo = math.asin(rnd.uniform(-.97, .97)), rnd.uniform(-math.pi, math.pi)
        ok, (x, y, z) = on_night(la, lo, .02)
        if ok:
            X, Y = P(x, y)
            fine.append('M%s %sh.7' % (f(X), f(Y)))
    g.append('<g filter="url(#%sb6)" opacity=".28">%s</g>' % (u, ''.join(glow)))
    g.append('<path d="%s" fill="none" stroke="#ffb850" stroke-opacity=".45" stroke-width="2.6" filter="url(#%sb2)"/>' % (''.join(hw), u))
    g.append('<path d="%s" fill="none" stroke="#ffe6b0" stroke-opacity=".75" stroke-width=".6"/>' % ''.join(hw))
    g.append('<path d="%s" fill="none" stroke="#ffd070" stroke-opacity=".6" stroke-width=".6"/>' % ''.join(roads))
    g.append('<path d="%s" stroke="#ffe0a0" stroke-opacity=".55" stroke-width=".9" stroke-linecap="round"/>' % ''.join(fine))
    g.append(''.join(hubs))
    o = ['<g clip-path="url(#%sdisk)">%s</g>' % (u, ''.join(g))]
    o.append('<circle cx="%d" cy="%d" r="%s" fill="url(#%satm)"/>' % (cx, cy, f(R * 1.045), u))
    la_ = math.degrees(math.atan2(sy_, sx_))
    o.append('<path d="%s" fill="none" stroke="#dff4ff" stroke-width="2.4" stroke-opacity=".7" filter="url(#%sb2)"/>' % (arc(cx, cy, R + 1, math.radians(la_ - 75), math.radians(la_ + 75)), u))
    for _ in range(22):
        a = rnd.uniform(0, 2 * math.pi); r = R * rnd.uniform(1.03, 1.12)
        o.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width=".8" stroke-linecap="round"/>' % (arc(cx, cy, r, a, a + rnd.uniform(.015, .05)), rnd.choice(['#ffffff', '#ffe0a0', '#bfe4ff']), f(rnd.uniform(.3, .8))))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .1), defs)
    return bg, obj, svg(W, H, frontier_top('ONE CITY, PLANET-WIDE · NO GROUND LEFT UNBUILT'))




# ================================================================= FROZEN CLOUDS
def mix(a, b, t):
    """Blend two #rrggbb colours."""
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(int(round(x + (y - x) * t)) for x, y in zip(pa, pb))


def frozen_clouds(u):
    rnd = random.Random(4407)
    hz = 540
    sx, sy = 176, 206                 # a small cold sun, low, ringed by ice-crystal haloes
    HAZE = '#c9d6e4'
    bdefs = blur(u, 'b2', 2) + blur(u, 'b6', 6) + blur(u, 'b14', 14, 40) + blur(u, 'b40', 40, 120) + lin(
        u, 'sky', [(0, '#1e2c48', None), (.18, '#3a5176', None), (.4, '#7088ac', None), (.58, '#aabcd2', None), (.65, HAZE, None), (1, HAZE, None)]) + rad(
        u, 'sun', [(0, '#ffffff', 1), (.03, '#ffffff', .95), (.12, '#eef6ff', .45), (.4, '#dfeaff', .12), (1, '#dfeaff', 0)]) + rad(
        u, 'gi', [(0, '#c8d4e6', None), (.7, '#8e9cb8', None), (1, '#6a7898', None)], .25, .45, .8)
    halo = ('<circle cx="%d" cy="%d" r="104" fill="none" stroke="#ffd2c0" stroke-width="2" opacity=".32" filter="url(#%sb2)"/>'
            '<circle cx="%d" cy="%d" r="107" fill="none" stroke="#ffffff" stroke-width="4" opacity=".22" filter="url(#%sb2)"/>'
            '<circle cx="%d" cy="%d" r="112" fill="none" stroke="#b8d0ff" stroke-width="4" opacity=".16" filter="url(#%sb6)"/>'
            '<path d="%s" fill="none" stroke="#ffffff" stroke-width="3" opacity=".2" filter="url(#%sb2)"/>') % (
        sx, sy, u, sx, sy, u, sx, sy, u, arc(sx, sy - 47, 60, math.radians(210), math.radians(330)), u)
    dogs = ''.join('<ellipse cx="%d" cy="%d" rx="6" ry="12" fill="#ffffff" opacity=".55" filter="url(#%sb2)"/><ellipse cx="%d" cy="%d" rx="2.4" ry="8" fill="#ffc0a8" opacity=".45" filter="url(#%sb2)"/>'
                   '<path d="M%d %dh%d" stroke="#ffffff" stroke-width="1.4" stroke-opacity=".12" filter="url(#%sb2)"/>' % (
                       sx + d * 108, sy + 2, u, sx + d * 101, sy + 2, u, sx + d * 116, sy + 2, d * 140, u) for d in (-1, 1))
    cirrus = ''.join('<path d="M%s %sq%s %s %s %s" fill="none" stroke="#e8f0fa" stroke-opacity="%s" stroke-width="%s"/>' % (
        f(rnd.uniform(-40, 560)), f(rnd.uniform(60, 330)), f(rnd.uniform(40, 90)), f(rnd.uniform(-12, 6)), f(rnd.uniform(90, 220)), f(rnd.uniform(-20, 10)), f(rnd.uniform(.08, .2)), f(rnd.uniform(2, 8))) for _ in range(26))
    giant = ('<circle cx="486" cy="150" r="76" fill="url(#%sgi)" opacity=".3"/><path d="M486 74A76 76 0 0 1 486 226A44 76 0 0 0 486 74Z" fill="#46587c" opacity=".25"/>' % u +
             ''.join('<path d="%s" fill="none" stroke="#5a6a8a" stroke-opacity=".1" stroke-width="%s"/>' % (arc(486, 150 + dy, 0, math.radians(200), math.radians(340), 72, 11), f(w)) for dy, w in ((-32, 4), (-8, 7), (16, 3), (40, 5))))
    bg = svg(W, H, '<rect width="%d" height="%d" fill="url(#%ssky)"/>' % (W, H, u) + '<g opacity=".5">%s</g>' % starfield(W, 160, 30, 4407, 0, u=u) + giant +
             '<g filter="url(#%sb6)">%s</g>' % (u, cirrus) +
             '<circle cx="%d" cy="%d" r="300" fill="url(#%ssun)"/>' % (sx, sy, u) + halo + dogs +
             '<circle cx="%d" cy="%d" r="14" fill="#ffffff" opacity=".7" filter="url(#%sb6)"/><circle cx="%d" cy="%d" r="5.5" fill="#ffffff"/>' % (sx, sy, u, sx, sy), bdefs)

    defs = blur(u, 'b1', .7) + blur(u, 'b2', 2) + blur(u, 'b4', 4) + blur(u, 'b10', 10, 40) + blur(u, 'b24', 24, 60) + noise(u, 'xtal', '.55', 2, 13) + noise(u, 'fine', '.9 .08', 2, 5) + (
        '<filter id="%sbillow" x="-10%%" y="-10%%" width="120%%" height="120%%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="3"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>' % u) + lin(
        u, 'ice', [(0, '#c4d2e0', None), (.08, '#aabdd0', None), (.4, '#8ea6be', None), (1, '#5c7898', None)]) + lin(
        u, 'lead', [(0, '#4a6484', None), (1, '#1c3050', None)]) + lin(
        u, 'haze', [(0, HAZE, 0), (.5, HAZE, .85), (1, HAZE, 0)]) + lin(
        u, 'slab', [(0, '#f4fafe', None), (.35, '#c0dcea', None), (.75, '#6aa6c8', None), (1, '#2e6a94', None)], 0, 0, 1, 1) + lin(
        u, 'slabE', [(0, '#9ad4ee', None), (1, '#1e5a88', None)], 0, 0, 0, 1) + lin(
        u, 'icl', [(0, '#dff0fa', .95), (.6, '#9ac4e0', .7), (1, '#9ac4e0', 0)]) + rad(
        u, 'glow', [(0, '#fffdf8', .7), (1, '#fffdf8', 0)])
    o = []
    # the frozen sea, running to the horizon
    o.append('<rect y="%d" width="%d" height="%d" fill="url(#%sice)"/>' % (hz, W, H - hz, u))
    o.append('<rect y="%d" width="%d" height="%d" filter="url(#%sfine)" opacity=".16" style="mix-blend-mode: overlay"/>' % (hz, W, H - hz, u))
    ridges = []
    for _ in range(80):
        y = hz + (H - hz) * rnd.random() ** 1.7
        k = (y - hz) / (H - hz)
        x = rnd.uniform(-60, W); L = rnd.uniform(40, 220) * (.3 + k)
        ridges.append('<path d="M%s %sq%s %s %s %s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (
            f(x), f(y), f(L / 2), f(rnd.uniform(-3, 1) * k), f(L), f(rnd.uniform(-2, 2) * k), rnd.choice(['#eef6fc', '#56708e', '#56708e']), f(rnd.uniform(.12, .4)), f(.4 + 1.8 * k)))
    o.append(''.join(ridges))
    for x0, y0, L, w in ((-20, 566, 260, 2.2), (300, 606, 320, 3.5), (30, 712, 440, 6)):
        pts = [(x0 + L * i / 6, y0 + rnd.uniform(-w, w) + i * 3) for i in range(7)]
        top = smooth(pts, False); bot = smooth([(x, y + w * rnd.uniform(.5, 1.2)) for x, y in pts[::-1]], False)
        o.append('<path d="%sL%s" fill="url(#%slead)" opacity=".55" filter="url(#%sb1)"/>' % (top, bot[1:], u, u))
        o.append('<path d="%s" fill="none" stroke="#f4faff" stroke-opacity=".55" stroke-width=".7"/>' % top)
    # the sun's glitter path across the ice
    gl = ''.join('<rect x="%s" y="%s" width="%s" height="%s" fill="#ffffff" opacity="%s"/>' % (
        f(sx + rnd.gauss(0, 12 + (y - hz) * .25)), f(y), f(rnd.uniform(2, 14) * (1 + (y - hz) / 150)), f(rnd.uniform(.5, 1.6)), f(rnd.uniform(.2, .7) * (1 - (y - hz) / 400)))
        for y in [hz + 3 + (H - hz) * rnd.random() ** 1.6 for _ in range(90)])
    o.append('<g filter="url(#%sb1)">%s</g>' % (u, gl))
    o.append('<ellipse cx="%d" cy="%d" rx="46" ry="150" fill="#ffffff" opacity=".2" filter="url(#%sb24)"/>' % (sx + 6, hz + 110, u))

    tones = ['#9ab6d2', '#7e9ec2', '#b6cee4', '#6a8cb4', '#c8dcee', '#88a8cc']

    def cloud(cid, bx, by, wd, ht, fog, seed):
        r = random.Random(seed)
        c = lambda col: mix(col, HAZE, fog)
        gid = '%sbl%d' % (u, cid)
        d = rad(gid, '', [(0, c('#ffffff'), 1), (.4, c('#f2f7fc'), 1), (.7, c('#c2d4e6'), 1), (.92, c('#90b0d2'), 1), (1, c('#b4d0ea'), .85)], .34, .28, .72)
        # billows: a dome of rounded towers, bigger toward the middle, smaller ones budding from the tops
        bil = []
        n = int(wd / 11) + 10
        for i in range(n):
            tt = r.random()
            dome = max(0, 1 - (2 * tt - 1) ** 2) ** .7
            rr_ = ht * (.16 + .26 * dome) * r.uniform(.7, 1.15)
            y = by - rr_ * .55 - ht * .62 * dome * r.random() ** .7
            bil.append((bx - wd / 2 + wd * tt, y, rr_))
        tops = sorted(bil, key=lambda b: b[1] - b[2])[:max(4, n // 3)]
        for x, y, rr_ in tops:
            for _ in range(2):
                a = r.uniform(math.radians(200), math.radians(340))
                bil.append((x + rr_ * .8 * math.cos(a), y + rr_ * .8 * math.sin(a), rr_ * r.uniform(.35, .55)))
        bil.sort(key=lambda b: -b[1])
        circ = ''.join('<circle cx="%s" cy="%s" r="%s"/>' % (f(x), f(y), f(rr_)) for x, y, rr_ in bil)
        clip = '<clipPath id="%scp%d"><rect x="%s" y="%s" width="%s" height="%s"/></clipPath><clipPath id="%scs%d">%s</clipPath>' % (
            u, cid, f(bx - wd), f(by - ht * 3), f(wd * 2), f(ht * 3 + .5), u, cid, circ)
        g = []
        # the subsurface: light scattered deep inside the ice, blue
        g.append('<g fill="%s" filter="url(#%sb4)" opacity=".7" transform="translate(0 -1.5) scale(1 1)">%s</g>' % (c('#dff0ff'), u, circ))
        g.append('<g fill="%s" filter="url(#%sb4)" opacity=".85">%s</g>' % (c('#5a82b4'), u, circ))
        g.append('<g filter="url(#%sbillow)">%s</g>' % (u, ''.join('<circle cx="%s" cy="%s" r="%s" fill="url(#%s)"/>' % (f(x), f(y), f(rr_), gid) for x, y, rr_ in bil)))
        inner = [
            '<rect x="%s" y="%s" width="%s" height="%s" fill="url(#%sshade)"/>' % (f(bx - wd), f(by - ht * 1.6), f(wd * 2), f(ht * 1.6), gid),
            '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%sglow)"/>' % (f(bx - wd * .2), f(by - ht * .9), f(wd * .4), f(ht * .5), u),
            '<rect x="%s" y="%s" width="%s" height="%s" filter="url(#%sxtal)" opacity="%s" style="mix-blend-mode: overlay"/>' % (f(bx - wd), f(by - ht * 1.6), f(wd * 2), f(ht * 1.6), u, f(.14 * (1 - fog)))]
        d += lin(gid, 'shade', [(0, '#ffffff', 0), (.55, c('#9ab8d8'), 0), (1, c('#6a8cb8'), .55)])
        g.append('<g clip-path="url(#%scs%d)">%s</g>' % (u, cid, ''.join(inner)))
        # frozen crust catching the sun on the upper-left of each tower
        top_edge = sorted(bil, key=lambda b: b[1] - b[2])[:max(5, len(bil) // 4)]
        crust = ''.join('<path d="%s" fill="none" stroke="#ffffff" stroke-width="%s" stroke-opacity="%s"/>' % (
            arc(x, y, rr_ * .98, math.radians(200), math.radians(250)), f(max(.6, rr_ * .04)), f(.5 * (1 - fog))) for x, y, rr_ in top_edge)
        g.append('<g filter="url(#%sb1)">%s</g>' % (u, crust))
        body = '<g clip-path="url(#%scp%d)">%s</g>' % (u, cid, ''.join(g))
        # the underside: sheared flat and faceted like broken glass, icicles hanging from it
        edge = [(bx - wd / 2 + 6, by)]
        xs = sorted(r.uniform(bx - wd / 2 + 8, bx + wd / 2 - 8) for _ in range(int(wd / 9)))
        for x in xs: edge.append((x, by + r.uniform(2, 7) * ht / 60))
        edge.append((bx + wd / 2 - 6, by))
        facets = []
        for (x0, y0), (x1, y1) in zip(edge, edge[1:]):
            facets.append('<path d="M%s %sL%s %sL%s %sZ" fill="%s"/>' % (f(x0), f(by), f(x1), f(by), f(x1 if r.random() < .5 else x0), f(y1 if r.random() < .5 else y0), c(r.choice(tones))))
            facets.append('<path d="M%s %sL%s %s" stroke="%s" stroke-opacity=".5" stroke-width=".5"/>' % (f(x0), f(y0), f(x1), f(y1), c('#eaf6ff')))
        ic = []
        for _ in range(int(wd / 7)):
            x = r.uniform(bx - wd / 2 + 8, bx + wd / 2 - 8); L = r.uniform(4, 30) * ht / 90 * r.random() ** .6 + 2
            w_ = r.uniform(.8, 2.4)
            ic.append('<path d="M%s %sl%s %sl%s %sz" fill="url(#%sicl)"/>' % (f(x - w_), f(by + 1), f(w_), f(L), f(w_), f(-L), u))
            if L > 8: ic.append('<path d="M%s %sl%s %s" stroke="#ffffff" stroke-opacity="%s" stroke-width=".4"/>' % (f(x - w_ * .4), f(by + 2), f(w_ * .3), f(L * .7), f(.7 * (1 - fog))))
        under = '<g opacity="%s">%s%s</g>' % (f(1 - .5 * fog), ''.join(facets), ''.join(ic))
        underline = '<path d="M%s %sH%s" stroke="%s" stroke-opacity=".8" stroke-width="1"/>' % (f(bx - wd / 2 + 6), f(by + .5), f(bx + wd / 2 - 6), c('#f4fbff'))
        k = max(.1, (hz - by) / 400)
        shadow = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#3c5474" opacity="%s" filter="url(#%sb10)"/>' % (
            f(bx + 40 * (1 + k)), f(hz + 16 + 240 * k), f(wd * .5), f(6 + 26 * k), f((.2 + .15 * k) * (1 - fog)), u)
        return d + clip, shadow, body + under + underline
    specs = [(1, 470, 518, 130, 26, .62), (2, 86, 520, 150, 30, .6), (3, 300, 512, 96, 22, .66), (4, 360, 468, 120, 36, .42), (5, 118, 430, 230, 66, .26), (6, 440, 336, 330, 128, 0)]
    shs, bodies = [], []
    for cid, bx, by, wd, ht, fog in specs:
        dd, sh, bd = cloud(cid, bx, by, wd, ht, fog, 40 + cid)
        defs += dd; shs.append(sh); bodies.append(bd)
    o.append(''.join(shs))
    o.append('<rect y="%d" width="%d" height="64" fill="url(#%shaze)"/>' % (hz - 32, W, u))
    o.append(''.join(bodies))
    # foreground: upturned slabs of sea ice, glass-clear and blue at their broken edges
    for x, y, w, h_, ang in ((70, 712, 96, 36, -14), (206, 752, 60, 22, 10), (470, 700, 116, 42, 12), (548, 784, 80, 28, -8), (330, 668, 44, 16, 4)):
        top_ = [(x - w / 2, y - 4), (x - w / 2 + 8, y - h_), (x + w / 2 - 10, y - h_ * .8), (x + w / 2, y - 3)]
        face = [(x - w / 2, y - 4), (x + w / 2, y - 3), (x + w / 2 - 2, y + 5), (x - w / 2 + 2, y + 4)]
        P_ = lambda pts: 'M' + 'L'.join('%s %s' % (f(a), f(b)) for a, b in pts) + 'Z'
        cr = ''.join('<path d="M%s %sl%s %s" stroke="#ffffff" stroke-opacity=".5" stroke-width=".5"/>' % (f(x + rnd.uniform(-w / 3, w / 3)), f(y - h_ * rnd.uniform(.2, .8)), f(rnd.uniform(-14, 14)), f(rnd.uniform(-8, 8))) for _ in range(3))
        o.append('<g transform="rotate(%d %d %d)"><path d="%s" fill="url(#%sslabE)"/><path d="%s" fill="url(#%sslab)"/>%s<path d="M%s %sL%s %s" stroke="#ffffff" stroke-width="1.2" stroke-opacity=".9"/></g>' % (
            ang, x, y, P_(face), u, P_(top_), u, cr, f(top_[1][0]), f(top_[1][1]), f(top_[2][0]), f(top_[2][1])))
        o.append('<ellipse cx="%d" cy="%d" rx="%s" ry="5" fill="#46607e" opacity=".35" filter="url(#%sb2)"/>' % (x + 22, y + 7, f(w * .6), u))
    # diamond dust: the air itself glitters, thickest in the sun's direction
    dust = []
    for _ in range(170):
        x, y = rnd.uniform(0, W), rnd.uniform(110, 780)
        near = max(0, 1 - math.hypot(x - sx, y - sy) / 360)
        s_ = rnd.random() ** 3
        if s_ > .55:
            dust.append(spike_star(x, y, .6 + s_, '#ffffff', 3 + 8 * s_ * (.5 + near), .9, .45))
        else:
            dust.append('<circle cx="%s" cy="%s" r="%s" fill="#ffffff" opacity="%s"/>' % (f(x), f(y), f(.4 + .6 * s_), f(rnd.uniform(.25, .6) + .35 * near)))
    o.append(''.join(dust))
    o.append('<path d="M%d %dL%d %d" stroke="#ffffff" stroke-width="60" stroke-opacity=".08" filter="url(#%sb24)"/>' % (sx, sy, sx + 90, hz + 60, u))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .1), defs)
    return bg, obj, svg(W, H, frontier_top('WHERE THE CLOUDS FROZE · THEY HAVE NOT MOVED IN AN AGE'))




# ================================================================= GREEN MOON
def green_moon(u):
    rnd = random.Random(4408)
    gx, gy, GR = 404, 318, 476
    tiltg = math.radians(14)
    mx, my, MR = 214, 402, 150
    # --------------------------------------------------------- the giant fills the sky behind
    pal = ['#efe6d4', '#d8c4a8', '#b89a80', '#8e9c9c', '#c8b49a', '#a4786a', '#e4d6bc', '#6e8488', '#d6c8b0', '#9a8472', '#f4ecdc', '#b0a08a']
    bands, phi = [], -90
    while phi < 90:
        bands.append((phi, rnd.choice(pal) if abs(phi) < 62 else rnd.choice(['#9aa4ac', '#8a969e', '#a8aeb0'])))
        phi += rnd.uniform(2.5, 9) * (1.5 if abs(phi) > 55 else 1)
    gb = []
    for phi, col in bands:
        p = math.radians(phi)
        yc = gy - GR * math.sin(p) * math.cos(tiltg); rx = GR * math.cos(p); ry = rx * math.sin(tiltg)
        gb.append('<path d="M%s %sA%s %s 0 0 0 %s %sL%s %sL%s %sL%s %sL%s %sZ" fill="%s"/>' % (
            f(gx - rx), f(yc), f(rx), f(ry), f(gx + rx), f(yc), f(gx + GR + 20), f(yc), f(gx + GR + 20), f(gy - GR - 20), f(gx - GR - 20), f(gy - GR - 20), f(gx - GR - 20), f(yc), col))
    for _ in range(60):
        p = math.radians(rnd.uniform(-60, 60))
        yc = gy - GR * math.sin(p) * math.cos(tiltg); rx = GR * math.cos(p); ry = rx * math.sin(tiltg)
        gb.append('<path d="M%s %sA%s %s 0 0 0 %s %s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (
            f(gx - rx), f(yc), f(rx), f(ry), f(gx + rx), f(yc), rnd.choice(['#fff4e0', '#5a3a20', '#e8c898']), f(rnd.uniform(.06, .2)), f(rnd.uniform(1, 5))))
    # storms: a great pale oval, a dark eye, strings of white spots
    storms = ['<ellipse cx="%d" cy="%d" rx="40" ry="17" fill="#f6f0e4" opacity=".9"/><ellipse cx="%d" cy="%d" rx="28" ry="10" fill="#7e9aa0" opacity=".8"/><ellipse cx="%d" cy="%d" rx="12" ry="4.5" fill="#4e6a72" opacity=".8"/>' % (
        gx - 250, gy + 150, gx - 250, gy + 150, gx - 247, gy + 151)]
    for _ in range(22):   # festoons: dark wisps curling off the belts
        x0 = gx + rnd.uniform(-420, 60); y0 = gy + rnd.uniform(-260, 260)
        storms.append('<path d="M%s %sq%s %s %s %s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            f(x0), f(y0), f(rnd.uniform(10, 30)), f(rnd.uniform(-14, 14)), f(rnd.uniform(30, 70)), f(rnd.uniform(-6, 6)), rnd.choice(['#6a4a3a', '#f8f0e0', '#56707a']), f(rnd.uniform(.2, .5)), f(rnd.uniform(1.5, 4))))
    storms.append('<ellipse cx="%d" cy="%d" rx="14" ry="7" fill="#3a2414" opacity=".7"/>' % (gx - 40, gy - 150))
    for _ in range(12):
        storms.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#fbf4e4" opacity="%s"/>' % (f(gx + rnd.uniform(-330, 100)), f(gy + rnd.choice([-212, -60, 214]) + rnd.uniform(-5, 5)), f(rnd.uniform(5, 12)), f(rnd.uniform(2.5, 4.5)), f(rnd.uniform(.5, .85))))
    gdefs = blur(u, 'gb1', 1.4) + blur(u, 'gb12', 12, 40) + noise(u, 'gtex', '.002 .07', 4, 71) + rad(u, 'gsheen', [(0, '#fff8ec', .22), (1, '#fff8ec', 0)]) + (
        '<clipPath id="%sgd"><circle cx="%d" cy="%d" r="%d"/></clipPath>'
        '<filter id="%sgturb" x="-5%%" y="-5%%" width="110%%" height="110%%"><feTurbulence type="fractalNoise" baseFrequency=".006 .045" numOctaves="4" seed="48"/><feDisplacementMap in="SourceGraphic" scale="26"/><feGaussianBlur stdDeviation=".6"/></filter>') % (u, gx, gy, GR, u) + rad(
        u, 'gsh', [(0, '#000', 0), (.34, '#000', 0), (.5, '#05030a', .55), (.62, '#020104', .92), (1, '#020104', .97)], .02, .42, 1) + rad(
        u, 'glimb', [(.75, '#000', 0), (.94, '#000', .35), (1, '#000', .7)])
    mshadow = '<ellipse cx="%d" cy="%d" rx="44" ry="40" fill="#0a0604" opacity=".72" filter="url(#%sgb1)"/>' % (mx + 196, my - 44, u)
    giant = ('<g clip-path="url(#%sgd)"><g filter="url(#%sgturb)">%s%s</g><rect x="%d" y="%d" width="%d" height="%d" filter="url(#%sgtex)" opacity=".7" style="mix-blend-mode: overlay"/>'
             '<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="url(#%sgsheen)"/>%s<circle cx="%d" cy="%d" r="%d" fill="url(#%sglimb)"/><circle cx="%d" cy="%d" r="%d" fill="url(#%sgsh)"/></g>' % (
        u, u, ''.join(gb), ''.join(storms), gx - GR, gy - GR, 2 * GR, 2 * GR, u, gx - 200, gy - 120, GR, GR, u, mshadow, gx, gy, GR, u, gx, gy, GR, u) +
             '<path d="%s" fill="none" stroke="#fff0d8" stroke-opacity=".5" stroke-width="3" filter="url(#%sgb1)"/>' % (arc(gx, gy, GR - 1, math.radians(150), math.radians(240)), u))
    bg = sky(u, H, ('#0a0c18', '#05060e', '#010206'), 160, 4408, 3, cy='.9', extra=giant, extra_defs=gdefs)

    # --------------------------------------------------------- the moon: forests, shallow seas, weather
    defs = blur(u, 'b8', 8)
    pal = {'sea': [(0, '#2a9ac8', None), (.4, '#12689e', None), (.85, '#083c6a', None), (1, '#04223e', None)],
           'shelf': '#4ad8d0', 'land': '#3a6a34', 'forest': '#1a4422', 'grass': '#6a8a44', 'desert': '#a89a62', 'mount': '#2a2a1e',
           'haze': '#9adcff', 'rim': '#bff0ff', 'night': '#060403', 'dry': .15, 'isles': 9, 'cyclones': 3, 'streaks': .8, 'puffs': 1.4}
    conts = [(.55, -.6, .34, 6), (-.1, -.2, .3, 5), (.15, .55, .32, 5), (-.6, .35, .26, 4), (.9, .6, .22, 3), (-.35, -1.1, .22, 3)]
    gd, gb = globe(u, 'm', mx, my, MR, math.radians(8), -12, (-.7, -.22, .72), 4408, pal, conts, city=.1)
    defs += gd
    # giantshine: the moon's night side lit faintly amber by the planet behind it
    shine = '<g clip-path="url(#%smdisk)"><path d="%s" fill="none" stroke="#e0a060" stroke-width="%s" stroke-opacity=".18" filter="url(#%sb8)"/></g>' % (
        u, arc(mx, my, MR, math.radians(-50), math.radians(60)), f(MR * .25), u)
    o = ['<circle cx="%d" cy="%d" r="%d" fill="#000" opacity=".35" filter="url(#%sb8)"/>' % (mx, my, MR + 6, u), gb, shine]
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .1), defs)
    return bg, obj, svg(W, H, frontier_top('A GREEN MOON · ITS SKY HALF FILLED BY A GIANT'))


# ================================================================= DERELICT
def derelict(u):
    rnd = random.Random(4409)
    cx, cy = 300, 330
    q, rot = .5, -12
    # --------------------------------------------------------- nebula
    neb = []
    for _ in range(18):
        neb.append('<path d="%s" fill="%s" opacity="%s"/>' % (blob(rnd.uniform(-40, 620), rnd.uniform(40, 700), rnd.uniform(80, 220), rnd.uniform(50, 150), rnd, 14, .4),
                                                              rnd.choice(['#1f6a78', '#2a4a8a', '#6a2a5a', '#8a4a2a', '#18505a', '#3a2a6a']), f(rnd.uniform(.16, .34))))
    lanes = ''.join('<path d="%s" fill="#020306" opacity="%s"/>' % (blob(rnd.uniform(0, W), rnd.uniform(80, 700), rnd.uniform(60, 160), rnd.uniform(14, 40), rnd, 12, .5), f(rnd.uniform(.3, .6))) for _ in range(7))
    ndefs = ('<filter id="%sneb" x="-30%%" y="-30%%" width="160%%" height="160%%"><feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="4" seed="49"/><feDisplacementMap in="SourceGraphic" scale="120"/><feGaussianBlur stdDeviation="14"/></filter>'
             '<filter id="%snebf" x="-30%%" y="-30%%" width="160%%" height="160%%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="40"/><feGaussianBlur stdDeviation="3"/></filter>') % (u, u)
    bg = sky(u, H, ('#0a1018', '#05080e', '#010204'), 330, 4409, 6, cy='.4',
             extra='<ellipse cx="470" cy="130" rx="330" ry="260" fill="url(#%sglow)"/><g filter="url(#%sneb)">%s</g><g filter="url(#%snebf)">%s</g>' % (u, u, ''.join(neb), u, lanes),
             extra_defs=ndefs + rad(u, 'glow', [(0, '#e8d8f0', .55), (.2, '#b88ac8', .3), (.5, '#4a6a9a', .12), (1, '#1a2a4a', 0)]))

    # --------------------------------------------------------- the structure: a spiral hull hundreds of kilometres long, eaten away
    FOG = '#1c2a3a'
    lxs, lys = .62, -.78                    # the nebula's glow falls from the upper right
    defs = blur(u, 'b1', .8) + blur(u, 'b2', 2) + blur(u, 'b5', 5) + blur(u, 'b12', 12, 50) + blur(u, 'b30', 30, 100) + (
        '<filter id="%stex" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".05 .035" numOctaves="5" seed="7" result="n"/>'
        '<feColorMatrix in="n" type="matrix" values=".7 0 0 0 .5  .7 0 0 0 .5  .7 0 0 0 .52  0 0 0 0 1" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gm"/>'
        '<feBlend in="SourceGraphic" in2="gm" mode="multiply"/></filter>') % u + rad(
        u, 'core', [(0, '#e6fdff', .75), (.12, '#8aeef4', .4), (.45, '#1e7a8a', .1), (1, '#0a3a4a', 0)]) + rad(
        u, 'leak', [(0, '#f0ffff', .9), (.25, '#8ae8f0', .45), (1, '#3ab0c8', 0)]) + rad(
        u, 'leakg', [(0, '#fff6e0', .8), (.3, '#ffd8a0', .3), (1, '#ffb070', 0)]) + lin(
        u, 'beam', [(0, '#9af0f4', .35), (1, '#9af0f4', 0)], 0, 0, 1, 0) + lin(
        u, 'col', [(0, '#bff8ff', 0), (.6, '#9af0f4', .08), (1, '#9af0f4', .3)])
    t = math.radians(rot)
    q = .58

    def S(x, y, dz=0):
        y = y * q
        return cx + x * math.cos(t) - y * math.sin(t), cy + x * math.sin(t) + y * math.cos(t) + dz

    a0r, k_ = 14, .207
    rad_ = lambda th: a0r * math.exp(k_ * th)
    harm = [(fq, rnd.uniform(-1, 1) * .09 / fq ** .55, rnd.uniform(0, 6.3)) for fq in (3, 5, 9, 14, 23, 37, 61, 97)]
    harm2 = [(fq, rnd.uniform(-1, 1) * .09 / fq ** .55, rnd.uniform(0, 6.3)) for fq in (4, 7, 11, 19, 31, 53, 89)]
    bites = [(rnd.uniform(2, 13), rnd.uniform(.03, .12), rnd.uniform(.12, .38), rnd.choice([1, -1])) for _ in range(34)]

    def edges(th):
        r = rad_(th); w = r * .42
        no = sum(A * math.sin(fq * th + ph) for fq, A, ph in harm)
        ni = sum(A * math.sin(fq * th + ph) for fq, A, ph in harm2)
        bo = bi = 0
        for c, wd, dp, side in bites:
            g = math.exp(-((th - c) / wd) ** 2) * dp
            if side > 0: bo += g
            else: bi += g
        return r - w * (.5 - ni - bi), r + w * (.5 + no - bo)
    skeletal = [(5.2, 6.1), (8.9, 9.6), (11.3, 11.9), (13.9, 14.5)]      # plating gone: only the frame left
    gaps = [(7.35, 7.7), (10.35, 10.6), (12.55, 12.75), (14.8, 14.95)]      # broken right through
    TH0, TH1, D = 1.1, 15.3, .055
    chunks = []
    th = TH0
    while th < TH1:
        tm = th + D / 2
        if any(a <= tm <= b for a, b in gaps):
            th += D; continue
        skel = any(a <= tm <= b for a, b in skeletal)
        chunks.append((th, th + D * 1.08, skel))
        th += D
    # drift: pieces that have come away near each break
    drift = []
    for a, b in gaps:
        for _ in range(5):
            c = rnd.uniform(a, b)
            drift.append((c, rnd.uniform(.02, .06), rnd.uniform(-1, 1) * rad_(c) * .08, rnd.uniform(.03, .12) * rad_(c), rnd.uniform(-12, 12)))
    items = []
    leaks = []
    pal_top = ('#3a424c', '#343b44', '#2e353e', '#40474f')
    for n_, (a, b, skel) in enumerate(chunks):
        sub = [a + (b - a) * i / 3 for i in range(4)]
        E = [edges(x) for x in sub]
        mid = (a + b) / 2
        r = rad_(mid)
        depth = r * math.sin(mid)                       # larger is nearer the eye
        fog = max(0, min(.85, (.55 - depth / 900) * (1 - r / 900) + (.25 if r < 60 else 0)))
        hgt = 3 + r * .06
        outer = [S(ro * math.cos(x), ro * math.sin(x)) for x, (ri, ro) in zip(sub, E)]
        inner = [S(ri * math.cos(x), ri * math.sin(x)) for x, (ri, ro) in zip(sub, E)]
        # how squarely does the nebula light the outer rim here?
        nx, ny = math.cos(mid), math.sin(mid) * q
        nl = math.hypot(nx, ny) or 1
        rim = max(0, (nx * lxs + ny * lys) / nl)
        base = pal_top[n_ % 4]
        top_c = mix(mix(base, '#6a6c86', .35 * rim), FOG, fog)
        wall_c = mix('#0c0f14', FOG, fog * .8)
        P_ = lambda pts: 'M' + 'L'.join('%d %d' % (round(x), round(y)) if r > 60 else '%s %s' % (f(x), f(y)) for x, y in pts)
        out = []
        if math.sin(mid) > -.2:
            wall = outer + [(x, y + hgt) for x, y in outer[::-1]]
            out.append('<path d="%sZ" fill="%s"/>' % (P_(wall), wall_c))
        else:
            wall = inner + [(x, y + hgt) for x, y in inner[::-1]]
            out.append('<path d="%sZ" fill="%s"/>' % (P_(wall), mix('#141820', FOG, fog * .8)))
        if not skel:
            out.append('<path d="%sZ" fill="%s"/>' % (P_(outer + inner[::-1]), top_c))
            # ribs of the hull: a fine groove every panel, and scars
            (x0, y0), (x1, y1) = outer[0], inner[0]
            out.append('<path d="M%s %sL%s %s" stroke="#07090c" stroke-opacity="%s" stroke-width="%s"/>' % (f(x0), f(y0), f(x1), f(y1), f(.55 * (1 - fog)), f(.4 + r / 500)))
            if rnd.random() < .5:
                u_, v_ = rnd.random(), rnd.uniform(.2, .8)
                px = inner[1][0] + (outer[1][0] - inner[1][0]) * v_; py = inner[1][1] + (outer[1][1] - inner[1][1]) * v_
                L = r * rnd.uniform(.02, .07)
                out.append('<path d="M%s %sl%s %s" stroke="#080a0e" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (f(px), f(py), f(L * rnd.uniform(-1, 1)), f(L * rnd.uniform(-.3, .3)), f(.6 * (1 - fog)), f(.5 + r / 300)))
            for _ in range(int(r / 110)):
                v_ = rnd.random(); w_ = rnd.random()
                px = inner[0][0] + (outer[0][0] - inner[0][0]) * v_ + (inner[3][0] - inner[0][0]) * w_
                py = inner[0][1] + (outer[0][1] - inner[0][1]) * v_ + (inner[3][1] - inner[0][1]) * w_
                pr = rnd.uniform(.4, 1.8) * (r / 200) ** .6
                out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#06080a" opacity="%s"/>' % (f(px), f(py), f(pr), f(pr * q), f(.7 * (1 - fog))))
        else:
            # the frame: two rails and the ribs between them, lit from within
            rail = '#1a1f26'
            out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s"/>' % (P_(outer), mix(rail, FOG, fog), f(1.5 + r / 90)))
            out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s"/>' % (P_(inner), mix(rail, FOG, fog), f(1 + r / 120)))
            if n_ % 2 == 0:
                (x0, y0), (x1, y1) = outer[0], inner[0]
                out.append('<path d="M%s %sL%s %s" stroke="%s" stroke-width="%s"/>' % (f(x0), f(y0), f(x1), f(y1), mix(rail, FOG, fog), f(.8 + r / 160)))
            cxm = sum(p[0] for p in outer + inner) / 8; cym = sum(p[1] for p in outer + inner) / 8
            if rnd.random() < .45:
                leaks.append((cxm, cym, r * rnd.uniform(.06, .2), rnd.uniform(.25, 1) ** 1.3, rnd.choice(['leak', 'leak', 'leak', 'leakg'])))
        if rim > .35:
            out.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="%s"/>' % (P_(outer), rnd.choice(['#b8e8f0', '#e8c8f0']), f(.7 * rim * (1 - fog)), f(.6 + r / 350)))
        # seams where light gets out: few, and uneven
        if not skel and rnd.random() < .05:
            (x0, y0), (x1, y1) = outer[3], inner[3]
            leaks.append(((x0 + x1) / 2, (y0 + y1) / 2, r * rnd.uniform(.04, .1), rnd.uniform(.3, 1), rnd.choice(['leak', 'leak', 'leakg'])))
            out.append('<path d="M%s %sL%s %s" stroke="#dffcff" stroke-opacity="%s" stroke-width="%s" stroke-linecap="round"/>' % (
                f(x0 + (x1 - x0) * .2), f(y0 + (y1 - y0) * .2), f(x0 + (x1 - x0) * rnd.uniform(.5, .9)), f(y0 + (y1 - y0) * rnd.uniform(.5, .9)), f(rnd.uniform(.4, .9)), f(.6 + r / 400)))
        items.append((depth, ''.join(out)))
    for c, wd, off, lift, spin in drift:
        E = [edges(c + wd * i / 3) for i in range(4)]
        sub = [c + wd * i / 3 for i in range(4)]
        r = rad_(c)
        pts = [S(ro * math.cos(x) + off, ro * math.sin(x), -lift) for x, (ri, ro) in zip(sub, E)] + [S(ri * math.cos(x) + off, ri * math.sin(x), -lift) for x, (ri, ro) in zip(sub[::-1], E[::-1])]
        mx_ = sum(p[0] for p in pts) / len(pts); my_ = sum(p[1] for p in pts) / len(pts)
        d = 'M' + 'L'.join('%s %s' % (f(x), f(y)) for x, y in pts) + 'Z'
        items.append((r * math.sin(c) + 40, '<g transform="rotate(%s %s %s)"><path d="%s" fill="#101418" transform="translate(0 %s)"/><path d="%s" fill="#3a424c"/><path d="%s" fill="none" stroke="#b8e8f0" stroke-opacity=".4" stroke-width=".6"/></g>' % (
            f(spin), f(mx_), f(my_), d, f(3 + r * .06), d, d)))
    items.sort(key=lambda it: it[0])
    o = []
    # the source inside, dim and deep, glimpsed through the coils
    o.append('<ellipse cx="%d" cy="%d" rx="210" ry="120" fill="url(#%score)" transform="rotate(%d %d %d)"/>' % (cx, cy, u, rot, cx, cy))
    o.append('<circle cx="%d" cy="%d" r="9" fill="#dffcff" opacity=".7" filter="url(#%sb5)"/><circle cx="%d" cy="%d" r="2.2" fill="#ffffff"/>' % (cx + 3, cy - 2, u, cx + 3, cy - 2))
    o.append('<path d="M%d %dL%d %dL%d %dL%d %dZ" fill="url(#%scol)" filter="url(#%sb12)"/>' % (cx - 6, cy, cx - 40, cy - 330, cx + 46, cy - 330, cx + 10, cy, u, u))
    # light escaping between the plates, projected out into space as faint shafts
    for x, y, rr_, op, kind in leaks:
        o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s%s)" opacity="%s"/>' % (f(x), f(y - rr_ * .3), f(rr_ * 2.4), f(rr_ * 1.5), u, kind, f(min(1, op * 1.3))))
    for x, y, rr_, op, kind in leaks[::3]:
        o.append('<path d="M%s %sL%s %sL%s %sZ" fill="url(#%sbeam)" opacity="%s" filter="url(#%sb5)" transform="rotate(%s %s %s)"/>' % (
            f(x), f(y), f(x + 260), f(y - 10), f(x + 260), f(y + 16), u, f(op * .45), u, f(rnd.uniform(-160, -100)), f(x), f(y)))
    o.append('<g filter="url(#%stex)">%s</g>' % (u, ''.join(it for _, it in items)))
    # veils of the nebula drifting in front, the far coils sinking into them
    veil = ''.join('<path d="%s" fill="%s" opacity="%s"/>' % (blob(rnd.uniform(0, W), rnd.uniform(160, 560), rnd.uniform(80, 200), rnd.uniform(20, 50), rnd, 12, .4), rnd.choice(['#2a4a6a', '#4a3a6a', '#1e5060']), f(rnd.uniform(.08, .16))) for _ in range(9))
    o.append('<g filter="url(#%sb30)">%s</g>' % (u, veil))
    for x, y, rr_, op, kind in leaks:
        if op > .6:
            o.append('<circle cx="%s" cy="%s" r="%s" fill="#f4ffff" opacity="%s"/>' % (f(x), f(y), f(max(.6, rr_ * .08)), f(op)))
    # dust and shards shed over the ages
    for _ in range(70):
        a = rnd.uniform(0, 2 * math.pi); r = rnd.uniform(40, 460)
        x, y = S(r * math.cos(a), r * math.sin(a), -rnd.uniform(-30, 60))
        if not (0 < x < W and 0 < y < H): continue
        s_ = rnd.uniform(.6, 3.2) * (.5 + r / 400)
        pts = [(x + s_ * math.cos(b_), y + s_ * .6 * math.sin(b_)) for b_ in sorted(rnd.uniform(0, 6.28) for _ in range(4))]
        o.append('<path d="M%sZ" fill="%s"/>' % ('L'.join('%s %s' % (f(px), f(py)) for px, py in pts), rnd.choice(['#3a424c', '#2a3038', '#8a96a4'])))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .12), defs)
    return bg, obj, svg(W, H, frontier_top('MADE BY NO ONE WE KNOW · STILL FAINTLY LIT'))




# ================================================================= GENERATION SHIP
def generation_ship(u):
    rnd = random.Random(4410)
    dx_, dy_ = 482, 146                # the destination star
    band = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s" transform="rotate(-18 291 416)"/>' % (
        f(291 + rnd.uniform(-240, 240)), f(416 + rnd.uniform(-30, 30)), f(rnd.uniform(80, 220)), f(rnd.uniform(20, 60)), rnd.choice(['#8a9ad0', '#c8b0a0', '#6a78b0', '#d8c8b8']), f(rnd.uniform(.04, .1))) for _ in range(16))
    dust = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#050608" opacity="%s" transform="rotate(-18 291 416)"/>' % (
        f(291 + rnd.uniform(-260, 260)), f(416 + rnd.uniform(-10, 10)), f(rnd.uniform(40, 120)), f(rnd.uniform(4, 12)), f(rnd.uniform(.3, .5))) for _ in range(9))
    mw = []
    for _ in range(1400):   # the band's stars, crowded along its spine
        a = rnd.uniform(-420, 420); b = rnd.gauss(0, 46)
        th = math.radians(-18)
        x, y = 291 + a * math.cos(th) - b * math.sin(th), 416 + a * math.sin(th) + b * math.cos(th)
        if 0 <= x <= W and 0 <= y <= H:
            mw.append('M%s %sh.1' % (f(x), f(y)))
    bdefs = blur(u, 'b18', 18, 60) + blur(u, 'b4', 4) + rad(u, 'dest', [(0, '#fff8ea', .9), (.1, '#ffe6c0', .5), (.35, '#ffc890', .12), (1, '#ffc890', 0)])
    bg = sky(u, H, ('#0a0d1c', '#04060e', '#010205'), 420, 4410, 6, cy='.45',
             extra='<g filter="url(#%sb18)">%s</g><g filter="url(#%sb4)">%s</g><path d="%s" stroke="#e8ecff" stroke-opacity=".5" stroke-width="1.1" stroke-linecap="round"/>' % (u, band, u, dust, ''.join(mw)) +
             '<circle cx="%d" cy="%d" r="120" fill="url(#%sdest)"/>' % (dx_, dy_, u) + spike_star(dx_, dy_, 3.2, '#fff4e0', 60, 1, 1.1) +
             '<circle cx="%d" cy="%d" r="3" fill="#8ab0d8"/><path d="M%d %dA3 3 0 0 1 %d %dA1.4 3 0 0 0 %d %dZ" fill="#e8f0ff" transform="rotate(-50 %d %d)"/>' % (dx_ - 34, dy_ + 22, dx_ - 34, dy_ + 19, dx_ - 34, dy_ + 25, dx_ - 34, dy_ + 19, dx_ - 34, dy_ + 22),
             extra_defs=bdefs)

    # --------------------------------------------------------- the ship, bound for that star
    sx0, sy0 = 150, 560                 # stern
    ang = math.atan2(dy_ - sy0, dx_ - sx0)
    L = 330
    ax, ay = math.cos(ang), math.sin(ang)
    nx, ny = -ay, ax                    # the side toward the lower right
    deg = math.degrees(ang)

    def at(t, off=0):
        return sx0 + ax * L * t + nx * off, sy0 + ay * L * t + ny * off
    defs = blur(u, 'b1', .7) + blur(u, 'b2', 2) + blur(u, 'b6', 6) + blur(u, 'b16', 16, 60) + blur(u, 'b40', 40, 120) + (
        '<linearGradient id="%scyl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8ecf2"/><stop offset=".22" stop-color="#9aa2b0"/><stop offset=".6" stop-color="#3a404c"/><stop offset="1" stop-color="#14171e"/></linearGradient>'
        '<linearGradient id="%sspine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c0cc"/><stop offset="1" stop-color="#2a2e36"/></linearGradient>'
        '<linearGradient id="%splume" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".06" stop-color="#bfe4ff" stop-opacity=".9"/><stop offset=".35" stop-color="#6a9aff" stop-opacity=".35"/><stop offset="1" stop-color="#4a6aff" stop-opacity="0"/></linearGradient>'
        '<radialGradient id="%stank" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#e8ecf0"/><stop offset=".5" stop-color="#7a828e"/><stop offset="1" stop-color="#1a1d24"/></radialGradient>'
        '<linearGradient id="%sshield" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset=".4" stop-color="#a8c8dc"/><stop offset="1" stop-color="#3a5468"/></linearGradient>'
        '<linearGradient id="%svane" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a4a" stop-opacity=".7"/><stop offset="1" stop-color="#5a2418" stop-opacity=".9"/></linearGradient>') % (u, u, u, u, u, u)
    g = []    # drawn in the ship's own frame: x along the axis (stern 0 → bow L), y across
    # the drive: its plume first, streaming back past the stern
    g.append('<path d="M0 -7L-420 -34L-420 34L0 7Z" fill="url(#%splume)" filter="url(#%sb6)"/>' % (u, u))
    g.append('<path d="M0 -2.5L-300 -6L-300 6L0 2.5Z" fill="url(#%splume)"/>' % u)
    g.append('<ellipse cx="-4" cy="0" rx="26" ry="16" fill="#bfe4ff" opacity=".5" filter="url(#%sb16)"/>' % u)
    for k in range(1, 7):     # shock diamonds in the exhaust
        g.append('<ellipse cx="%d" cy="0" rx="%s" ry="%s" fill="#e8f4ff" opacity="%s" filter="url(#%sb2)"/>' % (-k * 34, f(8 - k * .6), f(3 - k * .25), f(.55 - k * .07), u))
    # the drive ring and the bell
    g.append('<path d="M6 -12L20 -8L20 8L6 12Z" fill="#3a404a"/><ellipse cx="6" cy="0" rx="4" ry="12" fill="#dff2ff"/>')
    g.append('<ellipse cx="14" cy="0" rx="7" ry="24" fill="none" stroke="#8a96a8" stroke-width="3"/><ellipse cx="14" cy="0" rx="7" ry="24" fill="none" stroke="#dfe8f4" stroke-width=".8" stroke-dasharray="20 40"/>')
    # the spine: a long open truss
    g.append('<rect x="18" y="-3" width="%d" height="6" fill="url(#%sspine)"/>' % (L - 30, u))
    g.append('<path d="%s" stroke="#6a7280" stroke-width=".5"/>' % ''.join('M%d -3L%d 3' % (x, x + 5) for x in range(20, L - 16, 5)))
    # radiator vanes, swept back, dull red with waste heat
    for x in (58, 96):
        for sgn in (-1, 1):
            g.append('<path d="M%d %dL%d %dL%d %dL%d %dZ" fill="url(#%svane)" opacity=".85"/>' % (x, sgn * 3, x - 14, sgn * 46, x + 16, sgn * 46, x + 30, sgn * 3, u))
            g.append('<path d="%s" stroke="#1a0c08" stroke-opacity=".6" stroke-width=".5"/>' % ''.join('M%s %sL%s %s' % (f(x + k * 5), f(sgn * 3), f(x - 14 + k * 5), f(sgn * 46)) for k in range(1, 6)))
    # propellant: a cluster of round tanks
    for x, y, r in ((132, -11, 10), (132, 11, 10), (152, -10, 9), (152, 10, 9), (142, 0, 11)):
        g.append('<circle cx="%d" cy="%d" r="%d" fill="url(#%stank)"/>' % (x, y, r, u))
    # the habitat drums, spinning for weight, their windows in bands
    for i, x in enumerate((178, 212, 246, 280)):
        wd, rr_ = 28, 25
        g.append('<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="url(#%scyl)"/>' % (x, -rr_, wd, 2 * rr_, u))
        for yy in (-18, -9, 0, 9, 18):
            g.append('<path d="M%d %sH%d" stroke="#ffd890" stroke-opacity="%s" stroke-width=".8" stroke-dasharray="1.2 2.2"/>' % (x + 3, f(yy), x + wd - 3, f(.9 - abs(yy) / 40)))
        g.append('<ellipse cx="%d" cy="0" rx="6" ry="%d" fill="#4a505c" stroke="#c8d0dc" stroke-width=".7"/>' % (x + wd, rr_))
        g.append('<ellipse cx="%d" cy="0" rx="2.4" ry="5" fill="#2a2e36"/>' % (x + wd))
        g.append('<path d="M%d %dH%d" stroke="#ffffff" stroke-opacity=".7" stroke-width=".9"/>' % (x + 1, -rr_ + .6, x + wd - 1))
    # the bow: a thick blunt shield of ice against the dust between the stars
    g.append('<path d="M%d -18L%d -30Q%d 0 %d 30L%d 18Z" fill="url(#%sshield)"/>' % (L - 22, L - 6, L + 18, L - 6, L - 22, u))
    g.append('<ellipse cx="%d" cy="0" rx="8" ry="30" fill="#c8e4f4" opacity=".9"/><ellipse cx="%d" cy="0" rx="8" ry="30" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width=".8"/>' % (L - 6, L - 6))
    # running lights
    for x in range(30, L - 30, 22):
        g.append('<circle cx="%d" cy="3.5" r=".8" fill="#ff8a6a"/>' % x)
    ship = '<g transform="translate(%d %d) rotate(%s)">%s</g>' % (sx0, sy0, f(deg), ''.join(g))
    o = [ship]
    # the starlight ahead catching the shield, the drive glow behind
    bx, by = at(1.0)
    o.append('<circle cx="%s" cy="%s" r="16" fill="#ffffff" opacity=".35" filter="url(#%sb6)"/>' % (f(bx), f(by), u))
    o.append('<circle cx="%d" cy="%d" r="60" fill="#8ab8ff" opacity=".18" filter="url(#%sb40)"/>' % (sx0, sy0, u))
    obj = svg(W, H, ''.join(o) + grain(u + 'o', W, H, .1), defs)
    return bg, obj, svg(W, H, frontier_top('FOUR DRUMS OF PEOPLE · NINE CENTURIES TO GO'))


PLATES = {
    'WORMHOLE': wormhole, 'TWIN-SUNS': twin_suns, 'HOUR-SEA': hour_sea,
    'ORBITAL-RING': orbital_ring, 'DYSON-SWARM': dyson_swarm, 'ECUMENOPOLIS': ecumenopolis,
    'FROZEN-CLOUDS': frozen_clouds, 'GREEN-MOON': green_moon, 'DERELICT': derelict, 'GENERATION-SHIP': generation_ship,
}
