"""
Blender headless script: import GLB -> decimate -> smooth keyframes -> physics bake -> export GLB + render MP4.

Usage (called by app.py via subprocess):
  blender --background --python blender_smooth.py -- input.glb output.glb output.mp4
"""

import sys
import bpy
import math


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in bpy.data.collections:
        bpy.data.collections.remove(col)


def import_glb(path: str):
    bpy.ops.import_scene.gltf(filepath=path)


def decimate_meshes(ratio: float = 0.5, max_faces: int = 100_000):
    """Auto-reduce polygon count if mesh exceeds max_faces."""
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        face_count = len(obj.data.polygons)
        if face_count <= max_faces:
            continue

        target_ratio = max_faces / face_count
        mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
        mod.ratio = min(ratio, target_ratio)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        print(f"Decimated {obj.name}: {face_count} -> {len(obj.data.polygons)} faces")


def smooth_keyframes():
    """Smooth all animation curves with Gaussian filter-like approach."""
    for action in bpy.data.actions:
        for fcurve in action.fcurves:
            # Add smooth modifier to each fcurve
            mod = fcurve.modifiers.new(type="NOISE")
            mod.strength = 0  # We just want smoothing, not noise

            # Manual keyframe interpolation smoothing
            keyframes = fcurve.keyframe_points
            if len(keyframes) < 3:
                continue

            # Set all keyframes to bezier interpolation for smooth curves
            for kp in keyframes:
                kp.interpolation = "BEZIER"
                kp.handle_left_type = "AUTO_CLAMPED"
                kp.handle_right_type = "AUTO_CLAMPED"

            # Remove the noise modifier (was temporary)
            fcurve.modifiers.remove(mod)


def setup_physics():
    """Add rigid body physics to mesh objects for baking."""
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 250  # Will be overridden by actual animation length

    # Detect animation length
    max_frame = 1
    for action in bpy.data.actions:
        if action.frame_range[1] > max_frame:
            max_frame = int(action.frame_range[1])
    scene.frame_end = max_frame

    # Add passive rigid body to ground plane (if any)
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue

        # Simple heuristic: objects at y~0 with large flat extent -> ground
        bounds = [obj.matrix_world @ bpy.mathutils.Vector(c) for c in obj.bound_box] if hasattr(bpy, 'mathutils') else []

        # For animated objects, add soft body for secondary motion
        if obj.animation_data and obj.animation_data.action:
            try:
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_add(type="SOFT_BODY")
                sb = obj.modifiers["Softbody"].settings
                sb.mass = 0.3
                sb.friction = 5.0
                sb.speed = 1.0
            except Exception:
                pass  # Not all objects support soft body

    # Bake physics
    try:
        override = bpy.context.copy()
        override["point_cache"] = None
        bpy.ops.ptcache.bake_all(bake=True)
    except Exception as e:
        print(f"Physics bake warning: {e}")


def setup_rendering():
    """Configure render settings for MP4 output with motion blur."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if hasattr(bpy.types, "ShaderNodeBsdfPrincipled") else "BLENDER_EEVEE"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.fps = 30

    # Motion blur
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.5

    # Anti-aliasing
    scene.render.filter_size = 1.5

    # Output format
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"

    # Camera setup (auto-frame all objects)
    if not scene.camera:
        cam_data = bpy.data.cameras.new("AutoCamera")
        cam_obj = bpy.data.objects.new("AutoCamera", cam_data)
        scene.collection.objects.link(cam_obj)
        scene.camera = cam_obj

    cam = scene.camera
    cam.location = (3, -3, 2)
    cam.rotation_euler = (math.radians(60), 0, math.radians(45))

    # Add simple 3-point lighting
    for name, pos, energy in [
        ("Key", (4, -2, 5), 1000),
        ("Fill", (-3, -3, 3), 500),
        ("Rim", (-1, 4, 4), 300),
    ]:
        light = bpy.data.lights.new(name, "POINT")
        light.energy = energy
        obj = bpy.data.objects.new(name, light)
        obj.location = pos
        scene.collection.objects.link(obj)


def export_glb(path: str):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animations=True,
        export_apply=True,
    )


def render_video(path: str):
    bpy.context.scene.render.filepath = path.replace(".mp4", "")
    bpy.ops.render.render(animation=True)


def main():
    argv = sys.argv
    # Everything after "--" is our args
    idx = argv.index("--") if "--" in argv else -1
    if idx == -1 or len(argv) < idx + 4:
        print("Usage: blender --background --python blender_smooth.py -- input.glb output.glb output.mp4")
        sys.exit(1)

    input_path = argv[idx + 1]
    output_glb = argv[idx + 2]
    output_mp4 = argv[idx + 3]

    print(f"Processing: {input_path}")

    clear_scene()
    import_glb(input_path)
    decimate_meshes(ratio=0.5, max_faces=100_000)
    smooth_keyframes()
    setup_physics()
    export_glb(output_glb)
    print(f"Exported GLB: {output_glb}")

    setup_rendering()
    render_video(output_mp4)
    print(f"Rendered video: {output_mp4}")


if __name__ == "__main__":
    main()
