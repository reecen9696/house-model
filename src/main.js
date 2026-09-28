import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import SunCalc from 'suncalc';
import { buildNeighbours } from '../context/neighbours.js';
import { buildHouse, L } from './generator.js';

const spec = await (await fetch('./spec.json')).json();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe3f5);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
// default view: front three-quarter from the north-west, aimed at the middle of the house, pulled back on tall screens
const HOME_DIR = L(11, -13, 11).sub(L(3.3, 11, 1.5));
camera.position.copy(L(3.3, 11, 1.5)).add(HOME_DIR.clone().multiplyScalar(innerWidth / innerHeight < 0.7 ? 1.25 : 1));
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(L(3.3, 11, 1.5));
controls.rotateSpeed = 1.2; controls.zoomSpeed = 1.15; controls.panSpeed = 1.1;
controls.enableDamping = true; controls.dampingFactor = 0.06;   // glide to a stop instead of halting
controls.maxPolarAngle = Math.PI * 0.49;                          // never swing under the ground
controls.update();
const HOME = { pos: camera.position.clone(), target: controls.target.clone() };

// --- house -----------------------------------------------------------------
const G = buildHouse(spec);
const house = new THREE.Group();
for (const k of Object.keys(G)) house.add(G[k]);
scene.add(house);

// --- context: modelled neighbours and street (clean geometry sized from the Google mesh) ---
const nb = new THREE.Group();
scene.add(nb);
const trees = new THREE.Group();   // modelled street trees, shown with either context layer
scene.add(trees);
buildNeighbours().then(r => { nb.add(r.group); trees.add(r.trees); ctx.add(r.underlay); }).catch(err => console.error('neighbours', err));
// --- the Google photo mesh itself, own lot cut out. 12 MB, so it only loads when first shown --------
const ctx = new THREE.Group();
let ctxLoaded = false;
function loadPhotoMesh() {
  if (ctxLoaded) return; ctxLoaded = true;
  const c = spec.site.context_mesh, th = THREE.MathUtils.degToRad(spec.site.bearing_deg - 180);
  const inner = new THREE.Group();
  inner.position.set(-c.origin_e, -c.ffl_on_mesh_datum, c.origin_n);
  const rot = new THREE.Group(); rot.rotation.y = th;   // the mesh is in ENU; the underlay beside it is in the lot frame
  rot.add(inner); ctx.add(rot);
  new GLTFLoader().load(c.file, gltf => {
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      // exported materials carry a 0.4 grey base factor; use the photo texture at full brightness, lit so it takes shadows
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();   // exporter wrote no normals
      const map = o.material.map;
      o.material = new THREE.MeshLambertMaterial({ map, color: 0xffffff, side: THREE.DoubleSide });
      o.castShadow = true; o.receiveShadow = true;
    });
    inner.add(gltf.scene);
  });
}
scene.add(ctx);
// flat ground far out, for when neither context layer is shown
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xb9b5aa }));
ground.rotation.x = -Math.PI / 2; ground.position.y = spec.site.ground_z - 0.05; ground.receiveShadow = true; ground.visible = false;
scene.add(ground);

// --- lights ------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x8a7e6c, 0.75));
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
// two soft fills from different directions (no shadows) so walls facing different ways read as different tones indoors
const fillA = new THREE.DirectionalLight(0xfff4e6, 0.55); fillA.position.set(0.6, 0.8, 0.35); scene.add(fillA);
const fillB = new THREE.DirectionalLight(0xe8eeff, 0.3); fillB.position.set(-0.5, 0.4, -0.8); scene.add(fillB);
const sun = new THREE.DirectionalLight(0xfff7ec, 2.2);
sun.castShadow = true;
const touch = matchMedia('(pointer: coarse)').matches;
sun.shadow.mapSize.set(touch ? 2048 : 4096, touch ? 2048 : 4096);
const sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 50; sc.far = 450;
// A large depth bias detached shadows by ~20 cm, leaking sun under doors and walls.
sun.shadow.bias = -0.00001;
sun.shadow.normalBias = 0.002;
sun.target.position.copy(L(3.5, 14, 0));
scene.add(sun, sun.target);

