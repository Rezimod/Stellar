"""The STELLAR lunar lander: what the crew flies down in, and leaves on.

Run:  Blender -b -P assets-src/blender/lander.py -- <out-dir> [renders-dir]
Writes <out-dir>/lander.glb (raw; optimise it with gltf-transform).

Spec (from ~/Desktop/stellar-explore/refs/lander/Lunar Lander 2.png; NOTES.md rules):
4.8 m tall, 4.1 m across, 6.2 m leg span, four descent engines. A tapered
octagonal crew module in white panels over a dark equipment deck, four gold
foil propellant tanks at its corners, a crew hatch with a porch and a ladder
down the front leg, four legs on dished footpads with their shock struts and
braces, four engine bells under the deck, RCS quads on the module's corners,
and a mast with the dish and the docking light on top.

The sheet's lone red crosses are replaced by the five-cross flag, and no
lettering is copied from the image.

Axes: front -Y, up +Z, port +X (glTF: forward +Z, up +Y). Units: metres.
There are no moving parts: the plume, its light and the pad lamp stay
code-built in moon-lander.ts. Empties: Hatch, Porch, EngineCentre.
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

WHITE = (0.80, 0.79, 0.76, 1)
DECK = (0.09, 0.093, 0.10, 1)
STEEL = (0.26, 0.27, 0.28, 1)
GOLD = (0.62, 0.43, 0.10, 1)

DECK_Z0, DECK_Z1 = 1.02, 1.50     # the equipment deck the module stands on
BODY_Z1 = 4.30                    # the top of the crew module
BODY_R0, BODY_R1 = 2.05, 1.25     # module radius at the deck and at the top
LEG_R = 3.10                      # footpad centres: a 6.2 m span
PAD_R = 0.62
ENGINE_R = 0.88


def mats():
    flag = hs.image_mat('LanderFlag', decal.georgian_flag('lander_flag'), rough=0.55)
    return {
        'white': hs.paint('LanderWhite', WHITE, seed=11.0, wear=0.34, grime=0.3, panel=(1.0, 0.7, 0.55), dust=0.35),
        'deck': hs.metal('LanderDeck', DECK, rough=0.55, metallic=0.5, dust=0.25),
        'steel': hs.metal('LanderSteel', STEEL, rough=0.32, metallic=0.9, dust=0.3),
        'gold': hs.metal('LanderGold', GOLD, rough=0.3, metallic=0.95, dust=0.25),
        'bell': hs.metal('LanderBell', (0.14, 0.14, 0.15, 1), rough=0.4, metallic=0.85, ribs=0.5, rib_axis='Z'),
        'glass': hs.flat('LanderGlass', (0.02, 0.03, 0.04, 1), rough=0.08, metallic=0.4, emit=(0.06, 0.1, 0.12, 1)),
        'ink': hs.flat('LanderInk', (0.04, 0.04, 0.045, 1), rough=0.6),
        'lamp': hs.flat('LanderLamp', (0.9, 0.9, 0.86, 1), rough=0.25, emit=(1.0, 0.95, 0.82, 1), emit_strength=5.0),
        'flag': flag,
    }


def box(p, m, name, size, loc, node=0, bev=0.0, rot=None):
    o = model.box(name, size, loc)
    if rot:
        o.rotation_euler = rot
    if bev and p.detail:
        model.bevel(o, bev)
    return p.add(o, m, node)


def tube(p, m, name, a, b, r, seg=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = model.cylinder(name, r, d.length, seg or (10 if p.detail else 6), (0, 0, 0))
    o.rotation_euler = d.normalized().to_track_quat('Z', 'Y').to_euler()
    o.location = (a + b) / 2
    return p.add(o, m)


def octagon(p, m, name, r0, r1, z0, z1, mat, phase=math.pi / 8):
    """One tapered octagonal section, as the sheet's elevations draw it."""
    o = hs.lathe(name, [(r0, z0), (r1, z1)], segments=8, axis='Z', phase=phase)
    return p.add(o, mat)


