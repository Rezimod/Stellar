"""Procedural materials baked to a small atlas: base colour, a normal map
from the high-poly copy, and roughness + metalness packed for glTF."""
import os
import bpy
import numpy as np


def image(name, size):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if name.endswith('color') else 'Non-Color'
    return img


def _bake(low, high, img, kind, cage_extrusion, samples, margin=8):
    """Bake `kind` from `high` onto `low` into `img` (selected to active)."""
    sc = bpy.context.scene
    sc.cycles.samples = samples
    sc.render.bake.use_selected_to_active = high is not None
    sc.render.bake.cage_extrusion = cage_extrusion
    sc.render.bake.max_ray_distance = cage_extrusion * 4
    sc.render.bake.margin = margin
    sc.render.bake.use_pass_direct = False
    sc.render.bake.use_pass_indirect = False
    sc.render.bake.use_pass_color = True
    mat = low.active_material
    nodes = mat.node_tree.nodes
    node = nodes.new('ShaderNodeTexImage')
    node.image = img
    nodes.active = node
    bpy.ops.object.select_all(action='DESELECT')
    if high is not None:
        high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type=kind)
    nodes.remove(node)


def bake_set(low, high, out_dir, name, size=1024, samples=24, cage=0.03):
    """Four bakes, three files. Returns the paths of colour, normal and the
    packed roughness/metalness (glTF: G roughness, B metalness, R AO)."""
    os.makedirs(out_dir, exist_ok=True)
    color = image(f'{name}-color', size)
    normal = image(f'{name}-normal', size)
    rough = image(f'{name}-rough', size)
    ao = image(f'{name}-ao', size)
    _bake(low, high, color, 'DIFFUSE', cage, samples)
    _bake(low, high, normal, 'NORMAL', cage, samples)
    _bake(low, high, rough, 'ROUGHNESS', cage, samples)
    _bake(low, high, ao, 'AO', cage, samples * 2)
    # Pack: R ambient occlusion, G roughness, B metalness (all painted 0 here: a painted crate).
    r = np.array(rough.pixels[:], dtype=np.float32).reshape(size, size, 4)
    a = np.array(ao.pixels[:], dtype=np.float32).reshape(size, size, 4)
    orm = np.ones((size, size, 4), dtype=np.float32)
    orm[..., 0] = a[..., 0]
    orm[..., 1] = r[..., 0]
    orm[..., 2] = 0.0
    packed = image(f'{name}-orm', size)
    packed.pixels = orm.ravel().tolist()
    paths = {}
    for img, key in ((color, 'color'), (normal, 'normal'), (packed, 'orm')):
        img.filepath_raw = os.path.join(out_dir, f'{name}-{key}.png')
        img.file_format = 'PNG'
        img.save()
        paths[key] = img.filepath_raw
    return paths


