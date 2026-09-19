"""The Meridian: a clean, long-range cruiser for Explore Mode.

Run:  Blender -b -P assets-src/blender/ship_cruiser.py -- <out-dir> [renders-dir]
Writes <out-dir>/shipcruiser.glb (raw; optimise it with gltf-transform).

Spec (original design; no reference image, the brief's text): 29 m long,
15 m across. A blended lifting-body arrowhead: a lens-section primary hull
with a sharp chine picked out by a thin teal rim, a raised dorsal spine
that starts in a streamlined bridge and carries two rows of lit windows
down each side, a rounded engine block aft with three round drives, and
two drive fins rising canted outboard from the trailing corners, each with
a glowing teal drive band. Clean white and pale-grey plating with fine
panel lines, a hangar bay under the tail. Markings: STELLAR on the spine's
flanks ahead of the windows, the full five-cross Georgian flag on each fin.
Deliberately not a film starship: no saucer, no neck, no secondary hull,
no nacelles on pylons, no deflector dish, no delta, no registry number.

Axes: nose -Y, up +Z, port +X (glTF: forward +Z, up +Y). Units: metres.
Empties: Engine_{C,P,S} (scale = core radius), Cannon_{P,S}, Rcs_*,
Nav_Port, Nav_Stbd, Strobe, Plasma.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import scene, model, decal, vehicle  # noqa: E402
import hardsurface as hs  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, '..', 'build')
RENDERS = argv[1] if len(argv) > 1 else None

WHITE = (0.8, 0.81, 0.82, 1)
PALE = (0.62, 0.65, 0.68, 1)
TEAL = (0.18, 0.72, 0.64, 1)
DARK = (0.06, 0.065, 0.075, 1)
STEEL = (0.3, 0.31, 0.33, 1)
INK = (0.08, 0.1, 0.12, 1)

# Primary hull planform: (y, half-width, thickness scale). Smoothly
# interpolated into many stations so the lens reads as one surface.
KEYS = [(-14.6, 0.15, 0.12), (-13.0, 1.3, 0.42), (-10.0, 2.8, 0.78), (-6.0, 4.3, 1.02), (-2.0, 5.5, 1.16),
        (2.0, 6.4, 1.2), (6.0, 7.0, 1.14), (9.0, 7.2, 1.0), (11.2, 6.8, 0.86), (12.6, 5.6, 0.72), (13.4, 4.2, 0.6)]
SPINE_X = 1.5  # half-width of the spine's flat window band
SPINE_KEYS = [(-9.4, 0.1, 0.1), (-8.6, 0.8, 0.55), (-7.2, 1.3, 0.95), (-5.0, SPINE_X, 1.12), (10.0, SPINE_X, 1.12),
              (11.4, 1.8, 0.95), (13.0, 2.2, 0.62)]
SPINE_BASE = 1.05


def catmull(keys, n):
    """Resample (y, a, b) keys with a Catmull-Rom spline into n stations."""
    out = []
    pts = [keys[0]] + keys + [keys[-1]]
    per = max(1, n // (len(keys) - 1))
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(per):
            t = k / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(3)))
    out.append(keys[-1])
    return out


def lens_profile(n):
    """A lens section with a thin upright rim at the chine: fuller on top,
    flatter underneath. Points run round the section once."""
    top, bot = [], []
    for i in range(n + 1):
        x = math.cos(math.pi * i / n)  # 1 → -1, dense at the edges
        k = 1 - x * x
        top.append((x * 0.985, 0.03 + k * (1 + 0.3 * x * x)))
        bot.append((x * 0.985, -0.03 - 0.62 * k * (1 + 0.2 * x * x)))
    return [(1.0, 0.03)] + top[1:-1] + [(-1.0, 0.03), (-1.0, -0.03)] + bot[::-1][1:-1] + [(1.0, -0.03)]


def spine_profile():
    """Flat-sided spine: a rounded roof over an upright window band."""
    pts = [(1.0, 0.0), (1.0, 0.62)]
    for i in range(1, 8):
        a = math.pi / 2 * i / 8
        pts.append((math.cos(a) * 1.0, 0.62 + math.sin(a) * 0.38))
    pts.append((0.0, 1.0))
    left = [(-x, z) for x, z in pts[::-1][1:]]
    return pts + left


def mats():
    return {
        'white': hs.paint('Hull', WHITE, seed=2.2, wear=0.05, grime=0.08, panel=(2.2, 1.6, 0.9), seam=0.012, rough=0.4, metal=0.08, patches=0.04),
        'pale': hs.paint('HullPale', PALE, seed=4.4, wear=0.05, grime=0.08, panel=(1.8, 1.2, 0.8), seam=0.012, rough=0.42, metal=0.1),
        'teal': hs.paint('Accent', TEAL, seed=6.6, wear=0.02, grime=0.02, panel=(9, 9, 9), seam=0.001, rough=0.35),
        'dark': hs.metal('Dark', DARK, rough=0.45, metallic=0.5, seed=1.0),
        'steel': hs.metal('Steel', STEEL, rough=0.35, metallic=0.7, seed=3.0, ribs=0.1),
        'window': hs.flat('Windows', (1.0, 0.93, 0.78, 1), rough=0.2, emit=(1.0, 0.86, 0.6, 1)),
        'drive': hs.flat('DriveBand', (0.5, 1.0, 0.92, 1), rough=0.2, emit=(0.28, 1.0, 0.86, 1)),
        'glass': hs.flat('Bridge', (0.02, 0.05, 0.07, 1), rough=0.05, metallic=0.3, emit=(0.1, 0.3, 0.35, 1)),
        'lamp': hs.flat('Lamp', (1.0, 1.0, 1.0, 1), rough=0.3, emit=(1.0, 1.0, 1.0, 1)),
        'ink': hs.flat('Ink', INK, rough=0.5),
    }


def primary(p, m):
    prof = lens_profile(14 if p.detail else 11)
    st = catmull(KEYS, 36 if p.detail else 24)
    obj = hs.loft('Primary', prof, [(y, w, t, 0, 0) for y, w, t in st])
    obj.data.materials.append(m['white'])
    obj.data.materials.append(m['teal'])
    obj.data.materials.append(m['dark'])
    for f in obj.data.polygons:
        n = f.normal
        if abs(n.z) < 0.25 and abs(f.center.z) < 0.05:
            f.material_index = 1  # the rim
    # Hangar bay under the tail: a dark recess.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bay = [f for f in bm.faces if 8.0 < f.calc_center_median().y < 11.2 and abs(f.calc_center_median().x) < 2.2 and f.normal.z < -0.9]
    if bay:
        bmesh.ops.inset_region(bm, faces=bay, thickness=0.08, depth=-0.12, use_even_offset=True)
        for f in bay:
            f.material_index = 2
    bm.to_mesh(obj.data)
    bm.free()
    p.items.append((obj, 0))


def lens_top(y, f):
    """Height of the primary hull's upper surface at depth y, a fraction f of the half-width out."""
    st = catmull(KEYS, 120)
    for (y0, _, t0), (y1, _, t1) in zip(st, st[1:]):
        if y0 <= y <= y1:
            t = t0 + (t1 - t0) * (y - y0) / max(1e-6, y1 - y0)
            return t * (0.03 + (1 - f * f) * (1 + 0.3 * f * f))
    return 0.0


