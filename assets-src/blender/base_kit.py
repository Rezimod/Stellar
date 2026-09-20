"""Stellar Base kit: the modular lunar-base pieces for Explore Mode, one file.

Run:
  Blender -b -P assets-src/blender/base_kit.py -- <out-dir> [renders-dir]
      builds every piece, bakes the shared 2K atlas, writes
      <out-dir>/basekit.glb (raw; optimise it with gltf-transform) and,
      with a renders dir, a turntable per module and the kit lineup.
  Blender -b -P assets-src/blender/base_kit.py -- preview <renders-dir> Garage,Dish
      quick look: the high-poly with its procedural paint, no bake.

Spec (from ~/Desktop/stellar-explore/refs/base/: the "modular asset overviews" row
of `Moon Base.png` is the design for each piece, `Moon base 2.png` the
secondary; NOTES.md rules): one coherent kit of off-white weathered panels
over grey machinery and dark hardware, small amber accents (Stellar's
terracotta family), regolith dust climbing every piece from the ground.
Markings: the STELLAR wordmark on the garage front and the full five-cross
Georgian flag on the garage and the observatory, never a lone red cross
(the reference's habitat crosses are replaced, per NOTES.md).

Every piece is its own root node, origin at its footprint centre on the
ground, front (door, face) toward -Y here, which the Y-up export makes the
game's +Z. Metres throughout. See `PIECES` for the named nodes.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
import scene, model, decal, kit  # noqa: E402
import hardsurface as hs  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = bool(argv) and argv[0] == 'preview'

WHITE = (0.74, 0.73, 0.69, 1)
AMBER = (0.93, 0.45, 0.1, 1)
INK = (0.05, 0.05, 0.055, 1)


# ── Materials: shared by every piece, so the whole kit bakes to one atlas ──

def regolith(name):
    mat, nodes, links, bsdf = hs._nodes(name)
    coord = nodes.new('ShaderNodeTexCoord').outputs['Object']
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.0
    noise.inputs['Detail'].default_value = 10.0
    noise.inputs['Roughness'].default_value = 0.65
    links.new(coord, noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.16, 0.152, 0.142, 1)
    ramp.color_ramp.elements[1].color = (0.33, 0.315, 0.29, 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.96
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.5
    bump.inputs['Distance'].default_value = 0.05
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def mats():
    return {
        'white': hs.paint('KitWhite', WHITE, seed=1.3, wear=0.4, grime=0.25, panel=(1.45, 1.45, 1.2), seam=0.012, dust=0.85, dust_height=0.8, seam_ink=0.45),
        'white2': hs.paint('KitWhite2', (0.66, 0.66, 0.63, 1), seed=2.1, wear=0.45, grime=0.3, panel=(1.1, 1.1, 1.05), seam=0.012, patches=0.08, dust=0.85, dust_height=0.7, seam_ink=0.45),
        'dishwhite': hs.paint('KitDishWhite', (0.78, 0.775, 0.75, 1), seed=1.9, wear=0.2, grime=0.15, panel=(30, 30, 30), seam=0.0005, rough=0.45),
        'grey': hs.paint('KitGrey', (0.3, 0.305, 0.31, 1), seed=3.3, wear=0.5, grime=0.3, panel=(2.0, 2.0, 2.0), seam=0.012, rough=0.6, dust=0.8, dust_height=0.6),
        'dark': hs.metal('KitDark', (0.05, 0.053, 0.058, 1), rough=0.5, metallic=0.5, seed=3.0, dust=0.7, dust_height=0.4),
        'steel': hs.metal('KitSteel', (0.19, 0.195, 0.2, 1), rough=0.42, metallic=0.65, seed=4.0, dust=0.6, dust_height=0.5),
        'alu': hs.metal('KitAlu', (0.5, 0.5, 0.49, 1), rough=0.38, metallic=0.8, seed=4.5, dust=0.6, dust_height=0.5),
        'vent': hs.metal('KitVent', (0.04, 0.042, 0.045, 1), rough=0.55, metallic=0.4, seed=6.0, ribs=0.05, rib_axis='Z'),
        'door': hs.metal('KitDoor', (0.4, 0.405, 0.41, 1), rough=0.5, metallic=0.4, seed=6.5, ribs=0.16, rib_axis='Z', dust=0.8, dust_height=0.7),
        'ribbed': hs.metal('KitRibbed', (0.36, 0.36, 0.355, 1), rough=0.5, metallic=0.45, seed=6.8, ribs=0.12, rib_axis='X', dust=0.8, dust_height=0.7),
        'amber': hs.paint('KitAmber', AMBER, seed=7.0, wear=0.35, grime=0.2, panel=(9, 9, 9), seam=0.001, rough=0.5, dust=0.6),
        'hazard': hs.hazard('KitHazard', dust=0.5),
        'cells': hs.cells('KitCells'),
        'rubber': hs.metal('KitRubber', (0.025, 0.025, 0.027, 1), rough=0.85, metallic=0.0, seed=9.0, dust=0.5, dust_height=0.3),
        'cable': hs.metal('KitCable', (0.03, 0.03, 0.032, 1), rough=0.7, metallic=0.0, seed=9.5, ribs=0.035, rib_axis='X'),
        'regolith': regolith('KitRegolith'),
        'lens': hs.flat('KitLens', (0.01, 0.014, 0.02, 1), rough=0.05, metallic=0.5),
        'glass': hs.flat('KitWindow', (0.03, 0.032, 0.035, 1), rough=0.08, metallic=0.2, emit=(0.55, 0.45, 0.32, 1)),
        'lamp': hs.flat('KitLampWarm', (0.85, 0.83, 0.78, 1), rough=0.2, emit=(1.0, 0.9, 0.74, 1)),
        'red': hs.flat('KitLampRed', (0.5, 0.06, 0.05, 1), rough=0.25, emit=(1.0, 0.07, 0.04, 1)),
        'beacon': hs.flat('KitLampAmber', (0.7, 0.4, 0.15, 1), rough=0.25, emit=(1.0, 0.58, 0.18, 1)),
        'led': hs.flat('KitLampGreen', (0.1, 0.25, 0.12, 1), rough=0.3, emit=(0.3, 1.0, 0.45, 1)),
        'screen': hs.flat('KitScreen', (0.02, 0.03, 0.04, 1), rough=0.15, emit=(0.22, 0.6, 0.8, 1)),
        'ink': hs.flat('KitInk', INK, rough=0.6),
        'flag': hs.image_mat('KitFlag', decal.georgian_flag('GeorgianFlag', 300, 200), rough=0.5),
    }


# ── Modelling shorthands. `p.detail` is the high-poly pass. ──

def box(p, size, loc, mat, bev=0.0, node=0, rot=None, lowbev=True, boost=1.0, name='Box'):
    o = model.box(name, size, loc)
    if rot:
        o.rotation_euler = rot
    if bev and (p.detail or lowbev):
        model.bevel(o, bev, p.seg, 30)
    return p.add(o, mat, node, boost)


def cyl(p, r, depth, loc, mat, axis='Z', seg=(12, 24), node=0, bev=0.0, name='Cyl'):
    rot = {'Z': (0, 0, 0), 'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0)}[axis]
    o = model.cylinder(name, r, depth, seg[1] if p.detail else seg[0], location=loc, rotation=rot)
    if bev:
        model.bevel(o, bev, p.seg if p.detail else 1, 30)
    return p.add(o, mat, node)


def strut(p, a, b, r, mat, seg=(6, 12), node=0, name='Strut'):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = model.cylinder(name, r, d.length, seg[1] if p.detail else seg[0], location=(a + b) / 2)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return p.add(o, mat, node)


def pipe(p, pts, r, mat, seg=(6, 12), node=0):
    """A run of straight pipe through the points, each leg a little long so
    the elbows close."""
    for a, b in zip(pts, pts[1:]):
        a, b = Vector(a), Vector(b)
        d = (b - a).normalized() * r
        strut(p, a - d, b + d, r, mat, seg, node, 'Pipe')


def lathe(p, pts, mat, seg=(16, 32), loc=(0, 0, 0), axis='Z', node=0, cap_start=False, cap_end=False, name='Lathe'):
    o = hs.lathe(name, pts, seg[1] if p.detail else seg[0], location=loc, axis=axis, cap_start=cap_start, cap_end=cap_end)
    return p.add(o, mat, node)


def sign(p, m, w, h, origin, right, up, content, node=0, boost=3.0):
    """A sign plate 15 mm proud of the wall (in both meshes, with extra
    texels so the marking stays sharp in the shared atlas) and, in the
    high-poly only, the marking on its face: 'flag' or ('word', size)."""
    right, up = Vector(right).normalized(), Vector(up).normalized()
    n = right.cross(up).normalized()
    plate = model.box('Sign', (w, h, 0.015), (0, 0, 0))
    hs.orient(plate, Vector(origin) + n * 0.0075, right, up)
    p.add(plate, m['white'], node, boost)
    if not p.detail:
        return
    face = Vector(origin) + n * 0.0165
    if content == 'flag':
        p.add(hs.plate('Flag', w * 0.9, h * 0.9, face, right, up), m['flag'], node)
    else:
        wm = decal.wordmark('STELLAR', content[1], (0, 0, 0), (0, 0, 0), extrude=0.0, name='Word')
        hs.orient(wm, face, right, up)
        p.add(wm, m['ink'], node)


def rails(p, m, segs, z0, height, post_step=1.25):
    """A deck railing along (a, b) segments: posts, a mid rail, an amber top rail."""
    for a, b in segs:
        a, b = Vector((*a, z0)), Vector((*b, z0))
        n = max(1, math.ceil((b - a).length / post_step))
        for k in range(n + 1):
            q = a.lerp(b, k / n)
            strut(p, q, q + Vector((0, 0, height)), 0.025, m['alu'], (4, 8))
        strut(p, a + Vector((0, 0, height * 0.5)), b + Vector((0, 0, height * 0.5)), 0.018, m['alu'], (4, 8))
        strut(p, a + Vector((0, 0, height)), b + Vector((0, 0, height)), 0.03, m['amber'], (6, 10))


# ── Modules ──

G_W, G_D = 8.0, 6.0          # garage footprint
G_FRONT, G_BACK = -2.3, 2.95  # wall faces; the apron and canopy run out to -3
G_WALL = 3.95                 # wall top / roof underside
G_FLOOR = 0.14
G_OPEN_W, G_OPEN_H = 5.0, 2.15
DOOR_Y = G_FRONT + 0.3
DOOR_H = 2.05
DOOR_OPEN = 1.95  # metres the roll-up door rises to open (it parks behind the header)
G_CH = 0.6        # the hangar's chamfered eaves


def chamfer_cut(obj, y0, y1):
    """Cut both top corners off a wall along the eaves line."""
    for s in (1, -1):
        mid = Vector((s * (3.9 - G_CH / 2), (y0 + y1) / 2, G_WALL - G_CH / 2))
        c = model.box('Eave', (2.0, y1 - y0, 2.0), mid + Vector((s, 0, 1)).normalized())
        c.rotation_euler = (0, math.radians(45), 0)
        model.boolean(obj, c)


def garage(p, m):
    wh = G_WALL - G_FLOOR
    zc = G_FLOOR + wh / 2
    box(p, (G_W, G_D, G_FLOOR), (0, 0, G_FLOOR / 2), m['grey'], 0.03)
    box(p, (6.2, 0.14, 0.012), (0, -2.9, G_FLOOR + 0.006), m['hazard'])
    # Shell: back, sides, a front wall with the bay cut through it.
    back = model.box('Back', (7.8, 0.25, wh), (0, G_BACK - 0.125, zc))
    chamfer_cut(back, G_BACK - 1, G_BACK + 1)
    model.bevel(back, 0.03, p.seg, 30)
    p.add(back, m['white'])
    sh = wh - G_CH
    for s in (1, -1):
        box(p, (0.25, G_BACK - G_FRONT, sh), (s * 3.775, (G_BACK + G_FRONT) / 2, G_FLOOR + sh / 2), m['white'], 0.03)
        # The eave: a sloped panel from the side wall up to the roof.
        eave = model.box('EavePanel', (0.25, G_BACK - G_FRONT + 0.6, G_CH * math.sqrt(2) + 0.2), (0, 0, 0))
        eave.rotation_euler = (0, math.radians(-45 * s), 0)
        eave.location = (s * (3.9 - G_CH / 2 - 0.09), (G_BACK + G_FRONT - 0.6) / 2, G_WALL - G_CH / 2 + 0.03)
        model.bevel(eave, 0.03, p.seg, 30)
        p.add(eave, m['white2'])
    front = model.box('Front', (7.8, 0.25, wh), (0, G_FRONT + 0.125, zc))
    chamfer_cut(front, G_FRONT - 1, G_FRONT + 1)
    model.boolean(front, model.box('Bay', (G_OPEN_W, 1.0, G_OPEN_H), (0, G_FRONT, G_OPEN_H / 2)))
    model.bevel(front, 0.03, p.seg, 30)
    p.add(front, m['white'])
    # Roof slab running out over the apron as a canopy, a dark trim line,
    # a little plant on top.
    rw = 2 * (3.9 - G_CH) + 0.3
    box(p, (rw, 5.9, 0.25), (0, 0.05, G_WALL + 0.125), m['white2'], 0.04)
    box(p, (rw + 0.04, 0.05, 0.12), (0, -2.9, G_WALL + 0.12), m['steel'])
    box(p, (0.14, 5.9, 0.1), (rw / 2 - 0.07, 0.05, G_WALL + 0.3), m['steel'])
    box(p, (0.14, 5.9, 0.1), (-rw / 2 + 0.07, 0.05, G_WALL + 0.3), m['steel'])
    for x, y, sz in ((-2.4, 1.2, (1.0, 0.8, 0.2)), (1.8, 1.6, (0.8, 0.6, 0.16)), (2.9, -0.8, (0.6, 0.6, 0.22))):
        box(p, sz, (x, y, 4.2 + sz[2] / 2), m['dark'], 0.02)
    box(p, (1.6, 1.0, 0.06), (-0.4, 0.8, 4.23), m['vent'])
    # Front: pilasters carrying the canopy, a steel portal round the bay,
    # hazard sleeves on the jambs, downlights under the canopy.
    for x in (-2.78, 2.78):
        box(p, (0.36, 0.6, wh), (x, G_FRONT - 0.3, zc), m['grey'], 0.025)
    for x in (-3.75, 3.75):
        box(p, (0.36, 0.6, sh), (x, G_FRONT - 0.3, G_FLOOR + sh / 2), m['grey'], 0.025)
    box(p, (G_OPEN_W + 0.9, 0.4, 0.34), (0, G_FRONT - 0.2, G_OPEN_H + 0.17), m['steel'], 0.025)
    for s in (1, -1):
        box(p, (0.42, 0.66, 1.0), (s * 2.78, G_FRONT - 0.3, G_FLOOR + 0.5), m['hazard'], 0.02)
        box(p, (0.12, 0.3, G_OPEN_H - G_FLOOR), (s * (G_OPEN_W / 2 - 0.06), G_FRONT + 0.14, G_FLOOR + (G_OPEN_H - G_FLOOR) / 2), m['dark'])
        box(p, (0.61, 0.03, 0.12), (s * 3.265, G_FRONT - 0.015, 2.9), m['amber'])
        box(p, (0.61, 0.03, 0.12), (s * 3.265, G_FRONT - 0.015, 2.6), m['amber'])
        box(p, (0.3, 0.03, 0.3), (s * 3.265, G_FRONT - 0.015, 1.4), m['dark'], 0.01)
        box(p, (0.05, 0.02, 0.03), (s * 3.265 - 0.06, G_FRONT - 0.035, 1.46), m['led'])
    for x in (-1.9, 0.0, 1.9):
        box(p, (0.6, 0.24, 0.08), (x, -2.62, G_WALL - 0.04), m['dark'], 0.01)
        box(p, (0.5, 0.18, 0.02), (x, -2.62, G_WALL - 0.085), m['lamp'])
    box(p, (G_OPEN_W, 0.3, 0.012), (0, G_FRONT - 0.15, G_FLOOR + 0.006), m['hazard'])
    sign(p, m, 3.3, 0.8, (-0.55, G_FRONT, 3.08), (1, 0, 0), (0, 0, 1), ('word', 0.62))
    sign(p, m, 0.9, 0.6, (1.75, G_FRONT, 3.08), (1, 0, 0), (0, 0, 1), 'flag')
    # Sides: frame ribs, an amber band, a personnel door with a lit window.
    for s in (1, -1):
        for y in (-1.1, 0.35, 1.8):
            box(p, (0.12, 0.2, sh), (s * 3.96, y, G_FLOOR + sh / 2), m['grey'], 0.015)
        box(p, (0.03, 5.2, 0.12), (s * 3.915, 0.33, 3.0), m['amber'])
        box(p, (0.03, 5.2, 0.05), (s * 3.915, 0.33, 0.55), m['hazard'])
    box(p, (0.1, 1.05, 2.15), (3.94, 2.45, G_FLOOR + 1.075), m['dark'], 0.015)
    box(p, (0.06, 0.88, 1.98), (3.97, 2.45, G_FLOOR + 1.0), m['white2'], 0.01)
    box(p, (0.03, 0.3, 0.34), (4.0, 2.45, 1.6), m['glass'])
    # Back: a radiator bank and a conduit run into the ground.
    box(p, (2.4, 0.18, 1.3), (-1.4, G_BACK + 0.09, 1.9), m['ribbed'], 0.02)
    box(p, (0.6, 0.3, 0.7), (1.8, G_BACK - 0.15 + 0.3, 0.5), m['grey'], 0.02)
    pipe(p, [(1.8, G_BACK + 0.15, 0.85), (1.8, G_BACK + 0.15, 2.6), (0.4, G_BACK + 0.15, 2.6)], 0.05, m['steel'])
    # Inside: floor lines, ceiling lights, a workbench, the charger.
    if p.detail:
        for x in (-1.3, 1.3):
            box(p, (0.08, 4.4, 0.004), (x, 0.2, G_FLOOR + 0.002), m['amber'])
    for x in (-1.4, 1.4):
        box(p, (2.4, 0.2, 0.05), (x, 0.3, G_WALL - 0.025), m['lamp'])
    box(p, (1.8, 0.65, 0.9), (2.55, 2.45, G_FLOOR + 0.45), m['grey'], 0.02)
    box(p, (1.2, 0.3, 1.4), (2.6, 2.65, 1.8), m['dark'], 0.02)
    box(p, (0.45, 0.35, 1.5), (-1.9, 2.45, G_FLOOR + 0.75), m['grey'], 0.03)
    box(p, (0.5, 0.4, 0.12), (-1.9, 2.45, G_FLOOR + 1.56), m['dark'], 0.02)
    box(p, (0.08, 0.02, 0.7), (-1.98, 2.265, 1.15), m['led'], node=2, boost=2.0)
    box(p, (0.2, 0.02, 0.14), (-1.8, 2.265, 1.5), m['screen'], node=2, boost=2.0)
    pipe(p, [(-1.75, 2.26, 0.7), (-1.6, 2.0, G_FLOOR + 0.035), (-0.9, 1.1, G_FLOOR + 0.035)], 0.03, m['rubber'])
    box(p, (0.22, 0.16, 0.1), (-0.85, 1.05, G_FLOOR + 0.05), m['amber'], 0.01)
    # The roll-up door, closed, just behind the front wall.
    box(p, (G_OPEN_W + 0.1, 0.06, DOOR_H), (0, DOOR_Y, G_FLOOR + DOOR_H / 2), m['door'], node=1)
    box(p, (G_OPEN_W + 0.1, 0.1, 0.1), (0, DOOR_Y - 0.01, G_FLOOR + 0.05), m['hazard'], node=1)
    for x in (-1.2, 1.2):
        box(p, (0.3, 0.05, 0.05), (x, DOOR_Y - 0.05, G_FLOOR + 0.4), m['steel'], node=1)


T_D = 0.85        # observatory deck height
T_R = 1.75        # dome radius
T_RING = 1.0      # dome base wall height
T_ALT = T_D + 1.55


def shell(p, m, s, radius, z0, node):
    """One half of the clamshell dome: the x-side `s` of a hemisphere,
    solid 4 cm."""
    nphi, nth = (10, 16) if p.detail else (5, 8)
    bm = bmesh.new()
    rows = []
    for i in range(nphi + 1):
        phi = (math.pi / 2) * i / nphi
        row = []
        for j in range(nth + 1):
            th = -math.pi / 2 + math.pi * j / nth
            row.append(bm.verts.new((s * (radius * math.cos(phi) * math.cos(th) + 0.012), radius * math.cos(phi) * math.sin(th), z0 + radius * math.sin(phi))))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for j in range(nth):
            bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]) if s > 0 else (a[j + 1], a[j], b[j], b[j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-4)
    mesh = bpy.data.meshes.new('Shell')
    bm.to_mesh(mesh)
    bm.free()
    o = model.link(bpy.data.objects.new('Shell', mesh))
    mod = o.modifiers.new('Solid', 'SOLIDIFY')
    mod.thickness = 0.04
    mod.offset = -1.0
    model.apply_modifier(o, mod)
    p.add(o, m['white'], node)
    # A steel rib along the split and one round the foot of the shell.
    k = 24 if p.detail else 8
    pts = [(s * 0.012 + s * 0.0, radius * math.cos(math.pi * t / k), z0 + radius * math.sin(math.pi * t / k)) for t in range(k + 1)]
    for a, b in zip(pts, pts[1:]):
        strut(p, a, b, 0.035, m['steel'], (4, 8), node)
    box(p, (0.2, 0.5, 0.18), (s * (radius + 0.05), 0, z0 + 0.02), m['dark'], 0.02, node=node)


def telescope(p, m):
    D = T_D
    lathe(p, [(3.2, 0.0), (2.95, 0.3), (2.7, 0.52), (0.001, 0.52)], m['regolith'], (12, 32), name='Rise')
    box(p, (5.0, 5.0, 0.2), (0, 0, D - 0.1), m['grey'], 0.03)
    for x in (-2.3, 2.3):
        for y in (-2.3, 2.3):
            box(p, (0.2, 0.2, D - 0.2), (x, y, (D - 0.2) / 2 + 0.1), m['steel'])
    box(p, (5.02, 0.03, 0.1), (0, -2.51, D - 0.08), m['hazard'])
    # Stairs up the front right.
    for i in range(3):
        top = (i + 1) * D / 3
        box(p, (1.0, 0.32, top), (1.5, -2.66 - (2 - i) * 0.3, top / 2), m['grey'], 0.015)
    for x in (0.98, 2.02):
        strut(p, (x, -3.3, 0.9), (x, -2.45, D + 0.95), 0.025, m['amber'], (6, 10))
        strut(p, (x, -3.3, 0.0), (x, -3.3, 0.9), 0.025, m['alu'], (4, 8))
    rails(p, m, [((-2.42, -2.42), (0.98, -2.42)), ((2.02, -2.42), (2.42, -2.42)), ((2.42, -2.42), (2.42, 2.42)),
                 ((2.42, 2.42), (-2.42, 2.42)), ((-2.42, 2.42), (-2.42, -2.42))], D, 1.0)
    # Dome base wall with a steel lip, a hatch on the right.
    lathe(p, [(T_R, D), (T_R, D + T_RING), (T_R - 0.07, D + T_RING), (T_R - 0.07, D + 0.02)], m['white'], (24, 48), name='Ring')
    lathe(p, [(T_R - 0.01, D + T_RING - 0.07), (T_R + 0.06, D + T_RING - 0.05), (T_R + 0.06, D + T_RING + 0.02), (T_R - 0.01, D + T_RING + 0.03)], m['steel'], (24, 48))
    lathe(p, [(T_R + 0.02, D + 0.1), (T_R + 0.02, D + 0.16)], m['amber'], (24, 48))
    box(p, (0.1, 0.8, 0.85), (T_R + 0.01, 0.6, D + 0.45), m['dark'], 0.015)
    box(p, (0.06, 0.66, 0.72), (T_R + 0.05, 0.6, D + 0.44), m['white2'], 0.01)
    sign(p, m, 0.72, 0.48, (0, -T_R - 0.03, D + 0.52), (1, 0, 0), (0, 0, 1), 'flag')
    # The clamshell: two halves hinged at the foot of each side.
    shell(p, m, 1, T_R + 0.03, D + T_RING, 3)
    shell(p, m, -1, T_R + 0.03, D + T_RING, 4)
    # Pier, the alt-az fork and the tube.
    lathe(p, [(0.34, D), (0.34, D + 0.08), (0.2, D + 0.14), (0.2, D + 1.05), (0.001, D + 1.05)], m['white2'], (12, 24))
    cyl(p, 0.27, 0.12, (0, 0, D + 1.11), m['dark'], node=5)
    box(p, (0.72, 0.34, 0.08), (0, 0, D + 1.2), m['steel'], 0.01, node=5)
    for s in (1, -1):
        box(p, (0.1, 0.26, 0.5), (s * 0.31, 0, D + 1.47), m['white'], 0.015, node=5)
    box(p, (0.24, 0.2, 0.2), (0.2, 0.16, D + 1.32), m['dark'], 0.015, node=5)
    lathe(p, [(0.001, 0.62), (0.16, 0.62), (0.2, 0.55), (0.2, -0.72)], m['white'], (16, 32), loc=(0, 0, T_ALT), axis='Y', node=6)
    lathe(p, [(0.2, -0.68), (0.215, -0.68), (0.215, -0.98), (0.2, -0.98), (0.2, -0.8)], m['dark'], (16, 32), loc=(0, 0, T_ALT), axis='Y', node=6)
    lathe(p, [(0.205, 0.3), (0.215, 0.3), (0.215, 0.62), (0.165, 0.66)], m['dark'], (16, 32), loc=(0, 0, T_ALT), axis='Y', node=6)
    cyl(p, 0.19, 0.01, (0, -0.8, T_ALT), m['lens'], 'Y', (16, 32), node=6)
    cyl(p, 0.07, 0.56, (0, 0, T_ALT), m['steel'], 'X', (8, 16), node=6)
    cyl(p, 0.04, 0.36, (0.13, -0.2, T_ALT + 0.26), m['dark'], 'Y', (8, 12), node=6)
    box(p, (0.04, 0.06, 0.08), (0.1, -0.2, T_ALT + 0.21), m['steel'], node=6)
    # Control cabinet with its status panel, cabled to the pier.
    box(p, (0.7, 0.5, 1.0), (-1.85, 1.75, D + 0.5), m['white2'], 0.025)
    box(p, (0.02, 0.36, 0.3), (-1.49, 1.75, D + 0.75), m['vent'])
    box(p, (0.3, 0.02, 0.2), (-1.85, 1.49, D + 0.76), m['screen'], node=7, boost=2.0)
    for k, mm in enumerate(('led', 'led', 'beacon')):
        box(p, (0.05, 0.02, 0.04), (-2.05 + k * 0.1, 1.49, D + 0.56), m[mm], node=7, boost=2.0)
    pipe(p, [(-1.6, 1.5, D + 0.03), (-0.4, 0.3, D + 0.03), (-0.2, 0.1, D + 0.03)], 0.03, m['rubber'])


DISH_YAW_Z = 1.35
DISH_ALT = 3.4
DISH_R, DISH_F, DISH_V = 2.5, 2.0, -0.95  # rim radius, focal length, vertex y


def dish(p, m):
    lathe(p, [(1.5, 0.0), (1.5, 0.16), (1.3, 0.2), (1.02, 1.25), (0.9, 1.3), (0.001, 1.3)], m['white'], (16, 40), name='Pedestal')
    lathe(p, [(1.33, 0.26), (1.36, 0.26), (1.36, 0.36), (1.31, 0.36)], m['amber'], (16, 40))
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        box(p, (0.4, 0.4, 0.22), (math.cos(ang) * 1.45, math.sin(ang) * 1.45, 0.11), m['dark'], 0.02, rot=(0, 0, ang))
    box(p, (0.6, 0.12, 0.75), (0, -1.2, 0.62), m['dark'], 0.015, rot=(math.radians(-12), 0, 0))
    box(p, (0.5, 0.06, 0.62), (0, -1.25, 0.61), m['white2'], 0.01, rot=(math.radians(-12), 0, 0))
    pipe(p, [(1.1, 0.6, 0.0), (1.1, 0.6, 0.45), (0.95, 0.5, 0.8)], 0.05, m['steel'])
    # Azimuth turret: bearing, housing, yoke.
    cyl(p, 0.95, 0.2, (0, 0, DISH_YAW_Z + 0.1), m['dark'], seg=(16, 40), node=1)
    box(p, (1.6, 1.4, 1.0), (0, 0.1, DISH_YAW_Z + 0.7), m['white'], 0.05, node=1)
    box(p, (1.64, 0.05, 0.12), (0, -0.62, DISH_YAW_Z + 1.02), m['amber'], node=1)
    box(p, (0.9, 0.5, 0.7), (0, 0.95, DISH_YAW_Z + 0.65), m['grey'], 0.03, node=1)
    for s in (1, -1):
        box(p, (0.32, 0.8, 1.55), (s * 0.95, 0.05, DISH_ALT - 0.55), m['grey'], 0.04, node=1)
        box(p, (0.36, 0.3, 0.3), (s * 0.95, 0.35, DISH_YAW_Z + 1.2), m['dark'], 0.02, node=1)
    # Elevation: the hub, the back frame, the reflector, the feed.
    cyl(p, 0.3, 1.58, (0, 0, DISH_ALT), m['dark'], 'X', (12, 24), node=2)
    box(p, (1.2, 0.9, 1.2), (0, -0.45, DISH_ALT), m['grey'], 0.04, node=2)
    box(p, (0.8, 0.5, 0.8), (0, 0.4, DISH_ALT - 0.3), m['dark'], 0.03, node=2)
    rings = 7 if p.detail else 5
    front = [(DISH_R * i / rings, DISH_V - (DISH_R * i / rings) ** 2 / (4 * DISH_F)) for i in range(rings + 1)]
    back = [(r, y + 0.07) for r, y in reversed(front)]
    prof = [(max(r, 0.001), y) for r, y in front] + [(DISH_R + 0.03, front[-1][1] + 0.03)] + [(max(r, 0.001), y) for r, y in back]
    lathe(p, prof, m['dishwhite'], (28, 64), loc=(0, 0, DISH_ALT), axis='Y', node=2, name='Reflector')
    if p.detail:
        # Panel joints on the reflector: two rings and twelve radial seams.
        def surf(r):
            return DISH_V - r * r / (4 * DISH_F) - 0.006
        for rr in (0.55, 1.25, 1.95):
            lathe(p, [(rr - 0.012, surf(rr - 0.012)), (rr + 0.012, surf(rr + 0.012))], m['grey'], (28, 96), loc=(0, 0, DISH_ALT), axis='Y', node=2)
        for k in range(12):
            a = k * math.pi / 6
            pts = [(math.cos(a) * r, surf(r), DISH_ALT + math.sin(a) * r) for r in (0.55, 1.05, 1.55, 2.05, 2.46)]
            pipe(p, pts, 0.01, m['grey'], (4, 6), node=2)
    lathe(p, [(DISH_R + 0.01, front[-1][1] - 0.02), (DISH_R + 0.07, front[-1][1] + 0.02), (DISH_R + 0.07, front[-1][1] + 0.09), (DISH_R, front[-1][1] + 0.1)], m['steel'], (28, 64), loc=(0, 0, DISH_ALT), axis='Y', node=2)
    for k in range(8):
        a = k * math.pi / 4
        pts = [(math.cos(a) * r, DISH_V - r * r / (4 * DISH_F) + 0.13, DISH_ALT + math.sin(a) * r) for r in (0.5, 1.1, 1.7, 2.35)]
        pipe(p, pts, 0.045, m['steel'], (4, 8), node=2)
    focus = Vector((0, DISH_V - DISH_F + 0.2, DISH_ALT))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        r = DISH_R * 0.82
        strut(p, (math.cos(a) * r, DISH_V - r * r / (4 * DISH_F) - 0.02, DISH_ALT + math.sin(a) * r), focus, 0.035, m['alu'], (5, 10), node=2)
    lathe(p, [(0.08, 0.0), (0.2, -0.3), (0.22, -0.34), (0.22, -0.44), (0.001, -0.44)], m['dark'], (12, 24), loc=focus + Vector((0, 0.3, 0)), axis='Y', node=2)
    cyl(p, 0.06, 0.2, focus + Vector((0, 0.38, 0)), m['amber'], 'Y', (8, 16), node=2)


COMMS_TOP = 10.2
COMMS_LAMP = (0.0, 0.0, 10.62)


def comms(p, m):
    box(p, (2.4, 2.0, 0.22), (0, 0, 0.11), m['grey'], 0.03)
    box(p, (0.7, 0.55, 1.1), (0.75, 0.55, 0.77), m['white2'], 0.025)
    box(p, (0.02, 0.36, 0.3), (1.1, 0.55, 1.0), m['vent'])
    box(p, (0.5, 0.02, 0.06), (0.75, 0.27, 1.15), m['amber'])
    box(p, (0.04, 0.02, 0.03), (0.6, 0.27, 1.05), m['led'])
    cx, cy, rb, rt = -0.25, -0.1, 0.62, 0.3
    legs = []
    for k in range(3):
        a = math.radians(90 + k * 120)
        legs.append((Vector((cx + math.cos(a) * rb, cy + math.sin(a) * rb, 0.22)), Vector((cx + math.cos(a) * rt, cy + math.sin(a) * rt, COMMS_TOP))))
    for lo, hi in legs:
        strut(p, lo, hi, 0.045, m['alu'], (6, 10))
        box(p, (0.22, 0.22, 0.06), lo + Vector((0, 0, 0.03)), m['dark'])
    levels = 11

    def at(k, t):
        lo, hi = legs[k]
        return lo.lerp(hi, t)
    for i in range(levels + 1):
        t = i / levels
        for k in range(3):
            strut(p, at(k, t), at((k + 1) % 3, t), 0.018, m['alu'], (4, 6))
    for i in range(levels):
        t0, t1 = i / levels, (i + 1) / levels
        for k in range(3):
            a, b = (k, (k + 1) % 3) if i % 2 == 0 else ((k + 1) % 3, k)
            strut(p, at(a, t0), at(b, t1), 0.014, m['alu'], (4, 6))
    # Amber brackets on the legs every few sections, as on the reference mast.
    for i in (2, 5, 8):
        for k in range(3):
            box(p, (0.14, 0.14, 0.1), at(k, i / levels), m['amber'], 0.01)
    # Cable tray down one leg.
    lo, hi = legs[0]
    strut(p, lo + Vector((0.08, 0, 0.3)), hi + Vector((0.06, 0, -0.4)), 0.035, m['dark'], (4, 8))
    # The head: a platform, panel antennas, a small dish, the mast light.
    lathe(p, [(0.62, COMMS_TOP - 0.12), (0.62, COMMS_TOP - 0.04), (0.001, COMMS_TOP - 0.04)], m['grey'], (8, 24), loc=(cx, cy, 0))
    for k in range(3):
        a = math.radians(30 + k * 120)
        q = Vector((cx + math.cos(a) * 0.52, cy + math.sin(a) * 0.52, COMMS_TOP - 0.8))
        box(p, (0.28, 0.1, 1.3), q, m['white'], 0.02, rot=(0, 0, a + math.pi / 2))
        strut(p, q - Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.4)), q - Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.4)), 0.02, m['steel'], (4, 6))
    lathe(p, [(0.001, 0.0), (0.2, -0.06), (0.34, -0.16), (0.33, -0.18), (0.001, -0.04)], m['white'], (12, 24), loc=(cx, cy - 0.55, COMMS_TOP - 1.9), axis='Y')
    box(p, (0.16, 0.3, 0.16), (cx, cy - 0.35, COMMS_TOP - 1.9), m['dark'], 0.01)
    strut(p, (cx, cy, COMMS_TOP - 0.04), (cx, cy, COMMS_LAMP[2] - 0.15), 0.05, m['steel'], (6, 10))
    box(p, (0.22, 0.22, 0.05), (cx, cy, COMMS_LAMP[2] - 0.17), m['dark'])
    cyl(p, 0.09, 0.22, (cx, cy, COMMS_LAMP[2]), m['red'], seg=(8, 16))
    cyl(p, 0.11, 0.04, (cx, cy, COMMS_LAMP[2] + 0.13), m['dark'], seg=(8, 16))
    strut(p, (cx, cy, COMMS_LAMP[2] + 0.15), (cx, cy, 11.0), 0.012, m['steel'], (4, 6))


SOLAR_HINGE = 3.0


def solar(p, m):
    box(p, (1.4, 1.4, 0.18), (0, 0, 0.09), m['grey'], 0.03)
    for sx in (1, -1):
        for sy in (1, -1):
            strut(p, (sx * 0.58, sy * 0.58, 0.18), (sx * 0.1, sy * 0.1, 1.1), 0.04, m['steel'], (5, 10))
            box(p, (0.18, 0.18, 0.05), (sx * 0.58, sy * 0.58, 0.2), m['dark'])
    cyl(p, 0.11, 2.62, (0, 0, 0.18 + 1.31), m['alu'], seg=(10, 20))
    cyl(p, 0.16, 0.14, (0, 0, 1.1), m['dark'], seg=(10, 20))
    cyl(p, 0.18, 0.22, (0, 0, 2.7), m['dark'], seg=(12, 24))
    box(p, (0.38, 0.26, 0.5), (0, -0.24, 1.45), m['white2'], 0.02)
    box(p, (0.39, 0.02, 0.06), (0, -0.37, 1.62), m['amber'])
    box(p, (0.03, 0.02, 0.03), (0.1, -0.375, 1.5), m['led'])
    pipe(p, [(0, -0.24, 1.2), (0, -0.24, 0.3), (0, -0.9, 0.05)], 0.035, m['rubber'])
    # The tracking head: yaw housing, gearbox, torque tube, two wings.
    n = 1
    cyl(p, 0.17, 0.24, (0, 0, 2.93), m['steel'], seg=(12, 24), node=n)
    box(p, (0.52, 0.3, 0.3), (0, 0.02, SOLAR_HINGE), m['grey'], 0.02, node=n)
    cyl(p, 0.07, 6.1, (0, 0, SOLAR_HINGE), m['steel'], 'X', (8, 16), node=n)
    for s in (1, -1):
        cx = s * 1.63
        box(p, (2.8, 0.06, 4.0), (cx, -0.12, SOLAR_HINGE), m['alu'], 0.01, node=n)
        box(p, (2.72, 0.012, 3.92), (cx, -0.155, SOLAR_HINGE), m['cells'], node=n)
        for x in (0.75, 2.45):
            box(p, (0.06, 0.08, 3.9), (s * x, -0.05, SOLAR_HINGE), m['steel'], node=n)
        box(p, (0.3, 0.1, 0.22), (s * 1.63, -0.05, SOLAR_HINGE - 1.0), m['white2'], 0.01, node=n)


# ── Props ──

def battery(p, m):
    box(p, (2.4, 1.2, 0.12), (0, 0, 0.06), m['dark'], 0.015)
    box(p, (2.4, 0.02, 0.08), (0, -0.605, 0.06), m['hazard'])
    for s in (1, -1):
        x = s * 0.6
        box(p, (1.14, 1.1, 1.3), (x, 0, 0.77), m['white2'], 0.03)
        box(p, (0.98, 0.02, 1.1), (x, -0.555, 0.72), m['white'], 0.01, lowbev=False)
        box(p, (0.8, 0.02, 0.22), (x, -0.57, 1.14), m['vent'])
        box(p, (0.04, 0.05, 0.3), (x + s * 0.4, -0.585, 0.65), m['amber'])
        box(p, (0.02, 0.8, 0.6), (x + s * 0.575, 0, 0.8), m['ribbed'], rot=(0, 0, 0))
        box(p, (0.02, 1.0, 0.06), (x + s * 0.575, 0, 1.3), m['amber'])
        for k in range(4):
            box(p, (0.045, 0.02, 0.03), (x - 0.36 + k * 0.08, -0.575, 1.36), m['beacon' if k == 3 else 'led'], node=1, boost=4.0)
    box(p, (2.3, 0.18, 0.1), (0, 0.38, 1.47), m['dark'], 0.01)
    pipe(p, [(0.9, 0.5, 1.47), (0.9, 0.62, 1.4), (0.9, 0.62, 0.0)], 0.035, m['rubber'], (5, 10))


def o2(p, m):
    box(p, (2.6, 1.8, 0.2), (0, 0, 0.1), m['dark'], 0.02)
    for x in (-1.2, 1.2):
        box(p, (0.2, 1.8, 0.22), (x, 0, 0.11), m['hazard'])
    tank = [(0.001, 0.32), (0.3, 0.37), (0.48, 0.47), (0.55, 0.64), (0.55, 2.63), (0.48, 2.8), (0.3, 2.9), (0.001, 2.95)]
    for s in (1, -1):
        x, y = s * 0.62, 0.2
        lathe(p, tank, m['white'], (20, 32), loc=(x, y, 0), name='Tank')
        for z in (1.0, 2.25):
            lathe(p, [(0.565, z - 0.06), (0.565, z + 0.06)], m['amber'] if z < 2 else m['steel'], (14, 32), loc=(x, y, 0))
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            strut(p, (x + math.cos(a) * 0.5, y + math.sin(a) * 0.5, 0.2), (x + math.cos(a) * 0.4, y + math.sin(a) * 0.4, 0.55), 0.035, m['steel'], (4, 8))
        pipe(p, [(x, y, 2.93), (x, y, 3.0), (0, y, 3.0)], 0.035, m['steel'], (5, 10))
    pipe(p, [(0, y, 3.0), (0, -0.55, 3.0), (0, -0.55, 0.62)], 0.04, m['steel'], (5, 10))
    box(p, (0.6, 0.32, 0.42), (0, -0.62, 0.41), m['grey'], 0.02)
    for x in (-0.15, 0.15):
        cyl(p, 0.08, 0.03, (x, -0.8, 0.5), m['amber'], 'Y', (8, 16))
    lathe(p, [(0.001, 0.2), (0.18, 0.24), (0.2, 0.3), (0.2, 1.0), (0.14, 1.08), (0.001, 1.1)], m['white2'], (10, 20), loc=(0.95, -0.55, 0))
    cyl(p, 0.035, 0.12, (0.95, -0.55, 1.15), m['dark'], seg=(6, 12))


def cargo(p, m):
    box(p, (2.3, 1.9, 2.1), (0, 0, 1.1), m['white2'], 0.02)
    if p.detail:
        for s in (1, -1):
            for k in range(10):
                box(p, (0.03, 0.05, 1.85), (s * 1.16, -0.8 + k * 0.178, 1.1), m['white2'])
            for k in range(12):
                box(p, (0.05, 0.03, 1.85), (-1.0 + k * 0.182, s * 0.96, 1.1), m['white2'])
    for sx in (1, -1):
        for sy in (1, -1):
            box(p, (0.12, 0.12, 2.2), (sx * 1.14, sy * 0.94, 1.1), m['grey'], 0.01)
            for z in (0.06, 2.14):
                box(p, (0.16, 0.16, 0.12), (sx * 1.14, sy * 0.94, z), m['amber'], 0.01)
    for sy in (1, -1):
        for z in (0.05, 2.15):
            box(p, (2.2, 0.08, 0.1), (0, sy * 0.95, z), m['grey'])
    box(p, (0.02, 0.04, 2.0), (0, -0.965, 1.1), m['dark'])
    for x in (-0.75, -0.3, 0.3, 0.75):
        box(p, (0.035, 0.04, 1.95), (x, -0.99, 1.1), m['alu'])
        box(p, (0.14, 0.05, 0.05), (x + 0.07, -1.0, 1.0), m['amber'])
    box(p, (0.5, 0.02, 0.3), (0.52, -0.965, 1.65), m['amber'])


def spool(p, m):
    z = 0.5
    for s in (1, -1):
        cyl(p, 0.45, 0.04, (s * 0.4, 0, z), m['amber'], 'X', (16, 32), bev=0.008)
        strut(p, (s * 0.5, -0.42, 0.02), (s * 0.5, 0, z), 0.035, m['steel'], (4, 8))
        strut(p, (s * 0.5, 0.42, 0.02), (s * 0.5, 0, z), 0.035, m['steel'], (4, 8))
        box(p, (0.08, 1.0, 0.06), (s * 0.5, 0, 0.03), m['dark'])
    cyl(p, 0.3, 0.76, (0, 0, z), m['cable'], 'X', (16, 32))
    cyl(p, 0.04, 1.14, (0, 0, z), m['steel'], 'X', (6, 12))
    cyl(p, 0.08, 0.06, (0.2 - 0.8, 0, z), m['dark'], 'X', (8, 12))
    strut(p, (-0.6, 0, z), (-0.6, 0, z + 0.2), 0.02, m['steel'], (4, 6))
    pipe(p, [(0.1, -0.28, z - 0.08), (0.2, -0.52, 0.04), (0.5, -0.5, 0.04)], 0.035, m['cable'], (5, 10))


def utility(p, m):
    for sx in (1, -1):
        for sy in (1, -1):
            box(p, (0.06, 0.06, 0.2), (sx * 0.42, sy * 0.24, 0.1), m['dark'])
    box(p, (1.0, 0.6, 0.78), (0, 0, 0.59), m['white2'], 0.025)
    box(p, (0.86, 0.02, 0.64), (0, -0.305, 0.58), m['white'], 0.01, lowbev=False)
    box(p, (0.3, 0.02, 0.18), (0.18, -0.32, 0.78), m['amber'])
    box(p, (0.04, 0.02, 0.03), (-0.3, -0.32, 0.85), m['led'])
    box(p, (0.04, 0.02, 0.03), (-0.22, -0.32, 0.85), m['beacon'])
    box(p, (0.03, 0.04, 0.18), (0.36, -0.33, 0.55), m['steel'])
    box(p, (1.06, 0.66, 0.05), (0, 0, 1.0), m['grey'], 0.01)
    # Conduit stubs into the ground and a hazard duct out of the side.
    for x in (-0.25, 0.0, 0.25):
        strut(p, (x, 0.12, 0.0), (x, 0.12, 0.21), 0.04, m['rubber'], (5, 10))
    for z in (0.35, 0.6):
        pipe(p, [(z - 0.5, 0.3, z), (z - 0.5, 0.4, z), (z - 0.5, 0.4, 0.0)], 0.035, m['steel'], (5, 10))
    # The hazard-striped cable duct out of the right side and down into the ground.
    box(p, (0.2, 0.16, 0.16), (0.6, 0.0, 0.62), m['hazard'], 0.01)
    box(p, (0.16, 0.16, 0.6), (0.64, 0.0, 0.3), m['hazard'], 0.01)
    box(p, (0.24, 0.24, 0.05), (0.64, 0.0, 0.025), m['dark'])
    pipe(p, [(-0.5, -0.1, 0.4), (-0.58, -0.1, 0.4), (-0.58, -0.1, 0.0)], 0.045, m['steel'], (6, 10))


LIGHT_HEAD = 6.6
LIGHT_TILT = math.radians(15)


def light(p, m):
    for k in range(3):
        a = math.radians(90 + k * 120)
        foot = (math.cos(a) * 1.05, math.sin(a) * 1.05, 0.03)
        strut(p, foot, (math.cos(a) * 0.08, math.sin(a) * 0.08, 1.25), 0.035, m['steel'], (4, 8))
        box(p, (0.2, 0.2, 0.05), foot, m['dark'])
    box(p, (0.5, 0.4, 0.42), (0, 0.28, 0.25), m['grey'], 0.02)
    box(p, (0.51, 0.02, 0.06), (0, 0.07, 0.38), m['amber'])
    cyl(p, 0.075, 3.4, (0, 0, 1.7), m['alu'], seg=(8, 16))
    cyl(p, 0.1, 0.12, (0, 0, 3.4), m['dark'], seg=(8, 16))
    cyl(p, 0.055, 3.2, (0, 0, 5.0), m['alu'], seg=(8, 16))
    pipe(p, [(0.06, 0.06, 6.4), (0.06, 0.06, 3.5), (0.12, 0.26, 0.46)], 0.018, m['rubber'], (4, 6))
    # 2 × 2 lamp head in a frame, tilted down toward the front.
    tilt = Matrix.Rotation(-LIGHT_TILT, 4, 'X')
    head = Vector((0, 0, LIGHT_HEAD))
    box(p, (0.9, 0.1, 0.1), (0, 0.06, LIGHT_HEAD - 0.5), m['steel'])
    strut(p, (0, 0, 6.5), (0, 0, LIGHT_HEAD - 0.5), 0.05, m['steel'], (6, 10))
    for ix in (-0.2, 0.2):
        for iz in (-0.2, 0.2):
            c = head + tilt @ Vector((ix, 0, iz))
            b = model.box('LampBox', (0.36, 0.24, 0.36), (0, 0, 0))
            if p.detail:
                model.bevel(b, 0.02, p.seg, 30)
            b.matrix_world = Matrix.Translation(c + tilt @ Vector((0, 0.06, 0))) @ tilt
            p.add(b, m['dark'])
            lens = model.box('Lens', (0.3, 0.02, 0.3), (0, 0, 0))
            lens.matrix_world = Matrix.Translation(c + tilt @ Vector((0, -0.065, 0))) @ tilt
            p.add(lens, m['lamp'])
    for s in (1, -1):
        strut(p, head + tilt @ Vector((s * 0.42, 0.06, -0.42)), head + tilt @ Vector((s * 0.42, 0.06, 0.42)), 0.025, m['steel'], (4, 8))
        strut(p, (s * 0.42, 0.06, LIGHT_HEAD - 0.5), head + tilt @ Vector((s * 0.42, 0.06, -0.42)), 0.025, m['steel'], (4, 8))


BEACON_Z = 2.62


def beacon(p, m):
    for k in range(3):
        a = math.radians(90 + k * 120)
        strut(p, (math.cos(a) * 0.42, math.sin(a) * 0.42, 0.02), (0, 0, 0.5), 0.025, m['steel'], (4, 8))
    box(p, (0.36, 0.36, 0.26), (0, 0, 0.13), m['dark'], 0.015)
    box(p, (0.37, 0.37, 0.05), (0, 0, 0.2), m['hazard'])
    bands = 6
    for k in range(bands):
        z0 = 0.26 + k * (2.26 / bands)
        cyl(p, 0.045, 2.26 / bands, (0, 0, z0 + 1.13 / bands), m['amber'] if k % 2 else m['white'], seg=(8, 12))
    box(p, (0.3, 0.02, 0.22), (0, -0.07, 1.6), m['cells'], rot=(math.radians(-30), 0, 0))
    box(p, (0.14, 0.14, 0.05), (0, 0, 2.53), m['dark'])
    cyl(p, 0.075, 0.14, (0, 0, BEACON_Z), m['beacon'], seg=(10, 20))
    cyl(p, 0.09, 0.03, (0, 0, BEACON_Z + 0.085), m['dark'], seg=(10, 20))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        strut(p, (math.cos(a) * 0.09, math.sin(a) * 0.09, 2.55), (math.cos(a) * 0.09, math.sin(a) * 0.09, BEACON_Z + 0.08), 0.008, m['steel'], (3, 6))


def toolrack(p, m):
    for sx in (1, -1):
        for sy in (1, -1):
            box(p, (0.06, 0.06, 2.1), (sx * 0.97, sy * 0.31, 1.05), m['steel'])
        box(p, (0.07, 0.07, 0.4), (sx * 0.97, -0.31, 0.2), m['hazard'])
        box(p, (0.04, 0.62, 0.06), (sx * 0.97, 0, 1.2), m['steel'])
    box(p, (2.0, 0.04, 1.85), (0, 0.3, 1.08), m['white2'], 0.01, lowbev=False)
    box(p, (2.0, 0.66, 0.06), (0, 0, 0.26), m['grey'], 0.01)
    box(p, (2.0, 0.42, 0.05), (0, 0.1, 1.12), m['grey'], 0.01)
    box(p, (2.08, 0.72, 0.06), (0, 0, 2.1), m['white'], 0.015)
    box(p, (2.08, 0.02, 0.06), (0, -0.365, 2.05), m['amber'])
    # Spare backpack (PLSS) on the lower shelf, a case beside it.
    box(p, (0.55, 0.3, 0.72), (-0.55, 0.05, 0.65), m['white'], 0.06)
    box(p, (0.46, 0.05, 0.3), (-0.55, -0.12, 0.75), m['grey'], 0.02)
    box(p, (0.2, 0.02, 0.04), (-0.55, -0.15, 0.95), m['amber'])
    box(p, (0.7, 0.4, 0.3), (0.45, 0.02, 0.44), m['amber'], 0.03)
    box(p, (0.72, 0.41, 0.02), (0.45, 0.02, 0.5), m['dark'])
    # Tools on the back board: a hammer, a scoop, tongs, a rake.
    for x, head in ((-0.7, (0.14, 0.05, 0.05)), (-0.35, (0.1, 0.1, 0.03)), (0.0, None), (0.35, (0.2, 0.03, 0.02))):
        strut(p, (x, 0.25, 1.25), (x, 0.25, 1.95), 0.012, m['alu'], (4, 6))
        if head:
            box(p, head, (x, 0.24, 1.96 if head[0] < 0.19 else 1.25), m['dark'])
    for dx in (-0.03, 0.03):
        strut(p, (dx, 0.24, 1.3), (dx * 2, 0.24, 1.9), 0.008, m['steel'], (4, 6))
    # Tether coils on hooks and a helmet on the shelf.
    for x in (0.65, 0.85):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.015, major_segments=16 if p.detail else 8,
                                         minor_segments=6 if p.detail else 3, location=(x, 0.24, 1.72), rotation=(math.pi / 2, 0, 0))
        t = bpy.context.active_object
        p.add(t, m['amber'] if x < 0.7 else m['rubber'])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, segments=16 if p.detail else 10, ring_count=8 if p.detail else 5, location=(-0.6, 0.12, 1.3))
    p.add(bpy.context.active_object, m['white'])
    visor = model.box('Visor', (0.2, 0.04, 0.13), (-0.6, -0.03, 1.32))
    p.add(visor, m['lens'])


# ── The kit: names are what the runtime reads. ──

PIECES = [
    kit.Piece('Garage', garage, budget=8000, module=True, width=8.4,
              bake_pose={1: Matrix.Translation((0, 0, DOOR_OPEN))},
              nodes=[(1, 'Garage_Door', (0, DOOR_Y, G_FLOOR), None, 'hinge'),
                     (2, 'Garage_Charge', (-1.9, 2.265, 1.2), None, 'mesh')]),
    kit.Piece('TelescopePlatform', telescope, budget=8000, module=True, width=6.4,
              bake_pose={3: Matrix.Rotation(math.radians(100), 4, 'Y'), 4: Matrix.Rotation(math.radians(-100), 4, 'Y')},
              nodes=[(3, 'Telescope_ShutterL', (T_R + 0.05, 0, T_D + T_RING), None, 'hinge'),
                     (4, 'Telescope_ShutterR', (-T_R - 0.05, 0, T_D + T_RING), None, 'hinge'),
                     (5, 'Telescope_MountYaw', (0, 0, T_D + 1.05), None, 'hinge'),
                     (6, 'Telescope_Tube', (0, 0, T_ALT), 'Telescope_MountYaw', 'hinge'),
                     (7, 'Telescope_Status', (-1.85, 1.49, T_D + 0.7), None, 'mesh')]),
    kit.Piece('Dish', dish, budget=8000, module=True, width=5.4,
              nodes=[(1, 'Dish_Yaw', (0, 0, DISH_YAW_Z), None, 'hinge'),
                     (2, 'Dish_Pitch', (0, 0, DISH_ALT), 'Dish_Yaw', 'hinge')]),
    kit.Piece('CommsMast', comms, budget=8000, module=True, width=2.6,
              empties=[('CommsMast_Lamp', (-0.25, -0.1, COMMS_LAMP[2]), None, None)]),
    kit.Piece('SolarArray', solar, budget=8000, module=True, width=6.4,
              nodes=[(1, 'SolarArray_Panel', (0, 0, SOLAR_HINGE), None, 'hinge')]),
    kit.Piece('BatteryBank', battery, budget=1500, width=2.6,
              nodes=[(1, 'BatteryBank_Leds', (0, -0.575, 1.36), None, 'mesh')]),
    kit.Piece('O2Tanks', o2, budget=1500, width=2.8),
    kit.Piece('CargoContainer', cargo, budget=1500, width=2.6),
    kit.Piece('CableSpool', spool, budget=1500, width=1.4),
    kit.Piece('UtilityBox', utility, budget=1500, width=1.4),
    kit.Piece('LightMast', light, budget=1500, width=2.2,
              empties=[('LightMast_Lamp', (0, -0.08, LIGHT_HEAD), (0, -math.cos(LIGHT_TILT), -math.sin(LIGHT_TILT)), None)]),
    kit.Piece('NavBeacon', beacon, budget=1500, width=0.9,
              empties=[('NavBeacon_Lamp', (0, 0, BEACON_Z), None, None)]),
    kit.Piece('ToolRack', toolrack, budget=1500, width=2.2),
]


def pose_for_renders(res):
    """Show the moving parts working: bay open, dome open, tube and dish up,
    the array tilted to a low sun."""
    made = {n: o for r in res.values() for n, o in r['made'].items() if n}
    made['Garage_Door'][0].location.z += DOOR_OPEN
    made['Telescope_ShutterL'][0].rotation_euler.y = math.radians(85)
    made['Telescope_ShutterR'][0].rotation_euler.y = math.radians(-85)
    made['Telescope_MountYaw'][0].rotation_euler.z = math.radians(-25)
    made['Telescope_Tube'][0].rotation_euler.x = math.radians(-50)
    made['Dish_Yaw'][0].rotation_euler.z = math.radians(20)
    made['Dish_Pitch'][0].rotation_euler.x = math.radians(-35)
    made['SolarArray_Panel'][0].rotation_euler.x = math.radians(-20)
    bpy.context.view_layer.update()


TURN = [(f'{a:03d}', a, 16) for a in range(0, 360, 45)]


def lineup(res, out_dir, width=2800, height=620, samples=24):
    """Every piece in a row, as on the reference's asset overview."""
    order = ['Garage', 'CommsMast', 'Dish', 'TelescopePlatform', 'SolarArray', 'BatteryBank', 'O2Tanks',
             'CargoContainer', 'NavBeacon', 'LightMast', 'UtilityBox', 'CableSpool', 'ToolRack']
    x = 0.0
    widths = {pc.name: pc.width for pc in PIECES}
    for n in order:
        w = widths[n]
        res[n]['root'].location.x = x + w / 2
        x += w + 1.6
    bpy.context.view_layer.update()
    roots = [res[n]['root'] for n in order]
    kit.show_only(roots, roots)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = width, height
    sc.cycles.samples = samples
    cam = kit.camera(ortho=True)
    lo, hi = kit.bounds([o for r in roots for o in kit.visible_meshes(r)])
    centre = (lo + hi) / 2
    kit.aim(cam, centre, -12, 12, 150)
    cam.data.ortho_scale = (hi.x - lo.x) * 1.04
    sc.render.filepath = os.path.join(out_dir, 'lineup.png')
    bpy.ops.render.render(write_still=True)
    for r in roots:
        r.location.x = 0