def export_material(name, paths):
    """The plain material the exporter turns into glTF metallicRoughness."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = 0.0
    col = nodes.new('ShaderNodeTexImage')
    col.image = bpy.data.images.load(paths['color'])
    col.image.colorspace_settings.name = 'sRGB'
    links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    nrm_tex = nodes.new('ShaderNodeTexImage')
    nrm_tex.image = bpy.data.images.load(paths['normal'])
    nrm_tex.image.colorspace_settings.name = 'Non-Color'
    nrm = nodes.new('ShaderNodeNormalMap')
    links.new(nrm_tex.outputs['Color'], nrm.inputs['Color'])
    links.new(nrm.outputs['Normal'], bsdf.inputs['Normal'])
    orm_tex = nodes.new('ShaderNodeTexImage')
    orm_tex.image = bpy.data.images.load(paths['orm'])
    orm_tex.image.colorspace_settings.name = 'Non-Color'
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(orm_tex.outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    return mat


# ── Vehicles: every channel read straight off the high-poly's Principled
# inputs through an emission swap, so metals keep their colour, roughness and
# metalness bake exactly, and lamps get an emissive map of their own. The low
# poly may carry several material slots (hull + lamps); all share one atlas. ──

_CHANNELS = {'color': 'Base Color', 'rough': 'Roughness', 'metal': 'Metallic', 'emit': 'Emission Color'}


def _principled(mat):
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            return n
    return None


def _swap_to_emission(mats, channel):
    """Route one Principled input into an Emission shader on every material;
    returns an undo list."""
    undo = []
    for mat in mats:
        nt = mat.node_tree
        bsdf = _principled(mat)
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
        prev = out.inputs['Surface'].links[0].from_socket
        em = nt.nodes.new('ShaderNodeEmission')
        inp = bsdf.inputs[_CHANNELS[channel]]
        if inp.is_linked:
            nt.links.new(inp.links[0].from_socket, em.inputs['Color'])
        else:
            v = inp.default_value
            em.inputs['Color'].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
        em.inputs['Strength'].default_value = bsdf.inputs['Emission Strength'].default_value if channel == 'emit' else 1.0
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
        undo.append((nt, em, prev, out))
    return undo


def _restore(undo):
    for nt, em, prev, out in undo:
        nt.links.new(prev, out.inputs['Surface'])
        nt.nodes.remove(em)


def _bake_all_slots(low, high_objs, img, kind, cage, samples, margin):
    sc = bpy.context.scene
    sc.cycles.samples = samples
    sc.render.bake.use_selected_to_active = True
    sc.render.bake.cage_extrusion = cage
    sc.render.bake.max_ray_distance = cage * 3
    sc.render.bake.margin = margin
    sc.render.bake.use_pass_direct = False
    sc.render.bake.use_pass_indirect = False
    sc.render.bake.use_pass_color = True
    added = []
    for mat in low.data.materials:
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = img
        mat.node_tree.nodes.active = node
        added.append((mat, node))
    bpy.ops.object.select_all(action='DESELECT')
    for h in high_objs:
        h.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type=kind)
    for mat, node in added:
        mat.node_tree.nodes.remove(node)


def bake_pbr(low, high_objs, out_dir, name, size=1024, cage=0.08, margin=6, ao_mix=0.55):
    """Colour (with AO multiplied in by `ao_mix`), tangent normal, packed
    ORM (R AO, G roughness, B metalness) and emissive. Returns their paths."""
    os.makedirs(out_dir, exist_ok=True)
    high_mats = {s.material for h in high_objs for s in h.material_slots if s.material}
    imgs = {k: image(f'{name}-{k}' + ('-color' if k == 'emit' else ''), size) for k in ('color', 'rough', 'metal', 'emit', 'normal', 'ao')}
    for key in ('color', 'rough', 'metal', 'emit'):
        undo = _swap_to_emission(high_mats, key)
        _bake_all_slots(low, high_objs, imgs[key], 'EMIT', cage, 4, margin)
        _restore(undo)
    _bake_all_slots(low, high_objs, imgs['normal'], 'NORMAL', cage, 4, margin)
    _bake_all_slots(low, high_objs, imgs['ao'], 'AO', cage, 32, margin)

    def px(img):
        return np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4)
    ao = px(imgs['ao'])[..., 0]
    col = px(imgs['color'])
    # Byte images read back display-encoded, so the AO bite is a little firmer than linear.
    col[..., :3] *= (1 - ao_mix + ao_mix * ao)[..., None]
    imgs['color'].pixels = col.ravel().tolist()
    orm = np.ones((size, size, 4), dtype=np.float32)
    orm[..., 0] = ao
    orm[..., 1] = px(imgs['rough'])[..., 0]
    orm[..., 2] = px(imgs['metal'])[..., 0]
    packed = image(f'{name}-orm', size)
    packed.pixels = orm.ravel().tolist()
    paths = {}
    for key, img in (('color', imgs['color']), ('normal', imgs['normal']), ('orm', packed), ('emit', imgs['emit'])):
        img.filepath_raw = os.path.join(out_dir, f'{name}-{key}.png')
        img.file_format = 'PNG'
        img.save()
        paths[key] = img.filepath_raw
    return paths


def lamp_material(name, paths):
    """The second material: same atlas, plus the baked emissive map."""
    mat = export_material(name, paths)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    em = nodes.new('ShaderNodeTexImage')
    em.image = bpy.data.images.load(paths['emit'])
    em.image.colorspace_settings.name = 'sRGB'
    links.new(em.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = 1.0
    return mat
