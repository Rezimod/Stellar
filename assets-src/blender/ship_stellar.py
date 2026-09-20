"""The STELLAR exploration craft: the player's survey ship in Explore Mode.

Run:  Blender -b -P assets-src/blender/ship_stellar.py -- <out-dir> [renders-dir]
Writes <out-dir>/ship_stellar.glb (raw; optimise it with gltf-transform).

Spec (from ~/Desktop/stellar-refs/ship/spaceship.png; NOTES.md rules):
18.4 × 12.1 × 5.8 m. A faceted armoured central hull with a wraparound
faceted canopy at the nose; two long faceted nacelle pods on short dark
pylons, each ending in a big round engine with a dark ribbed shroud and a
hot core; a larger central engine aft; off-white weathered plating over
dark mechanical bands, small amber accent strips, vent grilles on the pods,
an antenna mast and dish on the spine, a docking collar under the belly and
four landing legs on their own node (`Gear`, hidden in flight). Markings:
STELLAR on the nose cheeks and the pods, the full five-cross Georgian flag
on the pods and the spine (never a lone cross, as the image has).

Axes: nose -Y, up +Z, port +X (glTF: forward +Z, up +Y). Units: metres.
Empties for the runtime: Engine_* (scale = core radius), Rcs_{N,T}_{PX,NX,
PY,NY} and Rcs_B_{P,S} (nose ring, tail ring, brake), Cannon_{P,S},
Nav_Port, Nav_Stbd, Strobe, Plasma.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Euler, Vector  # noqa: E402
import scene, model, decal, vehicle  # noqa: E402
import hardsurface as hs  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, '..', 'build')
RENDERS = argv[1] if len(argv) > 1 else None

WHITE = (0.68, 0.67, 0.63, 1)
DARK = (0.05, 0.053, 0.058, 1)
STEEL = (0.19, 0.195, 0.2, 1)
AMBER = (0.93, 0.45, 0.1, 1)
INK = (0.05, 0.05, 0.055, 1)

# Hull cross-section: flat top and belly, chamfered shoulders, upright sides.
PROFILE = [(0.42, 1.0), (0.82, 0.8), (1.0, 0.32), (1.0, -0.3), (0.78, -0.78), (0.4, -0.95),
           (-0.4, -0.95), (-0.78, -0.78), (-1.0, -0.3), (-1.0, 0.32), (-0.82, 0.8), (-0.42, 1.0)]
HW, HH, HZ = 2.35, 1.66, 0.08  # hull half-width, half-height, centre height
STATIONS = [
    (-9.2, 0.36, 0.28, 0, -0.42), (-8.7, 0.95, 0.72, 0, -0.3), (-7.6, 1.55, 1.12, 0, -0.1),
    (-6.2, 2.0, 1.45, 0, 0.02), (-4.6, 2.3, 1.62, 0, HZ), (-3.0, HW, HH, 0, HZ),
    (-1.4, HW, HH, 0, HZ), (0.2, HW, HH, 0, HZ), (0.6, HW, HH, 0, HZ),
    (4.4, 2.3, 1.62, 0, HZ), (5.0, 2.2, 1.55, 0, HZ), (7.0, 1.9, 1.36, 0, HZ),
]
TOP = HZ + HH  # the spine deck
BELLY = HZ - HH * 0.95
POD_X, POD_Z, POD_R = 4.65, 0.0, 1.3
POD = [(0.3, -6.7), (0.92, -6.05), (1.22, -5.0), (POD_R, -3.9), (POD_R, -1.9), (POD_R, -0.7), (POD_R, 1.9), (1.24, 2.45)]
POD_FLAT = POD_R * math.cos(math.pi / 8)  # distance to a facet of the octagon
POD_ENG_R = 1.4
MAIN_R = 1.55


def mats():
    return {
        'white': hs.paint('Plating', WHITE, seed=1.3, wear=0.45, grime=0.45, panel=(1.45, 1.05, 0.85), seam=0.03, patches=0.1),
        'white2': hs.paint('PlatingPods', (0.66, 0.65, 0.62, 1), seed=2.7, wear=0.5, grime=0.48, panel=(1.2, 0.95, 0.8), seam=0.03, patches=0.12),
        'dark': hs.metal('Machinery', DARK, rough=0.5, metallic=0.5, seed=3.0),
        'steel': hs.metal('Steel', STEEL, rough=0.4, metallic=0.65, seed=4.0),
        'ribs': hs.metal('Shroud', (0.045, 0.047, 0.05, 1), rough=0.45, metallic=0.55, seed=5.0, ribs=0.16),
        'vent': hs.metal('Vent', (0.04, 0.042, 0.045, 1), rough=0.55, metallic=0.4, seed=6.0, ribs=0.09, rib_axis='X'),
        'amber': hs.paint('Amber', AMBER, seed=7.0, wear=0.3, grime=0.2, panel=(9, 9, 9), seam=0.001, rough=0.5),
        'glass': hs.flat('Canopy', (0.012, 0.018, 0.024, 1), rough=0.06, metallic=0.3, emit=(0.05, 0.085, 0.1, 1), emit_strength=1.0),
        'lamp': hs.flat('Lamp', (1.0, 0.93, 0.8, 1), rough=0.3, emit=(1.0, 0.86, 0.62, 1), emit_strength=1.0),
        'ink': hs.flat('Ink', INK, rough=0.6),
    }


def faces_where(obj, pred):
    return [p.index for p in obj.data.polygons if pred(Vector(p.center), Vector(p.normal))]


def inset_faces(obj, idx, thickness, depth, mat_index=None, individual=False):
    """Inset (and sink) faces; the inner faces take `mat_index`."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    faces = [bm.faces[i] for i in idx]
    if individual:
        bmesh.ops.inset_individual(bm, faces=faces, thickness=thickness, depth=depth, use_even_offset=True)
    else:
        bmesh.ops.inset_region(bm, faces=faces, thickness=thickness, depth=depth, use_even_offset=True)
    if mat_index is not None:
        for f in faces:
            f.material_index = mat_index
    bm.to_mesh(obj.data)
    bm.free()


