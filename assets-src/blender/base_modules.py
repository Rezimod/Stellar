"""Stellar Base modules: the habitat, airlock, science lab, landing pad and
EVA locker from the reference's modular row, one file beside the kit.

Run:
  Blender -b -P assets-src/blender/base_modules.py -- <out-dir> [renders-dir]
      builds every piece, bakes one shared 2K atlas, writes
      <out-dir>/basemodules.glb (raw; optimise it with gltf-transform) and,
      with a renders dir, a turntable per piece and the lineup.
  Blender -b -P assets-src/blender/base_modules.py -- preview <renders-dir> [HabitatModule,Airlock]
      quick look: the high-poly with its procedural paint, no bake.

Spec (the "modular asset overviews" row of ~/Desktop/stellar-refs/base/
`Moon Base.png`, with `Moon base 2.png` for the habitat in place; NOTES.md
rules): the kit's look, off-white weathered panels over grey machinery and
dark hardware, amber (brass in the image) frame edges, regolith dust from
the ground up, warm-lit windows. Markings: the STELLAR wordmark and the full
five-cross Georgian flag; the image's lone red crosses become the flag, the
pad keeps an "H".

- HabitatModule: a squat sixteen-sided drum, 9 m across and 6 m tall, on a
  dark skirt and legs; a chamfered shoulder, a clerestory band of lit
  windows, a low dome with a hatch, masts and a beacon; the docking door at
  the front, lit windows round the lower tier, a ladder to the roof.
- Airlock: an octagonal capsule on a chassis that docks by its back collar to
  the habitat's front door; the outer dust shutter slides up its guide rails.
- ScienceLab: a long octagonal module in two bays framed in amber, on a
  braced chassis, windows along the front, a door in the end, roof kit.
- LandingPad: an 18 m sintered pad, a raised rim, an amber circle, the H,
  rim lights and two ramps.
- EVARack: an open locker with two suits standing in it.

Every piece is its own root at the origin, footprint centre on the ground,
front toward -Y here (the game's +Z after the Y-up export). Metres.
Named nodes (see PIECES): Airlock_Door (hinge: slides up, game +Y, 0 to
2.3 m), HabitatModule_Windows, ScienceLab_Windows and LandingPad_Lights (lamp
meshes a state hook can switch), and `<Piece>_LOD1` for the modules.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
sys.path.insert(0, HERE)

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
import scene, model, kit  # noqa: E402
import hardsurface as hs  # noqa: E402
import base_kit as bk  # noqa: E402
from base_kit import box, cyl, strut, pipe, sign  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = bool(argv) and argv[0] == 'preview'


def mats():
    m = bk.mats()
    m['gold'] = hs.metal('KitGold', (0.8, 0.52, 0.16, 1), rough=0.15, metallic=1.0, seed=10.0)
    return m


def face_up(o):
    """A flat marking seen only from above: every face turned up."""
    for poly in o.data.polygons:
        if poly.normal.z < 0:
            poly.flip()
    return o


def facet(r, deg, z):
    """A point on a drum's facet `deg` (270 is the front, -Y) at radius r."""
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


def tangent(deg):
    a = math.radians(deg)
    return Vector((-math.sin(a), math.cos(a), 0))


def on_facet(p, size, r, deg, z, mat, node=0, bev=0.0):
    """A box standing on a drum's facet, its -Y face turned outward."""
    o = model.box('Box', size, facet(r + size[1] / 2, deg, z))
    o.rotation_euler = (0, 0, math.radians(deg + 90))
    if bev:
        model.bevel(o, bev, p.seg, 30)
    return p.add(o, mat, node)


# ── HabitatModule ──
H_R = 4.5          # circumradius of the lower tier (16 facets)
H_AP = H_R * math.cos(math.pi / 16)
H_SEG = 16
H_PHASE = math.pi / 16  # a facet square to the front


