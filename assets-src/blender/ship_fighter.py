"""The Magpie: a scrappy used-future starfighter for Explore Mode's combat.

Run:  Blender -b -P assets-src/blender/ship_fighter.py -- <out-dir> [renders-dir]
Writes <out-dir>/shipfighter.glb (raw; optimise it with gltf-transform).

Spec (original design; no reference image, the brief's text): 12.5 m long,
12.4 m across the wings. A long, flat, chined nose ahead of a cockpit tub
with a bubble canopy set off-centre to port; a squat faceted sensor-droid
dome behind it, offset to starboard; two chunky engine pods hugging the
aft fuselage with open intakes and deep nozzles; exposed machinery on the
flanks. Four short forward-swept wings, hinged at the pods, lie stacked
flat for speed and fan into a shallow X to fight; each carries a stubby
cannon pod at mid-span. Weathered off-white paint with faded terracotta
stripes, carbon scoring behind the guns and nozzles. Markings: STELLAR on
the nose, the full five-cross Georgian flag on the spine.
Deliberately not any film fighter: no wingtip engines, no four-engine
cross, no ball cockpit, no hex panels.

Axes: nose -Y, up +Z, port +X (glTF: forward +Z, up +Y). Units: metres.
Nodes: Wing_PU, Wing_PD, Wing_SU, Wing_SD, origin at the hinge (they roll
about the flight axis). Empties: Engine_{P,S} (scale = core radius),
Cannon_* (children of their wing), Rcs_*, Nav_Port, Nav_Stbd (on the upper
wings), Strobe, Plasma.
"""
import math
import os
import random
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

WHITE = (0.66, 0.64, 0.58, 1)
TERRA = (0.86, 0.42, 0.16, 1)
DARK = (0.05, 0.052, 0.056, 1)
STEEL = (0.2, 0.2, 0.21, 1)
INK = (0.05, 0.05, 0.055, 1)

# Nose and fuselage section: flat deck, chined shoulders, a narrower keel.
PROFILE = [(0.6, 1.0), (1.0, 0.2), (0.75, -0.8), (-0.75, -0.8), (-1.0, 0.2), (-0.6, 1.0)]
STATIONS = [
    (-6.8, 0.07, 0.05, 0, -0.06), (-6.3, 0.28, 0.18, 0, -0.03), (-5.0, 0.52, 0.34, 0, 0.0),
    (-3.2, 0.76, 0.48, 0, 0.05), (-1.6, 0.95, 0.6, 0, 0.1), (-0.2, 1.05, 0.68, 0, 0.12),
    (1.5, 1.1, 0.72, 0, 0.12), (3.5, 1.1, 0.72, 0, 0.12), (4.8, 0.95, 0.62, 0, 0.1), (5.4, 0.7, 0.42, 0, 0.08),
]
POD_X, POD_Z, POD_R = 1.55, -0.05, 0.64
CORE_R, WALL_Y = 0.4, 5.2
HINGE_X, HINGE_Y, HINGE_Z = 2.05, 2.0, 0.26
TIP_X = 6.2
CANNON_X = 4.1