def skin(src, pred, name, thick, shrink=0.97):
    """A raised armour plate: the hull's own faces, copied, pulled in a
    touch at the edges and thickened outward."""
    bm = bmesh.new()
    bm.from_mesh(src.data)
    keep = {f for f in bm.faces if pred(f.calc_center_median(), f.normal)}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context='FACES')
    c = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
    for v in bm.verts:
        v.co = c + (v.co - c) * Vector((1.0, shrink, shrink))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = model.link(bpy.data.objects.new(name, mesh))
    mod = obj.modifiers.new('Solid', 'SOLIDIFY')
    mod.thickness = thick
    mod.offset = 1.0
    model.apply_modifier(obj, mod)
    return obj


def strut(name, a, b, r, segments=8):
    a, b = Vector(a), Vector(b)
    d = b - a
    obj = model.cylinder(name, r, d.length, segments, location=(a + b) / 2)
    obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return obj


def greebles(p, m, seed, n_low, n_high, place):
    """Machinery on the dark bands: the first `n_low` exist in both passes
    (so the bake agrees with the game mesh), the rest only in the high-poly."""
    rnd = random.Random(seed)
    for i in range(n_high if p.detail else n_low):
        loc, rot, size = place(rnd)
        g = model.box('Greeble', size, loc)
        g.rotation_euler = rot
        if p.detail:
            model.bevel(g, 0.012, 2, 30)
        p.add(g, m['steel'] if i % 3 else m['dark'])