def half_width(y):
    st = catmull(KEYS, 120)
    for (y0, w0, _), (y1, w1, _) in zip(st, st[1:]):
        if y0 <= y <= y1:
            return w0 + (w1 - w0) * (y - y0) / max(1e-6, y1 - y0)
    return 0.0


def strakes(p, m):
    """Two low ridges running aft over the upper hull, breaking up the lens."""
    f = 0.52
    for s in (1, -1):
        st = []
        for i in range(19 if p.detail else 12):
            y = -9.0 + i * (20.0 / ((19 if p.detail else 12) - 1))
            st.append((y, 0.14, 0.09, s * f * half_width(y), lens_top(y, f) - 0.03))
        obj = hs.loft('Strake', [(1, 0), (0.35, 1), (-0.35, 1), (-1, 0), (0, -1.5)], st)
        p.add(obj, m['pale'])


def spine(p, m):
    st = catmull(SPINE_KEYS, 28 if p.detail else 18)
    obj = hs.loft('Spine', spine_profile(), [(y, w, h, 0, SPINE_BASE) for y, w, h in st])
    obj.data.materials.append(m['pale'])
    obj.data.materials.append(m['glass'])
    # The bridge: a band of glass wrapping the spine's nose.
    for f in obj.data.polygons:
        c = f.center
        if -8.9 < c.y < -6.4 and SPINE_BASE + 0.15 < c.z < SPINE_BASE + 0.75 and f.normal.y < -0.15:
            f.material_index = 1
    model.bevel(obj, 0.03 if p.detail else 0.02, p.seg, 30)
    p.items.append((obj, 0))
    # Two window rows on each flank of the spine, and STELLAR ahead of them.
    for s in (1, -1):
        x = s * (SPINE_X + 0.012)
        for z in (SPINE_BASE + 0.3, SPINE_BASE + 0.58):
            if p.detail:
                p.add(model.box('Band', (0.02, 13.2, 0.2), (x, 3.3, z)), m['ink'])
                for i in range(44):
                    y = -3.0 + i * 0.3
                    p.add(model.box('Win', (0.03, 0.17, 0.12), (x + s * 0.004, y, z)), m['window'])
            else:
                p.add(model.box('Band', (0.024, 13.2, 0.2), (x, 3.3, z)), m['window'])
    # Sensor blister and the strobe mast on the roof.
    p.add(model.bevel(model.box('Blister', (0.8, 1.6, 0.25), (0, -2.0, SPINE_BASE + 1.12)), 0.08, p.seg), m['white'])
    p.add(model.cylinder('Mast', 0.05, 0.7, 8, location=(0, 7.5, SPINE_BASE + 1.12 + 0.35)), m['steel'])


