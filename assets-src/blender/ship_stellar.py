"""The STELLAR exploration craft: the player's survey ship in Explore Mode.

Run:  Blender -b -P assets-src/blender/ship_stellar.py -- <out-dir> [renders-dir]
Writes <out-dir>/ship_stellar.glb (raw; optimise it with gltf-transform).

Spec (from ~/Desktop/stellar-explore/refs/ship/spaceship.png; NOTES.md rules):
18.4 × 12.1 × 5.8 m. A faceted armoured central hull: big bolted plates over
the cheeks, the forward body and the aft module, each spanning several of the
hull's own stations, the gunmetal hull showing in the gaps (a few left off
over machinery);
pitted, rust-spotted and grimy off-white paint; a dark recessed machinery
ring amidships and a dark aft housing. A faceted canopy of big angled panes
in thick frames, STELLAR on the nose cheeks, a black vent box low on each
cheek. Two boxy pods (the hull's chamfered section) on dark pylons with an
amber equipment box: a blunt nose with an intake ring and a red lamp, plated
forward, a dark ribbed sleeve, a plated band, then a big round engine with a
dark ribbed shroud and a hot core; a larger central engine aft and two cold
ribbed nozzles on the aft flanks; each engine's shroud flares to a lipped
bell over a deep throat. Amber accent strips. On the spine: the
comms mast, a whip antenna, the dish on a gimbal and a camera turret. Three
chunky hydraulic legs on fore-aft skids, on their own node (`Gear`, hidden
in flight). Markings: STELLAR on the cheeks and pods, the full five-cross
Georgian flag on the pods, the hull sides and the spine (never a lone
cross, as the image has).

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

WHITE = (0.88, 0.87, 0.83, 1)
DARK = (0.04, 0.042, 0.046, 1)
STEEL = (0.19, 0.195, 0.2, 1)
AMBER = (0.93, 0.45, 0.1, 1)
INK = (0.05, 0.05, 0.055, 1)

# Hull cross-section: flat top and belly, chamfered shoulders, upright sides.
PROFILE = [(0.42, 1.0), (0.82, 0.8), (1.0, 0.32), (1.0, -0.3), (0.78, -0.78), (0.4, -0.95),
           (-0.4, -0.95), (-0.78, -0.78), (-1.0, -0.3), (-1.0, 0.32), (-0.82, 0.8), (-0.42, 1.0)]
HW, HH, HZ = 2.55, 1.66, 0.08  # hull half-width, half-height, centre height
# Stations close enough to hold the silhouette; the armour is cut coarser
# (PLATE_STATIONS below), so a plate spans several of them.
STATIONS = [
    (-9.2, 0.36, 0.28, 0, -0.42), (-8.7, 0.95, 0.72, 0, -0.3), (-7.6, 1.55, 1.12, 0, -0.1),
    (-6.2, 2.05, 1.45, 0, 0.02), (-4.6, 2.42, 1.62, 0, HZ), (-3.4, HW, HH, 0, HZ), (-2.2, HW, HH, 0, HZ),
    (-1.0, HW, HH, 0, HZ), (0.4, HW, HH, 0, HZ), (2.6, HW, HH, 0, HZ), (3.5, HW, HH, 0, HZ),
    (4.4, 2.45, 1.62, 0, HZ), (5.0, 2.3, 1.55, 0, HZ), (7.0, 1.95, 1.36, 0, HZ),
]
TOP = HZ + HH  # the spine deck
BELLY = HZ - HH * 0.95
PLATE = 0.09  # armour plate thickness
# Armour is cut coarser than the hull: a plate spans several stations, so the
# panels read as the reference's big bolted sheets rather than a fine quilt.
PLATE_STATIONS = [
    (-6.2, 2.05, 1.45, 0, 0.02), (-4.6, 2.42, 1.62, 0, HZ), (-3.4, HW, HH, 0, HZ),
    (-1.0, HW, HH, 0, HZ), (0.8, HW, HH, 0, HZ), (2.2, HW, HH, 0, HZ), (3.5, HW, HH, 0, HZ),
    (5.0, 2.3, 1.55, 0, HZ),
]
POD_X, POD_Z, POD_R = 4.65, 0.0, 1.3
POD_FLAT = POD_R * math.cos(math.pi / 8)  # the pod's half-width to its flat sides
# The pods: boxy, the hull's own chamfered section; a blunt nose with an
# intake ring, plated forward, a dark ribbed sleeve, a plated band, the engine.
POD_STATIONS = [
    (-6.7, 0.72, 0.72), (-6.3, 1.02, 1.02), (-5.3, POD_FLAT, POD_FLAT), (-4.2, POD_FLAT, POD_FLAT),
    (-3.1, POD_FLAT, POD_FLAT), (-2.0, POD_FLAT, POD_FLAT), (-0.9, POD_FLAT, POD_FLAT), (0.2, POD_FLAT, POD_FLAT),
    (1.8, POD_FLAT, POD_FLAT), (3.0, POD_FLAT, POD_FLAT), (4.3, POD_FLAT, POD_FLAT),
]
POD_PLATE_STATIONS = [
    (-5.3, POD_FLAT, POD_FLAT), (-3.6, POD_FLAT, POD_FLAT), (-2.0, POD_FLAT, POD_FLAT),
    (0.2, POD_FLAT, POD_FLAT), (1.8, POD_FLAT, POD_FLAT), (3.0, POD_FLAT, POD_FLAT), (4.3, POD_FLAT, POD_FLAT),
]
POD_ENG_R = 1.4
MAIN_R = 1.55


def mats():
    return {
        'white': hs.paint('Plating', WHITE, seed=1.3, wear=0.34, grime=0.2, panel=(1.45, 1.05, 0.85), seam=0.03, patches=0.12, pits=0.42, pit_scale=1.9),
        'white2': hs.paint('PlatingPods', (0.86, 0.85, 0.81, 1), seed=2.7, wear=0.34, grime=0.22, panel=(1.2, 0.95, 0.8), seam=0.03, patches=0.12, pits=0.42, pit_scale=1.9),
        'dark': hs.metal('Machinery', DARK, rough=0.5, metallic=0.5, seed=3.0),
        'steel': hs.metal('Steel', STEEL, rough=0.4, metallic=0.65, seed=4.0),
        'ribs': hs.metal('Shroud', (0.045, 0.047, 0.05, 1), rough=0.45, metallic=0.55, seed=5.0, ribs=0.16),
        'vent': hs.metal('Vent', (0.04, 0.042, 0.045, 1), rough=0.55, metallic=0.4, seed=6.0, ribs=0.09, rib_axis='X'),
        'amber': hs.paint('Amber', AMBER, seed=7.0, wear=0.4, grime=0.3, panel=(9, 9, 9), seam=0.001, rough=0.5),
        'glass': hs.flat('Canopy', (0.012, 0.018, 0.024, 1), rough=0.06, metallic=0.3, emit=(0.05, 0.085, 0.1, 1), emit_strength=1.0),
        'lamp': hs.flat('Lamp', (1.0, 0.93, 0.8, 1), rough=0.3, emit=(1.0, 0.86, 0.62, 1), emit_strength=1.0),
        'red': hs.flat('RedLamp', (1.0, 0.2, 0.15, 1), rough=0.3, emit=(1.0, 0.12, 0.08, 1), emit_strength=1.0),
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


def set_faces(obj, idx, mat_index):
    for i in idx:
        obj.data.polygons[i].material_index = mat_index


def plates(src, idx, name, thick, gap, skip=0.0, seed=1, keep=None, omit=None):
    """Armour: one raised plate over each of the hull's faces in `idx`, pulled
    in by `gap` from every edge so the dark hull shows between the plates, and
    thickened outward. `skip` leaves that share of plates off (exposed
    machinery); `keep(centre)` marks plates that must stay (a flag's),
    `omit(centre)` ones that must go (over a lamp)."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    src_bm = bmesh.new()
    src_bm.from_mesh(src.data)
    src_bm.faces.ensure_lookup_table()
    for i in idx:
        f = src_bm.faces[i]
        c = f.calc_center_median()
        if skip and rnd.random() < skip and not (keep and keep(c)) or omit and omit(c):
            continue
        half = min(e.calc_length() for e in f.edges) / 2
        k = max(0.55, 1 - gap / max(half, 1e-3))
        vs = [bm.verts.new(c + (v.co - c) * k) for v in f.verts]
        bm.faces.new(vs)
    src_bm.free()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = model.link(bpy.data.objects.new(name, mesh))
    mod = obj.modifiers.new('Solid', 'SOLIDIFY')
    mod.thickness = thick
    mod.offset = 1.0
    model.apply_modifier(obj, mod)
    return obj


def armour(name, profile, stations, pred, thick, gap, **kw):
    """Plates cut from a coarser shell than the hull carries: the shell is
    lofted from `stations` (which coincide with the hull's own surface), its
    faces picked by `pred`, and the shell itself thrown away."""
    shell = hs.loft(name + 'Shell', profile, stations)
    idx = faces_where(shell, pred)
    obj = plates(shell, idx, name, thick, gap, **kw)
    bpy.data.objects.remove(shell, do_unlink=True)
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
    obj.data.materials.append(m['steel'])
    # Canopy: every upward-facing facet of the nose, big angled panes in thick frames.
    canopy = faces_where(obj, lambda c, n: -8.75 < c.y < -6.1 and n.z > 0.2)
    inset_faces(obj, canopy, 0.09, -0.05, mat_index=2, individual=True)
    # Dark machinery, recessed: the mid-body ring and the aft housing.
    for pred in (
        lambda c, n: 0.8 < c.y < 2.2 and abs(n.y) < 0.5,
        lambda c, n: 5.0 < c.y < 7.0 and abs(n.y) < 0.6,
    ):
        inset_faces(obj, faces_where(obj, pred), 0.06, -0.14, mat_index=1)
    # Under the armour the hull is gunmetal: plates over the cheeks, the forward
    # body and the aft module, one per facet, the gaps between them dark.
    armoured = faces_where(obj, lambda c, n: (-6.2 < c.y < 0.8 or 2.2 < c.y < 5.0) and abs(n.y) < 0.5)
    set_faces(obj, armoured, 3)
    plating = armour('Armour', PROFILE, PLATE_STATIONS,
                     lambda c, n: (-6.2 < c.y < 0.8 or 2.2 < c.y < 5.0) and abs(n.y) < 0.5,
                     PLATE, 0.055, skip=0.1, seed=3,
                     keep=lambda c: abs(c.z - HZ) < 0.9 and -3.4 < c.y < -1.0 or c.z > TOP - 0.1)
    model.bevel(obj, 0.045 if p.detail else 0.03, p.seg, 28)
    p.items.append((obj, 0))
    if p.detail:
        model.bevel(plating, 0.02, 2, 30)
    p.add(plating, m['white'])
    # A black vent box low on each cheek, behind the nose.
    for s in (1, -1):
        p.add(model.bevel(model.box('CheekVent', (0.2, 1.7, 0.55), (s * 1.85, -6.2, -0.45)), 0.03, p.seg), m['vent'])
        # Amber trim: a vertical strip at the back of the flag plate, one along the aft module.
        p.add(model.box('SideStrip', (0.04, 0.16, 0.9), (s * (HW + PLATE + 0.01), 0.25, HZ)), m['amber'])
        p.add(model.box('AftStrip', (0.04, 1.5, 0.1), (s * (HW + PLATE + 0.01), 3.5, HZ + 0.62)), m['amber'])
        p.add(model.box('NoseStrip', (0.04, 0.9, 0.08), (s * 2.3, -5.4, HZ - 0.62)), m['amber'])

    def band_spot(rnd):
        s = rnd.choice((1, -1))
        side = rnd.random() < 0.6
        y = rnd.uniform(0.95, 2.05) if rnd.random() < 0.55 else rnd.uniform(5.15, 6.85)
        if side:
            w = HW - 0.16 if y < 3 else 2.0 - 0.14
            return (s * w, y, rnd.uniform(-0.55, 0.55)), (0, 0, 0), (0.2, rnd.uniform(0.18, 0.5), rnd.uniform(0.12, 0.45))
        return (rnd.uniform(-0.7, 0.7), y, TOP - 0.15), (0, 0, 0), (rnd.uniform(0.15, 0.5), rnd.uniform(0.15, 0.4), 0.18)
    greebles(p, m, 5, 44, 110, band_spot)


def engine(p, m, name, x, z, r, y0, y1):
    """A round engine: ribbed shroud, flared lip, a deep nozzle to a back
    wall where the runtime puts the hot core."""
    seg = 48 if p.detail else 32
    wall = y1 - 0.95 * r
    shroud = [(r * 0.86, y0), (r, y0 + 0.3)]
    # Machined ribs: real geometry in both meshes, finer in the high-poly.
    # They stop short of the mouth, which flares into a lipped bell.
    flare = y1 - 0.62 * r
    step = 0.24 if p.detail else 0.36
    n = max(1, int((flare - (y0 + 0.4)) / step))
    for i in range(n):
        t = y0 + 0.4 + i * step
        if p.detail:
            shroud += [(r, t), (r * 1.04, t + 0.04), (r * 1.04, t + 0.15), (r, t + 0.19)]
        else:
            shroud += [(r, t), (r * 1.04, t + 0.02), (r * 1.04, t + 0.22), (r, t + 0.24)]
    shroud += [(r, flare), (r * 1.1, flare + 0.3 * r), (r * 1.1, y1 - 0.1), (r * 1.13, y1),
               (r * 1.06, y1), (r * 0.98, y1 - 0.3 * r), (r * 0.7, y1 - 0.62 * r), (r * 0.58, wall), (0.001, wall)]
    obj = hs.lathe(name, shroud, seg, location=(x, 0, z))
    p.add(obj, m['ribs'])
    throat = hs.lathe(name + 'Throat', [(r * 0.96, y1 - 0.32 * r), (r * 0.78, y1 - 0.58 * r), (r * 0.62, wall + 0.02)], seg, location=(x, 0, z))
    p.add(throat, m['steel'])
    if p.detail:
        for k in range(8):
            a = k * math.pi / 4
            vane = model.box('Vane', (0.05, 0.2 * r, 0.34 * r), (x + math.cos(a) * 0.45 * r, wall + 0.06, z + math.sin(a) * 0.45 * r))
            vane.rotation_euler = (0, -a, 0)
            p.add(vane, m['steel'])
    band = hs.lathe(name + 'Band', [(r * 1.045, flare - 0.14), (r * 1.045, flare - 0.03)], seg, location=(x, 0, z))
    p.add(band, m['amber'])
    return wall


def pod(p, m, s):
    x = s * POD_X
    obj = hs.loft('Pod', PROFILE, [(y, sx, sz, x, POD_Z) for y, sx, sz in POD_STATIONS])
    obj.data.materials.append(m['white2'])
    obj.data.materials.append(m['dark'])
    obj.data.materials.append(m['steel'])
    # The sleeve section is dark under its ribs; the rest is plated.
    sleeve_faces = faces_where(obj, lambda c, n: 0.55 < c.y < 1.6 and abs(n.y) < 0.5)
    set_faces(obj, sleeve_faces, 1)
    armoured = faces_where(obj, lambda c, n: (-5.3 < c.y < 0.55 or 1.6 < c.y < 4.3) and abs(n.y) < 0.5)
    set_faces(obj, armoured, 2)
    plating = armour('PodArmour', PROFILE, [(y, sx, sz, x, POD_Z) for y, sx, sz in POD_PLATE_STATIONS],
                     lambda c, n: (-5.3 < c.y < 0.55 or 1.6 < c.y < 4.3) and abs(n.y) < 0.5,
                     PLATE, 0.055, skip=0.08, seed=7 + s,
                     keep=lambda c: abs(c.x - x) > POD_FLAT - 0.1 and abs(c.z - POD_Z) < 0.5,
                     omit=lambda c: -5.3 < c.y < -3.6 and abs(c.x - x) > POD_FLAT - 0.1 and abs(c.z - POD_Z) < 0.5)
    model.bevel(obj, 0.04 if p.detail else 0.028, p.seg, 30)
    p.items.append((obj, 0))
    if p.detail:
        model.bevel(plating, 0.02, 2, 30)
    p.add(plating, m['white2'])
    # A ribbed machinery sleeve round the pod's waist, proud of the plating.
    sr = POD_R + 0.08
    sleeve = [(POD_FLAT - 0.02, 0.5), (sr, 0.6)]
    k = 5 if p.detail else 3
    for i in range(k):
        t = 0.7 + i * (0.8 / k)
        sleeve += [(sr, t), (sr + 0.05, t + 0.03), (sr + 0.05, t + 0.14), (sr, t + 0.17)]
    sleeve += [(sr, 1.55), (POD_FLAT - 0.02, 1.68)]
    p.add(hs.lathe('Sleeve', sleeve, 32 if p.detail else 20, location=(x, 0, POD_Z)), m['ribs'])
    engine(p, m, 'PodEngine', x, POD_Z, POD_ENG_R, 4.6, 6.9)
    # The blunt nose: a dark intake ring and its cone.
    p.add(hs.lathe('Intake', [(0.62, -6.66), (0.62, -6.78), (0.48, -6.78), (0.4, -6.7), (0.001, -6.62)], 24 if p.detail else 14, location=(x, 0, POD_Z)), m['dark'])
    top = POD_Z + POD_FLAT + PLATE
    side = POD_FLAT + PLATE
    p.add(model.bevel(model.box('Vent', (0.7, 1.5, 0.08), (x, -3.6, top + 0.03)), 0.015, p.seg), m['vent'])
    p.add(model.box('Strip', (0.6, 0.16, 0.03), (x, -0.95, top + 0.015)), m['amber'])
    p.add(model.box('StripSide', (0.03, 1.6, 0.12), (x + s * (side + 0.01), 3.0, POD_Z + 0.42)), m['amber'])
    p.add(model.box('StripNose', (0.03, 0.14, 0.5), (x + s * (side + 0.01), -5.1, POD_Z)), m['amber'])
    p.add(model.box('StripTop', (0.5, 0.9, 0.03), (x, 2.6, top + 0.015)), m['amber'])
    # Chin gun under the nose of the pod, in a dark housing.
    p.add(model.bevel(model.box('GunHousing', (0.5, 1.6, 0.42), (x, -4.4, POD_Z - POD_FLAT - 0.12)), 0.04, p.seg), m['dark'])
    barrel = model.cylinder('Barrel', 0.075, 1.6, 10, location=(x, -5.6, POD_Z - POD_FLAT - 0.16), rotation=(math.pi / 2, 0, 0))
    p.add(barrel, m['steel'])
    # The nav lamp sits bare on the dark hull, its plate left off.
    p.add(model.box('NavLamp', (0.08, 0.3, 0.16), (x + s * (POD_FLAT + 0.02), -4.6, POD_Z + 0.2)), m['lamp'])
    p.add(model.box('NoseLamp', (0.16, 0.08, 0.12), (x, -6.72, POD_Z + 0.62)), m['red'])
    for y in (-4.0, 4.4):
        rx = x + s * (POD_FLAT + 0.1) if y < 0 else x + s * (POD_ENG_R + 0.16)
        p.add(model.bevel(model.box('Rcs', (0.22, 0.42, 0.42), (rx, y, POD_Z)), 0.03, p.seg), m['dark'])


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
    # The amber equipment box on the pylon, and the actuator arm beside it.
    p.add(model.bevel(model.box('PylonBox', (0.45, 0.6, 0.4), (x - s * 0.2, 0.6, 0.62)), 0.03, p.seg), m['amber'])
    p.add(strut('PylonArm', (x - s * 0.5, -1.0, 0.55), (x + s * 0.4, 0.3, 0.8), 0.09), m['steel'])
    for i in range(5):
        p.add(model.box('Rib', (1.2, 0.07, 0.1), (x - s * 0.05, -1.9 + i * 0.7, 0.49)), m['steel'])


def aux_engines(p, m):
    """Two small dark ribbed nozzles on the aft flanks of the hull (the
    reference's top view), cold: the runtime lights only the three mains."""
    for s in (1, -1):
        r = 0.7
        prof = [(0.5, 4.9), (r, 5.1)]
        for i in range(4 if p.detail else 3):
            t = 5.3 + i * 0.45
            prof += [(r, t), (r * 1.05, t + 0.05), (r * 1.05, t + 0.3), (r, t + 0.35)]
        prof += [(r * 1.06, 7.4), (r * 0.8, 7.4), (r * 0.6, 7.0), (0.001, 7.0)]
        p.add(hs.lathe('AuxEngine', prof, 24 if p.detail else 14, location=(s * 2.3, 0, -0.35)), m['ribs'])


def spine(p, m):
    deck = TOP + PLATE
    # The comms mast (the strobe at its tip) and a second whip antenna.
    p.add(model.cylinder('Mast', 0.05, 1.9, 8, location=(0.6, 2.3, TOP + 0.95)), m['steel'])
    p.add(model.cylinder('Whip', 0.025, 2.4, 6, location=(-1.4, 4.0, TOP + 1.2)), m['steel'])
    p.add(model.box('WhipTip', (0.07, 0.07, 0.14), (-1.4, 4.0, TOP + 2.4)), m['amber'])
    p.add(model.cylinder('MastB', 0.04, 1.1, 8, location=(0.9, 2.9, TOP + 0.55)), m['steel'])
    p.add(model.bevel(model.box('MastPod', (0.18, 0.18, 0.34), (0.6, 2.3, TOP + 1.2)), 0.02, p.seg), m['dark'])
    p.add(model.bevel(model.box('MastBase', (0.6, 1.1, 0.34), (0.7, 2.6, TOP + 0.05)), 0.03, p.seg), m['dark'])
    # The raised aft deck housing (the reference's upper white module), a dark vent on it.
    p.add(model.bevel(model.box('DeckHousing', (2.2, 1.1, 0.6), (0, 3.9, TOP + 0.25)), 0.05, p.seg), m['white'])
    p.add(model.bevel(model.box('DeckVent', (1.4, 0.6, 0.06), (0, 3.9, TOP + 0.57)), 0.015, p.seg), m['vent'])
    p.add(model.box('DeckStrip', (2.22, 0.1, 0.1), (0, 3.33, TOP + 0.45)), m['amber'])
    # Dark machinery along the spine ahead of it.
    for y, h in ((-2.9, 0.3), (0.3, 0.38), (1.7, 0.44)):
        p.add(model.bevel(model.box('SpineGear', (0.8, 0.8, h), (-0.9, y, deck + h / 2 - 0.05)), 0.03, p.seg), m['dark'])
    # The dish on a gimballed post.
    tilt = (math.radians(-38), math.radians(-18), 0)
    dish = hs.lathe('Dish', [(0.001, 0.0), (0.4, 0.06), (0.75, 0.18), (1.05, 0.36), (1.02, 0.4), (0.74, 0.24), (0.39, 0.11), (0.001, 0.05)], 28 if p.detail else 18, axis='Z')
    dish.location = (-0.8, 3.1, TOP + 1.2)
    dish.rotation_euler = tilt
    p.add(dish, m['white'])
    p.add(model.cylinder('DishStalk', 0.1, 1.1, 8, location=(-0.8, 3.15, TOP + 0.55)), m['steel'])
    p.add(model.bevel(model.box('Gimbal', (0.36, 0.3, 0.3), (-0.8, 3.15, TOP + 1.0)), 0.03, p.seg), m['dark'])
    feed = model.cylinder('Feed', 0.03, 0.55, 6, location=Vector(dish.location) + Euler(tilt).to_matrix() @ Vector((0, 0, 0.33)), rotation=tilt)
    p.add(feed, m['steel'])
    # The sensor cluster: a camera turret on a post, and boxes on the deck.
    p.add(model.cylinder('SensorPost', 0.09, 0.9, 8, location=(0.15, 1.3, TOP + 0.45)), m['steel'])
    p.add(model.bevel(model.box('SensorHead', (0.34, 0.42, 0.36), (0.15, 1.3, TOP + 1.0)), 0.04, p.seg), m['dark'])
    p.add(model.box('SensorLens', (0.16, 0.04, 0.12), (0.15, 1.08, TOP + 1.02)), m['lamp'])
    p.add(model.bevel(model.box('Sensor', (0.55, 0.55, 0.3), (-0.5, -0.6, deck + 0.1)), 0.04, p.seg), m['dark'])
    p.add(model.bevel(model.box('SensorB', (0.36, 0.36, 0.22), (0.5, -0.2, deck + 0.08)), 0.03, p.seg), m['dark'])
    p.add(model.box('SpineStrip', (0.9, 0.14, 0.03), (0, -3.3, deck + 0.015)), m['amber'])
    for y in (-5.2, 4.8):
        z_top = HZ + 1.62 if y < 0 else TOP - 0.05
        p.add(model.bevel(model.box('RcsTop', (0.42, 0.42, 0.22), (0, y, z_top + 0.08 + (PLATE if y < 0 else 0))), 0.03, p.seg), m['dark'])
        p.add(model.bevel(model.box('RcsBelly', (0.42, 0.42, 0.22), (0, y, BELLY - 0.06 - PLATE)), 0.03, p.seg), m['dark'])
    collar = hs.lathe('Collar', [(1.0, BELLY + 0.02), (1.0, BELLY - 0.14), (0.92, BELLY - 0.2), (0.7, BELLY - 0.2), (0.66, BELLY - 0.12), (0.001, BELLY - 0.12)], 32 if p.detail else 20, axis='Z', location=(0, 1.5, 0))
    p.add(collar, m['dark'])
    for s in (1, -1):
        p.add(model.box('LandingLight', (0.22, 0.12, 0.1), (s * 0.35, -8.35, -0.66)), m['lamp'])


def gear(p, m):
    """Three chunky hydraulic legs, deployed (a nose leg and one under each
    pod): their own node so flight can hide them. Pads on the old ground line."""
    legs = [((0, -5.4, BELLY - 0.05), (0, -6.2, -2.1), (0, -5.9, -2.85), 0)]
    for s in (1, -1):
        legs.append(((s * 4.4, 1.6, POD_Z - POD_FLAT - PLATE), (s * 4.9, 0.9, -2.1), (s * 5.0, 1.5, -2.85), s))
    for mount, knee, ankle, s in legs:
        mount, knee, ankle = Vector(mount), Vector(knee), Vector(ankle)
        p.add(model.bevel(model.box('Hip', (0.6, 0.7, 0.4), mount + Vector((0, 0, 0.05))), 0.04, p.seg), m['dark'], node=1)
        p.add(strut('Upper', mount, knee, 0.26), m['dark'], node=1)
        # The lower leg: a dark cylinder, a bright piston out of it.
        mid = knee + (ankle - knee) * 0.45
        p.add(strut('Lower', knee, mid, 0.2), m['dark'], node=1)
        p.add(strut('Piston', mid, ankle, 0.12), m['steel'], node=1)
        # A hydraulic ram braced from the hull to the knee.
        brace = mount + Vector((0, 1.1, 0.1))
        rmid = brace + (knee - brace) * 0.5
        p.add(strut('RamBody', brace, rmid, 0.12), m['dark'], node=1)
        p.add(strut('Ram', rmid, knee, 0.07), m['steel'], node=1)
        p.add(model.bevel(model.box('Knee', (0.56, 0.56, 0.56), knee), 0.05, p.seg), m['dark'], node=1)
        p.add(model.bevel(model.box('Ankle', (0.42, 0.42, 0.3), ankle - Vector((0, 0, 0.05))), 0.04, p.seg), m['steel'], node=1)
        p.add(model.bevel(model.box('Pad', (0.62, 2.3, 0.18), (ankle.x, ankle.y, -3.01)), 0.05, p.seg), m['dark'], node=1)
        p.add(model.box('PadRim', (0.5, 2.1, 0.07), (ankle.x, ankle.y, -2.89)), m['steel'], node=1)
        for dy in (-0.78, 0.0, 0.78):
            p.add(model.box('PadRib', (0.66, 0.1, 0.1), (ankle.x, ankle.y + dy, -2.94)), m['steel'], node=1)
        p.add(model.box('PadStrip', (0.3, 0.09, 0.03), (ankle.x, ankle.y - 1.12, -2.97)), m['amber'], node=1)


def markings(p, m):
    """High-poly only: flat decals a few millimetres proud of the plating,
    read straight into the colour bake."""
    flag = decal.georgian_flag('GeorgianFlag', 300, 200)
    flag_mat = hs.image_mat('Flag', flag, rough=0.5)
    for s in (1, -1):
        face_x = s * (POD_X + POD_FLAT + PLATE + 0.004)
        right = (0, s, 0)
        w = decal.wordmark('STELLAR', 0.5, (0, 0, 0), (0, 0, 0), extrude=0.0, name='WordPod')
        hs.orient(w, (face_x, -2.55, POD_Z), right, (0, 0, 1))
        p.add(w, m['ink'])
        f = hs.plate('FlagPod', 0.9, 0.6, (face_x, -0.35, POD_Z), right, (0, 0, 1))
        p.add(f, flag_mat)
        # The hull's big side plate carries the flag, as the reference's does.
        f = hs.plate('FlagHull', 0.95, 0.63, (s * (HW + PLATE + 0.004), -1.6, HZ), right, (0, 0, 1))
        p.add(f, flag_mat)
        # Nose cheeks: STELLAR on the raised plate under the canopy.
        a = Vector((s * 2.05, -6.2, 0))
        b = Vector((s * 2.42, -4.6, 0))
        d = (b - a).normalized()
        n = Vector((d.y, -d.x, 0)) * s
        origin = (a + b) / 2 + n * (PLATE + 0.006) + Vector((0, 0, 0.05))
        w = decal.wordmark('STELLAR', 0.34, (0, 0, 0), (0, 0, 0), extrude=0.0, name='WordCheek')
        hs.orient(w, origin, d if s > 0 else -d, (0, 0, 1))
        p.add(w, m['ink'])
    f = hs.plate('FlagSpine', 1.1, 0.73, (0, -1.6, TOP + PLATE + 0.004), (0, 1, 0), (-1, 0, 0))
    p.add(f, flag_mat)


def build_ship(p):
    m = mats()
    hull(p, m)
    for s in (1, -1):
        pod(p, m, s)
        pylons(p, m, s)
    engine(p, m, 'MainEngine', 0, HZ, MAIN_R, 7.0, 9.2)
    aux_engines(p, m)
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