def hull(p, m):
    obj = hs.loft('Hull', PROFILE, STATIONS)
    obj.data.materials.append(m['white'])
    obj.data.materials.append(m['dark'])
    obj.data.materials.append(m['glass'])
    # Canopy: every upward-facing facet of the nose, thin-framed and sunk.
    canopy = faces_where(obj, lambda c, n: -8.75 < c.y < -6.1 and n.z > 0.2)
    inset_faces(obj, canopy, 0.05, -0.035, mat_index=2, individual=True)
    # Dark machinery bands, recessed: the mid-body ring, the aft housing and
    # the side vents behind the nose cheeks.
    for pred in (
        lambda c, n: -1.4 < c.y < 0.2 and abs(n.y) < 0.5,
        lambda c, n: 5.0 < c.y < 7.0 and abs(n.y) < 0.6,
        lambda c, n: -4.6 < c.y < -3.0 and abs(n.x) > 0.8,
    ):
        inset_faces(obj, faces_where(obj, pred), 0.06, -0.12, mat_index=1)
    model.bevel(obj, 0.045 if p.detail else 0.03, p.seg, 28)
    p.items.append((obj, 0))
    # Raised plates: the nose cheeks (under the canopy), the flanks, the spine.
    for nm, pred in (
        ('Cheek', lambda c, n: -6.2 < c.y < -4.6 and abs(n.z) < 0.3 and abs(n.x) > 0.8),
        ('Flank', lambda c, n: 0.6 < c.y < 4.4 and n.z > 0.2 and abs(n.x) > 0.2),
        ('Spine', lambda c, n: -3.0 < c.y < -1.4 and n.z > 0.9),
        ('Belly', lambda c, n: 0.6 < c.y < 4.4 and n.z < -0.9),
    ):
        plate = skin(obj, pred, nm, 0.08)
        model.bevel(plate, 0.025 if p.detail else 0.02, p.seg, 30)
        p.add(plate, m['white'])

    def band_spot(rnd):
        s = rnd.choice((1, -1))
        side = rnd.random() < 0.6
        y = rnd.uniform(-1.25, 0.05) if rnd.random() < 0.5 else rnd.uniform(5.15, 6.85)
        if side:
            w = HW - 0.14 if y < 1 else 2.0 - 0.14
            return (s * w, y, rnd.uniform(-0.5, 0.5)), (0, 0, 0), (0.18, rnd.uniform(0.18, 0.5), rnd.uniform(0.12, 0.45))
        return (rnd.uniform(-0.6, 0.6), y, TOP - 0.13), (0, 0, 0), (rnd.uniform(0.15, 0.5), rnd.uniform(0.15, 0.4), 0.16)
    greebles(p, m, 5, 40, 90, band_spot)


def engine(p, m, name, x, z, r, y0, y1):
    """A round engine: ribbed shroud, flared lip, a deep nozzle to a back
    wall where the runtime puts the hot core."""
    seg = 48 if p.detail else 32
    wall = y1 - 0.95 * r
    shroud = [(r * 0.86, y0), (r, y0 + 0.3)]
    # Machined ribs: real geometry in both meshes, finer in the high-poly.
    step = 0.22 if p.detail else 0.33
    n = int((y1 - 0.55 - (y0 + 0.4)) / step)
    for i in range(n):
        t = y0 + 0.4 + i * step
        if p.detail:
            shroud += [(r, t), (r * 1.03, t + 0.04), (r * 1.03, t + 0.14), (r, t + 0.18)]
        else:
            shroud += [(r, t), (r * 1.03, t + 0.02), (r * 1.03, t + 0.2), (r, t + 0.22)]
    shroud += [(r, y1 - 0.3), (r * 1.05, y1 - 0.12), (r * 1.05, y1), (r * 0.86, y1), (r * 0.8, y1 - 0.35 * r), (r * 0.62, wall), (0.001, wall)]
    obj = hs.lathe(name, shroud, seg, location=(x, 0, z))
    p.add(obj, m['ribs'])
    throat = hs.lathe(name + 'Throat', [(r * 0.8, y1 - 0.36 * r), (r * 0.74, y1 - 0.2 * r), (r * 0.66, wall + 0.02)], seg, location=(x, 0, z))
    p.add(throat, m['steel'])
    if p.detail:
        for k in range(8):
            a = k * math.pi / 4
            vane = model.box('Vane', (0.05, 0.2 * r, 0.34 * r), (x + math.cos(a) * 0.45 * r, wall + 0.06, z + math.sin(a) * 0.45 * r))
            vane.rotation_euler = (0, -a, 0)
            p.add(vane, m['steel'])
    band = hs.lathe(name + 'Band', [(r * 1.035, y1 - 0.55), (r * 1.035, y1 - 0.44)], seg, location=(x, 0, z))
    p.add(band, m['amber'])
    return wall


