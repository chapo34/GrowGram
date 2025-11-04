# pyright: reportMissingImports=false, reportMissingModuleSource=false
# Blender 4.5+ | Eevee Next
# Erzeugt Growi (Hoodie, Schal, Augen, Blättchen) und exportiert .glb + .blend
import bpy
import math
import sys
import os

# ---------------- CLI-Argumente ----------------
OUT_BLEND = "web/assets/3d/mascot.blend"
OUT_GLB   = "web/assets/3d/mascot.glb"

argv = sys.argv
if "--" in argv:
    i = argv.index("--") + 1
    for a in argv[i:]:
        if a.startswith("--outBlend="):
            OUT_BLEND = a.split("=",1)[1]
        if a.startswith("--outGlb="):
            OUT_GLB = a.split("=",1)[1]

# ---------------- Helper ----------------
def hex_to_rgb01(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2],16)/255.0 for i in (0,2,4))

def new_mat(name, hex_color, rough=0.45, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in nt.nodes:
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (-200,0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    col = hex_to_rgb01(hex_color)
    # Principled-Eigenschaften robust setzen
    try: bsdf.inputs["Base Color"].default_value = (col[0], col[1], col[2], 1.0)
    except: pass
    try: bsdf.inputs["Roughness"].default_value = rough
    except: pass
    try: bsdf.inputs["Specular"].default_value = spec
    except: pass
    return m

def activate(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

def deselect_all():
    for o in bpy.context.selected_objects:
        o.select_set(False)

def shade_smooth(obj, auto_smooth=True, angle=math.radians(60)):
    activate(obj)
    bpy.ops.object.shade_smooth()
    try:
        obj.data.use_auto_smooth = auto_smooth
        obj.data.auto_smooth_angle = angle
    except:
        pass

def add_uv_sphere(name, radius=1.0, location=(0,0,0), scale=(1,1,1)):
    deselect_all()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=radius, location=location)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    shade_smooth(o)
    return o

def add_cylinder(name, radius=0.1, depth=0.2, location=(0,0,0), rotation=(0,0,0), scale=(1,1,1)):
    deselect_all()
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=location, rotation=rotation)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    shade_smooth(o)
    return o

def add_torus(name, major=0.3, minor=0.06, location=(0,0,0), rotation=(0,0,0)):
    deselect_all()
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, abso_major_rad=1.25, abso_minor_rad=0.75, location=location, rotation=rotation, major_segments=64, minor_segments=32)
    o = bpy.context.active_object
    o.name = name
    shade_smooth(o)
    return o

def add_cube(name, size=1.0, location=(0,0,0), scale=(1,1,1), rotation=(0,0,0)):
    deselect_all()
    bpy.ops.mesh.primitive_cube_add(size=size, location=location, rotation=rotation)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    return o

def ensure_collection(name="Growi"):
    coll = bpy.data.collections.get(name)
    if not coll:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll

def link_to(coll, *objects):
    for o in objects:
        if o.name not in coll.objects:
            coll.objects.link(o)

def add_solidify(obj, thickness=0.02):
    mod = obj.modifiers.new(name="GG_Solidify", type='SOLIDIFY')
    mod.thickness = thickness
    mod.offset = 1.0
    return mod

def add_boolean(obj, target, op='DIFFERENCE'):
    mod = obj.modifiers.new(name="GG_Bool", type='BOOLEAN')
    mod.operation = op
    mod.solver = 'FAST'
    mod.object = target
    return mod

