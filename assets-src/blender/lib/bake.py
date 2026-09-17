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