def pod(p, m, s):
    x = s * POD_X
    obj = hs.lathe('Pod', POD, 8, location=(x, 0, POD_Z), cap_start=True, phase=math.pi / 8)
    obj.data.materials.append(m['white2'])
    obj.data.materials.append(m['dark'])
    model.apply_transforms(obj)
    model.bevel(obj, 0.04 if p.detail else 0.028, p.seg, 30)
    p.items.append((obj, 0))
    # A ribbed machinery sleeve round the pod's waist, proud of the plating.
    sr = POD_R + 0.1
    sleeve = [(POD_R - 0.02, -2.05), (sr, -1.95)]
    for i in range(5 if p.detail else 3):
        t = -1.85 + i * (1.1 / (5 if p.detail else 3))
        sleeve += [(sr, t), (sr + 0.04, t + 0.03), (sr + 0.04, t + 0.13), (sr, t + 0.16)]
    sleeve += [(sr, -0.65), (POD_R - 0.02, -0.55)]
    p.add(hs.lathe('Sleeve', sleeve, 32 if p.detail else 20, location=(x, 0, POD_Z)), m['ribs'])
    engine(p, m, 'PodEngine', x, POD_Z, POD_ENG_R, 2.3, 6.9)
    top = POD_Z + POD_FLAT
    p.add(model.bevel(model.box('Vent', (0.78, 1.9, 0.08), (x, 0.7, top + 0.03)), 0.015, p.seg), m['vent'])
    p.add(model.box('Strip', (0.6, 0.16, 0.03), (x, -0.45, top + 0.02)), m['amber'])
    p.add(model.box('StripSide', (0.03, 0.9, 0.12), (x + s * (POD_FLAT + 0.01), 2.0, POD_Z + 0.38)), m['amber'])
    p.add(model.box('StripNose', (0.03, 0.14, 0.5), (x + s * (POD_FLAT + 0.01), -3.7, POD_Z)), m['amber'])
    # Chin gun under the nose of the pod, in a dark housing.
    p.add(model.bevel(model.box('GunHousing', (0.5, 1.6, 0.42), (x, -4.4, POD_Z - POD_FLAT - 0.12)), 0.04, p.seg), m['dark'])
    barrel = model.cylinder('Barrel', 0.075, 1.6, 10, location=(x, -5.6, POD_Z - POD_FLAT - 0.16), rotation=(math.pi / 2, 0, 0))
    p.add(barrel, m['steel'])
    p.add(model.box('NavLamp', (0.08, 0.3, 0.16), (x + s * (POD_FLAT + 0.02), -4.6, POD_Z + 0.2)), m['lamp'])
    for y in (-4.0, 4.4):
        rx = x + s * (POD_FLAT + 0.1) if y < 0 else x + s * (POD_ENG_R + 0.16)
        p.add(model.bevel(model.box('Rcs', (0.22, 0.42, 0.42), (rx, y, POD_Z)), 0.03, p.seg), m['dark'])

    def pod_spot(rnd):
        a = rnd.uniform(-1.0, 1.0) + (0 if rnd.random() < 0.5 else math.pi)
        rr = POD_R - 0.12
        return ((x + math.cos(a) * rr, rnd.uniform(-1.8, -0.8), POD_Z + math.sin(a) * rr), (0, -a, 0),
                (rnd.uniform(0.14, 0.3), rnd.uniform(0.15, 0.5), rnd.uniform(0.12, 0.3)))
    greebles(p, m, 11 + s, 10, 22, pod_spot)


def pylons(p, m, s):
    x = s * 2.95
    main = model.bevel(model.box('Pylon', (1.5, 3.4, 0.7), (x, -0.4, 0.1)), 0.05, p.seg)
    p.add(main, m['dark'])
    aft = model.bevel(model.box('PylonAft', (1.3, 0.9, 0.36), (x, 3.3, -0.2)), 0.04, p.seg)
    p.add(aft, m['dark'])
    for dz in (0.52, -0.3):
        pipe = model.cylinder('Pipe', 0.08, 3.9, 8, location=(x + s * 0.3, -0.2, dz), rotation=(math.pi / 2, 0, 0))
        p.add(pipe, m['steel'])
    p.add(model.box('PylonStrip', (1.0, 0.14, 0.03), (x, -2.0, 0.46)), m['amber'])
    for i in range(5):
        p.add(model.box('Rib', (1.2, 0.07, 0.1), (x - s * 0.05, -1.9 + i * 0.7, 0.49)), m['steel'])


