// web/scripts/experience.gltf.js
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader }   from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader }  from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader }   from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/KTX2Loader.js';

const wrap = document.getElementById('growi-wrap');
const statusEl = document.getElementById('growi-status');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0.6, 0.8, 1.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
wrap.appendChild(renderer.domElement);

// Licht
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(2.5, 4, 3);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// Boden-Schatten
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(1.2, 64),
  new THREE.ShadowMaterial({ opacity: 0.25 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.0;
controls.maxDistance = 2.4;
controls.target.set(0, 0.6, 0);

// Resize
function resize() {
  const r = wrap.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

// Loader (mit DRACO + KTX2)
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
draco.setDecoderConfig({ type: 'js' });
loader.setDRACOLoader(draco);

const ktx2 = new KTX2Loader().setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
ktx2.detectSupport(renderer);
loader.setKTX2Loader(ktx2);

// Pfad zu deinem Modell
const MODEL_URL = '/assets/3d/growi.glb';

// Vorab prüfen (liefert klare Meldung bei falschem Pfad/CORS)
fetch(MODEL_URL, { method: 'HEAD' })
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} für ${MODEL_URL}`); loadModel(); })
  .catch(err => { statusEl.textContent = 'Growi-Datei nicht gefunden: ' + err.message; console.error(err); });

function loadModel() {
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      model.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; }});
      scene.add(model);

      // Auto-Fit & Zentrierung
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.scale.setScalar((1.2 / size) * 2.2);

      statusEl?.remove();
      renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    },
    (e) => {
      const pct = e.total ? Math.round((e.loaded / e.total) * 100) : null;
      if (statusEl) statusEl.textContent = pct ? `Growi lädt… ${pct}%` : 'Growi lädt…';
    },
    (err) => {
      if (statusEl) statusEl.textContent = 'Ladefehler – Details in der Konsole.';
      console.error('GLB Load Error:', err);
    }
  );
}