def module(p, m):
    """The crew module: a tapered octagon, its cap, the hatch and the windows."""
    octagon(p, m, 'Body', BODY_R0, BODY_R1, DECK_Z1, BODY_Z1, m['white'])
    octagon(p, m, 'Cap', BODY_R1, 0.62, BODY_Z1, BODY_Z1 + 0.42, m['white'])
    cap = hs.lathe('CapTop', [(0.0, BODY_Z1 + 0.42), (0.62, BODY_Z1 + 0.42)], segments=8, axis='Z', phase=math.pi / 8)
    p.add(cap, m['deck'])
    # Panel battens down the eight seams, and the belts round the module.
    for k in range(8):
        a = k * math.pi / 4
        for z0, z1, r0, r1 in ((DECK_Z1, BODY_Z1, BODY_R0, BODY_R1),):
            a0 = Vector((math.sin(a) * r0, math.cos(a) * r0, z0))
            a1 = Vector((math.sin(a) * r1, math.cos(a) * r1, z1))
            tube(p, m['steel'], f'Seam{k}', a0, a1, 0.035, seg=6)
    for z in (DECK_Z1 + 0.06, BODY_Z1 - 0.06):
        r = BODY_R0 + (BODY_R1 - BODY_R0) * (z - DECK_Z1) / (BODY_Z1 - DECK_Z1)
        band = hs.lathe(f'Band{z}', [(r + 0.02, z - 0.05), (r + 0.02, z + 0.05)], segments=8, axis='Z', phase=math.pi / 8)
        p.add(band, m['steel'])
    # The crew hatch on the front face, its frame, window and grab rails.
    face = BODY_R0 * math.cos(math.pi / 8) - 0.28
    box(p, m['deck'], 'HatchFrame', (1.18, 0.14, 1.5), (0, -face + 0.02, DECK_Z1 + 0.92), bev=0.04)
    box(p, m['white'], 'Hatch', (0.92, 0.1, 1.22), (0, -face - 0.04, DECK_Z1 + 0.92), bev=0.05)
    box(p, m['glass'], 'HatchGlass', (0.34, 0.04, 0.34), (0, -face - 0.11, DECK_Z1 + 1.32))
    for s in (1, -1):
        tube(p, m['steel'], f'Grab{s}', (s * 0.72, -face - 0.06, DECK_Z1 + 0.35), (s * 0.72, -face - 0.06, DECK_Z1 + 1.6), 0.024)
    # Two triangular windows above the hatch, canted down as the sheet shows.
    for s in (1, -1):
        w = box(p, m['glass'], f'Window{s}', (0.56, 0.08, 0.4), (s * 0.62, -face + 0.06, DECK_Z1 + 2.0), bev=0.02)
        w.rotation_euler = (-0.3, 0, 0)
    # Avionics panels and a radiator on the flanks.
    for s in (1, -1):
        box(p, m['deck'], f'Avionics{s}', (0.12, 0.9, 1.1), (s * (face + 0.1), 0.3, DECK_Z1 + 1.1), bev=0.03)
        for k in range(3):
            box(p, m['steel'], f'Fin{s}{k}', (0.06, 0.8, 0.05), (s * (face + 0.18), 0.3, DECK_Z1 + 0.75 + k * 0.32))