function sunDirection(date) {
  const { azimuth, altitude } = SunCalc.getPosition(date, spec.site.lat, spec.site.lon);
  const bearing = azimuth + Math.PI;                  // suncalc: 0 = south, positive west -> compass bearing
  const e = Math.sin(bearing) * Math.cos(altitude), n = Math.cos(bearing) * Math.cos(altitude), u = Math.sin(altitude);
  const th = THREE.MathUtils.degToRad(spec.site.bearing_deg - 180);
  return { v: new THREE.Vector3(e * Math.cos(th) - n * Math.sin(th), u, -e * Math.sin(th) - n * Math.cos(th)), altitude };
}
function setSun(date) {
  const { v, altitude } = sunDirection(date);
  sun.position.copy(sun.target.position).addScaledVector(v, 250);   // far enough that distant neighbours still land inside the shadow camera
  sun.intensity = altitude > 0 ? 2.2 * Math.min(1, altitude / 0.2) : 0;
  const si = document.getElementById('sunInfo');
  if (si) si.textContent = altitude > 0 ? `sun ${(altitude * 180 / Math.PI).toFixed(0)}° up` : 'sun below horizon';
}

// --- UI -----------------------------------------------------------------------
const $ = id => document.getElementById(id);
const bind = (id, fn) => { $(id).addEventListener('input', fn); fn(); };
bind('roof', () => { G.roof.visible = $('roof').checked; });
bind('ceil', () => { G.ceilings.visible = $('ceil').checked; });
bind('labels', () => { G.labels.visible = $('labels').checked; });
const showGround = () => { ground.visible = !nb.visible && !ctx.visible; trees.visible = nb.visible || ctx.visible; };
bind('ctx', () => { nb.visible = $('ctx').checked; showGround(); });
bind('mesh', () => { ctx.visible = $('mesh').checked; if (ctx.visible) loadPhotoMesh(); showGround(); });
bind('shadows', () => { sun.castShadow = $('shadows').checked; });
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
bind('cut', () => {
  const h = parseFloat($('cut').value);
  clip.constant = h; renderer.clippingPlanes = h >= 6 ? [] : [clip];
  $('cutVal').textContent = h >= 6 ? 'off' : h.toFixed(1) + ' m';
});
function currentDate() {
  const d = new Date(); d.setMonth(0, 1); d.setDate(parseInt($('day').value));
  const t = parseFloat($('time').value); d.setHours(Math.floor(t), Math.round((t % 1) * 60), 0, 0);
  return d;
}
const refreshSun = () => {
  const d = currentDate();
  const ds = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), ts = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  $('dayVal').textContent = ds; $('timeVal').textContent = ts;
  setSun(d);
};
bind('day', refreshSun); bind('time', refreshSun);
document.querySelectorAll('[data-cut]').forEach(b => b.addEventListener('click', () => { $('cut').value = b.dataset.cut; $('cut').dispatchEvent(new Event('input')); }));

