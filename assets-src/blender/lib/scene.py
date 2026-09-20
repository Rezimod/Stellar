"""Scene setup, export and turntable renders for headless Blender 4.5."""
import math
import os
import bpy


def reset(seed=1):
    """An empty metric scene with Cycles on the CPU and a fixed seed."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.seed = seed
    sc.cycles.use_animated_seed = False
    sc.cycles.samples = 32
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.world = bpy.data.worlds.new('World')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.02, 0.025, 0.04, 1)
    bg.inputs['Strength'].default_value = 1.0
    return sc


def sun(rotation=(math.radians(52), 0, math.radians(35)), strength=4.5):
    """One hard sun: airless-world lighting for the turntable."""
    data = bpy.data.lights.new('Sun', 'SUN')
    data.energy = strength
    data.angle = math.radians(0.53)
    obj = bpy.data.objects.new('Sun', data)
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    return obj


def look_at(obj, target):
    d = target - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def turntable(obj, out_dir, size=512, angles=8, distance=None, elevation=0.28):
    """Eight views around the object, lit by a sun, written as PNGs."""
    from mathutils import Vector
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.cycles.samples = 48
    sc.render.film_transparent = True
    bbox = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    centre = sum(bbox, Vector()) / 8
    radius = max((p - centre).length for p in bbox)
    cam_data = bpy.data.cameras.new('TurnCam')
    cam_data.lens = 50
    cam = bpy.data.objects.new('TurnCam', cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    dist = distance or radius * 3.1
    paths = []
    for i in range(angles):
        a = i * 2 * math.pi / angles
        cam.location = centre + Vector((math.sin(a) * dist, -math.cos(a) * dist, dist * elevation))
        look_at(cam, centre)
        sc.render.filepath = os.path.join(out_dir, f'view-{i:02d}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(sc.render.filepath)
    return paths


def export_glb(obj, path):
    """glTF binary of one object, Y-up, with its baked textures embedded."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    for child in obj.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = obj
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
        export_extras=False,
    )
    return path