def habitat(p, m):
    ring = lambda pts, mat, node=0, r_seg=H_SEG: p.add(hs.lathe('Drum', pts, r_seg, axis='Z', phase=H_PHASE), mat, node)  # noqa: E731
    # Dark skirt, the drum, the chamfered shoulder, the clerestory, the dome.
    ring([(4.05, 0.3), (4.2, 0.62), (4.52, 0.72)], m['dark'])
    ring([(4.52, 0.72), (H_R, 0.8), (H_R, 3.55), (3.72, 4.15), (3.72, 4.18)], m['white'])
    ring([(3.72, 4.9), (3.95, 4.98), (3.95, 5.14), (3.62, 5.22), (2.85, 5.58), (1.7, 5.84), (0.001, 5.94)], m['white2'])
    # The clerestory: grey sills, lit glass between them, a mullion at every edge.
    ring([(3.74, 4.16), (3.74, 4.3), (3.7, 4.3)], m['grey'])
    ring([(3.7, 4.78), (3.74, 4.78), (3.74, 4.92)], m['grey'])
    ring([(3.69, 4.3), (3.69, 4.78)], m['glass'], node=2)
    for k in range(H_SEG):
        deg = math.degrees(H_PHASE) + k * 360 / H_SEG
        box(p, (0.1, 0.1, 0.5), facet(3.7, deg, 4.54), m['grey'])
    # A grey band round the lower tier and the drum's foot.
    ring([(H_R + 0.03, 1.72), (H_R + 0.03, 1.88)], m['grey'])
    ring([(H_R + 0.03, 0.8), (H_R + 0.03, 0.95)], m['grey'])
    # Legs: eight struts to broad pads, an amber damper on each.
    for k in range(8):
        deg = 22.5 + k * 45
        top, foot = facet(3.9, deg, 0.62), facet(4.75, deg, 0.1)
        strut(p, top, foot, 0.1, m['steel'], (6, 10))
        strut(p, facet(3.7, deg, 0.35), facet(4.5, deg, 0.25), 0.07, m['amber'], (6, 10))
        box(p, (0.6, 0.6, 0.1), foot - Vector((0, 0, 0.05)), m['dark'], 0.02)
    # The docking door at the front: a proud frame, a dark door with a lit port.
    front = 270
    on_facet(p, (2.1, 0.35, 2.6), H_AP, front, 2.05, m['grey'], bev=0.04)
    on_facet(p, (1.3, 0.1, 1.9), H_AP + 0.35, front, 1.75, m['door'], bev=0.02)
    on_facet(p, (0.34, 0.04, 0.34), H_AP + 0.45, front, 2.25, m['glass'], node=2)
    on_facet(p, (1.9, 0.06, 0.12), H_AP + 0.35, front, 3.2, m['amber'])
    on_facet(p, (0.5, 0.45, 0.18), H_AP, front, 3.5, m['dark'], bev=0.02)
    on_facet(p, (0.36, 0.06, 0.06), H_AP + 0.45, front, 3.43, m['lamp'])
    # Lit windows round the lower tier, each in a grey frame with a hood.
    for deg in (202.5, 337.5, 22.5, 112.5, 157.5, 67.5):
        on_facet(p, (1.0, 0.12, 0.9), H_AP, deg, 2.65, m['grey'], bev=0.02)
        on_facet(p, (0.8, 0.04, 0.7), H_AP + 0.12, deg, 2.65, m['glass'], node=2)
        on_facet(p, (1.1, 0.25, 0.06), H_AP, deg, 3.15, m['dark'])
    # Service hatches and utility boxes low on the drum, amber-trimmed.
    for deg, w in ((225, 0.9), (315, 0.7), (90, 1.1)):
        on_facet(p, (w, 0.14, 0.7), H_AP, deg, 1.3, m['grey'], bev=0.02)
        on_facet(p, (w * 0.8, 0.03, 0.08), H_AP + 0.14, deg, 1.52, m['amber'])
    # Markings: the flag front-left, as the reference's cross; STELLAR front-right.
    sign(p, m, 1.7, 1.13, facet(H_AP, 247.5, 2.75), tangent(247.5), (0, 0, 1), 'flag')
    sign(p, m, 1.65, 0.42, facet(H_AP, 292.5, 3.05), tangent(292.5), (0, 0, 1), ('word', 0.3))
    # A ladder up the right side to the roof, and a conduit beside it.
    lx = 0
    for s in (1, -1):
        a = facet(H_AP + 0.28, lx, 0.8) + tangent(lx) * (s * 0.24)
        strut(p, a, a + Vector((0, 0, 3.4)), 0.03, m['alu'], (4, 8))
    for k in range(10):
        c = facet(H_AP + 0.28, lx, 1.05 + k * 0.32)
        strut(p, c - tangent(lx) * 0.24, c + tangent(lx) * 0.24, 0.02, m['amber'], (4, 6))
    pipe(p, [facet(H_AP + 0.12, 12, 0.1), facet(H_AP + 0.12, 12, 3.4), facet(3.95, 12, 4.05)], 0.06, m['steel'])
    # Roof: the hatch, two masts, a vent box and the red beacon.
    cyl(p, 0.72, 0.28, (0, 0, 6.0), m['grey'], seg=(12, 24), bev=0.02)
    cyl(p, 0.55, 0.08, (0, 0, 6.17), m['dark'], seg=(12, 24))
    box(p, (0.35, 0.12, 0.16), (0.45, 0, 6.2), m['amber'])
    for x, y, h in ((-1.6, 1.2, 1.6), (-1.2, 1.6, 1.1)):
        strut(p, (x, y, 5.6), (x, y, 5.6 + h), 0.035, m['alu'], (4, 8))
    box(p, (0.7, 0.5, 0.35), (1.8, 1.1, 5.72), m['dark'], 0.02)
    box(p, (0.5, 0.4, 0.05), (1.8, 1.1, 5.92), m['vent'])
    cyl(p, 0.1, 0.18, (-1.6, 1.2, 7.25), m['red'], seg=(8, 12))