FIN_ROOT = (6.2, 0.3, 2.5, 9.0, 0.22)  # x, z, leading-edge y, chord, half-thickness
FIN_TIP = (7.3, 4.4, 8.4, 4.4, 0.11)
AIRFOIL = [(0, 0), (0.25, 1.0), (0.7, 0.8), (1.0, 0), (0.7, -0.8), (0.25, -1.0)]


def fin_frame(s):
    """The fin's span direction (root to tip, without sweep) and its outboard normal."""
    span = Vector((s * (FIN_TIP[0] - FIN_ROOT[0]), 0, FIN_TIP[1] - FIN_ROOT[1])).normalized()
    normal = Vector((s * (FIN_TIP[1] - FIN_ROOT[1]), 0, -(FIN_TIP[0] - FIN_ROOT[0]))).normalized()
    return span, normal


def fin_point(s, t, u, lift=0.0):
    """A point on the fin's outboard face: `t` along the span, `u` along the chord."""
    _, normal = fin_frame(s)
    lerp = [a + (b - a) * t for a, b in zip(FIN_ROOT, FIN_TIP)]
    x, z, y0, chord, half = lerp
    k = next(((1 - (u - u0) / (u1 - u0)) * v0 + (u - u0) / (u1 - u0) * v1)
             for (u0, v0), (u1, v1) in zip(AIRFOIL[:4], AIRFOIL[1:4]) if u0 <= u <= u1)
    return Vector((s * x, y0 + chord * u, z)) + normal * (half * k + lift)


def fin(p, m, s):
    """A drive fin: an airfoil slab rising canted outboard from the trailing corner."""
    _, normal = fin_frame(s)
    bm = bmesh.new()
    rings = []
    for x, z, y0, chord, half in (FIN_ROOT, FIN_TIP):
        base = Vector((s * x, y0, z))
        rings.append([bm.verts.new(base + Vector((0, chord * u, 0)) + normal * (half * v)) for u, v in AIRFOIL])
    a, b = rings
    for i in range(6):
        j = (i + 1) % 6
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(a[::-1])
    bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new('Fin')
    bm.to_mesh(mesh)
    bm.free()
    obj = model.link(bpy.data.objects.new('Fin', mesh))
    model.bevel(obj, 0.04 if p.detail else 0.03, p.seg, 30)
    p.add(obj, m['white'])
    # The drive band: a glowing strip along the fin's outboard face, aft.
    ra, tb = fin_point(s, 0.08, 0.72, 0.02), fin_point(s, 0.9, 0.72, 0.02)
    d = tb - ra
    band = model.box('DriveBand', (0.7, d.length, 0.05), (0, 0, 0))
    hs.orient(band, (ra + tb) / 2, normal.cross(d), d)
    p.add(band, m['drive'])
    # Tip cap with the position light.
    tx, tz, ty, tc, _ = FIN_TIP
    p.add(model.bevel(model.box('FinTip', (0.24, tc * 0.95, 0.14), (s * tx, ty + tc * 0.5, tz + 0.02)), 0.03, p.seg), m['teal'])
    p.add(model.box('NavLamp', (0.12, 0.3, 0.1), (s * tx, ty + 0.35, tz + 0.1)), m['lamp'])


def engine_block(p, m):
    prof = [(1.0, -0.2), (1.0, 0.7), (0.8, 1.0), (-0.8, 1.0), (-1.0, 0.7), (-1.0, -0.2), (-0.7, -0.45), (0.7, -0.45)]
    st = [(11.0, 1.4, 0.8, 0, 0.35), (12.0, 2.9, 1.0, 0, 0.5), (14.0, 3.3, 1.05, 0, 0.55), (14.5, 3.2, 1.0, 0, 0.55)]
    obj = hs.loft('EngineBlock', prof, st)
    model.bevel(obj, 0.12 if p.detail else 0.08, p.seg, 30)
    p.add(obj, m['pale'])
    for x, z, r, tag in ((0, 0.65, 0.78, 'C'), (2.1, 0.5, 0.55, 'P'), (-2.1, 0.5, 0.55, 'S')):
        seg = 40 if p.detail else 24
        wall = 14.5 + 0.35 - 0.8 * r
        shroud = [(r * 1.05, 14.3), (r * 1.1, 14.5), (r * 1.08, 14.85), (r * 0.92, 14.85), (r * 0.82, 14.85 - 0.3 * r), (r * 0.66, wall), (0.001, wall)]
        p.add(hs.lathe('Drive' + tag, shroud, seg, location=(x, 0, z)), m['steel'])
        p.add(hs.lathe('DriveRing' + tag, [(r * 1.115, 14.55), (r * 1.115, 14.68)], seg, location=(x, 0, z)), m['drive'])


