"""The vehicle pipeline shared by the ships: one build function makes the
high-poly (for the bake) and the low-poly (for the game) from the same
parts; the low-poly is baked to one atlas with a hull slot and a lamp slot,
split back into its moving nodes (wings, gear), given LODs and named
attachment empties, exported, and rendered from the reference's views."""
import math
import os
import bmesh
import bpy
from mathutils import Matrix, Vector
import bake
import model
import scene
import uv


class Parts:
    """What a build pass collects: meshes tagged with the node they belong
    to (0 is the body), each carrying its own procedural material."""

    def __init__(self, detail):
        self.detail = detail
        self.items = []

    def add(self, obj, mat, node=0):
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
        self.items.append((obj, node))
        return obj

    @property
    def seg(self):
        return 3 if self.detail else 1


def is_lamp(mat):
    bsdf = bake._principled(mat)
    s = bsdf.inputs['Emission Strength']
    return (s.default_value > 0 and (bsdf.inputs['Emission Color'].is_linked or any(bsdf.inputs['Emission Color'].default_value[:3]))) if bsdf else False


def _tag(obj, node):
    attr = obj.data.attributes.get('node') or obj.data.attributes.new('node', 'INT', 'FACE')
    for i in range(len(obj.data.polygons)):
        attr.data[i].value = node


def join_parts(parts, name):
    objs = []
    for obj, node in parts.items:
        model.apply_transforms(obj)
        _tag(obj, node)
        objs.append(obj)
    return model.join(objs, name)


def two_slots(low):
    """Hull (slot 0) and lamps (slot 1): every procedural material collapses
    into one of the two bake targets."""
    lamp = [is_lamp(s.material) for s in low.material_slots]
    idx = [1 if lamp[p.material_index] else 0 for p in low.data.polygons]
    targets = []
    for n in ('BakeHull', 'BakeLamp'):
        m = bpy.data.materials.new(n)
        m.use_nodes = True
        targets.append(m)
    replace_materials(low, targets, idx)


def replace_materials(obj, mats, idx=None):
    """Swap an object's material list; clearing it resets every face to
    slot 0, so the face assignment is carried across."""
    idx = idx if idx is not None else [p.material_index for p in obj.data.polygons]
    obj.data.materials.clear()
    for m in mats:
        obj.data.materials.append(m)
    for p, i in zip(obj.data.polygons, idx):
        p.material_index = i


def split_node(low, node, name, pivot):
    """Separate the faces tagged `node` into their own object whose origin
    sits at `pivot` (a wing's hinge, the gear's mount)."""
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='FACE')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(low.data)
    layer = bm.faces.layers.int.get('node')
    for f in bm.faces:
        if f[layer] == node:
            f.select_set(True)
    bmesh.update_edit_mesh(low.data)
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    part = next(o for o in bpy.context.selected_objects if o is not low)
    part.name = name
    part.data.name = name
    bpy.context.scene.cursor.location = Vector(pivot)
    bpy.ops.object.select_all(action='DESELECT')
    part.select_set(True)
    bpy.context.view_layer.objects.active = part
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return part


def drop_attr(obj):
    a = obj.data.attributes.get('node')
    if a:
        obj.data.attributes.remove(a)


def tris(obj):
    return model.triangle_count(obj)


def build(name, build_fn, out, renders, *, nodes=(), empties_fn=None, budget=25000, size=1024,
          cage=0.08, views=None, uv_margin=0.004, lod=True, pose_fn=None):
    """Run the whole loop. `build_fn(parts)` adds meshes to a Parts; `nodes`
    lists (id, name, pivot) for moving parts; `empties_fn(root, objs)` adds
    the attachment empties; `pose_fn(objs)` poses the moving parts for the
    renders only (after export). Returns the triangle counts.
    With `out == 'preview'` it skips the bake: the low-poly triangle count,
    then the high-poly in its procedural paint rendered into `renders`."""
    if out == 'preview':
        lo = Parts(False)
        build_fn(lo)
        low = join_parts(lo, f'{name}Low')
        print(f'{name} preview: low-poly {tris(low)} tris', flush=True)
        bpy.data.objects.remove(low, do_unlink=True)
        hi = Parts(True)
        build_fn(hi)
        high = join_parts(hi, f'{name}High')
        model.shade_smooth(high, 35)
        root = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(root)
        high.parent = root
        if empties_fn:
            empties_fn(root, {})
        render_views(root, renders, views, size=900, samples=24)
        return {'low': 0}
    hi = Parts(True)
    build_fn(hi)
    high = join_parts(hi, f'{name}High')
    model.shade_smooth(high, 35)

    lo = Parts(False)
    build_fn(lo)
    low = join_parts(lo, name)
    model.shade_smooth(low, 35)
    two_slots(low)
    uv.smart_unwrap(low, angle_deg=62, margin=uv_margin)
    counts = {'low': tris(low), 'high': tris(high)}
    print(f'{name}: low-poly {counts["low"]} tris, high-poly {counts["high"]} tris')
    assert counts['low'] <= budget, f'{name}: budget is {budget} triangles, got {counts["low"]}'

    paths = bake.bake_pbr(low, [high], os.path.join(out, 'textures'), name.lower(), size=size, cage=cage)
    replace_materials(low, [bake.export_material(f'{name}Hull', paths), bake.lamp_material(f'{name}Lamp', paths)])
    bpy.data.objects.remove(high, do_unlink=True)

    # The moving parts leave the body, keeping the shared atlas. Every mesh
    # ends up a leaf: the moving ones hang under a clean hinge empty, and the
    # LODs are the body's siblings, because mesh quantisation rewrites a mesh
    # node's transform and would drag any children with it.
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    objs, meshes = {}, {}
    for nid, nname, pivot in nodes:
        mesh = split_node(low, nid, f'{nname}_Mesh', pivot)
        hinge = bpy.data.objects.new(nname, None)
        bpy.context.collection.objects.link(hinge)
        hinge.location = pivot
        hinge.parent = root
        mesh.parent = hinge
        mesh.location = (0, 0, 0)
        objs[nname], meshes[nname] = hinge, mesh
    drop_attr(low)
    for o in meshes.values():
        drop_attr(o)
    low.name = f'{name}_Body'
    low.parent = root
    lods = []
    if lod:
        for ratio, suffix in ((0.4, 'LOD1'), (0.12, 'LOD2')):
            l = model.decimate(low, ratio, f'{name}_Body_{suffix}')
            l.parent = root
            lods.append(l)
    bpy.context.view_layer.update()
    if empties_fn:
        empties_fn(root, objs)
    scene.export_glb(root, os.path.join(out, f'{name.lower()}.glb'))
    for l in lods:
        bpy.data.objects.remove(l, do_unlink=True)
    counts['body'] = tris(low)
    counts['nodes'] = {k: tris(o) for k, o in meshes.items()}
    counts['total'] = counts['body'] + sum(counts['nodes'].values())
    print(f'{name}: exported, {counts}')
    if renders:
        if pose_fn:
            pose_fn(objs)
        bpy.context.view_layer.update()
        render_views(root, renders, views)
    return counts