# ── Airlock ──
A_R = 1.3            # capsule circumradius (octagon)
A_Z = 1.62           # capsule axis height
A_END = 1.75         # half-length to the end faces
DOOR_W, DOOR_H = 0.9, 1.7
DOOR_Z0 = A_Z - 0.86  # door bottom
DOOR_OPEN = 2.3      # the shutter's travel up its rails
AIR_FRONT = -A_END
HAB_DOOR_Z = 1.75    # the habitat door's centre height, where the collar mates


def airlock(p, m):
    cap = hs.lathe('Capsule', [(1.12, -A_END), (A_R, -A_END + 0.3), (A_R, A_END - 0.3), (1.12, A_END)], 8,
                   location=(0, 0, A_Z), axis='Y', cap_start=True, cap_end=True, phase=math.pi / 8)
    model.boolean(cap, model.box('Doorway', (DOOR_W, 0.8, DOOR_H), (0, -A_END, DOOR_Z0 + DOOR_H / 2)))
    if p.detail:
        model.bevel(cap, 0.03, 2, 30)
    p.add(cap, m['white'])
    # The vestibule behind the doorway: dark walls, the inner hatch, a lamp.
    box(p, (DOOR_W + 0.1, 0.1, DOOR_H + 0.1), (0, -A_END + 0.55, DOOR_Z0 + DOOR_H / 2), m['grey'])
    box(p, (0.6, 0.04, 1.3), (0, -A_END + 0.49, DOOR_Z0 + 0.8), m['door'], 0.01)
    for s in (1, -1):
        box(p, (0.06, 0.55, DOOR_H), (s * (DOOR_W / 2 + 0.02), -A_END + 0.27, DOOR_Z0 + DOOR_H / 2), m['dark'])
    box(p, (DOOR_W, 0.55, 0.06), (0, -A_END + 0.27, DOOR_Z0 + DOOR_H + 0.02), m['dark'])
    box(p, (0.3, 0.05, 0.05), (0, -A_END + 0.46, DOOR_Z0 + DOOR_H - 0.12), m['lamp'])
    # Amber frames round the capsule's edges, as the reference's brass ones.
    for y in (-A_END + 0.3, A_END - 0.3):
        p.add(hs.lathe('Frame', [(A_R + 0.05, y - 0.07), (A_R + 0.05, y + 0.07)], 8, location=(0, 0, A_Z), axis='Y', phase=math.pi / 8), m['amber'])
    # The dust shutter's guide rails, their crosshead and beacon.
    rail_top = DOOR_Z0 + DOOR_OPEN + DOOR_H + 0.1
    for s in (1, -1):
        box(p, (0.1, 0.14, rail_top - 0.3), (s * (DOOR_W / 2 + 0.1), -A_END - 0.09, 0.3 + (rail_top - 0.3) / 2), m['steel'], 0.01)
    box(p, (DOOR_W + 0.4, 0.16, 0.14), (0, -A_END - 0.09, rail_top + 0.07), m['grey'], 0.01)
    cyl(p, 0.07, 0.12, (0, -A_END - 0.09, rail_top + 0.2), m['beacon'], seg=(8, 12))
    # The shutter itself (node 1): ribbed, a small window, amber pull bars.
    box(p, (DOOR_W + 0.06, 0.06, DOOR_H), (0, -A_END - 0.09, DOOR_Z0 + DOOR_H / 2), m['door'], 0.01, node=1)
    box(p, (0.3, 0.02, 0.22), (0, -A_END - 0.125, DOOR_Z0 + DOOR_H - 0.4), m['glass'], node=1)
    for s in (1, -1):
        box(p, (0.05, 0.05, 0.4), (s * 0.3, -A_END - 0.14, DOOR_Z0 + 0.9), m['amber'], node=1)
    # Steps up to the door and a hazard edge on the sill.
    for k, z in enumerate((0.15, 0.42)):
        box(p, (1.2, 0.32, 0.08), (0, -A_END - 0.62 + k * 0.28, z), m['grey'], 0.01)
    for s in (1, -1):
        strut(p, (s * 0.62, -A_END - 0.8, 0.0), (s * 0.62, -A_END - 0.2, DOOR_Z0), 0.03, m['steel'], (4, 8))
    box(p, (DOOR_W, 0.12, 0.03), (0, -A_END - 0.06, DOOR_Z0 + 0.01), m['hazard'])
    # The docking collar at the back, which mates with the habitat's door.
    p.add(hs.lathe('Collar', [(0.95, A_END - 0.05), (0.95, A_END + 0.25), (0.82, A_END + 0.3), (0.82, A_END + 0.34)], 16 if p.detail else 12,
                   location=(0, 0, HAB_DOOR_Z), axis='Y'), m['grey'])
    # Chassis: a dark frame on four legs with pads.
    box(p, (1.9, 3.0, 0.2), (0, 0, 0.42), m['dark'], 0.02)
    for sx in (1, -1):
        for sy in (1, -1):
            strut(p, (sx * 0.8, sy * 1.25, 0.42), (sx * 0.95, sy * 1.35, 0.06), 0.06, m['steel'], (6, 8))
            box(p, (0.36, 0.36, 0.06), (sx * 0.95, sy * 1.35, 0.03), m['dark'])
    # Side windows, the markings, handrails.
    apothem = A_R * math.cos(math.pi / 8)
    for s in (1, -1):
        box(p, (0.04, 0.5, 0.4), (s * (apothem + 0.01), 0.2, A_Z + 0.15), m['glass'])
        box(p, (0.06, 0.62, 0.52), (s * (apothem - 0.005), 0.2, A_Z + 0.15), m['grey'])
        strut(p, (s * (apothem + 0.1), -1.1, A_Z - 0.35), (s * (apothem + 0.1), 1.1, A_Z - 0.35), 0.025, m['amber'], (4, 8))
    sign(p, m, 0.6, 0.4, (apothem, -0.75, A_Z + 0.15), (0, 1, 0), (0, 0, 1), 'flag')
    sign(p, m, 1.0, 0.26, (-apothem, -0.35, A_Z + 0.15), (0, -1, 0), (0, 0, 1), ('word', 0.18))