def main():
    scene.reset(seed=31)
    out = argv[0] if argv else os.path.join(HERE, '..', 'build')
    renders = argv[1] if len(argv) > 1 else None
    pieces = [pc for pc in PIECES if pc.name in os.environ['KIT_PIECES'].split(',')] if os.environ.get('KIT_PIECES') else PIECES
    res = kit.build(pieces, mats, out, name='basekit', size=int(os.environ.get('KIT_ATLAS', 2048)))
    roots = [r['root'] for r in res.values()]
    kit.export(roots, os.path.join(out, 'basekit.glb'))
    for n, r in res.items():
        print(f'TRIS {n}: {r["total"]}  {r["tris"]}')
    if not renders:
        return
    pose_for_renders(res)
    kit.lamps_on(4.0)
    kit.studio()
    only = os.environ.get('KIT_ONLY')
    for pc in PIECES:
        if not pc.module or (only and pc.name not in only.split(',')):
            continue
        kit.show_only(roots, [res[pc.name]['root']])
        kit.turntable(res[pc.name]['root'], os.path.join(renders, pc.name), TURN, size=int(os.environ.get('KIT_VIEW', 512)))
    if not only:
        lineup(res, renders)


def preview():
    """High-poly with procedural paint, no bake: the fast critique loop."""
    renders = argv[1]
    names = argv[2].split(',') if len(argv) > 2 else [pc.name for pc in PIECES]
    scene.reset(seed=31)
    m = mats()
    kit.studio()
    for name in names:
        lo = kit._join(PIECES, m, False, only=[name])
        kit._drop_bottoms(lo)
        print(f'PREVIEW {name}: low {model.triangle_count(lo)} tris')
        bpy.data.objects.remove(lo, do_unlink=True)
        hi = kit._join(PIECES, m, True, only=[name])
        model.shade_smooth(hi, 35)
        i = [pc.name for pc in PIECES].index(name)
        hi.location.x -= i * kit.SPACING
        root = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(root)
        hi.parent = root
        bpy.context.view_layer.update()
        views = [tuple(v.split(':')[:1]) + tuple(float(x) for x in v.split(':')[1:]) for v in os.environ['KIT_VIEWS'].split(',')] if os.environ.get('KIT_VIEWS') else [('a', -35, 18), ('b', 145, 22)]
        kit.turntable(root, os.path.join(renders, 'preview', name), views,
                      size=int(os.environ.get('KIT_VIEW', 400)), samples=12)
        bpy.data.objects.remove(hi, do_unlink=True)
        bpy.data.objects.remove(root, do_unlink=True)


if PREVIEW:
    preview()
else:
    main()