def deck(y):
    """Height of the fuselage's flat deck at depth y (for placing parts)."""
    for (y0, _, sz0, _, oz0), (y1, _, sz1, _, oz1) in zip(STATIONS, STATIONS[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            return oz0 + (oz1 - oz0) * t + (sz0 + (sz1 - sz0) * t)
    return 0.0


def mats():
    return {
        'white': hs.paint('Paint', WHITE, seed=3.3, wear=0.8, grime=0.62, panel=(1.1, 0.8, 0.7), seam=0.022, patches=0.18, scorch=0.55),
        'wing': hs.paint('WingPaint', (0.64, 0.62, 0.56, 1), seed=5.1, wear=0.75, grime=0.58, panel=(0.9, 1.3, 0.7), seam=0.022, patches=0.16, scorch=0.45, streak_axis='X'),
        'terra': hs.paint('Terracotta', TERRA, seed=8.2, wear=0.7, grime=0.45, panel=(9, 9, 9), seam=0.001),
        'dark': hs.metal('Machinery', DARK, rough=0.55, metallic=0.5, seed=2.0),
        'steel': hs.metal('Steel', STEEL, rough=0.42, metallic=0.65, seed=4.0),
        'ribs': hs.metal('Nozzle', (0.05, 0.05, 0.055, 1), rough=0.5, metallic=0.55, seed=6.0, ribs=0.12),
        'glass': hs.flat('Canopy', (0.015, 0.02, 0.026, 1), rough=0.05, metallic=0.3, emit=(0.06, 0.08, 0.09, 1)),
        'lamp': hs.flat('Lamp', (1.0, 0.95, 0.85, 1), rough=0.3, emit=(1.0, 0.9, 0.7, 1)),
        'eye': hs.flat('Eye', (0.4, 0.05, 0.02, 1), rough=0.2, emit=(0.9, 0.25, 0.08, 1)),
        'ink': hs.flat('Ink', INK, rough=0.6),
    }


def box(p, m, name, size, loc, mat, bevel=0.03, node=0, rot=None):
    b = model.box(name, size, loc)
    if rot:
        b.rotation_euler = rot
    model.bevel(b, bevel, p.seg, 30)
    return p.add(b, m[mat], node)


def fuselage(p, m):
    obj = hs.loft('Fuselage', PROFILE, STATIONS)
    obj.data.materials.append(m['white'])
    obj.data.materials.append(m['dark'])
    # Exposed machinery bays on the flanks ahead of the pods and a service
    # trench along the spine behind the droid.
    bays = [
        lambda c, n: -1.6 < c.y < -0.2 and abs(n.x) > 0.7,
        lambda c, n: 1.5 < c.y < 3.5 and n.z < -0.9,
    ]
    for pred in bays:
        idx = [f.index for f in obj.data.polygons if pred(Vector(f.center), Vector(f.normal))]
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.faces.ensure_lookup_table()
        faces = [bm.faces[i] for i in idx]
        bmesh.ops.inset_region(bm, faces=faces, thickness=0.05, depth=-0.1, use_even_offset=True)
        for f in faces:
            f.material_index = 1
        bm.to_mesh(obj.data)
        bm.free()
    model.bevel(obj, 0.035 if p.detail else 0.025, p.seg, 28)
    p.items.append((obj, 0))
    # Nose sensor tip and gun-camera blister.
    p.add(model.cylinder('NoseTip', 0.06, 0.5, 8, location=(0, -6.95, -0.05), rotation=(math.pi / 2, 0, 0)), m['steel'])
    box(p, m, 'Blister', (0.34, 0.6, 0.18), (0, -4.6, -0.3), 'dark')
    # Machinery in the flank bays: pipes and boxes (part in both meshes).
    rnd = random.Random(7)
    for i in range(28 if p.detail else 12):
        s = 1 if i % 2 else -1
        y = rnd.uniform(-1.5, -0.3)
        z = rnd.uniform(-0.25, 0.35)
        size = (0.14, rnd.uniform(0.12, 0.4), rnd.uniform(0.08, 0.25))
        box(p, m, 'Bay', size, (s * (1.0 - 0.03), y, z), 'steel' if i % 3 else 'dark', bevel=0.01)
    for s in (1, -1):
        for dz in (0.28, -0.1):
            p.add(model.cylinder('Duct', 0.05, 1.5, 8, location=(s * 1.02, -0.9, dz), rotation=(math.pi / 2, 0, 0)), m['steel'])
        # Cheek scoops under the cockpit and a cable run along the pod.
        box(p, m, 'Scoop', (0.22, 1.1, 0.26), (s * 0.95, -2.5, -0.12), 'dark', bevel=0.04)
        p.add(model.cylinder('Cable', 0.04, 4.2, 6, location=(s * (POD_X + 0.45), 2.3, POD_Z + 0.42), rotation=(math.pi / 2, 0, 0)), m['steel'])
    # A raked blade antenna on the tail deck.
    blade = model.box('Blade', (0.05, 0.7, 0.55), (0.35, 4.3, deck(4.3) + 0.25))
    blade.rotation_euler = (0.45, 0, 0)
    p.add(model.bevel(blade, 0.015, p.seg, 30), m['dark'])


def cockpit(p, m):
    cx, cz = 0.3, deck(-1.6)
    box(p, m, 'Coaming', (1.25, 3.1, 0.18), (cx - 0.02, -1.5, cz + 0.02), 'dark', bevel=0.04)
    prof = [(0.001, -3.0), (0.26, -2.85), (0.44, -2.45), (0.54, -1.9), (0.55, -1.3), (0.48, -0.75), (0.3, -0.3), (0.001, -0.12)]
    can = hs.lathe('Canopy', prof, 32 if p.detail else 18, location=(cx, 0, cz + 0.08))
    can.scale = (1.0, 1.0, 0.82)
    p.add(can, m['glass'])
    # Frame hoops and a spine rail over the glass.
    for y, r in ((-2.4, 0.45), (-1.6, 0.56), (-0.85, 0.5)):
        hoop = hs.lathe('Hoop', [(r + 0.012, y - 0.04), (r + 0.03, y), (r + 0.012, y + 0.04)], 32 if p.detail else 18, location=(cx, 0, cz + 0.08))
        hoop.scale = (1.0, 1.0, 0.82)
        p.add(hoop, m['dark'])
    rail = model.box('Rail', (0.06, 2.5, 0.05), (cx, -1.6, cz + 0.08 + 0.55 * 0.82 + 0.01))
    p.add(rail, m['dark'])
    # The sensor droid's socket and its squat faceted dome, off to starboard.
    dx, dy = -0.38, 0.55
    dz = deck(dy)
    p.add(hs.lathe('Socket', [(0.52, dz - 0.05), (0.52, dz + 0.1), (0.46, dz + 0.12)], 24 if p.detail else 16, axis='Z', location=(dx, dy, 0)), m['dark'])
    dome = hs.lathe('Dome', [(0.44, dz + 0.1), (0.44, dz + 0.26), (0.36, dz + 0.42), (0.18, dz + 0.5), (0.001, dz + 0.52)], 10, axis='Z', location=(dx, dy, 0), cap_start=True)
    p.add(dome, m['white'])
    p.add(hs.lathe('DomeBand', [(0.448, dz + 0.17), (0.448, dz + 0.24)], 10, axis='Z', location=(dx, dy, 0)), m['terra'])
    box(p, m, 'Eye', (0.14, 0.05, 0.1), (dx, dy - 0.43, dz + 0.3), 'eye', bevel=0.01)


def engine_pod(p, m, s):
    x = s * POD_X
    seg = 40 if p.detail else 24
    prof = [(0.48, -0.25), (POD_R - 0.02, -0.12), (POD_R, 0.1), (POD_R, 4.5), (POD_R - 0.03, 4.9),
            (0.66, 5.0), (0.68, 5.55), (0.6, 5.62), (0.5, 5.45), (CORE_R * 1.05, WALL_Y + 0.01), (0.001, WALL_Y)]
    p.add(hs.lathe('Pod', prof, seg, location=(x, 0, POD_Z)), m['white'])
    # Intake: a dark throat with a fan face and a terracotta lip ring.
    p.add(hs.lathe('Intake', [(0.48, -0.25), (0.42, -0.05), (0.2, 0.15), (0.001, 0.18)], seg, location=(x, 0, POD_Z)), m['dark'])
    p.add(hs.lathe('Lip', [(POD_R + 0.01, 0.15), (POD_R + 0.01, 0.4)], seg, location=(x, 0, POD_Z)), m['terra'])
    p.add(hs.lathe('Collar', [(POD_R + 0.03, 4.2), (POD_R + 0.03, 4.75)], seg, location=(x, 0, POD_Z)), m['ribs'])
    if p.detail:
        for k in range(12):
            a = k * math.pi / 6
            blade = model.box('Blade', (0.04, 0.03, 0.36), (x + math.cos(a) * 0.24, 0.0, POD_Z + math.sin(a) * 0.24))
            blade.rotation_euler = (0.5, -a, 0)
            p.add(blade, m['steel'])
    # Hinge block where the wings meet the pod.
    box(p, m, 'HingeBlock', (0.42, 2.4, 0.9), (s * (POD_X + 0.5), HINGE_Y + 0.2, POD_Z), 'dark', bevel=0.05)
    # Pod machinery: a conduit and access boxes on top.
    p.add(model.cylinder('Conduit', 0.06, 3.4, 8, location=(x + s * 0.2, 2.4, POD_Z + POD_R + 0.02), rotation=(math.pi / 2, 0, 0)), m['steel'])
    box(p, m, 'Access', (0.4, 0.7, 0.12), (x - s * 0.15, 3.9, POD_Z + POD_R - 0.02), 'dark', bevel=0.02)
    # Tail RCS on the pod's outer side.
    box(p, m, 'RcsT', (0.14, 0.3, 0.3), (x + s * (POD_R + 0.05), 4.6, POD_Z + 0.1), 'dark', bevel=0.02)


def wing(p, m, s, layer, node):
    """A forward-swept wing panel from the hinge out, with its cannon pod."""
    z = layer * HINGE_Z
    root_le, root_te, tip_le, tip_te = 0.85, 3.35, 0.05, 1.35
    x0, x1 = s * HINGE_X, s * TIP_X
    tr, tt = 0.11, 0.05  # half thickness at root and tip
    bm = bmesh.new()
    pts = [(x0, root_le, tr), (x1, tip_le, tt), (x1, tip_te, tt * 0.6), (x0, root_te, tr * 0.6)]
    top = [bm.verts.new((px, py, z + h)) for px, py, h in pts]
    bot = [bm.verts.new((px, py, z - h)) for px, py, h in pts]
    bm.faces.new(top)
    bm.faces.new(bot[::-1])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((top[i], bot[i], bot[j], top[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new('Wing')
    bm.to_mesh(mesh)
    bm.free()
    w = model.link(bpy.data.objects.new('Wing', mesh))
    model.bevel(w, 0.03 if p.detail else 0.02, p.seg, 30)
    p.add(w, m['wing'], node)
    # A spar fairing along the span and a dark flap strip on the trailing edge.
    span = Vector((x1 - x0, (tip_le + tip_te) / 2 - (root_le + root_te) / 2, 0))
    mid = Vector((x0, (root_le + root_te) / 2 - 0.35, z + layer * (tr * 0.9))) + span * 0.5
    spar = model.box('Spar', (span.length * 0.92, 0.22, 0.07), mid)
    spar.rotation_euler = (0, 0, math.atan2(span.y, span.x))
    p.add(model.bevel(spar, 0.02, p.seg, 30), m['steel'], node)
    te_mid = Vector(((x0 + x1) / 2, (root_te + tip_te) / 2 - 0.12, z))
    te_dir = Vector((x1 - x0, tip_te - root_te, 0))
    flap = model.box('Flap', (te_dir.length * 0.9, 0.24, 0.12), te_mid)
    flap.rotation_euler = (0, 0, math.atan2(te_dir.y, te_dir.x))
    p.add(model.bevel(flap, 0.015, p.seg, 30), m['dark'], node)
    # Cannon pod at mid-span on the outer face of the wing.
    t = (abs(CANNON_X) - HINGE_X) / (TIP_X - HINGE_X)
    le = root_le + (tip_le - root_le) * t
    cz = z + layer * 0.19
    pod = model.cylinder('GunPod', 0.16, 1.6, 12, location=(s * CANNON_X, le + 0.55, cz), rotation=(math.pi / 2, 0, 0))
    p.add(model.bevel(pod, 0.02, p.seg, 40), m['dark'], node)
    p.add(model.cylinder('Sleeve', 0.1, 0.7, 10, location=(s * CANNON_X, le - 0.5, cz), rotation=(math.pi / 2, 0, 0)), m['ribs'], node)
    p.add(model.cylinder('Barrel', 0.06, 1.5, 10, location=(s * CANNON_X, le - 1.25, cz), rotation=(math.pi / 2, 0, 0)), m['steel'], node)
    p.add(model.cylinder('Muzzle', 0.085, 0.26, 10, location=(s * CANNON_X, le - 1.95, cz), rotation=(math.pi / 2, 0, 0)), m['dark'], node)
    # Wingtip cap; the upper wings carry the position lights.
    box(p, m, 'Tip', (0.16, tip_te - tip_le + 0.1, 0.16), (x1 + s * 0.05, (tip_le + tip_te) / 2, z), 'dark', bevel=0.03, node=node)
    if layer > 0:
        box(p, m, 'NavLamp', (0.06, 0.22, 0.08), (x1 + s * 0.11, tip_le + 0.25, z), 'lamp', bevel=0.01, node=node)
    # Actuator fairing at the root.
    box(p, m, 'Root', (0.4, 1.6, 0.2), (x0 + s * 0.15, 2.1, z), 'steel', bevel=0.03, node=node)


def nose_rcs(p, m):
    for s in (1, -1):
        box(p, m, 'RcsN', (0.12, 0.28, 0.2), (s * 0.78, -3.4, 0.12), 'dark', bevel=0.015)
        box(p, m, 'RcsB', (0.18, 0.14, 0.18), (s * POD_X, -0.3, POD_Z - POD_R - 0.02), 'dark', bevel=0.015)
    for y in (-3.4, 4.6):
        box(p, m, 'RcsTop', (0.26, 0.26, 0.1), (0, y, deck(y) + 0.04), 'dark', bevel=0.015)
        box(p, m, 'RcsBelly', (0.26, 0.26, 0.1), (0, y, 0.1 - 0.8 * (deck(y) - 0.1) - 0.04), 'dark', bevel=0.015)


def markings(p, m):
    flag = decal.georgian_flag('GeorgianFlag', 300, 200)
    flag_mat = hs.image_mat('Flag', flag, rough=0.5)
    p.add(hs.plate('FlagSpine', 0.9, 0.6, (0, 3.9, deck(3.9) + 0.004), (0, 1, 0), (-1, 0, 0)), flag_mat)
    # STELLAR on the nose's upper chines, reading forward to aft on each side.
    y = -4.15
    t = (y - (-5.0)) / (-3.2 - (-5.0))
    sx = 0.52 + (0.76 - 0.52) * t
    sz = 0.34 + (0.48 - 0.34) * t
    oz = 0.05 * t
    for s in (1, -1):
        pa = Vector((s * 1.0 * sx, y, oz + 0.2 * sz))
        pb = Vector((s * 0.6 * sx, y, oz + 1.0 * sz))
        up = (pb - pa).normalized()
        right = Vector((0, s, 0))
        n = right.cross(up).normalized()
        w = decal.wordmark('STELLAR', 0.2, (0, 0, 0), (0, 0, 0), extrude=0.0, name='WordNose')
        hs.orient(w, (pa + pb) / 2 + n * 0.004, right, up)
        p.add(w, m['ink'])
    # Faded terracotta stripes: two bands over the nose deck, two on each wing.
    for y in (-4.5, -4.15):
        z = deck(y)
        w = 0.6 * (0.52 + (0.76 - 0.52) * (y + 5.0) / 1.8) * 2
        p.add(hs.plate('StripeNose', w, 0.2, (0, y, z + 0.003), (1, 0, 0), (0, 1, 0)), m['terra'])


def wing_stripes(p, m, s, layer, node):
    """High-poly only: stripes across the outer third of each wing's visible face."""
    z = layer * HINGE_Z + layer * (0.06 + 0.003)
    for x in (5.0, 5.35):
        t = (x - HINGE_X) / (TIP_X - HINGE_X)
        le = 0.85 + (0.05 - 0.85) * t
        te = 3.35 + (1.35 - 3.35) * t
        pl = hs.plate('StripeWing', te - le - 0.1, 0.2, (s * x, (le + te) / 2, z), (0, 1, 0), (-layer, 0, 0))
        p.add(pl, m['terra'], node)


WINGS = [(1, 1, 1, 'Wing_PU'), (1, -1, 2, 'Wing_PD'), (-1, 1, 3, 'Wing_SU'), (-1, -1, 4, 'Wing_SD')]


def build_ship(p):
    m = mats()
    fuselage(p, m)
    cockpit(p, m)
    for s in (1, -1):
        engine_pod(p, m, s)
    for s, layer, node, _ in WINGS:
        wing(p, m, s, layer, node)
        if p.detail:
            wing_stripes(p, m, s, layer, node)
    nose_rcs(p, m)
    if p.detail:
        markings(p, m)


def empties(root, objs):
    def e(name, loc, parent=root, scale=0.15):
        o = hs.empty(name, loc, parent)
        o.scale = (scale, scale, scale)
        return o
    for s, tag in ((1, 'P'), (-1, 'S')):
        e(f'Engine_{tag}', (s * POD_X, WALL_Y, POD_Z), scale=CORE_R)
        e(f'Rcs_B_{tag}', (s * POD_X, -0.45, POD_Z - POD_R - 0.1))
    e('Rcs_N_PX', (0.95, -3.4, 0.12))
    e('Rcs_N_NX', (-0.95, -3.4, 0.12))
    e('Rcs_T_PX', (POD_X + POD_R + 0.25, 4.6, POD_Z + 0.1))
    e('Rcs_T_NX', (-POD_X - POD_R - 0.25, 4.6, POD_Z + 0.1))
    for y, tag in ((-3.4, 'N'), (4.6, 'T')):
        e(f'Rcs_{tag}_PY', (0, y, deck(y) + 0.2))
        e(f'Rcs_{tag}_NY', (0, y, 0.1 - 0.8 * (deck(y) - 0.1) - 0.2))
    for s, layer, _, name in WINGS:
        w = objs[name]
        t = (CANNON_X - HINGE_X) / (TIP_X - HINGE_X)
        le = 0.85 + (0.05 - 0.85) * t
        e('Cannon_' + name[5:], (s * CANNON_X, le - 2.15, layer * HINGE_Z + layer * 0.19), parent=w)
        if layer > 0:
            e('Nav_Port' if s > 0 else 'Nav_Stbd', (s * (TIP_X + 0.16), 0.3, layer * HINGE_Z), parent=w, scale=0.08)
    e('Strobe', (-0.38, 0.55, deck(0.55) + 0.56), scale=0.06)
    e('Plasma', (0, -7.0, -0.05))


def pose_open(objs):
    """For the sheet: the wings fanned into their fighting X."""
    for s, layer, _, name in WINGS:
        objs[name].rotation_euler = (0, -layer * s * 0.34, 0)


def main():
    scene.reset(seed=31)
    nodes = [(nid, name, (s * HINGE_X, HINGE_Y, layer * HINGE_Z)) for s, layer, nid, name in WINGS]
    counts = vehicle.build('ShipFighter', build_ship, OUT, RENDERS, nodes=nodes, empties_fn=empties,
                           cage=0.06, pose_fn=pose_open)
    print('fighter:', counts)


main()