# ── ScienceLab ──
L_R = 1.6           # octagon circumradius
L_Z = 2.05          # axis height
L_HALF = 3.4        # half-length of the barrel


def lab(p, m):
    ap = L_R * math.cos(math.pi / 8)
    body = hs.lathe('Lab', [(1.15, -L_HALF - 0.5), (L_R, -L_HALF), (L_R, L_HALF), (1.15, L_HALF + 0.5)], 8,
                    location=(0, 0, L_Z), axis='X', cap_start=True, cap_end=True, phase=math.pi / 8)
    if p.detail:
        model.bevel(body, 0.03, 2, 30)
    p.add(body, m['white'])
    # Amber frames at the ends and between the two bays.
    for x in (-L_HALF, 0.0, L_HALF):
        p.add(hs.lathe('Frame', [(L_R + 0.06, x - 0.08), (L_R + 0.06, x + 0.08)], 8, location=(0, 0, L_Z), axis='X', phase=math.pi / 8), m['amber'])
    # Lit windows along the front, in grey frames; one small on the back.
    for x in (-2.3, -1.1, 1.1, 2.3):
        box(p, (0.8, 0.08, 0.58), (x, -ap - 0.01, L_Z + 0.2), m['grey'], 0.015)
        box(p, (0.64, 0.04, 0.44), (x, -ap - 0.05, L_Z + 0.2), m['glass'], node=2)
    box(p, (0.6, 0.04, 0.44), (1.6, ap + 0.03, L_Z + 0.2), m['glass'], node=2)
    # A door in the -X end with a lit port, a step under it.
    end = L_HALF + 0.5
    box(p, (0.1, 1.0, 1.75), (-end - 0.02, 0, L_Z - 0.25), m['grey'], 0.015)
    box(p, (0.06, 0.8, 1.6), (-end - 0.07, 0, L_Z - 0.28), m['door'], 0.01)
    box(p, (0.03, 0.24, 0.24), (-end - 0.105, 0, L_Z + 0.2), m['glass'], node=2)
    box(p, (0.5, 1.1, 0.08), (-end - 0.3, 0, 0.42), m['grey'], 0.01)
    # Service panels on the front, the markings.
    box(p, (0.6, 0.06, 0.45), (-2.9, -ap - 0.02, L_Z - 0.45), m['grey'], 0.01)
    box(p, (0.5, 0.06, 0.4), (0.0, -ap - 0.02, L_Z - 0.45), m['dark'], 0.01)
    sign(p, m, 1.4, 0.36, (-1.7, -ap, L_Z - 0.5), (1, 0, 0), (0, 0, 1), ('word', 0.26))
    sign(p, m, 0.72, 0.48, (1.7, -ap, L_Z - 0.5), (1, 0, 0), (0, 0, 1), 'flag')
    # Roof: rails, two equipment boxes, a sensor dome and a whip antenna.
    top = L_Z + ap
    for s in (1, -1):
        strut(p, (-3.0, s * 0.45, top + 0.25), (3.0, s * 0.45, top + 0.25), 0.025, m['alu'], (4, 8))
        for x in (-3.0, -1.0, 1.0, 3.0):
            strut(p, (x, s * 0.45, top), (x, s * 0.45, top + 0.25), 0.02, m['alu'], (4, 6))
    box(p, (0.9, 0.55, 0.35), (-1.8, 0, top + 0.17), m['dark'], 0.02)
    box(p, (0.6, 0.5, 0.25), (1.2, 0.05, top + 0.12), m['grey'], 0.02)
    p.add(hs.lathe('SensorDome', [(0.3, 0.0), (0.3, 0.08), (0.24, 0.2), (0.12, 0.28), (0.001, 0.3)], 16 if p.detail else 10, location=(2.5, 0, top), axis='Z'), m['alu'])
    strut(p, (-2.8, -0.3, top), (-2.8, -0.3, top + 1.4), 0.02, m['alu'], (4, 6))
    # Chassis: a dark frame on six legs, amber braces.
    box(p, (7.2, 2.3, 0.24), (0, 0, 0.5), m['dark'], 0.02)
    for x in (-3.0, 0.0, 3.0):
        for s in (1, -1):
            strut(p, (x, s * 1.0, 0.5), (x, s * 1.1, 0.06), 0.07, m['steel'], (6, 8))
            box(p, (0.38, 0.38, 0.06), (x, s * 1.1, 0.03), m['dark'])
            strut(p, (x + 0.1, s * 1.05, 0.38), (x + 1.2, s * 1.05, 0.66), 0.035, m['amber'], (4, 8))