def spine(p, m):
    # Antenna masts and the dish aft on the spine.
    p.add(model.cylinder('Mast', 0.05, 1.9, 8, location=(0.6, 2.3, TOP + 0.95)), m['steel'])
    p.add(model.cylinder('MastB', 0.04, 1.1, 8, location=(0.9, 2.9, TOP + 0.55)), m['steel'])
    p.add(model.bevel(model.box('MastPod', (0.16, 0.16, 0.3), (0.6, 2.3, TOP + 1.2)), 0.02, p.seg), m['dark'])
    p.add(model.bevel(model.box('MastBase', (0.55, 1.0, 0.3), (0.7, 2.6, TOP + 0.1)), 0.03, p.seg), m['dark'])
    tilt = (math.radians(-38), math.radians(-18), 0)
    dish = hs.lathe('Dish', [(0.001, 0.0), (0.35, 0.05), (0.65, 0.16), (0.9, 0.31), (0.88, 0.35), (0.64, 0.21), (0.34, 0.1), (0.001, 0.05)], 28 if p.detail else 18, axis='Z')
    dish.location = (-0.8, 3.6, TOP + 1.05)
    dish.rotation_euler = tilt
    p.add(dish, m['white'])
    p.add(model.cylinder('DishStalk', 0.08, 1.0, 8, location=(-0.8, 3.65, TOP + 0.5)), m['steel'])
    feed = model.cylinder('Feed', 0.03, 0.5, 6, location=Vector(dish.location) + Euler(tilt).to_matrix() @ Vector((0, 0, 0.3)), rotation=tilt)
    p.add(feed, m['steel'])
    p.add(model.bevel(model.box('Sensor', (0.5, 0.5, 0.28), (-0.5, -0.6, TOP + 0.02)), 0.04, p.seg), m['dark'])
    p.add(model.bevel(model.box('SensorB', (0.34, 0.34, 0.2), (0.5, -0.2, TOP)), 0.03, p.seg), m['dark'])
    p.add(model.box('SpineStrip', (0.9, 0.14, 0.03), (0, -3.3, TOP + 0.015)), m['amber'])
    for y in (-5.2, 4.8):
        z_top = HZ + 1.62 if y < 0 else TOP - 0.05
        p.add(model.bevel(model.box('RcsTop', (0.42, 0.42, 0.22), (0, y, z_top + 0.08)), 0.03, p.seg), m['dark'])
        p.add(model.bevel(model.box('RcsBelly', (0.42, 0.42, 0.22), (0, y, BELLY - 0.06)), 0.03, p.seg), m['dark'])
    collar = hs.lathe('Collar', [(1.0, BELLY + 0.02), (1.0, BELLY - 0.14), (0.92, BELLY - 0.2), (0.7, BELLY - 0.2), (0.66, BELLY - 0.12), (0.001, BELLY - 0.12)], 32 if p.detail else 20, axis='Z', location=(0, 0.2, 0))
    p.add(collar, m['dark'])
    for s in (1, -1):
        p.add(model.box('LandingLight', (0.22, 0.12, 0.1), (s * 0.35, -8.35, -0.66)), m['lamp'])


def gear(p, m):
    """Four legs, deployed: their own node so flight can hide them."""
    for s in (1, -1):
        for y, ox in ((-5.0, 1.45), (3.4, 1.8)):
            mount = (s * ox, y, BELLY + 0.3)
            knee = (s * (ox + 0.7), y - 0.35, -2.35)
            foot = (s * (ox + 0.8), y - 0.1, -3.0)
            p.add(strut('Upper', mount, knee, 0.18), m['dark'], node=1)
            p.add(strut('Lower', knee, foot, 0.12), m['steel'], node=1)
            p.add(strut('Ram', (s * ox, y + 0.7, BELLY + 0.2), knee, 0.075), m['steel'], node=1)
            p.add(model.bevel(model.box('Pad', (0.9, 0.9, 0.14), (s * (ox + 0.8), y - 0.1, -3.05)), 0.03, p.seg), m['dark'], node=1)
            p.add(model.bevel(model.box('Knee', (0.34, 0.4, 0.4), knee), 0.04, p.seg), m['dark'], node=1)


