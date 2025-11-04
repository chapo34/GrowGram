GrowGram 3D Assets — README
===========================

Pfad: web/assets/3d/

Erforderlich:
- mascot.glb  (glTF 2.0 Binary, wird von /scripts/experience.gltf.js geladen)

Optional:
- mascot.blend  (Blender-Quelle; Änderungen hier → export als mascot.glb)
- env.hdr       (32-bit HDRI, equirectangular; für scene.environment in Three.js)
- .keep         (nur für Git, kann gelöscht werden sobald Dateien existieren)

Namenskonventionen (wichtig für Web-Features):
- Objects: Body, Hoodie, Scarf, Eyes, Mouth, Hair, Lashes
- Materials: matBody, matHoodie, matScarf, matEye, matMouth, matHair, matLashes
- Animationen (optional): Idle (48f @24fps), Wave (36f)

Blender → Export (glTF 2.0 .glb):
- File → Export → glTF 2.0 (.glb)
- glTF Binary (.glb), Apply Modifiers, +Animations (falls vorhanden)
- Include: Selected Objects (oder alle sichtbaren)
- Images: Automatic (Embed)
- Ziel: web/assets/3d/mascot.glb

Schnelltests:
- Lokal: ls -lh web/assets/3d/mascot.glb  (# >100 KB)
- Nach Deploy: curl -I https://<hosting>/assets/3d/mascot.glb  (# 200)