# ── LandingPad ──
PAD_R = 9.0
PAD_H = 0.25


def pad(p, m):
    seg = 64 if p.detail else 40
    p.add(hs.lathe('Pad', [(PAD_R - 0.25, 0.0), (PAD_R, 0.02), (PAD_R, PAD_H - 0.05), (PAD_R - 0.2, PAD_H), (0.001, PAD_H)], seg, axis='Z', cap_start=False), m['grey'])
    # A raised rim of grey blocks and the amber circle.
    p.add(hs.lathe('Rim', [(PAD_R - 0.2, PAD_H), (PAD_R - 0.2, PAD_H + 0.12), (PAD_R - 0.6, PAD_H + 0.12), (PAD_R - 0.6, PAD_H)], seg, axis='Z'), m['steel'])
    for r0, r1 in ((6.3, 6.75), (4.55, 4.65)):
        p.add(face_up(hs.lathe('Circle', [(r0, PAD_H + 0.004), (r1, PAD_H + 0.004)], seg, axis='Z')), m['amber'])
    # The H, in white.
    for s in (1, -1):
        box(p, (0.55, 3.8, 0.012), (s * 1.25, 0, PAD_H + 0.006), m['dishwhite'])
    box(p, (1.95, 0.55, 0.012), (0, 0, PAD_H + 0.006), m['dishwhite'])
    # Amber ticks round the circle, lights in the rim (node 2), two ramps.
    for k in range(16):
        a = 2 * math.pi * k / 16
        o = model.box('Tick', (0.18, 0.7, 0.012), (math.cos(a) * 7.3, math.sin(a) * 7.3, PAD_H + 0.006))
        o.rotation_euler = (0, 0, a + math.pi / 2)
        p.add(o, m['amber'])
    for k in range(8):
        a = 2 * math.pi * (k + 0.5) / 8
        c = Vector((math.cos(a), math.sin(a), 0))
        o = model.box('LampHousing', (0.4, 0.3, 0.16), c * (PAD_R - 0.4) + Vector((0, 0, PAD_H + 0.1)))
        o.rotation_euler = (0, 0, a + math.pi / 2)
        p.add(o, m['dark'])
        o = model.box('Lamp', (0.3, 0.06, 0.08), c * (PAD_R - 0.21) + Vector((0, 0, PAD_H + 0.12)))
        o.rotation_euler = (0, 0, a + math.pi / 2)
        p.add(o, m['beacon'], 2)
    for a in (-math.pi / 2, math.pi / 2):
        c = Vector((math.cos(a), math.sin(a), 0))
        o = model.box('Ramp', (2.4, 1.6, 0.1), c * (PAD_R + 0.7) + Vector((0, 0, 0.1)))
        o.rotation_euler = (math.copysign(0.16, -math.sin(a)), 0, 0)
        p.add(o, m['grey'])
        o = model.box('RampEdge', (2.4, 0.12, 0.02), c * (PAD_R + 1.45) + Vector((0, 0, 0.03)))
        p.add(o, m['hazard'])


