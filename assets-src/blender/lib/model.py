"""Modelling helpers: real operations the code-built meshes never had."""
import bmesh
import bpy
from mathutils import Vector


def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def box(name, size, location=(0, 0, 0)):
    """A cube scaled to `size` (x, y, z metres), origin at its centre."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = location
    return obj


def cylinder(name, radius, depth, segments=16, location=(0, 0, 0), rotation=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def bevel(obj, width, segments=2, angle_deg=30):
    """Bevel every hard edge; applied at once so later booleans see it."""
    mod = obj.modifiers.new('Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = angle_deg * 3.14159 / 180
    mod.harden_normals = False
    apply_modifier(obj, mod)
    return obj


def boolean(obj, cutter, op='DIFFERENCE', keep=False):
    mod = obj.modifiers.new('Bool', 'BOOLEAN')
    mod.operation = op
    mod.object = cutter
    mod.solver = 'EXACT'
    apply_modifier(obj, mod)
    if not keep:
        bpy.data.objects.remove(cutter, do_unlink=True)
    return obj


def subdivide(obj, levels=2):
    mod = obj.modifiers.new('Subd', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    apply_modifier(obj, mod)
    return obj


def apply_modifier(obj, mod):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objs, name):
    """One object out of several; the first is the host."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def apply_transforms(obj):
    """Bake the object's transform into its vertices: the file's origin is the world origin."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def duplicate(obj, name):
    copy = obj.copy()
    copy.data = obj.data.copy()
    copy.name = name
    return link(copy)


def shade_smooth(obj, angle_deg=40):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth_by_angle(angle=angle_deg * 3.14159 / 180)
    return obj


def triangle_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def decimate(obj, ratio, name):
    lod = duplicate(obj, name)
    mod = lod.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = ratio
    apply_modifier(lod, mod)
    return lod
