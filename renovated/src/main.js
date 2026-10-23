import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import SunCalc from 'suncalc';
import { buildNeighbours } from '../../context/neighbours.js';
import { buildHouse, applyReno, FRIDGE_SPOTS, L, setPlantModels } from './generator.js';

// the plant models start downloading straight away, alongside the spec (see loadPlants below)
const plantsReady = loadPlants();
const baseSpec = await (await fetch('./spec.json')).json();
// Reno settings (metres), remembered per browser
const RENO_KEY = 'fern-reno-v3';
const RENO_DEFAULT = { curtains: true, shutters: true, kitchenV: 5, defaultsV: 3, loungeV: 3, roofRaise: 0.85, floorBuildup: 0.38, skylight: true, openingRaise: true, fridge: 'runEndPantry', island: false, hallDoorway: 'arch', kitchenDoor: 'none', laundry: 'bathCornerLow', laundryV: 1, kitchenTall: true, kitchenStyle: 'walnut', noPantry: true, frontBed: 'queen', bedside: true, tvUnit: 'white', loungeStyle: 'walnut', coffeeTable: 'matched', sideboard: 'matched', diningTable: 'matched', furnitureV: 1, whiteWoodwork: true, creamExterior: true, bayHood: false, porchScreen: false, sidePavers: false, glassWall: true, hallV: 4, bedLights: 'pendant', bedLightsV: 3, pendant: 'augustOval', hallLights: 'art', hallPendant: 'pebble', hallAmalfi: true, hallDl: 'small', klLights: 'designed', art: 'v2', artV: 1, decor: 'styled', decorV: 1, yard: 'deck', yardV: 1 , loungeFence: 'screen', loungeFenceV: 1, baySeat: 'on', moodPendants: false, moodPendant: '' };
let reno = { ...RENO_DEFAULT };
let savedReno = null;
try { savedReno = JSON.parse(localStorage.getItem(RENO_KEY)); Object.assign(reno, savedReno || {}); } catch {}
// kitchen defaults changed (no door, original window; double fridge at the hall end of the bench; cupboards to
// the ceiling with the round table, no island): move saved kitchens over once
if (savedReno && (savedReno.kitchenV || 0) < 5) {
  Object.assign(reno, { kitchenDoor: RENO_DEFAULT.kitchenDoor, fridge: RENO_DEFAULT.fridge, kitchenTall: RENO_DEFAULT.kitchenTall, island: RENO_DEFAULT.island, kitchenV: 5 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// laundry default changed to bathroom 2, stacked + bench with the hamper drawer: move saved choices over once
if (savedReno && (savedReno.laundryV || 0) < 1) {
  Object.assign(reno, { laundry: RENO_DEFAULT.laundry, laundryV: 1 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// lounge floor built up flush with the kitchen (38) and the roof raised 85 so its flat ceiling meets the kitchen's
// 2.8: move saved settings over once
if (savedReno && (savedReno.loungeV || 0) < 2) {
  Object.assign(reno, { roofRaise: RENO_DEFAULT.roofRaise, floorBuildup: RENO_DEFAULT.floorBuildup, loungeV: 2 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// the walnut + stone TV wall became the default lounge style: move saved settings over once
if (savedReno && (savedReno.loungeV || 0) < 3) {
  Object.assign(reno, { loungeStyle: 'walnut', loungeV: 3 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// the matched set (stone and sand oak, boucle seats) became the default table, sideboard and coffee table: move saved
// choices over once
if (savedReno && (savedReno.furnitureV || 0) < 1) {
  Object.assign(reno, { diningTable: 'matched', sideboard: 'matched', coffeeTable: 'matched', furnitureV: 1 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// hall end: the original door-sized opening became the default (2026-10-21): move saved choices over once
if (savedReno && (savedReno.hallV || 0) < 2) Object.assign(reno, { hallDoorway: 'arch' });
if (savedReno && (savedReno.loungeFenceV || 0) < 1) { Object.assign(reno, { loungeFence: 'screen', loungeFenceV: 1 }); try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {} }   // the slatted screen became the default (client)
if (savedReno && (savedReno.hallV || 0) < 3) {
  Object.assign(reno, { hallPendant: 'pebble', hallV: 3 });   // opal pebble pendants replace the woven ones (client)
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// hall: the Amalfi cluster at the front door with three small low-glare downlights became the default (2026-10-24):
// move saved choices over once
if (savedReno && (savedReno.hallV || 0) < 4) {
  Object.assign(reno, { hallAmalfi: true, hallDl: 'small', hallV: 4 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// bedrooms: the August oval pendant with the robe-top and robe-floor strips became the default (2026-10-21): move
// saved choices over once
if (savedReno && (savedReno.bedLightsV || 0) < 3) {
  Object.assign(reno, { bedLights: 'pendant', pendant: 'augustOval', bedLightsV: 3 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// back yard: the raised deck became the default (2026-10-21): move saved choices over once
if (savedReno && (savedReno.yardV || 0) < 1) {
  Object.assign(reno, { yard: 'deck', yardV: 1 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// styling: plants, branches and surface objects (DECOR-STYLING.md Part D) became the default (2026-10-21): move saved
// choices over once
if (savedReno && (savedReno.decorV || 0) < 1) {
  Object.assign(reno, { decor: 'styled', decorV: 1 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// artwork: the proposed layout (ART-PLACEMENT.md Part D) became the default (2026-10-21): move saved choices over once
if (savedReno && (savedReno.artV || 0) < 1) {
  Object.assign(reno, { art: 'v2', artV: 1 });
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
// the whole agreed setup became the default (simple archway, white woodwork, no pavers ...): move everyone over once
if (savedReno && (savedReno.defaultsV || 0) < 3) {   // v3 (2026-10-21): everyone back to the defaults once (client)
     // v2 (2026-09-27): walnut kitchen, sheer curtains, fridge by the pantry, old pantry out
  const { kitchenV, laundryV, loungeV, furnitureV, ...all } = RENO_DEFAULT;
  Object.assign(reno, all);
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
}
let spec = applyReno(baseSpec, reno);

const renderer = new THREE.WebGLRenderer({ antialias: true });
// resolution: capped at 1.5x, then stepped down (to 1x) while frames run slow and back up when there's headroom
const PR_MAX = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(PR_MAX);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;   // a filmic shoulder: sun-bright surfaces keep their tone instead of clipping
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
// Build once, with the plant models in: wait for them up to 2.5 s (a refresh gets them back as 304s from the cache in
// a moment). Only if they are slower than that (a first visit over a slow link) does the house go up with the
// procedural stand-ins and rebuild when they arrive, which costs a second full build and lighting pass.
const earlyPlants = await Promise.race([plantsReady, new Promise(r => setTimeout(r, 2500, null))]);
if (earlyPlants) setPlantModels(earlyPlants);
let G = buildHouse(spec);
// Plant models (assets/plants, exported from the downloaded models with Blender, then meshopt-compressed, see its
// README): lemon tree, ornamental grass clump, lawn patch, potato plants for the beds, the rhyzome house plant and the
// hedge. About 3 MB. (The snake plant model isn't placed anywhere, so it isn't loaded.)
async function loadPlants() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), out = {};
  await Promise.all(['lemon', 'grassclump', 'lawn', 'potato', 'rhyzome', 'hedge'].map(n => loader.loadAsync(`./assets/plants/${n}.glb`).then(g => {
    // meshopt stores positions as 16-bit integers with a scale on the node. Bake every node's transform into plain float
    // geometry and reset the nodes, so the model reads in metres again: plantModel sizes a plant from its bounds, and
    // the lawn instances the patch geometry directly (both came out many times too big otherwise)
    g.scene.updateMatrixWorld(true);
    const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) {
      const geo = o.geometry.clone();
      for (const [k, a] of Object.entries(geo.attributes)) {
        if (a.array instanceof Float32Array && !a.normalized) continue;
        const f = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
        geo.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize));
      }
      geo.applyMatrix4(o.matrixWorld); o.geometry = geo;
    }
    g.scene.traverse(o => { if (o !== g.scene) { o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1); } });
    g.scene.updateMatrixWorld(true);
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      o.geometry.userData.keep = true;                                                  // shared by every copy: a rebuild must not free it
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) m[k].userData.keep = true;
      if (m.transparent) { m.transparent = false; m.depthWrite = true; }             // the snake plant's soil was exported as see-through
      if (n === 'hedge' && m.name.startsWith('leaves')) {                               // leaf cards: cut out on the alpha, both faces, a
        Object.assign(m, { transparent: false, depthWrite: true, alphaTest: 0.5, side: THREE.DoubleSide, alphaToCoverage: true });   // deeper hedge green
        m.color.setHex(0x7d9468); m.roughness = 0.7; m.needsUpdate = true;
      }
      if (n === 'lawn') {                                                               // Tilt Brush grass: its vertex colours are a bright paint green
        o.material = new THREE.MeshStandardMaterial({ color: 0x7f8f5c, vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
      }
    });
    out[n] = g.scene;
  }).catch(err => console.error('plant model', n, err))));
  return out;
}
if (!earlyPlants) plantsReady.then(models => { setPlantModels(models); rebuild(); });
const house = new THREE.Group();
for (const k of Object.keys(G)) house.add(G[k]);
scene.add(house);

// Sky occlusion. The hemisphere light and the environment map are not blocked by walls, so on their own they light
// every room as if it stood in the open. Indoor surfaces sample a "sky field" instead: a 100 mm grid over the plan
// holding the share of sky light that reaches each spot. Each room starts from a share set by its glazing; the grid
// then lets light spread through doorways and openings (walls block it), so a hall darkens gradually away from a
// bright kitchen rather than stepping at the threshold. The field scales only sky and reflection light (the shader's
// ambient-occlusion term), never the sun or the downlights. A stand-in for baked light, see LIGHTING-REVIEW.md.
// The lounge (the old covered area) has a lot of glass, but almost all of it looks at something close: the west windows
// face the side fence 0.7 m away, the side door the side path, and the south sliders face a 2 m fence and the wing wall
// (and, being south-facing, get little direct sun). Most of that glass sees fence and wall, not sky, so its share sits
// with the kitchen's rather than well above it. The skylight adds some (set in buildSkyField).
const SKY_SHARE = { 'Lounge / living': 0.22, 'Kitchen / dining': 0.28, 'Front bedroom': 0.25, 'Bedroom 2': 0.18, 'Bedroom 3': 0.15,
  Entry: 0.12, Hall: 0.08, 'Hall extension': 0.08, Bath: 0.14, WC: 0.11, 'Bathroom 2': 0.14, Porch: 0.6 };
const SKYF = { field: { value: null }, xf: { value: new THREE.Vector4() }, bounce: { value: 0 },
  lamp: { value: 0 }, lampCol: { value: new THREE.Color(0xffecd6) } };   // lamp: 0/1 with the Lights switch; 2700 K as an adapted eye sees it (one colour temperature through the house)
let skyGrid = null;                                                       // { x0, y0, nx, ny, v } for the exposure lookup
// Proposed bedroom lighting (front bedroom and bedroom 2): pendant, wall lights, robe-top strip, night light. three.js
// lights pass through walls, so these are lit in the shader instead, each only on surfaces inside its own room's
// outline (the front bedroom's includes the bay). Direct light from points and line sources, no shadows, plus a flat
// bounce fill per room from the lumens that are on. Units match the downlights: DL_I (1.7) is a 700 lm fitting's
// 261 cd, so 1 cd = 1.7 / 261, and a lumen of bounce is the lamp field's 0.00358 per lm.
const V4 = n => Array.from({ length: n }, () => new THREE.Vector4());
const NPT = 22, NLN = 14, NRECT = 8, NZONE = 6;                         // point and line source slots, outline rects, zones
const BEDU = { bedOn: { value: 0 }, bedRm: { value: V4(NRECT) }, bedZone: { value: new Array(NRECT).fill(-1) }, bedBay: { value: new THREE.Vector4() }, bedBayY: { value: new THREE.Vector2() },
  bedPt: { value: V4(NPT) }, bedPtK: { value: V4(NPT) }, bedLn: { value: V4(NLN) }, bedLnA: { value: V4(NLN) }, bedLnM: { value: new Array(NLN).fill(0) }, bedFill: { value: new Array(NZONE).fill(0) }, bedSpill: { value: new THREE.Vector4() }, bedOccA: { value: V4(4) }, bedOccB: { value: V4(4) },
  bedCol: { value: new THREE.Color() }, bedNightCol: { value: new THREE.Color(0xffa860) } };
// Bounce fill: Sumpner's inter-reflection formula, average indirect irradiance = flux x rho / (A x (1 - rho)), with
// rho the area-weighted reflectance. These rooms: white ceiling ~0.85, off-white walls ~0.75, light cream carpet ~0.5
// -> rho ~0.72, rho / (1 - rho) ~2.6. (The first version used a single 55% bounce, 0.00358 per lm: several times too
// dark for white rooms, which made lit bedrooms read far darker than they will be.)
// zones lit in the shader: the three bedrooms, the hall (entry + hall + hall extension, open to each other), and the
// kitchen and lounge (their designed lighting, 2026-10-21)
const BED_ROOMS = ['Front bedroom', 'Bedroom 2', 'Hall', 'Bedroom 3', 'Kitchen / dining', 'Lounge / living'], CD = 1.7 / 261, FILL_LM = CD * 2.6;
const zoneRects = () => { const R = n => spec.rooms.find(r => r.name === n), ha = R('Hall'), ext = R('Hall extension');
  return [R('Front bedroom'), R('Bedroom 2'), R('Entry'), { x0: ha.x0, x1: ha.x1, y0: ha.y0, y1: ext.y1, ceil: ha.ceil }, R('Bedroom 3'), R('Kitchen / dining'), R('Lounge / living'),
    // the kitchen-to-lounge opening through the 230 wall: its jambs, head and floor strip face neither room and went
    // black once the kitchen's downlight grid (which lit them) came out; they count with the kitchen
    (() => { const k = R('Kitchen / dining'), l = R('Lounge / living'); return { x0: Math.max(k.x0, l.x0), x1: Math.min(k.x1, l.x1), y0: k.y1, y1: l.y0, ceil: k.ceil }; })()]; };
const ZONE_OF_RECT = [0, 1, 2, 2, 3, 4, 5, 4];
// every page load starts with the pendant, reading spots and robe-top strip on at full (scenes and switches are for
// the visit only, not remembered)
const bedState = { pendant: true, angled: true, reading: true, corner: true, cove: true, wallwash: true, sheer: true, night: true, dim: 100, dimSec: 100 };   // dim: ceiling circuit, dimSec: secondary
// two circuits, as at the door: the bulb button (the house's Lights) works the ceiling lights, the four angled
// downlights or the pendant; the second button works the secondary lights: robe-top strip, and the corner downlights
// or reading spots in those versions. The night light is on its own motion sensor
const SECONDARY = ['cove', 'night', 'wallwash', 'sheer', 'corner', 'reading'];   // the robe's floor strip goes on and off with the top one
let secondaryOn = true;
let bedMats = null;                                                       // glowing parts of the fittings, by layer
let skyWalls = null;                                                      // wall cells, cached until the house is rebuilt
const CELL = 0.1;
// Bounced downlight, per cell. Each fitting is a ~700 lm LED (DL_I candela over a 110 degree beam); what lands on
// the floor and walls comes back off them, so every room with its lights on carries a soft, even base level: the
// room's lumens over its surface area (white walls and ceiling, timber or carpet floor: about half comes back each
// bounce, which roughly doubles the first bounce, so ~ flux / area). It is a little higher under and near the
// fittings. Walls block it like the sky light, and it spills a short way through open doorways. The direct light
// (the pools on the floor and the scallops on the walls) comes from the spotlight pool.
// the front bedroom's bay projects past the house front, outside the room's rectangle: its trapezoid (outer faces)
// belongs to the bedroom, under the bay's own soffit, or the bay reads as open sky
function bayRoom(pad = 0) {
  const b = spec.house.bay, yo = spec.house.y_front_outer, yf = yo - b.projection, yi = spec.house.y_front_inner;
  const room = { name: 'Front bedroom', floor: 0, ceil: b.wall_top };
  return (x, y) => {
    if (y < yf - pad || y > yi) return null;
    const t = Math.max(0, Math.min(1, (yo - y) / b.projection));             // 0 at the house front, 1 at the bay front
    return x >= b.x0 + t * (b.front_x0 - b.x0) - pad && x <= b.x1 + t * (b.front_x1 - b.x1) + pad ? room : null;
  };
}
function lampSeed(rooms, x0, y0, nx, ny) {
  const N = nx * ny, seed = new Float32Array(N), seeded = new Uint8Array(N), inBay = bayRoom();
  // bounce: Sumpner's inter-reflection, rho / (1 - rho) ~1.5 for these rooms (white walls and ceiling, timber floor), as
  // the bedrooms and hall use; the single 55% bounce left the kitchen far darker than the hall beside it
  const DLs = G.ceilings.userData.downlights, flux = DL_I * 2 * Math.PI * (1 - Math.cos(THREE.MathUtils.degToRad(55))) * 1.5;
  const inRoom = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  const info = new Map();
  for (const r of rooms) {
    const fits = DLs.filter(d => inRoom(r, d.x, d.y)), w = r.x1 - r.x0, l = r.y1 - r.y0, h = r.ceil ?? 3.0;
    info.set(r, { fits, base: fits.length * flux / (2 * (w * l + w * h + l * h)), h: h - 0.9 });
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * CELL, y = y0 + (j + 0.5) * CELL, k = j * nx + i;
    const r = rooms.find(r => inRoom(r, x, y));
    if (!r && inBay(x, y)) continue;                                      // the bay: no fittings, lit from the room
    if (!r) { if (!rooms.some(q => x >= q.x0 - 0.3 && x <= q.x1 + 0.3 && y >= q.y0 - 0.3 && y <= q.y1 + 0.3)) seeded[k] = 1; continue; }   // outdoors: none
    const { fits, base, h } = info.get(r);
    let dir = 0;                                                          // direct on a desk-height plane, for the local lift
    for (const d of fits) { const q = h * h + (d.x - x) ** 2 + (d.y - y) ** 2; dir += DL_I * h / q ** 1.5; }
    seed[k] = base * (0.75 + 0.25 * Math.min(2, dir / Math.max(base * 2, 1e-4))); seeded[k] = 1;
  }
  return [seed, seeded];
}
function buildSkyField() {
  SKY_SHARE['Lounge / living'] = 0.22 + (spec.renovation.lounge?.skylight ? 0.05 : 0);
  const rooms = spec.rooms.filter(r => SKY_SHARE[r.name] != null);
  const x0 = Math.min(...rooms.map(r => r.x0)) - 1, x1 = Math.max(...rooms.map(r => r.x1)) + 1;
  const y0 = Math.min(...rooms.map(r => r.y0)) - 1, y1 = Math.max(...rooms.map(r => r.y1)) + 1;
  const nx = Math.ceil((x1 - x0) / CELL), ny = Math.ceil((y1 - y0) / CELL), N = nx * ny;
  const seed = new Float32Array(N), seeded = new Uint8Array(N), p = new THREE.Vector3(), lp = new THREE.Vector3();
  const zAt = new Float32Array(N), ceilAt = new Float32Array(N), inBay = bayRoom(), nearBay = bayRoom(0.25);
  const fixed = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * CELL, y = y0 + (j + 0.5) * CELL, k = j * nx + i;
    const r = rooms.find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || inBay(x, y);
    // cells in a wall's thickness (doorways, the arch, frames) belong to no room: they carry light between their
    // neighbours but are no source of their own. Only cells clear of every room by more than a wall are outdoors.
    const near = r || rooms.find(r => x >= r.x0 - 0.3 && x <= r.x1 + 0.3 && y >= r.y0 - 0.3 && y <= r.y1 + 0.3) || nearBay(x, y);
    const inHouse = y >= Math.min(...rooms.map(q => q.y0)) - 0.3 && y <= Math.max(...rooms.map(q => q.y1)) + 0.3;
    // east of the party wall (lot x < 0), along the house, is next door's house, not sky: dark, so no light comes
    // through that wall's joints. Front and back gardens east of that line stay outdoors.
    if (r) { seed[k] = SKY_SHARE[r.name]; seeded[k] = 1; } else if (x < 0.1 && inHouse) { seed[k] = 0; seeded[k] = 1; } else if (!near) { seed[k] = 1; seeded[k] = 1; }
    else {
      // in an outside wall's thickness (one room within a wall's width, not two as at a doorway): the windows and
      // outside doors. Held at a little over the room's share, since that share already counts its glazing; left
      // open, full daylight spread 0.8 m in through every window and lit reveals, heads and shutters in hard strips
      const by = rooms.filter(q => x >= q.x0 - 0.25 && x <= q.x1 + 0.25 && y >= q.y0 - 0.25 && y <= q.y1 + 0.25);
      if (nearBay(x, y) && !by.some(q => q.name === 'Front bedroom')) by.push(nearBay(x, y));
      if (by.length === 1) { seed[k] = Math.min(1, 1.6 * SKY_SHARE[by[0].name]); seeded[k] = fixed[k] = 1; }
    }
    // anything above this height here is outdoors (roof, eaves). A cell in a wall between rooms takes the highest of
    // their ceilings: taking the first room found gave the front bedroom's wall the porch's 2.75, and its cornice and
    // corners, sampling there, lit up as open sky
    const cr = r ? [r] : rooms.filter(q => x >= q.x0 - 0.3 && x <= q.x1 + 0.3 && y >= q.y0 - 0.3 && y <= q.y1 + 0.3).concat(nearBay(x, y) || []);
    ceilAt[k] = cr.length ? Math.max(...cr.map(q => q.floor + (q.ceil ?? 3.0))) : (x < 0.1 && inHouse ? 99 : -99);
    zAt[k] = ((r || near) ? (r || near).floor : spec.site.ground_z) + 1.2;                   // test at 1.2 m: walls, frames and door leaves, not benches
  }
  // a cell is solid where a box stands in it at 1.2 m. Walls are fixed until the next rebuild; door leaves are
  // tested in their current pose, so a closed door stops light and an open one lets it through
  const hits = (list, solid) => {
    for (let k = 0; k < N; k++) {
      if (solid[k]) continue;
      p.set(-(x0 + (k % nx + 0.5) * CELL), zAt[k], y0 + (Math.floor(k / nx) + 0.5) * CELL);
      for (const c of list) {
        const b = c.bb; if (p.x < b.min.x || p.x > b.max.x || p.z < b.min.z || p.z > b.max.z || p.y < b.min.y || p.y > b.max.y) continue;
        lp.copy(p).applyMatrix4(c.inv);
        if (Math.abs(lp.x) <= c.hx && Math.abs(lp.z) <= c.hz) { solid[k] = 1; break; }
      }
    }
  };
  if (!skyWalls || skyWalls.length !== N) {
    skyWalls = new Uint8Array(N);
    hits(colliders.filter(c => { let o = c.mesh; while (o) { if (o === G.furniture) return false; o = o.parent; } return true; }), skyWalls);
  }
  const solid = Uint8Array.from(skyWalls);
  hits(doorLeaves.filter(o => o.geometry?.parameters?.width).map(o => {
    o.updateWorldMatrix(true, false);
    const pr = o.geometry.parameters;
    return { inv: o.matrixWorld.clone().invert(), hx: pr.width / 2 + 0.02, hz: Math.max(pr.depth / 2, 0.06), bb: new THREE.Box3().setFromObject(o).expandByScalar(0.06) };
  }), solid);
  // spread: each open cell relaxes toward its open neighbours while held to its own room's share. Light carries
  // about 0.8 m through an opening (sqrt(w / (1 - w)) cells) before the receiving room's own level takes over.
  const relax = (seed, seeded, free, hold) => {
    let v = Float32Array.from(seed), nv = new Float32Array(N);
    for (let k = 0; k < N; k++) if (!seeded[k]) v[k] = free;
    const w = 0.985;
    for (let it = 0; it < 160; it++) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (solid[k] || hold?.[k]) { nv[k] = v[k]; continue; }
        let s = 0, n = 0;
        if (i > 0 && !solid[k - 1]) { s += v[k - 1]; n++; }
        if (i < nx - 1 && !solid[k + 1]) { s += v[k + 1]; n++; }
        if (j > 0 && !solid[k - nx]) { s += v[k - nx]; n++; }
        if (j < ny - 1 && !solid[k + nx]) { s += v[k + nx]; n++; }
        nv[k] = !n ? v[k] : seeded[k] ? (1 - w) * seed[k] + w * (s / n) : s / n;
      }
      [v, nv] = [nv, v];
    }
    return v;
  };
  const v = relax(seed, seeded, 0.1, fixed);
  const lamp = relax(...lampSeed(rooms, x0, y0, nx, ny), 0);
  // wall cells take the mean of their open neighbours, so a surface sampling right at a wall face reads its own side
  for (let pass = 0; pass < 3; pass++) for (let k = 0; k < N; k++) if (solid[k]) {
    const i = k % nx; let s = 0, t = 0, n = 0;
    for (const q of [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, k - nx, k + nx]) if (q >= 0 && q < N && !solid[q]) { s += v[q]; t += lamp[q]; n++; }
    if (n) { v[k] = s / n; lamp[k] = t / n; solid[k] = 0; }
  }
  // half floats: 8 bits band visibly at a hall's 0.08 (one step is 5% of the value); half floats filter linearly everywhere
  // R: sky share; G: the ceiling height there (surfaces above it are outdoors: roofs, eaves, the tops of walls);
  // B: bounced downlight (irradiance, in the spotlights' units, when every light is on)
  const data = new Uint16Array(N * 4);
  for (let k = 0; k < N; k++) {
    data[4 * k] = THREE.DataUtils.toHalfFloat(Math.min(1, v[k])); data[4 * k + 1] = THREE.DataUtils.toHalfFloat(ceilAt[k]);
    data[4 * k + 2] = THREE.DataUtils.toHalfFloat(lamp[k]); data[4 * k + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  SKYF.field.value?.dispose();
  const tex = new THREE.DataTexture(data, nx, ny, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  SKYF.field.value = tex; SKYF.xf.value.set(x0, y0, 1 / (nx * CELL), 1 / (ny * CELL));
  skyGrid = { x0, y0, nx, ny, v, ceil: ceilAt };
}
// the ceiling height over a spot (-99 outdoors): under it you are indoors, doorways and gaps between rooms included
const ceilOver = (x, y) => {
  if (!skyGrid) return -99;
  const i = Math.floor((x - skyGrid.x0) / CELL), j = Math.floor((y - skyGrid.y0) / CELL);
  return i < 0 || j < 0 || i >= skyGrid.nx || j >= skyGrid.ny ? -99 : skyGrid.ceil[j * skyGrid.nx + i];
};
const skyAt = (x, y) => {                                                  // lot frame
  if (!skyGrid) return 1;
  const i = Math.floor((x - skyGrid.x0) / CELL), j = Math.floor((y - skyGrid.y0) / CELL);
  return i < 0 || j < 0 || i >= skyGrid.nx || j >= skyGrid.ny ? 1 : skyGrid.v[j * skyGrid.nx + i];
};
// indoor copies of materials read the field in place of their ambient-occlusion term
// A material flagged userData.skyRoomSide (the plantation shutters) samples on its part's local +z, the side facing the
// room, whichever way each face points: the louvres sit in the window reveal, and 150 mm in front of their window-side
// faces is outside the glass, so their edges took full daylight in slivers
function skyMaterial(src) {
  const mat = src.clone(), skyNormal = src.userData.skyRoomSide ? 'vec3( 0.0, 0.0, 1.0 )' : 'objectNormal';
  mat.dithering = true;                                                   // dim indoor gradients band in 8-bit output; dither breaks them up
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { skyField: SKYF.field, skyXf: SKYF.xf, skyBounce: SKYF.bounce, lampOn: SKYF.lamp, lampCol: SKYF.lampCol }, BEDU);
    sh.vertexShader = 'varying vec3 vSkyP; varying vec3 vSkyN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      { vec4 sp = vec4( transformed, 1.0 ); vec3 sn = ${skyNormal};
      #ifdef USE_INSTANCING
        sp = instanceMatrix * sp; sn = mat3( instanceMatrix ) * sn;
      #endif
      sp = modelMatrix * sp; vSkyN = normalize( mat3( modelMatrix ) * sn ); vSkyP = sp.xyz + vSkyN * 0.15; }   // instanced pieces (the tree's leaves) at their own places`);
    sh.fragmentShader = 'uniform sampler2D skyField; uniform vec4 skyXf; uniform float skyBounce; uniform float lampOn; uniform vec3 lampCol; varying vec3 vSkyP; varying vec3 vSkyN;\n' +
      'uniform float bedOn; uniform vec4 bedRm[8]; uniform float bedZone[8]; uniform vec4 bedBay; uniform vec2 bedBayY; uniform vec4 bedPt[22]; uniform vec4 bedPtK[22]; uniform vec4 bedLn[14]; uniform vec4 bedLnA[14]; uniform float bedLnM[14]; uniform float bedFill[6]; uniform vec3 bedCol; uniform vec3 bedNightCol; uniform vec4 bedSpill; uniform vec4 bedOccA[4]; uniform vec4 bedOccB[4];\n' +
      sh.fragmentShader.replace('#include <aomap_fragment>', `{
        // three.js world (X, Z) is lot (-x, y); surfaces sample 150 mm in front of themselves, in the room they face
        // a double-sided sheet seen from its back (the lounge ceiling, drawn with its normal up) samples on the side
        // it is seen from, or its underside would count as roof and take the open sky
        vec3 skyN = gl_FrontFacing ? vSkyN : -vSkyN, skyP = gl_FrontFacing ? vSkyP : vSkyP - vSkyN * 0.3;
        vec2 skyUv = vec2( ( -skyP.x - skyXf.x ) * skyXf.z, ( skyP.z - skyXf.y ) * skyXf.w );
        vec3 sf = texture2D( skyField, skyUv ).rgb;
        // the ceiling height is read from the one cell, not blended: outdoor cells hold -99, and a blend with them
        // put a false ceiling low down near windows and walls
        vec2 skySz = vec2( textureSize( skyField, 0 ) );
        float skyCeil = texture2D( skyField, ( floor( skyUv * skySz ) + 0.5 ) / skySz ).g;
        // above the ceiling at this spot (roof, eaves, wall tops) or out in the open: full sky; inside: the room's share.
        // Tested at the surface itself, not the point in front of it: an upward face just under the ceiling (a cornice
        // step, the top of a frame) has that point above the ceiling line and would otherwise take the open sky
        bool outside = vSkyP.y - vSkyN.y * 0.15 > skyCeil + 0.02;
        float ambientOcclusion = outside ? 1.0 : sf.r + skyBounce;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        // bounced downlight: floors see the lit walls and ceiling, walls a bit less, the ceiling only what the floor
        // and walls send back up (about half)
        if ( !outside && lampOn > 0.0 ) reflectedLight.indirectDiffuse += lampOn * sf.b * ( 0.75 + 0.25 * normalize( skyN ).y ) * lampCol * BRDF_Lambert( material.diffuseColor );
        // proposed bedroom fittings, in the lot frame (x = -X, y = Z, z = Y), only inside their own room
        if ( !outside && bedOn > 0.0 ) {
          vec3 bw = vSkyP - vSkyN * 0.15, bn = normalize( skyN );
          vec3 P = vec3( -bw.x, bw.z, bw.y ), N = vec3( -bn.x, bn.z, bn.y );
          // which room a surface belongs to: decided at the point 150 mm in front of it (the side it faces), so a door leaf
          // or a wall face inside a wall's thickness counts with the room it looks into; reveals and edges that face along
          // the wall (no room in front) fall back to the nearest room around the surface itself
          vec3 Q = vec3( -skyP.x, skyP.z, skyP.y );
          int room = -1;
          for ( int r = 0; r < 8; r ++ ) { vec4 b = bedRm[ r ]; if ( Q.x >= b.x && Q.x <= b.z && Q.y >= b.y && Q.y <= b.w ) room = int( bedZone[ r ] + 0.5 ); }
          if ( room < 0 ) for ( int r = 0; r < 8; r ++ ) { vec4 b = bedRm[ r ]; if ( P.x >= b.x - 0.08 && P.x <= b.z + 0.08 && P.y >= b.y - 0.08 && P.y <= b.w + 0.08 ) room = int( bedZone[ r ] + 0.5 ); }   // rect 3 (hall) is zone 2 with the entry; rect 4 is bedroom 3
          // the front bedroom's bay: tested at the point in front (Q), like the rooms; testing behind the surface (P) put
          // the bay's outside faces in the bedroom, so they glowed with its lights at night
          if ( room < 0 && Q.y >= bedBayY.x - 0.02 && Q.y < bedRm[ 0 ].y ) {
            float t = clamp( ( bedBayY.y - Q.y ) / ( bedBayY.y - bedBayY.x ), 0.0, 1.0 );
            if ( Q.x >= mix( bedBay.x, bedBay.z, t ) - 0.02 && Q.x <= mix( bedBay.y, bedBay.w, t ) + 0.02 ) room = 0;
          }
          // the hall's light carries a little way into the kitchen through the full-width opening at the hall's end, fading
          // over ~1.5 m, so there is no hard edge on the floor where the hall's zone stops
          float wSpill = 1.0;
          if ( room < 0 && Q.x >= bedSpill.x && Q.x <= bedSpill.z && Q.y >= bedSpill.y && Q.y <= bedSpill.w ) { room = 2; wSpill = 1.0 - ( Q.y - bedSpill.y ) / ( bedSpill.w - bedSpill.y ); }
          if ( room >= 0 ) {
            float fl = 0.0; for ( int z = 0; z < 6; z ++ ) if ( z == room ) fl = bedFill[ z ];
            vec3 E = fl * ( 0.75 + 0.25 * N.z ) * bedCol;
            for ( int i = 0; i < 22; i ++ ) {
              if ( int( bedPtK[ i ].x + 0.5 ) != room || bedPt[ i ].w <= 0.0 ) continue;
              vec3 d = bedPt[ i ].xyz - P; float d2 = max( dot( d, d ), 0.0025 ); vec3 l = d * inversesqrt( d2 );
              float I = bedPt[ i ].w;
              float ca = dot( -l, normalize( vec3( bedPtK[ i ].zw, -1.0 ) ) );
              if ( bedPtK[ i ].y > 4.5 ) I *= smoothstep( 0.951, 0.988, ca );     // pin: 15 degree beam, soft edge to 36 (buffet, kept off the walls)
              else if ( bedPtK[ i ].y > 3.5 ) I *= smoothstep( 0.88, 0.97, -l.z );      // floor uplight: narrow beam straight up
              else if ( bedPtK[ i ].y > 2.5 ) I *= max( l.z, 0.0 );                 // down only (stone pendant): Lambertian about straight down
              else if ( bedPtK[ i ].y > 1.5 ) I *= smoothstep( 0.848, 0.951, ca );      // wash: 40 degree beam, soft edge to 64
              else if ( bedPtK[ i ].y > 0.5 ) I *= smoothstep( 0.906, 0.978, ca ); // reading spot: 24 degree beam, edge to 50
              E += I * max( dot( N, l ), 0.0 ) / d2 * bedCol;
            }
            for ( int i = 0; i < 14; i ++ ) {
              vec4 ln = bedLn[ i ], la = bedLnA[ i ];
              if ( int( la.w + 0.5 ) != room || la.z <= 0.0 ) continue;
              // mode 0 uplight: nothing below its edge; 1 floor strip: the floor only; +10: the strip runs along lot y (the
              // hall rails), so swap x and y and the same along-x maths applies
              float mm = bedLnM[ i ]; bool alongY = mm > 9.5; int mode = int( mod( mm, 10.0 ) + 0.5 );
              vec3 Pl = alongY ? P.yxz : P, Nl = alongY ? N.yxz : N;
              if ( mode == 0 && Pl.z < ln.w - 0.03 || mode == 1 && Pl.z > 0.15 || mode == 2 && Pl.z > ln.w + 0.03 ) continue;   // 2: down only (under-cupboard, pelmet)
              // continuous strip along lot x, Lambertian about its axis (no x part): integrated in closed form along
              // the strip, so it reads as an even line of light, not a row of hot spots
              vec3 ax = vec3( 0.0, la.x, la.y ), v = vec3( 0.0, ln.z - Pl.y, ln.w - Pl.z );
              float r = max( length( v ), 0.03 ); vec3 l0 = v / r;
              float s0 = ln.x - Pl.x, s1 = ln.y - Pl.x, r2 = r * r;
              float F0 = ( atan( s1 / r ) - atan( s0 / r ) ) / ( 2.0 * r2 * r ) + ( s1 / ( r2 + s1 * s1 ) - s0 / ( r2 + s0 * s0 ) ) / ( 2.0 * r2 );
              float F1 = 0.5 / ( r2 + s0 * s0 ) - 0.5 / ( r2 + s1 * s1 );
              float eN = max( dot( Nl, l0 ) * r2 * F0 + Nl.x * r * F1, 0.0 );
              E += la.z * max( dot( ax, -l0 ), 0.0 ) * eN * ( mode == 1 ? bedNightCol : bedCol );
            }
            reflectedLight.directDiffuse += E * wSpill * BRDF_Lambert( material.diffuseColor );
          }
        }
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, min( ambientOcclusion, 1.0 ), material.roughness );
        #endif
      }`);
  };
  mat.customProgramCacheKey = () => 'sky:' + src.type + (src.userData.skyRoomSide ? ':room' : '');
  return mat;
}
// Light-tightness: every surface receives sun shadows and every solid one casts them. Parts built over time set these
// flags piecemeal, and 138 meshes (door leaves, the shower door, trims) took full sun through walls and roofs while 350
// solid ones let it pass through them (closed doors among them). Glass stays out of the shadow map, so sun still
// comes in through windows; invisible collision boxes are left alone.
function sealShadows() {
  for (const g of Object.values(G)) g.traverse?.(o => {
    if (!o.isMesh || o.material?.visible === false) return;
    o.receiveShadow = true;
    if (!o.material?.transparent && !o.userData.noShadowCast) o.castShadow = true;   // lawn patches opt out (too many blades)
  });
}
function occludeInteriors() {
  sealShadows();
  // every surface of the building reads the field; whether a pixel is indoors is decided in the shader, per pixel,
  // from where it faces (so the two faces of one wall piece can differ). The garden and fences stay as they are.
  const clones = new Map();
  for (const g of [G.exterior, G.interior, G.floors, G.ceilings, G.furniture, G.roof]) g.traverse(o => {
    if (!o.isMesh || !o.material?.isMeshStandardMaterial || o.material.aoMap || o.material.userData.sky) return;
    let mat = clones.get(o.material.uuid);
    if (!mat) { mat = skyMaterial(o.material); mat.userData.sky = true; clones.set(o.material.uuid, mat); }
    o.material = mat;
  });
  mergeStatic();
}
// The house is ~3,200 small meshes (~4,800 draw calls a frame with the shadow pass), which made walking lag. Every plain
// static piece is merged into one mesh per material per 3 m cell (cells keep some frustum culling). The originals stay in
// place, hidden, so the walker's colliders and the sky-field rays still find them. Anything the app moves or reads on its
// own (doors, drawers, tagged fittings), transparent pieces, instanced meshes and odd attribute sets are left as they are.
function mergeStatic() {
  if (/[?&]nomerge\b/.test(location.search)) return;                 // ?nomerge: compare against the unmerged build
  const CELL = 3, rel = new THREE.Matrix4(), c = new THREE.Vector3();
  for (const g of [G.exterior, G.interior, G.floors, G.ceilings, G.furniture, G.roof, G.site]) {
    if (!g) continue;
    g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), buckets = new Map();
    g.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || o.userData.merged || o.userData.isMerged) return;
      const m = o.material, geo = o.geometry;
      if (!m || Array.isArray(m) || m.transparent || m.visible === false || o.renderOrder || geo.morphAttributes.position) return;   // a box's six face groups don't matter with one material
      for (let p = o; p && p !== g; p = p.parent) { if (!p.visible || Object.keys(p.userData).length) return; }
      const names = Object.keys(geo.attributes).sort();
      if (!geo.attributes.position || !geo.attributes.normal) return;
      if (names.some(n => { const at = geo.attributes[n]; return at.isInterleavedBufferAttribute || !(at.array instanceof Float32Array); })) return;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      c.copy(geo.boundingSphere.center).applyMatrix4(o.matrixWorld);
      const key = [m.uuid, o.castShadow, o.receiveShadow, names.map(n => n + geo.attributes[n].itemSize).join(), Math.floor(c.x / CELL), Math.floor(c.z / CELL)].join('|');
      let b = buckets.get(key); if (!b) buckets.set(key, b = { m, cast: o.castShadow, recv: o.receiveShadow, list: [] });
      b.list.push(o);
    });
    for (const b of buckets.values()) {
      if (b.list.length < 2) continue;
      const geos = b.list.map(o => {
        const q = o.geometry.clone(); q.clearGroups(); rel.multiplyMatrices(inv, o.matrixWorld); q.applyMatrix4(rel);
        if (!q.index) { const n = q.attributes.position.count, idx = new (n > 65535 ? Uint32Array : Uint16Array)(n); for (let i = 0; i < n; i++) idx[i] = i; q.setIndex(new THREE.BufferAttribute(idx, 1)); }
        return q;
      });
      const merged = mergeGeometries(geos, false);
      geos.forEach(q => q.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, b.m);
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.userData.isMerged = true;
      g.add(mesh);
      for (const o of b.list) { o.visible = false; o.userData.merged = true; }
    }
  }
}
occludeInteriors();

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
// Sky and bounce: a hemisphere light (sky colour from above, ground colour from below) and a neutral environment map
// for reflections. Both follow the sun's altitude, so the house goes through dusk into real darkness. No unshadowed
// fill lights: interiors are lit by sky through their openings, the sun where it lands, and the fittings.
const hemi = new THREE.HemisphereLight(0xbfd8f5, 0x8a7e6c, 0.6); scene.add(hemi);
// Reflection environment: a plain sky-to-ground gradient, the same in every compass direction. (A studio "room"
// environment has bright panels on some sides, which lit walls facing them more than others regardless of the
// house's real windows: a south-facing jamb glowed while the walls beside it stayed grey.)
{
  const g = new THREE.SphereGeometry(10, 32, 16), col = [], c = new THREE.Color(), sky = new THREE.Color(0xdfe9f4), hz = new THREE.Color(0xc9c6bf), gnd = new THREE.Color(0x7d7466);
  for (let i = 0; i < g.attributes.position.count; i++) {
    const y = g.attributes.position.getY(i) / 10;
    if (y >= 0) c.copy(hz).lerp(sky, Math.pow(y, 0.6)); else c.copy(hz).lerp(gnd, Math.pow(-y, 0.5));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const makeEnv = () => { scene.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02).texture; };
  makeEnv();
  // If the GPU drops the WebGL context (memory pressure, a driver reset, too much compiling at once) three.js restores
  // the context but not what lived only on the GPU: rebuild the reflection environment and mark every texture to be
  // uploaded again, or the textured surfaces (floors, joinery, stone) come back black.
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    makeEnv();
    scene.traverse(o => { for (const m of [o.material].flat()) if (m) { for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].needsUpdate = true; m.needsUpdate = true; } });
    if (SKYF.field.value) SKYF.field.value.needsUpdate = true;
  });
}
const sun = new THREE.DirectionalLight(0xfff6e8, 3.2);
sun.castShadow = true;
const touch = matchMedia('(pointer: coarse)').matches;
sun.shadow.mapSize.set(touch ? 2048 : 4096, touch ? 2048 : 4096);
const sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 50; sc.far = 450;
// A large depth bias detached shadows by ~20 cm, leaking sun under doors and walls.
sun.shadow.bias = -0.00001;
sun.shadow.normalBias = 0.002;
sun.target.position.copy(L(3.5, 14, 0));
scene.add(sun, sun.target);
// day/night state, 0 = night .. 1 = full day, ramped across civil twilight (sun 6° below to 6° above the horizon)
let daylight = 1;
// Night is city night, not country night. Windsor is 5 km from the CBD: Bortle 8-9, the zenith under about
// 18 mag/arcsec² (a dark site is 21.5+), so the sky never goes black. It glows a dull brownish grey from street and
// city light scattering off the air and cloud, and that glow plus street lights and neighbours' windows leave a
// garden dimly readable (a few tenths of a lux against 100-300 lux in a lit room). The hemisphere carries that glow.
const SKY = { day: new THREE.Color(0xcfe3f5), dusk: new THREE.Color(0xe9a878), night: new THREE.Color(0x2a2630) };
const HEMI = { day: new THREE.Color(0xbfd8f5), night: new THREE.Color(0x5a5256) }, GND = { day: new THREE.Color(0x8a7e6c), night: new THREE.Color(0x2a2622) };
const SUNC = { low: new THREE.Color(0xffb070), high: new THREE.Color(0xfff6e8) };
const smooth = t => t * t * (3 - 2 * t), clamp01 = t => Math.min(1, Math.max(0, t)), c = new THREE.Color();
function setSky(altitude) {
  const deg = altitude * 180 / Math.PI;
  daylight = smooth(clamp01((deg + 6) / 12));
  const dusk = 1 - Math.min(1, Math.abs(deg) / 8);                       // how close to the horizon, for the orange band
  scene.background = SKY.night.clone().lerp(SKY.day, daylight).lerp(SKY.dusk, 0.6 * dusk * Math.max(daylight, 0.15));
  hemi.color.copy(HEMI.night).lerp(HEMI.day, daylight); hemi.groundColor.copy(GND.night).lerp(GND.day, daylight);
  hemiBase = 0.035 + 0.6 * daylight;                                    // sun:sky about 5:1 on a sunlit wall, as outdoors
  scene.environmentIntensity = 0.03 + 0.6 * daylight;                 // the plain gradient is dimmer than the studio room it replaced
  sun.color.copy(SUNC.low).lerp(SUNC.high, clamp01(deg / 25));
  sun.intensity = deg > 0 ? 3.2 * smooth(clamp01(deg / 15)) : 0;
}

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
  setSky(altitude);
  applyLightMode();
  const si = document.getElementById('sunInfo'), deg = altitude * 180 / Math.PI;
  if (si) si.textContent = deg > 0 ? `sun ${deg.toFixed(0)}° up` : deg > -6 ? 'civil twilight' : 'night';
}

// Downlights, direct light: a fixed pool of spotlights (a fixed count keeps the shaders from recompiling as you move)
// re-aimed each frame onto the nearest fittings, the room you are in first. 110° beam with a fully soft edge,
// inverse-square falloff, no shadow maps: the reach is capped at 4 m so a fitting can't light the far side of a wall
// (no shadows means walls don't stop it), and the pool's outermost lights fade out rather than switch off as you walk.
// The bounce that fills the room (ceiling included) is the lamp field, which walls do stop and every fitting feeds.
const POOL = touch ? 6 : 8, pool = [];                                // every lit pixel pays for each one: 16 cost ~10 ms a frame at retina size
for (let i = 0; i < POOL; i++) {
  const s = new THREE.SpotLight(0xffecd6, 0, 4, THREE.MathUtils.degToRad(55), 1, 2);
  s.visible = false; scene.add(s, s.target); pool.push(s);
}
const lampMats = [];                                                     // the fittings' lenses, glowing when on
// Switching the downlights on or off changes the number of lights every material is built for, so each one's shader
// recompiles: done all at once on the main thread that froze the page for seconds (on a phone, long enough for the GPU
// to reset). Once the house is up, compile the other variant in the background (parallel compile where the browser
// has it), with the pool switched on at zero brightness, so the real switch later finds its shaders ready.
let precompiling = false;
async function precompileLights() {
  await new Promise(r => setTimeout(r, 1200));
  const want = pool[0].visible;
  precompiling = true;
  for (const s of pool) { s.visible = !want; s.intensity = 0; }
  try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn('precompile', e); }
  for (const s of pool) s.visible = want;
  precompiling = false;
}
let lightsManual = null;                                                 // auto by default: off in daylight, on after civil dusk (client 2026-10-21); true / false = switched by hand
const lightsOn = () => lightsManual ?? daylight < 0.55;
const DL_I = 1.7;                                                        // a fitting's brightness (candela, three.js units)
let hemiBase = 1;                                                        // sky level before the lit-room bounce is added
function applyLightMode() {
  const sunOnly = $('sunOnly')?.checked;
  hemi.visible = !sunOnly; scene.environmentIntensity = sunOnly ? 0 : scene.environmentIntensity;
  if (sunOnly) scene.background = new THREE.Color(0x000000);
  const on = lightsOn() && !sunOnly;
  for (const s of pool) s.visible = on;
  hemi.intensity = hemiBase;
  // indoors: sky light scaled to the room's share, plus (lights on) the lamp field's bounce, warm white
  SKYF.bounce.value = 0; SKYF.lamp.value = on ? 1 : 0;
  if (!lampMats.length) for (const g of Object.values(G)) g.traverse?.(o => { if (o.material?.userData?.lamp && !lampMats.includes(o.material)) lampMats.push(o.material); });
  for (const m of lampMats) m.emissiveIntensity = on ? 3 : 0;
  const lb = $('lights'); if (lb) lb.checked = lightsOn();
  if (typeof syncLightButton === 'function') syncLightButton();
  updateBedLights();
}
// level of a bedroom layer, 0..1: the Lights switch, the layer's own switch, and the room dimmer, which works the
// pendant and the robe-top strip (the reading spots and the night light are on their own switches, at full)
const bedLevel = layer => {
  if (layer === 'lGarden') return !document.getElementById('sunOnly')?.checked && lightsOn() && daylight < 0.55 ? 1 : 0;   // garden lights: night only, even if the house lights are switched on by day (client)
  if (layer.startsWith('hall') || /^[kl][A-Z]/.test(layer)) return !document.getElementById('sunOnly')?.checked && lightsOn() ? 1 : 0;   // hall, kitchen (k...), lounge (l...): on the house Lights
  if (document.getElementById('sunOnly')?.checked || !bedState[layer]) return 0;
  if (layer === 'pendant' || layer === 'angled' ? !lightsOn() : SECONDARY.includes(layer) && !secondaryOn) return 0;
  // each circuit on its own dimmer (trailing-edge, LED-rated): ceiling = downlights or pendant; secondary = robe strip,
  // the robe's floor strip, the wall downlight, the sheer uplight, corner downlights, reading spots
  return (SECONDARY.includes(layer) ? bedState.dimSec : bedState.dim) / 100;
};
// lumens on in a bedroom, the night light left out (it is too dim to count): for the fill and the eye's adaptation
const bedLumens = room => {
  const BL = G.ceilings.userData.bedLamps; if (!BL) return 0;
  return BL.points.filter(p => p.room === room).reduce((s, p) => s + p.lm * bedLevel(p.layer), 0) +
    BL.lines.filter(l => l.room === room && l.layer !== 'night').reduce((s, l) => s + l.lmPerM * (l.x1 - l.x0) * bedLevel(l.layer), 0);
};
// warm-dim: 2700 K at full, toward 2200 K dimmed, as an adapted eye sees it (the eye white-balances to the room, so white
// paint under 2700 K reads warm white, not tan; a little warmer than the downlights' 3000 K)
const WARM = { full: new THREE.Color(0xffecd6), dim: new THREE.Color(0xffcf9e) };
function updateBedLights() {
  const BLs = G.ceilings.userData.bedLamps;
  const on = !!BLs && !document.getElementById('sunOnly')?.checked;
  BEDU.bedOn.value = on ? 1 : 0;
  if (!bedMats) { bedMats = []; for (const g of Object.values(G)) g.traverse?.(o => { for (const m of [o.material].flat()) if (m?.userData?.bedLamp && !bedMats.includes(m)) bedMats.push(m); }); }
  for (const m of bedMats) m.emissiveIntensity = (m.userData.glowK ?? (m.userData.bedLamp === 'night' ? 1 : 3)) * bedLevel(m.userData.bedLamp);   // a woven shade glows less, so its weave reads
  if (!on) return;
  const rects = zoneRects(), b = spec.house.bay;
  rects.forEach((r, i) => { BEDU.bedRm.value[i].set(r.x0, r.y0, r.x1, r.y1); BEDU.bedZone.value[i] = ZONE_OF_RECT[i]; });
  if (BLs.points.length > NPT || BLs.lines.length > NLN) console.warn('bed lights: more sources than slots', BLs.points.length, BLs.lines.length);
  BEDU.bedBay.value.set(b.x0, b.x1, b.front_x0, b.front_x1); BEDU.bedBayY.value.set(spec.house.y_front_outer - b.projection, spec.house.y_front_outer);
  BEDU.bedPt.value.forEach((v, i) => {
    const p = BLs.points[i], k = BEDU.bedPtK.value[i];
    if (!p) { v.set(0, 0, 0, 0); k.set(-1, 0, 0, 0); return; }
    // omni pendant: lumens over 4 pi; reading spot: about 80% of its lumens in a 24 degree beam (~0.14 sr), the rest
    // in the soft edge; wash: the same in 40 degrees (~0.38 sr). Aim held as its tilt per metre of drop
    const I = p.kind === 'pin' ? 0.8 * p.lm / 0.054 : p.kind === 'spot' ? 0.8 * p.lm / 0.14 : p.kind === 'wash' ? 0.8 * p.lm / 0.38 : p.kind === 'down' ? p.lm / Math.PI : p.kind === 'up' ? 0.8 * p.lm / 0.24 : p.lm / (4 * Math.PI);   // down: Lambertian, I0 = lm / pi
    v.set(p.x, p.y, p.z, I * CD * bedLevel(p.layer)); k.set(BED_ROOMS.indexOf(p.room), { spot: 1, wash: 2, down: 3, up: 4, pin: 5 }[p.kind] || 0, p.ax || 0, p.ay || 0);
  });
  BEDU.bedLn.value.forEach((v, i) => {
    const l = BLs.lines[i], a = BEDU.bedLnA.value[i];
    if (!l) { v.set(0, 0, 0, 0); a.set(0, 0, 0, -1); return; }
    v.set(l.x0, l.x1, l.y, l.z); a.set(l.ay, l.az, l.lmPerM / Math.PI * CD * bedLevel(l.layer), BED_ROOMS.indexOf(l.room));   // peak cd per metre
    BEDU.bedLnM.value[i] = (l.mode || 0) + (l.along === 'y' ? 10 : 0);
  });
  const area = r => { const w = r.x1 - r.x0, d = r.y1 - r.y0, h = r.ceil; return 2 * (w * d + w * h + d * h); };
  const fill = z => bedLumens(BED_ROOMS[z]) * FILL_LM / rects.reduce((a, r, i) => a + (ZONE_OF_RECT[i] === z ? area(r) : 0), 0);
  for (let z = 0; z < NZONE; z++) BEDU.bedFill.value[z] = fill(z);
  // the hall's light spilling into the kitchen: the 1.5 m of kitchen beyond the hall's full-width opening
  const ext = spec.rooms.find(r => r.name === 'Hall extension');
  if (spec.renovation.hall_lights === 'art' && ext) BEDU.bedSpill.value.set(ext.x0, ext.y1, ext.x1, ext.y1 + 1.5); else BEDU.bedSpill.value.set(0, 0, 0, 0);
  // split-system boxes that cast shadows from the bedroom lights
  const occ = BLs.occ || [];
  BEDU.bedOccA.value.forEach((v, i) => { const o = occ[i]; if (o) v.set(...o.min, BED_ROOMS.indexOf(o.room)); else v.set(0, 0, 0, -1); });
  BEDU.bedOccB.value.forEach((v, i) => { const o = occ[i]; if (o) v.set(...o.max, 0); else v.set(0, 0, 0, 0); });
  BEDU.bedCol.value.copy(WARM.dim).lerp(WARM.full, Math.sqrt(Math.max(0, (bedState.dim - 5) / 95)));
  BEDU.bedNightCol.value.copy(WARM.full).lerp(WARM.dim, 1 - bedState.dimSec / 100);   // the floor strip is the top strip's 2700 K tape
}
// Eye adaptation: step inside by day and the exposure opens up over a second or two, as your eyes would.
let exposure = 1;
// Metering: like a phone camera, exposure follows what you are looking at, not only where you stand. Five rays from the
// view (centre and four around it) find the surfaces in view; each reads the light grid 150 mm in front of itself,
// as the shaders do. Their log-average sets two thirds of the level and the spot you stand on the rest, so looking
// from the dim hall into the kitchen exposes for the kitchen instead of blowing it out and then snapping down as you
// step through.
const meterRay = new THREE.Raycaster(), meterNdc = [[0, 0], [0.35, 0.2], [-0.35, 0.2], [0.35, -0.25], [-0.35, -0.25]].map(([x, y]) => new THREE.Vector2(x, y));
const meterN = new THREE.Vector3(), meterP = new THREE.Vector3();
let meterShare = 1, meterTick = 0;
const shareAt = (p, y) => (y < ceilOver(-p.x, p.z) ? skyAt(-p.x, p.z) : 1);   // three-space point -> sky share there (1 outdoors)
function meter() {
  const targets = [G.exterior, G.interior, G.floors, G.ceilings, G.furniture, G.roof].filter(g => g.visible);
  let sum = 0, n = 0;
  for (const ndc of meterNdc) {
    meterRay.setFromCamera(ndc, camera); meterRay.far = 25;
    const h = meterRay.intersectObjects(targets, true).find(h => h.object.isMesh && h.object.material?.visible !== false && !h.object.material?.transparent);
    let s = 1;
    if (h) { meterN.copy(h.face.normal).transformDirection(h.object.matrixWorld); meterP.copy(h.point).addScaledVector(meterN, 0.15); s = shareAt(meterP, meterP.y); }
    sum += Math.log(Math.max(s, 0.03)); n++;
  }
  meterShare = Math.exp(sum / n);
}
let lastAdapt = performance.now();
function adaptExposure() {
  // indoors = under a ceiling, read from the light grid, so a doorway or the gap between two rooms (which belong to
  // neither room's outline) doesn't count as stepping outside
  const lx = -camera.position.x, ly = camera.position.z;
  const under = camera.position.y < ceilOver(lx, ly), inside = walk.on && under;
  if (inside && ++meterTick % 6 === 0) meter();                           // ten times a second is plenty
  const here = inside ? Math.exp((2 / 3) * Math.log(Math.max(meterShare, 0.03)) + (1 / 3) * Math.log(Math.max(skyAt(lx, ly), 0.03))) : 1;
  // Exposure opens by (1 / share) ^ 0.6 over the outdoor setting, so a white wall indoors renders at share ^ 0.4 of the
  // same wall outdoors: the lounge about 60%, a bedroom 50%, the closed hall about 35%. Outdoors 0.85.
  // At night: indoors with the lights on, the downlights set the level (1.3: white walls read as warm white, as they do to an eye adapted to the room). With them off, or out in the garden, the
  // eye opens right up to the city glow (about 3), so the garden is dim and flat but readable, as it is on a real
  // Melbourne night, and a lit window reads as blazing from outside.
  const dayIn = Math.min(4.5, 0.85 * (1 / Math.max(here, 0.06)) ** 0.6);
  // an orbit camera inside a room (under a ceiling) takes the indoor night level too: it took the garden's 3 and
  // washed lit rooms out from dusk on
  let nightT = under && lightsOn() ? 1.3 : 3;
  // in a bedroom with the proposed lighting the eye adapts to what is on there: a dimmed evening scene opens up a
  // little, the night light alone about as far as the garden at night
  const zi = under ? zoneRects().findIndex((r, i) => lx >= r.x0 && lx <= r.x1 && ly >= r.y0 - (i === 0 ? 0.6 : 0) && ly <= r.y1) : -1;
  const zone = zi >= 0 ? BED_ROOMS[ZONE_OF_RECT[zi]] : null;
  if (zone && (lightsOn() || bedLumens(zone) > 0)) nightT = THREE.MathUtils.clamp(1.3 * Math.sqrt(4500 / Math.max(bedLumens(zone), 1)), 1.3, 3.2);
  const dayT = inside ? dayIn : 0.85;
  const target = nightT + (dayT - nightT) * daylight;
  // settle in about a second whatever the frame rate: quick enough to follow you, slow enough not to flick
  const now = performance.now(), dt = Math.min(0.25, (now - lastAdapt) / 1000); lastAdapt = now;
  exposure += (target - exposure) * (1 - Math.exp(-dt / 0.35));
  renderer.toneMappingExposure = exposure;
}
const focus = new THREE.Vector3(), fwd = new THREE.Vector3();
function placeLights() {
  if (precompiling) return;
  if (!pool[0].visible || !G.ceilings.userData.downlights.length) return;
  // the fittings nearest what you're looking at, whichever room they're in: rank from a point 2.5 m ahead of you (in
  // Walk; the orbit target in Orbit), so a kitchen seen from the lounge keeps its scallops on the cupboards
  if (walk.on) { camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); focus.copy(camera.position).addScaledVector(fwd, 2.5); }
  else focus.copy(controls.target);
  const fx = -focus.x, fy = focus.z;
  const near = G.ceilings.userData.downlights.map(d => ({ d, k: Math.hypot(d.x - fx, d.y - fy) })).sort((a, b) => a.k - b.k);
  const edge = near[POOL]?.k ?? Infinity;                                  // the first fitting left out: the last few fade toward it
  pool.forEach((s, i) => {
    const e = near[i];
    if (!e) { s.intensity = 0; return; }
    s.position.copy(L(e.d.x, e.d.y, e.d.z - 0.02)); s.target.position.copy(L(e.d.x, e.d.y, e.d.z - 2.5));
    s.intensity = DL_I * Math.min(1, (edge - e.k) / 1.5);
  });
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
bind('day', refreshSun);
// moving the time hands the lights back to auto (off by day, on at night); bedroom scenes set the time with a synthetic event and keep theirs
bind('time', e => { if (e?.isTrusted) lightsManual = null; refreshSun(); if (e) applyLightMode(); });
$('lights').addEventListener('change', () => { lightsManual = $('lights').checked; applyLightMode(); });
bind('sunOnly', () => { applyLightMode(); if (!$('sunOnly').checked) refreshSun(); });
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
const walk = { on: false, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, vel: new THREE.Vector3(), eye: 1.5, move: { x: 0, y: 0 }, joyId: null, lookId: null, last: null, clock: new THREE.Clock() };
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
  const S = spec.site_items, sd = S.side_deck;
  for (const d of spec.renovation?.deck_zones || []) if (x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1) return d.z;   // the back deck and its steps
  if (sd && x >= sd.x0 && x <= sd.x1 && y >= spec.chimney.y1 && y <= sd.y1) return S.west_path.z + sd.h;   // side deck
  for (const k of ['rear_slab', 'west_path', 'front_path', 'front_garden']) {
    const z = S[k]; if (x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) return z.z;
  }
  return spec.site.ground_z;
}
// solid boxes the walker can't pass: every wall piece, window, fixture, fence and the shed,
// plus furniture while it's shown (a round top or foot counts as its square footprint).
// Door leaves and gates are excluded, and so are floors, ceilings and roofs.
const colliders = [], doors = [], doorLeaves = [];
function collectSolids() {
  scene.updateMatrixWorld(true);
  colliders.length = doors.length = doorLeaves.length = 0;
  const solid = [G.exterior, G.interior, G.site];
  if (G.furniture.visible) solid.push(G.furniture);
  for (const grp of solid) grp.traverse(o => {
    if (!o.isMesh || o.userData.door || !o.geometry.parameters) return;
    const t = o.geometry.type, p = o.geometry.parameters;
    if (t !== 'BoxGeometry' && !(t === 'CylinderGeometry' && grp === G.furniture)) return;
    // a cylinder only works as an upright post: one laid on its side (washer door, knob) would block an endless strip
    if (t === 'CylinderGeometry' && (Math.abs(o.rotation.x) > 0.01 || Math.abs(o.rotation.z) > 0.01)) return;
    // half-size from the geometry's own bounds: a RoundedBoxGeometry reports 1 x 1 x 1 in its parameters whatever its real
    // size (it scales a unit box), which turned every table leg, seat pad and sofa cushion into an invisible 1 m square
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const gb = o.geometry.boundingBox;
    const [hx, hz] = t === 'BoxGeometry' ? [(gb.max.x - gb.min.x) / 2, (gb.max.z - gb.min.z) / 2] : [p.radiusTop, p.radiusTop];
    const bb = new THREE.Box3().setFromObject(o);
    colliders.push({ inv: o.matrixWorld.clone().invert(), hx, hz, y0: bb.min.y, y1: bb.max.y, mesh: o, bb });
  });
  house.traverse(o=>{if(o.userData.operable) doors.push(o);});
  for (const grp of [G.exterior, G.interior, G.site]) grp.traverse(o => { if (o.isMesh && o.userData.door) doorLeaves.push(o); });
  skyWalls = null; buildSkyField();
}
bind('furn', () => { G.furniture.visible = $('furn').checked; collectSolids(); });
// Rebuild the house from the base spec with new reno settings; keeps the Layers toggles
function rebuild() {
  spec = applyReno(baseSpec, reno);
  const old = [...house.children], mats = new Set();
  house.clear();
  for (const g of old) g.traverse(o => {
    if (!o.geometry?.userData.keep) o.geometry?.dispose();
    if (o.isReflector) o.getRenderTarget().dispose();                     // the entry mirror's reflection target
    for (const m of [o.material].flat()) if (m) mats.add(m);
  });
  for (const m of mats) { if (!m.map?.userData.keep) m.map?.dispose(); m.dispose(); }
  G = buildHouse(spec);
  for (const k of Object.keys(G)) house.add(G[k]);
  G.roof.visible = $('roof').checked; G.ceilings.visible = $('ceil').checked; G.labels.visible = $('labels').checked;
  G.furniture.visible = $('furn').checked;
  bedMats = null; occludeInteriors(); applyLightMode();
  collectSolids();
}
const BODY_R = 0.18, tmp = new THREE.Vector3();
const aimRay = new THREE.Raycaster();
function nearestDoor() {
  const forward = camera.getWorldDirection(new THREE.Vector3());
  // whatever door or drawer is under the middle of the view, within reach, wins outright (a low drawer is otherwise
  // further from the eye than the tall doors beside it)
  aimRay.set(camera.position, forward); aimRay.far = 2.1;
  const hit = aimRay.intersectObjects(doorLeaves, false)[0];
  for (let o = hit?.object; o; o = o.parent) if (o.userData.operable) return o;
  let best=null, score=Infinity;
  for(const door of doors) {
    const bb=new THREE.Box3().setFromObject(door), near=bb.clampPoint(camera.position,new THREE.Vector3());
    const delta=near.sub(camera.position), distance=delta.length();
    if(distance>2.1 || (distance>0.25 && delta.normalize().dot(forward)<0.15))continue;
    // prefer what you're looking at: stacked cupboard doors are equally close, so aim decides between them
    const aim=bb.getCenter(new THREE.Vector3()).sub(camera.position).normalize().dot(forward);
    const s=distance+1.5*(1-aim);
    if(s<score){score=s;best=door;}
  }
  return best;
}
function poseDoor(door,t) {
  for(const pivot of door.children) {
    pivot.position.copy(pivot.userData.closedPosition);
    if(pivot.userData.slide) pivot.position.addScaledVector(pivot.userData.slide,t);
    else if(pivot.userData.tilt) pivot.rotation[pivot.userData.tiltAxis]=pivot.userData.tilt*t;   // drop-down doors: oven, dishwasher
    else pivot.rotation.y=pivot.userData.swing*t;
  }
  door.updateWorldMatrix(true,true);
}
// Doors animate between closed (0) and open (1). A door never refuses to move: it passes through the
// walker, and the walker can step out of it (see stepWalk). Tapping again mid-swing reverses it.
const DOOR_SECONDS = { swing: 0.55, slide: 0.45 };
const easeInOut = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function toggleDoor(door) {
  const d = door.userData;
  d.u ??= d.open ? 1 : 0;
  d.open = !d.open;
  return true;
}
let skyDirty = false;
function animateDoors(dt) {
  if (skyDirty) { skyDirty = false; buildSkyField(); }
  for (const door of doors) {
    const d = door.userData, target = d.open ? 1 : 0;
    d.u ??= target;
    if (d.u === target) continue;
    const slides = door.children.some(p => p.userData.slide);
    const step = dt / (slides ? DOOR_SECONDS.slide : DOOR_SECONDS.swing);
    d.u = target > d.u ? Math.min(target, d.u + step) : Math.max(target, d.u - step);
    poseDoor(door, easeInOut(d.u));
    if (d.u === target) skyDirty = true;                                   // settled: let light through (or stop it)
  }
}
function interactDoor() { const d=nearestDoor(); if(d)toggleDoor(d); else showToast('Move closer and face a door'); }
const doorButton=document.createElement('button');
doorButton.style.cssText='position:fixed;right:18px;bottom:110px;padding:12px 18px 12px 14px;border:0;border-radius:12px;background:#f8f7f3;z-index:12;display:inline-flex;align-items:center;gap:8px';
// door icon, label, and the E key hint on keyboard devices only (phones just say Open door)
doorButton.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V3h12v18"/><circle cx="14.5" cy="12" r="0.9" fill="currentColor"/></svg>'
  +'<span class="dl"></span>'+(touch?'':'<kbd style="font:inherit;font-size:12px;font-weight:600;padding:2px 7px;border-radius:6px;border:1px solid rgba(31,36,39,0.25);background:#fff">E</kbd>');
const doorLabel=doorButton.querySelector('.dl');
doorButton.hidden=true; document.body.appendChild(doorButton);
// act on the touch itself: a click never fires while another finger is down (holding the joystick), so use pointerdown,
// which works alongside it. Keyboard activation (Enter/Space, detail 0) still arrives as a click.
doorButton.style.touchAction='manipulation';
doorButton.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();interactDoor();});
doorButton.addEventListener('click',e=>{if(e.detail===0)interactDoor();});
// Lights on/off: a round button above the door button, always there (walk or orbit), and the L key. Same switch as the
// Lights chip in the Sun panel; the first press takes it off automatic (on after dusk).
const lightButton=document.createElement('button');
lightButton.id='lightButton'; lightButton.setAttribute('aria-label','Lights');
lightButton.style.cssText='position:fixed;right:18px;bottom:172px;width:48px;height:48px;padding:0;border:0;border-radius:50%;z-index:12;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;box-shadow:0 1px 4px rgba(0,0,0,0.25)';
lightButton.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path class="bulb" d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>';
document.body.appendChild(lightButton);
// Front door: a round button above the lights button. In Walk it takes you back to just inside the front door; from
// the overview it starts Walk there.
const homeButton=document.createElement('button');
homeButton.setAttribute('aria-label','Back to the front door'); homeButton.title='Back to the front door';
homeButton.style.cssText='position:fixed;right:18px;bottom:234px;width:48px;height:48px;padding:0;border:0;border-radius:50%;z-index:12;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;background:#f8f7f3;color:#1f2427;box-shadow:0 1px 4px rgba(0,0,0,0.25)';
homeButton.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>';
document.body.appendChild(homeButton);
const goHome=()=>{ if (!walk.on) setWalk(true); else toFrontDoor(); saveView(); showToast('Back at the front door'); };
homeButton.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();goHome();});
homeButton.addEventListener('click',e=>{if(e.detail===0)goHome();});
const toggleLights=()=>{ lightsManual=!lightsOn(); applyLightMode(); showToast(lightsOn()?'Lights on':'Lights off'); };
lightButton.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();toggleLights();});
lightButton.addEventListener('click',e=>{if(e.detail===0)toggleLights();});
function syncLightButton(){
  const b=document.getElementById('lightButton'); if(!b) return;
  const on=lightsOn();
  b.style.background=on?'#f6c96a':'#f8f7f3'; b.style.color=on?'#3a2a06':'#1f2427';
  b.querySelector('.bulb').setAttribute('fill',on?'#fff3cf':'none');
  b.setAttribute('aria-pressed',String(on));
}
syncLightButton();
function updateDoorHint(){
  const door=walk.on?nearestDoor():null;
  doorButton.hidden=!door;
  const what=door&&door.userData.kind==='shutter'?'shutter':'door';
  const text=door&&(door.userData.open?'Close '+what:'Open '+what);
  if(door&&doorLabel.textContent!==text)doorLabel.textContent=text;
}

function blocked(p, floorY, withDoors = true) {
  const feet = floorY + 0.42, head = floorY + 1.85;          // steps up to 0.42 (the two back-door risers) can be climbed; sills and benches block
  const moving = !withDoors ? [] : doorLeaves.map(mesh => {
    mesh.updateWorldMatrix(true,false);
    const p=mesh.geometry.parameters, bb=new THREE.Box3().setFromObject(mesh);
    if(!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox(); const gb=mesh.geometry.boundingBox;
    return {inv:mesh.matrixWorld.clone().invert(),hx:(gb.max.x-gb.min.x)/2,hz:(gb.max.z-gb.min.z)/2,y0:bb.min.y,y1:bb.max.y};
  });
  for (const c of [...colliders, ...moving]) {
    if (c.y1 <= feet || c.y0 >= head) continue;
    tmp.copy(p).applyMatrix4(c.inv);
    // round body: distance from the body centre to the nearest point of the box footprint
    const dx = Math.max(Math.abs(tmp.x) - c.hx, 0), dz = Math.max(Math.abs(tmp.z) - c.hz, 0);
    if (dx * dx + dz * dz < BODY_R * BODY_R - 1e-6) return true;
  }
  return false;
}
function walkFov() {
  // about 90 degrees across the screen, like a person's comfortable field of view. The vertical angle is capped
  // at 75: a taller one (portrait phones reached 110) stretches the top of the frame, so door heads and
  // ceilings loom and the walker feels taller than the 1.5 m eye height really is.
  const h = THREE.MathUtils.degToRad(90);
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / camera.aspect)), 55, 75);
}
$('ctx').addEventListener('input', e => { if (e.isTrusted) walk.autoCtx = false; });
// on the front porch, at its street edge, centred on the front door (at the back of the recessed porch) and facing it
function toFrontDoor() {
  const fd = spec.doors.front;
  camera.position.copy(L((fd.x0 + fd.x1) / 2, spec.house.porch.y0 + 0.2, 1.6));
  walk.yaw = walk.tYaw = Math.PI; walk.pitch = walk.tPitch = 0; walk.vel.set(0, 0, 0);   // facing +Z (south)
}
function setWalk(on) {
  walk.on = on; controls.enabled = !on; camera.userData.walk = on;
  // first person: neighbours and street come on (the overview keeps them off by default); leaving walk mode turns
  // them back off, unless they were switched by hand in the meantime
  if (on && !$('ctx').checked) { $('ctx').checked = true; $('ctx').dispatchEvent(new Event('input')); walk.autoCtx = true; }
  else if (!on && walk.autoCtx) { if ($('ctx').checked) { $('ctx').checked = false; $('ctx').dispatchEvent(new Event('input')); } walk.autoCtx = false; }

  camera.fov = on ? walkFov() : 50; if (!on) fitCamera(); camera.near = on ? 0.05 : 0.1; camera.updateProjectionMatrix();
  wbtn.setAttribute('aria-pressed', String(on)); $('walkLabel').textContent = on ? 'Orbit' : 'Walk';
  joy.hidden = !on;
  window.closeSheets?.();
  if (on) {
    // start on the front porch, facing the front door
    toFrontDoor();
    showToast('WASD or joystick to walk · E to open/close doors · Q/R for height');
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
addEventListener('keydown', e => {
  if (e.key.toLowerCase()==='m' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault(); document.body.classList.toggle('clean'); return;      // hide / show all on-screen controls (screen recording)
  }
  if (e.key.toLowerCase()==='l') { if (!e.repeat) { e.preventDefault(); toggleLights(); } return; }
  if (e.key.toLowerCase()==='e') { if (!e.repeat && walk.on) { e.preventDefault(); interactDoor(); } return; }
  keys[e.key.toLowerCase()] = true;
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function stepWalk() {
  // anything that set yaw/pitch directly (start of walk, tests) becomes the new target
  if (walk.lastYaw !== undefined && (walk.yaw !== walk.lastYaw || walk.pitch !== walk.lastPitch)) { walk.tYaw = walk.yaw; walk.tPitch = walk.pitch; }
  const dt = Math.min(walk.clock.getDelta(), 0.05);
  if (!walk.on) return;
  let mx = walk.move.x, my = walk.move.y;
  if (keys['w'] || keys['arrowup']) my += 1; if (keys['s'] || keys['arrowdown']) my -= 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1; if (keys['d'] || keys['arrowright']) mx += 1;
  const ed = walk.eyeDir + (keys['r'] ? 1 : 0) - (keys['q'] ? 1 : 0);
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
  // a door that swung into the walker doesn't trap them: while standing inside a leaf, leaves are ignored
  const doorsSolid = !(blocked(p, fy) && !blocked(p, fy, false));
  const tryX = p.clone(); tryX.x += step.x; if (!blocked(tryX, floorAt(tryX), doorsSolid)) p.x = tryX.x;
  const tryZ = p.clone(); tryZ.z += step.z; if (!blocked(tryZ, floorAt(tryZ), doorsSolid)) p.z = tryZ.z;
  camera.position.y = floorAt(p) + walk.eye;
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  walk.lastYaw = walk.yaw; walk.lastPitch = walk.pitch;

}

// --- reno: covered-area roof raise and floor build-up, entered in cm -------------
const RENO = [['roofRaise', 'renoRoof', 'renoRoofN'], ['floorBuildup', 'renoFloor', 'renoFloorN']];
// the number box follows the slider live; the model rebuilds when the finger lifts (a rebuild takes a moment on phones)
function setReno(key, cmVal, from, build = true) {
  const [, rangeId, numId] = RENO.find(r => r[0] === key);
  const v = Math.max(0, Math.round(Number(cmVal) || 0));
  if (from !== rangeId) $(rangeId).value = Math.min(v, Number($(rangeId).max));
  if (from !== numId) $(numId).value = v;
  reno[key] = v / 100;
  try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
  renoSummary();
  if (build) rebuild();
}
for (const [key, rangeId, numId] of RENO) {
  $(rangeId).value = $(numId).value = Math.round(reno[key] * 100);
  $(rangeId).addEventListener('input', () => setReno(key, $(rangeId).value, rangeId, false));
  $(rangeId).addEventListener('change', () => setReno(key, $(rangeId).value, rangeId));
  $(numId).addEventListener('change', () => setReno(key, $(numId).value, numId));
}
// lounge TV unit
// front bedroom bed: none, queen or king
// hall: open straight through (false), classic cased archway (true) or simple archway ('simple')
const hallKey = v => v === 'simple' || v === 'door' || v === 'arch' ? v : v ? 'classic' : 'open';
for (const [key, id] of [['skylight', 'renoSkylight'], ['hallAmalfi', 'renoAmalfi'], ['openingRaise', 'renoOpening'], ['kitchenTall', 'renoTall'], ['noPantry', 'renoNoPantry'], ['bedside', 'renoBedside'], ['whiteWoodwork', 'renoWhite'], ['creamExterior', 'renoCream'], ['bayHood', 'renoBayHood'], ['porchScreen', 'renoScreen'], ['sidePavers', 'renoPavers'], ['glassWall', 'renoGlassWall'], ['curtains', 'renoCurtains'], ['shutters', 'renoShutters']]) {
  $(id).checked = !!reno[key];
  $(id).addEventListener('change', () => {
    reno[key] = $(id).checked;
    try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {}
    renoSummary(); rebuild();
  });
}
// kitchen: fridge position and island
const LAUNDRY_KEYS = ['pantry', 'bathCorner', 'bathCornerFold', 'bathCornerLow', 'bathCornerStore', 'bathBench', 'none'];
// Moodboard pendants also sit at the bottom of the Pendant and Hall pendants dropdowns: picking one turns the switch
// on (bedrooms and hall together); picking a Lucci one turns it off
const MOOD = baseSpec.renovation.mood_pendants?.items || {};
const moodOn = () => !!reno.moodPendants && !!MOOD[reno.moodPendant];
const moodPick = v => { const id = v.startsWith('mood:') ? v.slice(5) : null; reno.moodPendants = !!id; if (id) reno.moodPendant = id; return !!id; };
for (const k of ['pend', 'hpend']) document.querySelector(`select[data-pick="${k}"]`).insertAdjacentHTML('beforeend', `<optgroup label="Moodboard (bedrooms and hall)">${Object.entries(MOOD).map(([id, p]) => `<option value="mood:${id}">${p.name}, ${p.d_mm} x ${p.h_mm} (${p.price})</option>`).join('')}</optgroup>`);
// every choice in the Reno sheet is a dropdown: [read the saved value, store a new one]
const PICKS = {
  kstyle: [() => reno.kitchenStyle || 'white', v => { reno.kitchenStyle = v; }],
  kdoor: [() => reno.kitchenDoor, v => { reno.kitchenDoor = v; }],
  fridge: [() => reno.fridge, v => { reno.fridge = v; }],
  dt: [() => reno.diningTable || 'oak', v => { reno.diningTable = v; }],
  sideboard: [() => reno.sideboard === true ? 'portobello' : reno.sideboard || 'none', v => { reno.sideboard = v === 'none' ? false : v; }],
  lfence: [() => reno.loungeFence || 'screen', v => { reno.loungeFence = v; }],
  lstyle: [() => reno.loungeStyle === 'fireplace' ? 'walnut' : reno.loungeStyle || 'standard', v => { reno.loungeStyle = v; }],
  tvu: [() => reno.tvUnit || 'white', v => { reno.tvUnit = v; }],
  ct: [() => reno.coffeeTable || 'round', v => { reno.coffeeTable = v; }],
  bd: [() => reno.backDoors || 'current', v => { reno.backDoors = v; }],
  laundry: [() => reno.laundry, v => { reno.laundry = v; }],
  fbed: [() => reno.frontBed, v => { reno.frontBed = v; }],
  blight: [() => reno.bedLights || 'pendant', v => { reno.bedLights = v; }],
  pend: [() => moodOn() ? 'mood:' + reno.moodPendant : reno.pendant || 'augustOval', v => { if (!moodPick(v)) reno.pendant = v; }],
  hlight: [() => reno.hallLights === 'downlights' ? 'downlights' : 'art', v => { reno.hallLights = v; }],
  hdl: [() => ['recessed', 'tube'].includes(reno.hallDl) ? reno.hallDl : 'small', v => { reno.hallDl = v; }],
  hpend: [() => moodOn() ? 'mood:' + reno.moodPendant : reno.hallPendant || 'pebble', v => { if (!moodPick(v)) reno.hallPendant = v; }],
  art: [() => reno.art || 'v2', v => { reno.art = v; }],
  decor: [() => reno.decor || 'styled', v => { reno.decor = v; }],
  yard: [() => reno.yard || 'deck', v => { reno.yard = v; }],
  bayseat: [() => reno.baySeat || 'on', v => { reno.baySeat = v; }],
  kllight: [() => reno.klLights || 'designed', v => { reno.klLights = v; }],
  hall: [() => hallKey(reno.hallDoorway), v => { reno.hallDoorway = { open: false, classic: true, simple: 'simple', door: 'door', arch: 'arch' }[v]; }],
};
document.querySelectorAll('select[data-pick]').forEach(s => s.addEventListener('change', () => {
  PICKS[s.dataset.pick][1](s.value); saveReno(); renoSummary(); rebuild(); if (s.dataset.pick === 'blight') syncBedUI();
}));
const saveReno = () => { try { localStorage.setItem(RENO_KEY, JSON.stringify(reno)); } catch {} };
// keep every control showing the saved choice; product notes read store · price · size
function renoSummary() {
  const cat = baseSpec.renovation, note = u => u ? [u.store, u.price, u.size_cm && u.size_cm + ' cm'].filter(Boolean).join(' · ') : '';
  const pick = k => document.querySelector(`select[data-pick="${k}"]`);
  for (const [k, [get]] of Object.entries(PICKS)) pick(k).value = get();
  // the IKEA kitchen has its own integrated fridge and full-height units; the pantry spot goes with the pantry wall
  const ikea = ['ikea', 'walnut', 'cream', 'std', 'stdWhite', 'secondhand', 'gloss', 'glossL', 'glossOak'].includes(reno.kitchenStyle);   // built-in fridge: the IKEA layout and its standard-size L
  // the Amalfi switch overrides the hall's Lighting and pendant choices; its own picker only counts while it's on
  pick('hlight').disabled = pick('hpend').disabled = !!reno.hallAmalfi; pick('hdl').disabled = !reno.hallAmalfi;
  pick('fridge').disabled = ikea; $('renoTall').disabled = ikea;
  pick('kdoor').disabled = ['std', 'stdWhite', 'secondhand', 'gloss', 'glossL', 'glossOak'].includes(reno.kitchenStyle);   // the standard L keeps the window over its sink
  pick('fridge').querySelector('[value=pantry]').disabled = reno.noPantry;
  pick('laundry').querySelector('[value=pantry]').disabled = reno.fridge === 'pantry' || reno.noPantry;
  $('renoDtNote').textContent = note(cat.dining_tables?.[(reno.diningTable || 'oak').replace('Ext', '')]);
  $('renoSbNote').textContent = note(cat.sideboards?.[PICKS.sideboard[0]()]);
  pick('tvu').disabled = reno.loungeStyle !== 'standard';   // the walnut + stone wall has its own run
  $('renoTvuNote').textContent = note(cat.tv_units?.[reno.tvUnit || 'white']);
  $('renoCtNote').textContent = note(cat.coffee_tables?.[reno.coffeeTable || 'round']);
  const bd = cat.back_doors?.[reno.backDoors || 'current'];
  $('renoBdNote').textContent = bd?._note || '';
  $('renoBdLink').hidden = !bd?.url; if (bd?.url) $('renoBdLink').href = bd.url;   // the seller's listing, when we have it
  syncMood();
}
// Moodboard pendants: one switch (on the Bedroom and Hall tabs, kept in step) hangs the picked pendant from the
// moodboard's Lighting tab in the bedrooms and down the hall at once; each card shows its photo, size and price
const mm = p => `Ø ${p.d_mm} × ${p.h_mm} mm`;
document.querySelectorAll('[data-mood]').forEach((box, i) => {
  box.innerHTML = `<label class="sw"><span>Moodboard pendants (bedrooms and hall)</span><input type="checkbox" data-mood-on><span class="tk"></span></label>
    <div class="mood-list" role="radiogroup" aria-label="Moodboard pendant">${Object.entries(MOOD).map(([id, p]) => `
      <button type="button" class="mcard" role="radio" data-mood-id="${id}" title="${p.size_note || ''}"><img src="./assets/pendants/${id}.jpg" alt="" loading="lazy"><span class="mt"><b>${p.name}</b><span class="ms">${mm(p)}</span><span class="mp">${p.price}</span></span></button>`).join('')}</div>`;
  box.querySelector('[data-mood-on]').addEventListener('change', e => {
    reno.moodPendants = e.target.checked;
    if (reno.moodPendants && !MOOD[reno.moodPendant]) reno.moodPendant = Object.keys(MOOD)[0] || '';
    saveReno(); renoSummary(); rebuild();
  });
  box.querySelectorAll('[data-mood-id]').forEach(b => b.addEventListener('click', () => { reno.moodPendant = b.dataset.moodId; saveReno(); renoSummary(); rebuild(); }));
});
function syncMood() {
  const on = moodOn();
  document.querySelectorAll('[data-mood-on]').forEach(c => { c.checked = on; });
  document.querySelectorAll('.mood-list').forEach(l => { l.hidden = !on; });
  document.querySelectorAll('[data-mood-id]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.moodId === reno.moodPendant)));
}
if (!(reno.fridge in FRIDGE_SPOTS)) reno.fridge = 'none';
$('renoIsland').checked = !!reno.island;
if (reno.laundry === true) reno.laundry = 'pantry';
if (reno.laundry === 'bathStack' || reno.laundry === 'bathCombo') reno.laundry = 'bathCorner';   // retired options: nearest stacked design
if (reno.laundry === false || !LAUNDRY_KEYS.includes(reno.laundry)) reno.laundry = 'none';
if (!['single', 'none'].includes(reno.kitchenDoor)) reno.kitchenDoor = 'double';
$('renoIsland').addEventListener('change', () => { reno.island = $('renoIsland').checked; saveReno(); renoSummary(); rebuild(); });
$('renoReset').addEventListener('click', () => {
  for (const [key] of RENO) setReno(key, RENO_DEFAULT[key] * 100, null, false);
  Object.assign(reno, { kitchenStyle: RENO_DEFAULT.kitchenStyle, kitchenTall: RENO_DEFAULT.kitchenTall, noPantry: RENO_DEFAULT.noPantry, frontBed: RENO_DEFAULT.frontBed, bedside: RENO_DEFAULT.bedside, tvUnit: RENO_DEFAULT.tvUnit, loungeStyle: RENO_DEFAULT.loungeStyle, coffeeTable: RENO_DEFAULT.coffeeTable, sideboard: RENO_DEFAULT.sideboard, diningTable: RENO_DEFAULT.diningTable, whiteWoodwork: RENO_DEFAULT.whiteWoodwork, creamExterior: RENO_DEFAULT.creamExterior, bayHood: RENO_DEFAULT.bayHood, porchScreen: RENO_DEFAULT.porchScreen, sidePavers: RENO_DEFAULT.sidePavers, skylight: RENO_DEFAULT.skylight, openingRaise: RENO_DEFAULT.openingRaise, fridge: RENO_DEFAULT.fridge, island: RENO_DEFAULT.island, hallDoorway: RENO_DEFAULT.hallDoorway, kitchenDoor: RENO_DEFAULT.kitchenDoor, laundry: RENO_DEFAULT.laundry, backDoors: 'current', bedLights: RENO_DEFAULT.bedLights, pendant: RENO_DEFAULT.pendant, hallLights: RENO_DEFAULT.hallLights, hallAmalfi: RENO_DEFAULT.hallAmalfi, hallDl: RENO_DEFAULT.hallDl, art: RENO_DEFAULT.art, decor: RENO_DEFAULT.decor, yard: RENO_DEFAULT.yard });
  $('renoSkylight').checked = reno.skylight; $('renoAmalfi').checked = !!reno.hallAmalfi; $('renoWhite').checked = reno.whiteWoodwork; $('renoCream').checked = reno.creamExterior; $('renoTall').checked = reno.kitchenTall; $('renoNoPantry').checked = reno.noPantry; $('renoBedside').checked = reno.bedside; $('renoBayHood').checked = reno.bayHood; $('renoScreen').checked = reno.porchScreen; $('renoPavers').checked = reno.sidePavers; reno.curtains = RENO_DEFAULT.curtains; $('renoCurtains').checked = reno.curtains; reno.shutters = RENO_DEFAULT.shutters; $('renoShutters').checked = reno.shutters; $('renoOpening').checked = reno.openingRaise; reno.glassWall = RENO_DEFAULT.glassWall; $('renoGlassWall').checked = reno.glassWall;
  $('renoIsland').checked = reno.island; reno.moodPendants = false;
  saveReno(); renoSummary(); rebuild();
});
renoSummary();

// Bedroom lighting (proposed scheme): a switch per layer and a dimmer, applied at once (no rebuild); scenes set the
// time and the switches together; the two stand-in-the-room buttons drop you into Walk there
const BED_SW = { angled: 'blAngled', pendant: 'blPendant', reading: 'blReading', corner: 'blCorner', cove: 'blCove', wallwash: 'blWallwash', sheer: 'blSheer', night: 'blNight' };
function syncBedUI() {
  for (const [k, id] of Object.entries(BED_SW)) $(id).checked = !!bedState[k];
  $('blDim').value = bedState.dim; $('blDimVal').textContent = bedState.dim + '%';
  $('blDimSec').value = bedState.dimSec; $('blDimSecVal').textContent = bedState.dimSec + '%';
  // only the switches for fittings this version has
  const v = reno.bedLights || 'pendant', has = { angled: v === 'angled', pendant: ['pendant', 'pendantWall', 'pendantSheer', 'proposed', 'corners'].includes(v), reading: v === 'proposed', corner: v === 'corners', wallwash: v === 'pendantWall', sheer: v === 'pendantSheer', cove: true, night: true };
  for (const [k, id] of Object.entries(BED_SW)) $(id).closest('label').hidden = !has[k];
  if (typeof syncSecButton === 'function') syncSecButton();
}
const saveBed = () => { syncBedUI(); applyLightMode(); };
// the scene whose switches and dimmer match what is set now, lit up in the panel (none once you change one by hand)
const markScene = () => document.querySelectorAll('[data-bscene]').forEach(b => {
  const { time, ...st } = BED_SCENES[b.dataset.bscene];
  b.setAttribute('aria-pressed', String(lightsOn() && secondaryOn && Object.entries(st).every(([k, v]) => bedState[k] === v)));
});
for (const [k, id] of Object.entries(BED_SW)) $(id).addEventListener('change', () => { bedState[k] = $(id).checked; saveBed(); markScene(); });
$('blDim').addEventListener('input', () => { bedState.dim = Number($('blDim').value); saveBed(); markScene(); });
$('blDimSec').addEventListener('input', () => { bedState.dimSec = Number($('blDimSec').value); saveBed(); markScene(); });
const setTime = h => { $('time').value = h; $('time').dispatchEvent(new Event('input')); };
const BED_SCENES = {
  all: { time: 21.5, angled: true, pendant: true, reading: true, corner: true, cove: true, wallwash: true, sheer: true, night: true, dim: 100, dimSec: 100 },
  evening: { time: 21.5, angled: true, pendant: true, reading: false, corner: true, cove: true, wallwash: true, sheer: true, night: true, dim: 25, dimSec: 50 },   // the hours before bed: low and warm
  sleep: { time: 23.5, angled: false, pendant: false, reading: false, corner: false, cove: false, wallwash: false, sheer: false, night: true, dim: 25, dimSec: 50 },  // lights out, the motion night light
};
document.querySelectorAll('[data-bscene]').forEach(b => b.addEventListener('click', () => {
  const { time, ...st } = BED_SCENES[b.dataset.bscene];
  Object.assign(bedState, st);
  lightsManual = true; secondaryOn = true;
  setTime(time); saveBed(); markScene();
}));
// stand in a bedroom (Walk): front bedroom from the bay corner by the hall wall, facing the bed and the robe; bedroom 2
// in the window corner beside the bed, facing the robe across the room (the view from the bed, standing); frontBed: beside the front bed's head, facing the wall the bed faces
const BED_VIEWS = { front: { x: 1.9, y: 3.6, tx: 4.69, ty: 7.6 }, frontBed: { x: 4.3, y: 6.95, tx: 1.58, ty: 5.0, pitch: 0.05 }, bed3: { x: 4.3, y: 11.9, tx: 1.8, ty: 14.6, pitch: 0.12 }, hallFront: { x: 0.7, y: 5.0, tx: 0.7, ty: 15, pitch: 0.12 }, hallBack: { x: 0.7, y: 14.6, tx: 0.7, ty: 4.6, pitch: 0.12 }, frontPillow: { x: 4.3, y: 5.3, tx: 2.0, ty: 5.55, pitch: 0.85, eye: 0.85 }, frontSheer: { x: 2.3, y: 7.0, tx: 3.7, ty: 3.3, pitch: 0.12 }, bed2: { x: 4.4, y: 8.75, tx: 1.6, ty: 11.3, pitch: 0.15 }, kitchenEnd: { x: 3.9, y: 16.0, tx: 0.45, ty: 19.0, pitch: 0.12 } };
document.querySelectorAll('[data-bview]').forEach(b => b.addEventListener('click', () => {
  const v = BED_VIEWS[b.dataset.bview];
  if (!walk.on) setWalk(true); else window.closeSheets?.();
  walk.eye = v.eye ?? 1.5;                                           // the pillow view sits up in bed
  const p = L(v.x, v.y, walk.eye); camera.position.x = p.x; camera.position.z = p.z;
  walk.yaw = walk.tYaw = Math.atan2(v.tx - v.x, -(v.ty - v.y)); walk.pitch = walk.tPitch = v.pitch ?? 0.12; walk.vel.set(0, 0, 0);
}));
document.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => { lightsManual = null; setTime(b.dataset.time); }));
// Secondary lights: a round button beside the bulb (and the K key), shown while a bedroom scheme with them is picked
const secButton = document.createElement('button');
secButton.id = 'secButton'; secButton.setAttribute('aria-label', 'Secondary lights (robe-top strip, downlights)'); secButton.title = 'Secondary lights: robe-top strip and the downlights or reading spots (K)';
secButton.style.cssText = 'position:fixed;right:76px;bottom:172px;width:48px;height:48px;padding:0;border:0;border-radius:50%;z-index:12;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;box-shadow:0 1px 4px rgba(0,0,0,0.25)';
secButton.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect class="strip" x="3" y="15" width="18" height="4" rx="1"/><path d="M6 12l-1-3M12 11V7M18 12l1-3"/></svg>';
document.body.appendChild(secButton);
function syncSecButton() {
  secButton.style.background = secondaryOn ? '#f6c96a' : '#f8f7f3'; secButton.style.color = secondaryOn ? '#3a2a06' : '#1f2427';
  secButton.querySelector('.strip').setAttribute('fill', secondaryOn ? '#fff3cf' : 'none');
  secButton.setAttribute('aria-pressed', String(secondaryOn));
}
const toggleSecondary = () => { secondaryOn = !secondaryOn; applyLightMode(); syncSecButton(); markScene(); showToast(secondaryOn ? 'Secondary lights on' : 'Secondary lights off'); };
secButton.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleSecondary(); });
secButton.addEventListener('click', e => { if (e.detail === 0) toggleSecondary(); });
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'k' && !e.repeat && !e.metaKey && !e.ctrlKey && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) toggleSecondary(); });
syncBedUI(); markScene(); syncSecButton();

