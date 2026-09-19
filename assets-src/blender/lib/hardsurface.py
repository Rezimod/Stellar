"""Hard-surface vehicle helpers: lofted and lathed hulls, flat decals,
named attachment empties and the procedural paint the bakes read from.

Blender axes for vehicles: nose toward -Y, up +Z, port +X. The glTF export
(Y-up) turns that into the game's frame: forward +Z, up +Y, port +X."""
import math
import bmesh
import bpy
from mathutils import Matrix, Vector
import model


def loft(name, profile, stations, cap=True):
    """A hull lofted through cross-sections. `profile` is a closed polygon of
    (x, z) points; each station is (y, sx, sz, ox, oz): the profile scaled by
    (sx, sz) and moved to (ox, oz) at depth y. Flat facets between stations,
    so a faceted armoured hull comes out as it is drawn."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for y, sx, sz, ox, oz in stations:
        rings.append([bm.verts.new((ox + px * sx, y, oz + pz * sz)) for px, pz in profile])
    n = len(profile)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return model.link(bpy.data.objects.new(name, mesh))


def lathe(name, points, segments=24, location=(0, 0, 0), axis='Y', cap_start=False, cap_end=False, phase=0.0):
    """A surface of revolution: `points` is a polyline of (radius, along)
    pairs swept round the axis (Y by default: engines, nozzles, pods)."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, t in points:
        ring = []
        for k in range(segments):
            a = phase + 2 * math.pi * k / segments
            c, s = math.cos(a) * r, math.sin(a) * r
            if axis == 'Y':
                co = (c, t, s)
            elif axis == 'X':
                co = (t, c, s)
            else:
                co = (c, s, t)
            ring.append(bm.verts.new(co))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap_start:
        bm.faces.new(rings[0][::-1])
    if cap_end:
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = model.link(bpy.data.objects.new(name, mesh))
    obj.location = location
    return obj