function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  if (camera.userData.walk) { camera.fov = walkFov(); camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); return; }
  // keep roughly the same horizontal field of view in portrait, so the house doesn't shrink on phones
  camera.fov = camera.aspect < 1 ? THREE.MathUtils.clamp(2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(25)) / camera.aspect)) * 0.75, 50, 80) : 50;
  camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
}
fitCamera();
addEventListener('resize', fitCamera);
// --- walk mode: joystick moves, drag looks, right-edge drag changes eye height -------
const walk = { on: false, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, vel: new THREE.Vector3(), eye: 1.4, move: { x: 0, y: 0 }, joyId: null, lookId: null, last: null, clock: new THREE.Clock() };
const joy = $('joy'), knob = $('knob'), wbtn = $('walkBtn'), toast = $('toast');
let toastTimer;
function showToast(msg) { toast.textContent = msg; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3500); }
function floorAt(p) {                                  // floor level of the room the camera is over (lot frame)
  const x = -p.x, y = p.z;
  // inside a room: its floor. In a doorway or wall gap (within 0.4 m of a room): the nearest room's floor.
  let best = null, bd = 0.4;
  for (const r of spec.rooms) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - y, 0, y - r.y1), d = Math.hypot(dx, dy);
    if (d === 0) return r.floor;
    if (d < bd) { bd = d; best = r; }
  }
  if (best) return best.floor;
  const S = spec.site_items;
  for (const k of ['rear_slab', 'west_path', 'front_path', 'front_garden']) {
    const z = S[k]; if (x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) return z.z;
  }
  return spec.site.ground_z;
}
// solid boxes the walker can't pass: every wall piece, window, fixture, fence and the shed.
// Door leaves and gates are excluded, and so are floors, ceilings and roofs.
scene.updateMatrixWorld(true);
const colliders = [];
for (const grp of [G.exterior, G.interior, G.site]) grp.traverse(o => {
  if (!o.isMesh || o.userData.door || !o.geometry.parameters || o.geometry.type !== 'BoxGeometry') return;
  const { width, height, depth } = o.geometry.parameters;
  const bb = new THREE.Box3().setFromObject(o);
  colliders.push({ inv: o.matrixWorld.clone().invert(), hx: width / 2, hz: depth / 2, y0: bb.min.y, y1: bb.max.y, mesh: o, bb });
});
const doorLeaves = [];
for (const grp of [G.exterior, G.interior, G.site]) grp.traverse(o => { if (o.isMesh && o.userData.door) doorLeaves.push(o); });
const BODY_R = 0.18, tmp = new THREE.Vector3();
function blocked(p, floorY) {
  const feet = floorY + 0.42, head = floorY + 1.7;          // steps up to 0.42 (the two back-door risers) can be climbed; sills and benches block
  for (const c of colliders) {
    if (c.y1 <= feet || c.y0 >= head) continue;
    tmp.copy(p).applyMatrix4(c.inv);
    // round body: distance from the body centre to the nearest point of the box footprint
    const dx = Math.max(Math.abs(tmp.x) - c.hx, 0), dz = Math.max(Math.abs(tmp.z) - c.hz, 0);
    if (dx * dx + dz * dz < BODY_R * BODY_R - 1e-6) return true;
  }
  return false;
}
function walkFov() {
  // wide lens: about 100 degrees across the screen, capped so portrait phones don't go full fisheye
  const h = THREE.MathUtils.degToRad(100);
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / camera.aspect)), 60, 110);
}
$('ctx').addEventListener('input', e => { if (e.isTrusted) walk.autoCtx = false; });
function setWalk(on) {
  walk.on = on; controls.enabled = !on; camera.userData.walk = on;
  // first person: neighbours and street come on (the overview keeps them off by default); leaving walk mode turns
  // them back off, unless they were switched by hand in the meantime
  if (on && !$('ctx').checked) { $('ctx').checked = true; $('ctx').dispatchEvent(new Event('input')); walk.autoCtx = true; }
  else if (!on && walk.autoCtx) { if ($('ctx').checked) { $('ctx').checked = false; $('ctx').dispatchEvent(new Event('input')); } walk.autoCtx = false; }
  for (const d of doorLeaves) d.visible = !on;
  camera.fov = on ? walkFov() : 50; if (!on) fitCamera(); camera.near = on ? 0.05 : 0.1; camera.updateProjectionMatrix();
  wbtn.setAttribute('aria-pressed', String(on)); $('walkLabel').textContent = on ? 'Orbit' : 'Walk';
  joy.hidden = !on;
  window.closeSheets?.();
  if (on) {
    // start in the hall looking south toward the living room, unless already close to the house
    camera.position.copy(L(0.7, 5.2, 1.6));
    walk.yaw = walk.tYaw = Math.PI; walk.pitch = walk.tPitch = 0; walk.vel.set(0, 0, 0);   // facing +Z (south)
    showToast('Joystick to walk, drag to look');
  } else {
    // back to the view the page opens with
    camera.position.copy(HOME.pos); controls.target.copy(HOME.target); controls.update();
  }
}
wbtn.addEventListener('click', () => setWalk(!walk.on));
const JR = 64;
joy.addEventListener('pointerdown', e => { joy.classList.add('active'); walk.joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch {} joyMove(e); e.preventDefault(); });
joy.addEventListener('pointermove', e => { if (e.pointerId === walk.joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId !== walk.joyId) return; joy.classList.remove('active'); walk.joyId = null; walk.move.x = walk.move.y = 0; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
function joyMove(e) {
  const r = joy.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy); if (d > JR) { dx *= JR / d; dy *= JR / d; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  // gentle near the centre, full speed at the rim
  const m = Math.hypot(dx, dy) / JR, curve = m < 0.08 ? 0 : Math.pow((m - 0.08) / 0.92, 1.6), f = m > 0 ? curve / m : 0;
  walk.move.x = dx / JR * f; walk.move.y = -dy / JR * f;
}
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => { if (!walk.on || walk.lookId !== null) return; walk.lookId = e.pointerId; walk.last = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch {} });
cv.addEventListener('pointermove', e => {
  if (!walk.on || e.pointerId !== walk.lookId) return;
  const dx = e.clientX - walk.last[0], dy = e.clientY - walk.last[1]; walk.last = [e.clientX, e.clientY];
  walk.tYaw -= dx * 0.009; walk.tPitch = THREE.MathUtils.clamp(walk.tPitch - dy * 0.009, -1.4, 1.4);
});
walk.eyeDir = 0;
cv.addEventListener('pointerdown', () => window.closeSheets?.());
const lookEnd = e => { if (e.pointerId === walk.lookId) walk.lookId = null; };
cv.addEventListener('pointerup', lookEnd); cv.addEventListener('pointercancel', lookEnd);
// keyboard for desktop testing: WASD / arrows, Q/E height
const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function stepWalk() {
  // anything that set yaw/pitch directly (start of walk, tests) becomes the new target
  if (walk.lastYaw !== undefined && (walk.yaw !== walk.lastYaw || walk.pitch !== walk.lastPitch)) { walk.tYaw = walk.yaw; walk.tPitch = walk.pitch; }
  const dt = Math.min(walk.clock.getDelta(), 0.05);
  if (!walk.on) return;
  let mx = walk.move.x, my = walk.move.y;
  if (keys['w'] || keys['arrowup']) my += 1; if (keys['s'] || keys['arrowdown']) my -= 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1; if (keys['d'] || keys['arrowright']) mx += 1;
  const ed = walk.eyeDir + (keys['e'] ? 1 : 0) - (keys['q'] ? 1 : 0);
  if (ed) walk.eye = THREE.MathUtils.clamp(walk.eye + ed * 1.2 * dt, 0.3, 12);
  const speed = 1.4;                                   // metres per second, walking pace
  const fwd = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  // look eases toward the finger; movement accelerates and slows down instead of snapping
  const k = 1 - Math.exp(-dt * 18);
  walk.yaw += (walk.tYaw - walk.yaw) * k; walk.pitch += (walk.tPitch - walk.pitch) * k;
  const want = new THREE.Vector3().addScaledVector(fwd, my * speed).addScaledVector(right, mx * speed);
  walk.vel.lerp(want, 1 - Math.exp(-dt * 8));
  const step = walk.vel.clone().multiplyScalar(dt);
  const p = camera.position, fy = floorAt(p);
  // move along each axis separately so you slide along a wall instead of sticking to it
  const tryX = p.clone(); tryX.x += step.x; if (!blocked(tryX, floorAt(tryX))) p.x = tryX.x;
  const tryZ = p.clone(); tryZ.z += step.z; if (!blocked(tryZ, floorAt(tryZ))) p.z = tryZ.z;
  camera.position.y = floorAt(p) + walk.eye;
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  walk.lastYaw = walk.yaw; walk.lastPitch = walk.pitch;

}

window.__app = { nb, scene, ctx, G, renderer, sun, camera, THREE, walk, stepWalk, colliders, blocked, controls,
  // debug: place the camera in lot coordinates and render one frame
  view(p, t) { camera.position.copy(L(...p)); controls.target.copy(L(...t)); controls.update(); renderer.render(scene, camera); } };
// Remember where this viewer is, per browser and per page: walking position and look direction, or the
// orbit camera. A refresh (to pick up a change) comes straight back instead of starting at the front door.
const VIEW_KEY = 'fern-view:' + location.pathname;
function saveView() {
  const p = camera.position, t = controls.target;
  const v = walk.on ? { walk: true, x: p.x, z: p.z, yaw: walk.yaw, pitch: walk.pitch, eye: walk.eye }
                    : { walk: false, pos: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
  try { localStorage.setItem(VIEW_KEY, JSON.stringify(v)); } catch {}
}
{
  let v = null;
  try { v = JSON.parse(localStorage.getItem(VIEW_KEY)); } catch {}
  if (v?.walk && Number.isFinite(v.x) && Number.isFinite(v.z)) {
    setWalk(true);
    camera.position.x = v.x; camera.position.z = v.z;
    walk.yaw = walk.tYaw = v.yaw || 0; walk.pitch = walk.tPitch = v.pitch || 0;
    if (Number.isFinite(v.eye)) walk.eye = v.eye;
    showToast('Back where you were');
  } else if (v && !v.walk && v.pos?.length === 3 && v.target?.length === 3) {
    camera.position.set(...v.pos); controls.target.set(...v.target); controls.update();
  }
}
setInterval(saveView, 500);
addEventListener('pagehide', saveView);
addEventListener('visibilitychange', () => { if (document.hidden) saveView(); });
renderer.setAnimationLoop(() => { if (walk.on) stepWalk(); else { walk.clock.getDelta(); controls.update(); } renderer.render(scene, camera); });
// the house is built and the first frame drawn: fade out the loading screen
renderer.render(scene, camera);
setTimeout(() => document.getElementById('loading')?.classList.add('done'), 60);
