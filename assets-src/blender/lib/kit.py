"""The modular-kit pipeline: many pieces, one file, one atlas.

Every piece is built twice by its own function (high-poly for the bake,
low-poly for the game), as the ships are. For the bake all pieces are laid
out in a row, far enough apart that no bake ray reaches a neighbour, joined
into one high and one low mesh, unwrapped together and baked once into a
shared hull + lamp atlas (`bake.bake_pbr`). The low mesh is then cut back
into its pieces, each returned to the origin under a root empty named after
it, with its moving parts split under hinge empties, its named lamp meshes,
its attachment empties and (for modules) a `<Piece>_LOD1`.

Axes as for the vehicles: front toward -Y, up +Z; the Y-up export turns
that into the game's front +Z, up +Y. Every piece's origin is the centre of
its footprint on the ground, so it is placed with a position and a yaw."""
import math
import os
import bmesh
import bpy
from mathutils import Matrix, Vector
import bake
import model
import vehicle

SPACING = 16.0  # metres between pieces during the bake


class Piece:
    """`fn(parts, mats)` adds meshes. `nodes` lists the moving or named
    parts as (id, name, pivot, parent, kind): kind 'hinge' becomes an empty
    `name` at `pivot` with the faces in a child `name_Mesh`; kind 'mesh'
    becomes a mesh node `name` (origin at `pivot`). `parent` is None (the
    piece root) or another node's name. `empties` lists (name, location,
    direction or None, parent or None) attachment points; a direction turns
    the empty so its game +Z (Blender -Y) points that way. `bake_pose`
    maps node ids to a matrix about that node's pivot: the part is baked in
    that pose (a dome open, a door up) so the insides it closes over are
    not baked black, then returned to rest."""

    def __init__(self, name, fn, *, budget, module=False, nodes=(), empties=(), width=4.0, bake_pose=None):
        self.name = name
        self.fn = fn
        self.budget = budget
        self.module = module
        self.nodes = list(nodes)
        self.empties = list(empties)
        self.width = width
        self.bake_pose = bake_pose or {}


class KitParts(vehicle.Parts):
    """Parts with a per-object UV boost: decal plates ask for more texels."""

    def add(self, obj, mat, node=0, uv_boost=1.0):
        obj['uv_boost'] = uv_boost
        return super().add(obj, mat, node)


def _offset(i):
    return Vector((i * SPACING, 0, 0))


def _join(pieces, mats, detail, only=None):
    objs = []
    for i, pc in enumerate(pieces):
        if only is not None and pc.name not in only:
            continue
        p = KitParts(detail)
        pc.fn(p, mats)
        pivots = {nid: Vector(pivot) for nid, _, pivot, _, _ in pc.nodes}
        for obj, node in p.items:
            pose = Matrix.Identity(4)
            if node in pc.bake_pose:
                pv = pivots[node]
                pose = Matrix.Translation(pv) @ pc.bake_pose[node] @ Matrix.Translation(-pv)
            obj.matrix_world = Matrix.Translation(_offset(i)) @ pose @ obj.matrix_world
            model.apply_transforms(obj)
            # One attribute at a time: adding one invalidates references to the others.
            n = len(obj.data.polygons)
            obj.data.attributes.new('node', 'INT', 'FACE').data.foreach_set('value', [i * 100 + node] * n)
            obj.data.attributes.new('uv_boost', 'FLOAT', 'FACE').data.foreach_set('value', [obj.get('uv_boost', 1.0)] * n)
            objs.append(obj)
    return model.join(objs, 'KitHigh' if detail else 'KitLow')