# ── EVARack: an open locker with two suits ──
def suit(p, m, x):
    """A simplified suit standing at x, facing out (-Y): rigid, low-poly."""
    y = 0.02
    for s in (1, -1):
        lx = x + s * 0.11
        cyl(p, 0.085, 0.8, (lx, y, 0.55), m['white'], seg=(6, 10))
        box(p, (0.14, 0.26, 0.14), (lx, y - 0.04, 0.12), m['grey'], 0.02)
        cyl(p, 0.09, 0.1, (lx, y - 0.075, 0.55), m['dark'], seg=(6, 8), axis='Y')
        ax = x + s * 0.3
        cyl(p, 0.065, 0.62, (ax, y, 1.12), m['white'], seg=(6, 10))
        box(p, (0.1, 0.12, 0.13), (ax, y, 0.76), m['dark'], 0.015)
        box(p, (0.05, 0.1, 0.07), (ax + s * 0.02, y - 0.09, 1.42), m['flag'])
    box(p, (0.46, 0.3, 0.58), (x, y, 1.25), m['white'], 0.04)
    box(p, (0.2, 0.05, 0.12), (x, y - 0.17, 1.3), m['dark'], 0.01)
    box(p, (0.42, 0.2, 0.6), (x, y + 0.24, 1.3), m['white2'], 0.03)
    o = model.box('Helmet', (0.3, 0.3, 0.3), (x, y, 1.7))
    model.bevel(o, 0.12, 2 if p.detail else 1, 30)
    p.add(o, m['white'])
    o = model.box('Visor', (0.22, 0.05, 0.15), (x, y - 0.14, 1.7))
    model.bevel(o, 0.02, p.seg, 30)
    p.add(o, m['gold'])