def deck(p, m):
    """The equipment deck under the module, its tanks and the engines."""
    octagon(p, m, 'Deck', BODY_R0 + 0.12, BODY_R0 + 0.12, DECK_Z0, DECK_Z1, m['deck'])
    octagon(p, m, 'DeckFloor', 0.0, BODY_R0 + 0.12, DECK_Z0, DECK_Z0, m['deck'])
    # Gold foil propellant tanks at the corners, banded and plumbed.
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        x, y = math.sin(a) * 2.12, math.cos(a) * 2.12
        tank = hs.lathe(f'Tank{k}', [(0.0, DECK_Z1 - 0.06), (0.3, DECK_Z1 + 0.02), (0.42, DECK_Z1 + 0.26),
                                     (0.42, DECK_Z1 + 1.32), (0.3, DECK_Z1 + 1.56), (0.0, DECK_Z1 + 1.64)],
                        segments=12 if p.detail else 8, axis='Z', location=(x, y, 0))
        p.add(tank, m['gold'])
        for z in (DECK_Z1 + 0.42, DECK_Z1 + 1.0):
            band = hs.lathe(f'TankBand{k}{z}', [(0.44, z - 0.04), (0.44, z + 0.04)], segments=12 if p.detail else 8,
                            axis='Z', location=(x, y, 0))
            p.add(band, m['steel'])
        tube(p, m['steel'], f'TankFeed{k}', (x, y, DECK_Z1 - 0.02), (x * 0.5, y * 0.5, DECK_Z0 + 0.12), 0.045)
        for z in (DECK_Z1 + 0.42, DECK_Z1 + 1.0):
            tube(p, m['steel'], f'TankStrap{k}{z}', (x, y, z), (x * 0.74, y * 0.74, z), 0.03, seg=6)
    # Four descent engines under the deck.
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        x, y = math.sin(a) * ENGINE_R, math.cos(a) * ENGINE_R
        bell = hs.lathe(f'Bell{k}', [(0.14, DECK_Z0), (0.16, DECK_Z0 - 0.18), (0.3, DECK_Z0 - 0.52), (0.4, DECK_Z0 - 0.86)],
                        segments=14 if p.detail else 10, axis='Z', location=(x, y, 0))
        p.add(bell, m['bell'])
        box(p, m['steel'], f'Gimbal{k}', (0.2, 0.2, 0.16), (x, y, DECK_Z0 + 0.06))
    # RCS quads on the module's corners.
    for k in range(4):
        a = k * math.pi / 2
        x, y = math.sin(a) * (BODY_R0 - 0.1), math.cos(a) * (BODY_R0 - 0.1)
        q = box(p, m['deck'], f'Rcs{k}', (0.3, 0.3, 0.26), (x, y, DECK_Z1 + 0.34), bev=0.03)
        for d in (-1, 1):
            n = hs.lathe(f'RcsNozzle{k}{d}', [(0.0, 0.0), (0.05, 0.05), (0.07, 0.13)], segments=8, axis='X',
                         location=(x + d * 0.17, y, DECK_Z1 + 0.34))
            n.rotation_euler = (0, 0, 0) if d > 0 else (0, math.pi, 0)
            p.add(n, m['bell'])


def legs(p, m):
    """Four legs: the main strut on its shock, two braces and a dished pad."""
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        ux, uy = math.sin(a), math.cos(a)
        top = Vector((ux * (BODY_R0 - 0.1), uy * (BODY_R0 - 0.1), DECK_Z1 - 0.1))
        foot = Vector((ux * LEG_R, uy * LEG_R, PAD_R * 0.12))
        tube(p, m['steel'], f'Leg{k}', top, foot, 0.075)
        # The shock: a fatter sleeve over the upper half of the strut.
        mid = top + (foot - top) * 0.45
        tube(p, m['white'], f'Shock{k}', top + (foot - top) * 0.08, mid, 0.115)
        for s in (1, -1):
            side = Vector((math.sin(a + s * 0.42) * (BODY_R0 - 0.2), math.cos(a + s * 0.42) * (BODY_R0 - 0.2), DECK_Z0 + 0.06))
            tube(p, m['steel'], f'Brace{k}{s}', side, foot + Vector((0, 0, 0.12)), 0.038)
        pad = hs.lathe(f'Pad{k}', [(0.0, 0.2), (PAD_R * 0.5, 0.1), (PAD_R, 0.04), (PAD_R, 0.0), (0.0, 0.0)],
                       segments=14 if p.detail else 10, axis='Z', location=(foot.x, foot.y, 0))
        p.add(pad, m['steel'])
    # The ladder down the front leg, and the porch outside the hatch.
    a = math.pi          # the front leg is the −Y one
    ux, uy = math.sin(math.pi / 4), -math.cos(math.pi / 4)
    box(p, m['steel'], 'Porch', (1.0, 0.7, 0.07), (0, -(BODY_R0 * math.cos(math.pi / 8)) - 0.32, DECK_Z1 - 0.06))
    for s in (1, -1):
        tube(p, m['steel'], f'Rail{s}', (s * 0.3, -2.42, DECK_Z1 - 0.06), (s * 0.3, -2.66, 0.12), 0.026)
    for i in range(7):
        t = i / 6
        box(p, m['steel'], f'Rung{i}', (0.66, 0.06, 0.045), (0, -2.42 - t * 0.24, DECK_Z1 - 0.12 - t * (DECK_Z1 - 0.26)))