def _drop_bottoms(obj):
    """Faces on the ground looking down are never seen: cut them."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    dead = [f for f in bm.faces if f.normal.z < -0.95 and all(v.co.z < 0.012 for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(obj.data)
    bm.free()


def _unwrap(obj, margin):
    """Smart project, enlarge the boosted islands (decals), then pack all
    islands into one square keeping their relative sizes."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=margin, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uvl = bm.loops.layers.uv.active
    bl = bm.faces.layers.float.get('uv_boost')
    # Boosted faces are box faces (sign plates, LEDs): each is a UV island
    # of its own, so each is enlarged about its own centre.
    for f in bm.faces:
        if f[bl] > 1.0:
            c = sum((lp[uvl].uv for lp in f.loops), Vector((0, 0))) / len(f.loops)
            for lp in f.loops:
                lp[uvl].uv = c + (lp[uvl].uv - c) * f[bl]
    # Keep every island inside the first tile, or the packer files the
    # enlarged ones into a second UDIM tile and they sample the wrong texels.
    uvs = [lp[uvl].uv for f in bm.faces for lp in f.loops]
    lo = Vector((min(u.x for u in uvs), min(u.y for u in uvs)))
    span = max(max(u.x for u in uvs) - lo.x, max(u.y for u in uvs) - lo.y)
    for f in bm.faces:
        for lp in f.loops:
            lp[uvl].uv = (lp[uvl].uv - lo) / span
            lp[uvl].select = True
    bm.to_mesh(obj.data)
    bm.free()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')


def _separate(src, pred, name):
    """Split the faces whose node tag passes `pred` into a new object."""
    bpy.ops.object.select_all(action='DESELECT')
    src.select_set(True)
    bpy.context.view_layer.objects.active = src
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='FACE')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(src.data)
    layer = bm.faces.layers.int.get('node')
    for f in bm.faces:
        f.select_set(pred(f[layer]))
    bmesh.update_edit_mesh(src.data)
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    part = next(o for o in bpy.context.selected_objects if o is not src)
    part.name = name
    part.data.name = name
    return part


def _drop_attrs(obj):
    for a in ('node', 'uv_boost'):
        at = obj.data.attributes.get(a)
        if at:
            obj.data.attributes.remove(at)


def build(pieces, mats_fn, out, *, name='basekit', size=2048, cage=0.06, margin=0.003):
    """The whole loop. Returns {piece: {'roots': root, 'tris': {...}}}."""
    mats = mats_fn()
    high = _join(pieces, mats, True)
    model.shade_smooth(high, 35)
    low = _join(pieces, mats, False)
    _drop_bottoms(low)
    model.shade_smooth(low, 35)
    vehicle.two_slots(low)
    _unwrap(low, margin)
    print(f'kit: low {model.triangle_count(low)} tris, high {model.triangle_count(high)} tris')
    paths = bake.bake_pbr(low, [high], os.path.join(out, 'textures'), name, size=size, cage=cage)
    vehicle.replace_materials(low, [bake.export_material('KitHull', paths), bake.lamp_material('KitLamp', paths)])
    bpy.data.objects.remove(high, do_unlink=True)

    result = {}
    for i, pc in enumerate(pieces):
        body = _separate(low, lambda t, i=i: t // 100 == i, f'{pc.name}_Body')
        body.data.transform(Matrix.Translation(-_offset(i)))
        root = bpy.data.objects.new(pc.name, None)
        bpy.context.collection.objects.link(root)
        made = {None: (root, Vector())}
        tris = {}
        tags = {a.value for a in body.data.attributes['node'].data}
        for nid, nname, pivot, parent, kind in pc.nodes:
            assert i * 100 + nid in tags, f'{pc.name}: no faces for {nname} (tags {sorted(tags)})'
            pivot = Vector(pivot)
            mesh = vehicle.split_node(body, i * 100 + nid, nname if kind == 'mesh' else f'{nname}_Mesh', pivot)
            if nid in pc.bake_pose:
                mesh.data.transform(pc.bake_pose[nid].inverted())
            pobj, ppiv = made[parent]
            if kind == 'hinge':
                hinge = bpy.data.objects.new(nname, None)
                bpy.context.collection.objects.link(hinge)
                hinge.parent = pobj
                hinge.location = pivot - ppiv
                mesh.parent = hinge
                mesh.location = (0, 0, 0)
                made[nname] = (hinge, pivot)
            else:
                mesh.parent = pobj
                mesh.location = pivot - ppiv
                made[nname] = (mesh, pivot)
            _drop_attrs(mesh)
            tris[mesh.name] = model.triangle_count(mesh)
        _drop_attrs(body)
        body.parent = root
        tris[body.name] = model.triangle_count(body)
        total = sum(tris.values())
        print(f'{pc.name}: {total} tris {tris}')
        assert total <= pc.budget, f'{pc.name}: budget {pc.budget} triangles, got {total}'
        if pc.module:
            lod = model.decimate(body, 0.4, f'{pc.name}_LOD1')
            lod.parent = root
            tris[lod.name] = model.triangle_count(lod)
        for ename, loc, direction, parent in pc.empties:
            e = bpy.data.objects.new(ename, None)
            e.empty_display_size = 0.2
            bpy.context.collection.objects.link(e)
            pobj, ppiv = made[parent]
            e.parent = pobj
            e.location = Vector(loc) - ppiv
            if direction is not None:
                e.rotation_mode = 'QUATERNION'
                e.rotation_quaternion = Vector(direction).normalized().to_track_quat('-Y', 'Z')
        result[pc.name] = {'root': root, 'tris': tris, 'total': total, 'made': made}
    bpy.data.objects.remove(low, do_unlink=True)
    bpy.context.view_layer.update()
    return result


def export(roots, path):
    """One glTF binary holding every piece as its own root node."""
    bpy.ops.object.select_all(action='DESELECT')
    for r in roots:
        r.select_set(True)
        for c in r.children_recursive:
            c.select_set(True)
    bpy.context.view_layer.objects.active = roots[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
        export_image_format='AUTO', export_animations=False, export_skins=False, export_morph=False,
        export_lights=False, export_cameras=False, export_extras=False)
    return path


# ── Review renders: studio grey like the reference sheet, a ground that
# takes the shadows, one warm key sun and a cool fill. ──

def studio(bg=(0.2, 0.205, 0.215)):
    sc = bpy.context.scene
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (*bg, 1)
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55
    # The ground only catches shadows; the sheets composite over flat grey.
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    ground = bpy.data.objects.new('StudioGround', bpy.data.meshes.new('StudioGround'))
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4000)
    bm.to_mesh(ground.data)
    bm.free()
    gm = bpy.data.materials.new('StudioGround')
    gm.use_nodes = True
    b = gm.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[c * 1.05 for c in bg], 1)
    b.inputs['Roughness'].default_value = 0.9
    ground.data.materials.append(gm)
    ground.location.z = -0.002
    ground.is_shadow_catcher = True
    sc.collection.objects.link(ground)
    for nm, rot, e, col, ang in (('Key', (48, 0, 32), 3.4, (1, 0.96, 0.9), 3), ('Fill', (62, 0, -145), 0.9, (0.8, 0.87, 1.0), 20)):
        d = bpy.data.lights.new(nm, 'SUN')
        d.energy = e
        d.color = col
        d.angle = math.radians(ang)
        o = bpy.data.objects.new(nm, d)
        o.rotation_euler = tuple(math.radians(a) for a in rot)
        sc.collection.objects.link(o)
    return ground