def evarack(p, m):
    W, D, H = 2.1, 0.95, 2.4
    box(p, (W, D, 0.1), (0, 0, 0.05), m['grey'], 0.01)
    box(p, (W, D, 0.08), (0, 0, H - 0.04), m['white2'], 0.01)
    box(p, (W, 0.06, H), (0, D / 2 - 0.03, H / 2), m['grey'])
    for s in (1, -1):
        box(p, (0.06, D, H), (s * (W / 2 - 0.03), 0, H / 2), m['white'], 0.01)
    box(p, (0.05, D * 0.8, H - 0.2), (0, 0.05, H / 2), m['white2'])
    for sx in (1, -1):
        for sy in (1, -1):
            box(p, (0.1, 0.1, H + 0.02), (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), H / 2), m['amber'])
    box(p, (W - 0.2, 0.05, 0.05), (0, D / 2 - 0.08, H - 0.3), m['alu'])
    box(p, (0.3, 0.03, 0.05), (0, -D / 2 - 0.01, H - 0.1), m['lamp'])
    for x in (-0.5, 0.5):
        suit(p, m, x)


PIECES = [
    kit.Piece('HabitatModule', habitat, budget=8000, module=True, width=10.0,
              nodes=[(2, 'HabitatModule_Windows', (0, 0, 0), None, 'mesh')]),
    kit.Piece('Airlock', airlock, budget=8000, module=True, width=3.4,
              bake_pose={1: Matrix.Translation((0, 0, DOOR_OPEN))},
              nodes=[(1, 'Airlock_Door', (0, AIR_FRONT - 0.09, DOOR_Z0), None, 'hinge')]),
    kit.Piece('ScienceLab', lab, budget=8000, module=True, width=8.0,
              nodes=[(2, 'ScienceLab_Windows', (0, 0, 0), None, 'mesh')]),
    # The pad goes last: at 21 m across it needs the bake row's free end.
    kit.Piece('EVARack', evarack, budget=1500, width=2.4),
    kit.Piece('LandingPad', pad, budget=8000, module=True, width=21.0,
              nodes=[(2, 'LandingPad_Lights', (0, 0, 0), None, 'mesh')]),
]