def plate(name, width, height, origin, right, up, uv=True):
    """A flat quad (width along `right`, height along `up`) centred on
    `origin`, facing right × up. Used for decals floated over the hull."""
    right = Vector(right).normalized()
    up = Vector(up).normalized()
    o = Vector(origin)
    hw, hh = width / 2, height / 2
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(o + right * x + up * y) for x, y in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh))]
    face = bm.faces.new(vs)
    if uv:
        layer = bm.loops.layers.uv.new('UVMap')
        for loop, co in zip(face.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[layer].uv = co
    bm.to_mesh(mesh)
    bm.free()
    return model.link(bpy.data.objects.new(name, mesh))


def orient(obj, origin, right, up):
    """Place an object whose local X reads along `right` and local Y along
    `up` (a text object, a decal) at `origin`, facing right × up."""
    r = Vector(right).normalized()
    u = Vector(up).normalized()
    n = r.cross(u).normalized()
    u = n.cross(r).normalized()
    m = Matrix((r, u, n)).transposed().to_4x4()
    m.translation = Vector(origin)
    obj.matrix_world = m
    return obj


def empty(name, location, parent=None, size=0.2):
    """A named attachment point the runtime reads (engine, cannon, light)."""
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = size
    bpy.context.collection.objects.link(obj)
    obj.location = location
    if parent is not None:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def set_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


# ── Procedural materials. Every one is a single Principled BSDF so the bake
# can read base colour, roughness, metalness and emission off its inputs. ──

def _nodes(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    return mat, nt.nodes, nt.links, nt.nodes['Principled BSDF']


def _seams(nodes, links, coord, axis, period, width, offset=0.0):
    """1 on thin lines every `period` metres along `axis`, else 0."""
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(coord, sep.inputs['Vector'])
    div = nodes.new('ShaderNodeMath')
    div.operation = 'MULTIPLY_ADD'
    links.new(sep.outputs[axis], div.inputs[0])
    div.inputs[1].default_value = 1.0 / period
    div.inputs[2].default_value = offset
    fr = nodes.new('ShaderNodeMath')
    fr.operation = 'PINGPONG'
    fr.inputs[1].default_value = 0.5
    links.new(div.outputs[0], fr.inputs[0])
    lt = nodes.new('ShaderNodeMath')
    lt.operation = 'LESS_THAN'
    lt.inputs[1].default_value = width / period
    links.new(fr.outputs[0], lt.inputs[0])
    return lt.outputs[0]


def _max(nodes, links, a, b):
    m = nodes.new('ShaderNodeMath')
    m.operation = 'MAXIMUM'
    links.new(a, m.inputs[0])
    links.new(b, m.inputs[1])
    return m.outputs[0]


def _dust(nodes, links, coord, colour, rough, amount, height, seed):
    """Regolith dust climbing the lower `height` metres (object Z, so the
    object's origin must sit on the ground): mixed into the colour and
    pushed toward a matte roughness. Returns the new (colour, roughness)."""
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(coord, sep.inputs['Vector'])
    noise = nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['W'].default_value = seed * 5.7
    noise.inputs['Scale'].default_value = 2.4
    noise.inputs['Detail'].default_value = 6.0
    links.new(coord, noise.inputs['Vector'])
    # Height falloff, broken up by the noise so the dust line is ragged.
    h = nodes.new('ShaderNodeMath')
    h.operation = 'MULTIPLY_ADD'
    links.new(noise.outputs['Fac'], h.inputs[0])
    h.inputs[1].default_value = height * 0.7
    h.inputs[2].default_value = -height * 0.35
    zz = nodes.new('ShaderNodeMath')
    zz.operation = 'ADD'
    links.new(sep.outputs['Z'], zz.inputs[0])
    links.new(h.outputs[0], zz.inputs[1])
    fall = nodes.new('ShaderNodeMapRange')
    fall.inputs['From Min'].default_value = height
    fall.inputs['From Max'].default_value = 0.0
    fall.inputs['To Min'].default_value = 0.0
    fall.inputs['To Max'].default_value = amount
    fall.clamp = True
    links.new(zz.outputs[0], fall.inputs['Value'])
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MIX'
    links.new(fall.outputs[0], mix.inputs['Fac'])
    links.new(colour, mix.inputs['Color1'])
    mix.inputs['Color2'].default_value = (0.3, 0.285, 0.265, 1)
    rm = nodes.new('ShaderNodeMath')
    rm.operation = 'MAXIMUM'
    links.new(rough, rm.inputs[0])
    rmul = nodes.new('ShaderNodeMath')
    rmul.operation = 'MULTIPLY'
    rmul.inputs[1].default_value = 0.95
    links.new(fall.outputs[0], rmul.inputs[0])
    links.new(rmul.outputs[0], rm.inputs[1])
    return mix.outputs[0], rm.outputs[0]


def paint(name, colour, seed=1.0, wear=0.35, grime=0.3, panel=(1.6, 1.1, 0.9), seam=0.035,
          rough=0.55, metal=0.05, streak_axis='Y', scorch=0.0, patches=0.0, dust=0.0, dust_height=0.6, seam_ink=0.75):
    """Weathered paint over hull plating: per-panel tone variation, panel
    seams (bump + dark line), grime streaked along the flow, lighter chipped
    edges from the pointiness pass and optional carbon scoring."""
    mat, nodes, links, bsdf = _nodes(name)
    coord = nodes.new('ShaderNodeTexCoord').outputs['Object']
    # Panel grid: seams along each axis; the plate between gets its own tone.
    s = [_seams(nodes, links, coord, ax, p, seam, seed * 0.37 * (i + 1)) for i, (ax, p) in enumerate(zip('YXZ', panel))]
    seams = _max(nodes, links, _max(nodes, links, s[0], s[1]), s[2])
    # One random value per plate: the object position snapped to the grid.
    grid = nodes.new('ShaderNodeVectorMath')
    grid.operation = 'MULTIPLY_ADD'
    links.new(coord, grid.inputs[0])
    grid.inputs[1].default_value = tuple(1.0 / p for p in (panel[1], panel[0], panel[2]))
    grid.inputs[2].default_value = (seed * 0.37 * 2, seed * 0.37, seed * 0.37 * 3)
    snap = nodes.new('ShaderNodeVectorMath')
    snap.operation = 'FLOOR'
    links.new(grid.outputs[0], snap.inputs[0])
    vor = nodes.new('ShaderNodeTexWhiteNoise')
    vor.noise_dimensions = '4D'
    vor.inputs['W'].default_value = seed
    links.new(snap.outputs[0], vor.inputs['Vector'])
    tone = nodes.new('ShaderNodeMapRange')
    tone.inputs['To Min'].default_value = 0.9
    tone.inputs['To Max'].default_value = 1.04
    links.new(vor.outputs['Color'], tone.inputs['Value'])
    base = nodes.new('ShaderNodeMixRGB')
    base.blend_type = 'MULTIPLY'
    base.inputs['Fac'].default_value = 1.0
    base.inputs['Color1'].default_value = colour
    links.new(tone.outputs[0], base.inputs['Color2'])
    if patches > 0:
        # A few plates replaced with grey spares: a used ship, not a new one.
        pick = nodes.new('ShaderNodeMath')
        pick.operation = 'GREATER_THAN'
        pick.inputs[1].default_value = 1 - patches
        sepc = nodes.new('ShaderNodeSeparateColor')
        links.new(vor.outputs['Color'], sepc.inputs['Color'])
        links.new(sepc.outputs['Red'], pick.inputs[0])
        spare = nodes.new('ShaderNodeMixRGB')
        spare.blend_type = 'MIX'
        links.new(pick.outputs[0], spare.inputs['Fac'])
        links.new(base.outputs[0], spare.inputs['Color1'])
        spare.inputs['Color2'].default_value = (colour[0] * 0.55, colour[1] * 0.56, colour[2] * 0.58, 1)
        base = spare
    # Grime: low-frequency noise stretched along the flow.
    mapping = nodes.new('ShaderNodeMapping')
    stretch = {'Y': (3.0, 0.35, 3.0), 'X': (0.35, 3.0, 3.0), 'Z': (3.0, 3.0, 0.35)}[streak_axis]
    mapping.inputs['Scale'].default_value = stretch
    links.new(coord, mapping.inputs['Vector'])
    noise = nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['W'].default_value = seed * 3.1
    noise.inputs['Scale'].default_value = 1.6
    noise.inputs['Detail'].default_value = 5.0
    noise.inputs['Roughness'].default_value = 0.62
    links.new(mapping.outputs[0], noise.inputs['Vector'])
    gramp = nodes.new('ShaderNodeValToRGB')
    gramp.color_ramp.elements[0].position = 0.45
    gramp.color_ramp.elements[0].color = (1, 1, 1, 1)
    gramp.color_ramp.elements[1].position = 0.78
    g = 1 - grime
    gramp.color_ramp.elements[1].color = (g * 0.92, g * 0.9, g * 0.86, 1)
    links.new(noise.outputs['Fac'], gramp.inputs['Fac'])
    dirty = nodes.new('ShaderNodeMixRGB')
    dirty.blend_type = 'MULTIPLY'
    dirty.inputs['Fac'].default_value = 1.0
    links.new(base.outputs[0], dirty.inputs['Color1'])
    links.new(gramp.outputs[0], dirty.inputs['Color2'])
    out = dirty.outputs[0]
    if scorch > 0:
        sc = nodes.new('ShaderNodeTexNoise')
        sc.noise_dimensions = '4D'
        sc.inputs['W'].default_value = seed * 7.3
        sc.inputs['Scale'].default_value = 0.9
        sc.inputs['Detail'].default_value = 8.0
        links.new(mapping.outputs[0], sc.inputs['Vector'])
        sramp = nodes.new('ShaderNodeValToRGB')
        sramp.color_ramp.elements[0].position = 0.58
        sramp.color_ramp.elements[1].position = 0.74
        links.new(sc.outputs['Fac'], sramp.inputs['Fac'])
        smix = nodes.new('ShaderNodeMixRGB')
        smix.blend_type = 'MIX'
        smul = nodes.new('ShaderNodeMath')
        smul.operation = 'MULTIPLY'
        smul.inputs[1].default_value = scorch
        links.new(sramp.outputs['Color'], smul.inputs[0])
        links.new(smul.outputs[0], smix.inputs['Fac'])
        links.new(out, smix.inputs['Color1'])
        smix.inputs['Color2'].default_value = (0.05, 0.045, 0.04, 1)
        out = smix.outputs[0]
    # Chipped edges: pointy geometry shows the primer and bare metal under.
    geo = nodes.new('ShaderNodeNewGeometry')
    eramp = nodes.new('ShaderNodeValToRGB')
    eramp.color_ramp.elements[0].position = 0.52
    eramp.color_ramp.elements[1].position = 0.6
    links.new(geo.outputs['Pointiness'], eramp.inputs['Fac'])
    chip = nodes.new('ShaderNodeTexNoise')
    chip.inputs['Scale'].default_value = 9.0
    chip.inputs['Detail'].default_value = 3.0
    links.new(coord, chip.inputs['Vector'])
    emask = nodes.new('ShaderNodeMath')
    emask.operation = 'MULTIPLY'
    links.new(eramp.outputs['Color'], emask.inputs[0])
    links.new(chip.outputs['Fac'], emask.inputs[1])
    ewear = nodes.new('ShaderNodeMath')
    ewear.operation = 'MULTIPLY'
    ewear.inputs[1].default_value = wear * 2.2
    ewear.use_clamp = True
    links.new(emask.outputs[0], ewear.inputs[0])
    worn = nodes.new('ShaderNodeMixRGB')
    worn.blend_type = 'MIX'
    links.new(ewear.outputs[0], worn.inputs['Fac'])
    links.new(out, worn.inputs['Color1'])
    worn.inputs['Color2'].default_value = (0.5, 0.5, 0.5, 1)
    # Seams: a dark line in the colour, a groove in the bump.
    line = nodes.new('ShaderNodeMixRGB')
    line.blend_type = 'MULTIPLY'
    lf = nodes.new('ShaderNodeMath')
    lf.operation = 'MULTIPLY'
    lf.inputs[1].default_value = seam_ink
    links.new(seams, lf.inputs[0])
    links.new(lf.outputs[0], line.inputs['Fac'])
    links.new(worn.outputs[0], line.inputs['Color1'])
    line.inputs['Color2'].default_value = (0.25, 0.25, 0.26, 1)
    colour_out = line.outputs[0]
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.6
    bump.inputs['Distance'].default_value = 0.01
    inv = nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1.0
    links.new(seams, inv.inputs[1])
    links.new(inv.outputs[0], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    r = nodes.new('ShaderNodeMath')
    r.operation = 'MULTIPLY_ADD'
    links.new(noise.outputs['Fac'], r.inputs[0])
    r.inputs[1].default_value = 0.25
    r.inputs[2].default_value = rough - 0.1
    rr = nodes.new('ShaderNodeMath')
    rr.operation = 'MAXIMUM'
    links.new(r.outputs[0], rr.inputs[0])
    links.new(ewear.outputs[0], rr.inputs[1])
    rr.use_clamp = True
    rough_out = rr.outputs[0]
    if dust > 0:
        colour_out, rough_out = _dust(nodes, links, coord, colour_out, rough_out, dust, dust_height, seed)
    links.new(colour_out, bsdf.inputs['Base Color'])
    links.new(rough_out, bsdf.inputs['Roughness'])
    mm = nodes.new('ShaderNodeMath')
    mm.operation = 'MULTIPLY_ADD'
    links.new(ewear.outputs[0], mm.inputs[0])
    mm.inputs[1].default_value = 0.6
    mm.inputs[2].default_value = metal
    mm.use_clamp = True
    links.new(mm.outputs[0], bsdf.inputs['Metallic'])
    return mat


def metal(name, colour, rough=0.45, metallic=0.55, seed=2.0, ribs=0.0, rib_axis='Y', dust=0.0, dust_height=0.6):
    """Dark machinery: anodised or gunmetal, a little noise in the roughness,
    optional machined ribs (bump) for engine shrouds and ducts."""
    mat, nodes, links, bsdf = _nodes(name)
    coord = nodes.new('ShaderNodeTexCoord').outputs['Object']
    noise = nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['W'].default_value = seed
    noise.inputs['Scale'].default_value = 3.0
    noise.inputs['Detail'].default_value = 6.0
    links.new(coord, noise.inputs['Vector'])
    tint = nodes.new('ShaderNodeMapRange')
    tint.inputs['To Min'].default_value = 0.75
    tint.inputs['To Max'].default_value = 1.15
    links.new(noise.outputs['Fac'], tint.inputs['Value'])
    col = nodes.new('ShaderNodeMixRGB')
    col.blend_type = 'MULTIPLY'
    col.inputs['Fac'].default_value = 1.0
    col.inputs['Color1'].default_value = colour
    links.new(tint.outputs[0], col.inputs['Color2'])
    r = nodes.new('ShaderNodeMath')
    r.operation = 'MULTIPLY_ADD'
    links.new(noise.outputs['Fac'], r.inputs[0])
    r.inputs[1].default_value = 0.2
    r.inputs[2].default_value = rough - 0.1
    colour_out, rough_out = col.outputs[0], r.outputs[0]
    if dust > 0:
        colour_out, rough_out = _dust(nodes, links, coord, colour_out, rough_out, dust, dust_height, seed)
    links.new(colour_out, bsdf.inputs['Base Color'])
    links.new(rough_out, bsdf.inputs['Roughness'])
    bsdf.inputs['Metallic'].default_value = metallic
    if ribs > 0:
        rib = _seams(nodes, links, coord, rib_axis, ribs, ribs * 0.35)
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.8
        bump.inputs['Distance'].default_value = 0.02
        links.new(rib, bump.inputs['Height'])
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def flat(name, colour, rough=0.4, metallic=0.0, emit=None, emit_strength=1.0):
    """A plain surface: glass, decal ink, an accent strip, a lamp."""
    mat, nodes, links, bsdf = _nodes(name)
    bsdf.inputs['Base Color'].default_value = colour
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    if emit is not None:
        bsdf.inputs['Emission Color'].default_value = emit
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    return mat


def image_mat(name, img, rough=0.5, emit=False):
    """A decal material: the image is the colour (and the glow, for lamps)."""
    mat, nodes, links, bsdf = _nodes(name)
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.extension = 'CLIP'
    links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    if emit:
        links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 1.0
    return mat


def hazard(name, a=(0.93, 0.45, 0.1, 1), b=(0.03, 0.03, 0.032, 1), period=0.22, seed=8.0, dust=0.0):
    """Diagonal hazard stripes (amber and black) in object space, a little
    worn: for door jambs, bumpers, cable ducts and skid edges."""
    mat, nodes, links, bsdf = _nodes(name)
    coord = nodes.new('ShaderNodeTexCoord').outputs['Object']
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(coord, sep.inputs['Vector'])
    s1 = nodes.new('ShaderNodeMath')
    s1.operation = 'ADD'
    links.new(sep.outputs['X'], s1.inputs[0])
    links.new(sep.outputs['Y'], s1.inputs[1])
    s2 = nodes.new('ShaderNodeMath')
    s2.operation = 'ADD'
    links.new(s1.outputs[0], s2.inputs[0])
    links.new(sep.outputs['Z'], s2.inputs[1])
    sc = nodes.new('ShaderNodeMath')
    sc.operation = 'MULTIPLY'
    sc.inputs[1].default_value = 1.0 / period
    links.new(s2.outputs[0], sc.inputs[0])
    fr = nodes.new('ShaderNodeMath')
    fr.operation = 'FRACT'
    links.new(sc.outputs[0], fr.inputs[0])
    gt = nodes.new('ShaderNodeMath')
    gt.operation = 'GREATER_THAN'
    gt.inputs[1].default_value = 0.5
    links.new(fr.outputs[0], gt.inputs[0])
    mix = nodes.new('ShaderNodeMixRGB')
    links.new(gt.outputs[0], mix.inputs['Fac'])
    mix.inputs['Color1'].default_value = a
    mix.inputs['Color2'].default_value = b
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 7.0
    noise.inputs['Detail'].default_value = 6.0
    links.new(coord, noise.inputs['Vector'])
    wr = nodes.new('ShaderNodeValToRGB')
    wr.color_ramp.elements[0].position = 0.6
    wr.color_ramp.elements[1].position = 0.72
    links.new(noise.outputs['Fac'], wr.inputs['Fac'])
    worn = nodes.new('ShaderNodeMixRGB')
    links.new(wr.outputs['Color'], worn.inputs['Fac'])
    links.new(mix.outputs[0], worn.inputs['Color1'])
    worn.inputs['Color2'].default_value = (0.32, 0.31, 0.3, 1)
    colour = worn.outputs[0]
    r = nodes.new('ShaderNodeValue')
    r.outputs[0].default_value = 0.6
    rough = r.outputs[0]
    if dust > 0:
        colour, rough = _dust(nodes, links, coord, colour, rough, dust, 0.5, seed)
    links.new(colour, bsdf.inputs['Base Color'])
    links.new(rough, bsdf.inputs['Roughness'])
    return mat


def cells(name, colour=(0.012, 0.022, 0.055, 1), module=(1.0, 0.66), cell=0.165, axes='XZ'):
    """Photovoltaic cells: dark blue glassy cells in a fine silver grid,
    brighter frame lines between modules. `axes` is the panel's plane in
    object space."""
    mat, nodes, links, bsdf = _nodes(name)
    coord = nodes.new('ShaderNodeTexCoord').outputs['Object']
    a, b = axes
    fine = _max(nodes, links, _seams(nodes, links, coord, a, cell, 0.01), _seams(nodes, links, coord, b, cell, 0.01))
    big = _max(nodes, links, _seams(nodes, links, coord, a, module[0], 0.03), _seams(nodes, links, coord, b, module[1], 0.03))
    fm = nodes.new('ShaderNodeMath')
    fm.operation = 'MULTIPLY'
    fm.inputs[1].default_value = 0.3
    links.new(fine, fm.inputs[0])
    lines = _max(nodes, links, fm.outputs[0], big)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.8
    links.new(coord, noise.inputs['Vector'])
    tone = nodes.new('ShaderNodeMapRange')
    tone.inputs['To Min'].default_value = 0.8
    tone.inputs['To Max'].default_value = 1.25
    links.new(noise.outputs['Fac'], tone.inputs['Value'])
    tint = nodes.new('ShaderNodeMixRGB')
    tint.blend_type = 'MULTIPLY'
    tint.inputs['Fac'].default_value = 1.0
    tint.inputs['Color1'].default_value = colour
    links.new(tone.outputs[0], tint.inputs['Color2'])
    mix = nodes.new('ShaderNodeMixRGB')
    links.new(lines, mix.inputs['Fac'])
    links.new(tint.outputs[0], mix.inputs['Color1'])
    mix.inputs['Color2'].default_value = (0.26, 0.27, 0.29, 1)
    links.new(mix.outputs[0], bsdf.inputs['Base Color'])
    rr = nodes.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = 0.18
    rr.inputs['To Max'].default_value = 0.45
    links.new(lines, rr.inputs['Value'])
    links.new(rr.outputs[0], bsdf.inputs['Roughness'])
    mm = nodes.new('ShaderNodeMapRange')
    mm.inputs['To Min'].default_value = 0.1
    mm.inputs['To Max'].default_value = 0.8
    links.new(lines, mm.inputs['Value'])
    links.new(mm.outputs[0], bsdf.inputs['Metallic'])
    return mat
