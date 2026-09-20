"""The pilot asset: a lunar supply crate for Stellar Base.

Run:  Blender -b -P assets-src/blender/crate.py -- <out-dir> [renders-dir]
Writes <out-dir>/crate.glb (raw; optimise it with gltf-transform) and, if a
renders dir is given, an 8-angle turntable there.

Design (no reference images: the plan's text plus NASA cargo transfer bags
and ISS stowage lockers for proportion): a 0.75 × 0.6 × 0.6 m hard case,
off-white shell with a lid in Stellar's terracotta, recessed handles cut
into the short ends, four corner caps, two strap channels, the STELLAR
wordmark on the long side and the five-cross flag on the lid. Origin at the
bottom centre, Y up in the export, so it sits on the ground where placed.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import scene, model, uv, bake, decal  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, '..', 'build')
RENDERS = argv[1] if len(argv) > 1 else None

W, H, D = 0.75, 0.6, 0.6
SHELL = (0.92, 0.91, 0.88, 1)
TERRACOTTA = (0.95, 0.46, 0.16, 1)
INK = (0.08, 0.09, 0.1, 1)


def build_shape(detail):
    """The crate body. `detail` picks the bevel segments: 1 for the game
    mesh, 4 plus subdivision for the copy the normals are baked from."""
    seg = 4 if detail else 1
    body = model.box('Body', (W, D, H * 0.82), (0, 0, H * 0.41))
    lid = model.box('Lid', (W + 0.02, D + 0.02, H * 0.18), (0, 0, H * 0.91))
    # A seam between lid and body, cut as a shallow groove.
    seam = model.box('Seam', (W + 0.1, D + 0.1, 0.012), (0, 0, H * 0.82))
    model.boolean(body, seam)
    # Recessed handles in both short ends.
    for sx in (-1, 1):
        cut = model.box('HandleCut', (0.06, 0.16, 0.05), (sx * W / 2, 0, H * 0.55))
        model.boolean(body, cut)
    # Two strap channels over the top and down the long sides.
    for sy in (-0.18, 0.18):
        chan = model.box('Strap', (W + 0.1, 0.05, 0.008), (0, sy, H))
        model.boolean(lid, chan)
    model.bevel(body, 0.012, seg)
    model.bevel(lid, 0.014, seg)
    # Corner caps: a little armour on each bottom corner.
    caps = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            cap = model.box('Cap', (0.09, 0.09, 0.14), (sx * (W / 2 - 0.035), sy * (D / 2 - 0.035), 0.07))
            model.bevel(cap, 0.01, seg)
            caps.append(cap)
    parts = [body, lid] + caps
    if detail:
        for p in parts:
            model.subdivide(p, 1)
    return body, lid, caps


def paint(obj, colour, name, wear=0.0, seed=7):
    """A procedural painted-shell material: base colour, noise grime in the
    hollows and lighter wear on exposed geometry via the pointiness pass."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.62
    bsdf.inputs['Metallic'].default_value = 0.0
    geo = nodes.new('ShaderNodeNewGeometry')
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.48
    ramp.color_ramp.elements[1].position = 0.62
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 38.0
    noise.inputs['Detail'].default_value = 6.0
    noise.inputs['Roughness'].default_value = 0.7
    noise.noise_dimensions = '4D'
    noise.inputs['W'].default_value = seed
    grime = nodes.new('ShaderNodeMixRGB')
    grime.blend_type = 'MULTIPLY'
    grime.inputs['Fac'].default_value = 0.35
    grime.inputs['Color1'].default_value = colour
    links.new(noise.outputs['Fac'], grime.inputs['Color2'])
    edge = nodes.new('ShaderNodeMixRGB')
    edge.blend_type = 'MIX'
    edge.inputs['Color2'].default_value = (0.75, 0.75, 0.74, 1)
    links.new(geo.outputs['Pointiness'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], edge.inputs['Fac'])
    links.new(grime.outputs['Color'], edge.inputs['Color1'])
    links.new(edge.outputs['Color'], bsdf.inputs['Base Color'])
    rough = nodes.new('ShaderNodeMath')
    rough.operation = 'MULTIPLY_ADD'
    links.new(noise.outputs['Fac'], rough.inputs[0])
    rough.inputs[1].default_value = 0.25
    rough.inputs[2].default_value = 0.5 + wear
    links.new(rough.outputs['Value'], bsdf.inputs['Roughness'])
    obj.data.materials.append(mat)
    return mat