// Reno sheet shows one room at a time. Tapping a room tab picks it; in Walk the sheet follows you, switching to the
// room you walk into (a pink dot marks where you are). Rooms with nothing to change keep the last tab and say so.
const ROOM_TAB = { 'Kitchen / dining': 'kitchen', 'Lounge / living': 'lounge', 'Bathroom 2': 'laundry', 'Front bedroom': 'bedroom', 'Bedroom 2': 'bedroom', 'Bedroom 3': 'bedroom', Porch: 'hall', Entry: 'hall', Hall: 'hall', 'Hall extension': 'hall' };
const ROOM_KEY = 'fern-reno-room';
function showRoom(key, remember = true) {
  document.querySelectorAll('[data-room]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.room === key)));
  document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== key; });
  const b = document.querySelector(`[data-room="${key}"]`); b?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (remember) try { localStorage.setItem(ROOM_KEY, key); } catch {}
}
document.querySelectorAll('[data-room]').forEach(b => b.addEventListener('click', () => showRoom(b.dataset.room)));
// arrow keys move along the room tabs, as for any tab list
$('sheet-reno').querySelector('.rooms').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const bs = [...document.querySelectorAll('[data-room]')], i = bs.findIndex(b => b.getAttribute('aria-selected') === 'true');
  const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; showRoom(n.dataset.room); n.focus(); e.preventDefault();
});
{ let k = 'kitchen'; try { k = localStorage.getItem(ROOM_KEY) || k; } catch {} showRoom(document.querySelector(`[data-room="${k}"]`) ? k : 'kitchen', false); }
let hereRoom, roomTick = 0;
function followRoom() {
  if (++roomTick % 12) return;                                            // five times a second is plenty
  let name = null;
  if (walk.on) {
    const x = -camera.position.x, y = camera.position.z;                   // three (X, Z) -> lot (-x, y)
    const r = spec.rooms.find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    name = r ? r.name : 'outside';
  }
  if (name === hereRoom) return;
  hereRoom = name;
  const tab = name === 'outside' ? 'outside' : ROOM_TAB[name];
  document.querySelectorAll('[data-room]').forEach(b => b.classList.toggle('is-here', !!tab && b.dataset.room === tab));
  const here = $('renoHere');
  if (tab) { showRoom(tab, false); here.hidden = true; }
  else if (name) { here.textContent = `You're in ${name}. Nothing to change here yet.`; here.hidden = false; }
  else here.hidden = true;
}