def top(p, m):
    """The mast: the dish, the star tracker and the docking light."""
    z = BODY_Z1 + 0.42
    tube(p, m['steel'], 'Mast', (0.22, 0.1, z), (0.22, 0.1, z + 0.72), 0.045)
    box(p, m['deck'], 'TrackerHead', (0.24, 0.26, 0.22), (0.22, 0.1, z + 0.86), bev=0.03)
    box(p, m['glass'], 'TrackerEye', (0.1, 0.03, 0.1), (0.22, 0.1 - 0.14, z + 0.88))
    dish = hs.lathe('Dish', [(0.0, 0.0), (0.16, 0.03), (0.34, 0.1), (0.46, 0.2)],
                    segments=14 if p.detail else 10, axis='Z', location=(-0.5, 0.2, z + 0.5))
    dish.rotation_euler = (1.15, 0, -0.6)
    p.add(dish, m['white'])
    tube(p, m['steel'], 'DishArm', (-0.2, 0.15, z + 0.06), (-0.5, 0.2, z + 0.48), 0.03)
    tube(p, m['steel'], 'Whip', (0.5, -0.2, z), (0.56, -0.24, z + 1.25), 0.012, seg=6)
    box(p, m['lamp'], 'DockLight', (0.16, 0.06, 0.1), (0, -0.55, z - 0.06))


def markings(p, m):
    """STELLAR and the five-cross flag on the module's faces."""
    for s in (1, -1):
        a = s * math.pi / 2
        r = BODY_R0 * math.cos(math.pi / 8) - 0.34
        # The face leans out with the taper; the decal leans with it.
        n = Vector((math.sin(a), math.cos(a), 0.32)).normalized()
        # The decal faces out: right × up must be the face's own normal.
        right = Vector((-math.cos(a), math.sin(a), 0))
        up = n.cross(right).normalized()
        origin = Vector((math.sin(a) * r, math.cos(a) * r, DECK_Z1 + 1.55)) + n * 0.06
        w = decal.wordmark('STELLAR', 0.21, (0, 0, 0), (0, 0, 0), extrude=0.0, name=f'LanderWord{s}')
        hs.orient(w, origin, right, up)
        p.add(w, m['ink'])
        f = hs.plate(f'LanderFlag{s}', 0.42, 0.28, origin + up * 0.42, right, up)
        p.add(f, m['flag'])
    # One more flag over the hatch, where the sheet puts its cross.
    face = BODY_R0 * math.cos(math.pi / 8) - 0.2
    f = hs.plate('LanderFlagFront', 0.4, 0.27, (0, -face - 0.06, DECK_Z1 + 2.5), (1, 0, 0), (0, 0.32, 1))
    p.add(f, m['flag'])


def build_lander(p):
    m = mats()
    module(p, m)
    deck(p, m)
    legs(p, m)
    top(p, m)
    if p.detail:
        markings(p, m)


def empties(root, objs):
    def e(name, loc, size=0.15):
        return hs.empty(name, loc, root, size)
    e('Hatch', (0, -(BODY_R0 * math.cos(math.pi / 8)), DECK_Z1 + 0.92))
    e('Porch', (0, -(BODY_R0 * math.cos(math.pi / 8)) - 0.32, DECK_Z1))
    e('EngineCentre', (0, 0, DECK_Z0 - 0.86))


def main():
    scene.reset(seed=23)
    counts = vehicle.build('Lander', build_lander, OUT, RENDERS, empties_fn=empties, cage=0.08, lod=False)
    print('lander:', counts)


main()