# ---------------- Szene säubern ----------------
bpy.ops.wm.read_homefile(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'

# Neutrales World-Setup (robust)
if not bpy.data.worlds:
    world = bpy.data.worlds.new("GGWorld")
else:
    world = bpy.data.worlds[0]
scene.world = world
try:
    world.color = (0.02, 0.02, 0.025)
except:
    pass

# ---------------- Materialien ----------------
MAT_GREEN   = new_mat("GG_Green",   "#4CAF50", rough=0.33, spec=0.5)
MAT_OFFWHITE= new_mat("GG_OffWhite","#F1EDE3", rough=0.58, spec=0.35)
MAT_ORANGE  = new_mat("GG_Orange",  "#FF8A00", rough=0.45, spec=0.35)
MAT_BLACK   = new_mat("GG_Black",   "#121212", rough=0.4,  spec=0.2)
MAT_WHITE   = new_mat("GG_White",   "#FFFFFF", rough=0.1,  spec=0.4)

# ---------------- Modellieren ----------------
growi = ensure_collection("Growi")

# Körper
body = add_uv_sphere("Body", radius=0.38, location=(0,0,0.26), scale=(0.65, 0.52, 0.85))
body.data.materials.append(MAT_OFFWHITE)

# Kopf
head = add_uv_sphere("Head", radius=0.34, location=(0,0,0.72), scale=(0.90,0.90,0.88))
head.data.materials.append(MAT_GREEN)

# Kapuze (Hoodie-Schale)
hood_shell = add_uv_sphere("HoodShell", radius=0.36, location=head.location, scale=(1.06,1.06,1.08))
hood_shell.data.materials.append(MAT_OFFWHITE)
add_solidify(hood_shell, thickness=0.02)

# Kapuzenöffnung ausschneiden (Boolean)
cut = add_cube("HoodCut",
               size=1.0,
               location=(0, 0.10, 0.75),
               scale=(0.55, 0.55, 0.55),
               rotation=(math.radians(0),0,0))
# etwas breiter schneiden
cut.scale[0] = 0.70
cut.scale[2] = 0.62

bool_mod = add_boolean(hood_shell, cut, 'DIFFERENCE')
# Anwenden (damit exporter keine Abhängigkeiten hat)
activate(hood_shell)
bpy.ops.object.modifier_apply(modifier=bool_mod.name)
# Cutter löschen
bpy.data.objects.remove(cut, do_unlink=True)

# Schal (Torus + Knoten)
scarf = add_torus("Scarf", major=0.33, minor=0.055, location=(0,0.02,0.52), rotation=(math.radians(90),0,0))
scarf.data.materials.append(MAT_ORANGE)
knot1 = add_uv_sphere("ScarfKnotL", radius=0.06, location=(-0.05,0.07,0.49))
knot1.data.materials.append(MAT_ORANGE)
knot2 = add_uv_sphere("ScarfKnotR", radius=0.06, location=( 0.05,0.07,0.49))
knot2.data.materials.append(MAT_ORANGE)

# Arme + Hände
armR = add_cylinder("ArmR", radius=0.06, depth=0.22,
                    location=(0.32, 0.0, 0.50),
                    rotation=(0,0,math.radians(8)))
armR.data.materials.append(MAT_OFFWHITE)
handR= add_uv_sphere("HandR", radius=0.07, location=(0.42, 0.02, 0.49))
handR.data.materials.append(MAT_GREEN)

armL = add_cylinder("ArmL", radius=0.06, depth=0.22,
                    location=(-0.32, 0.0, 0.50),
                    rotation=(0,0,math.radians(-8)))
armL.data.materials.append(MAT_OFFWHITE)
handL= add_uv_sphere("HandL", radius=0.07, location=(-0.42, 0.02, 0.49))
handL.data.materials.append(MAT_GREEN)

# Beine + Füße
legR = add_cylinder("LegR", radius=0.08, depth=0.24, location=(0.12,0.0,0.13))
legR.data.materials.append(MAT_GREEN)
footR= add_uv_sphere("FootR", radius=0.10, location=(0.12,0.0,0.01))
footR.data.materials.append(MAT_GREEN)

legL = add_cylinder("LegL", radius=0.08, depth=0.24, location=(-0.12,0.0,0.13))
legL.data.materials.append(MAT_GREEN)
footL= add_uv_sphere("FootL", radius=0.10, location=(-0.12,0.0,0.01))
footL.data.materials.append(MAT_GREEN)

# Blättchen oben
stem = add_cylinder("Stem", radius=0.02, depth=0.20, location=(0,0,0.98), rotation=(math.radians(90),0,0))
stem.data.materials.append(MAT_GREEN)
leafL = add_uv_sphere("LeafL", radius=0.11, location=(-0.08,0.03,1.06), scale=(0.45,0.20,0.65))
leafL.data.materials.append(MAT_GREEN)
leafR = add_uv_sphere("LeafR", radius=0.11, location=( 0.08,0.03,1.06), scale=(0.45,0.20,0.65))
leafR.data.materials.append(MAT_GREEN)

# Gesicht: Augen + Highlights + Mund
eyeR = add_uv_sphere("EyeR", radius=0.045, location=(0.12, 0.31, 0.74))
eyeR.data.materials.append(MAT_BLACK)
eyeL = add_uv_sphere("EyeL", radius=0.045, location=(-0.12, 0.31, 0.74))
eyeL.data.materials.append(MAT_BLACK)

hlR = add_uv_sphere("EyeHL_R", radius=0.015, location=(0.14,0.33,0.76))
hlR.data.materials.append(MAT_WHITE)
hlL = add_uv_sphere("EyeHL_L", radius=0.015, location=(-0.10,0.33,0.76))
hlL.data.materials.append(MAT_WHITE)

mouth = add_cylinder("Mouth", radius=0.020, depth=0.008, location=(0,0.33,0.63), rotation=(math.radians(90),0,0))
mouth.scale.x = 2.2
mouth.data.materials.append(MAT_BLACK)

# Glätten/Modifiers leicht
for o in [body, head, hood_shell, armL, armR, legL, legR, footL, footR, stem, leafL, leafR, scarf, knot1, knot2]:
    shade_smooth(o)

# alles in Sammlung einsortieren
link_to(growi, body, head, hood_shell, armL, armR, handL, handR, legL, legR, footL, footR, stem, leafL, leafR, eyeL, eyeR, hlL, hlR, mouth, scarf, knot1, knot2)

# leichte Positionierung der Kamera (nur falls jemand im .blend schaut)
deselect_all()
if not bpy.data.cameras:
    bpy.ops.object.camera_add(location=(0, -3.5, 1.5), rotation=(math.radians(75), 0, 0))
cam = bpy.context.active_object
scene.camera = cam

# ---------------- Export ----------------
# Sicherstellen, dass Export-Verzeichnisse existieren
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)

# .blend speichern
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT_BLEND))

# glTF/GLB Export
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT_GLB),
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
    export_colors=True,
    export_cameras=False,
    export_lights=False
)

print("[GG] Export done ->", OUT_GLB)