def flag_on_lid(lid):
    """The five-cross flag as an image node, projected onto the lid's top."""
    img = decal.georgian_flag('GeorgianFlag')
    mat = lid.data.materials[0]
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.extension = 'CLIP'
    coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    # 0.24 × 0.16 m flag, top face, between the straps, world-projected.
    fw, fh = 0.24, 0.16
    mapping.inputs['Location'].default_value = (0.5, 0.5, 0)
    mapping.inputs['Scale'].default_value = (1 / fw, 1 / fh, 1)
    links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MIX'
    # Only on the top face: mask by the normal pointing up.
    geo = nodes.new('ShaderNodeNewGeometry')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Normal'], sep.inputs['Vector'])
    up = nodes.new('ShaderNodeMath')
    up.operation = 'GREATER_THAN'
    up.inputs[1].default_value = 0.9
    links.new(sep.outputs['Z'], up.inputs[0])
    mask = nodes.new('ShaderNodeMath')
    mask.operation = 'MULTIPLY'
    links.new(up.outputs['Value'], mask.inputs[0])
    links.new(tex.outputs['Alpha'], mask.inputs[1])
    links.new(mask.outputs['Value'], mix.inputs['Fac'])
    prev = bsdf.inputs['Base Color'].links[0].from_socket
    links.new(prev, mix.inputs['Color1'])
    links.new(tex.outputs['Color'], mix.inputs['Color2'])
    links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])


def main():
    scene.reset(seed=11)
    scene.sun()

    # ── High-poly: the shape with round bevels, subdivision and raised lettering. ──
    hb, hl, hcaps = build_shape(detail=True)
    paint(hb, SHELL, 'ShellHi')
    paint(hl, TERRACOTTA, 'LidHi', wear=0.05)
    for c in hcaps:
        paint(c, INK, 'CapHi')
    flag_on_lid(hl)
    word = decal.wordmark('STELLAR', 0.13, (0, -D / 2 - 0.004, H * 0.42), (math.pi / 2, 0, 0), extrude=0.006)
    word2 = decal.wordmark('STELLAR', 0.13, (0, D / 2 + 0.004, H * 0.42), (math.pi / 2, 0, math.pi), extrude=0.006, name='Wordmark2')
    paint(word2, INK, 'InkHi2')
    paint(word, INK, 'InkHi')
    high = model.join([hb, hl, *hcaps, word, word2], 'CrateHigh')
    model.shade_smooth(high, 45)

    # ── Low-poly: the same shape with single-segment bevels; one atlas. ──
    lb, ll, lcaps = build_shape(detail=False)
    low = model.join([lb, ll, *lcaps], 'Crate')
    model.apply_transforms(low)
    model.shade_smooth(low, 45)
    uv.smart_unwrap(low, angle_deg=66, margin=0.012)
    low.data.materials.clear()
    temp = bpy.data.materials.new('BakeTarget')
    temp.use_nodes = True
    low.data.materials.append(temp)
    tris = model.triangle_count(low)
    print(f'crate: low-poly {tris} tris, high-poly {model.triangle_count(high)} tris')
    print('crate: bounds', [tuple(round(c, 3) for c in v) for v in (low.bound_box[0], low.bound_box[6])])
    assert tris <= 1500, f'prop budget is 1.5k triangles, got {tris}'

    paths = bake.bake_set(low, high, os.path.join(OUT, 'textures'), 'crate', size=1024, samples=24, cage=0.03)
    low.data.materials.clear()
    low.data.materials.append(bake.export_material('CrateShell', paths))
    bpy.data.objects.remove(high, do_unlink=True)

    # LODs from the decimate modifier, exported inside the same file as named nodes.
    lod1 = model.decimate(low, 0.4, 'Crate_LOD1')
    lod2 = model.decimate(low, 0.12, 'Crate_LOD2')
    for lod in (lod1, lod2):
        lod.parent = low
    scene.export_glb(low, os.path.join(OUT, 'crate.glb'))
    for lod in (lod1, lod2):
        bpy.data.objects.remove(lod, do_unlink=True)
    if RENDERS:
        scene.turntable(low, RENDERS, size=512, angles=8)


main()
