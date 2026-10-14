import bpy, sys
# usage: blender -b -P fbx2glb.py -- out.glb base.fbx:clip [extra.fbx:clip ...]
args = sys.argv[sys.argv.index('--') + 1:]
out, specs = args[0], [a.rsplit(':', 1) for a in args[1:]]
bpy.ops.wm.read_factory_settings(use_empty=True)

def arm_of(objs):
    return next(o for o in objs if o.type == 'ARMATURE')

arm = None
for i, (path, clip) in enumerate(specs):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    a = arm_of(new)
    act = a.animation_data.action
    act.name = clip
    act.use_fake_user = True
    if i == 0:
        arm = a
    else:
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
    print('clip', clip, 'frames', tuple(act.frame_range))

for m in list(bpy.data.meshes):
    if m.users == 0:
        bpy.data.meshes.remove(m)

# put every clip on its own NLA track so the exporter emits them all
ad = arm.animation_data
first = ad.action
for act in bpy.data.actions:
    tr = ad.nla_tracks.new(); tr.name = act.name
    tr.strips.new(act.name, int(act.frame_range[0]), act)
ad.action = None

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB',
    export_animation_mode='NLA_TRACKS', export_force_sampling=True,
    export_apply=False, export_yup=True)
print('wrote', out)