def markings(p, m):
    """High-poly only: flat decals a few millimetres proud of the plating,
    read straight into the colour bake."""
    flag = decal.georgian_flag('GeorgianFlag', 300, 200)
    flag_mat = hs.image_mat('Flag', flag, rough=0.5)
    for s in (1, -1):
        face_x = s * (POD_X + POD_FLAT + 0.004)
        right = (0, s, 0)
        w = decal.wordmark('STELLAR', 0.55, (0, 0, 0), (0, 0, 0), extrude=0.0, name='WordPod')
        hs.orient(w, (face_x, -3.0 if s > 0 else -3.0, POD_Z), right, (0, 0, 1))
        p.add(w, m['ink'])
        f = hs.plate('FlagPod', 1.05, 0.7, (face_x, 0.9, POD_Z), right, (0, 0, 1))
        p.add(f, flag_mat)
        # Nose cheeks: STELLAR on the raised plate under the canopy.
        a = Vector((s * 2.0, -6.2, 0))
        b = Vector((s * 2.3, -4.6, 0))
        d = (b - a).normalized()
        n = Vector((s * 1.6, -0.3, 0)).normalized()
        origin = (a + b) / 2 + n * 0.086 + Vector((0, 0, 0.05))
        w = decal.wordmark('STELLAR', 0.36, (0, 0, 0), (0, 0, 0), extrude=0.0, name='WordCheek')
        hs.orient(w, origin, d if s > 0 else -d, (0, 0, 1))
        p.add(w, m['ink'])
    f = hs.plate('FlagSpine', 1.2, 0.8, (0, 1.9, TOP + 0.004), (0, 1, 0), (-1, 0, 0))
    p.add(f, flag_mat)


def build_ship(p):
    m = mats()
    hull(p, m)
    for s in (1, -1):
        pod(p, m, s)
        pylons(p, m, s)
    engine(p, m, 'MainEngine', 0, HZ, MAIN_R, 6.6, 9.2)
    spine(p, m)
    gear(p, m)
    if p.detail:
        markings(p, m)


def empties(root, objs):
    def e(name, loc, scale=0.2):
        o = hs.empty(name, loc, root)
        o.scale = (scale, scale, scale)
        return o
    e('Engine_C', (0, 9.2 - 0.95 * MAIN_R, HZ), MAIN_R * 0.62)
    for s, tag in ((1, 'P'), (-1, 'S')):
        x = s * POD_X
        e(f'Engine_{tag}', (x, 6.9 - 0.95 * POD_ENG_R, POD_Z), POD_ENG_R * 0.62)
        e(f'Cannon_{tag}', (x, -6.45, POD_Z - POD_FLAT - 0.16))
        e(f'Rcs_B_{tag}', (x, -6.75, POD_Z - 0.35))
        e('Rcs_N_' + ('PX' if s > 0 else 'NX'), (x + s * (POD_FLAT + 0.3), -4.0, POD_Z))
        e('Rcs_T_' + ('PX' if s > 0 else 'NX'), (x + s * (POD_ENG_R + 0.36), 4.4, POD_Z))
        e('Nav_' + ('Port' if s > 0 else 'Stbd'), (x + s * (POD_FLAT + 0.08), -4.6, POD_Z + 0.2), 0.12)
    e('Rcs_N_PY', (0, -5.2, HZ + 1.62 + 0.3))
    e('Rcs_N_NY', (0, -5.2, BELLY - 0.3))
    e('Rcs_T_PY', (0, 4.8, TOP + 0.25))
    e('Rcs_T_NY', (0, 4.8, BELLY - 0.3))
    e('Strobe', (0.6, 2.3, TOP + 1.92), 0.1)
    e('Plasma', (0, -9.3, -0.3))


def main():
    scene.reset(seed=21)
    counts = vehicle.build('ShipStellar', build_ship, OUT, RENDERS, nodes=[(1, 'Gear', (0, 0, -1.0))],
                           empties_fn=empties, cage=0.1)
    print('stellar:', counts)


main()
