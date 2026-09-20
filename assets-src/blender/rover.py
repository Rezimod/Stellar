"""The STELLAR Lunar Exploration Rover: the crew's vehicle on the Moon.

Run:  Blender -b -P assets-src/blender/rover.py -- <out-dir> [renders-dir]
Writes <out-dir>/rover.glb (raw; optimise it with gltf-transform).

Spec (from ~/Desktop/stellar-refs/rover/moon rover 2.png; NOTES.md rules):
3.15 × 1.95 × 1.70 m, unpressurised, four wheels. A flat carbon pan between
two white side panels carrying STELLAR and the full five-cross flag; an open
two-seat crew station with headrests and harness straps under a tubular roll
cage; a dashboard with a yoke and two screens; four lugged wheels on double
wishbones with outboard coil-overs and their own uprights; light pods on the
nose bar; a rear deck with cargo cases, a tool rack and the instrument mast
(dish, camera head, whip); a stowed tool arm on the nose.

The lone red crosses of the reference are replaced by the five-cross flag,
and no lettering is copied from the image.

Axes: front -Y, up +Z, port +X (glTF: forward +Z, up +Y). Units: metres.
Nodes the runtime drives: Arm_{LF,LR,RF,RR} (suspension travel, about X),
Steer_{…} (about Z), Wheel_{…} (about X), Mast (about Z), ToolArm and
ToolFore. Empties: Seat, Headlight_{P,S}, MastHead, Charge.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import scene, model, decal, vehicle  # noqa: E402
import hardsurface as hs  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, '..', 'build')
RENDERS = argv[1] if len(argv) > 1 else None

WHITE = (0.82, 0.81, 0.78, 1)
GREY = (0.34, 0.345, 0.35, 1)
DARK = (0.055, 0.058, 0.062, 1)
STEEL = (0.20, 0.205, 0.21, 1)
SEAT = (0.42, 0.40, 0.36, 1)
AMBER = (0.93, 0.45, 0.1, 1)

# The chassis, and where the wheels stand under it.
TRACK, BASE = 0.80, 1.12
WHEEL_R, WHEEL_W = 0.44, 0.32
PAN_Z = 0.60          # top of the floor pan
PAN_HX, PAN_HY = 0.62, 1.26
ARM_X, ARM_Z = 0.30, 0.46   # inboard wishbone pivot
CAGE_Z = 1.46

# The corners, in build order: left front, left rear, right front, right rear.
CORNERS = [('LF', 1, -1), ('LR', 1, 1), ('RF', -1, -1), ('RR', -1, 1)]
NODE = {name: 1 + i for i, (name, _, _) in enumerate(CORNERS)}                 # 1…4  arms
NODE.update({f'S{name}': 5 + i for i, (name, _, _) in enumerate(CORNERS)})     # 5…8  uprights
NODE.update({f'W{name}': 9 + i for i, (name, _, _) in enumerate(CORNERS)})     # 9…12 wheels
MAST_NODE, ARM_NODE, FORE_NODE = 13, 14, 15


def mats():
    flag = hs.image_mat('RoverFlag', decal.georgian_flag('rover_flag'), rough=0.55)
    return {
        'white': hs.paint('RoverWhite', WHITE, seed=4.0, wear=0.42, grime=0.42, panel=(0.9, 0.62, 0.5), dust=0.5),
        'grey': hs.paint('RoverGrey', GREY, seed=6.0, wear=0.3, grime=0.35, panel=(0.7, 0.5, 0.4), dust=0.4),
        'dark': hs.metal('RoverDark', DARK, rough=0.52, metallic=0.4, dust=0.35),
        'steel': hs.metal('RoverSteel', STEEL, rough=0.36, metallic=0.85, dust=0.3),
        'tyre': hs.metal('RoverTyre', (0.10, 0.105, 0.112, 1), rough=0.72, metallic=0.25, dust=0.7, dust_height=0.5),
        'seat': hs.paint('RoverSeat', SEAT, seed=9.0, wear=0.2, grime=0.3, panel=(0.3, 0.2, 0.2), seam=0.02),
        'strap': hs.flat('RoverStrap', (0.16, 0.17, 0.19, 1), rough=0.85),
        'ink': hs.flat('RoverInk', (0.04, 0.04, 0.045, 1), rough=0.6),
        'flag': flag,
        'lamp': hs.flat('RoverLamp', (0.85, 0.88, 0.95, 1), rough=0.25, emit=(1.0, 0.97, 0.9, 1), emit_strength=6.0),
        'screen': hs.flat('RoverScreen', (0.03, 0.08, 0.1, 1), rough=0.2, emit=(0.22, 0.85, 0.82, 1), emit_strength=2.4),
    }


def box(p, m, name, size, loc, node=0, bev=0.0):
    o = model.box(name, size, loc)
    if bev and p.detail:
        model.bevel(o, bev)
    return p.add(o, m, node)


def tube(p, m, name, a, b, r, node=0, seg=None):
    """A round bar from a to b — the cage, the wishbones, the rack."""
    a, b = Vector(a), Vector(b)
    d = b - a
    o = model.cylinder(name, r, d.length, 10 if (seg is None and p.detail) else (seg or 6), (0, 0, 0))
    q = d.normalized().to_track_quat('Z', 'Y')
    o.rotation_euler = q.to_euler()
    o.location = (a + b) / 2
    return p.add(o, m, node)


def chassis(p, m):
    """The pan, its rails and bumpers, and the white flank panels."""
    box(p, m['dark'], 'Pan', (PAN_HX * 2, PAN_HY * 2, 0.11), (0, 0, PAN_Z - 0.055), bev=0.02)
    box(p, m['steel'], 'Skid', (PAN_HX * 1.8, PAN_HY * 1.9, 0.04), (0, 0, PAN_Z - 0.13))
    for s in (1, -1):
        # The longitudinal rail, and the white panel hung outboard of it.
        tube(p, m['steel'], f'Rail{s}', (s * PAN_HX, -PAN_HY, PAN_Z - 0.03), (s * PAN_HX, PAN_HY, PAN_Z - 0.03), 0.045)
        box(p, m['white'], f'Flank{s}', (0.07, 1.5, 0.44), (s * (PAN_HX + 0.05), 0.18, PAN_Z + 0.2), bev=0.015)
        box(p, m['grey'], f'FlankCap{s}', (0.09, 0.1, 0.46), (s * (PAN_HX + 0.05), -0.57, PAN_Z + 0.2))
        # Under-panel boxes: the battery on one side, the avionics on the other.
        box(p, m['grey'], f'Pod{s}', (0.3, 0.84, 0.3), (s * 0.42, 0.42, PAN_Z - 0.2), bev=0.02)
    # Nose bar with the light pods, and the rear bumper.
    tube(p, m['steel'], 'NoseBar', (-0.66, -PAN_HY - 0.12, PAN_Z + 0.06), (0.66, -PAN_HY - 0.12, PAN_Z + 0.06), 0.05)
    for s in (1, -1):
        tube(p, m['steel'], f'NoseStay{s}', (s * 0.6, -PAN_HY - 0.12, PAN_Z + 0.06), (s * 0.5, -PAN_HY + 0.2, PAN_Z - 0.02), 0.035)
        pod = box(p, m['dark'], f'LampPod{s}', (0.26, 0.12, 0.2), (s * 0.5, -PAN_HY - 0.2, PAN_Z + 0.24), bev=0.02)
        for dx in (-0.055, 0.055):
            for dz in (-0.045, 0.045):
                box(p, m['lamp'], f'Lamp{s}{dx}{dz}', (0.07, 0.02, 0.06), (s * 0.5 + dx, -PAN_HY - 0.27, PAN_Z + 0.24 + dz))
    tube(p, m['steel'], 'TailBar', (-0.6, PAN_HY + 0.08, PAN_Z + 0.06), (0.6, PAN_HY + 0.08, PAN_Z + 0.06), 0.045)


def crew(p, m):
    """Two seats, their harnesses, the footwell and the dashboard."""
    for s in (1, -1):
        x = s * 0.33
        box(p, m['seat'], f'SeatPan{s}', (0.46, 0.5, 0.11), (x, 0.12, PAN_Z + 0.2), bev=0.03)
        back = box(p, m['seat'], f'SeatBack{s}', (0.44, 0.1, 0.68), (x, 0.38, PAN_Z + 0.56), bev=0.03)
        back.rotation_euler = (-0.18, 0, 0)
        for d in (-1, 1):
            box(p, m['steel'], f'HeadPost{s}{d}', (0.03, 0.03, 0.14), (x + d * 0.08, 0.41, PAN_Z + 0.92))
        box(p, m['seat'], f'SeatHead{s}', (0.3, 0.12, 0.16), (x, 0.42, PAN_Z + 1.04), bev=0.04)
        box(p, m['grey'], f'SeatFrame{s}', (0.5, 0.56, 0.05), (x, 0.14, PAN_Z + 0.13))
        for d in (-1, 1):
            strap = box(p, m['strap'], f'Strap{s}{d}', (0.09, 0.03, 0.66), (x + d * 0.13, 0.3, PAN_Z + 0.52))
            strap.rotation_euler = (-0.2, d * 0.22 * s, 0)
    # Footwell floor plate and the dash the yoke sits on.
    box(p, m['steel'], 'Footwell', (0.96, 0.5, 0.03), (0, -0.4, PAN_Z + 0.03))
    dash = box(p, m['grey'], 'Dash', (0.88, 0.2, 0.26), (0, -0.66, PAN_Z + 0.42), bev=0.03)
    dash.rotation_euler = (0.32, 0, 0)
    for s in (1, -1):
        sc = box(p, m['screen'], f'Screen{s}', (0.3, 0.02, 0.18), (s * 0.24, -0.62, PAN_Z + 0.52))
        sc.rotation_euler = (0.32, 0, 0)
    col = box(p, m['dark'], 'Column', (0.08, 0.26, 0.08), (0.33, -0.56, PAN_Z + 0.56))
    col.rotation_euler = (0.9, 0, 0)
    rim = hs.lathe('YokeRim', [(0.028, 0.0), (0.028, 0.02)], segments=16 if p.detail else 10,
                   location=(0.33, -0.66, PAN_Z + 0.68), axis='Y')
    rim.scale = (5.6, 1.0, 5.6)
    rim.rotation_euler = (1.25, 0, 0)
    p.add(rim, m['dark'])
    for a in (-1, 1):
        spoke = box(p, m['dark'], f'YokeSpoke{a}', (0.14, 0.03, 0.03), (0.33 + a * 0.07, -0.655, PAN_Z + 0.675))
        spoke.rotation_euler = (1.25, 0, 0)


def cage(p, m):
    """The roll cage: two hoops, the spine between them and the diagonals."""
    top = CAGE_Z
    for y, h in ((-0.18, top - 0.06), (0.62, top)):
        for s in (1, -1):
            tube(p, m['steel'], f'Post{y}{s}', (s * 0.56, y, PAN_Z + 0.06), (s * 0.5, y, h - 0.12), 0.034)
        tube(p, m['steel'], f'Hoop{y}', (-0.5, y, h - 0.12), (0.5, y, h - 0.12), 0.034)
        for s in (1, -1):
            tube(p, m['steel'], f'Knee{y}{s}', (s * 0.5, y, h - 0.12), (s * 0.44, y, h), 0.034)
        tube(p, m['steel'], f'Crown{y}', (-0.44, y, h), (0.44, y, h), 0.034)
    for s in (1, -1):
        tube(p, m['steel'], f'Spine{s}', (s * 0.46, -0.18, top - 0.06), (s * 0.46, 0.62, top), 0.03)
        tube(p, m['steel'], f'Brace{s}', (s * 0.54, 0.62, PAN_Z + 0.3), (s * 0.48, -0.18, top - 0.3), 0.03)
    # Mirror stalks on the front hoop; the crew station stays open.
    for s in (1, -1):
        tube(p, m['steel'], f'Mirror{s}', (s * 0.58, -0.2, PAN_Z + 0.5), (s * 0.74, -0.34, PAN_Z + 0.64), 0.018)
        box(p, m['dark'], f'MirrorHead{s}', (0.05, 0.1, 0.12), (s * 0.76, -0.36, PAN_Z + 0.68))


def deck(p, m):
    """The rear deck: cargo cases, the tool rack and the charge socket."""
    box(p, m['dark'], 'Deck', (1.18, 0.62, 0.05), (0, 0.92, PAN_Z + 0.06))
    for i, (x, w) in enumerate(((-0.3, 0.46), (0.3, 0.46))):
        case = box(p, m['white'], f'Case{i}', (w, 0.42, 0.34), (x, 0.9, PAN_Z + 0.26), bev=0.02)
        box(p, m['grey'], f'CaseLid{i}', (w + 0.02, 0.44, 0.04), (x, 0.9, PAN_Z + 0.45))
        for d in (-1, 1):
            box(p, m['steel'], f'CaseClasp{i}{d}', (0.05, 0.02, 0.1), (x + d * 0.16, 0.68, PAN_Z + 0.4))
        if p.detail:
            f = hs.plate(f'CaseFlag{i}', 0.2, 0.13, (x, 0.685, PAN_Z + 0.28), (1, 0, 0), (0, 0, 1))
            p.add(f, m['flag'])
    for s in (1, -1):
        tube(p, m['steel'], f'RackPost{s}', (s * 0.58, 1.18, PAN_Z + 0.08), (s * 0.58, 1.18, PAN_Z + 0.5), 0.028)
    tube(p, m['steel'], 'RackBar', (-0.58, 1.18, PAN_Z + 0.5), (0.58, 1.18, PAN_Z + 0.5), 0.028)
    for i, x in enumerate((-0.34, -0.1, 0.22)):
        t = model.cylinder(f'Tool{i}', 0.035, 0.42, 8 if p.detail else 6, (x, 1.18, PAN_Z + 0.3), (0, 0, 0))
        p.add(t, m['dark'])
    box(p, m['grey'], 'Socket', (0.16, 0.1, 0.16), (0.5, 1.2, PAN_Z + 0.22))


def mast(p, m):
    """The instrument mast: column, dish, camera head and whip, on its node."""
    x0, y0, z0 = -0.46, 1.06, PAN_Z + 0.08
    n = MAST_NODE
    col = model.cylinder('MastCol', 0.05, 0.92, 10 if p.detail else 6, (x0, y0, z0 + 0.46))
    p.add(col, m['steel'], n)
    box(p, m['dark'], 'MastHeadBox', (0.16, 0.14, 0.14), (x0, y0, z0 + 0.98), node=n)
    for s in (1, -1):
        box(p, m['lamp'], f'MastEye{s}', (0.05, 0.02, 0.05), (x0 + s * 0.045, y0 - 0.08, z0 + 0.99), node=n)
    dish = hs.lathe('MastDish', [(0.0, 0.0), (0.08, 0.012), (0.17, 0.05), (0.22, 0.09)],
                    segments=14 if p.detail else 10, location=(x0 + 0.16, y0 + 0.02, z0 + 0.86), axis='Y')
    dish.rotation_euler = (1.25, 0, 0.5)
    p.add(dish, m['white'], n)
    tube(p, m['steel'], 'MastWhip', (x0 - 0.1, y0 + 0.02, z0 + 0.9), (x0 - 0.14, y0 + 0.02, z0 + 1.32), 0.012, node=n)
    box(p, m['grey'], 'MastBase', (0.18, 0.18, 0.1), (x0, y0, z0 + 0.04))


def tool_arm(p, m):
    """The sampling arm, stowed along the nose: shoulder, forearm, scoop."""
    sx, sy, sz = 0.5, -0.9, PAN_Z + 0.1
    box(p, m['grey'], 'ArmShoulder', (0.14, 0.16, 0.14), (sx, sy, sz), node=ARM_NODE)
    tube(p, m['steel'], 'ArmUpper', (sx, sy, sz), (sx, sy - 0.02, sz + 0.34), 0.045, node=ARM_NODE)
    tube(p, m['steel'], 'ArmFore', (sx, sy - 0.02, sz + 0.34), (sx, sy + 0.4, sz + 0.4), 0.038, node=FORE_NODE)
    scoop = hs.lathe('ArmScoop', [(0.0, 0.0), (0.07, 0.03), (0.09, 0.11)], segments=10 if p.detail else 8,
                     location=(sx, sy + 0.44, sz + 0.4), axis='Y')
    p.add(scoop, m['steel'], FORE_NODE)


def corner(p, m, tag, sx, sy):
    """One corner: the wishbones and coil-over on the arm node, the upright on
    the steering node, the wheel on its own."""
    arm_n, steer_n, wheel_n = NODE[tag], NODE[f'S{tag}'], NODE[f'W{tag}']
    px, py = sx * ARM_X, sy * BASE
    wx, wy, wz = sx * TRACK, sy * BASE, WHEEL_R
    # Lower and upper wishbones, splayed fore and aft from the pan.
    for dy, z0, z1, r in ((-0.26, ARM_Z - 0.12, wz - 0.1, 0.035), (0.26, ARM_Z - 0.12, wz - 0.1, 0.035),
                          (-0.18, ARM_Z + 0.28, wz + 0.2, 0.028), (0.18, ARM_Z + 0.28, wz + 0.2, 0.028)):
        tube(p, m['steel'], f'Bone{tag}{dy}{z0}', (px, py + dy, z0), (wx - sx * 0.08, wy, z1), r, node=arm_n)
    # The coil-over, leaning in over the wheel.
    tube(p, m['dark'], f'Shock{tag}', (px + sx * 0.06, py, ARM_Z + 0.62), (wx - sx * 0.14, wy, wz + 0.02), 0.045, node=arm_n)
    coil = model.cylinder(f'Coil{tag}', 0.065, 0.3, 10 if p.detail else 6, (0, 0, 0))
    a = Vector((px + sx * 0.1, py, ARM_Z + 0.5)); b = Vector((wx - sx * 0.2, wy, wz + 0.16))
    coil.rotation_euler = (b - a).normalized().to_track_quat('Z', 'Y').to_euler()
    coil.location = (a + b) / 2
    p.add(coil, m['steel'], arm_n)
    # The upright, its brake disc and the fender over the wheel.
    box(p, m['grey'], f'Upright{tag}', (0.12, 0.16, 0.42), (wx - sx * 0.06, wy, wz + 0.04), node=steer_n)
    disc = model.cylinder(f'Disc{tag}', 0.19, 0.03, 12 if p.detail else 8, (wx - sx * 0.02, wy, wz), (0, math.pi / 2, 0))
    p.add(disc, m['steel'], steer_n)
    box(p, m['dark'], f'Caliper{tag}', (0.07, 0.1, 0.14), (wx - sx * 0.04, wy - 0.16, wz + 0.1), node=steer_n)
    # The wheel: a lugged tyre on a spoked hub.
    tyre = hs.lathe(f'Tyre{tag}', [(WHEEL_R - 0.13, -WHEEL_W / 2), (WHEEL_R - 0.02, -WHEEL_W / 2 + 0.06),
                                   (WHEEL_R, -WHEEL_W / 2 + 0.11), (WHEEL_R, WHEEL_W / 2 - 0.11),
                                   (WHEEL_R - 0.02, WHEEL_W / 2 - 0.06), (WHEEL_R - 0.13, WHEEL_W / 2)],
                    segments=20 if p.detail else 14, location=(wx, wy, wz), axis='X')
    p.add(tyre, m['tyre'], wheel_n)
    hub = hs.lathe(f'Hub{tag}', [(0.0, -0.05), (0.1, -0.06), (0.16, -0.02), (0.16, 0.02), (0.1, 0.06), (0.0, 0.05)],
                   segments=12 if p.detail else 8, location=(wx + sx * 0.02, wy, wz), axis='X')
    p.add(hub, m['steel'], wheel_n)
    for k in range(6 if p.detail else 4):
        a = 2 * math.pi * k / (6 if p.detail else 4)
        spoke = box(p, m['grey'], f'Spoke{tag}{k}', (0.03, 0.05, WHEEL_R - 0.14),
                    (wx + sx * 0.04, wy + math.sin(a) * (WHEEL_R - 0.2) / 2, wz + math.cos(a) * (WHEEL_R - 0.2) / 2), node=wheel_n)
        spoke.rotation_euler = (-a, 0, 0)
    if p.detail:
        # Tread lugs, for the bake only: the low-poly tyre carries them as normal detail.
        for k in range(18):
            a = 2 * math.pi * k / 18
            for off in (-0.08, 0.08):
                lug = box(p, m['tyre'], f'Lug{tag}{k}{off}', (0.1, 0.09, 0.05),
                          (wx + off, wy + math.sin(a) * (WHEEL_R + 0.01), wz + math.cos(a) * (WHEEL_R + 0.01)), node=wheel_n)
                lug.rotation_euler = (-a, 0, 0)


def markings(p, m):
    """STELLAR and the five-cross flag on both flanks, as the sheets place them."""
    for s in (1, -1):
        x = s * (PAN_HX + 0.09)
        right = (0, 1, 0) if s > 0 else (0, -1, 0)
        w = decal.wordmark('STELLAR', 0.115, (0, 0, 0), (0, 0, 0), extrude=0.0, name=f'RoverWord{s}')
        hs.orient(w, (x, 0.36, PAN_Z + 0.2), right, (0, 0, 1))
        p.add(w, m['ink'])
        f = hs.plate(f'RoverFlank{s}', 0.24, 0.16, (x, -0.16, PAN_Z + 0.2), right, (0, 0, 1))
        p.add(f, m['flag'])


def build_rover(p):
    m = mats()
    chassis(p, m)
    crew(p, m)
    cage(p, m)
    deck(p, m)
    mast(p, m)
    tool_arm(p, m)
    for tag, sx, sy in CORNERS:
        corner(p, m, tag, sx, sy)
    if p.detail:
        markings(p, m)


def empties(root, objs):
    def e(name, loc, parent=None, size=0.12):
        return hs.empty(name, loc, parent or root, size)
    e('Seat', (0.33, 0.1, PAN_Z + 0.82))
    e('MastHead', (-0.46, 1.06, PAN_Z + 1.06), objs.get('Mast'))
    for s, tag in ((1, 'P'), (-1, 'S')):
        e(f'Headlight_{tag}', (s * 0.5, -PAN_HY - 0.3, PAN_Z + 0.24))
    e('Charge', (0.5, 1.28, PAN_Z + 0.22))


def main():
    scene.reset(seed=17)
    nodes = []
    for tag, sx, sy in CORNERS:
        nodes.append((NODE[tag], f'Arm_{tag}', (sx * ARM_X, sy * BASE, ARM_Z)))
        nodes.append((NODE[f'S{tag}'], f'Steer_{tag}', (sx * TRACK, sy * BASE, WHEEL_R)))
        nodes.append((NODE[f'W{tag}'], f'Wheel_{tag}', (sx * TRACK, sy * BASE, WHEEL_R)))
    nodes.append((MAST_NODE, 'Mast', (-0.46, 1.06, PAN_Z + 0.08)))
    nodes.append((ARM_NODE, 'ToolArm', (0.5, -0.9, PAN_Z + 0.1)))
    nodes.append((FORE_NODE, 'ToolFore', (0.5, -0.92, PAN_Z + 0.44)))
    counts = vehicle.build('Rover', build_rover, OUT, RENDERS, nodes=nodes, empties_fn=empties, cage=0.06, lod=False)
    print('rover:', counts)


main()