# The reference sheet's views, as (label, azimuth°, elevation°). Azimuth 0
# looks at the nose (camera on -Y), 90 at the port side (+X).
VIEWS = [
    ('front', 0, 4), ('back', 180, 4), ('left', 90, 2), ('right', -90, 2),
    ('top', 0, 89.5), ('bottom', 0, -89.5), ('three-quarter', 38, 24), ('rear-three-quarter', 150, 20),
]


def render_views(root, out_dir, views=None, size=560, samples=28):
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    meshes = [o for o in root.children_recursive if o.type == 'MESH' and '_LOD' not in o.name]
    pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2
    radius = (hi - lo).length / 2
    cam_data = bpy.data.cameras.new('ViewCam')
    cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('ViewCam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    # A key sun, a cool rim from behind and a soft fill: studio sheet light.
    for nm, rot, e, col in (('Key', (52, 0, 35), 3.2, (1, 0.97, 0.92)), ('Rim', (-60, 0, 200), 2.5, (0.75, 0.85, 1.0)), ('Fill', (70, 0, -120), 1.0, (0.9, 0.92, 1.0))):
        d = bpy.data.lights.new(nm, 'SUN')
        d.energy = e
        d.color = col
        d.angle = math.radians(2)
        o = bpy.data.objects.new(nm, d)
        o.rotation_euler = tuple(math.radians(a) for a in rot)
        sc.collection.objects.link(o)
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.055, 0.065, 1)
    dist = radius * 3
    # Stand-in hot cores at the engine empties (the game draws its own).
    core = bpy.data.materials.new('PreviewCore')
    core.use_nodes = True
    b = core.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (1, 0.6, 0.25, 1)
    b.inputs['Emission Color'].default_value = (1, 0.55, 0.2, 1)
    b.inputs['Emission Strength'].default_value = 6.0
    for o in root.children_recursive:
        if o.type == 'EMPTY' and o.name.startswith('Engine_'):
            r = o.matrix_world.to_scale().x
            disc = bpy.data.objects.new('PreviewCore', bpy.data.meshes.new('PreviewCore'))
            sc.collection.objects.link(disc)
            bm = bmesh.new()
            bmesh.ops.create_circle(bm, cap_ends=True, segments=24, radius=r)
            bm.to_mesh(disc.data)
            bm.free()
            disc.data.materials.append(core)
            disc.matrix_world = o.matrix_world.normalized() @ Matrix.Rotation(-math.pi / 2, 4, 'X')
            disc.location = o.matrix_world.translation + Vector((0, 0.02, 0))
    paths = []
    for label, az, el in (views or VIEWS):
        a, e = math.radians(az), math.radians(el)
        cam.location = centre + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
        f = (centre - cam.location).normalized()
        # Straight up or down, the nose still points left, as on the sheet.
        up = Vector((0, 0, 1)) if abs(f.z) < 0.99 else Vector((-1 if f.z < 0 else 1, 0, 0))
        r = f.cross(up).normalized()
        u = r.cross(f)
        cam.rotation_euler = Matrix((r, u, -f)).transposed().to_euler()
        # Fit the frame to the ship as seen from here.
        xs = [(q - centre).dot(r) for q in pts]
        ys = [(q - centre).dot(u) for q in pts]
        cam_data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) * 1.08
        cam.location += r * (max(xs) + min(xs)) / 2 + u * (max(ys) + min(ys)) / 2
        sc.render.filepath = os.path.join(out_dir, f'view-{label}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(sc.render.filepath)
    return paths