window.__app = { get spec() { return spec; }, get skyAt() { return skyAt; }, get ceilOver() { return ceilOver; }, nb, doors, toggleDoor, poseDoor, animateDoors, scene, ctx, get G() { return G; }, rebuild, reno, renderer, sun, camera, THREE, walk, stepWalk, colliders, blocked, controls,
  // debug: place the camera in lot coordinates and render one frame
  view(p, t) { camera.position.copy(L(...p)); controls.target.copy(L(...t)); controls.update(); renderer.render(scene, camera); } };
const doorClock = new THREE.Clock();
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
// the shadow map only redraws when the sun, a door, a layer or the build changes (it was redrawn every frame; at night,
// with the sun down, it never needs to)
renderer.shadowMap.autoUpdate = false;
let shadowKey = '', shadowG = null;
function updateShadows() {
  let k = sun.intensity > 0 ? sun.position.toArray().map(v => v.toFixed(3)).join() + sun.target.position.toArray().map(v => v.toFixed(3)).join() : 'dark';
  for (const d of doors) k += d.rotation.y.toFixed(3) + d.position.x.toFixed(3) + d.position.z.toFixed(3);
  k += [G.roof.visible, G.furniture.visible, G.ceilings.visible].join();
  if (k !== shadowKey || shadowG !== G) { shadowKey = k; shadowG = G; renderer.shadowMap.needsUpdate = true; }
}
const frameClock = new THREE.Clock(); let frameAvg = 16, frameN = 0;
function adaptResolution() {
  const dt = Math.min(frameClock.getDelta() * 1000, 200); frameAvg += (dt - frameAvg) * 0.05;
  if (++frameN < 90 || document.hidden) return;                       // judge every ~1.5 s, on a settled average
  const pr = renderer.getPixelRatio();
  let next = pr;
  if (frameAvg > 24 && pr > 1) next = Math.max(1, pr - 0.25);
  else if (frameAvg < 13 && pr < PR_MAX) next = Math.min(PR_MAX, pr + 0.25);
  if (next !== pr) { renderer.setPixelRatio(next); renderer.setSize(innerWidth, innerHeight); }
  frameN = 0;
}
renderer.setAnimationLoop(() => { adaptResolution(); animateDoors(Math.min(doorClock.getDelta(), 0.1)); updateShadows(); updateDoorHint(); followRoom(); placeLights(); adaptExposure(); if (walk.on) stepWalk(); else { walk.clock.getDelta(); controls.update(); } if (!precompiling) renderer.render(scene, camera); });
// the house is built and the first frame drawn: fade out the loading screen
renderer.render(scene, camera);
setTimeout(() => document.getElementById('loading')?.classList.add('done'), 60);
precompileLights();