TURN = [(f'{a:03d}', a, 16) for a in range(0, 360, 45)]


def lineup(res, out_dir, width=2800, height=620, samples=24):
    """Every piece in a row, as on the reference's asset overview."""
    order = ['HabitatModule', 'Airlock', 'ScienceLab', 'LandingPad', 'EVARack']
    widths = {pc.name: pc.width for pc in PIECES}
    x = 0.0
    for n in order:
        res[n]['root'].location.x = x + widths[n] / 2
        x += widths[n] + 1.6
    bpy.context.view_layer.update()
    roots = [res[n]['root'] for n in order]
    kit.show_only(roots, roots)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = width, height
    sc.cycles.samples = samples
    cam = kit.camera(ortho=True)
    lo, hi = kit.bounds([o for r in roots for o in kit.visible_meshes(r)])
    kit.aim(cam, (lo + hi) / 2, -12, 14, 150)
    cam.data.ortho_scale = (hi.x - lo.x) * 1.04
    sc.render.filepath = os.path.join(out_dir, 'lineup.png')
    bpy.ops.render.render(write_still=True)
    for r in roots:
        r.location.x = 0


def main():
    scene.reset(seed=37)
    out = argv[0] if argv else os.path.join(HERE, '..', 'build')
    renders = argv[1] if len(argv) > 1 else None
    res = kit.build(PIECES, mats, out, name='basemodules', size=int(os.environ.get('KIT_ATLAS', 2048)))
    roots = [r['root'] for r in res.values()]
    kit.export(roots, os.path.join(out, 'basemodules.glb'))
    for n, r in res.items():
        print(f'TRIS {n}: {r["total"]}  {r["tris"]}')
    if not renders:
        return
    kit.lamps_on(4.0)
    kit.studio()
    lineup(res, renders)
    # The turntables show the shutter open.
    res['Airlock']['made']['Airlock_Door'][0].location.z += DOOR_OPEN
    for pc in PIECES:
        kit.show_only(roots, [res[pc.name]['root']])
        kit.turntable(res[pc.name]['root'], os.path.join(renders, pc.name), TURN, size=int(os.environ.get('KIT_VIEW', 512)))


def preview():
    """High-poly with procedural paint, no bake: the fast critique loop."""
    renders = argv[1]
    names = argv[2].split(',') if len(argv) > 2 else [pc.name for pc in PIECES]
    scene.reset(seed=37)
    m = mats()
    kit.studio()
    for name in names:
        lo = kit._join(PIECES, m, False, only=[name])
        kit._drop_bottoms(lo)
        print(f'PREVIEW {name}: low {model.triangle_count(lo)} tris', flush=True)
        bpy.data.objects.remove(lo, do_unlink=True)
        hi = kit._join(PIECES, m, True, only=[name])
        model.shade_smooth(hi, 35)
        i = [pc.name for pc in PIECES].index(name)
        hi.location.x -= i * kit.SPACING
        root = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(root)
        hi.parent = root
        bpy.context.view_layer.update()
        kit.turntable(root, os.path.join(renders, 'preview', name), [('a', -35, 18), ('b', 145, 22)],
                      size=int(os.environ.get('KIT_VIEW', 400)), samples=12)
        bpy.data.objects.remove(hi, do_unlink=True)
        bpy.data.objects.remove(root, do_unlink=True)


if PREVIEW:
    preview()
else:
    main()