def details(p, m):
    # Leading-edge emitters (the guns) on the chines near the nose.
    for s in (1, -1):
        x = s * 1.9
        p.add(model.bevel(model.box('Emitter', (0.3, 1.2, 0.16), (x, -11.6, 0.0)), 0.04, p.seg), m['dark'])
        p.add(model.box('EmitterTip', (0.14, 0.12, 0.08), (x, -12.25, 0.0)), m['drive'])
        # RCS quads: nose sides, tail edges.
        p.add(model.bevel(model.box('RcsN', (0.2, 0.36, 0.2), (s * 1.95, -12.4, 0.2)), 0.02, p.seg), m['dark'])
        p.add(model.bevel(model.box('RcsT', (0.24, 0.4, 0.2), (s * 7.05, 9.0, 0.0)), 0.02, p.seg), m['dark'])
        p.add(model.bevel(model.box('RcsB', (0.2, 0.16, 0.16), (s * 0.6, -14.0, -0.08)), 0.02, p.seg), m['dark'])
    for y, z_top, z_bot in ((-11.0, 0.72, -0.5), (11.6, 1.62, -0.62)):
        p.add(model.bevel(model.box('RcsTop', (0.36, 0.36, 0.16), (0, y, z_top)), 0.02, p.seg), m['dark'])
        p.add(model.bevel(model.box('RcsBot', (0.36, 0.36, 0.16), (0, y, z_bot)), 0.02, p.seg), m['dark'])


def markings(p, m):
    flag = decal.georgian_flag('GeorgianFlag', 300, 200)
    flag_mat = hs.image_mat('Flag', flag, rough=0.4)
    for s in (1, -1):
        x = s * (SPINE_X + 0.004)
        w = decal.wordmark('STELLAR', 0.36, (0, 0, 0), (0, 0, 0), extrude=0.0, name='WordSpine')
        hs.orient(w, (x, -4.2, SPINE_BASE + 0.44), (0, s, 0), (0, 0, 1))
        p.add(w, m['ink'])
    # Flags on the fins' outboard faces, near the root, reading upright.
    for s in (1, -1):
        span, _ = fin_frame(s)
        f = hs.plate('FlagFin', 1.2, 0.8, fin_point(s, 0.32, 0.3, 0.006), (0, s, 0), span)
        p.add(f, flag_mat)


def build_ship(p):
    m = mats()
    primary(p, m)
    spine(p, m)
    strakes(p, m)
    for s in (1, -1):
        fin(p, m, s)
    engine_block(p, m)
    details(p, m)
    if p.detail:
        markings(p, m)


def empties(root, objs):
    def e(name, loc, scale=0.3):
        o = hs.empty(name, loc, root)
        o.scale = (scale, scale, scale)
        return o
    for x, z, r, tag in ((0, 0.65, 0.78, 'C'), (2.1, 0.5, 0.55, 'P'), (-2.1, 0.5, 0.55, 'S')):
        e(f'Engine_{tag}', (x, 14.85 - 0.8 * r, z), r * 0.66)
    for s, tag in ((1, 'P'), (-1, 'S')):
        e(f'Cannon_{tag}', (s * 1.9, -12.45, 0.0))
        e(f'Rcs_B_{tag}', (s * 0.6, -14.25, -0.08))
        e('Rcs_N_' + ('PX' if s > 0 else 'NX'), (s * 2.25, -12.4, 0.2))
        e('Rcs_T_' + ('PX' if s > 0 else 'NX'), (s * 7.35, 9.0, 0.0))
        e('Nav_' + ('Port' if s > 0 else 'Stbd'), (s * FIN_TIP[0], FIN_TIP[2] + 0.35, FIN_TIP[1] + 0.22), 0.15)
    e('Rcs_N_PY', (0, -11.0, 1.0))
    e('Rcs_N_NY', (0, -11.0, -0.78))
    e('Rcs_T_PY', (0, 11.6, 1.95))
    e('Rcs_T_NY', (0, 11.6, -0.9))
    e('Strobe', (0, 7.5, SPINE_BASE + 1.12 + 0.75), 0.12)
    e('Plasma', (0, -14.8, 0.0))


def main():
    scene.reset(seed=41)
    counts = vehicle.build('ShipCruiser', build_ship, OUT, RENDERS, empties_fn=empties, cage=0.06)
    print('cruiser:', counts)


main()
