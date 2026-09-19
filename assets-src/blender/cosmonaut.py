"""The Georgian cosmonaut: a skinned EVA suit for Stellar Explore.

Run:  Blender -b -P assets-src/blender/cosmonaut.py -- <out-dir> [renders-dir]
Writes <out-dir>/cosmonaut.glb (raw; optimise it with gltf-transform, keeping
nodes: see assets-src/README.md) and, with a renders dir, an 8-angle turntable.

Design (references: ~/Desktop/stellar-refs/cosmonaut/, primary `Cosmonaut 2.png`):
a near-future lunar suit, white and off-white. A hard upper torso with scye
bearings, a chest display and control module and two round supply
connectors under it, the mission roundel (a peak and stars) over them;
quilted fabric limbs with grey bands at the upper arm, the elbow and the
shin; dark knee pads; bearings at the waist, the wrists and the ankles;
grey gauntlet gloves; heavy grey boots on dark lugged soles; a tall
life-support pack with vents top and bottom and the five-cross flag between
them; hoses from the chest round under the arms to the pack; a helmet with
a gold visor and a lamp pod on each temple. The flag on both upper arms.

The file is built in the rest pose of the game's rig (src/lib/solar-system/
moon-suit-mesh.ts): standing, arms straight down, every joint at the pivot
the rig puts it. The body is one mesh skinned to bones named after the rig's
joints; the game binds it to its own joint objects, so the pose code drives
it unchanged. The helmet, the visor and the bare head (Earth, where there is
air) are separate rigid meshes, left at the root in rest-pose space: the
game hangs them on the neck and the visor hinge.

Coordinates: written in game space (x, y up, z forward) and turned into
Blender's Z-up (x, -z, y) as vertices are made, so the Y-up export gives the
game its own numbers back.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402
import scene, model, decal  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, '..', 'build')
RENDERS = argv[1] if len(argv) > 1 else None
ATLAS = int(os.environ.get('COSMONAUT_ATLAS', '2048'))
SAMPLES = int(os.environ.get('COSMONAUT_SAMPLES', '12'))

# ── The rig's pivots (moon-suit-mesh.ts), game space, rest pose. ──
HIP_H, THIGH, SHIN, HELMET_C = 0.98, 0.46, 0.42, 0.2
PELVIS_Y = HIP_H
CHEST_Y = PELVIS_Y + 0.13
SHOULDER_X, SHOULDER_Y = 0.34, CHEST_Y + 0.4
ELBOW_Y = SHOULDER_Y - 0.34
HAND_Y = ELBOW_Y - 0.32
HIP_X = 0.125
KNEE_Y = PELVIS_Y - THIGH
ANKLE_Y = KNEE_Y - SHIN
NECK = (0.0, CHEST_Y + 0.58, 0.01)
VISOR = (0.0, NECK[1] + HELMET_C, 0.01)
PACK = (0.0, CHEST_Y + 0.32, -0.34)
SIDES = (-1, 1)  # rig index 0 is side -1 (the crew's right, -X)


def G(x, y, z):
    return Vector((x, -z, y))


def smooth(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ── Materials: procedural zones for the high-poly copy, baked to one atlas. ──
MATS = {}


def zone(name, color, rough, metal=0.0, emit=None, weave=0.0, quilt=0.0, dust=0.6, scratch=0.0):
    """A zone material. `weave` and `quilt` are fabric bump strengths; `dust`
    greys it toward the boots; `emit` is (colour, strength) for lamps and screens."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    n, l = nt.nodes, nt.links
    bsdf = n['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    geo = n.new('ShaderNodeNewGeometry')
    sep = n.new('ShaderNodeSeparateXYZ')
    l.new(geo.outputs['Position'], sep.inputs['Vector'])
    # Regolith dust climbs the boots and shins and settles in the hollows.
    noise = n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 26.0
    noise.inputs['Detail'].default_value = 8.0
    height = n.new('ShaderNodeMapRange')
    height.inputs['From Min'].default_value = 0.34
    height.inputs['From Max'].default_value = 0.0
    l.new(sep.outputs['Z'], height.inputs['Value'])
    cav = n.new('ShaderNodeValToRGB')
    cav.color_ramp.elements[0].position = 0.42
    cav.color_ramp.elements[0].color = (1, 1, 1, 1)
    cav.color_ramp.elements[1].position = 0.52
    cav.color_ramp.elements[1].color = (0, 0, 0, 1)
    l.new(geo.outputs['Pointiness'], cav.inputs['Fac'])
    fac = n.new('ShaderNodeMath')
    fac.operation = 'MULTIPLY_ADD'
    l.new(height.outputs['Result'], fac.inputs[0])
    fac.inputs[1].default_value = dust
    l.new(cav.outputs['Color'], fac.inputs[2])
    fac2 = n.new('ShaderNodeMath')
    fac2.operation = 'MULTIPLY'
    l.new(fac.outputs['Value'], fac2.inputs[0])
    l.new(noise.outputs['Fac'], fac2.inputs[1])
    fac3 = n.new('ShaderNodeMath')
    fac3.operation = 'MULTIPLY'
    fac3.use_clamp = True
    l.new(fac2.outputs['Value'], fac3.inputs[0])
    fac3.inputs[1].default_value = 0.55 * (1.0 if dust > 0 else 0.2)
    mix = n.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs[6].default_value = color
    mix.inputs[7].default_value = (0.43, 0.41, 0.38, 1)
    l.new(fac3.outputs['Value'], mix.inputs[0])
    l.new(mix.outputs[2], bsdf.inputs['Base Color'])
    # Fabric: a fine weave, and quilting lines round the limbs.
    if weave or quilt or scratch:
        add = n.new('ShaderNodeMath')
        add.operation = 'ADD'
        add.inputs[0].default_value = 0.0
        add.inputs[1].default_value = 0.0
        if weave:
            w = n.new('ShaderNodeTexWave')
            w.wave_type = 'BANDS'
            w.bands_direction = 'DIAGONAL'
            w.inputs['Scale'].default_value = 380.0
            w.inputs['Distortion'].default_value = 1.2
            wm = n.new('ShaderNodeMath')
            wm.operation = 'MULTIPLY'
            l.new(w.outputs['Fac'], wm.inputs[0])
            wm.inputs[1].default_value = weave
            l.new(wm.outputs['Value'], add.inputs[0])
        if quilt or scratch:
            q = n.new('ShaderNodeTexWave')
            q.wave_type = 'BANDS'
            q.bands_direction = 'Z'
            q.wave_profile = 'SAW'
            q.inputs['Scale'].default_value = 7.5
            q.inputs['Distortion'].default_value = 0.4
            q.inputs['Detail'].default_value = 1.0
            qr = n.new('ShaderNodeValToRGB')
            qr.color_ramp.elements[0].position = 0.0
            qr.color_ramp.elements[1].position = 0.08
            l.new(q.outputs['Fac'], qr.inputs['Fac'])
            qm = n.new('ShaderNodeMath')
            qm.operation = 'MULTIPLY'
            l.new(qr.outputs['Color'], qm.inputs[0])
            qm.inputs[1].default_value = quilt
            if scratch:
                s = n.new('ShaderNodeTexNoise')
                s.inputs['Scale'].default_value = 220.0
                s.inputs['Detail'].default_value = 2.0
                sm = n.new('ShaderNodeMath')
                sm.operation = 'MULTIPLY'
                l.new(s.outputs['Fac'], sm.inputs[0])
                sm.inputs[1].default_value = scratch
                l.new(sm.outputs['Value'], add.inputs[1])
            else:
                l.new(qm.outputs['Value'], add.inputs[1])
        bump = n.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.55
        bump.inputs['Distance'].default_value = 0.004
        l.new(add.outputs['Value'], bump.inputs['Height'])
        l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    mat['metal'] = metal
    mat['emit'] = list(emit[0]) + [emit[1]] if emit else [0, 0, 0, 0]
    MATS[name] = mat
    return mat


def image_zone(name, img, rough=0.8):
    """A decal: its image is the base colour; it reads as fabric otherwise."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    bsdf = n['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    tex = n.new('ShaderNodeTexImage')
    tex.image = img
    tex.extension = 'CLIP'
    l.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat['metal'] = 0.0
    mat['emit'] = [0, 0, 0, 0]
    MATS[name] = mat
    return mat


def set_emission(mode):
    """Route emission for a bake: 'metal' writes each zone's metalness as
    emission (a bakeable channel), 'emit' the real lamps and screens, 'off' none."""
    for mat in MATS.values():
        bsdf = mat.node_tree.nodes['Principled BSDF']
        if mode == 'metal':
            m = mat['metal']
            bsdf.inputs['Emission Color'].default_value = (m, m, m, 1)
            bsdf.inputs['Emission Strength'].default_value = 1.0
        elif mode == 'emit':
            e = mat['emit']
            bsdf.inputs['Emission Color'].default_value = (e[0], e[1], e[2], 1)
            bsdf.inputs['Emission Strength'].default_value = e[3]
        else:
            bsdf.inputs['Emission Strength'].default_value = 0.0


# ── Geometry helpers, in game space. ──
def loft(name, rings, seg, n=2.0, caps=(True, True), axis='y', ripple=None):
    """A surface through elliptical (super-elliptical for n > 2) rings.
    axis 'y': rings are (y, rx, rz, cx, cz); axis 'z': (z, rx, ry, cx, cy).
    `ripple(h) -> k` scales a ring's radii (convolutes, bellows)."""
    bm = bmesh.new()
    loops = []
    for h, rx, rz, ox, oz in rings:
        k = ripple(h) if ripple else 1.0
        ring = []
        for i in range(seg):
            t = 2 * math.pi * i / seg
            c, s = math.cos(t), math.sin(t)
            px = ox + rx * k * math.copysign(abs(c) ** (2 / n), c)
            pz = oz + rz * k * math.copysign(abs(s) ** (2 / n), s)
            ring.append(bm.verts.new(G(px, h, pz) if axis == 'y' else G(px, pz, h)))
        loops.append(ring)
    for a, b in zip(loops, loops[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    for ring, on in ((loops[0], caps[0]), (loops[-1], caps[1])):
        if not on:
            continue
        centre = sum((v.co for v in ring), Vector()) / len(ring)
        c = bm.verts.new(centre)
        for i in range(seg):
            bm.faces.new((ring[i], ring[(i + 1) % seg], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return model.link(bpy.data.objects.new(name, mesh))


def ring(name, r, tube, y, x=0.0, z=0.0, seg=32, tseg=8, sx=1.0, sz=1.0, rot=(0, 0, 0)):
    """A bearing: a torus round the game-Y axis, optionally turned."""
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=tube, major_segments=seg, minor_segments=tseg)
    o = bpy.context.active_object
    o.name = name
    o.scale = (sx, sz, 1)
    model.apply_transforms(o)
    o.rotation_euler = rot
    o.location = G(x, y, z)
    model.apply_transforms(o)
    return o


def rbox(name, size, at, bevel_w, seg, rot=(0, 0, 0)):
    """A bevelled box: size and centre in game space (w, h, d)."""
    o = model.box(name, (size[0], size[2], size[1]))
    model.bevel(o, bevel_w, seg, 30)
    o.rotation_euler = rot
    o.location = G(*at)
    model.apply_transforms(o)
    return o


def cyl(name, r, depth, at, axis='z', seg=24, r2=None):
    """A cylinder along a game axis."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2 if r2 is not None else r, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    o = model.link(bpy.data.objects.new(name, mesh))
    # Blender Z is game Y; game Z is Blender -Y; game X is Blender X.
    o.rotation_euler = {'y': (0, 0, 0), 'z': (math.pi / 2, 0, 0), 'x': (0, math.pi / 2, 0)}[axis]
    o.location = G(*at)
    model.apply_transforms(o)
    return o


def sphere(name, r, at, scale=(1, 1, 1), seg=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=rings)
    o = bpy.context.active_object
    o.name = name
    o.scale = (scale[0], scale[2], scale[1])
    o.location = G(*at)
    model.apply_transforms(o)
    return o


def hose(name, pts, r, res=10, ribbed=False):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = r
    curve.bevel_resolution = 3
    curve.resolution_u = res
    sp = curve.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        v = G(*c)
        p.co = (v.x, v.y, v.z, 1)
    sp.use_endpoint_u = True
    sp.order_u = 3
    o = model.link(bpy.data.objects.new(name, curve))
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    return o


def patch(name, img_mat, r, y, h, angle, span, cx=0.0, cz=0.0, seg=10, lift=0.003):
    """A decal bent round a limb: a strip of a cylinder of radius r about
    game-Y through (cx, cz), centred on `angle` (0 = +X, pi/2 = +Z)."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new('UVMap')
    rows = []
    for j in range(2):
        yy = y - h / 2 + h * j
        row = []
        for i in range(seg + 1):
            a = angle - span / 2 + span * i / seg
            row.append(bm.verts.new(G(cx + math.cos(a) * (r + lift), yy, cz + math.sin(a) * (r + lift))))
        rows.append(row)
    for i in range(seg):
        f = bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        for loop, (u, v) in zip(f.loops, ((i / seg, 0), ((i + 1) / seg, 0), ((i + 1) / seg, 1), (i / seg, 1))):
            loop[uv_layer].uv = (u, v)
    # Face out from the limb, or the baked normal map turns the decal black.
    for f in bm.faces:
        f.normal_update()
        out = f.calc_center_median() - G(cx, f.calc_center_median().z, cz)
        if f.normal.dot(out) < 0:
            f.normal_flip()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = model.link(bpy.data.objects.new(name, mesh))
    o.data.materials.append(img_mat)
    return o


def flat_decal(name, img_mat, w, h, at, normal):
    """A flat decal facing a game-space direction ('+z', '-z', '+x', '-x')."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new('UVMap')
    x, y, z = at
    corners = []
    for u, v in ((0, 0), (1, 0), (1, 1), (0, 1)):
        du, dv = (u - 0.5) * w, (v - 0.5) * h
        if normal == '+z':
            p = (x + du, y + dv, z)
        elif normal == '-z':
            p = (x - du, y + dv, z)
        elif normal == '+x':
            p = (x, y + dv, z - du)
        else:
            p = (x, y + dv, z + du)
        corners.append(bm.verts.new(G(*p)))
    f = bm.faces.new(corners)
    for loop, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv_layer].uv = uv
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = model.link(bpy.data.objects.new(name, mesh))
    o.data.materials.append(img_mat)
    return o


def paint(o, mat):
    o.data.materials.clear()
    o.data.materials.append(mat)
    return o


def displace(o, strength, scale, seed):
    """Soft fabric folds for the high-poly copy."""
    tex = bpy.data.textures.new(f'{o.name}Folds', 'CLOUDS')
    tex.noise_scale = scale
    tex.noise_depth = 2
    mod = o.modifiers.new('Folds', 'DISPLACE')
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    mod.texture_coords = 'GLOBAL'
    model.apply_modifier(o, mod)
    return o


# ── Decal images, drawn here. ──
def emblem(name, s=256):
    """The mission roundel: a Caucasus peak under an orbital arc and stars, on
    deep blue in a thin gold ring. Original; no lettering."""
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    cx = cy = (s - 1) / 2
    r = np.hypot(xx - cx, yy - cy) / (s / 2)
    img = np.zeros((s, s, 4), dtype=np.float32)
    img[..., :3] = (0.83, 0.82, 0.79)  # the suit behind the disc
    img[..., 3] = 1
    disc = r < 0.97
    img[disc, :3] = (0.035, 0.07, 0.19)
    gold = (r > 0.86) & (r < 0.97)
    img[gold, :3] = (0.78, 0.55, 0.16)
    # Image rows run bottom-up in Blender: v grows with the row index.
    u = xx / s
    v = yy / s
    peak = (v < 0.62 - np.abs(u - 0.5) * 1.25) & (v > 0.22) & (r < 0.86)
    side = (v < 0.48 - np.abs(u - 0.3) * 1.3) & (v > 0.22) & (r < 0.86)
    side2 = (v < 0.44 - np.abs(u - 0.72) * 1.4) & (v > 0.22) & (r < 0.86)
    img[peak | side | side2, :3] = (0.9, 0.9, 0.88)
    shade = peak & (u > 0.5)
    img[shade, :3] = (0.64, 0.68, 0.74)
    snowline = peak & (v < 0.46)
    img[snowline, :3] = (0.36, 0.42, 0.52)
    img[(side | side2) & (v < 0.36), :3] = (0.3, 0.36, 0.46)
    arc = np.abs(np.hypot(u - 0.42, v - 0.2) - 0.56) < 0.012
    img[arc & (r < 0.84) & (v > 0.5), :3] = (0.93, 0.93, 0.9)
    for sx, sy, sr in ((0.7, 0.74, 0.03), (0.78, 0.6, 0.022), (0.6, 0.83, 0.018), (0.3, 0.72, 0.016), (0.82, 0.78, 0.014)):
        img[np.hypot(u - sx, v - sy) < sr, :3] = (1, 1, 1)
    tex = bpy.data.images.new(name, s, s, alpha=True)
    tex.pixels = img.ravel().tolist()
    tex.pack()
    return tex


def vent_image(name, w=128, h=64):
    img = np.ones((h, w, 4), dtype=np.float32)
    img[..., :3] = 0.07
    for row in range(6, h - 6, 8):
        img[row:row + 4, 8:w - 8, :3] = 0.22
    tex = bpy.data.images.new(name, w, h, alpha=True)
    tex.pixels = img.ravel().tolist()
    tex.pack()
    return tex


# ── The suit, part by part. Each part returns (object, bone-weight function). ──
def build(detail):
    """Every part in its zone material. `detail` picks segment counts; the
    high-poly copy also gets folds, rounder bevels and the raised lettering."""
    seg = 40 if detail else 20
    bev = 3 if detail else 1
    fab, fab_grey, hard, grey, darkpad, boot, sole, metal, mech, glove, hosem, screen, lamp, lens, skin, hair, ink = (
        MATS[k] for k in ('Fabric', 'FabricGrey', 'Hard', 'Grey', 'DarkPad', 'Boot', 'Sole', 'Metal', 'Mech', 'Glove', 'Hose', 'Screen', 'Lamp', 'Lens', 'Skin', 'Hair', 'Ink'))
    parts = []  # (group, object, weights)

    def add(group, o, weights):
        parts.append((group, o, weights))
        return o

    def rigid(bone):
        return lambda x, y, z: {bone: 1.0}

    # Lower torso: the brief, with the hips carrying its lower half.
    def brief_w(x, y, z):
        side = 'hip0' if x < 0 else 'hip1'
        k = smooth(PELVIS_Y - 0.02, PELVIS_Y - 0.12, y) * smooth(0.02, 0.1, abs(x)) * 0.6
        return {'pelvis': 1 - k, side: k}
    brief = loft('Brief', [
        (0.82, 0.2, 0.15, 0, -0.005), (0.86, 0.26, 0.18, 0, 0), (0.93, 0.29, 0.195, 0, 0),
        (1.00, 0.285, 0.2, 0, 0), (1.06, 0.268, 0.195, 0, 0), (1.12, 0.25, 0.185, 0, 0),
    ], seg, n=2.3, caps=(True, False))
    paint(brief, fab)
    if detail:
        displace(brief, 0.006, 0.05, 1)
    add('lower', brief, brief_w)
    for name, y, r, t, mat in (('Waist', CHEST_Y - 0.005, 0.255, 0.022, metal), ('WaistSeal', CHEST_Y - 0.035, 0.262, 0.014, fab_grey), ('Belt', 1.0, 0.29, 0.02, grey)):
        o = paint(ring(name, r, t, y, seg=seg + 8, tseg=10 if detail else 6, sz=0.2 / 0.285), mat)
        add('lower', o, rigid('pelvis'))
    for s in SIDES:
        # Belt buckles at the front, where the harness meets the belt.
        o = paint(rbox('Buckle', (0.05, 0.06, 0.03), (s * 0.13, 1.0, 0.2), 0.008, bev), mech)
        add('lower', o, rigid('pelvis'))
    for i, s in enumerate(SIDES):
        # A cargo pocket on the outside of each thigh, a flap and a dark tab.
        hw = rigid('hip%d' % i)
        o = paint(rbox('Pocket', (0.07, 0.17, 0.15), (s * 0.3, 0.73, 0.02), 0.014, bev), fab)
        add('leg%d' % i, o, hw)
        o = paint(rbox('PocketFlap', (0.076, 0.04, 0.155), (s * 0.303, 0.8, 0.02), 0.008, bev), fab_grey)
        add('leg%d' % i, o, hw)
        o = paint(rbox('PocketTab', (0.02, 0.07, 0.03), (s * 0.34, 0.76, 0.03), 0.004, 1), mech)
        add('leg%d' % i, o, hw)

    # Hard upper torso: broad through the shoulders, flat at the front.
    hut = loft('HUT', [
        (CHEST_Y - 0.03, 0.245, 0.18, 0, 0), (CHEST_Y + 0.06, 0.27, 0.2, 0, 0.004), (CHEST_Y + 0.18, 0.315, 0.228, 0, 0.01),
        (CHEST_Y + 0.3, 0.345, 0.24, 0, 0.012), (CHEST_Y + 0.4, 0.35, 0.24, 0, 0.01), (CHEST_Y + 0.48, 0.325, 0.222, 0, 0.004),
        (CHEST_Y + 0.54, 0.26, 0.195, 0, 0.0), (CHEST_Y + 0.585, 0.18, 0.165, 0, 0.004),
    ], seg + 8, n=2.7, caps=(False, True))
    paint(hut, hard)
    if detail:
        model.subdivide(hut, 1)
    add('torso', hut, lambda x, y, z: {'chest': 1 - 0.5 * smooth(CHEST_Y + 0.02, CHEST_Y - 0.03, y), 'pelvis': 0.5 * smooth(CHEST_Y + 0.02, CHEST_Y - 0.03, y)})
    C = CHEST_Y
    for s in SIDES:
        # A grey flank panel under each arm.
        o = paint(rbox('Flank', (0.035, 0.22, 0.15), (s * 0.33, C + 0.2, 0.0), 0.01, bev), grey)
        add('torso', o, rigid('chest'))
        # Harness webbing over each shoulder and down the chest to the belt, a buckle on it.
        o = paint(hose('Strap', [
            (s * 0.17, C + 0.6, -0.08), (s * 0.17, C + 0.585, 0.12), (s * 0.172, C + 0.5, 0.238), (s * 0.172, C + 0.35, 0.262),
            (s * 0.162, C + 0.15, 0.245), (s * 0.14, C - 0.08, 0.222),
        ], 0.015, res=10 if detail else 4), fab_grey)
        add('torso', o, rigid('chest'))
        o = paint(rbox('StrapBuckle', (0.05, 0.045, 0.02), (s * 0.172, C + 0.47, 0.262), 0.005, bev), mech)
        add('torso', o, rigid('chest'))
        # The two big supply connectors low on the chest: dark body, bright collar, dark bore.
        o = paint(cyl('Connector', 0.056, 0.07, (s * 0.125, C + 0.14, 0.245), 'z', seg=seg), mech)
        add('torso', o, rigid('chest'))
        o = paint(ring('ConnectorRing', 0.056, 0.014, 0, seg=seg, tseg=6, rot=(math.pi / 2, 0, 0)), grey)
        o.location = G(s * 0.125, C + 0.14, 0.278)
        model.apply_transforms(o)
        add('torso', o, rigid('chest'))
        o = paint(cyl('ConnectorBore', 0.03, 0.02, (s * 0.125, C + 0.14, 0.282), 'z', seg=seg), metal)
        add('torso', o, rigid('chest'))
        # The two small connectors flanking the control module.
        o = paint(cyl('Port', 0.026, 0.05, (s * 0.1, C + 0.285, 0.262), 'z', seg=16), mech)
        add('torso', o, rigid('chest'))
        o = paint(ring('PortRing', 0.026, 0.007, 0, seg=16, tseg=6, rot=(math.pi / 2, 0, 0)), metal)
        o.location = G(s * 0.1, C + 0.285, 0.286)
        model.apply_transforms(o)
        add('torso', o, rigid('chest'))
        # Corrugated hoses: connector round the waist to the pack, and connector up under the arm.
        o = paint(hose('Hose', [
            (s * 0.125, C + 0.1, 0.27), (s * 0.2, C + 0.03, 0.26), (s * 0.28, C + 0.05, 0.16),
            (s * 0.3, C + 0.1, -0.05), (s * 0.27, C + 0.18, -0.22),
        ], 0.021, res=12 if detail else 5), hosem)
        add('torso', o, rigid('chest'))
        o = paint(hose('Hose', [
            (s * 0.175, C + 0.14, 0.27), (s * 0.24, C + 0.17, 0.26), (s * 0.27, C + 0.28, 0.22), (s * 0.25, C + 0.4, 0.22),
        ], 0.018, res=10 if detail else 4), hosem)
        add('torso', o, rigid('chest'))
    # The display and control module: a dark block, a screen, two controls.
    dcm = paint(rbox('DCM', (0.14, 0.095, 0.07), (0, C + 0.285, 0.262), 0.012, bev, rot=(-0.12, 0, 0)), mech)
    add('torso', dcm, rigid('chest'))
    o = paint(rbox('Screen', (0.07, 0.05, 0.01), (-0.015, C + 0.29, 0.297), 0.003, 1, rot=(-0.12, 0, 0)), screen)
    add('torso', o, rigid('chest'))
    for dy, mat in ((0.305, metal), (0.27, lamp)):
        o = paint(cyl('Knob', 0.011, 0.02, (0.042, C + dy, 0.296), 'z', seg=16), mat)
        add('torso', o, rigid('chest'))
    # The flat chest plate where the roundel sits, framed in grey.
    plate = paint(rbox('ChestPlate', (0.2, 0.165, 0.03), (0, C + 0.43, 0.25), 0.012, bev), hard)
    add('torso', plate, rigid('chest'))
    o = paint(rbox('PlateFrame', (0.215, 0.18, 0.022), (0, C + 0.43, 0.244), 0.006, bev), grey)
    add('torso', o, rigid('chest'))
    # The pack: tall and white, framed vents top and bottom, the flag between,
    # black latches down both edges, a padded cap behind the helmet, side grilles.
    pack_w = rigid('pack')
    px, py, pz = PACK
    pc = py + 0.09  # the pack's centre height
    back = pz - 0.145  # its back face
    shell = rbox('PackShell', (0.6, 0.9, 0.25), (px, pc, pz - 0.02), 0.04, 3 if detail else 2)
    for vy in (0.32, -0.31):
        cut = rbox('VentCut', (0.26, 0.1, 0.06), (px, pc + vy, back), 0.004, 1)
        model.boolean(shell, cut)
    for s in SIDES:
        cut = rbox('SideVentCut', (0.06, 0.2, 0.08), (s * 0.3, pc - 0.04, pz - 0.05), 0.004, 1)
        model.boolean(shell, cut)
    paint(shell, hard)
    add('pack', shell, pack_w)
    for vy in (0.32, -0.31):
        for k in range(5 if detail else 0):
            o = paint(rbox('Slat', (0.25, 0.012, 0.03), (px, pc + vy - 0.036 + k * 0.018, back + 0.015), 0.002, 1), mech)
            add('pack', o, pack_w)
        o = paint(rbox('VentBack', (0.26, 0.1, 0.01), (px, pc + vy, back + 0.025), 0.002, 1), mech)
        add('pack', o, pack_w)
        # A grey frame round each vent.
        for dx, dy, w, h in ((0, 0.062, 0.3, 0.018), (0, -0.062, 0.3, 0.018), (-0.141, 0, 0.018, 0.14), (0.141, 0, 0.018, 0.14)):
            o = paint(rbox('VentFrame', (w, h, 0.016), (px + dx, pc + vy + dy, back - 0.004), 0.004, 1), grey)
            add('pack', o, pack_w)
    # A tubular handle looping over the top vent.
    o = paint(hose('Handle', [
        (-0.17, pc + 0.22, back + 0.01), (-0.17, pc + 0.22, back - 0.03), (-0.17, pc + 0.41, back - 0.03),
        (0.17, pc + 0.41, back - 0.03), (0.17, pc + 0.22, back - 0.03), (0.17, pc + 0.22, back + 0.01),
    ], 0.011, res=8 if detail else 3), grey)
    add('pack', o, pack_w)
    for s in SIDES:
        for vy in (0.2, -0.16):
            # Black latches on the back edges.
            o = paint(rbox('Latch', (0.035, 0.07, 0.03), (s * 0.29, pc + vy, back + 0.01), 0.006, bev), mech)
            add('pack', o, pack_w)
        for vy in (0.28, -0.2):
            o = paint(rbox('SideLatch', (0.02, 0.05, 0.035), (s * 0.305, pc + vy, pz - 0.1), 0.005, 1), mech)
            add('pack', o, pack_w)
        # The side grille and two round ports above it.
        for k in range(7 if detail else 0):
            o = paint(rbox('SideSlat', (0.03, 0.012, 0.07), (s * 0.29, pc - 0.12 + k * 0.026, pz - 0.05), 0.002, 1), mech)
            add('pack', o, pack_w)
        for vz in (-0.02, -0.09):
            o = paint(cyl('SidePort', 0.024, 0.02, (s * 0.303, pc + 0.26, pz + vz), 'x', seg=16), mech)
            add('pack', o, pack_w)
        # Straps and buckles under the pack.
        o = paint(rbox('PackStrap', (0.04, 0.09, 0.03), (s * 0.14, pc - 0.49, pz + 0.02), 0.006, bev), mech)
        add('pack', o, pack_w)
    # A padded cap on top, behind the helmet.
    o = paint(rbox('PackTop', (0.4, 0.08, 0.2), (px, pc + 0.48, pz - 0.03), 0.035, bev), hard)
    add('pack', o, pack_w)
    o = paint(rbox('PackFoot', (0.52, 0.04, 0.2), (px, pc - 0.46, pz - 0.02), 0.015, bev), grey)
    add('pack', o, pack_w)

    def band(name, x, y, r, t, mat, zs=1.0, tilt=0.0, cz=0.0):
        """A strap round a limb: a short raised sleeve, optionally tilted about the forward axis."""
        o = loft(name, [(t, r * 0.96, r * 0.96 * zs, 0, 0), (t * 0.6, r, r * zs, 0, 0), (-t * 0.6, r, r * zs, 0, 0), (-t, r * 0.96, r * 0.96 * zs, 0, 0)], seg, caps=(False, False))
        o.rotation_euler = (0, -tilt, 0)
        o.location = G(x, y, cz)
        model.apply_transforms(o)
        return paint(o, mat)

    def quilt(h, lo, hi, period, amp):
        """Puffy quilting: a soft bulge between stitch lines, only on the high-poly copy."""
        if not detail or not (lo < h < hi):
            return 1.0
        return 1.0 + amp * abs(math.sin((h - lo) / period * math.pi))

    # Arms: one quilted surface from the shoulder cap to the wrist, convolutes at the elbow.
    for i, s in enumerate(SIDES):
        x = s * SHOULDER_X
        sh, el, hd = 'shoulder%d' % i, 'elbow%d' % i, 'hand%d' % i

        def arm_w(px, py, pz, sh=sh, el=el, hd=hd):
            k = smooth(ELBOW_Y + 0.05, ELBOW_Y - 0.05, py)
            j = smooth(HAND_Y + 0.045, HAND_Y - 0.01, py)
            return {sh: 1 - k, el: k * (1 - j), hd: k * j}

        def arm_ripple(h):
            if abs(h - ELBOW_Y) < 0.07:
                return 1.0 + 0.09 * max(0.0, math.cos((h - ELBOW_Y) / 0.022 * math.pi))
            return quilt(h, HAND_Y + 0.06, SHOULDER_Y - 0.02, 0.055, 0.035)
        rings = [(SHOULDER_Y + 0.12, 0.035, 0.035, x, 0), (SHOULDER_Y + 0.1, 0.085, 0.085, x, 0), (SHOULDER_Y + 0.06, 0.115, 0.115, x, 0)]
        for y in np.linspace(SHOULDER_Y + 0.02, HAND_Y + 0.03, 72 if detail else 24):
            t = (SHOULDER_Y - y) / (SHOULDER_Y - HAND_Y)
            r = 0.121 - 0.03 * t
            rings.append((float(y), r, r * 0.97, x, 0.0))
        arm = loft('Arm', rings, seg, caps=(True, False), ripple=arm_ripple)
        paint(arm, fab)
        if detail:
            displace(arm, 0.007, 0.035, 3 + i)
        add('arm%d' % i, arm, arm_w)
        # The broad dark band round the upper arm, a narrow one above the elbow.
        add('arm%d' % i, band('Band', x, SHOULDER_Y - 0.15, 0.127, 0.05, fab_grey), arm_w)
        add('arm%d' % i, band('Band', x, ELBOW_Y + 0.085, 0.118, 0.018, fab_grey), arm_w)
        # A dark tab on the outside of the forearm.
        o = paint(rbox('ForearmTab', (0.02, 0.075, 0.05), (x + s * 0.108, ELBOW_Y - 0.1, 0.0), 0.005, bev), mech)
        add('arm%d' % i, o, rigid(el))
        o = paint(ring('Wrist', 0.094, 0.014, HAND_Y + 0.04, x=x, seg=seg, tseg=8), metal)
        add('arm%d' % i, o, arm_w)
        if s < 0:
            # A wrist display on the crew's right forearm.
            o = paint(rbox('Cuff', (0.085, 0.065, 0.035), (x, ELBOW_Y - 0.17, 0.1), 0.008, bev, rot=(-0.1, 0, 0)), mech)
            add('arm%d' % i, o, rigid(el))
            o = paint(rbox('CuffScreen', (0.058, 0.038, 0.006), (x, ELBOW_Y - 0.168, 0.118), 0.002, 1, rot=(-0.1, 0, 0)), screen)
            add('arm%d' % i, o, rigid(el))
        # The glove: a flared gauntlet, a chunky hand, thick curled fingers, a pale knuckle plate.
        gl = rigid(hd)
        o = paint(loft('Gauntlet', [(HAND_Y + 0.035, 0.098, 0.098, x, 0), (HAND_Y + 0.0, 0.094, 0.09, x, 0), (HAND_Y - 0.04, 0.074, 0.066, x, 0.004), (HAND_Y - 0.06, 0.06, 0.056, x, 0.006)], seg, caps=(False, False)), glove)
        add('arm%d' % i, o, gl)
        o = paint(rbox('Palm', (0.07, 0.12, 0.108), (x, HAND_Y - 0.11, 0.008), 0.026, 3 if detail else 2), glove)
        add('arm%d' % i, o, gl)
        o = paint(rbox('Knuckles', (0.018, 0.07, 0.085), (x + s * 0.034, HAND_Y - 0.085, 0.008), 0.008, bev), fab_grey)
        add('arm%d' % i, o, gl)
        o = paint(rbox('CuffPlate', (0.02, 0.045, 0.06), (x + s * 0.09, HAND_Y + 0.005, 0.0), 0.006, bev), hard)
        add('arm%d' % i, o, gl)
        for f in range(4):
            fz = 0.045 - f * 0.029
            fl = 0.08 - abs(f - 1.3) * 0.009
            o = paint(loft('Finger', [(HAND_Y - 0.165, 0.021, 0.02, x, fz), (HAND_Y - 0.165 - fl * 0.55, 0.02, 0.019, x - s * 0.016, fz), (HAND_Y - 0.165 - fl, 0.017, 0.016, x - s * 0.04, fz)], 12 if detail else 8), glove)
            add('arm%d' % i, o, gl)
        o = paint(loft('Thumb', [(HAND_Y - 0.08, 0.019, 0.019, x - s * 0.024, 0.058), (HAND_Y - 0.115, 0.018, 0.018, x - s * 0.034, 0.068), (HAND_Y - 0.15, 0.015, 0.015, x - s * 0.036, 0.07)], 12 if detail else 8), glove)
        add('arm%d' % i, o, gl)
        # The five-cross flag on the upper arm, facing out and a little forward (the bake's source only).
        if detail:
            add('arm%d' % i, patch('Flag', MATS['FlagDecal'], 0.121, SHOULDER_Y - 0.05, 0.085, (0.25 if s > 0 else math.pi - 0.25), 1.08, cx=x), rigid(sh))

    # Legs: one quilted surface from the hip to the ankle, convolutes at the knee,
    # a little outside the hip pivots, as the bulky suit stands.
    for i, s in enumerate(SIDES):
        x = s * (HIP_X + 0.03)
        hp, kn, an = 'hip%d' % i, 'knee%d' % i, 'ankle%d' % i

        def leg_w(px, py, pz, hp=hp, kn=kn, an=an):
            k = smooth(KNEE_Y + 0.05, KNEE_Y - 0.05, py)
            j = smooth(ANKLE_Y + 0.07, ANKLE_Y + 0.0, py)
            return {hp: 1 - k, kn: k * (1 - j), an: k * j}

        def knee_ripple(h):
            if abs(h - KNEE_Y) < 0.08:
                return 1.0 + 0.07 * max(0.0, math.cos((h - KNEE_Y) / 0.026 * math.pi))
            return quilt(h, ANKLE_Y + 0.17, PELVIS_Y - 0.08, 0.07, 0.03)

        def leg_r(y):
            return 0.15 - 0.034 * (PELVIS_Y - y) / (PELVIS_Y - ANKLE_Y)
        rings = []
        for y in np.linspace(PELVIS_Y + 0.02, ANKLE_Y + 0.08, 80 if detail else 26):
            r = leg_r(y)
            rings.append((float(y), r, r * 1.05, x, 0.0))
        leg = loft('Leg', rings, seg, caps=(True, False), ripple=knee_ripple)
        paint(leg, fab)
        if detail:
            displace(leg, 0.007, 0.04, 7 + i)
        add('leg%d' % i, leg, leg_w)
        # A harness strap round the top of the thigh, low on the inside.
        add('leg%d' % i, band('ThighStrap', x, 0.84, leg_r(0.84) + 0.006, 0.02, fab_grey, zs=1.05, tilt=s * 0.22), rigid(hp))
        # Straps under the knee and above the boot, a dark buckle on the shin.
        for y, t in ((KNEE_Y - 0.12, 0.022), (ANKLE_Y + 0.2, 0.014)):
            add('leg%d' % i, band('Band', x, y, leg_r(y) + 0.006, t, fab_grey, zs=1.05), leg_w)
        o = paint(rbox('ShinBuckle', (0.025, 0.08, 0.04), (x + s * (leg_r(KNEE_Y - 0.25) + 0.008), KNEE_Y - 0.25, 0.02), 0.006, bev), mech)
        add('leg%d' % i, o, rigid(kn))
        # Knee pads over the joint, split between thigh and shin.
        pad = paint(sphere('KneePad', 0.1, (x, KNEE_Y + 0.01, 0.1), scale=(1.05, 1.2, 0.55), seg=seg, rings=12 if detail else 8), darkpad)
        add('leg%d' % i, pad, leg_w)
        # The boot: a padded collar, the shaft, the upper, a dark rand, toe cap, heel, sole and lugs.
        b = rigid(an)
        bx = s * (HIP_X + 0.025)
        o = paint(ring('BootCollar', 0.126, 0.02, ANKLE_Y + 0.16, x=bx, seg=seg, tseg=8, sz=1.08), fab_grey)
        add('leg%d' % i, o, b)
        o = paint(loft('BootShaft', [(ANKLE_Y + 0.17, 0.124, 0.13, bx, 0.0), (ANKLE_Y + 0.04, 0.122, 0.135, bx, 0.01), (ANKLE_Y - 0.05, 0.112, 0.14, bx, 0.03)], seg, caps=(False, False)), boot)
        add('leg%d' % i, o, b)
        upper = loft('BootUpper', [
            (-0.15, 0.075, 0.06, bx, ANKLE_Y - 0.05), (-0.13, 0.095, 0.085, bx, ANKLE_Y - 0.03), (0.0, 0.1, 0.1, bx, ANKLE_Y - 0.02),
            (0.12, 0.098, 0.075, bx, ANKLE_Y - 0.045), (0.2, 0.09, 0.055, bx, ANKLE_Y - 0.055), (0.25, 0.065, 0.038, bx, ANKLE_Y - 0.065),
        ], seg, n=2.4, axis='z')
        add('leg%d' % i, paint(upper, boot), b)
        o = paint(rbox('Rand', (0.2, 0.04, 0.41), (bx, ANKLE_Y - 0.068, 0.05), 0.014, bev), sole)
        add('leg%d' % i, o, b)
        o = paint(rbox('ToeCap', (0.185, 0.06, 0.09), (bx, ANKLE_Y - 0.06, 0.2), 0.025, 3 if detail else 2), sole)
        add('leg%d' % i, o, b)
        o = paint(rbox('Heel', (0.19, 0.07, 0.09), (bx, ANKLE_Y - 0.055, -0.1), 0.018, bev), sole)
        add('leg%d' % i, o, b)
        o = paint(rbox('Sole', (0.21, 0.035, 0.43), (bx, ANKLE_Y - 0.1, 0.05), 0.012, bev), sole)
        add('leg%d' % i, o, b)
        for k in range(6 if detail else 0):
            o = paint(rbox('Lug', (0.18, 0.014, 0.035), (bx, ANKLE_Y - 0.121, -0.12 + k * 0.066), 0.004, 1), sole)
            add('leg%d' % i, o, b)
        o = paint(rbox('BootStrap', (0.2, 0.03, 0.06), (bx, ANKLE_Y - 0.005, 0.1), 0.006, bev, rot=(0.4, 0, 0)), grey)
        add('leg%d' % i, o, b)
        o = paint(rbox('Buckle', (0.03, 0.04, 0.05), (bx + s * 0.1, ANKLE_Y - 0.005, 0.1), 0.005, 1, rot=(0.4, 0, 0)), metal)
        add('leg%d' % i, o, b)

    # ── Rigid pieces: the helmet (with the neck ring and lamps), the visor, the head. ──
    helmet_parts, visor_parts, head_parts = [], [], []
    hx, hy, hz = VISOR
    o = paint(ring('NeckRing', 0.175, 0.032, NECK[1] + 0.02, z=NECK[2], seg=seg + 8, tseg=12 if detail else 8), grey)
    helmet_parts.append(o)
    o = paint(ring('NeckSeal', 0.172, 0.018, NECK[1] + 0.058, z=NECK[2], seg=seg + 8, tseg=8 if detail else 6), mech)
    helmet_parts.append(o)
    # A big bubble: shell radius R, the face opening cut by a sphere of radius r
    # pushed `d` forward and a little down along `u`.
    R, r_cut, d = 0.236, 0.225, 0.15
    u = Vector((0.0, -0.02, 0.16)).normalized()
    shell = sphere('Shell', R, (hx, hy, hz - 0.006), scale=(1.0, 1.02, 1.04), seg=seg + 12, rings=24 if detail else 16)
    cut = sphere('FaceCut', r_cut, (hx, hy + d * u.y, hz + d * u.z), scale=(1.0, 0.95, 1.0), seg=32, rings=16)
    model.boolean(shell, cut)
    model.bevel(shell, 0.004, 2 if detail else 1, 40)
    helmet_parts.append(paint(shell, hard))
    inner = sphere('InnerVisor', R - 0.022, (hx, hy, hz), seg=seg + 12 if detail else 20, rings=24 if detail else 10)
    helmet_parts.append(paint(inner, MATS['InnerVisor']))
    # A thick rim round the face opening, where the shell and the cutting sphere meet.
    a = (d * d + R * R - r_cut * r_cut) / (2 * d)
    rim = paint(ring('Rim', math.sqrt(R * R - a * a), 0.02, 0, seg=seg + 8, tseg=10 if detail else 6,
                     rot=(math.pi / 2 + math.atan2(-u.y, u.z), 0, 0)), hard)
    rim.location = G(hx, hy + a * u.y, hz + a * u.z)
    model.apply_transforms(rim)
    helmet_parts.append(rim)
    ridge = paint(rbox('Ridge', (0.07, 0.03, 0.28), (hx, hy + 0.222, hz - 0.03), 0.012, bev, rot=(0.2, 0, 0)), hard)
    helmet_parts.append(ridge)
    # A camera housing at the back of the crown.
    o = paint(rbox('CrownPod', (0.15, 0.07, 0.14), (hx, hy + 0.13, hz - 0.185), 0.025, bev, rot=(-0.9, 0, 0)), hard)
    helmet_parts.append(o)
    for s in SIDES:
        # White lamp housings on both temples, two lamps each, facing forward.
        pod = paint(rbox('LampPod', (0.065, 0.13, 0.13), (s * 0.235, hy + 0.05, hz + 0.02), 0.02, 3 if detail else 2, rot=(0, 0, s * 0.18)), hard)
        helmet_parts.append(pod)
        for dy in (0.03, -0.027):
            o = paint(cyl('LampBezel', 0.024, 0.012, (s * 0.24 - s * dy * 0.18, hy + 0.05 + dy, hz + 0.087), 'z', seg=16), mech)
            helmet_parts.append(o)
            lens_o = paint(cyl('LampLens', 0.018, 0.012, (s * 0.24 - s * dy * 0.18, hy + 0.05 + dy, hz + 0.093), 'z', seg=16), lamp)
            helmet_parts.append(lens_o)
    # Visor: the gold shield, hinged at the brow, a little wider than the face
    # opening so its edge tucks under the shell.
    visor = sphere('Visor', R - 0.011, (hx, hy, hz + 0.004), seg=seg + 12, rings=24 if detail else 16)
    keep = sphere('VisorKeep', r_cut + 0.014, (hx, hy + d * u.y, hz + d * u.z), scale=(1.0, 0.95, 1.0), seg=64, rings=32)
    model.boolean(visor, keep, op='INTERSECT')
    visor_parts.append(visor)
    # Earth: the pilot's own head, no helmet.
    head = paint(sphere('Head', 0.1, (0, NECK[1] + 0.17, 0.02), scale=(0.9, 1.15, 1.02), seg=seg, rings=16), skin)
    head_parts.append(head)
    hair_o = paint(sphere('Hair', 0.105, (0, NECK[1] + 0.19, 0.015), scale=(0.94, 1.1, 1.06), seg=seg, rings=16), hair)
    trim = rbox('HairCut', (0.4, 0.4, 0.4), (0, NECK[1] + 0.02, 0.2), 0.001, 1, rot=(0.5, 0, 0))
    model.boolean(hair_o, trim)
    head_parts.append(hair_o)
    head_parts.append(paint(cyl('HeadNeck', 0.055, 0.14, (0, NECK[1] + 0.05, 0.01), 'y', seg=seg, r2=0.062), skin))
    head_parts.append(paint(loft('Nose', [(NECK[1] + 0.19, 0.012, 0.008, 0, 0.11), (NECK[1] + 0.15, 0.018, 0.02, 0, 0.118)], 10), skin))
    for s in SIDES:
        head_parts.append(paint(sphere('Eye', 0.01, (s * 0.034, NECK[1] + 0.18, 0.1), seg=10, rings=6), ink))
        head_parts.append(paint(sphere('Ear', 0.022, (s * 0.09, NECK[1] + 0.165, 0.015), scale=(0.5, 1.0, 0.8), seg=10, rings=6), skin))
    # Decals, on the bake's source only: the roundel on the chest plate, the
    # flag on the pack, the wordmark under it.
    if detail:
        add('torso', flat_decal('Roundel', MATS['EmblemDecal'], 0.125, 0.125, (0, CHEST_Y + 0.43, 0.2665), '+z'), rigid('chest'))
        add('pack', flat_decal('PackFlag', MATS['FlagDecal'], 0.19, 0.127, (px, pc + 0.02, back - 0.0025), '-z'), pack_w)
        word = decal.wordmark('STELLAR', 0.045, G(px, pc - 0.13, back - 0.003), (math.pi / 2, 0, math.pi), extrude=0.002, name='PackWord')
        add('pack', paint(word, ink), pack_w)
    return parts, helmet_parts, visor_parts, head_parts


def make_materials():
    zone('Fabric', (0.79, 0.78, 0.75, 1), 0.86, weave=0.07, quilt=0.6)
    zone('FabricGrey', (0.1, 0.103, 0.11, 1), 0.8, weave=0.3, quilt=0.2)
    zone('Hard', (0.84, 0.83, 0.8, 1), 0.42, scratch=0.05, dust=0.3)
    zone('Grey', (0.2, 0.205, 0.215, 1), 0.6, dust=0.3)
    zone('DarkPad', (0.045, 0.046, 0.05, 1), 0.82, weave=0.4)
    zone('Boot', (0.5, 0.5, 0.51, 1), 0.85, weave=0.08, dust=0.5)
    zone('Sole', (0.07, 0.07, 0.075, 1), 0.92, dust=0.8)
    zone('Metal', (0.74, 0.75, 0.77, 1), 0.36, metal=0.85, scratch=0.04, dust=0.2)
    zone('Mech', (0.06, 0.065, 0.07, 1), 0.5, metal=0.35, dust=0.1)
    zone('Glove', (0.07, 0.072, 0.078, 1), 0.78, weave=0.35, dust=0.4)
    zone('Hose', (0.7, 0.7, 0.68, 1), 0.7, metal=0.0, quilt=0.4, dust=0.2)
    zone('Screen', (0.02, 0.1, 0.1, 1), 0.2, emit=((0.25, 0.92, 0.83), 2.2), dust=0)
    zone('Lamp', (0.9, 0.9, 0.86, 1), 0.2, emit=((1.0, 0.95, 0.85), 5.0), dust=0)
    zone('Lens', (0.2, 0.2, 0.2, 1), 0.2, dust=0)
    zone('InnerVisor', (0.02, 0.022, 0.025, 1), 0.1, metal=0.6, dust=0)
    zone('Skin', (0.62, 0.43, 0.33, 1), 0.6, dust=0)
    zone('Hair', (0.06, 0.045, 0.035, 1), 0.85, weave=0.6, dust=0)
    zone('Ink', (0.05, 0.06, 0.08, 1), 0.7, dust=0)
    image_zone('FlagDecal', decal.georgian_flag('Flag', 384, 256))
    image_zone('EmblemDecal', emblem('Emblem'))


# ── Weights and the armature. ──
BONES = [
    ('body', None, (0, 0, 0)), ('pelvis', 'body', (0, PELVIS_Y, 0)), ('chest', 'pelvis', (0, CHEST_Y, 0)),
    ('pack', 'chest', PACK), ('neck', 'chest', NECK), ('visor', 'neck', VISOR),
]
for _i, _s in enumerate(SIDES):
    BONES += [
        ('shoulder%d' % _i, 'chest', (_s * SHOULDER_X, SHOULDER_Y, 0)), ('elbow%d' % _i, 'shoulder%d' % _i, (_s * SHOULDER_X, ELBOW_Y, 0)),
        ('hand%d' % _i, 'elbow%d' % _i, (_s * SHOULDER_X, HAND_Y, 0)),
        ('hip%d' % _i, 'pelvis', (_s * HIP_X, PELVIS_Y, 0)), ('knee%d' % _i, 'hip%d' % _i, (_s * HIP_X, KNEE_Y, 0)),
        ('ankle%d' % _i, 'knee%d' % _i, (_s * HIP_X, ANKLE_Y, 0)),
    ]


def weigh(o, fn):
    """Vertex groups from a weight function of game-space position."""
    groups = {}
    for v in o.data.vertices:
        c = v.co
        w = fn(c.x, c.z, -c.y)
        total = sum(w.values()) or 1.0
        for bone, k in w.items():
            if k <= 1e-4:
                continue
            g = groups.get(bone) or o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone)
            groups[bone] = g
            g.add([v.index], k / total, 'REPLACE')


def armature():
    data = bpy.data.armatures.new('Rig')
    rig = model.link(bpy.data.objects.new('Rig', data))
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    made = {}
    for name, parent, at in BONES:
        eb = data.edit_bones.new(name)
        eb.head = G(*at)
        eb.tail = G(at[0], at[1] + 0.08, at[2])
        if parent:
            eb.parent = made[parent]
        eb.use_connect = False
        made[name] = eb
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


# ── Baking: per part group, into one shared atlas. ──
def new_image(name, colour):
    img = bpy.data.images.new(name, ATLAS, ATLAS, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    img.generated_color = (0.5, 0.5, 1.0, 1.0) if name.endswith('normal') else (0, 0, 0, 1)
    return img


def bake_group(low, highs, images, cage):
    """Bake one part group's high-poly objects onto its low-poly object."""
    sc = bpy.context.scene
    b = sc.render.bake
    b.use_selected_to_active = True
    b.cage_extrusion = cage
    b.max_ray_distance = cage * 3
    b.margin = 6
    b.use_clear = False
    b.use_pass_direct = False
    b.use_pass_indirect = False
    b.use_pass_color = True
    mat = low.active_material
    nodes = mat.node_tree.nodes

    def one(kind, img, samples):
        sc.cycles.samples = samples
        node = nodes.new('ShaderNodeTexImage')
        node.image = img
        nodes.active = node
        bpy.ops.object.select_all(action='DESELECT')
        for h in highs:
            h.select_set(True)
        low.select_set(True)
        bpy.context.view_layer.objects.active = low
        bpy.ops.object.bake(type=kind)
        nodes.remove(node)

    set_emission('off')
    one('DIFFUSE', images['color'], SAMPLES)
    one('NORMAL', images['normal'], SAMPLES)
    one('ROUGHNESS', images['rough'], 4)
    one('AO', images['ao'], SAMPLES * 4)
    set_emission('metal')
    one('EMIT', images['metal'], 4)
    set_emission('emit')
    one('EMIT', images['emit'], 4)
    set_emission('off')


def ray_invisible(o, on=True):
    for attr in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, attr, not on)


# The reference sheet's six views (Cosmonaut 2.png): eye, target, orthographic scale (0 = perspective).
REF_VIEWS = (
    ('front', (0, 1.06, 12), (0, 1.06, 0), 2.28),
    ('back', (0, 1.06, -12), (0, 1.06, 0), 2.28),
    ('left', (12, 1.06, 0), (0, 1.06, 0), 2.28),
    ('right', (-12, 1.06, 0), (0, 1.06, 0), 2.28),
    ('top', (0, 12, 3.2), (0, 1.1, -0.05), 1.95),
    ('three-quarter', (1.9, 1.55, 3.4), (0, 1.02, 0), 0),
)


def ref_views(out_dir, samples=24):
    """The reference sheet's views on its mid-grey studio backdrop, for the side-by-side sheet."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 400, 600
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'AgX'
    bg = sc.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.2, 0.205, 0.215, 1)
    bg.inputs['Strength'].default_value = 0.8
    cam_data = bpy.data.cameras.new('RefCam')
    cam = bpy.data.objects.new('RefCam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    for name, eye, at, ortho in REF_VIEWS:
        cam_data.type = 'ORTHO' if ortho else 'PERSP'
        cam_data.ortho_scale = ortho or 1.0
        cam_data.lens = 50
        cam.location = G(*eye)
        scene.look_at(cam, G(*at))
        sc.render.filepath = os.path.join(out_dir, f'{name}.png')
        bpy.ops.render.render(write_still=True)


def preview(out_dir):
    """Quick look without the bake: the high-poly copy in its procedural paint,
    in the reference views, and the low-poly triangle count."""
    lo_parts, lo_helmet, lo_visor, lo_head = build(detail=False)
    tris = sum(model.triangle_count(o) for _, o, _ in lo_parts) + sum(model.triangle_count(o) for o in lo_helmet + lo_visor)
    print(f'cosmonaut preview: low-poly LOD0 {tris} tris (body + helmet + visor)', flush=True)
    per = {}
    for o in [o for _, o, _ in lo_parts] + lo_helmet + lo_visor:
        key = o.name.split('.')[0]
        per[key] = per.get(key, 0) + model.triangle_count(o)
    print('  ' + ', '.join(f'{k} {v}' for k, v in sorted(per.items(), key=lambda kv: -kv[1])[:30]), flush=True)
    for o in [o for _, o, _ in lo_parts] + lo_helmet + lo_visor + lo_head:
        bpy.data.objects.remove(o, do_unlink=True)
    hi_parts, hi_helmet, hi_visor, hi_head = build(detail=True)
    for o in [o for _, o, _ in hi_parts] + hi_helmet:
        model.shade_smooth(o, 50)
    gold = bpy.data.materials.new('Visor')
    gold.use_nodes = True
    gb = gold.node_tree.nodes['Principled BSDF']
    gb.inputs['Base Color'].default_value = (0.86, 0.6, 0.2, 1)
    gb.inputs['Metallic'].default_value = 1.0
    gb.inputs['Roughness'].default_value = 0.07
    for o in hi_visor:
        paint(o, gold)
        model.shade_smooth(o, 60)
    for o in hi_head:
        o.hide_render = True
    set_emission('emit')
    ref_views(out_dir, samples=int(os.environ.get('COSMONAUT_SAMPLES', '16')))


def main():
    sc = scene.reset(seed=19)
    scene.sun()
    make_materials()
    if OUT == 'preview':
        preview(RENDERS)
        return

    # High-poly source and low-poly game mesh, both in the rest pose.
    hi_parts, hi_helmet, hi_visor, hi_head = build(detail=True)
    for _, o, _ in hi_parts:
        model.shade_smooth(o, 50)
    for o in hi_helmet + hi_head:
        model.shade_smooth(o, 50)
    for o in hi_visor:
        bpy.data.objects.remove(o, do_unlink=True)
    lo_parts, lo_helmet, lo_visor, lo_head = build(detail=False)

    # Weights on the low parts (before joining; groups merge by name).
    for _, o, fn in lo_parts:
        weigh(o, fn)

    # Join each part group, high and low, and give the low ones one packed atlas.
    groups = {}
    for g, o, _ in lo_parts:
        groups.setdefault(g, ([], []))[0].append(o)
    for g, o, _ in hi_parts:
        groups[g][1].append(o)
    groups['helmet'] = (lo_helmet, hi_helmet)
    groups['head'] = (lo_head, hi_head)
    lows, highs = {}, {}
    for g, (los, his) in groups.items():
        lows[g] = model.join(los, f'Low_{g}')
        highs[g] = model.join(his, f'High_{g}')
        model.apply_transforms(lows[g])
        model.shade_smooth(lows[g], 50)
        ray_invisible(lows[g])
    bake_target = bpy.data.materials.new('BakeTarget')
    bake_target.use_nodes = True
    for o in lows.values():
        o.data.materials.clear()
        o.data.materials.append(bake_target)
    bpy.ops.object.select_all(action='DESELECT')
    for o in lows.values():
        o.select_set(True)
    bpy.context.view_layer.objects.active = lows['torso']
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.004, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')

    tris = sum(model.triangle_count(o) for o in lows.values()) + sum(model.triangle_count(o) for o in lo_visor)
    print(f'cosmonaut: low-poly {tris} tris; high-poly {sum(model.triangle_count(o) for o in highs.values())} tris')
    assert tris <= 25000, f'hero budget is 25k triangles, got {tris}'

    images = {k: new_image(f'cosmonaut-{k}', k == 'color' or k == 'emit') for k in ('color', 'normal', 'rough', 'ao', 'metal', 'emit')}
    for g in lows:
        print(f'cosmonaut: baking {g}', flush=True)
        bake_group(lows[g], [highs[g]], images, cage=0.025)

    # Pack: R ambient occlusion, G roughness, B metalness.
    tex_dir = os.path.join(OUT, 'textures')
    os.makedirs(tex_dir, exist_ok=True)
    px = lambda img: np.array(img.pixels[:], dtype=np.float32).reshape(ATLAS, ATLAS, 4)
    orm = np.ones((ATLAS, ATLAS, 4), dtype=np.float32)
    orm[..., 0] = np.clip(px(images['ao'])[..., 0] * 0.8 + 0.2, 0, 1)
    orm[..., 1] = px(images['rough'])[..., 0]
    orm[..., 2] = px(images['metal'])[..., 0]
    packed = bpy.data.images.new('cosmonaut-orm', ATLAS, ATLAS, alpha=False, float_buffer=False)
    packed.colorspace_settings.name = 'Non-Color'
    packed.pixels = orm.ravel().tolist()
    paths = {}
    for key, img in (('color', images['color']), ('normal', images['normal']), ('orm', packed), ('emit', images['emit'])):
        img.filepath_raw = os.path.join(tex_dir, f'cosmonaut-{key}.png')
        img.file_format = 'PNG'
        img.save()
        paths[key] = img.filepath_raw
    for o in highs.values():
        bpy.data.objects.remove(o, do_unlink=True)

    suit = bake_material('Suit', paths)
    gold = bpy.data.materials.new('Visor')
    gold.use_nodes = True
    gb = gold.node_tree.nodes['Principled BSDF']
    gb.inputs['Base Color'].default_value = (0.86, 0.6, 0.2, 1)
    gb.inputs['Metallic'].default_value = 1.0
    gb.inputs['Roughness'].default_value = 0.07

    # The body: every skinned group in one mesh, on the armature.
    rig = armature()
    body_groups = [g for g in lows if g not in ('helmet', 'head')]
    body = model.join([lows[g] for g in body_groups], 'Body')
    helmet = lows['helmet']
    helmet.name = 'Helmet'
    head = lows['head']
    head.name = 'Head'
    visor = model.join(lo_visor, 'Visor') if len(lo_visor) > 1 else lo_visor[0]
    visor.name = 'Visor'
    model.apply_transforms(visor)
    model.shade_smooth(visor, 60)
    for o in (body, helmet, head):
        o.data.materials.clear()
        o.data.materials.append(suit)
        ray_invisible(o, False)
    visor.data.materials.clear()
    visor.data.materials.append(gold)
    body.parent = rig
    mod = body.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig
    # LOD1: the body decimated with its weights, for the crew beyond ~25 m.
    lod = model.duplicate(body, 'Body_LOD1')
    lod.modifiers.clear()
    dec = lod.modifiers.new('Decimate', 'DECIMATE')
    dec.ratio = 0.35
    model.apply_modifier(lod, dec)
    lod.parent = rig
    m2 = lod.modifiers.new('Armature', 'ARMATURE')
    m2.object = rig
    print(f'cosmonaut: body {model.triangle_count(body)}, LOD1 {model.triangle_count(lod)}, helmet {model.triangle_count(helmet)}, '
          f'visor {model.triangle_count(visor)}, head {model.triangle_count(head)} tris')

    path = os.path.join(OUT, 'cosmonaut.glb')
    bpy.ops.object.select_all(action='DESELECT')
    for o in (rig, body, lod, helmet, visor, head):
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
        export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
        export_image_format='AUTO', export_animations=False, export_skins=True, export_def_bones=False,
        export_morph=False, export_lights=False, export_cameras=False, export_extras=False,
    )
    print('cosmonaut: wrote', path)

    if RENDERS:
        lod.hide_render = True
        head.hide_render = True

        def stance(out, bend):
            """Arms a little out from the rest pose, elbows a little bent."""
            bpy.ops.object.select_all(action='DESELECT')
            rig.select_set(True)
            bpy.context.view_layer.objects.active = rig
            bpy.ops.object.mode_set(mode='POSE')
            for i, s in enumerate(SIDES):
                pb = rig.pose.bones['shoulder%d' % i]
                pb.rotation_mode = 'XYZ'
                # Bone Y points up the arm; roll the arm out about the forward axis.
                pb.rotation_euler = (0, 0, s * out)
                eb = rig.pose.bones['elbow%d' % i]
                eb.rotation_mode = 'XYZ'
                eb.rotation_euler = (bend, 0, 0)
            bpy.ops.object.mode_set(mode='OBJECT')
        # The reference sheet's views and stance, for the side-by-side sheet.
        stance(0.1, -0.15)
        ref_views(os.path.join(RENDERS, 'ref'), samples=32)
        sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
        # A relaxed stance for the turntable: the arms out a little, as the game holds them.
        stance(0.2, -0.4)
        sc.view_settings.view_transform = 'AgX'
        sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.09, 0.095, 0.11, 1)
        sc.cycles.use_denoising = True
        scene.turntable(body, RENDERS, size=512, angles=8, elevation=0.12)
        closeups(os.path.join(RENDERS, 'close'))


def closeups(out_dir):
    """Close views of the signature details: chest, arm flag, pack, helmet."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    cam = sc.camera
    cam.data.lens = 70
    for name, eye, at in (
        ('chest', (0.25, 1.5, 1.35), (0, 1.38, 0.2)),
        ('arm', (1.1, 1.45, 0.25), (0.4, 1.4, 0.0)),
        ('pack', (-0.3, 1.5, -1.6), (0, 1.45, -0.4)),
        ('helmet', (0.55, 2.0, 0.75), (0, 1.88, 0.05)),
        ('boots', (0.5, 0.3, 0.9), (0, 0.1, 0.05)),
    ):
        cam.location = G(*eye)
        scene.look_at(cam, G(*at))
        sc.render.filepath = os.path.join(out_dir, f'{name}.png')
        bpy.ops.render.render(write_still=True)


def bake_material(name, paths):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    bsdf = n['Principled BSDF']

    def tex(key, colour):
        t = n.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(paths[key])
        t.image.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
        return t
    col = tex('color', True)
    l.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    nt = tex('normal', False)
    nm = n.new('ShaderNodeNormalMap')
    l.new(nt.outputs['Color'], nm.inputs['Color'])
    l.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    orm = tex('orm', False)
    sep = n.new('ShaderNodeSeparateColor')
    l.new(orm.outputs['Color'], sep.inputs['Color'])
    l.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    l.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    # glTF reads occlusion from a glTF Material Output group; the game uses the R channel itself.
    em = tex('emit', True)
    l.new(em.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = 1.0
    return mat


main()
