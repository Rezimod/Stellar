"""Markings drawn in Python: the Georgian five-cross flag and the STELLAR
wordmark. Nothing is downloaded; the flag is rectangles, the wordmark is
Blender's own text object baked in as geometry."""
import bpy
import numpy as np


def georgian_flag(name, w=256, h=170):
    """The five-cross flag as an image: white field, a full-width red cross,
    a bolnisi cross in each quarter."""
    img = np.ones((h, w, 4), dtype=np.float32)
    red = np.array([0.78, 0.05, 0.08, 1.0], dtype=np.float32)
    cw = max(2, w // 12)
    ch = max(2, h // 8)
    img[h // 2 - ch // 2:h // 2 + ch // 2, :] = red
    img[:, w // 2 - cw // 2:w // 2 + cw // 2] = red
    # A small cross with flared arms, in each quarter.
    for qx in (w // 4, 3 * w // 4):
        for qy in (h // 4, 3 * h // 4):
            arm = min(w, h) // 9
            thick = max(2, arm // 3)
            for t in range(arm):
                flare = thick + (t * thick) // arm
                img[qy - flare // 2:qy + flare // 2, qx + t:qx + t + 1] = red
                img[qy - flare // 2:qy + flare // 2, qx - t - 1:qx - t] = red
                img[qy + t:qy + t + 1, qx - flare // 2:qx + flare // 2] = red
                img[qy - t - 1:qy - t, qx - flare // 2:qx + flare // 2] = red
    tex = bpy.data.images.new(name, w, h, alpha=True)
    tex.pixels = img.ravel().tolist()
    tex.pack()
    return tex


def wordmark(text, size, location, rotation, extrude=0.004, name='Wordmark'):
    """Raised lettering as a mesh, for the high-poly bake."""
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = text
    curve.size = size
    curve.extrude = extrude
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.resolution_u = 4
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return obj