def lamps_on(strength=4.0):
    for mat in bpy.data.materials:
        if mat.name.startswith('KitLamp') and mat.node_tree:
            mat.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = strength


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def camera(name='KitCam', ortho=False, lens=50):
    sc = bpy.context.scene
    data = bpy.data.cameras.new(name)
    data.type = 'ORTHO' if ortho else 'PERSP'
    data.lens = lens
    data.clip_end = 2000
    cam = bpy.data.objects.new(name, data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def aim(cam, target, az, el, dist):
    a, e = math.radians(az), math.radians(el)
    cam.location = Vector(target) + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def visible_meshes(root):
    return [o for o in root.children_recursive if o.type == 'MESH' and '_LOD' not in o.name]


def show_only(roots, keep):
    for r in roots:
        for o in [r] + list(r.children_recursive):
            if o.type == 'MESH':
                o.hide_render = (r not in keep) or ('_LOD' in o.name)


def turntable(root, out_dir, views, size=512, samples=20, lens=50):
    """Perspective views around one piece; `views` is [(label, az, el)]."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    lo, hi = bounds(visible_meshes(root))
    centre = (lo + hi) / 2
    radius = (hi - lo).length / 2
    cam = camera(lens=lens)
    fov = 2 * math.atan(18 / lens)
    dist = radius / math.sin(fov / 2) * (0.82 if hi.z - lo.z < 2 * max(hi.x - lo.x, hi.y - lo.y) else 1.0)
    paths = []
    for label, az, el in views:
        aim(cam, centre, az, el, dist)
        sc.render.filepath = os.path.join(out_dir, f'view-{label}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(sc.render.filepath)
    bpy.data.objects.remove(cam, do_unlink=True)
    return paths
