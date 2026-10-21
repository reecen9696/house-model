// Builds the house from spec.json. Pure geometry: no camera, lights or UI here.
// Lot frame (x west, y south, z up) -> three.js (X = -x, Y = z, Z = y). Right-handed.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const L = (x, y, z) => new THREE.Vector3(-x, z, y);

const M = {};
// Speckled cork/terrazzo-look lino, as in the kitchen photos. One texture tile = 1 m.
function linoTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#c6a676'; g.fillRect(0, 0, 256, 256);
  const cols = ['#e8dcc4', '#8a6a42', '#6b4f30', '#d6c09a', '#f4efe4', '#a27c4f'];
  for (let i = 0; i < 9000; i++) { g.fillStyle = cols[i % cols.length]; const r = 0.6 + Math.random() * 1.6; g.fillRect(Math.random() * 256, Math.random() * 256, r, r); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Soft grey cut-pile carpet: a mid grey with fine flecks of lighter and darker yarn. One texture tile = 1 m.
function carpetTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d8cfbf'; g.fillRect(0, 0, 256, 256);                          // light cream wool-look (2026-10-21; was mid grey)
  const cols = ['#e3dbcc', '#cbc0ad', '#ddd4c4', '#c4b8a4', '#eae3d6'];
  for (let i = 0; i < 26000; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Low-pile rug in oatmeal and taupe: a fine streaky weave of short dashes running one way, softly mottled.
// Drawn for the whole rug face (no repeat), streaks along canvas x.
function rugTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#cbbda4'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) {                                                   // soft mottling
    const x = Math.random() * 1024, y = Math.random() * 1024, r = 60 + Math.random() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(228,219,202,0.35)' : 'rgba(170,154,128,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const cols = ['rgba(222,213,196,0.45)', 'rgba(172,157,132,0.3)', 'rgba(205,193,172,0.45)', 'rgba(158,142,118,0.22)', 'rgba(236,229,215,0.4)'];
  for (let i = 0; i < 60000; i++) {                                                // the weave: short dashes, one direction
    g.fillStyle = cols[i % cols.length];
    g.fillRect(Math.random() * 1024, Math.random() * 1024, 4 + Math.random() * 24, 1);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Wide-board engineered oak (reference photo): smoky mid-brown, about 180 mm wide, 1.8-3 m long, running along the
// length of the house. Matte, fine straight grain with a soft cathedral figure on some boards, the odd pin knot,
// tight joints that read as a faint line. One tile = 2 m across x 6 m along, so the repeat is not obvious; the same
// canvas doubles as a bump map so the joints and grain catch the light.
const BOARD_TILE = [2, 6];
function boardTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 3072; const g = c.getContext('2d');
  const n = 11, bw = c.width / n;                                       // 11 boards across 2 m: 182 mm each
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const x = i * bw;
    // Wrap whole planks across the texture boundary. Clipping random planks at
    // the tile edges created a straight colour seam across every board at 6 m.
    const count = 2 + Math.floor(Math.random() * 2);
    const weights = Array.from({ length: count }, () => 0.8 + Math.random() * 0.4);
    const total = weights.reduce((a, b) => a + b, 0);
    let y = Math.random() * c.height;
    for (const weight of weights) {
      const len = weight / total * c.height;
      const h = rnd(26, 30), s = rnd(15, 20), l = rnd(45, 50);        // boards close in tone: one greyed, smoked-oak brown
      for (const offset of [-c.height, 0]) {
        const y0 = y + offset;
        g.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        g.fillRect(x, y0, bw, len + 1);
        g.save(); g.beginPath(); g.rect(x, y0, bw, len + 1); g.clip();
        // a slow lighter/darker drift across the board, as oak takes the oil unevenly
        const grad = g.createLinearGradient(x, 0, x + bw, 0), d = rnd(-4, 4);
        grad.addColorStop(0, `hsla(${h}, ${s}%, ${l + d}%, 0.35)`); grad.addColorStop(1, `hsla(${h}, ${s}%, ${l - d}%, 0.35)`);
        g.fillStyle = grad; g.fillRect(x, y0, bw, len + 1);
        // grain: fine, near-straight streaks along the board, mostly a little darker than the base
        for (let k = 0; k < 34; k++) {
          const gx = x + rnd(1, bw - 1), dark = Math.random() < 0.7;
          g.strokeStyle = dark ? `hsla(${h - 2}, ${s + 4}%, ${l - rnd(4, 9)}%, ${rnd(0.1, 0.24)})` : `hsla(${h + 2}, ${s - 4}%, ${l + rnd(3, 7)}%, ${rnd(0.08, 0.18)})`;
          g.lineWidth = rnd(0.5, 1.6); g.beginPath(); g.moveTo(gx, y0);
          for (let yy = y0; yy < y0 + len + 60; yy += 60) g.quadraticCurveTo(gx + rnd(-1.5, 1.5), yy + 30, gx + rnd(-0.8, 0.8), yy + 60);
          g.stroke();
        }
        // soft cathedral figure: nested arches up the middle of some boards
        if (Math.random() < 0.45) {
          const cx = x + bw / 2 + rnd(-bw / 6, bw / 6), ay = y0 + rnd(0.2, 0.7) * len;
          for (let r = 1; r <= 5; r++) {
            const w = r * rnd(5, 8);
            g.strokeStyle = `hsla(${h - 2}, ${s + 4}%, ${l - 7}%, 0.12)`; g.lineWidth = rnd(1, 2.5);
            g.beginPath(); g.moveTo(cx - w, ay + 260); g.quadraticCurveTo(cx - w * 0.9, ay - r * 14, cx, ay - r * 22);
            g.quadraticCurveTo(cx + w * 0.9, ay - r * 14, cx + w, ay + 260); g.stroke();
          }
        }
        // the odd pin knot, small and dark
        if (Math.random() < 0.15) {
          const kx = x + rnd(12, bw - 12), ky = y0 + rnd(60, len - 60);
          g.fillStyle = `hsla(${h - 4}, ${s + 8}%, ${l - 20}%, 0.6)`; g.beginPath(); g.ellipse(kx, ky, 2.5, 4, 0, 0, Math.PI * 2); g.fill();
        }
        g.restore();
        // end joint: a faint dark line where the next board starts
        g.fillStyle = 'rgba(40,28,18,0.45)'; g.fillRect(x, y0, bw, 1.5);
      }
      y = (y + len) % c.height;
    }
    // tight joint between boards: a thin shadow line and a barely lit edge on the next board
    g.fillStyle = 'rgba(35,24,15,0.5)'; g.fillRect(x, 0, 1.5, c.height);
    g.fillStyle = 'rgba(255,240,220,0.08)'; g.fillRect(x + 1.5, 0, 1, c.height);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Treated-pine paling fence, weathered grey-brown: 100 mm palings with 9 mm gaps, vertical grain, nail
// heads at the rail lines. One tile = 1.2 m along (11 palings) x 2 m high; applied with fenceUV so the
// palings run upright and continue along a fence of any length.
const PALING_TILE = [1.2, 2.0];
// the same palings painted white on our side (client 2026-10-21): flat off-white boards, the gaps a soft grey
function palingWhiteTexture() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#9d988f'; g.fillRect(0, 0, c.width, c.height);
  const n = 11, pw = c.width / n, gap = 5.8;
  for (let i = 0; i < n; i++) { const l = 93 + Math.random() * 2; g.fillStyle = `hsl(40, 12%, ${l}%)`; g.fillRect(i * pw, 0, pw - gap, c.height); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function palingTexture() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 1280; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#2a2520'; g.fillRect(0, 0, c.width, c.height);          // the gaps: dark, whatever is behind
  const n = 11, pw = c.width / n, gap = 5.8;
  for (let i = 0; i < n; i++) {
    const x = i * pw, w = pw - gap;
    // evenly weathered, as in the yard photos: one silvery grey-brown throughout, only a slight board-to-board difference
    const h = rnd(30, 34), s = rnd(10, 13), l = rnd(50, 54);
    g.fillStyle = `hsl(${h}, ${s}%, ${l}%)`; g.fillRect(x, 0, w, c.height);
    g.save(); g.beginPath(); g.rect(x, 0, w, c.height); g.clip();
    for (let k = 0; k < 22; k++) {                                        // vertical grain streaks
      const gx = x + rnd(1, w - 1), dark = Math.random() < 0.6;          // fine, faint grain
      g.strokeStyle = dark ? `hsla(${h}, ${s + 4}%, ${l - rnd(5, 9)}%, ${rnd(0.12, 0.22)})` : `hsla(${h}, ${s - 3}%, ${l + rnd(3, 6)}%, ${rnd(0.08, 0.15)})`;
      g.lineWidth = rnd(0.5, 2); g.beginPath(); g.moveTo(gx, -10);
      for (let yy = 0; yy < c.height + 40; yy += 40) g.quadraticCurveTo(gx + rnd(-2.5, 2.5), yy + 20, gx + rnd(-1.5, 1.5), yy + 40);
      g.stroke();
    }
    // weather staining: darker toward the bottom, a paler band near the top
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(30,20,10,0.14)');
    g.fillStyle = grad; g.fillRect(x, 0, w, c.height);
    // nail heads at the three rail lines
    for (const rz of [0.12, 0.5, 0.88]) for (const nx of [x + w * 0.3, x + w * 0.7]) {
      g.fillStyle = 'rgba(40,35,30,0.9)'; g.beginPath(); g.arc(nx, rz * c.height + rnd(-2, 2), 2.4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // shadow down the gap side of each paling, and a lit edge on the other
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + w - 3, 0, 3, c.height);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, 0, 1.5, c.height);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Fence UVs: u runs along the fence (lot x or y), v is height, so the palings stand upright on every face.
function fenceUV(mesh, tile, along) {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry, pos = geo.attributes.position, uv = new Float32Array(pos.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    uv[2 * i] = (along === 'x' ? -v.x : v.z) / tile[0]; uv[2 * i + 1] = v.y / tile[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return mesh;
}
// A run of paling fence: the textured panel plus three rails and a post every 2.4 m on the side the
// rails face ('rails' = +1 toward larger lot coordinate, -1 toward smaller, across the fence line).
// paint: the lot direction our side faces ('+x', '-x', '+y', '-y'): that face, the rails and the posts are painted white
function palingFence(group, x0, x1, y0, y1, z0, z1, rails = 0, paint = null) {
  const along = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? 'x' : 'y';
  const panel = fenceUV(box(group, x0, x1, y0, y1, z0, z1, M.paling), PALING_TILE, along);
  if (paint) {
    M.palingWhite = M.palingWhite || new THREE.MeshStandardMaterial({ map: palingWhiteTexture(), roughness: 0.85 });
    const mats = Array(6).fill(M.paling); mats[{ '-x': 0, '+x': 1, '+y': 4, '-y': 5 }[paint]] = M.palingWhite;   // three faces: +X -X +Y -Y +Z -Z; lot x = -X
    panel.material = mats;
  }
  const railMat = paint ? (M.railWhite || (M.railWhite = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.85 }))) : M.railTimber;   // (their night glow came out: it lit every rail evenly, lights or not, client)
  if (!rails) return panel;
  const h = z1 - z0, a0 = along === 'x' ? Math.min(x0, x1) : Math.min(y0, y1), a1 = along === 'x' ? Math.max(x0, x1) : Math.max(y0, y1);
  const face = along === 'x' ? (rails > 0 ? Math.max(y0, y1) : Math.min(y0, y1)) : (rails > 0 ? Math.max(x0, x1) : Math.min(x0, x1));
  const r0 = face, r1 = face + rails * 0.038, p1 = face + rails * 0.09;
  for (const f of [0.12, 0.5, 0.88]) {                                      // 75 x 38 rails
    const rz = z0 + h * f - 0.037;
    if (along === 'x') box(group, a0, a1, Math.min(r0, r1), Math.max(r0, r1), rz, rz + 0.075, railMat);
    else box(group, Math.min(r0, r1), Math.max(r0, r1), a0, a1, rz, rz + 0.075, railMat);
  }
  for (let a = a0 + 0.05; a < a1 - 0.05; a += 2.4) {                        // 90 x 90 posts
    if (along === 'x') box(group, a, a + 0.09, Math.min(r0, p1), Math.max(r0, p1), z0, z1 - 0.02, railMat);
    else box(group, Math.min(r0, p1), Math.max(r0, p1), a, a + 0.09, z0, z1 - 0.02, railMat);
  }
  return panel;
}
// Give a mesh world-aligned UVs (u = west metres / tile, v = south metres / tile) so a floor
// pattern runs continuously across rooms, thresholds and the sub-floor.
function worldUV(mesh, tile, rotate = false) {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry, pos = geo.attributes.position, uv = new Float32Array(pos.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    if (rotate) { uv[2 * i] = v.z / tile[0]; uv[2 * i + 1] = -v.x / tile[1]; } else { uv[2 * i] = -v.x / tile[0]; uv[2 * i + 1] = v.z / tile[1]; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Victorian tessellated tiles, as on the front porch (photo): terracotta octagons with small charcoal squares where
// their cut corners meet, thin grout. One texture tile = one 110 mm octagon cell.
const TESS_TILE = [0.11, 0.11];
function tessTexture() {
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  g.fillStyle = '#2e2d30'; g.fillRect(0, 0, n, n);                                  // charcoal squares show at the corners
  const k = n * 0.29, gr = 2.5;                                                      // corner cut, grout
  g.fillStyle = '#6f6259'; g.beginPath();                                            // grout line under the octagon edge
  g.moveTo(k, 0); g.lineTo(n - k, 0); g.lineTo(n, k); g.lineTo(n, n - k); g.lineTo(n - k, n); g.lineTo(k, n); g.lineTo(0, n - k); g.lineTo(0, k); g.closePath(); g.fill();
  g.fillStyle = '#a4553d'; g.beginPath();
  g.moveTo(k + gr, gr); g.lineTo(n - k - gr, gr); g.lineTo(n - gr, k + gr); g.lineTo(n - gr, n - k - gr); g.lineTo(n - k - gr, n - gr); g.lineTo(k + gr, n - gr); g.lineTo(gr, n - k - gr); g.lineTo(gr, k + gr); g.closePath(); g.fill();
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,25,15' : '200,120,90'},0.12)`; g.fillRect(Math.random() * n, Math.random() * n, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// The porch border's middle band: squares split into triangles, charcoal and cream diamonds with terracotta
// between. u runs along the band (one tile = 2 squares), v across it (0 to 1).
function tessBandTexture() {
  const w = 128, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#a4553d'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2; i++) {
    const x0 = i * 64, cx = x0 + 32;
    g.fillStyle = i ? '#2e2d30' : '#e6d6b0'; g.beginPath(); g.moveTo(cx, 3); g.lineTo(x0 + 61, 32); g.lineTo(cx, 61); g.lineTo(x0 + 3, 32); g.closePath(); g.fill();
  }
  g.fillStyle = '#6f6259'; for (const x of [0, 64]) g.fillRect(x, 0, 2, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// UVs for a border strip: u along it in 'tileLen' repeats, v across it from 0 at the outer edge to 1 at the inner
function stripUV(mesh, alongX, outer, inward, width, tileLen) {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry, pos = geo.attributes.position, uv = new Float32Array(pos.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const lx = -v.x, ly = v.z;                                                       // back to lot x, y
    uv[2 * i] = (alongX ? lx : ly) / tileLen; uv[2 * i + 1] = ((alongX ? ly : lx) - outer) * inward / width;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// --- modern planting kit (garden beds): leafy clipped shapes, white hydrangeas, lomandra tufts, multi-stem trees ---
// Leaf texture comes from displacing each vertex by a smooth function of its position, so shared corners move
// together (no cracks) and the flat-shaded facets read as foliage.
function plantMats() {
  const m = (k, c, o = {}) => M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o }));
  return {
    buxus: m('pBuxus', 0x2f4f27, { flatShading: true }), hydLeaf: m('pHydLeaf', 0x4b7436, { flatShading: true }),
    flower: m('pFlower', 0xf6f4ec, { flatShading: true, roughness: 0.8, emissive: 0x3a3936 }), grass: m('pGrass', 0x6d8f45, { side: THREE.DoubleSide }),
    canopy: m('pCanopy', 0x7da457, { flatShading: true }), stem: m('pStem', 0xd8d2c4, { roughness: 0.8 }),
    mulch: m('pMulch', 0x2c2622), edge: m('pEdge', 0x2e2f31, { roughness: 0.6, metalness: 0.3 }),
    glow: m('pGlow', 0xffd9a0, { emissive: 0xffc27a, emissiveIntensity: 1.2 }),
  };
}
// --- plant models (assets/plants/*.glb), loaded by main.js before the first build: the lemon tree, grass clumps,
// a lawn patch, leafy potato plants for the beds, and two house plants. Without them (still loading, or a failed
// load) the procedural plants below stand in.
let PLANTS = null;
export function setPlantModels(models) { PLANTS = models; }
// a copy of plant model 'name' (or one named part of it) with its foot at lot (x, y, z), scaled to height h and turned
// by rot about the vertical, and narrowed if need be to fit maxW across. Copies share geometry and materials, so
// repeats cost only a draw call.
function plantModel(g, name, x, y, z, h, rot = 0, part = null, maxW = Infinity) {
  const src = part ? PLANTS?.[name]?.getObjectByName(part) : PLANTS?.[name];
  if (!src) return null;
  const bb = src.userData.bb ?? (src.userData.bb = new THREE.Box3().setFromObject(src));
  const k = h / bb.max.y, w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * k, kw = w > maxW ? k * maxW / w : k;
  const o = src.clone(); o.position.copy(L(x, y, z)); o.rotation.set(0, rot, 0); o.scale.set(kw, k, kw);
  o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  g.add(o); o.updateMatrixWorld(true); return o;
}

// Canopy grown against a fence: anything past a line 'm' in from lot x = xMax or y = yMax is folded in toward the fence,
// easing onto it, so the tree reads as pruned flat there instead of poking through. Works on this copy's own geometry.
function pruneToFences(obj, xMax, yMax, m = 0.35) {
  const soft = (a, lim) => a <= lim - m ? a : lim - m + m * (1 - Math.exp(-(a - (lim - m)) / m));
  const v = new THREE.Vector3();
  obj.updateMatrixWorld(true);
  obj.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone(); g.userData = {};                                   // its own copy, freed with the house
    const p = g.attributes.position, inv = o.matrixWorld.clone().invert();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      v.x = -soft(-v.x, xMax); v.z = soft(v.z, yMax);                              // three (x, z) is lot (-x, y)
      v.applyMatrix4(inv); p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeBoundingBox(); g.computeBoundingSphere(); o.geometry = g;
  });
}

// 'Matched' set (Reno: table, sideboard, coffee table): the kitchen's white-and-stone and the sofa's cream boucle.
// Sand oak, paler and greyer than the smoked-oak floor so the pieces stand off it; the benchtop stone for tops; the
// sofa's boucle for seats
function matched() {
  return {
    oak: M.sandOak || (M.sandOak = new THREE.MeshStandardMaterial({ color: 0xcdbb9f, roughness: 0.6 })),
    groove: M.sandOakGroove || (M.sandOakGroove = new THREE.MeshStandardMaterial({ color: 0xa8957a, roughness: 0.7 })),
    stone: M.kStone || (M.kStone = new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.3 })),
    boucle: M.boucle || (M.boucle = new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 1 })),
  };
}

// --- foliage kit: leaf-card instancing ------------------------------------------------------------------
// A leaf is drawn once on a small canvas (alpha cut-out), then thousands of copies are scattered as instanced
// quads over a plant's outer shell, each with its own facing, size and tint, around a darker solid core so
// nothing shows through. Ragged edges, light through the gaps and per-leaf shading make it read as real
// foliage rather than a green blob.
const LEAF_TEX = {};
function leafTexture(kind) {
  if (LEAF_TEX[kind]) return LEAF_TEX[kind];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const W = 128, H = 128;
  const pointedOval = (w, tipY, baseY, mid) => {                     // leaf outline: base at the bottom middle, tip at the top
    g.beginPath(); g.moveTo(64, baseY);
    g.bezierCurveTo(64 + w * 0.9, baseY - (baseY - tipY) * (1 - mid), 64 + w * 0.7, tipY + (baseY - tipY) * 0.25, 64, tipY);
    g.bezierCurveTo(64 - w * 0.7, tipY + (baseY - tipY) * 0.25, 64 - w * 0.9, baseY - (baseY - tipY) * (1 - mid), 64, baseY);
    g.closePath();
  };
  const veins = (col, n, tipY, baseY, spread) => {
    g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.moveTo(64, baseY); g.lineTo(64, tipY + 6); g.stroke();
    g.lineWidth = 1;
    for (let i = 1; i <= n; i++) { const y = baseY - (baseY - tipY) * (i / (n + 1)); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * spread * 0.5, y - 10, 64 + s * spread, y - 18); g.stroke(); } }
  };
  if (kind === 'round') {                                             // buxus: small glossy rounded leaf
    const gr = g.createRadialGradient(52, 48, 6, 64, 64, 60); gr.addColorStop(0, '#5c8a38'); gr.addColorStop(0.6, '#3f6a2a'); gr.addColorStop(1, '#2b4d20');
    pointedOval(30, 12, 118, 0.55); g.fillStyle = gr; g.fill();
    veins('rgba(120,170,90,0.45)', 3, 12, 118, 16);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(50, 44, 10, 18, -0.5, 0, Math.PI * 2); g.fill();   // gloss
  } else if (kind === 'oval') {                                       // lemon / hydrangea / general broadleaf
    const gr = g.createLinearGradient(0, 118, 0, 8); gr.addColorStop(0, '#2c4f22'); gr.addColorStop(0.5, '#3f6c2c'); gr.addColorStop(1, '#4c7b33');
    pointedOval(34, 8, 120, 0.5); g.fillStyle = gr; g.fill();
    veins('rgba(150,190,110,0.5)', 5, 8, 120, 20);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.ellipse(52, 50, 8, 22, -0.4, 0, Math.PI * 2); g.fill();
  } else if (kind === 'strap') {                                      // lomandra: long blade tapering to the tip, pale centre stripe
    g.beginPath(); g.moveTo(64 - 17, 128); g.lineTo(64 + 17, 128); g.quadraticCurveTo(64 + 9, 40, 64 + 1.5, 0); g.lineTo(64 - 1.5, 0); g.quadraticCurveTo(64 - 9, 40, 64 - 17, 128); g.closePath();
    const gr = g.createLinearGradient(47, 0, 81, 0); gr.addColorStop(0, '#36601f'); gr.addColorStop(0.5, '#6f9a3e'); gr.addColorStop(1, '#36601f');
    g.fillStyle = gr; g.fill();
  } else if (kind === 'gum') {                                        // eucalyptus: long narrow sickle leaf, grey-green
    g.beginPath(); g.moveTo(64, 126); g.bezierCurveTo(40, 100, 30, 50, 58, 4); g.bezierCurveTo(70, 30, 78, 80, 64, 126); g.closePath();
    const gr = g.createLinearGradient(30, 0, 80, 0); gr.addColorStop(0, '#5e7355'); gr.addColorStop(0.5, '#7f9377'); gr.addColorStop(1, '#5a6d50');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(200,210,190,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(64, 124); g.bezierCurveTo(52, 90, 48, 50, 58, 8); g.stroke();
  } else if (kind === 'floret') {                                     // hydrangea floret: four rounded petals, cream
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, px = 64 + Math.cos(a) * 30, py = 64 + Math.sin(a) * 30;
      const gr = g.createRadialGradient(px, py, 4, px, py, 32); gr.addColorStop(0, '#f7f4ea'); gr.addColorStop(0.7, '#ede8da'); gr.addColorStop(1, '#d6d0c0');
      g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, 32, 27, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#c9c98a'; g.beginPath(); g.arc(64, 64, 5, 0, Math.PI * 2); g.fill();
  } else if (kind === 'blades') {                                     // lawn tuft card: a fan of blades from the bottom centre
    const cols = ['#5f8a36', '#74a043', '#4e7a2e', '#86b04e', '#557f31'];
    for (let i = 0; i < 9; i++) {
      const a = -0.75 + i * 0.19 + (i % 2 ? 0.05 : -0.05), len = 96 + (i * 29 % 30), x0 = 64 + (i - 4) * 4;
      const x1 = x0 + Math.sin(a) * len, y1 = 128 - Math.cos(a) * len, cx = x0 + Math.sin(a) * len * 0.5 + (i % 2 ? 10 : -10);
      g.strokeStyle = cols[i % cols.length]; g.lineCap = 'round';
      for (const [wdt, alpha] of [[7, 1], [3, 0.5]]) { g.lineWidth = wdt; g.globalAlpha = alpha; g.beginPath(); g.moveTo(x0, 128); g.quadraticCurveTo(cx, (128 + y1) / 2, x1, y1); g.stroke(); }
      g.globalAlpha = 1;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return LEAF_TEX[kind] = t;
}
function leafMat(kind, opts = {}) {
  const k = 'leaf_' + kind;
  return M[k] || (M[k] = new THREE.MeshStandardMaterial({ map: leafTexture(kind), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, color: 0xffffff, ...opts }));
}
// small seeded generator so a plant looks the same on every rebuild
function prng(seed) { let s = (Math.floor(seed * 7919) + 12345) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// scatter `count` leaf cards; sample(rnd) gives a point p (three.js coords) and an outward direction n
// Leaves lie on the surface facing outward (like a clipped shrub or the outside of a canopy), each spun to a random
// angle; opts.lay = false instead points them outward from a stalk end (loose, spiky growth).
function leafCloud(g, kind, size, count, sample, seed = 1, opts = {}) {
  const lay = opts.lay !== false, asp = opts.aspect || 1.3, geo = new THREE.PlaneGeometry(size, size * asp);
  if (!lay) geo.translate(0, size * asp * 0.5, 0);                     // anchored at the stalk end
  const mesh = new THREE.InstancedMesh(geo, leafMat(kind), count), jit = opts.jitter ?? 0.7;
  const rnd = prng(seed), d = new THREE.Object3D(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const { p, n } = sample(rnd, i);
    dir.set(n.x + (rnd() - 0.5) * jit, n.y + (rnd() - 0.5) * jit + (opts.droop || 0), n.z + (rnd() - 0.5) * jit).normalize();
    d.position.copy(p);
    if (lay) { d.quaternion.setFromUnitVectors(Z, dir); d.rotateZ(rnd() * Math.PI * 2); }
    else { d.quaternion.setFromUnitVectors(Y, dir); d.rotateY(rnd() * Math.PI * 2); }
    const s = 0.7 + rnd() * 0.6; d.scale.set(s, s, s); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    const t = 0.78 + rnd() * 0.4; col.setRGB(t * (0.92 + rnd() * 0.16), t, t * (0.88 + rnd() * 0.2)); mesh.setColorAt(i, col);
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = opts.shadow !== false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); g.add(mesh);
  return mesh;
}
// samplers (three.js coords). shell: the outer skin of a squashed sphere; boxShell: the top and sides of a box
const shellSampler = (c, r, squash = 0.85, rmin = 0.78) => rnd => {
  const u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), n = new THREE.Vector3(s * Math.cos(ph), u, s * Math.sin(ph));
  const rr = r * (rmin + rnd() * (1 - rmin));
  return { p: new THREE.Vector3(c.x + n.x * rr, c.y + n.y * rr * squash, c.z + n.z * rr), n };
};
const boxShellSampler = (X0, X1, Y0, Y1, Z0, Z1, inset = 0.04) => {
  const w = X1 - X0, h = Y1 - Y0, dd = Z1 - Z0;
  const faces = [[w * dd, new THREE.Vector3(0, 1, 0)], [h * dd, new THREE.Vector3(1, 0, 0)], [h * dd, new THREE.Vector3(-1, 0, 0)], [w * h, new THREE.Vector3(0, 0, 1)], [w * h, new THREE.Vector3(0, 0, -1)]];
  const total = faces.reduce((a, f) => a + f[0], 0);
  return rnd => {
    let pick = rnd() * total, f = faces[0]; for (const q of faces) { if (pick < q[0]) { f = q; break; } pick -= q[0]; }
    const n = f[1], k = inset * rnd();
    const p = new THREE.Vector3(X0 + rnd() * w, Y0 + rnd() * h, Z0 + rnd() * dd);
    if (n.y) p.y = Y1 - k; else if (n.x) p.x = n.x > 0 ? X1 - k : X0 + k; else p.z = n.z > 0 ? Z1 - k : Z0 + k;
    return { p, n };
  };
};
// leaf sizes and how densely each material's leaves cover a surface (leaves per m^2 of shell)
const LEAF_KIND = { pBuxus: ['round', 0.032, 1500], pHydLeaf: ['oval', 0.085, 320], pFlower: ['floret', 0.03, 2600], pCanopy: ['oval', 0.06, 800], lemonLeaf: ['oval', 0.065, 700], frontLeaf: ['oval', 0.055, 800] };
function coreMat(mat) {                                                // darker, matte version of a plant colour for the solid core
  const k = 'core_' + mat.uuid;
  return M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: mat.color.clone().multiplyScalar(0.55), roughness: 1 }));
}
// a plant ball: solid dark core plus a cloud of leaves over its outer shell
function leafyBall(g, x, y, z, r, mat, squash = 0.85, seed = 1) {
  const kind = Object.entries(LEAF_KIND).find(([k]) => M[k] === mat)?.[1] || ['oval', 0.06, 800];
  const c = L(x, y, z + r * squash);
  const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.88, 16, 12), coreMat(mat)); core.scale.y = squash;
  core.position.copy(c); core.castShadow = core.receiveShadow = true; g.add(core);
  const count = Math.round(4 * Math.PI * r * r * kind[2] * (r < 0.3 ? 1.6 : 1));
  leafCloud(g, kind[0], kind[1], count, shellSampler(c, r, squash, 0.93), seed);
  return core;
}
// clipped hedge: the hedge model (assets/plants/hedge.glb, 1.5 m segment) tiled along the bed, or until it has loaded,
// a solid dark box inside a skin of small leaves, so it stays crisp-edged but leafy
function clippedHedge(g, x0, x1, y0, y1, z0, h, mat) {
  if (hedgeRow(g, x0, x1, y0, y1, z0, h, mat)) return;
  const inset = 0.015, core = box(g, x0 + inset, x1 - inset, y0 + inset, y1 - inset, z0, z0 + h - inset, coreMat(mat));
  const kind = Object.entries(LEAF_KIND).find(([k]) => M[k] === mat)?.[1] || ['round', 0.032, 1500];
  const w = x1 - x0, d = y1 - y0, area = w * d + 2 * h * (w + d), count = Math.round(area * kind[2]);
  leafCloud(g, kind[0], kind[1], count, boxShellSampler(-x1, -x0, z0, z0 + h, y0, y1, 0.02), x0 * 7 + y0);
  return core;
}
// A row of hedge-model segments filling the box: scaled to the height and the bed's depth, each segment about half
// its modelled length (so the leaves aren't stretched too far from their shape), overlapped by 45% so the rounded ends
// of neighbours merge into one continuous hedge with no gaps, the end segments flush with the bed's ends, every
// other one turned end for end so the repeat isn't obvious. A dark core, inset, stops light showing through thin spots.
function hedgeRow(g, x0, x1, y0, y1, z0, h, mat) {
  const src = PLANTS?.hedge; if (!src) return false;
  const bb = src.userData.bb ?? (src.userData.bb = new THREE.Box3().setFromObject(src));
  const alongX = x1 - x0 >= y1 - y0, len = alongX ? x1 - x0 : y1 - y0, dep = alongX ? y1 - y0 : x1 - x0;
  const segL = bb.max.x - bb.min.x, ky = h / bb.max.y, kd = dep / (bb.max.z - bb.min.z);
  const OV = 0.55;                                                                      // each segment spaced at 55% of its length
  // n segments of scaled length Ls spaced Ls * OV apart span (n - 1) * step + Ls = len exactly
  const n = Math.max(2, Math.round(len / (segL * Math.max(ky, 0.45) * OV))), step = len / (n - 1 + 1 / OV), kl = step / (segL * OV);
  for (let i = 0; i < n; i++) {
    const a = (alongX ? x0 : y0) + segL * kl / 2 + i * step, cx = alongX ? a : (x0 + x1) / 2, cy = alongX ? (y0 + y1) / 2 : a;
    const o = src.clone(); o.position.copy(L(cx, cy, z0)); o.rotation.set(0, (alongX ? 0 : Math.PI / 2) + (i % 2 ? Math.PI : 0), 0); o.scale.set(kl, ky * (i % 3 === 1 ? 0.97 : 1), kd);
    o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
    g.add(o);
  }
  const i = Math.min(0.08, dep * 0.25);
  box(g, x0 + i, x1 - i, y0 + i, y1 - i, z0, z0 + h * 0.8, coreMat(mat));
  return true;
}
// broadleaf mound shrub (hydrangea out of flower / viburnum): overlapping leafy balls, no flowers
function hydrangea(g, x, y, z, s, P, seed = 1) {
  // leafy bed plants (potato-plant models): two different plants per spot, turned apart, for a fuller clump
  if (PLANTS?.potato) {
    const r = prng(seed), parts = ['plant_01', 'plant_02', 'plant_03', 'plant_04'], a = Math.floor(r() * 4);
    plantModel(g, 'potato', x, y, z, 0.62 * s * (0.9 + 0.2 * r()), r() * Math.PI * 2, parts[a]);
    plantModel(g, 'potato', x + 0.12 * s, y - 0.08 * s, z, 0.5 * s * (0.9 + 0.2 * r()), r() * Math.PI * 2, parts[(a + 1 + Math.floor(r() * 3)) % 4]);
    return;
  }
  leafyBall(g, x, y, z, 0.32 * s, P.hydLeaf, 0.8, seed);
  leafyBall(g, x + 0.14 * s, y - 0.1 * s, z, 0.24 * s, P.hydLeaf, 0.8, seed + 1);
  leafyBall(g, x - 0.12 * s, y + 0.08 * s, z + 0.1 * s, 0.22 * s, P.hydLeaf, 0.8, seed + 2);
}
// lomandra / grass tuft: arching strap leaves fanning out from a tight base, each blade a bent tapered card
let STRAP_GEO = null;
function strapGeometry() {
  if (STRAP_GEO) return STRAP_GEO;
  const geo = new THREE.PlaneGeometry(0.034, 1, 1, 10), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) + 0.5; p.setXYZ(i, p.getX(i) * (1 - 0.6 * t), t, 0.5 * t * t); }   // base at 0, tapers, arches toward +z
  geo.computeVertexNormals(); return STRAP_GEO = geo;
}
function grassTuft(g, x, y, z, h, P, seed = 1, maxW = Infinity) {
  if (PLANTS?.grassclump) { plantModel(g, 'grassclump', x, y, z, h, prng(seed)() * Math.PI * 2, null, maxW); return; }   // ornamental grass clump model
  const n = 70, mesh = new THREE.InstancedMesh(strapGeometry(), leafMat('strap'), n), rnd = prng(seed), d = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const az = rnd() * Math.PI * 2, tilt = 0.15 + rnd() * 0.65, len = h * (0.5 + rnd() * 0.55);
    d.position.copy(L(x + (rnd() - 0.5) * 0.1, y + (rnd() - 0.5) * 0.1, z)); d.rotation.set(tilt, az, 0, 'YXZ'); d.scale.set(1, len, len); d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix); const t = 0.8 + rnd() * 0.4; col.setRGB(t, t * (0.95 + rnd() * 0.1), t * 0.9); mesh.setColorAt(i, col);
  }
  mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); g.add(mesh);
  return mesh;
}
// small tree: a tapered trunk splitting into branches that each end in a leafy clump, plus optional fruit
function leafyTree(g, x, y, z, trunkH, clumps, mat, seed = 1, fruit = null) {
  const bark = M.bark || (M.bark = new THREE.MeshStandardMaterial({ color: 0x5b4633, roughness: 1 }));
  const rod = (a, b, r0, r1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 8), bark); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = m.receiveShadow = true; g.add(m); };
  const top = L(x, y, z + trunkH); rod(L(x, y, z), top, 0.05, 0.035);
  clumps.forEach(([cx, cy, cz, r], i) => {
    const c = L(cx, cy, cz); rod(top, c, 0.028, 0.015);
    const rt = prng(seed + 40 + i);                                       // a few thin twigs poking out through the leaves
    for (let k = 0; k < 4; k++) { const u = rt() * 2 - 1, ph = rt() * Math.PI * 2, sq = Math.sqrt(1 - u * u); rod(c, new THREE.Vector3(c.x + sq * Math.cos(ph) * r * 1.05, c.y + u * r * 0.9, c.z + sq * Math.sin(ph) * r * 1.05), 0.012, 0.004); }
    leafyBall(g, cx, cy, cz - r * 0.85, r, mat, 0.85, seed + i);
    if (fruit) { const rnd = prng(seed + 20 + i); for (let k = 0; k < fruit.per; k++) { const u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = r * 0.95; const f = new THREE.Mesh(new THREE.SphereGeometry(fruit.r, 10, 8), fruit.mat); f.position.set(c.x + s * Math.cos(ph) * rr, c.y + u * rr * 0.8, c.z + s * Math.sin(ph) * rr); f.castShadow = true; g.add(f); } }
  });
}
// multi-stem tree (birch / crepe myrtle look): pale slender trunks leaning apart, a light open canopy of clusters
function multiStem(g, x, y, z, h, P, seed = 1) {
  const tips = [];
  for (let i = 0; i < 3; i++) {
    const a = seed + i * 2.1, lean = 0.18 + 0.05 * i, tx = x + Math.cos(a) * lean, ty = y + Math.sin(a) * lean, tz = z + h * (0.72 + 0.06 * i);
    const b = L(x + Math.cos(a) * 0.04, y + Math.sin(a) * 0.04, z), t = L(tx, ty, tz), len = b.distanceTo(t);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.035, len, 8), P.stem);
    trunk.position.copy(b).add(t).multiplyScalar(0.5); trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.clone().sub(b).normalize());
    trunk.castShadow = true; g.add(trunk); tips.push([tx, ty, tz]);
  }
  tips.forEach(([tx, ty, tz], i) => {
    for (let k = 0; k < 3; k++) {
      const a = seed + i * 1.7 + k * 2.2, r = 0.26 + 0.05 * ((i + k) % 3);
      leafyBall(g, tx + Math.cos(a) * 0.25, ty + Math.sin(a) * 0.25, tz - 0.25 + k * 0.18, r, P.canopy, 0.75, seed + i * 3 + k);
    }
  });
}
// lawn: a mown-grass ground texture (1 m tile) plus a scatter of grass-blade tufts standing up out of it
function lawnTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#5e8433'; g.fillRect(0, 0, 512, 512);
  const specks = ['#557a2e', '#6b9440', '#7aa34a', '#4d7128', '#628b39'];
  for (let i = 0; i < 6000; i++) { g.fillStyle = specks[i % specks.length]; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  for (let i = 0; i < 4; i++) { const gr = g.createRadialGradient(Math.random() * 512, Math.random() * 512, 10, 256, 256, 300); gr.addColorStop(0, 'rgba(40,70,20,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
  g.lineCap = 'round';
  for (let i = 0; i < 3200; i++) {                                     // short blade strokes, mostly upright, wrapping at the edges
    const x = Math.random() * 512, y = Math.random() * 512, a = (Math.random() - 0.5) * 1.2, len = 7 + Math.random() * 10;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(140,190,90,${0.35 + Math.random() * 0.35})` : `rgba(45,80,25,${0.35 + Math.random() * 0.35})`;
    g.lineWidth = 1 + Math.random() * 1.2;
    for (const [ox, oy] of [[0, 0], [-512, 0], [512, 0], [0, -512], [0, 512]]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.sin(a) * len, y + oy - Math.cos(a) * len); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let TUFT_GEO = null;
function tuftGeometry() {                                              // three crossed cards, base on the ground
  if (TUFT_GEO) return TUFT_GEO;
  const w = 0.14, h = 0.13, pos = [], uv = [], nrm = [];
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3, cx = Math.cos(a) * w / 2, cz = Math.sin(a) * w / 2;
    const quad = [[-cx, 0, -cz, 0, 0], [cx, 0, cz, 1, 0], [cx, h, cz, 1, 1], [-cx, h, -cz, 0, 1]];
    for (const idx of [0, 1, 2, 0, 2, 3]) { const q = quad[idx]; pos.push(q[0], q[1], q[2]); uv.push(q[3], q[4]); nrm.push(0, 1, 0); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return TUFT_GEO = geo;
}
function lawn(g, x0, x1, y0, y1, zBase, zTop, seed = 3) {
  const mat = M.grass; worldUV(box(g, x0, x1, y0, y1, zBase, zTop, mat), [1, 1]);
  // grass-patch model (about 0.9 x 1.0 m) laid in an overlapping grid, each turned a random quarter and cut to about
  // 110 mm high; the patches don't cast sun shadows (hundreds of thousands of blades), the ground under them does
  const patch = PLANTS?.lawn?.getObjectByProperty('isMesh', true);
  if (patch) {
    const sz = new THREE.Box3().setFromObject(patch).getSize(new THREE.Vector3()), half = Math.max(sz.x, sz.z) / 2, step = 0.75;
    const nx = Math.max(1, Math.round((x1 - x0) / step)), ny = Math.max(1, Math.round((y1 - y0) / step));
    const k = Math.min(1, (x1 - x0) / (2 * half), (y1 - y0) / (2 * half)), rnd = prng(seed), d = new THREE.Object3D();
    const mesh = new THREE.InstancedMesh(patch.geometry, patch.material, nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = Math.min(x1 - half * k, Math.max(x0 + half * k, x0 + (i + 0.5) * (x1 - x0) / nx + (rnd() - 0.5) * 0.12));
      const cy = Math.min(y1 - half * k, Math.max(y0 + half * k, y0 + (j + 0.5) * (y1 - y0) / ny + (rnd() - 0.5) * 0.12));
      d.position.copy(L(cx, cy, zTop - 0.01)); d.rotation.set(0, Math.floor(rnd() * 4) * Math.PI / 2, 0);
      d.scale.set(k, 0.11 / sz.y * (0.85 + 0.3 * rnd()), k); d.updateMatrix(); mesh.setMatrixAt(j * nx + i, d.matrix);
    }
    mesh.userData.noShadowCast = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); g.add(mesh);
    return;
  }
  const n = Math.round((x1 - x0) * (y1 - y0) * 70), mesh = new THREE.InstancedMesh(tuftGeometry(), leafMat('blades', { roughness: 0.9 }), n);
  const rnd = prng(seed), d = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    d.position.copy(L(x0 + 0.06 + rnd() * (x1 - x0 - 0.12), y0 + 0.06 + rnd() * (y1 - y0 - 0.12), zTop - 0.005)); d.rotation.set(0, rnd() * Math.PI * 2, 0);
    const s = 0.55 + rnd() * 0.5; d.scale.set(s, 0.45 + rnd() * 0.4, s); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    const t = 0.8 + rnd() * 0.4; col.setRGB(t * (0.9 + rnd() * 0.2), t, t * 0.9); mesh.setColorAt(i, col);
  }
  mesh.castShadow = false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); g.add(mesh);
}

// small ground uplight: black body with a warm lens
function upLight(g, x, y, z, P) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), M.frameA); body.position.copy(L(x, y, z + 0.06)); g.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.006, 12), P.glow); lens.position.copy(L(x, y, z + 0.123)); g.add(lens);
}

// A tessellated-tile floor panel, as on the porch: octagon field, and round its edge the porch border (terracotta,
// charcoal line, triangle band, charcoal line). The field runs under the border, which sits 3 mm proud.
function tessPanel(group, fx0, fx1, fy0, fy1, zBase, zTop) {
  worldUV(box(group, fx0, fx1, fy0, fy1, zBase, zTop, M.tess), TESS_TILE);
  const zt = zTop + 0.003;
  for (const [b0, b1, m] of [[0, 0.075, M.tessRed], [0.075, 0.085, M.tessBlack], [0.085, 0.145, M.tessBand], [0.145, 0.155, M.tessBlack]]) {
    for (const [alongX, outer, inward] of [[true, fy0, 1], [true, fy1, -1], [false, fx0, 1], [false, fx1, -1]]) {
      const o0 = outer + inward * b0, o1 = outer + inward * b1, lo = Math.min(o0, o1), hi = Math.max(o0, o1);
      const mesh = alongX ? box(group, fx0 + b0, fx1 - b0, lo, hi, zTop, zt, m) : box(group, lo, hi, fy0 + b1, fy1 - b1, zTop, zt, m);
      if (m === M.tessBand) stripUV(mesh, alongX, o0, inward, b1 - b0, 0.12);
    }
  }
}

// --- face brick: stretcher-bond coursing with mortar joints, laid world-aligned on every brick surface -------------
// Standard 230 x 76 bricks with 10 mm joints: one tile = 4 bricks along (0.96 m) x 12 courses up (1.032 m).
// Colours from the covered-area photo: orange-red clinker mix with the odd dark and pale brick, cream mortar.
const BRICK_TILE = [0.96, 1.032];
function brickTextures() {
  const W = 1024, H = 1101, px = W / BRICK_TILE[0];                   // pixels per metre
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = W; b.height = H; const gb = b.getContext('2d');   // bump: bricks light, mortar dark
  g.fillStyle = '#cfc3b0'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(120,105,85,0.35)' : 'rgba(255,250,240,0.3)'; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  gb.fillStyle = '#242424'; gb.fillRect(0, 0, W, H);
  const course = 0.086 * px, bh = 0.076 * px, bl = 0.23 * px, mod = 0.24 * px;
  for (let r = 0; r < 12; r++) {
    const y0 = H - (r + 1) * course + 0.005 * px, off = (r % 2) * mod / 2;
    for (let i = 0; i < 4; i++) {
      const roll = Math.random();
      const col = roll < 0.12 ? `hsl(${4 + Math.random() * 8}, ${35 + Math.random() * 10}%, ${22 + Math.random() * 6}%)`         // dark clinker
        : roll < 0.24 ? `hsl(${18 + Math.random() * 8}, ${55 + Math.random() * 10}%, ${46 + Math.random() * 8}%)`               // pale orange
        : `hsl(${8 + Math.random() * 10}, ${48 + Math.random() * 14}%, ${34 + Math.random() * 9}%)`;                            // the usual red
      const x0 = off + i * mod;
      for (const ox of [0, -W]) {                                      // the half-bond row wraps round the tile edge
        const x = x0 + ox;
        g.fillStyle = col; g.fillRect(x, y0, bl, bh);
        const gr = g.createLinearGradient(x, y0, x, y0 + bh); gr.addColorStop(0, 'rgba(255,230,200,0.12)'); gr.addColorStop(1, 'rgba(40,10,0,0.18)');
        g.fillStyle = gr; g.fillRect(x, y0, bl, bh);
        for (let k = 0; k < 70; k++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(30,10,5,0.25)' : 'rgba(255,200,160,0.18)'; g.fillRect(x + Math.random() * bl, y0 + Math.random() * bh, 1.5 + Math.random() * 2, 1.5); }
        if (Math.random() < 0.3) { g.fillStyle = 'rgba(20,10,5,0.2)'; g.fillRect(x + Math.random() * bl * 0.6, y0 + Math.random() * bh * 0.6, bl * 0.4, bh * 0.4); }   // a scorch patch
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, y0 + bh - 2, bl, 2); g.fillRect(x + bl - 2, y0, 2, bh);                  // shadow under and beside each brick
        gb.fillStyle = `rgb(${205 + Math.random() * 40},${205 + Math.random() * 40},${205 + Math.random() * 40})`; gb.fillRect(x + 1, y0 + 1, bl - 2, bh - 2);
        for (let k = 0; k < 40; k++) { gb.fillStyle = 'rgba(120,120,120,0.5)'; gb.fillRect(x + Math.random() * bl, y0 + Math.random() * bh, 2, 2); }
      }
    }
  }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const map = mk(c); map.colorSpace = THREE.SRGBColorSpace;
  return { map, bump: mk(b) };
}
// Brick UVs from the world position and the face direction: bricks run along the wall on vertical faces,
// courses stay level, and the pattern continues round corners and across separate wall pieces.
function brickUV(mesh) {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry, pos = geo.attributes.position, nor = geo.attributes.normal;
  if (!pos || !nor) return;
  const uv = new Float32Array(pos.count * 2), v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); n.fromBufferAttribute(nor, i).applyMatrix3(nm);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    let u, w;
    if (ay >= ax && ay >= az) { u = v.x; w = v.z; } else if (ax >= az) { u = v.z; w = v.y; } else { u = v.x; w = v.y; }
    uv[2 * i] = u / BRICK_TILE[0]; uv[2 * i + 1] = w / BRICK_TILE[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// --- IKEA-style kitchen finishes (reference-photos/inspiration/ikea-kitchen): dark stained-ash drawer fronts with a
// horizontal grain, greige flat doors, and a Calacatta-look marble on the benchtop and the full-height splashback.
function ashTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#3d2c22'; g.fillRect(0, 0, c.width, c.height);
  g.lineCap = 'round';
  for (let k = 0; k < 90; k++) {                                        // long wavering grain lines along the front
    const y = rnd(0, 512), dark = Math.random() < 0.55;
    g.strokeStyle = dark ? `rgba(28,18,12,${rnd(0.25, 0.55)})` : `rgba(120,88,62,${rnd(0.18, 0.4)})`;
    g.lineWidth = rnd(0.8, 3); g.beginPath(); g.moveTo(-10, y);
    for (let x = 0; x < c.width + 60; x += 60) g.quadraticCurveTo(x + 30, y + rnd(-6, 6), x + 60, y + rnd(-3, 3));
    g.stroke();
  }
  for (let k = 0; k < 5; k++) {                                         // cathedral arcs, the wide figure of crown-cut ash
    const cx = rnd(0, 1024), cy = rnd(150, 360), r0 = rnd(120, 260);
    for (let r = r0; r > 20; r -= rnd(10, 22)) {
      g.strokeStyle = `rgba(20,12,8,${rnd(0.12, 0.3)})`; g.lineWidth = rnd(1, 2.5);
      g.beginPath(); g.ellipse(cx, cy, r * 2.6, r * 0.5, 0, Math.PI, 2 * Math.PI); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const MARBLE_TILE = [1.6, 1.6];
function marbleTexture(bold = false, gold = true) {   // gold false: a Carrara-type white, soft grey veins only                                // bold: Calacatta-style, veins wide and grey enough to read across a room
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 6; i++) { const gr = g.createRadialGradient(rnd(0, 1024), rnd(0, 1024), 20, 512, 512, 700); gr.addColorStop(0, 'rgba(205,200,190,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024); }
  g.lineCap = 'round';
  const vein = (x, y, ang, len, w, col) => {                            // a branching vein that wanders across the slab
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    let a = ang;
    for (let d = 0; d < len; d += 18) { a += rnd(-0.35, 0.35); x += Math.cos(a) * 18; y += Math.sin(a) * 18; g.lineTo(x, y); if (Math.random() < 0.08 && w > 1.2) vein(x, y, a + rnd(-1, 1), len * 0.35, w * 0.55, col); }
    g.stroke();
  };
  const bw = bold ? 2.6 : 1;
  for (let k = 0; k < 7; k++) vein(rnd(-100, 1100), rnd(-100, 1100), rnd(0, Math.PI), rnd(500, 1300), rnd(1.5, 4) * bw, bold ? `rgba(118,112,104,${rnd(0.55, 0.8)})` : `rgba(150,140,128,${rnd(0.35, 0.6)})`);
  if (gold) for (let k = 0; k < 5; k++) vein(rnd(-100, 1100), rnd(-100, 1100), rnd(0, Math.PI), rnd(300, 900), rnd(0.8, 1.8), `rgba(184,150,96,${rnd(0.3, 0.5)})`);   // the warm gold veins
  else for (let k = 0; k < 6; k++) vein(rnd(-100, 1100), rnd(-100, 1100), rnd(0, Math.PI), rnd(300, 900), rnd(0.8, 1.8), `rgba(160,160,158,${rnd(0.3, 0.5)})`);
  for (let k = 0; k < 14; k++) vein(rnd(0, 1024), rnd(0, 1024), rnd(0, Math.PI), rnd(100, 400), rnd(0.5, 1), 'rgba(170,165,155,0.3)');
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// --- Walnut & quartzite kitchen finishes (the walnut kitchen reference): quarter-cut American walnut veneer, grain
// running up the doors, warm mid-dark brown; and a taupe quartzite (Taj Mahal type) with soft clouded bands of
// greige and cream, the odd fine vein, honed to a low sheen.
// Soft layer for the canvas textures: draw(ctx) paints sharp shapes onto a spare canvas, which is then blurred once onto
// g. (A blur filter left on for every shape made the browser blur the whole canvas per shape: thousands of full blurs
// per texture, seconds of load time, and enough GPU work to lose canvases.) wrap: the shapes are drawn at the nine
// tile offsets and the blurred layer is tiled the same way, so the result still joins seamlessly at the edges.
function softLayer(g, W, H, px, draw, wrap = true) {
  const l = document.createElement('canvas'); l.width = W; l.height = H; const lg = l.getContext('2d');
  const offs = wrap ? [-1, 0, 1].flatMap(i => [-1, 0, 1].map(j => [i * W, j * H])) : [[0, 0]];
  for (const [ox, oy] of offs) { lg.save(); lg.translate(ox, oy); draw(lg); lg.restore(); }
  g.save(); g.filter = `blur(${px}px)`;
  for (const [ox, oy] of offs) g.drawImage(l, ox, oy);
  g.restore();
}
const WALNUT_TILE = [0.8, 1.6];                                          // one texture = 800 wide x 1600 tall of veneer
function walnutTexture() {
  // quarter-cut walnut as in the reference: an even, warm mid-brown with a fine straight grain up the leaf, only
  // gentle variation between the stripes (no wild figure), satin lacquer
  const W = 1024, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#75573f'; g.fillRect(0, 0, W, H);
  const stripes = Array.from({ length: 18 }, () => ({ x: rnd(0, W), w: rnd(40, 160), dark: Math.random() < 0.5, o: rnd(0.1, 0.25) }));
  softLayer(g, W, H, 12, l => { for (const q of stripes) {                 // soft wide stripes: the leaves differ a touch in tone
    l.fillStyle = q.dark ? `rgba(84,56,38,${q.o + 0.02})` : `rgba(150,112,82,${q.o})`; l.fillRect(q.x, -20, q.w, H + 40);
  } });
  for (let k = 0; k < 520; k++) {                                        // fine grain lines, straight with a slight drift
    let x = rnd(0, W); const dark = Math.random() < 0.65;
    g.strokeStyle = dark ? `rgba(62,40,26,${rnd(0.08, 0.22)})` : `rgba(160,122,90,${rnd(0.06, 0.16)})`;
    g.lineWidth = rnd(0.7, 2.2); g.beginPath(); g.moveTo(x, -10);
    for (let y = 0; y < H + 20; y += 128) { x += rnd(-1.5, 1.5); g.lineTo(x, y); }
    g.stroke();
  }
  for (let k = 0; k < 60; k++) {                                         // short pores / flecks along the grain
    const x = rnd(0, W), y = rnd(0, H);
    g.fillStyle = `rgba(55,35,22,${rnd(0.15, 0.3)})`; g.fillRect(x, y, 1.2, rnd(8, 30));
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const OAK_TILE = [0.8, 1.6];                                             // one texture = 800 wide x 1600 tall of veneer
function oakTexture() {
  // crown-free quarter-cut light oak, as in the reference photo: pale honey-blond, fine straight grain up the doors,
  // soft leaf-to-leaf tone changes, matt lacquer
  const W = 1024, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#f0e2cc'; g.fillRect(0, 0, W, H);
  const stripes = Array.from({ length: 16 }, () => ({ x: rnd(0, W), w: rnd(40, 180), dark: Math.random() < 0.5, o: rnd(0.08, 0.2) }));
  softLayer(g, W, H, 12, l => { for (const q of stripes) {
    l.fillStyle = q.dark ? `rgba(205,180,150,${q.o})` : `rgba(248,240,228,${q.o})`; l.fillRect(q.x, -20, q.w, H + 40);
  } });
  for (let k = 0; k < 480; k++) {                                        // fine grain lines, straight with a slight drift
    let x = rnd(0, W); const dark = Math.random() < 0.6;
    g.strokeStyle = dark ? `rgba(175,145,112,${rnd(0.05, 0.16)})` : `rgba(250,244,234,${rnd(0.05, 0.14)})`;
    g.lineWidth = rnd(0.7, 2); g.beginPath(); g.moveTo(x, -10);
    for (let y = 0; y < H + 20; y += 128) { x += rnd(-1.5, 1.5); g.lineTo(x, y); }
    g.stroke();
  }
  for (let k = 0; k < 140; k++) {                                        // oak's short ray flecks across the grain
    const x = rnd(0, W), y = rnd(0, H);
    g.fillStyle = `rgba(236,218,192,${rnd(0.15, 0.3)})`; g.fillRect(x, y, rnd(6, 20), 1.2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function quartziteTexture() {
  // taupe quartzite (Taj Mahal type) as in the reference: a warm greige ground with large soft clouds of deeper taupe
  // and milky cream drifting diagonally across the slab, feathered edges, only the faintest pale veining, polished
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#c6b9a7'; g.fillRect(0, 0, S, S);
  // draw everything three times across (offset by the tile) so the clouds wrap round the tile edges seamlessly
  const wrap = f => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); f(); g.restore(); } };
  const clouds = [];
  for (let k = 0; k < 14; k++) clouds.push({ x: rnd(0, S), y: rnd(0, S), rx: rnd(160, 420), ry: rnd(50, 140), a: rnd(-0.7, -0.3), dark: Math.random() < 0.5, o: rnd(0.4, 0.75) });
  softLayer(g, S, S, 45, l => { for (const q of clouds) { l.fillStyle = q.dark ? `rgba(138,119,98,${q.o})` : `rgba(234,227,213,${q.o})`; l.beginPath(); l.ellipse(q.x, q.y, q.rx, q.ry, q.a, 0, 2 * Math.PI); l.fill(); } });
  const drifts = [];
  for (let k = 0; k < 7; k++) drifts.push({ x: rnd(0, S), y: rnd(0, S), len: rnd(300, 700), a: rnd(-0.6, -0.35), w: rnd(14, 40), dark: Math.random() < 0.6, o: rnd(0.25, 0.4) });
  for (const d of drifts) { d.pts = []; let x = d.x, y = d.y, a = d.a; for (let t = 0; t < d.len; t += 30) { a += rnd(-0.08, 0.08); x += Math.cos(a) * 30; y += Math.sin(a) * 30; d.pts.push([x, y]); } }
  softLayer(g, S, S, 20, l => { for (const d of drifts) {                 // softer, narrower drifts that give the flowing figure
    l.strokeStyle = d.dark ? `rgba(135,117,97,${d.o})` : `rgba(244,239,229,${d.o + 0.1})`; l.lineWidth = d.w; l.lineCap = 'round';
    l.beginPath(); l.moveTo(d.x, d.y); for (const [x, y] of d.pts) l.lineTo(x, y); l.stroke();
  } });
  for (let k = 0; k < 3; k++) {                                          // the faintest milky veins
    let x = rnd(0, S), y = rnd(0, S), a = rnd(-0.6, -0.3);
    g.strokeStyle = 'rgba(248,244,236,0.35)'; g.lineWidth = rnd(0.8, 1.6); g.beginPath(); g.moveTo(x, y);
    for (let d = 0; d < rnd(200, 500); d += 14) { a += rnd(-0.15, 0.15); x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(120,104,88,0.08)' : 'rgba(255,250,242,0.1)'; g.fillRect(rnd(0, S), rnd(0, S), 1.5, 1.5); }   // crystalline speckle
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// --- garden bed finishes: hardwood sleeper edging and white pebble mulch -------------------------------------------
// Hardwood sleeper (merbau-type, oiled then weathered a little): warm reddish brown, grain running along the sleeper,
// a few checks (drying cracks) and end-to-end tone drift. Tile 1.2 m along x 0.2 m (u along the run, v up).
const SLEEPER_TILE = [1.2, 0.2];
function sleeperTexture() {
  const W = 1024, H = 192, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#6e4630'; g.fillRect(0, 0, W, H);
  const wrapX = f => { for (const ox of [-W, 0, W]) { g.save(); g.translate(ox, 0); f(); g.restore(); } };
  const drifts = Array.from({ length: 10 }, () => ({ x: rnd(0, W), w: rnd(60, 200), dark: Math.random() < 0.5, o: rnd(0.1, 0.22) }));
  softLayer(g, W, H, 10, l => { for (const d of drifts) { l.fillStyle = d.dark ? `rgba(60,34,22,${d.o})` : `rgba(150,104,72,${d.o})`; l.fillRect(d.x, -20, d.w, H + 40); } });
  const lines = Array.from({ length: 110 }, () => ({ y: rnd(0, H), dark: Math.random() < 0.65, o: rnd(0.12, 0.35), w: rnd(0.6, 1.8), ph: rnd(0, 6), amp: rnd(0.5, 2.5) }));
  wrapX(() => { for (const l of lines) {                                 // grain along the sleeper, whole waves per tile
    g.strokeStyle = l.dark ? `rgba(55,30,18,${l.o})` : `rgba(165,118,84,${l.o})`; g.lineWidth = l.w; g.beginPath();
    for (let x = 0; x <= W; x += 16) { const y = l.y + Math.sin(x / W * Math.PI * 4 + l.ph) * l.amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  } });
  for (let k = 0; k < 6; k++) {                                            // drying checks
    const x = rnd(0, W - 120), y = rnd(20, H - 20), len = rnd(40, 140);
    g.strokeStyle = 'rgba(30,16,10,0.55)'; g.lineWidth = rnd(0.8, 1.5); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + rnd(-3, 3), x + len, y + rnd(-2, 2)); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// White garden pebbles, 25-55 mm: rounded stones in white, cream and pale grey packed over a shadowed bed, each with
// a soft highlight and a contact shadow; the same canvas (as luminance) is the bump map so the stones stand proud.
// Seamless, one tile 0.5 m.
const PEBBLE_TILE = [0.5, 0.5];
function pebbleTextures() {
  const S = 1024, px = S / 0.5, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = b.height = S; const gb = b.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#8f8a82'; g.fillRect(0, 0, S, S); gb.fillStyle = '#000'; gb.fillRect(0, 0, S, S);
  const stones = [];
  for (let k = 0; k < 900; k++) stones.push({ x: rnd(0, S), y: rnd(0, S), r: rnd(0.012, 0.027) * px, e: rnd(0.65, 1), a: rnd(0, Math.PI), t: Math.random() });
  stones.sort((p, q) => q.r - p.r);                                        // big ones first, small ones fill the gaps on top
  const wrap = f => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) f(ox, oy); };
  for (const p of stones) wrap((ox, oy) => {
    const x = p.x + ox, y = p.y + oy; if (x < -60 || x > S + 60 || y < -60 || y > S + 60) return;
    g.fillStyle = 'rgba(40,36,32,0.35)'; g.beginPath(); g.ellipse(x + p.r * 0.18, y + p.r * 0.22, p.r * 1.05, p.r * p.e * 1.05, p.a, 0, 7); g.fill();   // contact shadow
    const base = p.t < 0.6 ? [238, 236, 230] : p.t < 0.85 ? [226, 220, 206] : [200, 200, 196];                        // white, cream, pale grey
    const gr = g.createRadialGradient(x - p.r * 0.35, y - p.r * 0.4, p.r * 0.1, x, y, p.r * 1.05);
    gr.addColorStop(0, `rgb(${Math.min(255, base[0] + 14)},${Math.min(255, base[1] + 14)},${Math.min(255, base[2] + 14)})`);
    gr.addColorStop(0.7, `rgb(${base[0]},${base[1]},${base[2]})`); gr.addColorStop(1, `rgb(${base[0] - 45},${base[1] - 45},${base[2] - 45})`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, p.r, p.r * p.e, p.a, 0, 7); g.fill();
    const gbr = gb.createRadialGradient(x, y, 0, x, y, p.r); gbr.addColorStop(0, '#fff'); gbr.addColorStop(1, '#333');
    gb.fillStyle = gbr; gb.beginPath(); gb.ellipse(x, y, p.r, p.r * p.e, p.a, 0, 7); gb.fill();
  });
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const map = mk(c); map.colorSpace = THREE.SRGBColorSpace;
  return { map, bump: mk(b) };
}
// World-aligned UVs on any box: the pattern runs along each face and continues across neighbouring pieces
function surfUV(mesh, tile) {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry, pos = geo.attributes.position, nor = geo.attributes.normal;
  if (!pos || !nor) return mesh;
  const uv = new Float32Array(pos.count * 2), v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); n.fromBufferAttribute(nor, i).applyMatrix3(nm);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    let u, w;
    if (ay >= ax && ay >= az) { u = v.x; w = v.z; } else if (ax >= az) { u = v.z; w = v.y; } else { u = v.x; w = v.y; }
    uv[2 * i] = u / tile[0]; uv[2 * i + 1] = w / tile[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return mesh;
}

// White subway tiles, 75 x 150 in running bond with pale grey grout; one texture tile = 4 x 8 tiles (0.6 x 0.6 m).
// The bump map sinks the grout and rounds each tile's edge so it catches the light like a glazed tile.
const SUBWAY_TILE = [0.6, 0.6];
function subwayTextures() {
  const S = 1024, px = S / 0.6, tw = 0.15 * px, th = 0.075 * px, gr = 0.0025 * px;
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = b.height = S; const gb = b.getContext('2d');
  g.fillStyle = '#c9c6c0'; g.fillRect(0, 0, S, S); gb.fillStyle = '#202020'; gb.fillRect(0, 0, S, S);
  for (let r = 0; r < 8; r++) {
    const y = r * th, off = (r % 2) * tw / 2;
    for (let i = -1; i < 5; i++) {
      const x = off + i * tw, l = 94 + Math.random() * 3;
      g.fillStyle = `hsl(45, ${6 + Math.random() * 6}%, ${l}%)`; g.fillRect(x + gr / 2, y + gr / 2, tw - gr, th - gr);
      const sh = g.createLinearGradient(0, y, 0, y + th); sh.addColorStop(0, 'rgba(255,255,255,0.5)'); sh.addColorStop(0.15, 'rgba(255,255,255,0)'); sh.addColorStop(0.85, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(90,85,80,0.18)');
      g.fillStyle = sh; g.fillRect(x + gr / 2, y + gr / 2, tw - gr, th - gr);
      gb.fillStyle = '#b0b0b0'; gb.fillRect(x + gr / 2, y + gr / 2, tw - gr, th - gr);
      gb.fillStyle = '#f0f0f0'; gb.fillRect(x + gr * 1.6, y + gr * 1.6, tw - gr * 3.2, th - gr * 3.2);
    }
  }
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const map = mk(c); map.colorSpace = THREE.SRGBColorSpace;
  return { map, bump: mk(b) };
}
function subwayMat() {
  if (!M.subway) { const t = subwayTextures(); M.subway = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.025, roughness: 0.16, color: 0xffffff }); }
  return M.subway;
}
// A benchtop slab with a rectangular cut-out for an undermount sink: four pieces round the hole
function benchWithCut(group, x0, x1, y0, y1, z0, z1, mat, cut, uv) {
  const put = (a0, a1, b0, b1) => { if (a1 - a0 > 0.002 && b1 - b0 > 0.002) { const m = box(group, a0, a1, b0, b1, z0, z1, mat); if (uv) uv(m); } };
  if (!cut) return put(x0, x1, y0, y1);
  const [cx0, cx1, cy0, cy1] = cut;
  put(x0, cx0, y0, y1); put(cx1, x1, y0, y1); put(cx0, cx1, y0, cy0); put(cx0, cx1, cy1, y1);
}
// A cabinet carcass under a benchtop that stops short under any sink cut-out, so the bowl has room to hang
function carcassBox(group, x0, x1, y0, y1, z0, z1, mat, cuts = [], cutTop = 0.58) {
  const hit = cuts.find(([a0, a1, b0, b1]) => a1 > x0 && a0 < x1 && b1 > y0 && b0 < y1);
  if (!hit) return box(group, x0, x1, y0, y1, z0, z1, mat);
  const clip = [Math.max(hit[0], x0), Math.min(hit[1], x1), Math.max(hit[2], y0), Math.min(hit[3], y1)];
  box(group, x0, x1, y0, y1, z0, cutTop, mat);
  benchWithCut(group, x0, x1, y0, y1, cutTop, z1, mat, clip);
}
// Undermount stainless sink: hollow bowls (thin walls, a floor that falls to a waste, a slightly rounded look from a
// darker lower band), a rolled divider on a double bowl, and a gooseneck mixer in brushed nickel. The bowls split
// along 'along' ('x' or 'y'); the tap sits behind the bowls at (tx, ty), its spout facing 'face' (lot direction).
// Gas cooktop on the bench (the walnut kitchen reference): black glass base, four burners (the front-right a wok
// burner), two matt cast-iron trivet grids level across the top, and silver knobs along the front edge. Front = +y.
function gasCooktop(group, x0, x1, y0, y1, z) {
  const base = M.gasBase || (M.gasBase = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.18, metalness: 0.2 }));
  const iron = M.castIron || (M.castIron = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.75, metalness: 0.2 }));
  const alu = M.burnerAlu || (M.burnerAlu = new THREE.MeshStandardMaterial({ color: 0x8e9194, roughness: 0.45, metalness: 0.7 }));
  const knob = M.gasKnob || (M.gasKnob = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.85 }));
  box(group, x0, x1, y0, y1, z, z + 0.006, base);
  const cyl = (r, h, mat, x, y, zb) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat); m.position.copy(L(x, y, zb + h / 2)); m.castShadow = m.receiveShadow = true; group.add(m); };
  const W = x1 - x0, D = y1 - y0, ky = y1 - 0.035, gy0 = y0 + 0.02, gy1 = ky - 0.035;          // knobs strip at the front, grids behind
  const cx = [x0 + W * 0.25, x0 + W * 0.75], cy = [gy0 + (gy1 - gy0) * 0.27, gy0 + (gy1 - gy0) * 0.73];
  for (const x of cx) for (const y of cy) {
    const wok = x === cx[1] && y === cy[1], r = wok ? 0.055 : 0.042;
    cyl(r + 0.01, 0.008, alu, x, y, z + 0.006); cyl(r, 0.012, alu, x, y, z + 0.014); cyl(r * 0.72, 0.006, iron, x, y, z + 0.026);   // spreader, burner, cap
  }
  // trivets: 12 x 12 bars, 30 above the base, a frame round each half with bars through the burner centres both ways
  const zt0 = z + 0.03, zt1 = zt0 + 0.012, t = 0.006;
  for (const [a, b] of [[x0 + 0.01, (x0 + x1) / 2 - 0.004], [(x0 + x1) / 2 + 0.004, x1 - 0.01]]) {
    const m = (a + b) / 2;
    for (const y of [gy0, gy1]) box(group, a, b, y - t, y + t, zt0, zt1, iron);
    for (const x of [a, b]) box(group, x - t, x + t, gy0, gy1, zt0, zt1, iron);
    box(group, m - t, m + t, gy0, gy1, zt0, zt1, iron);
    for (const y of cy) box(group, a, b, y - t, y + t, zt0, zt1, iron);
    for (const x of [a, b]) for (const y of [gy0, gy1]) box(group, x - t, x + t, y - t, y + t, z + 0.006, zt0, iron);   // feet
  }
  for (let i = 0; i < 4; i++) cyl(0.017, 0.022, knob, x0 + W * (0.14 + i * 0.24), ky, z + 0.006);
}
function realSink(group, x0, x1, y0, y1, zTop, n, along, tap) {
  // brushed stainless: fine streaks on a light grey, bright on the walls and a touch darker toward the waste
  if (!M.sinkSteel) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#c8cbcd'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { const y = Math.random() * 256, l = 170 + Math.random() * 70; g.strokeStyle = `rgba(${l},${l + 3},${l + 5},0.35)`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(Math.random() * 256 - 60, y); g.lineTo(Math.random() * 256 + 60, y + (Math.random() - 0.5) * 0.8); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(3, 3);
    M.sinkSteel = new THREE.MeshStandardMaterial({ map: t, color: 0xf2f4f5, roughness: 0.28, metalness: 0.35 });
    M.sinkDeep = new THREE.MeshStandardMaterial({ map: t, color: 0xb7bbbe, roughness: 0.3, metalness: 0.35 });
    M.sinkFloor = new THREE.MeshStandardMaterial({ map: t, color: 0xa4a8ab, roughness: 0.3, metalness: 0.35 });
  }
  const steel = M.sinkSteel, deep = M.sinkDeep, floorM = M.sinkFloor;
  const d = 0.25, t = 0.01, zf = zTop - d, div = 0.03;          // 250 deep bowls, like a real undermount sink
  const span = along === 'x' ? x1 - x0 : y1 - y0, bw = (span - div * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const a0 = (along === 'x' ? x0 : y0) + i * (bw + div), a1 = a0 + bw;
    const [bx0, bx1, by0, by1] = along === 'x' ? [a0, a1, y0, y1] : [x0, x1, a0, a1];
    box(group, bx0, bx1, by0, by1, zf - t, zf, floorM);                                     // floor
    for (const [p0, p1, q0, q1] of [[bx0, bx1, by0, by0 + t], [bx0, bx1, by1 - t, by1], [bx0, bx0 + t, by0, by1], [bx1 - t, bx1, by0, by1]]) {
      box(group, p0, p1, q0, q1, zf, zf + 0.08, deep); box(group, p0, p1, q0, q1, zf + 0.08, zTop - 0.002, steel);   // walls, darker toward the floor
    }
    const cxm = (bx0 + bx1) / 2, cym = (by0 + by1) / 2;
    const waste = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 28), steel); waste.position.copy(L(cxm, cym, zf + 0.002)); group.add(waste);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 20), M.frameA); hole.position.copy(L(cxm, cym, zf + 0.003)); group.add(hole);
    for (let k = -2; k <= 2; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.006, 0.004), steel); sl.position.copy(L(cxm, cym + k * 0.009, zf + 0.004)); group.add(sl); }
    if (i < n - 1) {                                                                          // divider, just below the benchtop
      const d0 = a1, d1 = a1 + div;
      if (along === 'x') box(group, d0, d1, y0, y1, zf, zTop - 0.012, steel); else box(group, x0, x1, d0, d1, zf, zTop - 0.012, steel);
    }
  }
  if (tap) sinkTap(group, tap.x, tap.y, zTop, tap.face);
}
function sinkTap(group, x, y, z, face) {
  const nickel = M.nickel || (M.nickel = new THREE.MeshStandardMaterial({ color: 0xd4d6d8, roughness: 0.22, metalness: 0.6 }));
  const g = new THREE.Group(); g.position.copy(L(x, y, z));
  // built with the spout reaching toward three +X (lot -x), then turned to face the way asked
  g.rotation.y = { '-x': 0, '+x': Math.PI, '+y': -Math.PI / 2, '-y': Math.PI / 2 }[face];
  const add = (geo, px, py, pz) => { const m = new THREE.Mesh(geo, nickel); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.028, 0.03, 0.02, 24), 0, 0.01, 0);                          // base collar
  add(new THREE.CylinderGeometry(0.02, 0.022, 0.22, 20), 0, 0.13, 0);                           // body
  add(new THREE.CylinderGeometry(0.013, 0.015, 0.12, 16), 0, 0.3, 0);                           // riser
  const R = 0.1, arc = add(new THREE.TorusGeometry(R, 0.013, 12, 32, Math.PI), R, 0.36, 0);    // gooseneck: up from the riser and over to the front
  add(new THREE.CylinderGeometry(0.014, 0.012, 0.05, 16), 2 * R, 0.335, 0);                     // spout end
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.004, 16), 2 * R, 0.309, 0).material = M.frameA;  // aerator
  const lever = add(new THREE.BoxGeometry(0.012, 0.012, 0.11), 0, 0.17, 0.07); lever.rotation.x = -0.35;   // side lever
  void arc; group.add(g);
}

function mats() {
  for (const k in M) delete M[k];        // fresh set per build, so a rebuild never reuses disposed materials
  const s = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, shadowSide: THREE.FrontSide, ...o });
  M.white = s(0xe8e4dc);                 // painted brick, main house
  { const bt = brickTextures(); M.red = s(0xffffff, { map: bt.map, bumpMap: bt.bump, bumpScale: 0.035, roughness: 0.88 }); M.red.userData.brick = true; }   // face brick, wing and chimney
  M.intWall = s(0xf3f0e8);                // Dulux Natural White (client 2026-10-21), walls and ceilings
  M.tile = s(0xb85c3c, { roughness: 0.8 });     // terracotta
  M.metal = s(0x8d9196, { roughness: 0.5, metalness: 0.4 });
  M.fibro = s(0x9ea3a0);
  M.robe = s(0xd4b07a, { roughness: 0.65 });
  M.robePanel = s(0xdcb882, { roughness: 0.6 });     // light honey oak robe doors
  M.sage = s(0x7d8f6a, { roughness: 0.7 });          // sage-green painted timber (bay frames)
  M.brass = s(0xb9975a, { roughness: 0.35, metalness: 0.7 });
  M.amber = new THREE.MeshPhysicalMaterial({ color: 0xe0a94a, transparent: true, opacity: 0.7, roughness: 0.4 });
  M.canvasStripe = s(0xb08a55, { roughness: 0.9 });
  M.canvasBeige = s(0xd9cdb0, { roughness: 0.9 });
  M.lining = s(0xc79a5e, { roughness: 0.7 });        // covered-area lining boards
  M.iron = s(0x8a8d90, { roughness: 0.6, metalness: 0.5 });
  M.creamMetal = s(0xe4dcc6, { roughness: 0.5, metalness: 0.3 });
  M.bathTile = s(0xe6d8a8, { roughness: 0.35 });
  M.vanityTop = s(0xd8cfbf, { roughness: 0.5 });
  M.darkTimber = s(0x4a3222);
  M.concrete = s(0xb7b9b8);
  M.tess = new THREE.MeshStandardMaterial({ map: tessTexture(), roughness: 0.75 });   // back yard: porch-style tessellated tiles
  M.tessBand = new THREE.MeshStandardMaterial({ map: tessBandTexture(), roughness: 0.75 });
  M.tessRed = s(0xa4553d, { roughness: 0.75 }); M.tessBlack = s(0x2e2d30, { roughness: 0.75 });
  M.tileFloor = s(0x8f4a3a);
  M.grass = s(0xffffff, { map: lawnTexture(), roughness: 0.95 }); M.grass.bumpMap = M.grass.map; M.grass.bumpScale = 0.008; M.grass.userData.tile = [1, 1];
  M.paving = s(0xc2c1bb);
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xd6ecff, transparent: true, opacity: 0.22, roughness: 0.1, side: THREE.DoubleSide });
  M.frameT = s(0x3a2a1c);
  M.frameA = s(0x2b2b2b, { metalness: 0.5, roughness: 0.4 });
  M.frameW = s(0xf1f1ee, { metalness: 0.15, roughness: 0.35 });   // white powder-coated aluminium (kitchen window, lounge doors)
  M.frameM = s(0x3c3d3e, { metalness: 0.35, roughness: 0.45 });   // Colorbond Monument aluminium (second-hand stacker on trial)
  // timber sliders painted two colours: Ace of Spades outside, white inside (box faces: +x -x +y -y +z -z)
  M.aceOfSpades = s(0x2e3033, { roughness: 0.55 });
  M.twoTone = [M.aceOfSpades, M.aceOfSpades, M.aceOfSpades, M.aceOfSpades, M.frameW, M.aceOfSpades];
  M.secMesh = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, transparent: true, opacity: 0.5, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });   // stainless security mesh
  M.door = s(0xb0703a, { roughness: 0.6 });          // honey-stained timber doors (photos)
  M.honey = s(0xa9652f, { roughness: 0.6 });         // kitchen joinery carcass
  M.honeyPanel = s(0xb8773d, { roughness: 0.55 });   // raised door panels
  M.trimDark = s(0x3b2317, { roughness: 0.6 });      // dark-stained skirting and architraves (hall, bedrooms, living)
  M.laminate = s(0x9a7a55, { roughness: 0.5 });      // benchtop: tan speckled laminate (listing photo)
  M.appliance = s(0xf2f2ef, { roughness: 0.35 });
  // downlight lens: glows when the lights are on (main.js sets the emissive level with the Lights switch)
  M.dlLens = s(0xfffaf2, { roughness: 0.3, emissive: 0xffe3c4, emissiveIntensity: 0 }); M.dlLens.userData.lamp = true;
  M.dlTrim = s(0xf4f3ef, { roughness: 0.4 });
  M.tileCream = s(0xe9e3d3, { roughness: 0.4 });
  M.grille = s(0x1f1f1f, { roughness: 0.5, metalness: 0.4 });
  M.lino = s(0xffffff, { map: linoTexture(), roughness: 0.8 }); M.lino.userData.tile = [1, 1];
  M.carpet = s(0xffffff, { map: carpetTexture(), roughness: 1 }); M.carpet.userData.tile = [1, 1];
  M.timber = s(0xffffff, { map: boardTexture(), roughness: 0.62 }); M.timber.bumpMap = M.timber.map; M.timber.bumpScale = 0.006;   // oiled oak: matte, smooth
  M.timber.userData.tile = BOARD_TILE;   // every timber floor is laid world-aligned at this size (worldUV), so boards match room to room
  M.fence = s(0xf4f2ee);
  M.paling = s(0xffffff, { map: palingTexture(), roughness: 0.9 }); M.paling.bumpMap = M.paling.map; M.paling.bumpScale = 0.02;
  M.railTimber = s(0x8b7b66, { roughness: 0.9 });   // rails and posts, plain treated pine
  M.green = s(0x3f5a3a);
  M.shed = s(0xb9bec2, { metalness: 0.5, roughness: 0.5 });
  M.ceiling = s(0xf3f0e8, { side: THREE.DoubleSide });   // Dulux Natural White, as the walls (was a cooler 0xf7f5f0)   // lit by sky bounce and the downlights, like any other surface white, as in the photos
  M.gutter = s(0x3a3a3a);
  return M;
}

function box(group, x0, x1, y0, y1, z0, z1, mat) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), z1 - z0, Math.abs(y1 - y0));
  const m = new THREE.Mesh(g, mat);
  m.position.copy(L((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}

// Polygon (fan) from lot-frame points, double sided.
function poly(group, pts, mat, double = true) {
  const v = pts.map(p => L(...p));
  const pos = [];
  for (let i = 1; i < v.length - 1; i++) pos.push(v[0], v[i], v[i + 1]);
  const g = new THREE.BufferGeometry().setFromPoints(pos);
  g.computeVertexNormals();
  const mm = double ? mat.clone() : mat;
  if (double) mm.side = THREE.DoubleSide;
  const m = new THREE.Mesh(g, mm);
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}

// Triangulated horizontal polygon for concave room footprints. Unlike the fan used
// by `poly`, this keeps the front room's bay as one continuous floor surface.
function floorPoly(group, pts, mat) {
  const contour = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos = [];
  for (const [a, b, c] of faces) pos.push(L(...pts[a]), L(...pts[b]), L(...pts[c]));
  const g = new THREE.BufferGeometry().setFromPoints(pos);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}

// Wall along the segment a->b (plan points), given thickness, from z0 to z1, with openings
// measured as distance along the wall from a. Returns nothing; adds pieces to group.
function wallSeg(group, a, b, thick, z0, z1, openings, mat, glassMat) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const phi = Math.atan2(-dy, -dx);            // rotation about Y so the box's X axis follows a->b
  const piece = (s0, s1, zz0, zz1, mm, th = thick) => {
    if (s1 - s0 < 1e-4 || zz1 - zz0 < 1e-4) return;
    const g = new THREE.BoxGeometry(s1 - s0, zz1 - zz0, th);
    const cx = a[0] + ux * (s0 + s1) / 2, cy = a[1] + uy * (s0 + s1) / 2;
    // An exterior wall gets a plaster skin on the inside wherever a room touches it, and brick
    // everywhere else. Each face is handled per room, so the skins stop exactly at the room's
    // walls and never wrap a corner or fall short of one.
    if (mm === M.white || mm === M.red) {
      const nx = -Math.sin(phi), ny = Math.cos(phi), zm = (zz0 + zz1) / 2, half = th / 2;
      const axisAligned = Math.abs(ux) < 1e-6 || Math.abs(uy) < 1e-6;
      const sOf = (px, py) => (px - a[0]) * ux + (py - a[1]) * uy;
      const cover = { 1: [], [-1]: [] };
      for (const sgn of [1, -1]) {
        const fx = a[0] + nx * sgn * half, fy = a[1] + ny * sgn * half;   // a point on this face
        for (const r of ROOMS) {
          if (r.ceil == null || zz1 <= r.floor - 0.5 || zz0 >= r.floor + r.ceil + 0.3) continue;
          if (!axisAligned) {                                            // bay walls: sample test, whole piece
            if (inRoom(a[0] + ux * (s0 + s1) / 2 + nx * sgn * (half + 0.06), a[1] + uy * (s0 + s1) / 2 + ny * sgn * (half + 0.06), zm)) cover[sgn].push([s0, s1]);
            continue;
          }
          const alongY = Math.abs(uy) > 0.5;
          const faceCoord = alongY ? fx : fy;
          const near = alongY ? [r.x0, r.x1] : [r.y0, r.y1];
          if (Math.abs(near[0] - faceCoord) > 0.03 && Math.abs(near[1] - faceCoord) > 0.03) continue;
          // the room must lie on this side of the face, not on the other side of the wall
          const roomCentre = alongY ? (r.x0 + r.x1) / 2 : (r.y0 + r.y1) / 2;
          if ((roomCentre - faceCoord) * (alongY ? nx * sgn : ny * sgn) < 0) continue;
          const t0 = alongY ? sOf(fx, r.y0) : sOf(r.x0, fy), t1 = alongY ? sOf(fx, r.y1) : sOf(r.x1, fy);
          const i0 = Math.max(s0, Math.min(t0, t1)), i1 = Math.min(s1, Math.max(t0, t1));
          if (i1 - i0 > 0.01) cover[sgn].push([i0, i1]);
        }
      }
      if (cover[1].length || cover[-1].length) {
        const cuts = new Set([s0, s1]);
        for (const sgn of [1, -1]) for (const [i0, i1] of cover[sgn]) { cuts.add(i0); cuts.add(i1); }
        const pts = [...cuts].sort((p, q) => p - q);
        const covered = (sgn, mid) => cover[sgn].some(([i0, i1]) => mid > i0 - 1e-6 && mid < i1 + 1e-6);
        const addBox = (t0, t1, off, thk, mat) => {
          if (t1 - t0 < 1e-3) return;
          const mid = (t0 + t1) / 2;
          const mk = new THREE.Mesh(new THREE.BoxGeometry(t1 - t0, zz1 - zz0, thk), mat);
          mk.position.copy(L(a[0] + ux * mid + nx * off, a[1] + uy * mid + ny * off, zm));
          mk.rotation.y = phi; mk.castShadow = mk.receiveShadow = true; group.add(mk);
        };
        for (let i = 0; i < pts.length - 1; i++) {
          const t0 = pts[i], t1 = pts[i + 1], mid = (t0 + t1) / 2;
          const pos = covered(1, mid), neg = covered(-1, mid);
          if (!pos && !neg) addBox(t0, t1, 0, th, mm);
          else {
            addBox(t0, t1, half / 2, half, pos ? M.intWall : mm);
            addBox(t0, t1, -half / 2, half, neg ? M.intWall : mm);
          }
        }
        return;
      }
    }
    const m = new THREE.Mesh(g, mm);
    m.position.copy(L(cx, cy, (zz0 + zz1) / 2));
    m.rotation.y = phi;
    // Transparent window panes must stay out of the shadow map. Three.js treats
    // their depth as opaque there, which otherwise stops the sun at the glass.
    // The surrounding frame pieces still cast their normal shadows.
    m.castShadow = !mm.transparent;
    m.receiveShadow = true;
    group.add(m);
  };
  const nx = -Math.sin(phi), ny = Math.cos(phi);
  const isWall = mat === M.white || mat === M.red || mat === M.intWall;
  // a strip on one face of the wall: along-wall s0..s1, height zz0..zz1, standing proud of the face by `proud`
  const strip = (s0, s1, zz0, zz1, sgn, proud, m) => {
    if (s1 - s0 < 1e-3 || zz1 - zz0 < 1e-3) return;
    const mid = (s0 + s1) / 2, off = sgn * (thick / 2 + proud / 2);
    const k = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, zz1 - zz0, proud), m);
    k.position.copy(L(a[0] + ux * mid + nx * off, a[1] + uy * mid + ny * off, (zz0 + zz1) / 2));
    k.rotation.y = phi; k.receiveShadow = true; group.add(k);
  };
  const axisAligned = Math.abs(ux) < 1e-6 || Math.abs(uy) < 1e-6;
  const sideRoom = (at, sgn) => {
    // angled (bay) walls: the room is on the side facing +y, into the house; never trim the street side
    if (!axisAligned && ny * sgn <= 0) return null;
    const px = a[0] + ux * at + nx * sgn * (thick / 2 + 0.08), py = a[1] + uy * at + ny * sgn * (thick / 2 + 0.08);
    return axisAligned ? roomAt(px, py) : (roomAt(px, py) || roomAt(px, py + 0.4));
  };
  // Split each solid wall run at every room boundary. A single midpoint test
  // lost entire rooms along long walls and short pieces beside windows.
  const skirt = (s0, s1, zz0) => {
    if (!isWall || s1 - s0 < 1e-4) return;
    for (const sgn of [1, -1]) {
      const cuts = [s0, s1];
      if (axisAligned) {
        const alongY = Math.abs(uy) > 0.5, base = alongY ? a[1] : a[0], dir = alongY ? uy : ux;
        for (const r of ROOMS) for (const edge of alongY ? [r.y0, r.y1] : [r.x0, r.x1]) {
          const t = (edge - base) * dir;
          if (t > s0 && t < s1) cuts.push(t);
        }
      }
      const points = [...new Set(cuts)].sort((a, b) => a - b);
      for (let i = 0; i < points.length - 1; i++) {
        const k0 = points[i], k1 = points[i + 1];
        if (k1 - k0 < 1e-3) continue;
        const r = sideRoom((k0 + k1) / 2, sgn);
        if (!r || zz0 > r.floor + 0.01) continue;
        // Let bay strips reach their wall ends instead of leaving 14 cm gaps.
        strip(k0, k1, r.floor, r.floor + 0.17, sgn, 0.018, trimFor(r));
        group.children[group.children.length - 1].name = 'Skirting board';
      }
    }
  };
  // architraves around a door, cased opening or window, on each room-facing side
  const archi = (o) => {
    if (!isWall || o.trim === false) return;                          // trim: false = tiled or plastered reveal, no timber
    for (const sgn of [1, -1]) {
      const r = sideRoom(o.at + o.w / 2, sgn); if (!r || o.plainIn === r.name) continue;   // plainIn: plaster reveal, no trim on that room's side
      // windows: the architrave legs stand on the sill board (stool); an apron strip sits under the stool
      const m = (o.honey ? M.honey : trimFor(r)), aw = o.kind === 'opening' ? 0.2 : 0.075, bot = o.kind === 'window' ? o.sill : r.floor;
      const left = o.leftArchi !== false, right = o.rightArchi !== false;
      if (left) strip(o.at - aw, o.at, bot, o.head + aw, sgn, 0.02, m);
      if (right) strip(o.at + o.w, o.at + o.w + aw, bot, o.head + aw, sgn, 0.02, m);
      strip(left ? o.at - aw : o.at, right ? o.at + o.w + aw : o.at + o.w, o.head, o.head + aw, sgn, 0.02, m);
      if (o.kind === 'window') {
        strip(o.at - aw - 0.02, o.at + o.w + aw + 0.02, o.sill - 0.03, o.sill, sgn, 0.06, m);   // sill board, just past the architrave
        strip(o.at - aw, o.at + o.w + aw, o.sill - 0.1, o.sill - 0.03, sgn, 0.02, m);           // apron under it
      }
    }
  };
  const ops = [...openings].sort((p, q) => p.at - q.at);
  let cur = 0;
  for (const o of ops) {
    piece(cur, o.at, z0, z1, mat); skirt(cur, o.at, z0); archi(o);
    if (o.kind === 'window') { if (o.sill > z0) piece(o.at, o.at + o.w, z0, o.sill, mat); if (!o.floorGlass) skirt(o.at, o.at + o.w, z0); }
    else if (o.sill - 0.05 > z0 + 0.01) piece(o.at, o.at + o.w, z0, o.sill - 0.05, mat);   // stop below the full 5 cm threshold, including its exposed front edge
    piece(o.at, o.at + o.w, o.head, z1, mat);
    if (o.kind === 'window') {
      // Fit the pane inside the frame aperture so its edge cannot flicker on the jamb.
      const f = o.frame === 'white' ? M.ceiling : o.frame === 'whiteAlu' ? M.frameW : o.frame === 'alu' ? M.frameA : o.frame === 'sage' ? M.sage : M.frameT, t = 0.05;
      piece(o.at + t, o.at + o.w - t, o.sill + t, o.head - t, o.amber ? M.amber : glassMat, 0.02);
      piece(o.at, o.at + t, o.sill, o.head, f); piece(o.at + o.w - t, o.at + o.w, o.sill, o.head, f);
      // Rails meet the stiles without overlapping their front faces.
      piece(o.at + t, o.at + o.w - t, o.sill, o.sill + t, f); piece(o.at + t, o.at + o.w - t, o.head - t, o.head, f);
      // panel joints (glazing bars) evenly across, for multi-panel glass walls
      for (let i = 1; i < (o.panels || 1); i++) { const m = o.at + o.w * i / o.panels; piece(m - 0.02, m + 0.02, o.sill + t, o.head - t, f); }
    } else if (o.kind === 'french' || o.kind === 'glassDoor' || o.kind === 'sliding') {
      // slim aluminium (charcoal, or white where the plan says): outer frame lining the full wall thickness, sill track, glazed leaves
      // whiteTimber: painted timber French doors with wide stiles and a deep bottom rail (second-hand set on trial)
      // twoTone: painted timber sliders, dark outside and white inside
      const timber = o.frame === 'whiteTimber', tt = o.frame === 'twoTone', fm = o.frame === 'whiteAlu' ? M.frameW : o.frame === 'monument' ? M.frameM : tt ? M.twoTone : timber ? M.fence : M.frameA, ft = timber || tt ? 0.06 : 0.05, th = thick + 0.004, base = o.sill;
      piece(o.at, o.at + ft, base, o.head, fm, th);
      piece(o.at + o.w - ft, o.at + o.w, base, o.head, fm, th);
      piece(o.at, o.at + o.w, o.head - ft, o.head, fm, th);
      piece(o.at + ft, o.at + o.w - ft, base, base + 0.02, fm, th);
      // leaves: sliding 4 (centre two slide), 3 (centre slides) or 2 (second slides); French 2, or 4 with fixed sidelights
      const n = o.leaves || (o.kind === 'sliding' ? 4 : o.kind === 'french' ? 2 : 1), overlap = o.kind === 'sliding' ? 0.04 : 0;
      const clear = o.w - 2 * ft, lw = clear / n + (o.kind === 'sliding' ? overlap : -0.004), lh = o.head - ft - base - 0.024, lt = timber || tt ? 0.045 : 0.04;
      const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; group.add(assembly);
      const nrm = L(-uy, ux, 0);
      for (let i = 0; i < n; i++) {
        const startS = o.at + ft + i * (clear / n) - (o.kind === 'sliding' && i > 0 ? overlap / 2 : 0) + (o.kind === 'sliding' && i === n - 1 ? -overlap / 2 : 0);
        const hingeEnd = (o.kind === 'french' && i >= n / 2) || (o.kind === 'glassDoor' && o.hinge === 'end');   // right-hand French leaves hinge on their far edge
        const fixed = o.kind === 'french' && n === 4 && (i === 0 || i === 3);                                     // sidelights
        const hingeS = hingeEnd ? startS + clear / n - 0.002 : startS + 0.002, dir = hingeEnd ? -1 : 1;
        const leaf = new THREE.Group(); leaf.rotation.y = phi;
        const part = (x0, x1, y0, y1, m, d = lt) => { const b = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), y1 - y0, d), m); b.position.set(dir * (x0 + x1) / 2, (y0 + y1) / 2, 0); b.castShadow = true; b.receiveShadow = true; b.userData.door = true; leaf.add(b); };
        const st = timber ? 0.1 : tt ? 0.09 : 0.05, br = timber ? 0.2 : tt ? 0.11 : 0.09, tr = timber ? 0.1 : tt ? 0.09 : 0.06;
        part(0, st, 0, lh, fm); part(lw - st, lw, 0, lh, fm); part(st, lw - st, 0, br, fm); part(st, lw - st, lh - tr, lh, fm);
        part(st, lw - st, br, lh - tr, M.glass, 0.008);
        // handle on the free edge (meeting stile for French/sliding centre panels)
        const hx = lw - st / 2;
        // stack: a stacker, one track per panel; the first panel ('end': the last) is fixed and the rest slide back behind it
        const toEnd = o.stack === 'end', k = toEnd ? n - 1 - i : i;   // k: place counting from the fixed panel
        const inner = o.kind === 'sliding' && (o.stack ? k > 0 : n === 4 ? i === 1 || i === 2 : i === 1);
        if ((o.kind !== 'sliding' || inner) && !fixed) for (const side of [1, -1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), M.grille); h.position.set(dir * ((n === 4 && o.kind === 'sliding' && i === 1) || toEnd ? st / 2 : hx), 1.05, side * (lt / 2 + 0.03)); h.userData.door = true; leaf.add(h); }
        const pivot = new THREE.Group();
        pivot.position.copy(L(a[0] + ux * hingeS, a[1] + uy * hingeS, base + 0.022));
        if (o.kind === 'sliding') {
          // outer panels fixed on the outer track; inner-track panels slide over their neighbour
          pivot.userData.swing = 0;
          if (o.stack) {
            pivot.position.add(nrm.clone().multiplyScalar((k - (n - 1) / 2) * 0.05));
            if (inner) pivot.userData.slide = L(ux, uy, 0).multiplyScalar(toEnd ? (o.at + o.w - ft) - (startS + lw) : -(startS - (o.at + ft)));
          } else {
            pivot.position.add(nrm.clone().multiplyScalar(inner ? 0.025 : -0.025));
            if (inner) pivot.userData.slide = L(ux, uy, 0).multiplyScalar(n === 4 && i === 2 ? (lw - overlap) : -(lw - overlap));
          }
        } else {
          pivot.userData.swing = fixed ? 0 : (hingeEnd ? -1 : 1) * (o.swing ?? 1) * Math.PI / 2;
        }
        pivot.add(leaf); assembly.add(pivot);
        pivot.userData.closedPosition = pivot.position.clone();
        if (o.screens && inner) {
          // mesh screen (security or fly) on its own track outside the glass, over this sliding panel; opens with it
          const sl = new THREE.Group(); sl.rotation.y = phi;
          const sp = (x0, x1, y0, y1, m, d) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, d), m); b.position.set(dir * (x0 + x1) / 2, (y0 + y1) / 2, 0); b.castShadow = true; b.userData.door = true; sl.add(b); };
          const sw = 0.045, sd = 0.022;
          sp(0, sw, 0, lh, fm, sd); sp(lw - sw, lw, 0, lh, fm, sd); sp(sw, lw - sw, 0, sw, fm, sd); sp(sw, lw - sw, lh - sw, lh, fm, sd);
          sp(sw, lw - sw, sw, lh - sw, M.secMesh, 0.003);
          const sv = new THREE.Group(); sv.add(sl); assembly.add(sv);
          sv.position.copy(L(a[0] + ux * hingeS, a[1] + uy * hingeS, base + 0.022)).add(nrm.clone().multiplyScalar(-0.075 - 0.028 * (k - 1)));
          sv.userData.swing = 0; sv.userData.slide = pivot.userData.slide.clone(); sv.userData.closedPosition = sv.position.clone();
        }
      }
    } else if (o.kind === 'door' && o.leaf !== 'none') {
      // lined opening: jambs and head through the full wall thickness, stop beads, leaf sized to the frame
      const base = Math.max(o.sill, z0), jw = 0.03, th = thick + 0.004;
      const liner = o.white ? M.fence : (o.cupboard ? M.door : trimLiner());
      piece(o.at, o.at + jw, base, o.head, liner, th);
      piece(o.at + o.w - jw, o.at + o.w, base, o.head, liner, th);
      piece(o.at, o.at + o.w, o.head - jw, o.head, liner, th);
      const lw = o.w - 2 * jw - 0.006, lh = o.head - jw - base - 0.012, lt = 0.036;
      const hingeEnd = o.hinge === 'end', hingeS = hingeEnd ? o.at + o.w - jw - 0.003 : o.at + jw + 0.003, dir = hingeEnd ? -1 : 1;
      const leaf = new THREE.Group(); leaf.rotation.y = phi;
      const add = (geo, m, x, y, z) => { const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; b.userData.door = true; leaf.add(b); return b; };
      const leafMat = o.white ? M.fence : M.door;
      add(new THREE.BoxGeometry(lw, lh, lt), leafMat, dir * lw / 2, lh / 2, 0);
      if (!o.white) {
        // four raised panels on each face (two tall, two short), as on the original timber doors
        const pw = (lw - 0.3) / 2, rows = [[0.18, 0.18 + lh * 0.52], [0.18 + lh * 0.52 + 0.12, lh - 0.14]];
        for (const side of [1, -1]) for (const [y0, y1] of rows) for (const c of [0, 1]) {
          const x0 = 0.1 + c * (pw + 0.1);
          add(new THREE.BoxGeometry(pw, y1 - y0, 0.008), M.honeyPanel || leafMat, dir * (x0 + pw / 2), (y0 + y1) / 2, side * (lt / 2 + 0.004));
        }
      }
      // lever handles on both faces, near the free edge
      const hm = o.white ? M.grille : (M.brass || M.metal), hx = dir * (lw - 0.07);
      for (const side of [1, -1]) {
        add(new THREE.BoxGeometry(0.03, 0.14, 0.012), hm, hx, 1.02, side * (lt / 2 + 0.006));
        add(new THREE.BoxGeometry(0.12, 0.018, 0.018), hm, hx - dir * 0.05, 1.04, side * (lt / 2 + 0.03));
      }
      const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; group.add(assembly);
      const pivot = new THREE.Group(); pivot.position.copy(L(a[0] + ux * hingeS, a[1] + uy * hingeS, base + 0.006));
      pivot.add(leaf); assembly.add(pivot);
      pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = dir * (o.swing ?? 1) * Math.PI / 2;
    }
    cur = o.at + o.w;
  }
  piece(cur, len, z0, z1, mat); skirt(cur, len, z0);
}

// Axis-aligned wall from a footprint rectangle. Openings given in absolute coordinate along the long axis.
// opts.join = 'start' | 'end' | 'both': that end continues straight into another wall run (not a corner),
// so the inside plaster runs through instead of stopping short.
function wallRect(group, x0, x1, y0, y1, z0, z1, openings, mat, opts = {}) {
  const alongX = (x1 - x0) >= (y1 - y0);
  const thick = alongX ? (y1 - y0) : (x1 - x0);
  const a = alongX ? [x0, (y0 + y1) / 2] : [(x0 + x1) / 2, y0];
  const b = alongX ? [x1, (y0 + y1) / 2] : [(x0 + x1) / 2, y1];
  const base = alongX ? x0 : y0;
  const ops = openings.map(o => ({ ...o, at: o.from - base, w: o.to - o.from }));
  wallSeg(group, a, b, thick, z0, z1, ops, mat, M.glass);
}

let ROOMS = [];
function trimLiner() { return M.trimDark; }
function roomAt(x, y) {
  return ROOMS.find(r => r.ceil != null && x >= r.x0 - 0.02 && x <= r.x1 + 0.02 && y >= r.y0 - 0.02 && y <= r.y1 + 0.02);
}
const trimFor = r => (r.name === 'Lounge / living' ? M.ceiling : r.name.startsWith('Kitchen') ? M.honey : M.trimDark);
function inRoom(x, y, z) {
  return ROOMS.some(r => r.ceil != null && x >= r.x0 - 0.02 && x <= r.x1 + 0.02 && y >= r.y0 - 0.02 && y <= r.y1 + 0.02 && z >= r.floor - 0.5 && z <= r.floor + r.ceil + 0.3);
}

// Reno settings on the enclosed covered area (lounge), in metres:
//   roof_raise   lifts the covered roof; walls extend up, door and window openings stay where they are
//   floor_buildup raises the finished floor above the slab (insulation, battens); openings stay put
// Returns a copy of the spec with the roof and the lounge room adjusted.
// Front-loading washer or dryer, 600 wide x 850 high x d deep, standing at (cx, cy) on z0. The front face is
// the edge of its footprint facing 'face' (N, S, E or W): (cx, cy) is the middle of that front edge.
function laundryMachine(parent, cx, cy, z0, face, d, washer) {
  const g = new THREE.Group(); g.position.copy(L(cx, cy, z0));
  g.rotation.y = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[face]; parent.add(g);
  // local frame: across -0.3..0.3, front at y = 0 facing -y, back at y = d
  const body = M.appliance, dark = M.frameA;
  box(g, -0.3, 0.3, 0, d, 0.02, 0.85, body);
  for (const x of [-0.26, 0.22]) box(g, x, x + 0.04, 0.04, 0.08, 0, 0.02, dark);                // feet
  box(g, -0.29, 0.29, -0.004, 0, 0.72, 0.83, M.kWhite || body);                                 // control panel
  box(g, 0.03, 0.17, -0.008, -0.004, 0.755, 0.795, dark);                                       // display
  if (washer) box(g, -0.27, -0.06, -0.012, 0, 0.74, 0.81, body);                               // detergent drawer
  const disc = (r, h, y, z, m, seg = 40) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); c.rotation.x = Math.PI / 2; c.position.copy(L(0, y, z)); c.castShadow = c.receiveShadow = true; g.add(c); return c; };
  disc(0.205, 0.03, -0.015, 0.4, M.metal);                                                      // door ring
  disc(0.15, 0.036, -0.018, 0.4, dark);                                                         // door glass
  disc(0.03, 0.025, -0.012, 0.775, M.metal, 24).position.copy(L(0.2, -0.012, 0.775));           // program knob
  return g;
}

// Tall laundry tower: 18 mm side panels, washer on the floor with the dryer stacked on it (open bays, so the
// machine doors swing clear), a fixed shelf over the dryer and a two-door cupboard up to 'h'. (cx, cy) is the middle
// of the front edge, 'face' the way it faces; 0.66 wide, d deep including 50 mm behind the machines for hoses and taps.
const TOWER_W = 0.645;                       // 600 machines, 18 mm panels, about 4 mm running clearance each side
function laundryTower(parent, cx, cy, z0, face, d, h) {
  const g = new THREE.Group(); g.position.copy(L(cx, cy, z0));
  g.rotation.y = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[face]; parent.add(g);
  const white = M.kWhite || M.appliance, dark = M.frameA, hw = TOWER_W / 2, t = 0.018, md = d - 0.07;
  for (const sx of [-1, 1]) box(g, sx > 0 ? hw - t : -hw, sx > 0 ? hw : -hw + t, 0, d, 0, h, white);     // side panels
  laundryMachine(g, 0, 0.02, 0, 'N', md, true);
  box(g, -hw + t + 0.01, hw - t - 0.01, 0.04, 0.02 + md, 0.85, 0.87, dark);                               // stacking kit
  laundryMachine(g, 0, 0.02, 0.87, 'N', md, false);
  const cz0 = 1.78;
  box(g, -hw + t, hw - t, 0.02, d, cz0 - 0.025, cz0, white);                                              // shelf over the dryer
  // cupboard over it: top and back panels, a middle shelf once there's room, folded linen stacked on each shelf
  box(g, -hw + t, hw - t, 0.02, d, h - 0.018, h, white);
  box(g, -hw + t, hw - t, d - 0.012, d, cz0, h - 0.018, white);
  const bays = h - cz0 > 0.6 ? [cz0, (cz0 + h) / 2] : [cz0], tops = bays.slice(1).concat([h - 0.018]);
  if (bays.length > 1) box(g, -hw + t, hw - t, 0.02, d - 0.012, bays[1], bays[1] + 0.018, white);
  const linen = c => M['ln' + c] || (M['ln' + c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const cols = [0xf3f1ec, 0xd9dcdf, 0xe6ddd0, 0xc9d4dc, 0xf3f1ec, 0xdcd6cc];
  bays.forEach((z0, b) => {
    const zb = z0 + (b ? 0.019 : 0.001), zt = tops[b] - 0.06;                 // leave a hand's gap under the next shelf
    [[-hw + t + 0.015, -0.01], [0.01, hw - t - 0.015]].forEach(([x0, x1], s) => {
      let z = zb, i = b * 3 + s;
      while (true) {
        const th = [0.05, 0.035, 0.06][i % 3]; if (z + th > zt) break;       // towels thick, sheets thin
        const k = (i % 2) * 0.008;                                            // folds sit a little uneven
        box(g, x0 + k, x1 - 0.008 + k, 0.06 + k, d - 0.05, z, z + th - 0.002, linen(cols[i % cols.length]));
        z += th; i++;
      }
    });
  });
  // doors overlay the carcass edges, 20 mm in front of it, one flush face top to bottom
  // Machine bay: a pair of narrow doors (about 330 each) rather than one wide one, so each needs only a third of a
  // metre to swing and the machine doors open fully between them. Operable like the house doors (tap or E in Walk).
  // The +x leaf (the wall end when the tower stands in a corner) opens to 90 and lies flat along that wall; the
  // other opens to 110 so it clears the front-loader doors.
  // The cupboard over the dryer gets the same kind of pair, opening on their own.
  const lw = hw - 0.001, lt = 0.018;                                            // 2 mm meeting gap between the pair
  const pair = (z0, lh, pullZ, pullH) => {
    const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; g.add(assembly);
    for (const [hx, dir, ang] of [[-hw, -1, 110], [hw, 1, 90]]) {                // three.js x runs opposite to lot x
      const pivot = new THREE.Group(); pivot.position.copy(L(hx, -0.011, z0));
      const add = (w, hh, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dd), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; b.userData.door = true; pivot.add(b); };
      add(lw, lh, lt, white, dir * lw / 2, lh / 2, 0);
      add(0.015, pullH, 0.012, dark, dir * (lw - 0.035), pullZ, -(lt / 2 + 0.006));   // pull, room side
      if (dir > 0) add(0.03, lh, 0.006, white, dir * (lw + 0.003), lh / 2, lt / 2 + 0.003);   // meeting strip behind the joint, so it can't be seen through
      pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = dir * ang * Math.PI / 180;
      assembly.add(pivot);
    }
  };
  pair(0.003, cz0 - 0.004, 1.0, 0.3);                                            // machine bay
  pair(cz0 + 0.003, h - cz0 - 0.006, 0.12, 0.15);                                // cupboard over it (pulls at its bottom edge)
  return g;
}

// Fluted panel texture: vertical reeds (a light crown and shadowed flanks), one reed per texture tile.
function fluteTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 8; const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 32, 0);
  grad.addColorStop(0, '#b9b2a4'); grad.addColorStop(0.25, '#e4ded1'); grad.addColorStop(0.5, '#f1ece2'); grad.addColorStop(0.8, '#d6cfc1'); grad.addColorStop(1, '#a9a295');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 8);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// White marble-look sintered stone: soft grey veins on white, one tile about 1 m.
function veinTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#f5f4f1'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(120,120,125,${0.12 + Math.random() * 0.2})`; g.lineWidth = 0.6 + Math.random() * 1.6;
    let x = Math.random() * 512, y = Math.random() * 512; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 12; k++) { x += 20 + Math.random() * 40; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Silver-grey travertine: long wavy bands of warm grey, taupe and pale cream with a scatter of small pits, one tile
// about 1 m along the grain (canvas x).
function travTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#a8a096'; g.fillRect(0, 0, 512, 256);
  const tones = ['#8f877d', '#b9b0a4', '#c9bca9', '#9c948b', '#d3cbbf', '#877e74', '#b3a592'];
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = tones[i % tones.length]; g.globalAlpha = 0.25 + Math.random() * 0.4; g.lineWidth = 1 + Math.random() * 7;
    const y = Math.random() * 256, a = Math.random() * 6, f = 0.01 + Math.random() * 0.02, ph = Math.random() * 6;
    g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + a * Math.sin(x * f + ph)); g.stroke();
  }
  g.globalAlpha = 0.35; g.fillStyle = '#6f675e';
  for (let i = 0; i < 160; i++) g.fillRect(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 2.5, 1 + Math.random() * 1.5);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Pandora Brown sintered stone: white with cloudy taupe-grey and rust patches along broken veins, one tile about 1 m.
function pandoraTexture() {
  // Pandora Brown sintered stone (the Portobello photos): a white ground crossed by ragged drifts of taupe and brown
  // veining, broken into clouds and feathered streaks with fine dark hairlines through them and pale grey haze round
  // them; big white areas in between. Seamless; the top's UVs are in metres and the texture spans 1.6 m.
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wrap = f => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); f(); g.restore(); } };
  g.fillStyle = '#f2f0ec'; g.fillRect(0, 0, S, S);
  // a few long drifting paths across the slab, mostly running one way (diagonal), each carrying the veining
  const paths = [];
  for (let k = 0; k < 9; k++) {
    let x = rnd(0, S), y = rnd(0, S), a = rnd(-0.5, 0.3); const pts = [];
    for (let d = 0; d < rnd(700, 1300); d += 14) { a += rnd(-0.22, 0.22); x += Math.cos(a) * 14; y += Math.sin(a) * 14; pts.push([x, y, rnd(0, 1)]); }
    paths.push({ pts, w: rnd(18, 55) });
  }
  // pale grey haze round each drift
  softLayer(g, S, S, 22, l => { for (const p of paths) for (const [x, y, r] of p.pts) if (r < 0.5) { l.fillStyle = 'rgba(170,165,160,0.08)'; l.beginPath(); l.ellipse(x, y, p.w * 1.3, p.w * 0.6, 0.3, 0, 7); l.fill(); } });
  // taupe and brown clouds along the drift: ragged clusters of soft blobs (fixed up front so every wrapped copy matches)
  const blobs = [];
  for (const p of paths) for (const [x, y, r] of p.pts) {
    if (r > 0.65) continue;
    for (let i = 0; i < 4; i++) {
      const rr = rnd(2, p.w * 0.28);
      blobs.push([x + rnd(-p.w, p.w) * 0.6, y + rnd(-p.w, p.w) * 0.35, rr * rnd(1.2, 2.6), rr * rnd(0.5, 1), rnd(-0.4, 0.4),
        Math.random() < 0.45 ? `rgba(${rnd(120, 150)},${rnd(96, 118)},${rnd(78, 96)},${rnd(0.35, 0.7)})` : `rgba(${rnd(150, 175)},${rnd(142, 160)},${rnd(132, 150)},${rnd(0.3, 0.55)})`]);
    }
  }
  softLayer(g, S, S, 3, l => { for (const [x, y, rx, ry, a, col] of blobs) { l.fillStyle = col; l.beginPath(); l.ellipse(x, y, rx, ry, a, 0, 7); l.fill(); } });
  // fine dark hairlines tracing the drifts and branching off them
  wrap(() => { for (const p of paths) {
    g.strokeStyle = 'rgba(92,74,60,0.55)'; g.lineWidth = 0.9; g.beginPath();
    p.pts.forEach(([x, y], i) => { const px = x + Math.sin(i * 0.7) * p.w * 0.2, py = y + Math.cos(i * 0.5) * p.w * 0.12; i ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.stroke();
    for (const [x, y, r] of p.pts) if (r > 0.93) {
      let bx = x, by = y, a = rnd(0, Math.PI * 2); g.strokeStyle = 'rgba(110,92,78,0.4)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(bx, by);
      for (let d = 0; d < rnd(30, 110); d += 8) { a += rnd(-0.5, 0.5); bx += Math.cos(a) * 8; by += Math.sin(a) * 8; g.lineTo(bx, by); }
      g.stroke();
    }
  } });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.repeat.set(1 / 1.6, 1 / 1.6); return t;
}

// Honed warm-grey limestone (the fireplace-wall reference): a sandy greige ground with broad soft mottling and smaller
// soft patches, a fine scatter of darker fossil fragments and the odd pale calcite fleck; no
// veins. Seamless: everything is drawn wrapped across the tile edges, so a long top shows no joins. One tile 1.2 m.
const LIME_TILE = [1.2, 1.2];
function limestoneTexture() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wrap = f => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); f(); g.restore(); } };
  g.fillStyle = '#cdc2b1'; g.fillRect(0, 0, S, S);
  // broad mottling: large, very soft light and dark clouds
  const clouds = Array.from({ length: 26 }, () => ({ x: rnd(0, S), y: rnd(0, S), rx: rnd(75, 260), ry: rnd(50, 150), a: rnd(0, Math.PI), dark: Math.random() < 0.5, o: rnd(0.12, 0.26) }));
  softLayer(g, S, S, 35, l => { for (const q of clouds) { l.fillStyle = q.dark ? `rgba(160,148,130,${q.o})` : `rgba(226,218,204,${q.o})`; l.beginPath(); l.ellipse(q.x, q.y, q.rx, q.ry, q.a, 0, 7); l.fill(); } });
  // medium mottles: smaller soft patches that break up the broad clouds (no bedding lines: tops run both ways here)
  const mottles = Array.from({ length: 70 }, () => ({ x: rnd(0, S), y: rnd(0, S), rx: rnd(12, 45), ry: rnd(8, 30), a: rnd(0, Math.PI), dark: Math.random() < 0.6, o: rnd(0.06, 0.14) }));
  softLayer(g, S, S, 10, l => { for (const q of mottles) { l.fillStyle = q.dark ? `rgba(150,138,120,${q.o})` : `rgba(232,225,212,${q.o})`; l.beginPath(); l.ellipse(q.x, q.y, q.rx, q.ry, q.a, 0, 7); l.fill(); } });
  // fossil fragments: tiny dark grains and short slivers, and a few pale calcite flecks
  const specks = Array.from({ length: 3200 }, () => ({ x: rnd(0, S), y: rnd(0, S), r: rnd(0.4, 1.1), k: Math.random(), o: rnd(0.12, 0.35), a: rnd(0, Math.PI), l: rnd(1.5, 4) }));
  wrap(() => { for (const p of specks) {
    if (p.k < 0.8) { g.fillStyle = `rgba(118,106,92,${p.o})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    else if (p.k < 0.9) { g.strokeStyle = `rgba(112,100,86,${p.o})`; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(p.a) * p.l, p.y + Math.sin(p.a) * p.l); g.stroke(); }
    else { g.fillStyle = `rgba(246,241,232,${p.o + 0.2})`; g.beginPath(); g.arc(p.x, p.y, p.r * 1.2, 0, 7); g.fill(); }
  } });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// Downlight layout: an even grid at about `spacing` each way with half a spacing to the walls (the usual rule for
// even light), at least one per room. Points inside an `avoid` rectangle (a skylight) slide out along the room's length.
// a flush LED downlight: 100 mm white trim ring with a 70 mm frosted lens set just inside it. The group sits where the
// old flat disc did (its top against the ceiling).
const DL_GEO = { trim: new THREE.CylinderGeometry(0.05, 0.05, 0.006, 24), lens: new THREE.CylinderGeometry(0.036, 0.036, 0.004, 24) };
// the two bedrooms that take the proposed lighting scheme (Reno > Bedroom > Lighting)
const BED_LIT = ['Front bedroom', 'Bedroom 2'];
// glowing part of a proposed bedroom fitting: dark until main.js switches its layer on (userData.bedLamp)
function bedGlow(layer) {
  const k = 'bedGlow_' + layer;
  if (!M[k]) { M[k] = new THREE.MeshStandardMaterial({ color: 0xfbf7ef, roughness: 0.6, emissive: 0xffd8a8, emissiveIntensity: 0 }); M[k].userData.bedLamp = layer; }
  return M[k];
}
// Pendant on a bedroom rose, bottom at 2.35, hung from a joist through the rose (never from the plaster). Styles
// (Reno > Bedroom > Pendant), Lucci from Beacon Lighting, sizes from the listings:
//   augustOval   August oval, chalk white + frosted opal glass, 400 wide x 240 high, ES lamp, 120 canopy ($289)
//   augustRound  August round, same, 300 wide x 290 high ($199)
//   pipete       Pipete, solid natural travertine, 200 wide, GX53 lamp facing down: light only out of the bottom ($349)
//   globe        generic 400 opal globe
// Lamps assumed: ~1,000 lm 2700 K dimmable E27 in the opal ones (glass light all round); ~900 lm GX53 in the Pipete.
function bedPendant(int_, BL, room, x, y, zc, style = 'augustOval', zb = 2.35, layer = 'pendant') {
  const chalk = M.chalk || (M.chalk = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.7 }));
  const canopy = (d) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, 0.035, 32), chalk); c.position.copy(L(x, y, zc - 0.0175)); int_.add(c); };
  const cord = (z0) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, zc - z0, 8), chalk); c.position.copy(L(x, y, (zc + z0) / 2)); c.castShadow = false; int_.add(c); };
  if (style === 'pipete') {
    const trav = M.travPend || (M.travPend = new THREE.MeshStandardMaterial({ color: 0xd8c7a3, roughness: 0.85 }));
    const h = 0.075, top = zb + h;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16), trav); body.scale.set(1, h / 0.2, 1); body.position.copy(L(x, y, zb + h / 2)); int_.add(body);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), bedGlow(layer)); lens.rotation.x = Math.PI / 2; lens.position.copy(L(x, y, zb - 0.001)); int_.add(lens);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 12), chalk); sleeve.position.copy(L(x, y, top + 0.06)); int_.add(sleeve);
    canopy(0.08); cord(top + 0.12);
    BL.points.push({ room, layer, kind: 'down', x, y, z: zb + 0.02, lm: 900 });
    return;
  }
  if (style === 'pebble') {
    // frosted opal "pebble": ~310 wide x 280 high, on a small chalk cap (client reference,
    // Downloads/2093037d...jpeg: opal pendants down a period hall); the August's opal glass in a softer shape.
    // ~800 lm out all round, like the August's diffuser, so the hall's walls and ceiling take the light
    // an organic, hand-blown silhouette rather than a symmetric box: a full, slightly flattened belly low down (~310
    // across), easing in to a narrower soft shoulder and a short neck under the cap; ~280 high
    const H = 0.28, curve = new THREE.CatmullRomCurve3([[0, 0], [0.08, 0.004], [0.13, 0.03], [0.155, 0.08], [0.152, 0.135], [0.135, 0.19], [0.1, 0.236], [0.058, 0.266], [0.032, 0.278], [0, 0.28]].map(([r, h]) => new THREE.Vector3(r, h, 0)));
    const prof = curve.getPoints(40).map(p => [Math.max(p.x, 0), p.y]);
    // the opal reads warm, a little translucent, brighter where the lamp sits behind it (as in the photo), not flat white
    const ok = 'opal_' + layer, opal = M[ok] || (M[ok] = (() => { const m = bedGlow(layer).clone(); m.color.set(0xf3eadc); m.emissive.set(0xffcf98); m.transparent = true; m.opacity = 0.88; m.depthWrite = false; m.userData.bedLamp = layer; m.userData.glowK = 1.1; return m; })());
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40), opal);
    glass.position.copy(L(x, y, zb)); glass.castShadow = false; glass.renderOrder = 3; int_.add(glass);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), bedGlow(layer)); bulb.position.copy(L(x, y, zb + H * 0.42)); bulb.castShadow = false; int_.add(bulb);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 24), chalk); cap.position.copy(L(x, y, zb + H + 0.012)); int_.add(cap);
    canopy(0.1); cord(zb + H + 0.027);
    BL.points.push({ room, layer, kind: 'omni', x, y, z: zb + H / 2, lm: 800 });
    return;
  }
  if (style === 'woven' || style === 'wovenL') {
    // natural rattan bell, ~350 across x 300 high (moodboard hall photos): a dense weave that glows warm and lets light
    // out all round, softly dappled; ~700 lm out of a 1,000 lm lamp. 'wovenL': the same bell at 500 x 430 over the
    // dining table, ~900 lm out of a 1,300 lm lamp (open underneath, so most of it lands on the table)
    const k = style === 'wovenL' ? 1.43 : 1;
    const h = 0.3 * k, prof = [[0.03, 0.3], [0.06, 0.29], [0.11, 0.22], [0.15, 0.12], [0.172, 0.04], [0.175, 0]].map(([r, y]) => new THREE.Vector2(r * k, y * k));
    const mk = 'weave_' + layer;
    const mat = M[mk] || (M[mk] = (() => { const m = bedGlow(layer).clone(); const t = weaveTexture(); m.map = t; m.emissiveMap = t; m.color.set(0xd8bf98); m.emissive.set(0xfff0dc); m.side = THREE.DoubleSide; m.userData.bedLamp = layer; m.userData.glowK = 0.55; return m; })());
    const shade = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), mat); shade.position.copy(L(x, y, zb)); shade.castShadow = false; int_.add(shade);
    canopy(0.1); cord(zb + h);
    BL.points.push({ room, layer, kind: 'omni', x, y, z: zb + 0.14 * k, lm: k > 1 ? 900 : 700 });
    return;
  }
  const [w, h] = style === 'augustRound' ? [0.3, 0.29] : style === 'globe' ? [0.4, 0.4] : [0.4, 0.24];
  const zcen = zb + h / 2, glass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 24), bedGlow(layer));
  glass.scale.set(w, h, w); glass.position.copy(L(x, y, zcen)); glass.castShadow = false; int_.add(glass);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 24), chalk); collar.position.copy(L(x, y, zb + h - 0.005)); int_.add(collar);
  canopy(0.12); cord(zb + h + 0.005);
  BL.points.push({ room, layer, kind: 'omni', x, y, z: zcen, lm: 1000 });
}
// Slender indoor tree (client reference photos 2026-10-21: a false aralia / Schefflera elegantissima standard): a thin,
// slightly leaning trunk to ~2.1 m, three loose tiers of fine branches with drooping fans of narrow leaflets, in a
// 460 grey stone pot. Leaves are one instanced mesh (one draw)
// lim (optional): { xMax, yMax } lot-frame walls the canopy must stay inside (branch tips and leaf fans are held ~180 off them)
function slenderTree(group, x, y, z0, lim = {}) {
  let sd = 7; const rnd = (a = 0, b = 1) => { sd = (sd * 9301 + 49297) % 233280; return a + (b - a) * sd / 233280; };
  const pot = M.stonePot || (M.stonePot = new THREE.MeshStandardMaterial({ color: 0x6f6c67, roughness: 0.95 }));
  const bark = M.treeBark || (M.treeBark = new THREE.MeshStandardMaterial({ color: 0x5c5346, roughness: 0.9 }));
  const leafM = M.treeLeaf || (M.treeLeaf = new THREE.MeshStandardMaterial({ color: 0x6b7d52, roughness: 0.75, side: THREE.DoubleSide }));
  const p = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.17, 0], [0.2, 0.06], [0.225, 0.3], [0.23, 0.42], [0.21, 0.42], [0.2, 0.38], [0, 0.38]].map(([a, b]) => new THREE.Vector2(a, b)), 32), pot);
  p.position.copy(L(x, y, z0)); p.castShadow = true; group.add(p);
  const V = (lx, ly, lz) => L(x + lx, y + ly, z0 + lz);
  const tube = (pts, r, mat = bark) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, r, 6, false), mat); m.castShadow = true; group.add(m); };
  // trunk: up from the soil with a gentle lean toward the room
  const trunk = [V(0, 0, 0.38), V(-0.02, 0.01, 0.9), V(-0.05, 0.0, 1.5), V(-0.06, -0.03, 2.05)];
  tube(trunk, 0.018);
  const leaves = [], dummy = new THREE.Object3D();
  const keepIn = v => { if (lim.xMax !== undefined) v.x = Math.max(v.x, -(lim.xMax - 0.18)); if (lim.yMax !== undefined) v.z = Math.min(v.z, lim.yMax - 0.18); return v; };   // three x = -lot x, z = lot y
  const fan = (tip, k = 1) => {                                            // a drooping palmate fan of narrow leaflets on a short stalk
    const n = 9 + Math.floor(rnd(0, 4)), base = rnd(0, Math.PI * 2), c = keepIn(tip.clone().add(new THREE.Vector3(rnd(-0.05, 0.05), rnd(-0.04, 0.06), rnd(-0.05, 0.05))));
    for (let i = 0; i < n; i++) {
      const a = base + i / n * Math.PI * 2;
      dummy.position.copy(c); dummy.rotation.set(0, 0, 0);
      dummy.rotateY(a); dummy.rotateZ(rnd(-0.7, 0.7)); dummy.rotateX(-0.3 - rnd(0, 1.0));   // leaflets fan out at varied angles and droop
      dummy.scale.set(1, 1, k * rnd(0.75, 1.25)); dummy.updateMatrix(); leaves.push(dummy.matrix.clone());
    }
  };
  const curve = new THREE.CatmullRomCurve3(trunk);
  // four loose tiers, as a fraction up the trunk: long low branches, shorter higher; fans all along each branch, so the
  // canopy reads airy but layered (~1 m across), as in the photos
  for (const [hT, nB, len] of [[0.5, 3, 0.55], [0.66, 4, 0.5], [0.82, 4, 0.4], [0.95, 3, 0.28]]) {
    const o = curve.getPoint(hT);
    for (let b = 0; b < nB; b++) {
      const a = b / nB * Math.PI * 2 + rnd(-0.5, 0.5), l = len * rnd(0.8, 1.2), rise = rnd(0.1, 0.28);
      const mid = keepIn(o.clone().add(new THREE.Vector3(Math.cos(a) * l * 0.5, rise * 0.7, Math.sin(a) * l * 0.5)));
      const end = keepIn(o.clone().add(new THREE.Vector3(Math.cos(a) * l, rise * 0.4 - rnd(0, 0.1), Math.sin(a) * l)));   // tips weep a little
      tube([o, mid, end], 0.006);
      const br = new THREE.CatmullRomCurve3([o, mid, end]);
      for (let t = 0.35; t <= 1.001; t += 0.13) fan(br.getPoint(t), 0.8 + 0.4 * t);
    }
  }
  fan(curve.getPoint(1), 1.1); fan(curve.getPoint(0.97), 1);
  const lg = new THREE.PlaneGeometry(0.02, 0.16); lg.translate(0, 0, 0); lg.rotateX(-Math.PI / 2); lg.translate(0, 0, -0.08);   // a leaflet from its base outward
  const inst = new THREE.InstancedMesh(lg, leafM, leaves.length); leaves.forEach((m, i) => inst.setMatrixAt(i, m)); inst.castShadow = true; group.add(inst);
}
// Opal wall light (lounge, client 2026-10-21: the extension can take wall lights): a frosted opal half-pebble, 200
// across x 220 high, on a small chalk back plate, 120 off the wall; the hall pendants' glass in a wall fitting. Diffuse
// all round (an up/down pair threw hard V scallops up the wall and onto the ceiling): ~120 lm, 2700 K, dimmable
function wallLight(group, BL, room, x, y, z, wallX, layer = 'lWall') {
  const chalk = M.chalk || (M.chalk = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.7 }));
  const dir = Math.sign(x - wallX) || 1;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), chalk); plate.rotation.z = Math.PI / 2; plate.position.copy(L(wallX + dir * 0.01, y, z)); group.add(plate);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), chalk); arm.rotation.z = Math.PI / 2; arm.position.copy(L(wallX + dir * 0.05, y, z + 0.02)); group.add(arm);
  const ok = 'opal_' + layer, opal = M[ok] || (M[ok] = (() => { const m = bedGlow(layer).clone(); m.color.set(0xf3eadc); m.emissive.set(0xffcf98); m.userData.bedLamp = layer; m.userData.glowK = 0.9; return m; })());
  const prof = new THREE.CatmullRomCurve3([[0, 0], [0.06, 0.006], [0.095, 0.05], [0.1, 0.11], [0.085, 0.17], [0.05, 0.208], [0.02, 0.22], [0, 0.22]].map(([r, h]) => new THREE.Vector3(r, h, 0))).getPoints(24).map(p => new THREE.Vector2(Math.max(p.x, 0), p.y));
  const g = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), opal); g.position.copy(L(wallX + dir * 0.12, y, z - 0.11)); g.castShadow = false; group.add(g);
  BL.points.push({ room, layer, kind: 'omni', x: wallX + dir * 0.12, y, z, lm: 120 });
}
// Star jasmine (Trachelospermum jasminoides) trained flat on wires against a screen (client reference 2026-10-21): from
// a mulched pocket at the foot, 6-7 stems fan up and out to ~1.9 m, each with side shoots; pairs of glossy pointed leaves
// all along them (dark older leaves, lighter new growth at the tips), lying roughly in the screen's plane but tilted
// every which way; a light scatter of small white star flowers. Faces -x (the screen on the side fence). All the leaves
// are one instanced mesh, the flowers another
function starJasmine(group, faceX, yc, z0, seed = 1, { spread = 0.7, height = 1.8, depth = 0.08, pocket = true } = {}) {
  let sd = seed * 7919 + 17; const rnd = (a = 0, b = 1) => { sd = (sd * 9301 + 49297) % 233280; return a + (b - a) * sd / 233280; };
  const stemM = M.jasStem || (M.jasStem = new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.85 }));
  const leafM = M.jasLeaf || (M.jasLeaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, side: THREE.DoubleSide }));
  const flowerM = M.jasFlower || (M.jasFlower = new THREE.MeshStandardMaterial({ color: 0xfbf8ef, roughness: 0.6, side: THREE.DoubleSide }));
  const mulch = M.mulch || (M.mulch = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }));
  if (pocket) box(group, faceX - 0.2, faceX, yc - 0.18, yc + 0.18, z0, z0 + 0.012, mulch);   // planting pocket in the paving
  // leaf: a pointed ellipse, base at the origin, 1 long along +Y; built facing +Z, turned to face the path (-x lot = -X)
  const LEAF = M.jasLeafGeo || (M.jasLeafGeo = (() => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.24, 0.3, 0.17, 0.62); sh.quadraticCurveTo(0.1, 0.86, 0, 1); sh.quadraticCurveTo(-0.1, 0.86, -0.17, 0.62); sh.quadraticCurveTo(-0.24, 0.3, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 6); g.userData.keep = true; return g; })());
  const STAR = M.jasStarGeo || (M.jasStarGeo = (() => {
    const sh = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 1; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? sh.lineTo(px, py) : sh.moveTo(px, py); }
    const g = new THREE.ShapeGeometry(sh); g.userData.keep = true; return g; })());
  const leaves = [], flowers = [], dummy = new THREE.Object3D(), col = new THREE.Color(), cols = [];
  const out = () => faceX - rnd(0.012, depth);                                              // how far off the screen
  const P = (y, z, x = out()) => L(x, y, z);
  const leafAt = (y, z, du, dv, size, tip) => {                                              // du, dv: direction in the screen plane
    dummy.position.copy(P(y, z)); dummy.rotation.set(0, 0, 0);
    dummy.rotateY(-Math.PI / 2);                                                             // face -X (the path)
    dummy.rotateZ(-Math.atan2(du, dv));                                                      // point along (du, dv)
    dummy.rotateY(rnd(-0.7, 0.7)); dummy.rotateX(rnd(-0.5, 0.35));                            // tilt out of the plane, droop
    dummy.scale.setScalar(size); dummy.updateMatrix(); leaves.push(dummy.matrix.clone());
    const t = tip ? rnd(0.5, 1) : rnd(0, 0.35);
    cols.push(col.set(0x2f4a25).lerp(new THREE.Color(0x6b8c3e), t).offsetHSL(rnd(-0.01, 0.01), 0, rnd(-0.04, 0.04)).clone());
  };
  // one stem (and its shoots): a wandering path in the plane, leaves in pairs along it
  const grow = (y, z, ang, len, depthN) => {
    const pts = [], seg = 0.05, n = Math.max(3, Math.round(len / seg));
    let a = ang;
    for (let i = 0; i <= n; i++) {
      pts.push(P(y, z, faceX - 0.012 - 0.02 * (i / n)));
      if (i === n) break;
      a += rnd(-0.18, 0.18) + (depthN ? 0.03 : 0) * Math.sign(ang);                          // wander; shoots arch a little
      if (i / n > 0.75) a += 0.08 * Math.sign(a || 1);                                       // tips weep outward and down
      y += Math.sin(a) * seg; z += Math.cos(a) * seg;
      if (z > z0 + height) z = z0 + height;
      const f = i / n;
      if (i > 1 && i % 1 === 0) {
        const size = (0.055 + 0.025 * Math.sin(Math.PI * Math.min(1, f + 0.2))) * rnd(0.8, 1.2);   // 55-80 mm, as star jasmine
        for (const sgn of [-1, 1]) {                                                         // opposite pair, ~50 degrees off the stem, drooping
          const la = a + sgn * rnd(0.6, 1.1), du = Math.sin(la), dv = Math.cos(la) - 0.45;
          leafAt(y + sgn * 0.006, z, du, dv, size, f > 0.8);
        }
        if (i % 3 === 0) for (let c = 0; c < 1 + Math.floor(rnd(0, 2)); c++) {               // a short leafy spur at every third node
          const la = rnd(0, Math.PI * 2);
          leafAt(y + rnd(-0.03, 0.03), z + rnd(-0.02, 0.03), Math.sin(la), Math.cos(la) - 0.3, size * rnd(0.7, 1.0), f > 0.7);
        }
      }
      if (depthN < 2 && i > 2 && i < n - 1 && rnd() < (depthN ? 0.14 : 0.32) * (0.6 + f)) grow(y, z, a + (rnd() < 0.5 ? -1 : 1) * rnd(0.5, 1.0), len * rnd(0.25, 0.5), depthN + 1);   // more shoots higher up: the fan fills out at the top
      if (f > 0.85 && rnd() < 0.05) for (let k = 0; k < 4; k++) {                            // a small flower cluster near the tip
        dummy.position.copy(P(y + rnd(-0.04, 0.04), z + rnd(-0.03, 0.04), faceX - depth - 0.01)); dummy.rotation.set(0, -Math.PI / 2, rnd(0, 6.28)); dummy.rotateX(rnd(-0.4, 0.4));
        dummy.scale.setScalar(0.011 * rnd(0.85, 1.15)); dummy.updateMatrix(); flowers.push(dummy.matrix.clone());
      }
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, depthN ? 0.0028 : 0.0045, 5, false), stemM);
    tube.castShadow = true; group.add(tube);
  };
  const nS = 7 + Math.floor(rnd(0, 2));
  for (let k = 0; k < nS; k++) {
    const f = nS > 1 ? k / (nS - 1) : 0.5, ang = (f - 0.5) * 2 * spread + rnd(-0.12, 0.12);   // fan from the base, outer stems leaning out
    grow(yc + rnd(-0.05, 0.05), z0 + 0.02, ang, height * rnd(0.75, 1.0) * (1 - 0.25 * Math.abs(f - 0.5) * 2) + 0.25, 0);
  }
  const leafI = new THREE.InstancedMesh(LEAF, leafM, leaves.length);
  leaves.forEach((m, i) => { leafI.setMatrixAt(i, m); leafI.setColorAt(i, cols[i]); });
  leafI.castShadow = true; leafI.receiveShadow = true; group.add(leafI);
  if (flowers.length) { const fI = new THREE.InstancedMesh(STAR, flowerM, flowers.length); flowers.forEach((m, i) => fI.setMatrixAt(i, m)); group.add(fI); }
}
// Star jasmine trained on a diamond lattice of wires (client reference: a plain wall with the vine in criss-cross
// ribbons, framed along the top and sides): diagonal wires both ways ~600 apart (cells ~600 wide x 700 high), a top
// wire and the two side wires; leaves crowded along every wire in a ~120 band, glossy dark with lighter new growth,
// small white star flowers through it. Plants at the foot every ~1.2 m in mulched pockets, a stem up to the lattice.
// faceX: the wire plane (the vine sits just in front of it, toward -x)
function jasmineLattice(group, faceX, y0, y1, zg, zb, zt, seed = 5) {
  let sd = seed * 7919 + 31; const rnd = (a = 0, b = 1) => { sd = (sd * 9301 + 49297) % 233280; return a + (b - a) * sd / 233280; };
  const stemM = M.jasStem || (M.jasStem = new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.85 }));
  const wireM = M.jasWire || (M.jasWire = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.35, metalness: 0.8 }));
  const leafM = M.jasLeaf || (M.jasLeaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, side: THREE.DoubleSide }));
  const flowerM = M.jasFlower || (M.jasFlower = new THREE.MeshStandardMaterial({ color: 0xfbf8ef, roughness: 0.6, side: THREE.DoubleSide }));
  const mulch = M.mulch || (M.mulch = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }));
  const LEAF = M.jasLeafGeo || (M.jasLeafGeo = (() => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.24, 0.3, 0.17, 0.62); sh.quadraticCurveTo(0.1, 0.86, 0, 1); sh.quadraticCurveTo(-0.1, 0.86, -0.17, 0.62); sh.quadraticCurveTo(-0.24, 0.3, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 6); g.userData.keep = true; return g; })());
  const STAR = M.jasStarGeo || (M.jasStarGeo = (() => {
    const sh = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 1; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? sh.lineTo(px, py) : sh.moveTo(px, py); }
    const g = new THREE.ShapeGeometry(sh); g.userData.keep = true; return g; })());
  const W = 0.6, Hc = 0.7, s = Hc / W, segs = [], rise = zt - zb;
  const clipY = (a, b) => [Math.max(a, y0), Math.min(b, y1)];
  for (let c = y0 - rise / s; c <= y1 + 1e-6; c += W) {                                     // rising to the south (+y)
    const [ya, yb] = clipY(c, c + rise / s); if (yb - ya > 0.05) segs.push([ya, zb + s * (ya - c), yb, zb + s * (yb - c)]);
  }
  for (let c = y0; c <= y1 + rise / s + 1e-6; c += W) {                                     // falling to the south
    const [ya, yb] = clipY(c - rise / s, c); if (yb - ya > 0.05) segs.push([ya, zb + s * (c - ya), yb, zb + s * (c - yb)]);
  }
  segs.push([y0, zt, y1, zt], [y0, zb, y0, zt], [y1, zb, y1, zt]);                          // top and the two sides
  const leaves = [], cols = [], flowers = [], dummy = new THREE.Object3D(), col = new THREE.Color();
  const dark = new THREE.Color(0x2c4623), light = new THREE.Color(0x6a8a3d);
  const leafAt = (y, z, ang, size, t) => {
    dummy.position.copy(L(faceX - rnd(0.01, 0.09), y, z)); dummy.rotation.set(0, 0, 0);
    dummy.rotateY(-Math.PI / 2); dummy.rotateZ(-ang); dummy.rotateY(rnd(-0.9, 0.9)); dummy.rotateX(rnd(-0.6, 0.5));
    dummy.scale.setScalar(size); dummy.updateMatrix(); leaves.push(dummy.matrix.clone());
    cols.push(col.copy(dark).lerp(light, t).offsetHSL(rnd(-0.012, 0.012), 0, rnd(-0.04, 0.04)).clone());
  };
  const tube = (pts, r, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(2, pts.length * 2), r, 5, false), mat); m.castShadow = true; group.add(m); };
  for (const [ya, za, yb, zb2] of segs) {
    const len = Math.hypot(yb - ya, zb2 - za), du = (yb - ya) / len, dv = (zb2 - za) / len;
    tube([L(faceX + 0.004, ya, za), L(faceX + 0.004, yb, zb2)], 0.0015, wireM);              // the stainless wire
    const sp = []; for (let t = 0; t <= len + 1e-6; t += 0.12) sp.push(L(faceX - 0.012, ya + du * t + rnd(-0.008, 0.008), za + dv * t + rnd(-0.008, 0.008)));
    if (sp.length > 1) tube(sp, 0.004, stemM);                                               // the vine twining along it
    for (let t = 0; t <= len; t += 0.008) {                                                  // leaves crowded in a ~150 band, full like the reference
      const off = rnd(-1, 1) * rnd(0.2, 1) * 0.08, y = ya + du * t - dv * off, z = za + dv * t + du * off;
      const ang = Math.atan2(du, dv) + (rnd() < 0.5 ? 1 : -1) * rnd(0.4, 1.4);
      leafAt(y, z, ang, rnd(0.05, 0.075), rnd() < 0.18 ? rnd(0.55, 1) : rnd(0, 0.35));
      if (rnd() < 0.055) for (let k = 0; k < 2 + Math.floor(rnd(0, 3)); k++) {               // a little flower cluster
        dummy.position.copy(L(faceX - 0.095, y + rnd(-0.04, 0.04), z + rnd(-0.04, 0.04))); dummy.rotation.set(0, -Math.PI / 2, rnd(0, 6.28)); dummy.rotateX(rnd(-0.4, 0.4));
        dummy.scale.setScalar(0.013 * rnd(0.85, 1.15)); dummy.updateMatrix(); flowers.push(dummy.matrix.clone());
      }
    }
  }
  for (let y = y0 + 0.3; y < y1 - 0.2; y += 1.2) {                                          // the plants at the foot, ~1.2 m apart
    box(group, faceX - 0.2, faceX + 0.06, y - 0.16, y + 0.16, zg, zg + 0.012, mulch);
    tube([L(faceX - 0.015, y, zg + 0.01), L(faceX - 0.014, y + 0.02, (zg + zb) / 2), L(faceX - 0.012, y, zb + 0.05)], 0.007, stemM);
    for (let z = zg + 0.06; z < zb; z += 0.03) leafAt(y + rnd(-0.05, 0.05), z, rnd(-1.2, 1.2), rnd(0.04, 0.06), rnd(0, 0.3));
  }
  const leafI = new THREE.InstancedMesh(LEAF, leafM, leaves.length);
  leaves.forEach((m, i) => { leafI.setMatrixAt(i, m); leafI.setColorAt(i, cols[i]); });
  leafI.castShadow = true; leafI.receiveShadow = true; group.add(leafI);
  if (flowers.length) { const fI = new THREE.InstancedMesh(STAR, flowerM, flowers.length); flowers.forEach((m, i) => fI.setMatrixAt(i, m)); group.add(fI); }
}
// Light switch plate (AU standard, e.g. Clipsal Iconic: 117 x 75, 10 proud), centre at z, on a wall face along lot 'x' or
// 'y', facing 'inward' (+1/-1). gangs: rockers stacked in the plate; dim: one rotary dimmer knob in place of a rocker
function switchPlate(group, along, face, inward, u, z, gangs = 1, { dim = 0, label = '' } = {}) {
  const plate = M.swPlate || (M.swPlate = new THREE.MeshStandardMaterial({ color: 0xf6f6f3, roughness: 0.35 }));
  const rock = M.swRock || (M.swRock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  const knob = M.swKnob || (M.swKnob = new THREE.MeshStandardMaterial({ color: 0xe9e8e3, roughness: 0.4 }));
  const b = (d0, d1, u0, u1, z0, z1, m) => { const p0 = face + inward * d0, p1 = face + inward * d1, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    along === 'x' ? box(group, u0, u1, lo, hi, z0, z1, m) : box(group, lo, hi, u0, u1, z0, z1, m); };
  const n = gangs + dim, w = n > 3 ? 0.146 : 0.075, H = 0.117;                                // more than 3 mechanisms: a double-width plate
  b(0.001, 0.01, u - w / 2, u + w / 2, z - H / 2, z + H / 2, plate);
  const cols = n > 3 ? 2 : 1, rows = Math.ceil(n / cols), cw = (w - 0.02) / cols, rh = Math.min(0.03, (H - 0.03) / rows);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols), uc = u - w / 2 + 0.01 + cw * (c + 0.5), zc = z + (rows - 1) * rh / 2 - r * (rh + 0.006);
    if (i < dim) {                                                                         // rotary dimmer
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 20), knob);
      if (along === 'x') k.rotation.x = Math.PI / 2; else k.rotation.z = Math.PI / 2;
      const pos = along === 'x' ? L(uc, face + inward * 0.016, zc) : L(face + inward * 0.016, uc, zc); k.position.copy(pos); group.add(k);
    } else b(0.01, 0.014, uc - Math.min(0.012, cw / 2 - 0.003), uc + Math.min(0.012, cw / 2 - 0.003), zc - rh / 2 + 0.002, zc + rh / 2 - 0.002, rock);
  }
}
// Power point (AU double GPO, e.g. Clipsal Iconic horizontal: ~120 x 75, 10 proud): two 3-pin outlets, each with its
// rocker; kind 'phone': a small single plate with one RJ socket. Same wall conventions as switchPlate.
function gpoPlate(group, along, face, inward, u, z, kind = 'double') {
  const plate = M.swPlate || (M.swPlate = new THREE.MeshStandardMaterial({ color: 0xf6f6f3, roughness: 0.35 }));
  const rock = M.swRock || (M.swRock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  const slot = M.gpoSlot || (M.gpoSlot = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }));
  const b = (d0, d1, u0, u1, z0, z1, m) => { const p0 = face + inward * d0, p1 = face + inward * d1, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    along === 'x' ? box(group, u0, u1, lo, hi, z0, z1, m) : box(group, lo, hi, u0, u1, z0, z1, m); };
  if (kind === 'phone') { b(0.001, 0.01, u - 0.035, u + 0.035, z - 0.057, z + 0.057, plate); b(0.01, 0.012, u - 0.008, u + 0.008, z - 0.012, z + 0.002, slot); return; }
  b(0.001, 0.01, u - 0.06, u + 0.06, z - 0.0375, z + 0.0375, plate);
  for (const s of [-1, 1]) {
    const c = u + s * 0.03;
    for (const [du, dz, w, h] of [[-0.009, 0.004, 0.003, 0.011], [0.009, 0.004, 0.003, 0.011], [0, -0.011, 0.003, 0.01]]) b(0.01, 0.0115, c + du - w / 2 - (s < 0 ? 0.006 : 0), c + du + w / 2 - (s < 0 ? 0.006 : 0), z + dz - h / 2, z + dz + h / 2, slot);   // the three pins
    b(0.01, 0.014, c + (s < 0 ? 0.017 : 0.012) - 0.005, c + (s < 0 ? 0.017 : 0.012) + 0.005, z - 0.012, z + 0.012, rock);   // its rocker
  }
}
// Roller blind face-fixed on the wall above an opening (client 2026-10-21): a white cassette (h tall, 80 deep) on the wall
// just above the head, white blockout fabric 100 wider than the opening each side, rolled up (only the bottom bar shows). along: 'x' or
// 'y' (the wall runs along lot x or y), face: the wall's room face, inward: +1/-1 toward the room
function rollerBlind(group, along, face, inward, a0, a1, zBot, { h = 0.08, drop = 0 } = {}) {   // drop 0: rolled right up (client)
  const cass = M.blindCass || (M.blindCass = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.45 }));
  const fabric = M.blindFab || (M.blindFab = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.9 }));
  cass.userData.skyRoomSide = fabric.userData.skyRoomSide = true;
  const b = (d0, d1, u0, u1, z0, z1, m) => { const p0 = face + inward * d0, p1 = face + inward * d1, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    along === 'x' ? box(group, u0, u1, lo, hi, z0, z1, m) : box(group, lo, hi, u0, u1, z0, z1, m); };
  const u0 = a0 - 0.1, u1 = a1 + 0.1;
  b(0.002, 0.085, u0, u1, zBot, zBot + h, cass);
  if (drop > 0) b(0.054, 0.06, u0 + 0.01, u1 - 0.01, zBot - drop, zBot, fabric);
  b(0.046, 0.068, u0 + 0.01, u1 - 0.01, zBot - drop - 0.015, zBot - drop, cass);           // bottom bar
}
// The kitchen's ceiling grid: columns at the buffet's front edge, the sink bench's front edge and midway between; rows
// 0.8 apart centred on the table (the sink and table pairs on the first two, the buffet pair a row on, over the buffet)
function kitchenGrid(spec) {
  const K = spec.renovation.kitchen, Dn = spec.renovation.dining, kd = spec.rooms.find(r => r.name === 'Kitchen / dining');
  const cS = K.return ? K.return[0] - 0.09 : kd.x1 - 0.69, cB = kd.x0 + 0.5, ty = Dn ? (Dn.y0 + Dn.y1) / 2 : (kd.y0 + kd.y1) / 2;
  return { cols: [cB, (cB + cS) / 2, cS], rows: [ty - 0.4, ty + 0.4, ty + 1.2] };
}
// Lamps (kitchen and lounge evening layer): a linen drum shade glowing on its layer, light from inside the shade.
// 'table': ceramic base ~300 + 350 x 250 drum, ~350 lm; 'floor': weighted base, slim brass stem, 450 x 320 drum at
// 1.25-1.57, ~650 lm (2700 K, CRI 90+, on a smart plug or switched outlet)
function lamp(group, BL, room, x, y, z0, kind = 'table', layer = 'kLamp') {
  // linen glows warm and soft (a lit drum shade reads cream, not white): its own material at a third of a fitting's glow
  const lk = 'lampLinen_' + layer, linen = M[lk] || (M[lk] = (() => { const m = bedGlow(layer).clone(); m.color.set(0xf1e6d2); m.emissive.set(0xffc98a); m.userData.bedLamp = layer; m.userData.glowK = 0.9; return m; })()), brass = M.lampBrass || (M.lampBrass = new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.35, metalness: 0.7 }));
  const cer = M.lampCer || (M.lampCer = new THREE.MeshStandardMaterial({ color: 0xd9cfbf, roughness: 0.5 }));
  const drum = (r, h, z) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, h, 40, 1, true), linen); d.material.side = THREE.DoubleSide; d.position.copy(L(x, y, z + h / 2)); d.castShadow = false; group.add(d); };
  if (kind === 'floor') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.03, 32), brass); b.position.copy(L(x, y, z0 + 0.015)); group.add(b);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1.3, 10), brass); st.position.copy(L(x, y, z0 + 0.68)); group.add(st);
    drum(0.225, 0.32, z0 + 1.25);
    // a drum shade sends most of its light out of the open bottom (and top); only a little glows through the linen
    BL.points.push({ room, layer, kind: 'down', x, y, z: z0 + 1.27, lm: 380 });
    BL.points.push({ room, layer, kind: 'omni', x, y, z: z0 + 1.42, lm: 140 });
  } else {
    const base = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0.005], [0.1, 0.08], [0.105, 0.16], [0.07, 0.26], [0.03, 0.3], [0, 0.3]].map(([a, b]) => new THREE.Vector2(a, b)), 32), cer);
    base.position.copy(L(x, y, z0)); base.castShadow = true; group.add(base);
    drum(0.175, 0.25, z0 + 0.3);
    BL.points.push({ room, layer, kind: 'down', x, y, z: z0 + 0.31, lm: 180 });   // out of the open bottom onto the top
    BL.points.push({ room, layer, kind: 'omni', x, y, z: z0 + 0.45, lm: 70 });     // the soft glow through the linen
  }
}
// painted robe joinery (white), door with a raised moulded panel inset 70, small round silver knob
const ROBE_KICK = 0.1;
const robePaint = () => M.robeWhite || (M.robeWhite = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.45 }));
// the front bedroom bed's centre line (lot y): centred between the bay wall and the robe, then 200 toward the bay
// (client 2026-10-21); everything aligned to the bed (split system, wall-wash, reading spots, the art pair) uses it
const frontBedY = sp => { const r = sp.rooms.find(q => q.name === 'Front bedroom'); return (r.y0 + sp.fixtures.robe_front.y0) / 2 - 0.2; };
function robeDoor(int_, x0, x1, yf, z0, z1) {
  const p = robePaint(), t = 0.018, m = Math.min(0.07, (x1 - x0) / 5), b = 0.016, d = 0.006, yo = yf - t;
  box(int_, x0, x1, yo, yf, z0, z1, p);                                                       // slab
  box(int_, x0 + m, x1 - m, yo - d, yo, z1 - m - b, z1 - m, p); box(int_, x0 + m, x1 - m, yo - d, yo, z0 + m, z0 + m + b, p);
  box(int_, x0 + m, x0 + m + b, yo - d, yo, z0 + m, z1 - m, p); box(int_, x1 - m - b, x1 - m, yo - d, yo, z0 + m, z1 - m, p);
}
function robeKnob(int_, x, yf, z) {
  const k = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.024, 16), M.knobSilver || (M.knobSilver = new THREE.MeshStandardMaterial({ color: 0xe4e6e8, roughness: 0.35, metalness: 0.35 })));
  k.rotation.x = Math.PI / 2; k.position.copy(L(x, yf - 0.018 - 0.012, z)); k.castShadow = false; int_.add(k);
}
// soft abstract painting (stand-in art): warm earthy fields in the moodboard's palette, seeded per piece
function artTexture(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320; const g = c.getContext('2d');
  let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const pal = [['#e9dccb', '#c98f6b', '#8a6a52', '#d9b8a0', '#f3ece2'], ['#eee6da', '#b98a7a', '#7d8a7a', '#d8c3a5', '#a46c55'], ['#f0e8dc', '#9fa9a0', '#c7a57e', '#6f5a4c', '#e2cbb5']][(seed - 1) % 3];
  g.fillStyle = pal[0]; g.fillRect(0, 0, 256, 320);
  for (let i = 0; i < 26; i++) { g.globalAlpha = 0.25 + rnd() * 0.45; g.fillStyle = pal[1 + Math.floor(rnd() * 4)]; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 320, 20 + rnd() * 90, 8 + rnd() * 40, rnd() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Stand-in art for the proposed layout (spec.renovation.art 'v2', ART-PLACEMENT.md Part D), drawn to the piece's
// aspect (w / h). Styles: 'bold' the spine's hero (ochre, terracotta, olive, one ink-blue note, big gestural blocks);
// 'quiet' the same thread, softer; 'calm' the bedrooms (sage, stone, blue-grey bands); 'textile' a woven hanging;
// 'print' a simple graphic (WC, lounge strip); 'outdoor' a sun-proof print for the rear fence.
function artTex(seed, style, aspect) {
  const W = 320, H = Math.round(W / aspect), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const P = {
    bold: ['#efe6d6', '#c8923a', '#b5573a', '#6b6b3a', '#1f2f4a', '#d9b48a'],
    blush: ['#f4ede4', '#e8c6ba', '#d9a69b', '#efdccc', '#b9786e', '#e2c2a8'],   // pink and cream (the hero, client 2026-10-21)
    quiet: ['#f1ebe0', '#d5ae7a', '#c07a5c', '#8a8a62', '#e3d2bb', '#2c3a52'],
    calm: ['#e9e6df', '#9aab95', '#cfc6b8', '#8d9aa6', '#b9c2b0', '#f2efe9'],
    textile: ['#e8dcc8', '#b5573a', '#d6b98f', '#6b6b3a', '#f1e8d8', '#8c5a3c'],
    print: ['#f3ede2', '#d1793f', '#56603a', '#1f2f4a', '#e6c9a0', '#b5573a'],
    outdoor: ['#e7dccb', '#c8923a', '#a8553c', '#5e6a4a', '#d8c2a2', '#2f4058'],
  }[style];
  const pick = () => P[1 + Math.floor(rnd() * (P.length - 1))];
  g.fillStyle = P[0]; g.fillRect(0, 0, W, H);
  if (style === 'calm') {                                                     // soft landscape bands
    let y = H * 0.35;
    for (let i = 0; i < 6; i++) { g.globalAlpha = 0.35 + rnd() * 0.4; g.fillStyle = pick(); const bh = H * (0.08 + rnd() * 0.14); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x / W * 6 + i) * 6); g.lineTo(W, y + bh); g.lineTo(0, y + bh); g.fill(); y += bh * 0.8; }
  } else if (style === 'textile') {                                           // warp lines and woven bands
    for (let y = 0; y < H; ) { const bh = 6 + rnd() * 28; g.fillStyle = pick(); g.globalAlpha = 0.85; g.fillRect(0, y, W, bh); y += bh + 2; }
    g.globalAlpha = 0.18; g.fillStyle = '#000'; for (let x = 0; x < W; x += 4) g.fillRect(x, 0, 1, H);
  } else if (style === 'print') {                                             // one graphic sun over a hill line
    g.fillStyle = P[1]; g.beginPath(); g.arc(W * 0.55, H * 0.4, W * 0.24, 0, 7); g.fill();
    g.fillStyle = P[2]; g.beginPath(); g.moveTo(0, H * 0.72); g.quadraticCurveTo(W * 0.4, H * 0.5, W, H * 0.68); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = P[3]; g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.12, H * 0.85); g.lineTo(W * 0.88, H * 0.85); g.stroke();
  } else {                                                                    // bold / quiet / outdoor: gestural blocks
    const n = style === 'quiet' ? 5 : 7;
    for (let i = 0; i < n; i++) {
      g.globalAlpha = style === 'quiet' ? 0.45 + rnd() * 0.3 : 0.75 + rnd() * 0.25; g.fillStyle = pick();
      const x = rnd() * W * 0.8, y = rnd() * H * 0.8, w = W * (0.25 + rnd() * 0.5), h = H * (0.15 + rnd() * 0.45);
      g.beginPath(); g.moveTo(x, y + rnd() * 10); g.lineTo(x + w, y); g.lineTo(x + w - rnd() * 14, y + h); g.lineTo(x + rnd() * 12, y + h - rnd() * 10); g.fill();
    }
    g.globalAlpha = 0.9; g.strokeStyle = P[4]; g.lineWidth = style === 'quiet' ? 3 : 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * (0.1 + rnd() * 0.2), H * (0.2 + rnd() * 0.6)); g.bezierCurveTo(W * rnd(), H * rnd(), W * rnd(), H * rnd(), W * (0.7 + rnd() * 0.2), H * (0.2 + rnd() * 0.6)); g.stroke();
  }
  g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const artOak = () => M.artOak || (M.artOak = new THREE.MeshStandardMaterial({ color: 0xcdbb9f, roughness: 0.6 }));   // sand oak, as the furniture
const artBrass = () => M.brass || (M.brass = new THREE.MeshStandardMaterial({ color: 0xc2a064, roughness: 0.3, metalness: 0.85 }));
// a flat face on a wall: axis 'x' = the wall is the plane x = pos, 'y' = the plane y = pos; dir (+1 / -1) is the way
// the face looks (into the room); c is the centre along the wall, zc the centre height
function wallFace(group, axis, pos, dir, c, zc, w, h, mat) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.rotation.y = axis === 'x' ? -dir * Math.PI / 2 : dir > 0 ? 0 : Math.PI;
  p.position.copy(axis === 'x' ? L(pos, c, zc) : L(c, pos, zc)); p.receiveShadow = true; group.add(p);
  return p;
}
// framed piece on a wall: an oak frame 'depth' deep and 'frame' wide; an off-white mat 'mat' wide when given; the art
// (map) inside. w x h is the framed size.
function hangArt(group, axis, face, dir, c, zc, w, h, map, { depth = 0.04, frame = 0.025, mat = 0, frameMat = artOak() } = {}) {
  const f1 = face + dir * depth, lo = Math.min(face, f1), hi = Math.max(face, f1);
  if (axis === 'x') box(group, lo, hi, c - w / 2, c + w / 2, zc - h / 2, zc + h / 2, frameMat);
  else box(group, c - w / 2, c + w / 2, lo, hi, zc - h / 2, zc + h / 2, frameMat);
  let iw = w - 2 * frame, ih = h - 2 * frame, front = f1 + dir * 0.001;
  if (mat) {
    wallFace(group, axis, front, dir, c, zc, iw, ih, M.artMat || (M.artMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 })));
    iw -= 2 * mat; ih -= 2 * mat * 1.08; front += dir * 0.001;                 // bottom-weighted a touch
  }
  return wallFace(group, axis, front, dir, c, zc + (mat ? mat * 0.04 : 0), iw, ih, new THREE.MeshStandardMaterial({ map, roughness: 0.85 }));
}
// arched mirror on a wall plane x = face, looking toward dir (lot x): a slim brushed-brass arch (15 mm face, 25 deep,
// eased edges) round a real reflective glass (three's Reflector: the hall renders into it), after the floating-glass
// brass arches (Rooms To Go Nelle, Rejuvenation's arched brass mirror) and Freedom's arch-with-a-stone-shelf entry mirror
function archMirror(group, face, dir, yc, zc, w, h, band = 0.015) {
  const arch = (hw, bot, top) => { const s = new THREE.Shape(); s.moveTo(-hw, bot); s.lineTo(hw, bot); s.lineTo(hw, top - hw); s.absarc(0, top - hw, hw, 0, Math.PI, false); s.lineTo(-hw, bot); return s; };
  const outer = arch(w / 2, -h / 2, h / 2), inner = arch(w / 2 - band, -h / 2 + band, h / 2 - band);
  outer.holes.push(arch(w / 2 - band, -h / 2 + band, h / 2 - band));
  const gr = new THREE.Group(); gr.position.copy(L(face, yc, zc)); gr.rotation.y = -dir * Math.PI / 2; group.add(gr);
  const brass = M.mirrorBrass || (M.mirrorBrass = new THREE.MeshStandardMaterial({ color: 0xb8955a, roughness: 0.38, metalness: 0.35 }));   // brushed; lit by the room, not an env map
  const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2, curveSegments: 32 }), brass);
  fr.castShadow = true; gr.add(fr);
  const glass = new Reflector(new THREE.ShapeGeometry(inner, 32), { color: 0xb9bdbb, textureWidth: 512, textureHeight: 768, clipBias: 0.003 });
  glass.position.z = 0.016; glass.userData.reflector = true; gr.add(glass);
}
// --- decor (spec.renovation.decor 'styled'; DECOR-STYLING.md Part D, 2026-10-21) ---------------------------------------
// Procedural plants and objects, all closed or double-sided so they read from any side. Plants are built in a group at
// the pot's base (three axes inside: y up), so they can be turned for variety.
const decMat = (k, c, o = {}) => M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o }));
const seeded = seed => { let r = seed * 9301 + 49297; return () => (r = (r * 9301 + 49297) % 233280) / 233280; };
// a closed lathe vessel (profile [radius, height] from the axis round to the axis), standing at (x, y, z)
function vessel(g, x, y, z, pts, mat) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 32), mat);
  m.position.copy(L(x, y, z)); m.castShadow = true; g.add(m); return m;
}
const potProfile = (r, h, lip = 0.012) => [[0, 0], [r * 0.82, 0], [r, h * 0.85], [r, h], [r - lip, h], [r - lip, h - 0.03], [0, h - 0.03]];
// pot with soil, returns a group at the soil line
function plantPot(g, x, y, z, r, h, mat) {
  vessel(g, x, y, z, potProfile(r, h), mat);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.015, r - 0.015, 0.01, 24), decMat('soil', 0x3b2f25, { roughness: 1 }));
  soil.position.copy(L(x, y, z + h - 0.035)); g.add(soil);
  const gr = new THREE.Group(); gr.position.copy(L(x, y, z + h - 0.03)); g.add(gr); return gr;
}
// woven seagrass basket texture
function seagrassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#c4a97e'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 16) { g.fillStyle = (x / 16 + y / 8) % 2 ? '#b3976b' : '#d2b98f'; g.fillRect(x + ((y / 8) % 2) * 8, y, 14, 6); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Kentia palm (Howea forsteriana), ~1.85 m, in a seagrass basket: arching fronds of drooping leaflets
function kentia(g, x, y, z, h = 1.85, seed = 3) {
  const rnd = seeded(seed), br = 0.25, bh = 0.42;
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(br, br * 0.86, bh, 32), M.seagrass || (M.seagrass = new THREE.MeshStandardMaterial({ map: seagrassTexture(), roughness: 0.95 })));
  basket.position.copy(L(x, y, z + bh / 2)); basket.castShadow = true; g.add(basket);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(br - 0.02, br - 0.02, 0.01, 24), decMat('soil', 0x3b2f25, { roughness: 1 })); soil.position.copy(L(x, y, z + bh - 0.03)); g.add(soil);
  const leafM = decMat('kentiaLeaf', 0x46703f, { side: THREE.DoubleSide }), stemM = decMat('kentiaStem', 0x5f7a45);
  const gr = new THREE.Group(); gr.position.copy(L(x, y, z + bh - 0.03)); g.add(gr);
  const nF = 8, T = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), mx = new THREE.Matrix4();
  for (let i = 0; i < nF; i++) {
    const a = i / nF * Math.PI * 2 + rnd() * 0.6, H = (h - bh) * (0.7 + rnd() * 0.3) / 0.81, R = 0.3 + rnd() * 0.35;
    const fr = new THREE.Group(); fr.rotation.y = a; gr.add(fr);
    const P = t => new THREE.Vector3(R * Math.pow(t, 1.5) + 0.03, H * (1.8 * t - t * t) * 0.5 * (i % 3 ? 1 : 0.8), 0);
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => P(k / 8)));
    fr.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.006, 5), stemM));
    for (let t = 0.32; t < 0.99; t += 0.035) {
      const p = P(t); T.copy(P(Math.min(1, t + 0.01))).sub(p).normalize();
      const Lf = 0.3 * (1 - (t - 0.32) * 0.75), droop = 0.55 + t * 0.5;
      for (const sd of [1, -1]) {
        Z.set(0, -Math.sin(droop), sd * Math.cos(droop)).addScaledVector(T, 0.45).normalize();
        X.copy(T).addScaledVector(Z, -T.dot(Z)).normalize(); Y.crossVectors(Z, X);
        const geo = new THREE.BoxGeometry(0.02, 0.0015, Lf); geo.translate(0, 0, Lf / 2);
        const lf = new THREE.Mesh(geo, leafM); lf.position.copy(p); lf.quaternion.setFromRotationMatrix(mx.makeBasis(X, Y, Z)); lf.castShadow = true; fr.add(lf);
      }
    }
  }
}
// Bird of paradise (Strelitzia nicolai), ~1.9 m: long stalks with big paddle leaves, in a sand fibrestone pot
function strelitzia(g, x, y, z, h = 1.9, seed = 5) {
  const rnd = seeded(seed), ph = 0.48, gr = plantPot(g, x, y, z, 0.24, ph, decMat('fibrestone', 0xd6c9b3, { roughness: 0.9 }));
  const leafM = decMat('strelLeaf', 0x3d6b3d, { roughness: 0.5 }), stalkM = decMat('strelStalk', 0x7a8a55);
  for (let i = 0; i < 7; i++) {
    const lg = new THREE.Group(); lg.rotation.set(0, i / 7 * Math.PI * 2 + rnd() * 0.5, 0.12 + rnd() * 0.22); gr.add(lg);
    const s = (h - ph - 0.7) * (0.6 + rnd() * 0.4) + 0.15;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, s, 6), stalkM); st.position.y = s / 2; lg.add(st);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), leafM); bl.scale.set(0.11, 0.32 + rnd() * 0.06, 0.006);
    bl.position.y = s + 0.3; bl.rotation.set(rnd() * 0.3 - 0.15, rnd() * Math.PI, 0); bl.castShadow = true; lg.add(bl);
  }
}
// Snake plant (Dracaena trifasciata), ~0.9 m: upright pointed blades in a matte cream stoneware pot
function snakePlant(g, x, y, z, h = 0.9, seed = 7) {
  const rnd = seeded(seed), ph = 0.3, gr = plantPot(g, x, y, z, 0.15, ph, decMat('stoneCream', 0xe6dccb, { roughness: 0.85 }));
  const leafM = decMat('snakeLeaf', 0x3e5a36, { roughness: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 10; i++) {
    const w = 0.055 + rnd() * 0.025, hl = (h - ph) * (0.55 + rnd() * 0.45), sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.quadraticCurveTo(w * 0.6, hl * 0.7, 0, hl); sh.quadraticCurveTo(-w * 0.6, hl * 0.7, -w / 2, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), leafM);
    m.position.set((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12); m.rotation.set((rnd() - 0.5) * 0.18, rnd() * Math.PI, (rnd() - 0.5) * 0.18); m.castShadow = true; gr.add(m);
  }
}
// Pothos in a small terracotta pot: a mound of heart leaves and vines trailing toward lot direction (dx, dy), dropping 'drop'
function pothos(g, x, y, z, dx, dy, reach = 0.3, drop = 0.4, seed = 9) {
  const rnd = seeded(seed), ph = 0.12, gr = plantPot(g, x, y, z, 0.075, ph, decMat('terracotta', 0xb86b47, { roughness: 0.85 }));
  const leafM = decMat('pothosLeaf', 0x4f7a3a, { roughness: 0.55 });
  const leaf = (p, s = 1) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 10, 6), leafM); l.scale.set(1, 0.18, 1.15); l.position.copy(p); l.rotation.set(rnd() - 0.5, rnd() * 6, rnd() - 0.5); gr.add(l); };
  for (let i = 0; i < 12; i++) leaf(new THREE.Vector3((rnd() - 0.5) * 0.16, 0.03 + rnd() * 0.09, (rnd() - 0.5) * 0.16), 0.8 + rnd() * 0.4);
  const d = new THREE.Vector3(-dx, 0, dy).normalize();
  for (let v = 0; v < 3; v++) {
    const side = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar((v - 1) * 0.06), r0 = reach * (0.8 + rnd() * 0.4), dr = drop * (0.6 + v * 0.25);
    for (let k = 0; k < 12; k++) { const t = k / 11; const p = d.clone().multiplyScalar(0.06 + r0 * Math.min(1, t * 1.6)).add(side); p.y = 0.06 - (t > 0.55 ? (t - 0.55) / 0.45 * (dr + ph) : 0); leaf(p, 0.75); }
  }
}
// branch spray from a vase mouth at (x, y, z): stems as [spin, tilt, len]; leaves 'olive' (narrow, silvery) or 'euc' (round)
function sprays(g, x, y, z, stems, kind = 'olive') {
  const stemM = decMat('sprayStem', 0x6f6a55), leafM = kind === 'olive' ? decMat('oliveLeaf', 0x8a9775, { roughness: 0.8 }) : decMat('euLeaf', 0x8fa08f, { roughness: 0.8 });
  stems.forEach(([spin, tilt, len], i) => {
    const st = new THREE.Group(); st.position.copy(L(x, y, z)); st.rotation.set(0, spin, tilt); g.add(st);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.003, len, 5), stemM); stem.position.y = len / 2; st.add(stem);
    const n = Math.round(len / 0.035);
    for (let k = 0; k < n; k++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(kind === 'olive' ? 0.012 : 0.013 - k * 0.0006, 8, 5), leafM);
      if (kind === 'olive') lf.scale.set(2.4, 0.15, 0.55); else lf.scale.set(1, 0.18, 1);
      const sd = k % 2 ? 1 : -1; lf.position.set(sd * (kind === 'olive' ? 0.026 : 0.012), 0.08 + k * (len - 0.09) / n, 0); lf.rotation.set(0, (k % 3) * 0.6, sd * 0.5); st.add(lf);
    }
  });
}
// a stack of books lying flat (lot box), each [thickness, colour], with a little offset and turn
function bookStack(g, x, y, z, w, d, books, rot = 0) {
  let zz = z;
  books.forEach(([t, c], i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w - i * 0.012, t, d - i * 0.01), decMat('book' + c.toString(16), c, { roughness: 0.8 }));
    b.position.copy(L(x + i * 0.004, y - i * 0.006, zz + t / 2)); b.rotation.y = rot + (i % 2 ? 0.05 : -0.03); b.castShadow = true; g.add(b); zz += t;
  });
  return zz;
}
// --- garden lighting (2026-10-21): light on the surfaces, not in the eyes. The model's interior lighting doesn't reach
// outdoors, so each fitting's light is an additive glow painted on what it lights (a fence wash, a pool on a tread),
// on the house Lights like the lounge ('lGarden'); dark by day. Fittings 2700 K, CRI 90+, IP65+, 12 V.
function glowTexture(kind) {                                               // intensity in the colour (white to black, opaque): the emissive map reads rgb
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const W = kind === 'pool' ? 128 : 128, H = kind === 'pool' ? 128 : 256; c.width = W; c.height = H;
  const img = g.createImageData(W, H), sm = t => t * t * (3 - 2 * t);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W, v = 1 - (j + 0.5) / H;                        // v = 0 at the bottom
    let a;
    if (kind === 'up') {                                                   // an uplight's beam on the wall: a cone from the fitting,
      const hw = 0.03 + 0.3 * v, d = Math.abs(u - 0.5);                    // a soft cone widening upward, blended into a broad low halo
      const cone = 1 - sm(Math.max(0, Math.min(1, (d - hw * 0.35) / (hw * 0.9 + 0.02))));   // that spreads the light along the fence
      const halo = Math.exp(-2 * ((u - 0.5) / 0.3) ** 2) * Math.exp(-v * 2.2);
      a = (0.55 * cone * (0.3 + 0.7 * Math.exp(-v * 2.6)) + 0.4 * halo) * sm(Math.min(1, v / 0.04)) * (1 - sm(Math.max(0, (v - 0.6) / 0.4)));
    } else if (kind === 'strip') {                                         // a linear wash from the base, fading up, soft at both ends
      const ends = sm(Math.min(1, u / 0.08)) * sm(Math.min(1, (1 - u) / 0.08));
      a = ends * sm(Math.min(1, v / 0.05)) * Math.exp(-v * 2.6) * (1 - sm(Math.max(0, (v - 0.7) / 0.3)));
    } else if (kind === 'tall') {                                          // a full-height wash: brightest low, still well lit at the top
      const ends = sm(Math.min(1, u / 0.06)) * sm(Math.min(1, (1 - u) / 0.06));
      a = ends * (0.5 + 0.5 * Math.exp(-v * 2)) * sm(Math.min(1, v / 0.04)) * (1 - sm(Math.max(0, (v - 0.85) / 0.15)));
    } else {                                                               // a soft ambient pool
      const x = (u - 0.5) * 2, y = (v - 0.5) * 2, r2 = x * x + y * y;
      a = Math.exp(-r2 * 3.2) * (1 - sm(Math.min(1, Math.max(0, (Math.sqrt(r2) - 0.75) / 0.25))));
    }
    const k = (j * W + i) * 4, val = Math.round(255 * Math.max(0, Math.min(1, a)));
    img.data[k] = img.data[k + 1] = img.data[k + 2] = val; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowMat(kind, k) {
  const key = 'gGlow_' + kind;
  if (!M[key]) {
    const map = glowTexture(kind);
    M[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a8, emissiveMap: map, emissiveIntensity: 0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    M[key].userData.bedLamp = 'lGarden'; M[key].userData.glowK = k;
  }
  return M[key];
}
// a spike (or deck-recessed) uplight at the base of a fence face: the fitting, and its scallop up the palings.
// axis/face/dir as wallFace (the fence face, looking into the yard); c along the fence; z the ground
function fenceUplight(g, axis, face, dir, c, z, { h = 1.9, w = 1.7, recessed = false } = {}) {
  const off = face + dir * 0.12, lens = bedGlow('lGarden');
  const fx = axis === 'x' ? off : c, fy = axis === 'x' ? c : off;
  if (recessed) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.004, 20), decMat('bronzeTrim', 0x4a3a2c, { roughness: 0.5, metalness: 0.4 })); ring.position.copy(L(fx, fy, z + 0.001)); g.add(ring);
    const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.003, 16), lens); ln.position.copy(L(fx, fy, z + 0.003)); g.add(ln);
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.11, 14), decMat('bronzeTrim', 0x4a3a2c, { roughness: 0.5, metalness: 0.4 }));
    body.position.copy(L(fx, fy, z + 0.07)); body.rotation.set(axis === 'y' ? dir * 0.25 : 0, 0, axis === 'x' ? dir * 0.25 : 0); g.add(body);
    const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.004, 14), lens); ln.position.copy(L(fx, fy, z + 0.127)); g.add(ln);
  }
  wallFace(g, axis, face + dir * 0.004, dir, c, z + h / 2, w, h, glowMat('up', 0.9));   // flat on the palings, where the light lands
}
// a horizontal glow pool on a surface at height z, centred (x, y), w x d
function glowPool(g, x, y, z, w, d, k = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), glowMat('pool', k)); m.rotation.x = -Math.PI / 2; m.position.copy(L(x, y, z + 0.004)); g.add(m); return m;
}
// --- plaster cornices and roses (site photos: Downloads/circle.jpeg, the hall photos of Sep 25) -----------------------
// Profiles are [o, t] pairs: o out from the wall into the room, t down from the ceiling, listed from the wall end to the
// ceiling end. 'ornate' (entry, hall, bedrooms 2 and 3): a lip on the wall, a deep cove, then a raised band on the
// ceiling carrying a running leaf garland (a relief map, not geometry) and a bead on its outer edge: ~140 on the
// ceiling, ~120 down the wall. 'plain' (front bedroom, with its picture rail): a smaller moulded cove, no enrichment.
const arcPts = (co, ct, ro, rt, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI / 2 * i / n; return [co - ro * Math.cos(a), ct - rt * Math.sin(a)]; });
const CORNICE = {
  ornate: { cove: [[0, 0.12], [0.012, 0.12], [0.014, 0.11], ...arcPts(0.062, 0.11, 0.048, 0.075).slice(1), [0.066, 0.035], [0.068, 0.024]],
            band: [[0.068, 0.024], [0.082, 0.027], [0.095, 0.028], [0.108, 0.027], [0.122, 0.024]],
            bead: [[0.122, 0.024], [0.129, 0.026], [0.136, 0.021], [0.14, 0.01], [0.142, 0]] },
  plain: { cove: [[0, 0.09], [0.01, 0.09], [0.012, 0.08], ...arcPts(0.05, 0.08, 0.038, 0.05).slice(1), [0.055, 0.03], [0.057, 0.02], [0.075, 0.02], [0.081, 0.016], [0.085, 0.008], [0.086, 0]] },
};
function corniceMats() {
  const base = M.ceiling;
  M.cornice = M.cornice || (() => { const m = base.clone(); m.side = THREE.DoubleSide; return m; })();
  M.corniceOrn = M.corniceOrn || (() => { const m = M.cornice.clone(); m.bumpMap = garlandTexture(); m.bumpScale = 1.5; m.map = garlandTexture(true); return m; })();
}
// running leaf garland, as a height map: a waving stem with paired leaves and small berries; one repeat = 160 mm
// (shade = true: the same garland as a colour map, white on white with faint soft shadows, so the relief reads under
// any light while the plaster stays white like the rest of the cornice)
function garlandTexture(shade = false) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = shade ? '#ffffff' : '#606060'; g.fillRect(0, 0, 384, 128); g.filter = 'blur(2px)';
  if (shade) { g.shadowColor = 'rgba(120,110,100,0.28)'; g.shadowBlur = 5; g.shadowOffsetY = 3; }
  g.strokeStyle = shade ? '#ffffff' : '#b0b0b0'; g.lineWidth = 7; g.beginPath();
  for (let x = 0; x <= 384; x += 4) { const y = 64 + 18 * Math.sin(x / 384 * Math.PI * 4); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let k = 0; k < 8; k++) {
    const x = 24 + k * 48, y = 64 + 18 * Math.sin(x / 384 * Math.PI * 4), up = k % 2 ? 1 : -1;
    for (const [dx, ang] of [[-6, -0.5], [6, 0.5]]) { g.save(); g.translate(x + dx, y + up * 14); g.rotate(ang * up + (up > 0 ? Math.PI : 0)); g.fillStyle = shade ? '#ffffff' : '#e8e8e8'; g.beginPath(); g.ellipse(0, -10, 8, 20, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = shade ? '#f2f0ec' : '#9a9a9a'; g.fillRect(-1, -26, 2, 30); g.restore(); }
    g.fillStyle = shade ? '#ffffff' : '#f0f0f0'; g.beginPath(); g.arc(x + 24, y - up * 16, 6, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; if (shade) t.colorSpace = THREE.SRGBColorSpace; return t;
}
// one cornice run along a wall face: the wall line at 'line' (lot y if alongX, else x), from a to b along it, 'dir'
// pointing into the room; each end mitred for an inside corner, or for an outside corner when aOut / bOut
function corniceRun(group, alongX, line, a, b, dir, zc, kind = 'ornate', { aOut = false, bOut = false, scale = 1 } = {}) {
  corniceMats();
  const P = CORNICE[kind];
  const sweep = (pts, mat) => {
    pts = pts.map(([o, t]) => [o * scale, t * scale]);
    const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const pos = [], uv = [], idx = [];
    pts.forEach(([o, t], i) => {
      const w = line + dir * o;
      for (const u of [a + (aOut ? -o : o), b - (bOut ? -o : o)]) { const v = alongX ? L(u, w, zc - t) : L(w, u, zc - t); pos.push(v.x, v.y, v.z); uv.push(u / 0.16, acc[i] / acc[acc.length - 1]); }
      if (i) { const k = 2 * i; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo, mat));
  };
  sweep(P.cove, M.cornice);
  if (P.band) { sweep(P.band, M.corniceOrn); sweep(P.bead, M.cornice); }
}
// ornate ceiling rose (entry, Downloads/circle.jpeg): ~750 across. Out from the centre: a domed boss, stepped rings, a
// bead, a plain flat ring, then a wide outer band of radial leaves (acanthus-like) inside a small edge lip
function ornateRose(group, x, y, zc, dia = 0.75) {
  corniceMats();
  const R = dia / 2, k = R / 0.375;
  const prof = [[0, 0.075], [0.03, 0.073], [0.055, 0.066], [0.065, 0.055], [0.075, 0.05], [0.1, 0.05], [0.105, 0.042], [0.14, 0.04], [0.15, 0.034],
    [0.175, 0.032], [0.185, 0.026], [0.2, 0.026], [0.215, 0.03], [0.23, 0.026], [0.24, 0.016], [0.3, 0.014], [0.305, 0.01], [0.365, 0.008], [0.372, 0.004], [0.375, 0]];
  const lathe = new THREE.LatheGeometry(prof.map(([r, t]) => new THREE.Vector2(r * k, -t * k)), 64);
  const m = new THREE.Mesh(lathe, M.cornice); m.position.copy(L(x, y, zc)); group.add(m);
  for (const [r, t, tube, n] of [[0.208, 0.03, 0.007, 0], [0.16, 0.036, 0.005, 0]]) {   // beaded rings
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r * k, tube * k, 6, 64), M.cornice); tor.rotation.x = Math.PI / 2; tor.position.copy(L(x, y, zc - t * k)); group.add(tor);
  }
  const leaf = new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 36; i++) {                                         // the leaf band: 36 leaves, each with a smaller one between
    for (const [r, len, wid, ht, off] of [[0.335, 0.034, 0.016, 0.016, 0], [0.338, 0.022, 0.009, 0.011, 0.5]]) {
      const a = (i + off) / 36 * Math.PI * 2, lm = new THREE.Mesh(leaf, M.cornice);
      lm.scale.set(wid * k, ht * k, len * k); lm.rotation.set(Math.PI, 0, 0); lm.rotateY(-a);
      lm.position.copy(L(x, y, zc - 0.009 * k)).add(new THREE.Vector3(Math.sin(a) * r * k, 0, Math.cos(a) * r * k)); group.add(lm);
    }
  }
}
// rattan weave: warm cane strands over-and-under with small gaps (the gaps glow through the emissive map)
function weaveTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#3a2a18'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const over = (i + j) % 2; g.fillStyle = over ? '#e3c08a' : '#c99d62'; g.fillRect(i * 8 + (over ? 0 : 1), j * 8 + (over ? 1 : 0), over ? 8 : 6, over ? 6 : 8); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 4); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dlFitting() {
  const g = new THREE.Group();
  const trim = new THREE.Mesh(DL_GEO.trim, M.dlTrim); trim.position.y = 0.002;
  const lens = new THREE.Mesh(DL_GEO.lens, M.dlLens); lens.position.y = -0.0005;
  trim.castShadow = lens.castShadow = false;
  g.add(trim, lens); return g;
}
function dlGrid(rm, spacing, avoid) {
  const w = rm.x1 - rm.x0, d = rm.y1 - rm.y0, nx = Math.max(1, Math.round(w / spacing)), ny = Math.max(1, Math.round(d / spacing)), out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const x = rm.x0 + w * (i + 0.5) / nx; let y = rm.y0 + d * (j + 0.5) / ny;
    if (avoid && x > avoid.x0 - 0.2 && x < avoid.x1 + 0.2 && y > avoid.y0 - 0.2 && y < avoid.y1 + 0.2)
      y = y < (avoid.y0 + avoid.y1) / 2 ? avoid.y0 - 0.25 : avoid.y1 + 0.25;
    out.push([x, y]);
  }
  return out;
}

// Rounded plan-shape furniture piece: a w (along the wall) x d (deep) outline with corner radius r, extruded from z0
// to z1 and centred at lot (cx, cy). Symmetric outlines, so the plan axes only need to line up, not keep their sign.
function planSlab(parent, cx, cy, w, d, r, z0, z1, mat) {
  const s = new THREE.Shape(), hw = w / 2, hd = d / 2, rr = Math.min(r, hw, hd);
  s.moveTo(-hw + rr, -hd); s.lineTo(hw - rr, -hd); s.absarc(hw - rr, -hd + rr, rr, -Math.PI / 2, 0);
  s.lineTo(hw, hd - rr); s.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2); s.lineTo(-hw + rr, hd);
  s.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI); s.lineTo(-hw, -hd + rr); s.absarc(-hw + rr, -hd + rr, rr, Math.PI, Math.PI * 1.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 2);                      // outline x along lot y, outline y along lot x, extrusion up
  const m = new THREE.Mesh(geo, mat); m.position.copy(L(cx, cy, z0)); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}

// Fridge positions offered in the Reno sheet. Boxes are the fridge itself (lot frame), 'face' the side its doors are on.
const steelMat = () => M.steel || (M.steel = new THREE.MeshStandardMaterial({ color: 0xc4c8cb, roughness: 0.3, metalness: 0.55 }));

export const FRIDGE_SPOTS = {
  none: null,
  // 780 wide into the old pantry recess (0.82 clear); stands about 0.14 proud of the wall, cupboard above to the recess head
  pantry: { x0: 2.15, x1: 2.93, y0: 18.73, y1: 19.45, face: 'N', top: 2.4 },
  // 750 wide on the west wall between the bench run and the French doors; the short bench return goes
  doorRight: { x0: 3.97, x1: 4.69, y0: 15.68, y1: 16.43, face: 'E', top: 2.25 },
  // 900 wide at the hall end of the bench run with a cupboard over it; the cooktop and sink move west
  runEnd: { x0: 1.43, x1: 2.33, y0: 15.04, y1: 15.76, face: 'S', top: 2.25 },
  // 600 single-door fridge at the hall end: 0.3 m more bench than the double
  runEndSingle: { x0: 1.43, x1: 2.03, y0: 15.04, y1: 15.72, face: 'S', top: 2.25, single: true },
  // a 600 floor-to-ceiling pantry cupboard at the hall end, then the single fridge between gable panels, flush with it
  runEndPantry: { x0: 2.05, x1: 2.65, y0: 15.04, y1: 15.72, face: 'S', top: 2.25, single: true, pantry: [1.43, 2.03] },
};

export function applyReno(base, { roofRaise = 0, floorBuildup = 0, skylight = false, openingRaise = false, fridge = 'none', island = false, hallDoorway = true, kitchenDoor = 'double', laundry = 'none', kitchenTall = false, whiteWoodwork = false, creamExterior = false, bayHood = true, porchScreen = true, sidePavers = true, noPantry = false, frontBed = 'queen', bedside = true, tvUnit = 'white', coffeeTable = 'round', sideboard = false, kitchenStyle = 'white', diningTable = 'oak', curtains = false, shutters = true, bed2 = true, study = true, loungeStyle = 'standard', glassWall = false, backDoors = 'current', bedLights = 'pendant', pendant = 'augustOval', hallLights = 'art', hallPendant = 'pebble', klLights = 'designed', art = 'v2', decor = 'styled', yard = 'deck', loungeFence = 'screen', baySeat = 'on' } = {}) {
  if (kitchenStyle === 'ikea' || kitchenStyle === 'walnut' || kitchenStyle === 'cream' || kitchenStyle === 'std' || kitchenStyle === 'stdWhite' || kitchenStyle === 'secondhand' || kitchenStyle === 'gloss' || kitchenStyle === 'glossL' || kitchenStyle === 'glossOak') fridge = 'none';                          // the fridge is built into the tall run
  if (kitchenStyle === 'std' || kitchenStyle === 'stdWhite' || kitchenStyle === 'secondhand' || kitchenStyle === 'gloss' || kitchenStyle === 'glossL' || kitchenStyle === 'glossOak') kitchenDoor = 'none';                    // the standard L keeps the sink under the original window
  // Reno 'remove pantry': the pantry and its recess come out, so the kitchen-lounge opening runs from the bathroom
  // wall's face to the kitchen's west wall, flush on the kitchen side. Options that live in the pantry fall back to none.
  if (noPantry) { if (fridge === 'pantry') fridge = 'none'; if (laundry === 'pantry' || laundry === true) laundry = 'none'; }
  const spec = structuredClone(base);
  const K = spec.renovation.kitchen, F = FRIDGE_SPOTS[fridge] || null;
  spec.renovation.fridge = F && { ...F, at: fridge };
  // stacked washer and dryer in the pantry behind a pair of flush doors; the pantry fridge option takes the same recess.
  // Flush doors leave 0.55 m behind them, so the machines are slim 500-deep models with room for the hoses
  if (laundry === true) laundry = 'pantry';
  spec.renovation.laundry = laundry === 'pantry' && fridge !== 'pantry' ? { x0: 2.24, x1: 2.84, y0: 18.94, y1: 19.44, head: 2.7, shelves: [1.86, 2.16, 2.46] } : null;
  // or in bathroom 2, which gives up its shower (the main bathroom keeps the bath and shower) and keeps the toilet and vanity:
  //   bench: the pair side by side under a stone bench on the party wall, facing west, wall cupboards over
  //   corner: keeps the shower; the stack in the south-east corner facing west, cupboard over; the vanity shortens to 600
  //           and moves north, and the high window shifts 150 west so the stack stays clear of it
  // The bench laundry turns the door to swing out into the lounge, so its leaf no longer sweeps the south end; with the
  // corner stack the door hinges at its north jamb and swings in toward the toilet, clear of the tower.
  // Towers are 0.66 wide x 0.67 deep, full height. Designs that keep the shower give it a glass door on its south face,
  // hinged at the toilet end and opening out, and keep the vanity (with drawers under the basin) outside that door's swing.
  spec.renovation.bath_laundry = laundry === 'bathBench' ? { kind: 'bench', x0: 0.18, d: 0.6, units: [22.33, 22.95], y1: 23.58, top: 0.9 }
    : laundry === 'bathCorner' ? { kind: 'corner', d: 0.67, keepShower: true }
    // the same tower, plus a full-height linen cupboard flush with it, between it and the sink. To find the wall for it the shower gets a sliding
    // door (no swing to keep clear), the vanity starts right at the shower and narrows to a compact 450
    : ['bathCornerFold', 'bathCornerStore', 'bathCornerLow'].includes(laundry) ? { kind: 'corner', d: 0.67, keepShower: true, slider: 'west', fold: { y0: 24.758 - TOWER_W - 0.44, low: laundry === 'bathCornerLow' }, store: laundry === 'bathCornerStore' } : null;
  // 'low': the linen cupboard stops at bench height, just the hamper drawer, and the vanity's stone top runs on over it to the tower
  // In the linen-cupboard versions the vanity comes forward flush with the tower, so the shower's sliding door moves to
  // its west (toilet) side, stepping out onto clear floor. 'store' adds a mirror cabinet and an overhead linen cupboard
  // over the vanity, and a tall cupboard over the toilet.   // 480 linen cupboard against the tower: wide enough for a standard basket in its drawer
  if (['bathCorner', 'bathCornerFold', 'bathCornerStore', 'bathCornerLow'].includes(laundry)) {
    const w = spec.windows.bathroom2_rear; w.x0 += 0.25; w.x1 += 0.25;                  // clear of the full-height tower
  }
  // With a bathroom laundry the vanity stands on the floor and joins the laundry joinery as one run: kick, cupboard
  // doors with open storage behind them (room around the waste), basin kept where it was unless the vanity moves
  const BL = spec.renovation.bath_laundry, V = spec.renovation.bathroom2.vanity;
  if (BL) {
    Object.assign(V, { floor: true, basin_y: (V.y0 + V.y1) / 2 });
    if (BL.kind === 'corner') { Object.assign(V, { y0: 23.45, y1: 24.758 - TOWER_W, x1: 0.53 }); V.basin_y = (V.y0 + V.y1) / 2; }   // runs up to the tower (back wall tile face 24.758)
    if (BL.fold) {                                                                     // compact vanity, then the linen cupboard
      const b2x0 = spec.rooms.find(r => r.name === 'Bathroom 2').x0 + 0.012;               // party-wall tile face
      // door faces flush with the tower's; a rectangular vessel basin (480 front to back x 360) sits on the top toward
      // the front edge, with a tall benchtop mixer behind it
      Object.assign(V, { y0: 23.22, y1: BL.fold.y0, x1: b2x0 + BL.d + 0.02, basin: 'rect', basin_x: b2x0 + BL.d + 0.02 - 0.06 - 0.24 });
      V.basin_y = (V.y0 + V.y1) / 2;
      if (BL.fold.low) V.top_y1 = 24.758 - TOWER_W;                                    // one stone top from the shower to the tower
    }
    if (BL.kind === 'combo') Object.assign(V, { y1: 24.736, top_z: 0.9, doors_y1: 24.04 });   // on to the back wall; one stone top wraps round the L, blind corner behind the laundry cabinet
    if (BL.kind === 'bench') Object.assign(V, { y0: 23.59, top_z: 0.9 });                     // carries on from the laundry bench at the same height
  }
  if (fridge === 'doorRight') K.return = null;
  // fridge at the hall end: from the window it runs sink (by the corner), cooktop, fridge; the dishwasher
  // moves into the return, next to the sink
  if (fridge === 'runEnd') Object.assign(K, { run: [2.35, K.run[1], K.run[2], K.run[3]], sink_x: [3.5, 4.3], cooktop_x: [2.7, 3.3], dishwasher_x: 'return' });
  if (fridge === 'runEndSingle') Object.assign(K, { run: [2.05, K.run[1], K.run[2], K.run[3]], sink_x: [3.45, 4.25], cooktop_x: [2.45, 3.05], dishwasher_x: 'return' });
  // with the pantry cupboard the bench starts after the fridge and the cooktop moves one bay west
  if (fridge === 'runEndPantry') Object.assign(K, { run: [2.67, K.run[1], K.run[2], K.run[3]], sink_x: [3.8, 4.6], cooktop_x: [3.05, 3.65], dishwasher_x: 'return' });
  // island: 1.5 x 0.85 stone-topped prep island, a 1.0 m aisle off the bench run; two stools tucked
  // under the 250 overhang on the south side (seats half under the top, footrests against the cabinets)
  spec.renovation.island = island ? { x0: 2.45, x1: 3.95, y0: 16.65, y1: 17.5, stools: [[2.85, 17.46], [3.55, 17.46]] } : null;
  spec.windows.W3_kitchen.frame = 'whiteAlu';                          // renovated: white frames on the kitchen's side-path glazing, whatever its form
  // single door to the side path: keep the south (left, looking out) French leaf on its own hinge, wall up
  // the north half, and run the west bench return on to 90 short of the door frame
  if (kitchenDoor === 'single') {
    const w3 = spec.windows.W3_kitchen, mid = (w3.y0 + w3.y1) / 2, end = mid - 0.09;
    Object.assign(w3, { y0: mid, kind: 'glassDoor', hinge: 'end', frame: 'whiteAlu' });
    if (K.return) K.return[3] = end;
    else K.return = [4.06, 4.69, spec.renovation.fridge.y1 + 0.02, end];          // after the fridge right of the doors
    // with the single fridge the dishwasher moves one bay along, clear of the corner and the oven door
    if (fridge === 'runEndSingle' || fridge === 'runEndPantry') K.dishwasher_slot = 1;
    // big window over the west bench, from just above the benchtop up to the door head, stopping short of the door's frame
    // the chimney breast is cut back to just past its flue stack (y 15.25) so the window can run up to the
    // corner, stopping just clear of the north run's wall cupboards
    spec.chimney.y1 = spec.chimney.stack_y1 + 0.1;
    spec.windows.W_splash = { wall: 'west', y0: Math.max(spec.chimney.y1 + 0.1, K.run[2] + K.uppers_depth + 0.08), y1: mid - 0.17, sill: 0.95, head: w3.head, frame: 'whiteAlu' };
    K.west_uppers = false;                                       // no wall cupboards on this wall: the window takes it
    // the longer return leaves no room beside a 1.5 m island: shorten it to keep a 0.9 m aisle
    if (spec.renovation.island) Object.assign(spec.renovation.island, { x0: 2.06, x1: 3.16, stools: [[2.33, 17.46], [2.89, 17.46]] });
  }
  // no door to the side path: the single-door layout, but the wall stays shut. The original kitchen window goes back
  // in its original place and size (original spec: y 16.49-18.29, sill 1.18, head 2.28), and the west bench and its
  // stone top run on past it, stopping 200 beyond so the widened opening to the lounge stays clear
  if (kitchenDoor === 'none') {
    const w3 = spec.windows.W3_kitchen;
    Object.assign(w3, { y0: 16.49, y1: 18.29, sill: 1.18, head: 2.28, kind: 'window', frame: 'whiteAlu' });
    const end = w3.y1 + 0.2;
    if (K.return) K.return[3] = end;
    else K.return = [4.06, 4.69, spec.renovation.fridge.y1 + 0.02, end];
    if (fridge === 'runEndSingle' || fridge === 'runEndPantry') K.dishwasher_slot = 1;
    K.west_uppers = false;
    spec.renovation.no_side_door = true;
    // sink back where the original kitchen had it: a double bowl under the window on the west bench (original spec
    // fixtures.sink y 16.95-17.85); the north run keeps the cooktop and the old sink spot becomes bench
    Object.assign(K, { sink_x: null, sink_y: [16.95, 17.85] });
    if (spec.renovation.island) Object.assign(spec.renovation.island, { x0: 2.06, x1: 3.16, stools: [[2.33, 17.46], [2.89, 17.46]] });
  }
  // tall kitchen: wall cupboards (and the one over the fridge) run to the ceiling with a second row of doors along the
  // top, and the island grows to 2.2 m with four stools. It takes the round table's corner, so the island is where you eat
  if (kitchenTall) {
    // to the ceiling means to it: at 2.79 a 10 mm slot ran along the top of every tall unit under the 2.8 ceiling,
    // and you could see through it to the far side of the kitchen
    K.uppers_z = [K.uppers_z[0], 2.8]; K.tall = true;
    if (spec.renovation.fridge) spec.renovation.fridge.top = 2.8;
    // the Island chip swaps between them: the long island (and no table), or the round table (and no island)
    if (island) {
      spec.renovation.island = { x0: 0.96, x1: 3.16, y0: 16.65, y1: 17.5, stools: [[1.26, 17.46], [1.82, 17.46], [2.38, 17.46], [2.94, 17.46]] };
      spec.renovation.dining = null;
    }
  }
  // IKEA-style kitchen (reference-photos/inspiration/ikea-kitchen): a floor-to-ceiling run of tall units on the north wall from
  // the hall opening (pantry, integrated fridge, oven with the microwave over it), then the cooktop bench with greige
  // wall cabinets to the ceiling and a diagonal corner cabinet, then the sink on the west bench under the window
  // Walnut & quartzite: the same layout and appliances' positions, finished as the walnut kitchen reference: walnut
  // handleless base and wall cabinets, cream tall units, taupe quartzite top and slab splashback, gas cooktop, black ovens
  // Cream & quartzite (the arched butler's pantry reference): the same kitchen with every front a warm off-white matt,
  // and the quartzite only as a low upstand behind the bench, painted wall above
  if (kitchenStyle === 'ikea' || kitchenStyle === 'walnut' || kitchenStyle === 'cream') {
    Object.assign(K, { ikea: true, walnut: kitchenStyle === 'walnut' || kitchenStyle === 'cream', cream: kitchenStyle === 'cream', run: [1.41, 4.69, 15.02, 15.62], tall: true, uppers_z: [1.55, 2.8], uppers_depth: 0.6, cooktop_x: [3.34, 3.94], sink_x: null, dishwasher_x: null });   // cooktop beside the oven tower, 130 mm of bench between (hob clearance)
    if (!K.return) K.return = [4.09, 4.69, 15.62, 16.25];
    K.return[0] = 4.09; K.return[2] = 15.62;
    if (!K.sink_y) K.sink_y = [16.95, 17.85];
    if (spec.renovation.island) Object.assign(spec.renovation.island, { x0: 2.06, x1: 3.16, y0: 16.75, y1: 17.6, stools: [[2.33, 17.56], [2.89, 17.56]] });
  }
  // Standard L: the walnut kitchen's L (tall units at the hall end, cooktop on the north wall, sink under the window on
  // the west return) rebuilt from stock carcass widths only, with fillers for the leftover (see K.std in the build).
  // 'stdWhite' is the same kitchen in white handleless fronts with a marble-look stone top
  if (kitchenStyle === 'std' || kitchenStyle === 'stdWhite' || kitchenStyle === 'secondhand' || kitchenStyle === 'glossL' || kitchenStyle === 'glossOak') {
    const gl = kitchenStyle === 'glossL' || kitchenStyle === 'glossOak';
    Object.assign(K, { std: true, white: kitchenStyle !== 'std', sh: kitchenStyle === 'secondhand' || gl, gl, oak: kitchenStyle === 'glossOak', ikea: false, walnut: false, cream: false, tall: false, run: [1.41, 4.69, 15.02, 15.62], return: [4.09, 4.69, 15.62, 18.438], uppers_z: [1.503, 2.403], uppers_depth: 0.33, cooktop_x: [3.012, 3.612], sink_x: null, sink_y: [17.02, 17.82], dishwasher_x: null });
    if (spec.renovation.island) Object.assign(spec.renovation.island, { x0: 2.06, x1: 3.16, y0: 16.75, y1: 17.6, stools: [[2.33, 17.56], [2.89, 17.56]] });
    // second-hand kitchen: its 927 wall cupboards and tall units top out at 2550 as in the listing photos
    if (K.sh) K.uppers_z = [1.623, 2.55];
    // the gloss U's cupboards re-planned into the same L: its 700 wall cupboards and tall units top at 2230
    if (K.gl) K.uppers_z = [1.53, 2.23];
    // glossOak: the same reworked L with custom light-oak wall cupboards (and the one over the fridge) to the 2.8 ceiling
    if (K.oak) K.uppers_z = [1.53, 2.8];
  }
  // Second-hand gloss U (Marketplace, Oct 2026, ~2015, gloss white handleless, grey-veined quartz, Fisher & Paykel 900 oven
  // and 900 gas cooktop), placed as it stands, no recutting: the cooktop leg on the north wall with its 750 tall unit at the
  // hall end, the sink leg (3000 over all) on the west wall, the 2950 x 1050 peninsula with its waterfall end across the
  // room, and its fridge wall (fridge recess ~1000 + 1100 tall unit, 2230 high) on the east wall. Sizes from the seller's
  // tape photos; the module splits inside each run are read off the photos (see K.u in the build).
  if (kitchenStyle === 'gloss') Object.assign(K, { u: true, std: false, ikea: false, tall: false, run: [1.41, 4.69, 15.02, 15.62], return: [4.09, 4.69, 15.62, 18.02], uppers_z: [1.53, 2.23], uppers_depth: 0.33, sink_y: [16.05, 16.73] });
  spec.renovation.curtains = !!curtains;
  spec.renovation.shutters = !!shutters;
  const c = spec.roof.covered, lounge = spec.rooms.find(r => r.name === 'Lounge / living');
  c.z_top_east += roofRaise; c.z_top_west += roofRaise;
  lounge.floor = spec.levels.slab + floorBuildup;
  lounge.ceil += roofRaise - floorBuildup;
  // flat plaster ceiling hung level at the roof's low (west) end, so it can meet the kitchen's 2.8 ceiling; the deck
  // keeps its fall above it
  Object.assign(spec.renovation.lounge, { roof_raise: roofRaise, floor_buildup: floorBuildup, skylight: !!skylight, ceil_z: lounge.floor + lounge.ceil });
  // windows lift with the floor so their heads line up with the slider heads
  for (const w of spec.renovation.lounge.windows) {
    const d = lounge.floor + spec.renovation.lounge.slider_head - w.head;
    if (d > 0) { w.sill += d; w.head += d; }
  }
  // free office glass partition (Marketplace, 3805 x 2400) in place of the two west windows: floor to 2.4, centred on
  // the lounge's west wall, three ~1.27 m panels in a black aluminium frame (listing photo)
  if (glassWall) {
    const ym = (lounge.y0 + lounge.y1) / 2;
    spec.renovation.lounge.windows = [{ y0: ym - 1.9025, y1: ym + 1.9025, sill: lounge.floor, head: lounge.floor + 2.4, panels: 3, floorGlass: true }];
  }
  spec.renovation.lounge.glass_wall = !!glassWall;
  // rear doors (Reno > Lounge > Back doors): second-hand sets on trial, centred on the back wall's 3.78 inside width.
  // h is the overall frame height above the finished floor.
  const BD = spec.renovation.back_doors[backDoors] || spec.renovation.back_doors.current;
  const bx = BD.from != null ? [BD.from, BD.from + BD.w] : [(lounge.x0 + lounge.x1 - BD.w) / 2, (lounge.x0 + lounge.x1 + BD.w) / 2];
  spec.renovation.lounge.door_pairs = [bx];
  spec.renovation.lounge.back_door = { ...BD, from: bx[0], to: bx[1] };
  // bathroom 2 (the laundry, off the lounge) gets the same build-up and ceiling lift, so it stays flush with the lounge;
  // its ceiling stops at the bath and WC ceiling height (2.8), well under the wing roof
  const b2 = spec.rooms.find(r => r.name === 'Bathroom 2'), b2Top = Math.min(b2.floor + b2.ceil + roofRaise, 2.8);
  b2.floor = spec.levels.slab + floorBuildup;
  b2.ceil = b2Top - b2.floor;
  // hall: false = opened straight through, true = classic cased archway, 'simple' = tall opening with plain wide white casing
  // hall end: 'door' = the original living-room doorway kept at its size and place (x 0.20-0.92, head 2.05), a plain
  // cased opening with no door; 'simple' / true = wider archways; false = open right through
  spec.renovation.hall_doorway = ['simple', 'door', 'arch'].includes(hallDoorway) ? hallDoorway : !!hallDoorway;
  spec.renovation.no_pantry = !!noPantry;
  spec.renovation.tv_unit = ['rimowar', 'capello', 'archie'].includes(tvUnit) ? tvUnit : 'white';
  spec.renovation.coffee_table = ['monolith', 'matched'].includes(coffeeTable) ? coffeeTable : 'round';
  spec.renovation.sideboard = sideboard === true ? 'portobello' : sideboard || null;
  spec.renovation.lounge_style = ['walnut', 'fireplace'].includes(loungeStyle) ? 'walnut' : 'standard';   // 'fireplace' was the first name
  // IKEA TONSTAD (spec.renovation.dining_tables.tonstad) in place of the oak table, on the same centre and still the long
  // way east-west: 1400 x 850 closed with the four chairs, or 1960 with its self-storing leaf out and a third chair each side
  if (spec.renovation.dining && diningTable === 'matched') spec.renovation.dining.style = 'matched';   // oak table's size and chairs
  if (spec.renovation.dining && (diningTable === 'tonstad' || diningTable === 'tonstadExt')) {
    const Dn = spec.renovation.dining, xm = (Dn.x0 + Dn.x1) / 2, ym = (Dn.y0 + Dn.y1) / 2, ext = diningTable === 'tonstadExt', w = ext ? 1.96 : 1.4;
    Object.assign(Dn, { style: 'tonstad', leaf: ext, x0: xm - w / 2, x1: xm + w / 2, y0: ym - 0.425, y1: ym + 0.425, h: 0.75,
      chairs: ext ? [[xm - 0.6, 'N'], [xm, 'N'], [xm + 0.6, 'N'], [xm - 0.6, 'S'], [xm, 'S'], [xm + 0.6, 'S']] : Dn.chairs });
  }
  spec.renovation.front_bed = frontBed === 'queen' || frontBed === 'king' ? { size: frontBed, bedside: !!bedside } : null;
  spec.renovation.bed2 = bed2 ? { size: 'queen', bedside: true } : null;      // queen and bedside drawers in bedroom 2
  spec.renovation.study = !!study;                                          // desk, monitor and office chair in bedroom 3
  // bedroom lighting (front bedroom and bedroom 2): 'downlights' = a flush grid like the other rooms; 'proposed' = a
  // pendant on the rose, a reading spot in the ceiling each side of the bed, an LED strip on top of the robe and a night
  // light under it. The robe-top strip needs a gap to the ceiling: the front robe stops well short of the cornice in the photo
  // (Downloads/33.jpeg), so both robes are taken down to 2.80 (to be measured)
  // 'corners' = the same pendant and robe strip, with two adjustable downlights near the corners washing the robe
  // fronts in place of the reading spots
  // 'pendant' (default) = the pendant on the rose and the robe-top strips; 'angled' = three tilted downlights per room
  // instead of the pendant
  // 'pendantWall' = the default plus one downlight washing the wall opposite the bed; 'pendantSheer' = the default plus a
  // sheer across the front bay hung from a pelmet ledge with an LED strip on top of it facing up
  spec.renovation.bed_lights = ['downlights', 'corners', 'proposed', 'angled', 'pendantWall', 'pendantSheer'].includes(bedLights) ? bedLights : 'pendant';
  // the robes stop well short of the ceiling in every version, with the LED strip in the gap on top. Front robe photo
  // (Downloads/33.jpeg): against the side wall's cornice the top is about 0.4-0.5 m below the cornice, so about 2.55
  // (0.6 under the ceiling); bedroom 2's robe assumed the same. To be measured
  // hall: 'art' = a pendant back on the entry rose + three paintings on the long party wall, each lit by its own
  // adjustable spot; 'downlights' = the earlier flush row down the centre. (A picture-rail uplight was tried and dropped:
  // the hall has no rail and it added a line that isn't there.)
  spec.renovation.hall_lights = hallLights === 'downlights' ? 'downlights' : 'art';
  // artwork (Reno > Hall > Artwork): 'v2' the proposed layout (ART-PLACEMENT.md Part D), 'hall' the earlier two hall
  // paintings only, 'none'
  spec.renovation.art = ['v2', 'hall', 'none'].includes(art) ? art : 'v2';
  // styling: plants, branches and surface objects (Reno > Hall > Styling): 'styled' (DECOR-STYLING.md Part D) or 'earlier'
  spec.renovation.decor = decor === 'earlier' ? 'earlier' : 'styled';
  // back yard (Reno > Outside > Back yard): 'deck' a timber deck level with the sliders, stepping down to the lawn and the
  // side path (client 2026-10-21), or 'tiles' the earlier tessellated slab with steps up to the sliders
  spec.renovation.yard = yard === 'tiles' ? 'tiles' : 'deck';
  // front bedroom window seat in the bay (Reno > Bedroom > Bay window seat, client 2026-10-21)
  spec.renovation.bay_seat = baySeat !== 'off';
  // hall pendants: 'woven' (natural rattan bell, moodboard), or the bedrooms' August oval / round
  spec.renovation.kl_lights = klLights === 'grid' ? 'grid' : 'designed';
  spec.renovation.lounge_fence = loungeFence === 'lattice' ? 'lattice' : 'screen';   // Reno > Lounge > Side fence
  spec.renovation.hall_pendant = ['pebble', 'augustOval', 'augustRound'].includes(hallPendant) ? hallPendant : 'pebble';
  spec.renovation.pendant_style = ['augustOval', 'augustRound', 'pipete', 'globe'].includes(pendant) ? pendant : 'augustOval';
  // bedroom 3's robe (the full south wall, drawn from fixed numbers before) joins the same treatment as the front two
  spec.fixtures.robe_bed3 = { x0: 1.43, x1: 4.67, y0: 14.31, y1: 14.89, z1: 2.55 };
  for (const k of ['robe_front', 'robe_bed2']) spec.fixtures[k].z1 = 2.55;
  // the split systems replace the ducted gas heating: its floor grille in the entry comes out (patched with matching boards)
  spec.fixtures.floor_vents = [];
  // front bedroom: the open shelving beside the robe narrows from 1.02 to 450 and the robe takes the rest (more
  // cupboard): robe 2.66 wide, four doors
  { const F = spec.fixtures; F.shelves_front.x1 = F.shelves_front.x0 + 0.45; F.robe_front.x0 = F.shelves_front.x1; }
  if (noPantry) spec.doors.back.x0 = spec.renovation.pantry.x0;
  spec.renovation.white_woodwork = !!whiteWoodwork;
  if (K.u) { spec.renovation.dining = null; spec.renovation.sideboard = null; spec.renovation.island = null; }   // the peninsula takes the dining space; the fridge wall the sideboard's
  spec.renovation.cream_exterior = !!creamExterior;
  spec.renovation.bay_hood = !!bayHood;
  spec.renovation.porch_screen = !!porchScreen;
  spec.renovation.side_pavers = !!sidePavers;
  // kitchen -> lounge opening: lift the head to the lounge ceiling at its lowest (west) end, keeping the
  // 200 mm kitchen-side architrave under the kitchen ceiling; never below the standard head
  if (openingRaise) {
    const bd = spec.doors.back, kitchen = spec.rooms.find(r => r.name === 'Kitchen / dining');
    const head = Math.min(spec.renovation.lounge.ceil_z, kitchen.floor + kitchen.ceil - 0.22);
    if (head > bd.head) Object.assign(bd, { head: Math.floor(head * 100) / 100, raised: true });
  }
  return spec;
}

// Ceramic toilet: tapered pedestal, bowl with rim, seat ring and open lid, cistern with lid and button.
// (x, y) is the centre of the back edge on the wall, (fx, fy) the direction it faces, z0 the floor.
function toilet(group, x, y, fx, fy, z0, { concealed = false } = {}) {
  const ceramic = M.ceramic || (M.ceramic = new THREE.MeshStandardMaterial({ color: 0xf6f6f3, roughness: 0.18 }));
  const water = M.water || (M.water = new THREE.MeshStandardMaterial({ color: 0xb9c9cf, roughness: 0.05 }));
  const t = new THREE.Group(); t.position.copy(L(x, y, z0));
  const d = L(fx, fy, 0); t.rotation.y = Math.atan2(d.x, d.z);          // local +Z points into the room
  const add = (geo, m, px, py, pz, sx = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, 1, sz); o.castShadow = o.receiveShadow = true; t.add(o); return o; };
  const cz = concealed ? 0.06 : 0.1;                                     // cistern half-depth
  if (concealed) {                                                      // in-wall cistern: slim box-out and a flush plate
    add(new THREE.BoxGeometry(0.4, 0.82, 0.12), ceramic, 0, 0.41, cz);
    add(new THREE.BoxGeometry(0.2, 0.13, 0.012), M.metal, 0, 0.98, 0.006);
  } else {                                                              // close-coupled cistern with a lid and a push button
    add(new THREE.BoxGeometry(0.38, 0.4, 0.18), ceramic, 0, 0.6, cz);
    add(new THREE.BoxGeometry(0.4, 0.03, 0.2), ceramic, 0, 0.815, cz);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), M.metal, 0, 0.835, cz);
  }
  const bz = 2 * cz + 0.25;                                              // bowl centre, forward of the cistern
  add(new THREE.CylinderGeometry(0.13, 0.1, 0.36, 28), ceramic, 0, 0.18, bz - 0.03, 1, 1.25);   // pedestal
  add(new THREE.CylinderGeometry(0.185, 0.15, 0.06, 32), ceramic, 0, 0.37, bz, 1, 1.28);        // bowl rim
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.005, 28), water, 0, 0.385, bz + 0.01, 1, 1.25);  // water, below the seat
  const seat = add(new THREE.TorusGeometry(0.15, 0.028, 10, 32), ceramic, 0, 0.415, bz, 1, 1.25);
  seat.rotation.x = Math.PI / 2; seat.scale.set(1, 1.25, 1);
  const lid = add(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32), ceramic, 0, 0.62, 2 * cz + 0.02, 1, 1.2);   // lid up against the cistern
  lid.rotation.x = Math.PI / 2 - 0.12;
  group.add(t);
  return t;
}

export function buildHouse(spec) {
  mats();
  // Reno 'white woodwork': paint every stained or coloured timber finish white (doors and their panels, frames and
  // linings, architraves and skirting, timber and painted window frames, the honey joinery and robes). Aluminium
  // frames, floors and furniture keep their own finishes.
  if (spec.renovation.white_woodwork) {
    const white = { door: 0xf2f0ea, honeyPanel: 0xf6f4ef, honey: 0xf2f0ea, trimDark: 0xf4f2ec, frameT: 0xf2f0ea, sage: 0xf2f0ea, robe: 0xf2f0ea, robePanel: 0xf6f4ef };
    for (const [k, c] of Object.entries(white)) if (M[k]) M[k].color.setHex(c);
  }
  // Reno 'cream exterior': painted render and brick all over (the face-brick wing and chimney too) in a warm cream,
  // with white trim: fascias, barge board, gable battens, porch posts, gutters and the bay frames
  if (spec.renovation.cream_exterior) {
    const cream = { white: 0xebe4d6, red: 0xebe4d6, green: 0xf4f2ec, gutter: 0xf1efea, sage: 0xf4f2ec, creamMetal: 0xf1efea };
    for (const [k, c] of Object.entries(cream)) if (M[k]) M[k].color.setHex(c);
  }
  ROOMS = spec.rooms.concat([{ name: 'bay', x0: spec.house.bay.x0, x1: spec.house.bay.x1, y0: spec.house.y_front_outer - spec.house.bay.projection, y1: spec.house.y_front_inner, floor: 0, ceil: spec.house.bay.wall_top }]);
  const G = {
    exterior: new THREE.Group(), interior: new THREE.Group(), roof: new THREE.Group(),
    ceilings: new THREE.Group(), floors: new THREE.Group(), site: new THREE.Group(), labels: new THREE.Group(),
    furniture: new THREE.Group(),   // loose furniture, inside and out: toggled from Layers
  };
  const DL = G.ceilings.userData.downlights = [];   // every ceiling downlight: { x, y, z, room } in the lot frame; main.js lights them
  // the proposed bedroom fittings, lot frame: points (pendant, wall lights) and line sources (robe-top strip, night
  // light). main.js lights them in the shader, each only inside its own room's outline (no light through walls)
  const BL = G.ceilings.userData.bedLamps = { points: [], lines: [] };
  const H = spec.house, W = spec.walls, R = spec.roof, D = spec.doors, Win = spec.windows, Lv = spec.levels;
  const gz = spec.site.ground_z;
  // finished lounge floor: the slab plus any Reno build-up. Its doors sit on this, so they lift with the floor.
  const loungeFloor = spec.rooms.find(r => r.name === 'Lounge / living').floor;
  const ext = G.exterior, int_ = G.interior;

  // --- exterior walls ---------------------------------------------------
  // party wall (east), full depth of house and wing
  wallRect(ext, -W.party_half, W.party_half, H.y_front_outer, R.main.y1, gz, R.main.ridge_z, [], M.white);
  wallRect(ext, -W.party_half, W.party_half, R.main.y1, H.y_rear_outer, gz, R.kitchen_flat.z, [], M.red);
  wallRect(ext, -W.party_half, W.party_half, H.y_rear_outer, H.wing.y_end_outer, gz, W.wing_plate_z, [], M.red);
  // front wall either side of the bay
  wallRect(ext, H.porch.x1, H.bay.x0, H.y_front_outer, H.y_front_inner, gz, W.plate_z, [], M.white);
  wallRect(ext, H.bay.x1, H.x_west_outer, H.y_front_outer, H.y_front_inner, gz, W.plate_z, [], M.white);
  // bay: three segments (west side, front, east side), centreline offset inward by half thickness
  {
    const b = H.bay, t = W.ext, yf = H.y_front_outer - b.projection;
    const segs = [
      [[b.x1, H.y_front_outer], [b.front_x1, yf]],
      [[b.front_x1, yf], [b.front_x0, yf]],
      [[b.front_x0, yf], [b.x0, H.y_front_outer]],
    ];
    for (const [p, q] of segs) {
      // offset centreline inward (toward +y) by t/2 along the segment normal
      const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      const nx = dy / len, ny = -dx / len;            // one normal; choose the one pointing to +y (inside)
      const s = ny < 0 ? -1 : 1;
      let a = [p[0] + s * nx * t / 2, p[1] + s * ny * t / 2], c = [q[0] + s * nx * t / 2, q[1] + s * ny * t / 2];
      // side walls run back into the front wall's thickness, so there is no seam where they meet it
      const ext0 = p[1] === H.y_front_outer ? 0.2 : 0, ext1 = q[1] === H.y_front_outer ? 0.2 : 0;
      const ux = dx / len, uy = dy / len;
      a = [a[0] - ux * ext0, a[1] - uy * ext0]; c = [c[0] + ux * ext1, c[1] + uy * ext1];
      const paneW = len - 0.24;
      wallSeg(ext, a, c, t, gz, b.wall_top, [{ at: 0.12 + ext0, w: paneW, sill: b.sill, head: b.head, kind: 'window', frame: 'sage' }], M.white, M.glass);
    }
  }
  wallRect(ext, H.bay.x0, H.bay.x1, H.y_front_outer, H.y_front_inner, H.bay.wall_top, W.plate_z, [], M.white);
  // porch: west side wall (bedroom wall facing the porch) and the front-door wall
  wallRect(ext, H.porch.x1, H.porch.x1 + W.int, H.y_front_outer, H.porch.y1, gz, W.plate_z, [], M.white);
  // the door wall stands 3 mm proud of porch.y1, where the entry floor and the threshold boards under it begin, so their
  // faces never share its plane (they flickered through it)
  wallRect(ext, H.porch.x0, H.porch.x1, H.porch.y1 - 0.003, H.porch.y1 + W.ext, Lv.porch, W.plate_z, [
    { from: D.front.x0, to: D.front.x1, sill: Lv.porch, head: D.front.head, kind: 'door', rightArchi: false },
    { from: D.front.sidelight.x0, to: D.front.sidelight.x1, sill: D.front.sidelight.sill, head: D.front.head, kind: 'window', frame: 'timber', amber: true, leftArchi: false },
  ], M.white);
  box(ext, D.front.sidelight.x0, D.front.sidelight.x1, H.porch.y1 + 0.02, H.porch.y1 + W.ext - 0.02, Lv.porch, D.front.sidelight.sill, M.fence);   // painted panel under the leadlight
  // porch floor and front step
  // porch floor in the original tessellated tiles with their border (front-door photo); the step up to the door tiled to match
  tessPanel(G.floors, H.porch.x0, H.porch.x1, H.porch.y0, H.porch.y1 - 0.3, Lv.porch - 0.1, Lv.porch);
  worldUV(box(G.floors, H.porch.x0, H.porch.x1, H.porch.y1 - 0.3, H.porch.y1, Lv.porch - 0.1, Lv.porch, M.tess), TESS_TILE);
  worldUV(box(G.floors, D.front.x0 - 0.05, D.front.x1 + 0.05, H.porch.y1 - 0.3, H.porch.y1 - 0.01, Lv.porch, Lv.ffl - 0.03, M.tess), TESS_TILE);   // tiled step up to the door
  box(G.floors, D.front.x0 - 0.05, D.front.x1 + 0.05, H.porch.y1 - 0.312, H.porch.y1 - 0.3, Lv.porch, Lv.ffl - 0.03, M.tessRed);   // step nosing
  // stone threshold through the doorway, from the step up to just over the hall floor
  box(G.floors, D.front.x0, D.front.x1, H.porch.y1 - 0.013, H.porch.y1 + W.ext, Lv.porch, Lv.ffl + 0.004, M.tileCream);
  // porch ceiling at the wall plate, behind the lintel over the opening (without it the roof space showed from below)
  box(G.ceilings, H.porch.x0, H.porch.x1, H.y_front_inner, H.porch.y1, W.plate_z, W.plate_z + 0.03, M.ceiling);
  // west wall with W1-W3
  wallRect(ext, H.x_west_inner, H.x_west_outer, H.y_front_outer, spec.chimney.y0, gz, W.plate_z,
    ['W1_bed2', 'W2_living'].map(k => ({ from: Win[k].y0, to: Win[k].y1, sill: Win[k].sill, head: Win[k].head, kind: 'window', frame: Win[k].frame, honey: true })),
    M.white);
  // one run from the chimney to the rear corner carries the whole kitchen window; a brick strip on top
  // lifts the wall to the flat kitchen roof where that roof begins
  const w3 = Win.W3_kitchen;
  wallRect(ext, H.x_west_inner, H.x_west_outer, spec.chimney.y0, H.y_rear_inner, gz, W.plate_z,
    [{ from: w3.y0, to: w3.y1, sill: w3.sill, head: w3.head, kind: w3.kind || 'french', hinge: w3.hinge, frame: w3.frame,
       ...(spec.renovation.no_side_door ? { trim: false } : {}) },   // the window over the sink sits in the splashback: stone to the frame, no timber sill or architraves
     ...(Win.W_splash ? [{ from: Win.W_splash.y0, to: Win.W_splash.y1, sill: Win.W_splash.sill, head: Win.W_splash.head, kind: 'window', frame: Win.W_splash.frame, trim: false }] : [])], M.red);
  box(ext, H.x_west_inner, H.x_west_outer, R.kitchen_flat.y0, H.y_rear_outer, W.plate_z, R.kitchen_flat.z, M.red);
  // 6. lintel wall over the porch opening, from the hood up to the plate
  wallRect(ext, H.porch.x0 - W.party_half, H.porch.x1, H.y_front_outer, H.y_front_inner, R.porch_hood.z_high - 0.05, W.plate_z, [], M.white);
  // kitchen rear wall (west of the wing) with the back door
  // the pantry recess is cut back into this wall, leaving a thin skin on the lounge side and brick above the pantry head
  const pr = spec.renovation.pantry, prX1 = pr.x1 - 0.11;
  wallRect(ext, H.wing.x_inner + 0.055, pr.x0, H.y_rear_inner, H.y_rear_outer, gz, W.wing_plate_z, [], M.red);
  const noPantry = spec.renovation.no_pantry;
  if (!noPantry) {
    wallRect(ext, pr.x0, prX1, pr.back_y, H.y_rear_outer, gz, W.wing_plate_z, [], M.red);
    box(ext, pr.x0, prX1, H.y_rear_inner - 0.002, pr.back_y, pr.recess_head, W.wing_plate_z, M.red);
  }
  wallRect(ext, noPantry ? pr.x0 : prX1, H.x_west_outer, H.y_rear_inner, H.y_rear_outer, gz, W.wing_plate_z,
    [{ from: D.back.x0, to: D.back.x1, sill: 0, head: D.back.head, kind: 'opening', leftArchi: false, rightArchi: false,   // pantry wall east, kitchen west wall west
       plainIn: D.back.raised ? 'Lounge / living' : undefined }], M.red);   // raised head sits flush with the lounge ceiling
  // the west reveal is the end of the brick return between kitchen and lounge: plaster it like the rooms either side
  // (and the east one too when the pantry has come out and the opening starts at the bathroom wall)
  if (noPantry) box(int_, D.back.x0 + 0.001, D.back.x0 + 0.008, H.y_rear_inner, H.y_rear_outer, Lv.slab, D.back.head, M.intWall);
  box(int_, D.back.x1 - 0.008, D.back.x1 - 0.001, H.y_rear_inner, H.y_rear_outer, Lv.slab, D.back.head, M.intWall);
  // with the pantry out the opening starts at the bath wall, 120 east of the lounge's east wall: a small return in the
  // lounge's north-east corner. Its soffit was the wall's face brick showing as a red patch; plaster it
  if (D.back.x0 < H.wing.x_outer) box(int_, D.back.x0 + 0.008, H.wing.x_outer, H.y_rear_inner, H.y_rear_outer, D.back.head - 0.006, D.back.head, M.intWall);
  // the lounge's east wall is the wing's west wall, built in lengths that match the bath and wc walls behind it; their
  // joints showed as hairline cracks down the lounge face. One continuous 4 mm skim over that face, round the laundry door
  {
    const lf = spec.rooms.find(r => r.name === 'Lounge / living').floor, xs = H.wing.x_outer, dl = D.laundry, top = spec.renovation.lounge.ceil_z + 0.02;   // just into the ceiling, never above the roof
    box(int_, xs, xs + 0.004, H.y_rear_outer, dl.y0 - 0.001, lf, top, M.intWall);
    box(int_, xs, xs + 0.004, dl.y1 + 0.001, H.wing.y_end_inner, lf, top, M.intWall);
    box(int_, xs, xs + 0.004, dl.y0 - 0.001, dl.y1 + 0.001, lf + dl.head + 0.001, top, M.intWall);
  }
  // wing west wall (bath, wc, laundry windows + laundry door)
  wallRect(ext, H.wing.x_inner, H.wing.x_outer, H.y_rear_outer, H.wing.y_end_outer, gz, W.wing_plate_z, [
    // Former wing windows infilled where they now face the enclosed lounge.
    { from: D.laundry.y0, to: D.laundry.y1, sill: loungeFloor, head: D.laundry.head + loungeFloor, kind: 'door', white: true, ...(spec.renovation.bath_laundry?.kind === 'corner' ? { hinge: 'end', swing: 1 } : { hinge: 'end', swing: spec.renovation.bath_laundry ? -1 : 1 }) },   // corner laundry: swings in to the right, lies along the back wall about 0.25 m clear of the tower doors fully open
  ], M.red);
  // High-set bathroom window opening onto the backyard, below its ceiling.
  const rearBathWindow = Win.bathroom2_rear;
  wallRect(ext, 0, H.wing.x_outer, H.wing.y_end_inner, H.wing.y_end_outer, gz, W.wing_plate_z,
    [{ from: rearBathWindow.x0, to: rearBathWindow.x1, sill: rearBathWindow.sill, head: rearBathWindow.head, kind: 'window', frame: rearBathWindow.frame, trim: false }], M.red);
  // gable walls above the plate, front and rear, our half only (party wall to west eave line)
  {
    const r = R.main, slope = (r.ridge_z - r.eave_z) / (r.eave_x - r.ridge_x);
    const zAt = x => r.ridge_z - slope * x;
    poly(ext, [[0, r.gable_y_front, W.plate_z], [H.x_west_outer, r.gable_y_front, W.plate_z], [H.x_west_outer, r.gable_y_front, zAt(H.x_west_outer)], [0, r.gable_y_front, r.ridge_z]], M.white);
    // rear gable: up to the tile roof, but never below the kitchen's flat roof that butts against it
    const fz = R.kitchen_flat.z, xs = (r.ridge_z - fz) / slope, yr = r.gable_y_rear;
    const top = zAt(H.x_west_outer) < fz
      ? [[H.x_west_outer, yr, fz], [xs, yr, fz], [0, yr, r.ridge_z]]
      : [[H.x_west_outer, yr, zAt(H.x_west_outer)], [0, yr, r.ridge_z]];
    poly(ext, [[0, yr, W.plate_z], [H.x_west_outer, yr, W.plate_z], ...top], M.white);
  }
  // chimney
  {
    const c = spec.chimney;
    box(ext, c.x0, c.x1, c.y0, c.y1, gz, c.z_breast, M.white);                                 // breast is painted white like the wall; only the stack is face brick
    box(ext, (c.stack_x0 + c.stack_x1) / 2 - 0.015, (c.stack_x0 + c.stack_x1) / 2 + 0.015, c.stack_y1 - 0.05, c.stack_y1 - 0.02, c.z_top, c.z_top + 1.6, M.metal);   // TV antenna mast
    box(ext, c.stack_x0, c.stack_x1, c.stack_y0, c.stack_y1, c.z_breast, c.z_top, M.red);      // slim stack
    box(ext, c.stack_x0 - 0.04, c.stack_x1 + 0.04, c.stack_y0 - 0.04, c.stack_y1 + 0.04, c.z_top - 0.12, c.z_top, M.red); // corbel
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, c.pot, 12), M.tile);
    pot.position.copy(L((c.stack_x0 + c.stack_x1) / 2, (c.stack_y0 + c.stack_y1) / 2, c.z_top + c.pot / 2)); pot.castShadow = true; ext.add(pot);
  }

  // --- interior walls (0.11) ---------------------------------------------
  const iw = W.int;
  // hall / bedrooms wall with two doors
  // hall west wall: wider entry section to the front bedroom, then it steps out into the hall for bedroom 2 (plan, vent photo)
  const hs = H.hall_step;
  wallRect(int_, hs.front_wall_x0, hs.front_wall_x1, H.porch.y1, hs.step_y + iw, 0, W.plate_z, [
    { from: D.front_bed.y0, to: D.front_bed.y1, sill: 0, head: D.front_bed.head, kind: 'door', swing: -1, hinge: 'end' }], M.intWall);
  wallRect(int_, hs.rear_wall_x0, hs.rear_wall_x1, hs.step_y, 11.49, 0, W.plate_z, [
    { from: D.bed2.y0, to: D.bed2.y1, sill: 0, head: D.bed2.head, kind: 'door', swing: -1, hinge: 'end' }], M.intWall);
  wallRect(int_, hs.rear_wall_x0, H.x_west_inner, hs.step_y, hs.step_y + iw, 0, W.plate_z, [], M.intWall);   // bed1 / bed2, including the step's return
  // bed2+hall / bed3+hall extension; with the reno hall doorway off, the hall part comes out and the hall runs straight through
  if (spec.renovation.hall_doorway === 'arch') {
    // 'arch' (default): the original doorway, widened a little, with a round arched head
    // springing at its old head height (2.05), crown ~2.48, and period mouldings on both faces after the client's
    // reference (Downloads/archway.jpeg, corbels removed): a flat casing band, a stepped outer band and a bead round the
    // opening, carried down the jambs to plinth blocks. Painted white like the woodwork.
    // widened to 860 clear and centred in the hall, as in the site photo (Downloads/arch.jpeg: the old doorway's architrave
    // nearly fills the end wall)
    const hl = spec.rooms.find(r => r.name === 'Hall'), cx = (hl.x0 + hl.x1) / 2, r = 0.43, ax0 = cx - r, ax1 = cx + r;
    const zs = spec.doors.hall_living.head, crown = zs + r, y0 = 11.49, y1 = 11.60, T = y1 - y0;
    wallRect(int_, W.party_half, H.x_west_inner, y0, y1, 0, W.plate_z, [{ from: ax0, to: ax1, sill: 0, head: crown, kind: 'opening', trim: false }], M.intWall);
    const paint = M.archWhite || (M.archWhite = new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.5 }));
    // shapes are drawn in three.js X (= -lot x) and height, extruded along lot y (three Z)
    const X = x => -x, seg = 40;
    const extrude = (shape, ya, depth, mat) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg }); const m = new THREE.Mesh(g, mat); m.position.set(0, 0, ya); int_.add(m); return m; };
    // spandrels: fill the wall between the square opening and the arch, through the wall's thickness
    for (const side of [-1, 1]) {
      const sh = new THREE.Shape(), ex = side < 0 ? ax0 : ax1;
      sh.moveTo(X(ex), zs); sh.lineTo(X(ex), crown); sh.lineTo(X(cx), crown);
      sh.absarc(X(cx), zs, r, Math.PI / 2, side < 0 ? 0 : Math.PI, side < 0);   // three X runs opposite to lot x
      extrude(sh, y0, T, M.intWall);
    }
    // half-annulus band from radius ri to ro, plus straight legs from the floor (or z0) to the spring line
    const band = (ri, ro, depth, faceY, dir, z0 = 0) => {
      const sh = new THREE.Shape();
      sh.moveTo(X(cx - ro), z0); sh.lineTo(X(cx - ro), zs); sh.absarc(X(cx), zs, ro, 0, Math.PI, false);
      sh.lineTo(X(cx + ro), z0); sh.lineTo(X(cx + ri), z0); sh.lineTo(X(cx + ri), zs); sh.absarc(X(cx), zs, ri, Math.PI, 0, true); sh.lineTo(X(cx - ri), z0);
      extrude(sh, dir > 0 ? faceY : faceY - depth, depth, paint);
    };
    for (const [faceY, dir] of [[y0, -1], [y1, 1]]) {                 // hall face (out toward -y) and extension face (+y)
      band(r, r + 0.075, 0.02, faceY, dir, 0.15);                      // flat casing, above the plinth block
      band(r + 0.075, r + 0.1, 0.035, faceY, dir, 0.15);               // stepped outer band
      const bead = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.012, 10, seg, Math.PI), paint);   // bead at the opening's edge
      bead.position.set(-cx, zs, faceY + dir * 0.01); int_.add(bead);
      for (const sgn of [-1, 1]) {                                     // bead down the jambs, plinth blocks at the floor
        const xj = cx + sgn * (r + 0.004);
        box(int_, xj - 0.012, xj + 0.012, Math.min(faceY, faceY + dir * 0.022), Math.max(faceY, faceY + dir * 0.022), 0.15, zs, paint);
        const xa = sgn < 0 ? cx - r - 0.11 : cx + r - 0.005, xb = sgn < 0 ? cx - r + 0.005 : cx + r + 0.11;
        box(int_, xa, xb, Math.min(faceY, faceY + dir * 0.045), Math.max(faceY, faceY + dir * 0.045), 0, 0.15, paint);
      }
    }
    box(int_, ax0, ax0 + 0.006, y0, y1, 0, zs, paint); box(int_, ax1 - 0.006, ax1, y0, y1, 0, zs, paint);   // painted jamb linings
    // impost blocks where the arch springs (a moulded capital over each leg, stepped twice) and a keystone at the crown
    for (const [faceY, dir] of [[y0, -1], [y1, 1]]) {
      const fy = (d) => [Math.min(faceY, faceY + dir * d), Math.max(faceY, faceY + dir * d)];
      for (const sgn of [-1, 1]) {
        const xi = cx + sgn * r, xo = cx + sgn * (r + 0.105), [a0, a1] = [Math.min(xi, xo), Math.max(xi, xo)];
        box(int_, a0 - 0.008, a1 + 0.008, ...fy(0.05), zs - 0.07, zs - 0.035, paint);
        box(int_, a0 - 0.016, a1 + 0.016, ...fy(0.06), zs - 0.035, zs, paint);
      }
      const kw0 = 0.05, kw1 = 0.075, kh = 0.15, kz = zs + r - 0.004, ks = new THREE.Shape();   // tapered keystone
      ks.moveTo(-cx - kw0 / 2, kz); ks.lineTo(-cx + kw0 / 2, kz); ks.lineTo(-cx + kw1 / 2, kz + kh); ks.lineTo(-cx - kw1 / 2, kz + kh); ks.closePath();
      extrude(ks, dir > 0 ? faceY : faceY - 0.05, 0.05, paint);
    }
  } else if (spec.renovation.hall_doorway !== false) {
    // cased archway: a wide plastered opening with flat painted casings on both faces, a deeper head casing and a
    // small projecting cap moulding over it (reference: classic hallway cased opening, light warm grey trim)
    // 'simple': taller and wider, one plain flat white casing all round, no cap or plinth blocks
    // 'door': the original doorway (plan; site photo hallway2.jpeg): door-sized, square head, the same plain architrave
    // as the other doors, no leaf
    const doorSized = spec.renovation.hall_doorway === 'door', simple = spec.renovation.hall_doorway === 'simple' || doorSized;
    const inset = simple ? 0.08 : 0.12, ahead = doorSized ? spec.doors.hall_living.head : simple ? 2.6 : 2.45, cw = simple ? 0.075 : 0.09, headH = simple ? cw : 0.14, ct = 0.02;
    const ax0 = doorSized ? spec.doors.hall_living.x0 : W.party_half + inset, ax1 = doorSized ? spec.doors.hall_living.x1 : hs.rear_wall_x0 - inset;
    wallRect(int_, W.party_half, H.x_west_inner, 11.49, 11.60, 0, W.plate_z, [{ from: ax0, to: ax1, sill: 0, head: ahead, kind: 'opening', trim: false }], M.intWall);
    const paint = simple ? (M.archWhite || (M.archWhite = new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.5 })))
      : (M.archTrim || (M.archTrim = new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.6 })));
    for (const [f0, f1, c0, c1] of [[11.49 - ct, 11.49, 11.49 - ct - 0.015, 11.49], [11.60, 11.60 + ct, 11.60, 11.60 + ct + 0.015]]) {
      box(int_, ax0 - cw, ax0, f0, f1, 0, ahead + headH, paint);                                        // legs
      box(int_, ax1, ax1 + cw, f0, f1, 0, ahead + headH, paint);
      box(int_, ax0 - cw, ax1 + cw, f0, f1, ahead, ahead + headH, paint);                               // head casing
      if (!simple) {
        box(int_, ax0 - cw - 0.025, ax1 + cw + 0.025, c0, c1, ahead + 0.14, ahead + 0.18, paint);        // cap moulding
        box(int_, ax0 - cw - 0.01, ax0 + 0.01, c0, c1, 0, 0.14, paint); box(int_, ax1 - 0.01, ax1 + cw + 0.01, c0, c1, 0, 0.14, paint);   // plinth blocks
      }
    }
    for (const [a0, a1] of [[ax0, ax0 + 0.006], [ax1 - 0.006, ax1]]) box(int_, a0, a1, 11.49, 11.60, 0, ahead, paint);   // painted reveal linings
    box(int_, ax0, ax1, 11.49, 11.60, ahead - 0.006, ahead, paint);
  } else wallRect(int_, hs.rear_wall_x0, H.x_west_inner, 11.49, 11.60, 0, W.plate_z, [], M.intWall);
  // hall extension / kitchen: no doorway, just a plastered gap the full width of the hall (party wall to the bedroom 3
  // wall) and up to the kitchen ceiling; the higher hall ceiling leaves a strip of wall above it on the hall side
  wallRect(int_, W.party_half, H.x_west_inner, 14.91, 15.02, 0, W.plate_z, [
    { from: W.party_half, to: 1.30, sill: 0, head: 2.8, kind: 'opening', trim: false }], M.intWall);
  // the opening's one plastered return (the 110 mm end of the kitchen wall at x 1.30): the skirting wraps round it,
  // joining the hall's run to the kitchen's, as it would on site
  box(int_, 1.30 - 0.018, 1.30, 14.91, 15.02 + 0.018, 0, 0.17, trimFor({ name: 'Hall extension' })).name = 'Skirting board';
  wallRect(int_, 1.30, 1.41, 11.60, 14.91, 0, W.plate_z, [
    { from: spec.renovation.bedroom3.door_y0, to: spec.renovation.bedroom3.door_y1, sill: 0, head: 2.04, kind: 'door', swing: -1 }
  ], M.intWall);
  // (bedroom 3's robe is built with the other two, below: spec.fixtures.robe_bed3)
  const ks = spec.kitchen_south_wall;
  // bath door wall, then a 0.6 m deep pantry whose front steps forward into the kitchen
  const pn = spec.renovation.pantry;
  wallRect(int_, ks.x0, pn.x0, ks.y0, ks.y1, 0, 2.8, [
    { from: D.bath.x0, to: D.bath.x1, sill: 0, head: D.bath.head, kind: 'door' }], M.intWall);
  wallRect(int_, 2.02, pn.x0, pn.front_y0, H.y_rear_outer, 0, 2.8, [], M.intWall);                     // bath west wall / pantry east side
  const pantryFridge = spec.renovation.fridge?.at === 'pantry';
  const pantryOpen = spec.renovation.no_pantry || pantryFridge || !!spec.renovation.laundry;
  if (!spec.renovation.no_pantry) {
  wallRect(int_, pn.x0, pn.x1, pn.front_y0, pn.front_y1, 0, 2.8, [pantryFridge
    ? { from: pn.x0, to: pn.x1 - iw, sill: 0, head: pn.recess_head, kind: 'opening' }                   // fridge recess
    : spec.renovation.laundry ? { from: pn.x0, to: pn.x1 - iw, sill: 0, head: spec.renovation.laundry.head, kind: 'opening', trim: false }   // laundry: plaster reveal up to the cornice
    : { from: D.pantry.x0, to: D.pantry.x1, sill: 0, head: D.pantry.head, kind: 'door', cupboard: true, swing: -1 }], M.intWall);
  wallRect(int_, pn.x1 - iw, pn.x1, pn.front_y1, H.y_rear_inner, 0, 2.8, [], M.intWall);              // pantry west side, into the back-door recess
  // plaster lining of the recess cut into the rear wall: back, both sides and the soffit
  box(int_, pn.x0, pn.x1 - iw, pn.back_y - 0.006, pn.back_y, 0, pn.recess_head, M.intWall);
  box(int_, pn.x0, pn.x0 + 0.006, H.y_rear_inner - 0.004, pn.back_y, 0, pn.recess_head, M.intWall);
  box(int_, pn.x1 - iw - 0.006, pn.x1 - iw, H.y_rear_inner - 0.004, pn.back_y, 0, pn.recess_head, M.intWall);
  box(int_, pn.x0, pn.x1 - iw, H.y_rear_inner - 0.004, pn.back_y, pn.recess_head - 0.006, pn.recess_head, M.intWall);
  // with the front opened, the brick face above the recess head shows: plaster it up to the ceiling
  if (pantryOpen) box(int_, pn.x0, pn.x1 - iw, H.y_rear_inner - 0.008, H.y_rear_inner - 0.003, pn.recess_head - 0.006, 2.8, M.intWall);
  }
  wallRect(int_, W.party_half, H.wing.x_inner, 21.18, 21.29, 0, 2.8, [                                  // bath / wc
    { from: D.wc.x0, to: D.wc.x1, sill: 0, head: D.wc.head, kind: 'door', swing: -1 }], M.intWall);
  wallRect(int_, W.party_half, H.wing.x_inner, 22.16, 22.27, Lv.slab, 2.8, [], M.intWall);              // wc / laundry

  // fixtures
  const F = spec.fixtures;
  // Robes as in the photos (Downloads/wadrobe.jpeg, 33.jpeg), to be painted white: tall doors over a recessed plinth,
  // a row of overhead cupboard doors above a slim shadow gap, every door with a raised moulded panel, small round
  // silver knobs: tall doors in pairs with the knobs at the meeting stiles about 1.1 m up, overheads near the bottom
  for (const r of [F.robe_front, F.robe_bed2, F.robe_bed3]) {
    box(int_, r.x0, r.x1, r.y0, r.y1, ROBE_KICK, r.z1, robePaint());                        // carcass
    box(int_, r.x0, r.x1, r.y0 + 0.04, r.y1, 0, ROBE_KICK, robePaint());                    // plinth, set back 40
    const n = Math.round((r.x1 - r.x0) / 0.6), w = (r.x1 - r.x0) / n, rail = Math.min(2.08, r.z1 - 0.62);   // overhead doors ~0.4 x the long ones (photo)
    for (let i = 0; i < n; i++) {
      const x0 = r.x0 + i * w + 0.0015, x1 = r.x0 + (i + 1) * w - 0.0015;
      const single = n % 2 === 1 && i === n - 1, kx = single ? x0 + 0.05 : i % 2 === 0 ? x1 - 0.05 : x0 + 0.05;
      // the doors open (Walk: face them and press E; client 2026-10-21): the tall and overhead door of each column on one
      // assembly, each hinged on the edge away from its knob, swinging ~100 degrees out into the room
      const hx = kx > (x0 + x1) / 2 ? x0 : x1, assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
      for (const [z0, z1, kz] of [[ROBE_KICK, rail, 1.1], [rail + 0.012, r.z1, rail + 0.1]]) {
        const pivot = new THREE.Group(); pivot.position.copy(L(hx, r.y0 - 0.018, 0));
        const leaf = new THREE.Group(); leaf.position.copy(pivot.position).negate(); pivot.add(leaf);
        robeDoor(leaf, x0, x1, r.y0, z0, z1); robeKnob(leaf, kx, r.y0, kz);
        leaf.traverse(o => { if (o.isMesh) o.userData.door = true; });
        pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = (hx === x0 ? -1 : 1) * 1.75;
        assembly.add(pivot);
      }
    }
  }
  // --- front bedroom: sheer curtains across the bay end (Reno sheet's sheer curtains), on a ceiling track 220 in from
  // the bay wall (clear of the cornice), wall to wall, OPEN: each side gathered into a ~450 stack beside the window
  if (spec.renovation.curtains) {
    const fr = spec.rooms.find(r => r.name === 'Front bedroom'), zc = fr.floor + fr.ceil, y = fr.y0 + 0.22, x0 = fr.x0 + 0.12, x1 = fr.x1 - 0.12;
    const track = M.track || (M.track = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.5 }));
    const sheerMat = M.sheer || (M.sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.84, side: THREE.DoubleSide, depthWrite: false }));
    box(int_, x0, x1, y - 0.016, y + 0.016, zc - 0.022, zc, track);
    const stack = (a0, a1) => {                                         // gathered sheer: deep folds, 90 pitch
      const n = Math.ceil((a1 - a0) / 0.004), rows = 14, zB = 0.012, zT = zc - 0.025, pos = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const u = a0 + (a1 - a0) * i / n, w = Math.sin(2 * Math.PI * (u - a0) / 0.09), sw = Math.sign(w) * Math.pow(Math.abs(w), 0.6);
        for (let r = 0; r <= rows; r++) { const z = zB + (zT - zB) * r / rows, v = L(u, y + 0.07 + 0.06 * sw * (1 + 0.35 * (1 - r / rows)), z); pos.push(v.x, v.y, v.z); if (i && r) { const k = i * (rows + 1) + r, kp = k - (rows + 1); idx.push(kp - 1, k - 1, kp, k - 1, k, kp); } }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, sheerMat); m.renderOrder = 2; m.castShadow = false; int_.add(m);
    };
    stack(x0, x0 + 0.45); stack(x1 - 0.45, x1);
  }
  // --- split system heads (Rinnai T Series wall splits), each on the room's outside (west, side-path) wall so the
  // pipes, drain and cable go straight out to outdoor units on the side path. Indoor units (H x W x D): 5.0 kW
  // HINRT50B 316 x 997 x 227; 3.5 kW HINRT35B 316 x 940 x 224; 2.5 kW HINRT25B 294 x 881 x 194.
  //  - front bedroom: 3.5 kW, centred over the bed on the west wall, top 2.65 (100 under the 2.75 picture rail). Its
  //    window is the street bay: no wall beside or above it for a unit, and pipes would run down the front facade.
  //  - bedroom 2: 2.5 kW, west wall between the window and the robe (~200 clear each side), top 2.65.
  //  - bedroom 3: 2.5 kW, west wall above the window (the wall beside it is only 0.65 m), bottom 50 above the
  //    window's architrave, ~240 under the cornice.
  //  - kitchen / dining: 5.0 kW, west wall centred over the window (its only outside wall), top at 2.65: 50 under the
  //    100 cove cornice, bottom ~50 over the window head (2.28).
  // Shadowing: lit from the pendant at about its own height and the robe strip at a low angle, so only soft slivers;
  // keep wall-grazing light (downlights near the wall, uplights) off these walls.
  {
    const white = M.splitWhite || (M.splitWhite = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4 }));
    const dark = M.splitVent || (M.splitVent = new THREE.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.7 }));
    const split = (cx, cy, nx, ny, [h, w, d], z1, room) => {    // centre on the wall face, n = into the room
      const z0 = z1 - h;
      // its box, for the shader's shadows (bedroom lights only); lot frame
      if (room) { const x0 = nx ? Math.min(cx, cx + nx * d) : cx - w / 2, x1 = nx ? Math.max(cx, cx + nx * d) : cx + w / 2, y0 = nx ? cy - w / 2 : Math.min(cy, cy + ny * d), y1 = nx ? cy + w / 2 : Math.max(cy, cy + ny * d);
        (G.ceilings.userData.bedLamps.occ ||= []).push({ room, min: [x0, y0, z0], max: [x1, y1, z1] }); }
      const u = (a0, a1, b0, b1, za, zb, m) => nx
        ? box(int_, Math.min(cx + nx * b0, cx + nx * b1), Math.max(cx + nx * b0, cx + nx * b1), cy + a0, cy + a1, za, zb, m)
        : box(int_, cx + a0, cx + a1, Math.min(cy + ny * b0, cy + ny * b1), Math.max(cy + ny * b0, cy + ny * b1), za, zb, m);
      u(-w / 2, w / 2, 0, d - 0.02, z0 + 0.02, z1, white);                                        // body
      u(-w / 2 + 0.01, w / 2 - 0.01, d - 0.02, d, z0 + 0.06, z1 - 0.01, white);                    // front panel
      u(-w / 2 + 0.03, w / 2 - 0.03, 0.05, d - 0.03, z0, z0 + 0.02, dark);                         // outlet louvre underneath
      u(w / 2 - 0.12, w / 2 - 0.06, d, d + 0.002, z0 + 0.08, z0 + 0.095, dark);                    // display
    };
    const KW50 = [0.316, 0.997, 0.227], KW35 = [0.316, 0.94, 0.224], KW25 = [0.294, 0.881, 0.194];
    const fr = spec.rooms.find(r => r.name === 'Front bedroom'), b2 = spec.rooms.find(r => r.name === 'Bedroom 2'), b3 = spec.rooms.find(r => r.name === 'Bedroom 3');
    split(fr.x1, frontBedY(spec), -1, 0, KW35, 2.65, 'Front bedroom');
    const w1 = Win.W1_bed2; split(b2.x1, (w1.y1 + 0.07 + F.robe_bed2.y0) / 2, -1, 0, KW25, 2.65, 'Bedroom 2');
    if (b3) { const w2 = Win.W2_living; split(b3.x1, (w2.y0 + w2.y1) / 2, -1, 0, KW25, w2.head + 0.075 + 0.08 + 0.05 + KW25[0], 'Bedroom 3'); }   // clear of the roller blind's cassette over the architrave
    { const kd = spec.rooms.find(r => r.name === 'Kitchen / dining'), w3 = Win.W3_kitchen;
      // a slim 50 mm roller blind cassette sits on the window's architrave (client); the head unit sits 10 above it, its top
      // into the cornice line (the cornice is notched behind it)
      rollerBlind(int_, 'y', kd.x1, -1, w3.y0, w3.y1, w3.head + 0.075, { h: 0.05 });
      split(kd.x1, (w3.y0 + w3.y1) / 2, -1, 0, KW50, w3.head + 0.075 + 0.05 + 0.01 + KW50[0]); }
  }
  // --- bedroom lighting (spec.renovation.bed_lights): robe-top strip and night light always; angled downlights,
  // corner downlights or reading spots by version ---
  {
    // over-bed reading spots in the ceiling (the walls are brick, so no wall lights): one each side, 450 out from the
    // headboard wall and 600 either side of the bed's centre line (just outside the shoulders), 24 degree beam, 350 lm,
    // deep-set and tilted toward the reader's lap, so lying on your back you look past the lamp, not into it
    const spot = (x, y, ax, ay, room, layer = 'reading', lm = 350, kind = 'spot') => {
      const zc = 3.15, big = kind === 'wash';
      const trim = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.05 : 0.045, big ? 0.05 : 0.045, 0.006, 24), M.dlTrim); trim.position.copy(L(x, y, zc - 0.003)); int_.add(trim);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.03 : 0.02, big ? 0.03 : 0.02, 0.004, 16), bedGlow(layer)); lens.position.copy(L(x, y, zc - 0.007)); int_.add(lens);
      BL.points.push({ room, layer, kind, x, y, z: zc - 0.03, ax, ay, lm });
    };
    const fr = spec.rooms.find(r => r.name === 'Front bedroom'), b2 = spec.rooms.find(r => r.name === 'Bedroom 2');
    if (spec.renovation.bed_lights === 'angled') {
      // Three high-tilt adjustable downlights per room, every one tilted 35 degrees onto a wall, none pointing down:
      // with a 40 degree beam the near edge (15 degrees off vertical) still reaches the wall from 0.8 m out, so the
      // pool sits on the wall (about 0.2-2.6 m up) instead of a disc on the floor. Needs fittings that tilt to 35-40
      // (a standard gimbal stops at about 30). Designer's rule: never a downlight over the head of the bed, so none
      // within 1.0 m of the headboard wall across the mattress plus 0.2 m each side. All on one dimmed circuit.
      // Three, not four: each room lights the walls you see from the bed and the door; the head end stays dimmer.
      const T = Math.tan(35 * Math.PI / 180);                              // aim: per metre of drop, toward the wall
      const wash = (x, y, nx, ny, room, lm) => spot(x, y, nx * T, ny * T, room, 'angled', lm, 'wash');
      // Front bedroom (bed on the west wall, facing the hall wall): two on the robe at its quarter points, 0.8 m out
      // from the doors; one 0.8 m off the hall wall on the bed's centre line, a single pool on the blank wall the bed
      // faces (between the bay and the hall door, the spot for a picture). The bay is left to the room's spill: at
      // night it is shutters or black glass, and lighting it mostly lights the street.
      { const r = F.robe_front, y = r.y0 - 0.8, w = r.x1 - r.x0;
        for (const x of [r.x0 + w / 4, r.x1 - w / 4]) wash(x, y, 0, 1, 'Front bedroom', 600);
        wash(fr.x0 + 0.8, (fr.y0 + r.y0) / 2, -1, 0, 'Front bedroom', 600); }
      // Bedroom 2 (bed on the north wall, facing the robe): the wall the bed faces is the robe, so all three wash it,
      // at its sixth points (1.09 apart, about the 0.8 setback x 1.3, so the pools meet), 0.8 m out over the foot
      // of the bed. The window and hall walls get the robe's bounce
      { const r = F.robe_bed2, y = r.y0 - 0.8, w = r.x1 - r.x0;
        for (const f of [1, 3, 5]) wash(r.x0 + w * f / 6, y, 0, 1, 'Bedroom 2', 500); }
    }
    if (spec.renovation.bed_lights === 'pendantWall') {
      // one high-tilt downlight per room on the wall opposite the bed, tilted 35 degrees so the pool sits on the wall:
      // front bedroom on the hall wall, 0.8 m off it on the bed's centre line (past the foot of the bed); bedroom 2's
      // bed faces the robe, so its one goes on the robe's centre, 0.8 m out from the doors (over the foot of the bed)
      const T = Math.tan(35 * Math.PI / 180);
      spot(fr.x0 + 0.8, frontBedY(spec), -T, 0, 'Front bedroom', 'wallwash', 600, 'wash');
      spot((F.robe_bed2.x0 + F.robe_bed2.x1) / 2, F.robe_bed2.y0 - 0.8, 0, T, 'Bedroom 2', 'wallwash', 500, 'wash');
    }
    if (spec.renovation.bed_lights === 'pendantSheer') {
      // Front bedroom bay: a slim plaster pelmet ledge wall to wall across the bay end, 250 deep, its top 0.45 below the
      // ceiling (clear of the 200 cornice); the sheer hangs from a track under it, drawn; an LED strip on top of the
      // ledge near its front edge, facing up and a little into the room, washes the ceiling and cornice over the
      // curtain (the same uplight as the robe tops). 2700 K, 450 lm/m, secondary circuit
      const zc = fr.ceil, zl = zc - 0.45, yl0 = fr.y0, yl1 = fr.y0 + 0.25, x0 = fr.x0, x1 = fr.x1;
      box(int_, x0, x1, yl0, yl1, zl - 0.04, zl, M.ceiling);                                         // the ledge
      box(int_, x0, x1, yl1 - 0.02, yl1, zl, zl + 0.05, M.ceiling);                                  // upstand hiding the strip
      box(int_, x0 + 0.05, x1 - 0.05, yl1 - 0.06, yl1 - 0.03, zl, zl + 0.012, bedGlow('sheer'));     // strip
      BL.lines.push({ room: 'Front bedroom', layer: 'sheer', mode: 0, x0: x0 + 0.05, x1: x1 - 0.05, y: yl1 - 0.045, z: zl + 0.02, ay: 0.26, az: 0.966, lmPerM: 450 });
      const track = M.track || (M.track = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.5 }));
      const sheerMat = M.sheer || (M.sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.84, side: THREE.DoubleSide, depthWrite: false }));
      const yt = yl0 + 0.13, cx0 = x0 + 0.05, cx1 = x1 - 0.05;
      box(int_, cx0, cx1, yt - 0.016, yt + 0.016, zl - 0.062, zl - 0.04, track);                     // track under the ledge
      // one continuous S-fold sheer, 100 pitch, 50 deep, from 12 above the floor to the track
      const n = Math.ceil((cx1 - cx0) / 0.005), rows = 14, zB = 0.012, zT = zl - 0.065, pos = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const u = cx0 + (cx1 - cx0) * i / n, w = Math.sin(2 * Math.PI * (u - cx0) / 0.1), sw = Math.sign(w) * Math.pow(Math.abs(w), 0.6);
        for (let r = 0; r <= rows; r++) {
          const z = zB + (zT - zB) * r / rows, v = L(u, yt + 0.04 * sw * (1 + 0.3 * (1 - r / rows)), z);
          pos.push(v.x, v.y, v.z);
          if (i && r) { const k = i * (rows + 1) + r, kp = k - (rows + 1); idx.push(kp - 1, k - 1, kp, k - 1, k, kp); }
        }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const sh = new THREE.Mesh(geo, sheerMat); sh.renderOrder = 2; sh.castShadow = false; int_.add(sh);
    }
    if (spec.renovation.bed_lights === 'corners') {
      // two adjustable downlights toward the corners, each washing the robe front: about a third of the ceiling height
      // (1.0 m) out from the doors, the usual wall-wash setback, tilted onto the doors at about 1.3 m; 36 degree
      // beam, 500 lm. Front robe (2.09 wide): 0.5 in from each end, 1.1 apart, about the setback. Bedroom 2's robe
      // is 3.28 wide: 0.8 in from each end, 1.7 apart, so the middle of the run is a little softer
      for (const [r, room, inset] of [[F.robe_front, 'Front bedroom', 0.5], [F.robe_bed2, 'Bedroom 2', 0.8]]) {
        const y = r.y0 - 1.0, t = (r.y0 - y) / (3.15 - 1.3);
        for (const x of [r.x0 + inset, r.x1 - inset]) spot(x, y, 0, t, room, 'corner', 500, 'wash');
      }
    }
    // aim: from the spot to a book about 0.7 m out from the wall at 0.8 m, 0.35 m off the bed's centre line
    if (spec.renovation.bed_lights === 'proposed') { const yc = frontBedY(spec), x = fr.x1 - 0.45; for (const sg of [-1, 1]) spot(x, yc + sg * 0.6, (fr.x1 - 0.7 - x) / 2.35, -sg * 0.25 / 2.35, 'Front bedroom'); }
    if (spec.renovation.bed_lights === 'proposed') { const xc = (b2.x0 + b2.x1) / 2 + 0.05, y = b2.y0 + 0.45; for (const sg of [-1, 1]) spot(xc + sg * 0.6, y, -sg * 0.25 / 2.35, (b2.y0 + 0.7 - y) / 2.35, 'Bedroom 2'); }
    // robe top: aluminium channel at the back, tilted 45 degrees up and out into the room (washes the ceiling and
    // cornice, can't be seen from the floor); and a strip under the doors aimed down at the floor for getting up at night
    for (const [r, room] of [[F.robe_front, 'Front bedroom'], [F.robe_bed2, 'Bedroom 2'], [F.robe_bed3, 'Bedroom 3']]) {
      // floor strip under the doors (and under the front room's open shelving), aimed at the floor: a low glow, part
      // of the default. Kept dim, 25 lm/m (about 50-70 lm per room), the same 2700 K tape as the top (one colour
      // temperature in a view), on the same dimmer
      const nx0 = (room === 'Front bedroom' ? Math.min(r.x0, F.shelves_front.x0) : r.x0) + 0.02, nx1 = r.x1 - 0.02;
      // tucked in the plinth recess, under the door bottoms, so the tape itself isn't seen
      box(int_, nx0, nx1, r.y0 + 0.006, r.y0 + 0.018, ROBE_KICK - 0.012, ROBE_KICK - 0.002, bedGlow('night'));
      BL.lines.push({ room, layer: 'night', mode: 1, x0: nx0, x1: nx1, y: r.y0 + 0.012, z: ROBE_KICK - 0.015, ay: -0.5, az: -0.866, lmPerM: 25 });
      // front: one continuous strip over the robe and the open shelving beside it (same height the whole way)
      const sx0 = (room === 'Front bedroom' ? Math.min(r.x0, F.shelves_front.x0) : r.x0) + 0.03, sx1 = r.x1 - 0.03;
      box(int_, sx0, sx1, r.y1 - 0.07, r.y1 - 0.04, r.z1, r.z1 + 0.025, steelMat());
      box(int_, sx0, sx1, r.y1 - 0.075, r.y1 - 0.07, r.z1 + 0.005, r.z1 + 0.025, bedGlow('cove'));
      BL.lines.push({ room, layer: 'cove', mode: 0, x0: sx0, x1: sx1, y: r.y1 - 0.08, z: r.z1 + 0.02, ay: -0.707, az: 0.707, lmPerM: 450 });
      // 25 mm upstand along the front edge of the top: a 120-degree tape tilted 45 degrees throws its lower edge ~15
      // degrees below horizontal, and without a lip a thin streak can reach the opposite wall
      box(int_, sx0 - 0.03, r.x1, r.y0, r.y0 + 0.018, r.z1, r.z1 + 0.025, robePaint());
    }
    // Hall (spec.renovation.hall_lights 'art'), after Mint's period halls (Crescent project: opal pendants on the
    // centreline, one painting on the long wall, no downlights; their 10 m halls carry one or two pieces, and
    // spot-per-painting appears only in collectors' houses). The hall end keeps its original door-sized opening, so the
    // short extension beyond is its own space: a rhythm of three pendants down the centreline, ~3.6-4 m apart, bottoms at
    // 2.1 (door-head height):
    //  - the entry pendant on the original rose (August oval, set in the roses loop);
    //  - mid-hall and mid-extension: smaller August rounds (300, the hall is 1.19 wide) on new small plain plaster roses;
    //  - ONE painting, ~900 x 1100, on the long party wall (no doors on it), centred on the mid-hall pendant (its light
    //    falls evenly across it and the two read as one composition), centre 1.55 m,
    //    slim frame, lit by that pendant (a 30-degree spot would sit almost against the opposite wall in 1.19 m).
    if (spec.renovation.hall_lights === 'art') {
      const ha = spec.rooms.find(r => r.name === 'Hall'), ext = spec.rooms.find(r => r.name === 'Hall extension');
      const wx = W.party_half, zc = ha.floor + ha.ceil, cx = (wx + ha.x1) / 2;
      const hallPendant = y => {
        for (const [f, hh] of [[1, 0.025], [0.6, 0.04]]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * f, 0.15 * f * 1.04, hh, 32), M.ceiling); ring.position.copy(L(cx, y, zc - hh / 2)); int_.add(ring); }
        bedPendant(int_, BL, 'Hall', cx, y, zc, spec.renovation.hall_pendant, 2.1, 'hallPendant');
      };
      const yHall = (ha.y0 + ha.y1) / 2;
      // three in all: the entry's, mid-hall, and mid-extension (with the door-sized opening the extension is its own
      // space; tried with two and it fell dim, the kitchen's light doesn't carry that far)
      hallPendant(yHall); hallPendant((spec.renovation.bedroom3.door_y1 + ext.y1) / 2);
      if (spec.renovation.art === 'hall') {   // the earlier pair; the proposed layout (art 'v2') hangs its own below
      const frameM = M.artFrame || (M.artFrame = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.6 }));
      const w = 0.9, h = 1.1, za = 1.55, yc = yHall;                                                // centred on the hall pendant
      box(int_, wx, wx + 0.03, yc - w / 2, yc + w / 2, za - h / 2, za + h / 2, frameM);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), new THREE.MeshStandardMaterial({ map: artTexture(1), roughness: 0.85 }));
      c.rotation.y = -Math.PI / 2; c.position.copy(L(wx + 0.031, yc, za)); int_.add(c);
      // a second, smaller piece (700 x 900) centred on the extension pendant: the same pendant-and-painting pairing,
      // seen framed by the arch from the hall. Two pieces over ~10 m, as in Mint's period halls; the entry stays clear
      const y2 = (spec.renovation.bedroom3.door_y1 + ext.y1) / 2, w2 = 0.7, h2 = 0.9;
      box(int_, wx, wx + 0.03, y2 - w2 / 2, y2 + w2 / 2, za - h2 / 2, za + h2 / 2, frameM);
      const c2 = new THREE.Mesh(new THREE.PlaneGeometry(w2 - 0.06, h2 - 0.06), new THREE.MeshStandardMaterial({ map: artTexture(2), roughness: 0.85 }));
      c2.rotation.y = -Math.PI / 2; c2.position.copy(L(wx + 0.031, y2, za)); int_.add(c2);
      }
    }
  }
  // --- artwork, proposed layout (spec.renovation.art 'v2'; ART-PLACEMENT.md Part D, 2026-10-21) ---
  // Fewer, bigger pieces where the sightlines land, centres at 1.50 under the 3.15 ceilings (bigger, not higher). The
  // hall stays quiet so the hero at its end reads; the extension past the arch is bare (the arch frames the hero).
  if (spec.renovation.art === 'v2') {
    const rm = n => spec.rooms.find(r => r.name === n), ks = spec.kitchen_south_wall.y0, F = spec.fixtures;
    // 1. the hero: kitchen south wall beside the bathroom door, on the front door's axis 14.7 m away. 700 x 1000
    //    canvas in an oak float frame, centre 1.50; lit by spill (the buffet downlight beside it and the table lights)
    const kd = rm('Kitchen / dining'), hx = 0.59;
    hangArt(int_, 'y', ks, -1, hx, kd.floor + 1.5, 0.7, 1.0, artTex(11, 'blush', 0.65 / 0.95), { depth: 0.045 });
    {
      // no spot on the hero (client 2026-10-21: the scallop over the frame felt wrong). Per the lighting notes, art that
      // is part of the setting takes spill, and downlights belong over benches: the fitting serves the buffet instead.
      // Straight down over the sideboard's front edge (500 off the wall), centred on its length; 24 degree low-glare,
      // ~220 lm: ~300 lux on the stone top for serving; the hero beside it is lit by the pool's spill and the table lights
      // a pair on the kitchen's ceiling grid (its buffet column, 500 off the wall so the beams' cores stay off it; the
      // grid's second and third rows, centred on the buffet), ~130 lm each
      const zc = kd.floor + kd.ceil, KG = kitchenGrid(spec), bx = KG.cols[0];
      for (const by of KG.rows.slice(1)) {
        const dl = dlFitting(); dl.position.copy(L(bx, by, zc - 0.012)); int_.add(dl);
        // the south one tilts a touch north (~10 degrees): its pool still lands on the buffet, its edge clear of the painting
        BL.points.push({ room: 'Kitchen / dining', layer: 'kBuffet', kind: 'pin', x: bx, y: by, z: zc - 0.03, ax: 0, ay: by > ks - 0.6 ? -0.17 : 0, lm: 130 });   // 15 degree: keeps the beams off the walls and the painting (24 degree threw two arcs)
      }
    }
    // 2. mid-hall: one 700 x 900 original on the party wall, centred on the mid-hall pendant, which lights it; 35 deep
    const ha = rm('Hall');
    hangArt(int_, 'x', W.party_half, 1, (ha.y0 + ha.y1) / 2, ha.floor + 1.5, 0.7, 0.9, artTex(12, 'quiet', 0.65 / 0.85), { depth: 0.035 });
    // 3. entry: a 600 x 1000 arched mirror (echoes the hall arch) on the west wall before the front bedroom door, centre
    //    1.55, over a 120-deep oak key ledge; the party wall stays clear so the hero reads from the door
    const en = rm('Entry');
    archMirror(int_, en.x1, -1, 5.65, en.floor + 1.55, 0.6, 1.0);
    // honed marble ledge, 700 x 120 x 30, styled within its depth: letters at the north end, a travertine tray with the
    // keys lying on it in the middle, a stoneware bud vase with a few eucalyptus stems at the south end
    {
      const marble = M.ledgeMarble || (M.ledgeMarble = new THREE.MeshStandardMaterial({ color: 0xe8e3d9, roughness: 0.35 }));
      const lz = en.floor + 0.95, lx = en.x1 - 0.06, fu = G.furniture;
      box(int_, en.x1 - 0.12, en.x1, 5.3, 6.0, lz - 0.03, lz, marble);
      const mat = (k, c, o = {}) => M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o }));
      // two envelopes, a touch askew
      [[0, mat('envCream', 0xf2ede2), 0.06], [0.003, mat('envKraft', 0xc9ab84), -0.1]].forEach(([dz, m, r]) => {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.003, 0.15), m); e.position.copy(L(lx, 5.43, lz + 0.0015 + dz)); e.rotation.y = r; e.castShadow = true; fu.add(e);
      });
      // travertine tray 150 x 80 x 12, the keys flat on it: a brass ring, a steel and a brass key
      const ty = 5.66, tt = lz + 0.012;
      box(fu, lx - 0.04, lx + 0.04, ty - 0.075, ty + 0.075, lz, tt, mat('travertine', 0xd9ccb6, { roughness: 0.6 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0018, 6, 20), artBrass()); ring.rotation.x = Math.PI / 2; ring.position.copy(L(lx, ty - 0.035, tt + 0.002)); fu.add(ring);
      const keyM = mat('keySteel', 0xb9b6ae, { roughness: 0.35, metalness: 0.6 });
      for (const [a, k] of [[0.3, keyM], [-0.3, artBrass()]]) {
        const key = new THREE.Group(); key.position.copy(L(lx, ty - 0.035, tt + 0.0018)); key.rotation.y = -Math.PI / 2 + a; fu.add(key);
        const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.003, 16), k); bow.position.set(0.022, 0, 0); key.add(bow);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.003, 0.007), k); blade.position.set(0.048, 0, 0); key.add(blade);
      }
      // bud vase: matte stoneware, 130 tall, closed profile; three eucalyptus stems leaning out of it
      const vy = 5.88, vase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.028, 0], [0.034, 0.03], [0.032, 0.07], [0.016, 0.11], [0.012, 0.13], [0, 0.13]].map(([a, b]) => new THREE.Vector2(a, b)), 32), mat('budVase', 0x8a7a64, { roughness: 0.85 }));
      vase.position.copy(L(lx, vy, lz)); vase.castShadow = true; fu.add(vase);
      const stemM = mat('euStem', 0x6f6a55), leafM = mat('euLeaf', 0x8fa08f, { roughness: 0.8 });
      [[0.22, 0.3, Math.PI / 2], [-0.25, 0.26, Math.PI / 2], [0.12, 0.34, Math.PI / 2 + 0.7]].forEach(([tilt, len, spin], i) => {   // leaning along the wall or out into the room, never into the mirror
        const st = new THREE.Group(); st.position.copy(L(lx, vy, lz + 0.12)); st.rotation.set(0, spin, tilt); fu.add(st);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.002, len, 5), stemM); stem.position.y = len / 2; st.add(stem);
        for (let k = 0; k < 7; k++) {                                          // round leaves in pairs up the stem
          const lf = new THREE.Mesh(new THREE.SphereGeometry(0.013 - k * 0.0008, 10, 6), leafM); lf.scale.set(1, 0.18, 1);
          lf.position.set((k % 2 ? 1 : -1) * 0.012, 0.06 + k * (len - 0.07) / 7, 0); lf.rotation.z = (k % 2 ? -1 : 1) * 0.5; st.add(lf);
        }
      });
    }
    // 5. sideboard: no art on it (client 2026-10-21: the leaned piece came out); the lamp at the north end (out of the
    //    hero's sightline), a low olive bowl at the south end
    if (spec.renovation.sideboard) {
      const top = kd.floor + 0.86, wx = kd.x0 + 0.005;
      const bowlM = M.artBowl || (M.artBowl = new THREE.MeshStandardMaterial({ color: 0x6b6b3a, roughness: 0.5 }));
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.11, 0.035], [0.13, 0.085], [0.122, 0.088], [0.1, 0.045], [0.05, 0.02], [0, 0.02]].map(([a, b]) => new THREE.Vector2(a, b)), 32), bowlM);
      bowl.position.copy(L(wx + 0.27, ks - 0.2, top)); bowl.castShadow = true; G.furniture.add(bowl);
    }
    // 6. front bedroom, the hall wall you see from the bed: a calm pair, 800 x 1000 each, 100 apart, centred on the
    //    bed's line, centre 1.50, hung flush on the wall from two D-rings each on plugged screws in the brick (client
    //    2026-10-21: no chains or cords from the picture rail in this room)
    const fb = rm('Front bedroom'), byc = frontBedY(spec), fx = fb.x0;
    [-0.45, 0.45].forEach((dy, i) => {
      const yc = byc + dy;
      hangArt(int_, 'x', fx, 1, yc, fb.floor + 1.5, 0.8, 1.0, artTex(14 + i, 'calm', 0.75 / 0.95), { depth: 0.035 });
    });
    // 8. bedroom 2, over the bed on the north (internal) wall: 1100 x 800 calm landscape, bottom 150 over the bedhead
    if (spec.renovation.bed2) { const b2 = rm('Bedroom 2'); hangArt(int_, 'y', b2.y0, 1, (b2.x0 + b2.x1) / 2 + 0.05, b2.floor + 1.75, 1.1, 0.8, artTex(16, 'calm', 1.05 / 0.75), { depth: 0.035 }); }
    // 9. bedroom 3 (study): a 900 x 600 woven hanging on an oak dowel over the hall-wall desk, 150 above the monitor;
    //    the wall faces the west window, so a textile, not a work on paper
    {
      const b3 = rm('Bedroom 3'), yc = (spec.renovation.bedroom3.door_y1 + 0.1 + 14.29) / 2, z0 = b3.floor + (spec.renovation.study ? 1.35 : 1.2);
      wallFace(int_, 'x', b3.x0 + 0.012, 1, yc, z0 + 0.3, 0.9, 0.6, new THREE.MeshStandardMaterial({ map: artTex(17, 'textile', 0.9 / 0.6), roughness: 0.95 }));
      box(int_, b3.x0 + 0.005, b3.x0 + 0.03, yc - 0.5, yc + 0.5, z0 + 0.6, z0 + 0.625, artOak());
    }
    // 12. WC: a 400 x 500 graphic print, matted and glazed, on the west wall you face from the seat (the cabinet is over
    //     the cistern), centre 1.45
    { const wc = rm('WC'); hangArt(int_, 'x', wc.x1, -1, (wc.y0 + wc.y1) / 2, wc.floor + 1.45, 0.4, 0.5, artTex(18, 'print', 0.25 / 0.3), { depth: 0.025, frame: 0.02, mat: 0.055 }); }
  }
  // --- styling: plants, branches and surface objects (spec.renovation.decor 'styled'; DECOR-STYLING.md Part D) ---
  // One hero plant per room where the light allows it (none in the windowless hall), groups of three heights on a base,
  // about a third of each surface clear, the art's ochre / terracotta / olive thread as the accent, bronze as the second metal.
  if (spec.renovation.decor === 'styled') {
    const fu = G.furniture, rm = n => spec.rooms.find(r => r.name === n);
    // (the lounge kentia and the two front bedrooms' floor plants came out, client 2026-10-21; kentia(), strelitzia()
    // and snakePlant() stay available)
    // study: a pothos at the south-front corner of the hall-wall desk, trailing over its front edge
    if (spec.renovation.study) { const b3 = rm('Bedroom 3'), yc = (spec.renovation.bedroom3.door_y1 + 0.1 + 14.29) / 2; plantModel(fu, 'rhyzome', b3.x0 + 0.5, yc + 0.52, b3.floor + 0.73, 0.4, 0.6, null, 0.3); }   // a small leafy houseplant on the desk corner
    // (the potted olive in the courtyard came out, client 2026-10-21)
    // kitchen (walnut L): bench ~90% clear. A stoneware crock of wooden spoons and an oak board leaned in the corner west
    // of the cooktop; a bowl of lemons from the courtyard tree on the west return, clear of the sink
    const K = spec.renovation.kitchen;
    if (K && K.walnut && !K.u) {
      const bz = 0.9, oak = artOak();
      vessel(fu, 4.2, 15.3, bz, [[0, 0], [0.06, 0], [0.066, 0.15], [0.058, 0.155], [0.056, 0.02], [0, 0.02]], decMat('crock', 0xd9cbb4, { roughness: 0.85 }));
      [[0.15, 0.1], [-0.12, 0.6], [0.05, 2.2]].forEach(([tilt, spin]) => {
        const sp = new THREE.Group(); sp.position.copy(L(4.2, 15.3, bz + 0.02)); sp.rotation.set(0, spin, tilt); fu.add(sp);
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6), oak); h.position.y = 0.15; sp.add(h);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 6), oak); head.scale.set(1, 1.4, 0.35); head.position.y = 0.31; sp.add(head);
      });
      const bd = new THREE.Group(); bd.position.copy(L(4.45, 15.06, bz)); bd.rotation.x = -0.12; fu.add(bd);
      const bg = new THREE.BoxGeometry(0.3, 0.42, 0.02); bg.translate(0, 0.21, 0.01); const board = new THREE.Mesh(bg, decMat('boardOak', 0xb58e62, { roughness: 0.65 })); board.castShadow = true; bd.add(board);
      vessel(fu, 4.39, 16.5, bz, [[0, 0], [0.06, 0], [0.13, 0.06], [0.14, 0.075], [0.132, 0.077], [0.12, 0.06], [0.05, 0.012], [0, 0.012]], decMat('bowlOat', 0xe3d8c5, { roughness: 0.6 }));
      const lemon = decMat('lemon', 0xf2d23a, { roughness: 0.6 });
      [[0, 0, 0], [0.06, 0.03, 0], [-0.05, 0.04, 0], [0.01, -0.06, 0], [0.02, 0.01, 0.05]].forEach(([dx, dy, dz]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), lemon); l.scale.set(1, 0.85, 1.2); l.position.copy(L(4.39 + dx, 16.5 + dy, bz + 0.045 + dz)); l.castShadow = true; fu.add(l); });
    }
    // buffet (sideboard, 1600 x 435, top 860): one group just north of centre (an oak-framed photo leaning on the wall,
    // a small leafy houseplant set back against the wall beside it, two books in front of the plant), the middle-south
    // clear under the hero's corner, and keys in the olive bowl at the south end (client 2026-10-21: no empty gap)
    if (spec.renovation.sideboard) {
      const sy0 = spec.kitchen_south_wall.y0 - 0.005 - 1.6, top = 0.86, wx = rm('Kitchen / dining').x0 + 0.005;
      const ph = new THREE.Group(); ph.position.copy(L(wx + 0.06, sy0 + 0.55, top)); ph.rotation.z = -0.12; fu.add(ph);
      box(ph, -0.02, 0, -0.1, 0.1, 0, 0.25, artOak());
      wallFace(ph, 'x', 0.001, 1, 0, 0.125, 0.16, 0.21, new THREE.MeshStandardMaterial({ map: artTex(21, 'calm', 0.16 / 0.21), roughness: 0.8 }));
      plantModel(fu, 'rhyzome', wx + 0.17, sy0 + 0.86, top, 0.45, 1.1, null, 0.32);
      bookStack(fu, wx + 0.29, sy0 + 1.06, top, 0.16, 0.22, [[0.03, 0xd6b98f], [0.025, 0x2c3a52]], 0.25);   // set back beside the plant, clear of the front edge
      if (spec.renovation.art === 'v2') {                                                      // keys in the olive bowl (centre wx + 0.27, ks - 0.2; floor 20 up)
        const kx = wx + 0.27, ky = spec.kitchen_south_wall.y0 - 0.2, kz = top + 0.024;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0018, 6, 20), artBrass()); ring.rotation.x = Math.PI / 2; ring.position.copy(L(kx, ky, kz)); fu.add(ring);
        for (const [a, mat] of [[0.4, decMat('keySteel', 0xb9b6ae, { roughness: 0.35, metalness: 0.6 })], [-0.5, artBrass()]]) {
          const key = new THREE.Group(); key.position.copy(L(kx, ky, kz - 0.0005)); key.rotation.y = a; fu.add(key);
          const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.003, 16), mat); bow.position.set(0.022, 0, 0); key.add(bow);
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.003, 0.007), mat); blade.position.set(0.048, 0, 0); key.add(blade);
        }
      }
    }
    // dining table: one low ochre-glazed bowl, under 30 cm, so you see across the table
    const Dn = spec.renovation.dining;
    if (Dn) vessel(fu, (Dn.x0 + Dn.x1) / 2, (Dn.y0 + Dn.y1) / 2, Dn.h, [[0, 0], [0.07, 0], [0.16, 0.055], [0.17, 0.07], [0.162, 0.072], [0.15, 0.055], [0.06, 0.012], [0, 0.012]], decMat('ochreGlaze', 0xc8923a, { roughness: 0.3 }));
    if (Dn) {                                                                                     // fruit in it: lemons, green pears, a couple of mandarins
      const cx = (Dn.x0 + Dn.x1) / 2, cy = (Dn.y0 + Dn.y1) / 2, z = Dn.h + 0.012;
      const fruit = (dx, dy, dz, r, mat, sx = 1, sy = 1, sz = 1) => { const f = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); f.scale.set(sx, sy, sz); f.position.copy(L(cx + dx, cy + dy, z + dz + r * sy)); f.castShadow = true; fu.add(f); return f; };
      const lemon = decMat('lemon', 0xf2d23a, { roughness: 0.6 }), pear = decMat('pear', 0x9fb04a, { roughness: 0.6 }), mand = decMat('mandarin', 0xe8862e, { roughness: 0.6 });
      fruit(0, 0, 0, 0.038, lemon, 1, 0.85, 1.25); fruit(0.075, 0.035, 0.008, 0.036, lemon, 1.2, 0.85, 1); fruit(-0.07, 0.04, 0.008, 0.034, mand, 1, 0.82, 1);
      fruit(0.02, -0.075, 0.008, 0.033, mand, 1, 0.82, 1); fruit(-0.05, -0.05, 0.01, 0.04, pear, 1, 1.25, 1); fruit(0.035, 0.0, 0.055, 0.036, lemon, 1.25, 0.85, 1);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 5), decMat('sprayStem', 0x6f6a55)); stalk.position.copy(L(cx - 0.05, cy - 0.05, z + 0.01 + 0.1 + 0.008)); fu.add(stalk);
    }
    // coffee table (matched, 850 round): two zones and the rest clear: design books with a small bronze bowl on top, and
    // a low stoneware vase with a few eucalyptus stems (all under 30 cm)
    const LF = spec.renovation.lounge_furniture, T = LF?.coffee_table;
    if (T && spec.renovation.coffee_table === 'matched') {
      const lf = rm('Lounge / living').floor, tz = lf + 0.4;
      const top = bookStack(fu, T.x - 0.1, T.y - 0.12, tz, 0.24, 0.3, [[0.035, 0x2c3a52], [0.03, 0xd6b98f]], 0.4);
      vessel(fu, T.x - 0.1, T.y - 0.12, top, [[0, 0], [0.03, 0], [0.06, 0.035], [0.062, 0.045], [0.055, 0.046], [0.05, 0.035], [0.02, 0.008], [0, 0.008]], decMat('bronze', 0x6e5235, { roughness: 0.45, metalness: 0.5 }));
      vessel(fu, T.x + 0.16, T.y + 0.13, tz, [[0, 0], [0.045, 0], [0.055, 0.06], [0.04, 0.11], [0.022, 0.13], [0.024, 0.14], [0, 0.14]], decMat('stoneCream', 0xe6dccb, { roughness: 0.85 }));
      sprays(fu, T.x + 0.16, T.y + 0.13, tz + 0.13, [[0.3, 0.25, 0.16], [2.4, 0.3, 0.14], [4.4, 0.15, 0.17]], 'euc');
    }
  }
  // --- renovated kitchen: white flat-panel joinery, stone top, tall units on the party wall (spec.renovation.kitchen) ---
  {
    const K = spec.renovation.kitchen, [rx0, rx1, ry0, ry1] = K.run, [qx0, qx1, qy0, qy1] = K.return || [0, 0, 0, 0];
    const white = M.kWhite || (M.kWhite = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.55 }));
    const stone = M.kStone || (M.kStone = new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.3 }));
    const tile = M.kTile || (M.kTile = new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.25 }));
    const bh = 0.9, top = 0.04, handle = M.grille, kick = M.trimDark, wCuts = [];
    if (K.u) {
      // ---- Second-hand gloss U, as it stands (no recutting) ----
      // North (cooktop leg), hall end to west wall: 260 new filler | 750 tall unit (2 drawers, 2 doors) | the 2270 cooktop
      // leg: 470 drawers | 900 oven under the 900 gas cooktop | 900 corner (322 door, blind behind the sink leg).
      // West (sink leg), north wall to 3000: corner | 310 door | 750 sink pair (bowls centred 1370 off the north wall, as cut)
      // | 290 door | the peninsula's end. Peninsula 2950 x 1050 off the west wall, y 16.97-18.02: north face 600 dishwasher
      // then three drawer stacks; south face six doors on shallow cupboards, the corner end left open; a 20 stone waterfall
      // down its east end. East wall: the fridge recess (~1000, its 700 overhead) and the 1100 tall unit (3 drawers, 2 doors
      // hiding the appliance shelf). Bench 910, top 40 edge, kick 100; tall units and 700 wall cupboards top at 2230, the
      // seller's height; plasterboard bulkhead from there to the 2.8 ceiling.
      const gloss = M.ghGloss || (M.ghGloss = new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 0.1, metalness: 0.05 }));
      const liner = M.ikLiner || (M.ikLiner = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.5 }));
      const qz = M.ghQuartz || (M.ghQuartz = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.25, color: 0xe2e0dc }));   // grey quartz, paler veins
      const glassBlack = M.ikBlack || (M.ikBlack = new THREE.MeshStandardMaterial({ color: 0x131416, roughness: 0.15, metalness: 0.25 }));
      const kickM = M.ghKick || (M.ghKick = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.5, metalness: 0.4 }));
      const st = steelMat(), gap = 0.0015, Q = m => surfUV(m, MARBLE_TILE);
      const kz = 0.1, bz = 0.91, tz = 0.04, cz = bz - tz, cd = 0.56, dt = 0.018, tall = 2.23, [uz0, uz1] = K.uppers_z, ud = K.uppers_depth, ceil = 2.8;
      const wy = K.run[2], wx = K.run[1], ex = 0.115;                                                          // north wall, west wall, east wall
      const py0 = 16.97, py1 = 18.02, px0 = wx - 2.95;                                                       // peninsula
      // fronts: a gloss slab with 3 mm gaps, standing proud of its carcass on the given face
      const fN = (x0, x1, z0, z1, y = wy + cd) => box(int_, x0 + gap, x1 - gap, y, y + dt, z0 + gap, z1 - gap, gloss);      // facing south, off the north wall
      const fW = (y0, y1, z0, z1, x = wx - cd) => box(int_, x - dt, x, y0 + gap, y1 - gap, z0 + gap, z1 - gap, gloss);      // facing east, off the west wall
      const fE = (y0, y1, z0, z1, x = ex + cd) => box(int_, x, x + dt, y0 + gap, y1 - gap, z0 + gap, z1 - gap, gloss);      // facing west, off the east wall
      const fPn = (x0, x1, z0, z1) => box(int_, x0 + gap, x1 - gap, py0 + 0.02, py0 + 0.02 + dt, z0 + gap, z1 - gap, gloss);   // peninsula, kitchen side
      const fPs = (x0, x1, z0, z1) => box(int_, x0 + gap, x1 - gap, py1 - 0.02 - dt, py1 - 0.02, z0 + gap, z1 - gap, gloss);   // peninsula, dining side
      const drawers = (f, a0, a1) => { for (const [z0, z1] of [[kz, 0.37], [0.37, 0.64], [0.64, cz]]) f(a0, a1, z0, z1); };
      // ---- north: filler, tall unit, cooktop leg ----
      const n0 = K.run[0], nT = n0 + 0.26, nC = nT + 0.75, nD = nC + 0.47, nO = nD + 0.9, nF = wx - cd - dt;   // nF: the sink leg's front plane
      box(int_, n0, nT, wy, wy + cd + dt, 0, tall, gloss);                                                   // 260 filler (new board)
      box(int_, nT, nC, wy, wy + cd, kz, tall, liner); box(int_, nT, nC, wy + 0.04, wy + cd - 0.05, 0, kz, kickM);
      fN(nT, nC, kz, 0.48); fN(nT, nC, 0.48, 0.86);
      fN(nT, (nT + nC) / 2, 0.86, tall); fN((nT + nC) / 2, nC, 0.86, tall);
      box(int_, nC, wx, wy, wy + cd, kz, cz, liner); box(int_, nC, nF, wy + 0.04, wy + cd - 0.05, 0, kz, kickM);
      drawers(fN, nC, nD);
      { // Fisher & Paykel 900 built-in oven: black glass door, steel bar handle and kick strip, control panel down the right
        const oz0 = kz + 0.12, oz1 = cz - 0.08, y = wy + cd;
        fN(nD, nO, kz, oz0); fN(nD, nO, oz1, cz);
        box(int_, nD + gap, nO - 0.17, y, y + 0.022, oz0 + 0.06, oz1, glassBlack); box(int_, nD + gap, nO - 0.17, y, y + 0.022, oz0, oz0 + 0.06, st);
        box(int_, nO - 0.17, nO - gap, y, y + 0.022, oz0, oz1, glassBlack);
        box(int_, nD + 0.04, nO - 0.21, y + 0.035, y + 0.05, oz1 - 0.08, oz1 - 0.06, st);
        for (const hx of [nD + 0.06, nO - 0.23]) box(int_, hx - 0.008, hx + 0.008, y + 0.022, y + 0.035, oz1 - 0.08, oz1 - 0.06, st);
        for (const kzz of [oz0 + 0.12, oz0 + 0.24]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 20), st); k.rotation.x = Math.PI / 2; k.position.copy(L(nO - 0.085, y + 0.034, kzz)); int_.add(k); }
      }
      fN(nO, nF, kz, cz);                                                                                     // corner door
      // ---- west: sink leg ----
      const s0 = wy + 0.6, s1 = s0 + 0.31, s2 = s1 + 0.75, [cy0, cy1] = K.sink_y, cut = [wx - 0.5, wx - 0.1, cy0, cy1];
      box(int_, wx - cd, wx, s0, py0, kz, cz - 0.25, liner);
      box(int_, wx - cd + 0.04, wx - 0.04, s0, py0 + 0.02, 0, kz, kickM);
      fW(s0, s1, kz, cz); fW(s1, (s1 + s2) / 2, kz, cz); fW((s1 + s2) / 2, s2, kz, cz); fW(s2, py0 + 0.02, kz, cz);
      // ---- peninsula: dishwasher and drawers to the kitchen, shallow cupboards to the dining side, waterfall end ----
      const pE = px0 + 0.02, pD = nF - 0.6;
      box(int_, pE, nF, py0 + 0.038, py0 + 0.6, kz, cz, liner); box(int_, pE, nF - 0.02, py0 + 0.6, py1 - 0.038, kz, cz, liner);
      box(int_, pE, nF, py0 + 0.08, py1 - 0.08, 0, kz, kickM);
      fPn(pD, nF, kz, cz); box(int_, pD + 0.02, nF - 0.02, py0 + 0.018, py0 + 0.02, cz - 0.07, cz - 0.03, st);   // dishwasher panel, its control strip on top
      const dw = (pD - pE) / 3; for (let i = 0; i < 3; i++) drawers(fPn, pE + i * dw, pE + (i + 1) * dw);
      const cw = (nF - 0.02 - pE) / 6; for (let i = 0; i < 6; i++) fPs(pE + i * cw, pE + (i + 1) * cw, kz, cz);
      box(int_, nF - 0.02, nF, py0 + 0.6, py1, 0, cz, qz);                                                  // stone panel closing the open corner end
      // ---- stone: tops (40 edge), waterfall, splashbacks ----
      Q(box(int_, nT + 0.75, wx - 0.6, wy, wy + 0.6, cz, bz, qz));                                            // cooktop leg (its corner runs under the sink leg's top)
      benchWithCut(int_, wx - 0.6, wx, wy, py0, cz, bz, qz, cut, Q);                                          // sink leg
      Q(box(int_, px0, wx, py0, py1, cz, bz, qz));                                                            // peninsula
      Q(box(int_, px0, px0 + 0.02, py0, py1, 0, cz, qz));                                                     // waterfall
      realSink(int_, ...cut, bz, 2, 'y', { x: wx - 0.065, y: (cy0 + cy1) / 2, face: '-x' });
      gasCooktop(int_, nD + 0.02, nO - 0.02, wy + 0.05, wy + 0.55, bz);
      const sp = 0.015, ws = Win.W3_kitchen;
      Q(box(int_, nC, wx, wy, wy + sp, bz, uz0, qz));
      for (const [a, b, z0, z1] of [[wy + sp, ws.y0, bz, uz0], [ws.y0, Math.min(ws.y1, py1), bz, ws.sill]]) if (b - a > 0.005) Q(box(int_, wx - sp, wx, a, b, z0, z1, qz));
      // ---- wall cupboards, 700 high: four 445 doors on the north wall (the middle pair over the cooktop, with the
      // slide-out hood under them), a 485 and a 445 on the west wall north of the window; fillers to suit ----
      const n1 = nC + 0.03;
      box(int_, nC, wx - ud, wy, wy + ud, uz0, uz1, liner); box(int_, wx - ud, wx, wy, ws.y0, uz0, uz1, liner);
      for (let i = 0; i < 4; i++) fN(n1 + i * 0.445, n1 + (i + 1) * 0.445, uz0, uz1, wy + ud);
      fN(nC, n1, uz0, uz1, wy + ud); fN(n1 + 1.78, wx - ud, uz0, uz1, wy + ud);
      const w1 = wy + ud + dt; fW(w1, w1 + 0.485, uz0, uz1, wx - ud); fW(w1 + 0.485, w1 + 0.93, uz0, uz1, wx - ud); fW(w1 + 0.93, ws.y0, uz0, uz1, wx - ud);
      { const h0 = n1 + 0.445, h1 = h0 + 0.89;                                                               // slide-out hood
        box(int_, h0 + 0.01, h1 - 0.01, wy + 0.03, wy + ud + dt, uz0 - 0.05, uz0, st); box(int_, h0 + 0.04, h1 - 0.04, wy + 0.05, wy + ud - 0.03, uz0 - 0.052, uz0 - 0.05, M.frameA); }
      // ---- east wall: fridge recess (stand-in French-door fridge) with its overhead, then the 1100 tall unit ----
      const e0 = 16.15, e1 = e0 + 1.0, e2 = e1 + 1.1;
      box(int_, ex, ex + cd + dt, e0, e0 + 0.018, 0, tall, gloss); box(int_, ex, ex + cd + dt, e1 - 0.018, e1, 0, tall, gloss);
      box(int_, ex, ex + cd, e0 + 0.018, e1 - 0.018, uz0, tall, liner); fE(e0 + 0.018, (e0 + e1) / 2, uz0, tall); fE((e0 + e1) / 2, e1 - 0.018, uz0, tall);
      box(int_, ex + 0.05, ex + 0.7, e0 + 0.06, e1 - 0.06, 0.02, 1.8, st); box(int_, ex + 0.7, ex + 0.712, (e0 + e1) / 2 - 0.002, (e0 + e1) / 2 + 0.002, 0.76, 1.78, M.frameA);
      box(int_, ex, ex + cd, e1, e2, kz, tall, liner); box(int_, ex + 0.04, ex + cd - 0.05, e1, e2, 0, kz, kickM);
      drawers(fE, e1, e2); fE(e1, (e1 + e2) / 2, cz, tall); fE((e1 + e2) / 2, e2, cz, tall);
      // ---- plasterboard bulkheads from the 2230 tops to the ceiling, flush with the fronts ----
      box(int_, n0, nC, wy, wy + cd + dt, tall, ceil, M.ceiling); box(int_, nC, wx, wy, wy + ud + dt, uz1, ceil, M.ceiling);
      box(int_, wx - ud - dt, wx, wy + ud + dt, ws.y0, uz1, ceil, M.ceiling); box(int_, ex, ex + cd + dt, e0, e2, tall, ceil, M.ceiling);
    } else
    if (K.std) {
      // ---- Standard L: stock carcasses only (widths 300/450/600/800/900), fillers for the leftover ----
      // North wall, hall end to west wall, 3280: end panel 18 | fridge housing 600 | pantry 450 | filler 84 | drawers 450 |
      // oven + gas cooktop 600 | blind corner 900 (450 door), stood 178 off the west wall as a blind corner is.
      // West return, corner to 200 short of the lounge opening's line: filler 50 | drawers 450 | drawers 900 | sink 800
      // (under the window, 30 off its centre) | dishwasher 600 | end panel 18.
      // Kick 150, carcass 720 x 560, 18 doors, 33 top 600 deep: bench 903. Wall cabinets 900 high x 330 deep, 600 over the
      // bench (1503-2403), except a 720 over the cooktop so the slide-out hood is 780 over the bench (gas clearance).
      // Tall units a stock 2250 carcass on the 150 kick (2400), 3 under the wall cabinets' tops. The west wall cupboards
      // start clear of the north run (the corner left as a closed dead box). A plasterboard bulkhead fills from the
      // cupboard tops to the 2.8 ceiling. K.white: white fronts and a marble-look stone top instead of walnut and laminate.
      // Every door and drawer opens (E / the door button in Walk): hollow white carcasses with things in them; doors swing
      // from the hinge side that keeps them clear of their neighbours, drawers slide out 450, the oven and dishwasher drop.
      const wy0 = K.run[2], wx = K.run[1], cd = 0.56, dt = 0.018, kz = 0.15, cz = 0.87, bz = 0.903, [uz0, uz1] = K.uppers_z, ud = K.uppers_depth;
      const WH = K.white, tz1 = K.oak ? 2.8 : K.gl ? 2.23 : K.sh ? 2.55 : 2.4, ct = 0.016;                                                      // tall units' top, carcass board
      // 'walnut' is the front finish: walnut veneer, or white matt for the white kitchen
      const walnut = K.gl ? (M.ghGloss || (M.ghGloss = new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 0.1, metalness: 0.05 })))   // gloss white
        : WH ? (M.stdWhite || (M.stdWhite = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.6 })))
        : (M.wnWalnut || (M.wnWalnut = new THREE.MeshStandardMaterial({ map: walnutTexture(), roughness: 0.42, color: new THREE.Color(1.3, 1.3, 1.3) /* lifted to LRV ~15: lacquered American walnut is 12-20, the texture alone ~11 */ })));
      const channel = K.oak ? (M.oakCh || (M.oakCh = new THREE.MeshStandardMaterial({ color: 0xb9b6b0, roughness: 0.5, metalness: 0.2 })))   // the channel's satin aluminium lining, in shadow
        : WH ? (M.stdWhiteCh || (M.stdWhiteCh = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.6 })))   // the finger channel, white like the fronts
        : (M.wnChannel || (M.wnChannel = new THREE.MeshStandardMaterial({ color: 0x21150d, roughness: 0.85 })));
      const oak = M.oakVeneer || (M.oakVeneer = new THREE.MeshStandardMaterial({ map: oakTexture(), roughness: 0.6, color: 0xffffff }));
      const upper = K.oak ? oak : walnut;                                                              // wall cupboard fronts and fillers
      const laminate = K.oak ? (M.carrara || (M.carrara = new THREE.MeshStandardMaterial({ map: marbleTexture(false, false), roughness: 0.18, color: 0xffffff })))   // Carrara-type white marble
        : K.gl ? (M.ghQuartz || (M.ghQuartz = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.25, color: 0xe2e0dc })))   // its grey quartz
        : K.sh ? (M.qStone || (M.qStone = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.22 })))   // Quantum Stone, plain white
        : WH ? (M.stdMarble || (M.stdMarble = new THREE.MeshStandardMaterial({ map: marbleTexture(true), roughness: 0.2, color: 0xffffff })))
        : (M.stdLaminate || (M.stdLaminate = new THREE.MeshStandardMaterial({ map: limestoneTexture(), roughness: 0.55 })));
      const TT = WH ? MARBLE_TILE : LIME_TILE;
      const liner = M.ikLiner || (M.ikLiner = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.5 }));   // white melamine inside
      const glassBlack = M.ikBlack || (M.ikBlack = new THREE.MeshStandardMaterial({ color: 0x131416, roughness: 0.15, metalness: 0.25 }));
      const smoke = M.wnSmoke || (M.wnSmoke = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.3 }));
      const enamel = M.ovenEnamel || (M.ovenEnamel = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.45 }));
      const clear = M.ikClear || (M.ikClear = new THREE.MeshStandardMaterial({ color: 0xe8f0f2, roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false }));
      const led = M.ikLed || (M.ikLed = new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffe6b8, emissiveIntensity: 1.4 }));
      const tint = c => M['ikc' + c] || (M['ikc' + c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
      const st = steelMat(), g = 0.0015;
      const kickMat = WH ? (M.stdWhiteKick || (M.stdWhiteKick = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.7 }))) : M.trimDark;
      const ventMat = WH ? tint(0x9d9a93) : M.frameA;
      // both runs in one frame: 'N' along x off the north wall, 'W' along y off the west wall; a along the run, d depth from the wall
      const RB = (r, a0, a1, d0, d1) => r === 'N' ? [a0, a1, wy0 + d0, wy0 + d1] : [wx - d1, wx - d0, a0, a1];
      const B = (r, a0, a1, d0, d1, z0, z1, m) => box(int_, ...RB(r, a0, a1, d0, d1), z0, z1, m);
      const P = (r, a, d) => r === 'N' ? [a, wy0 + d] : [wx - d, a];
      const U = { N: [1, 0], W: [0, 1] }, OUT = { N: [0, 1], W: [-1, 0] };
      const scyl = (rad, h, m, [x, y], z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 20), m); c.position.copy(L(x, y, z + h / 2)); c.castShadow = c.receiveShadow = true; int_.add(c); return c; };
      // ---- operable pieces: an assembly (what the door button toggles) holding pivots; everything added to a pivot moves with it ----
      const asmNew = () => { const a = new THREE.Group(); a.userData.operable = true; a.userData.open = false; int_.add(a); return a; };
      const part = (asm, r, pa, pd, pz) => {
        const [px, py] = P(r, pa, pd), pv = new THREE.Group(); pv.position.copy(L(px, py, pz)); asm.add(pv);
        const add = (x0, x1, y0, y1, z0, z1, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0), m); b.position.copy(L((x0 + x1) / 2 - px, (y0 + y1) / 2 - py, (z0 + z1) / 2 - pz)); b.castShadow = b.receiveShadow = true; b.userData.door = true; pv.add(b); return b; };
        const AB = (rr, a0, a1, d0, d1, z0, z1, m) => add(...RB(rr, a0, a1, d0, d1), z0, z1, m);
        const cyl = (rad, h, m, a, d, z) => { const [x, y] = P(r, a, d), c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 20), m); c.position.copy(L(x - px, y - py, z + h / 2 - pz)); c.castShadow = true; c.userData.door = true; pv.add(c); return c; };
        return { AB, cyl, set(u) { pv.userData.closedPosition = pv.position.clone(); Object.assign(pv.userData, u); } };
      };
      // a front: the flat face with the finger channel along its top (or plain), into the static kitchen or onto a pivot
      const SB = (r, a0, a1, d0, d1, z0, z1, m) => B(r, a0, a1, d0, d1, z0, z1, m);
      const face = (T, r, a0, a1, z0, z1, d = cd, chan = true, m = walnut) => {
        if (K.sh && !K.oak) chan = false;                                                              // second-hand: handles off, push-to-open, plain fronts (the oak version keeps the base units' finger channel)
        const ch = chan ? 0.035 : g;
        T(r, a0 + g, a1 - g, d, d + dt, z0 + g, z1 - ch, m);
        if (chan) T(r, a0 + g, a1 - g, d, d + 0.004, z1 - ch, z1 - g, channel);
      };
      // hinged door, hinge on its a0 or a1 edge at the face, opening out just past square
      const door = (r, a0, a1, z0, z1, hinge, { d = cd, chan = true, asm = asmNew(), lining, m = walnut } = {}) => {
        const p = part(asm, r, hinge === 'a0' ? a0 : a1, d + dt, z0), dir = hinge === 'a0' ? 1 : -1, u = U[r], n = OUT[r];
        face(p.AB, r, a0, a1, z0, z1, d, chan, m);
        if (lining) lining(p);
        p.set({ swing: Math.sign(-u[1] * dir * n[0] + u[0] * dir * n[1]) * 0.55 * Math.PI });   // the free edge moves out into the room
        return asm;
      };
      // drop-down door (oven, dishwasher), hinged along its bottom edge at the face
      const dropDoor = (r, a0, a1, z0, z1, build) => {
        const asm = asmNew(), p = part(asm, r, a0, cd + dt, z0);
        build(p); p.set(r === 'N' ? { tilt: 0.5 * Math.PI, tiltAxis: 'x' } : { tilt: -0.5 * Math.PI, tiltAxis: 'z' });
        return asm;
      };
      // drawer: front plus a white box behind it on full-extension runners, slides out 450 with whatever is in it
      const drawer = (r, a0, a1, z0, z1, fill) => {
        const asm = asmNew(), p = part(asm, r, a0, cd, z0), s0 = a0 + 0.03, s1 = a1 - 0.03, d0 = 0.04, d1 = cd - 0.004, b0 = z0 + 0.02, b1 = Math.max(b0 + 0.06, z1 - 0.06), t = 0.012;
        face(p.AB, r, a0, a1, z0, z1);
        p.AB(r, s0, s1, d0, d1, b0, b0 + t, liner);
        p.AB(r, s0, s0 + t, d0, d1, b0, b1, liner); p.AB(r, s1 - t, s1, d0, d1, b0, b1, liner); p.AB(r, s0, s1, d0, d0 + t, b0, b1, liner);
        if (fill) fill(p, r, s0 + t, s1 - t, d0 + t, d1, b0 + t, b1);
        const n = OUT[r]; p.set({ slide: L(n[0] * 0.45, n[1] * 0.45, 0) });
        return asm;
      };
      // hollow carcass: two sides, bottom, back, and a top (or front and back rails under a sink); fixed shelves at zs
      const carc = (r, a0, a1, z0, z1, { d1 = cd, top = true, zs = [] } = {}) => {
        B(r, a0, a0 + ct, 0, d1, z0, z1, liner); B(r, a1 - ct, a1, 0, d1, z0, z1, liner);
        B(r, a0 + ct, a1 - ct, 0, d1, z0, z0 + ct, liner); B(r, a0 + ct, a1 - ct, 0, ct, z0 + ct, z1, liner);
        if (top) B(r, a0 + ct, a1 - ct, 0, d1, z1 - ct, z1, liner);
        else { B(r, a0 + ct, a1 - ct, d1 - 0.1, d1, z1 - ct, z1, liner); B(r, a0 + ct, a1 - ct, ct, 0.1, z1 - ct, z1, liner); }
        for (const z of zs) B(r, a0 + ct, a1 - ct, ct, d1 - 0.02, z, z + ct, liner);
      };
      // ---- what's in them ----
      const cutlery = (p, r, a0, a1, d0, d1, z0) => {                                                   // grey insert, dividers, knives and forks
        const tray = tint(0x8a8d90);
        p.AB(r, a0, a1, d0, d1, z0, z0 + 0.006, tray);
        const n = Math.max(3, Math.floor((a1 - a0) / 0.09)), w = (a1 - a0) / n;
        for (let i = 1; i < n; i++) p.AB(r, a0 + i * w - 0.002, a0 + i * w + 0.002, d0, d1, z0, z0 + 0.045, tray);
        for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const c = a0 + (i + 0.5) * w + (k - 1) * 0.014; p.AB(r, c - 0.004, c + 0.004, d0 + 0.08, d0 + 0.08 + (i % 2 ? 0.2 : 0.17), z0 + 0.006 + k * 0.004, z0 + 0.01 + k * 0.004, st); }
      };
      const tubs = (p, r, a0, a1, d0, d1, z0, z1) => {                                                  // food containers with coloured lids
        const h = Math.min(0.12, z1 - z0 - 0.02), cols = [0x6f9a3a, 0xc8452e, 0x2a6fb5, 0xd88a3a];
        for (let a = a0 + 0.02, i = 0; a + 0.16 < a1; a += 0.18, i++) for (const [e0, e1] of [[d0 + 0.03, d0 + 0.2], [d0 + 0.25, d0 + 0.42]]) {
          p.AB(r, a, a + 0.15, e0, e1, z0, z0 + h - 0.015, clear); p.AB(r, a, a + 0.15, e0, e1, z0 + h - 0.015, z0 + h, tint(cols[(i + (e0 > d0 + 0.1 ? 1 : 0)) % 4]));
        }
      };
      const pots = (p, r, a0, a1, d0, d1, z0, z1) => {                                                  // saucepans and a frying pan, nested
        const h = Math.min(0.16, z1 - z0 - 0.02);
        for (let a = a0 + 0.12, i = 0; a + 0.1 < a1; a += 0.24, i++) { p.cyl(0.1, h, st, a, (d0 + d1) / 2 - 0.08, z0); p.cyl(0.085, 0.01, st, a, (d0 + d1) / 2 - 0.08, z0 + h); p.cyl(0.11, 0.05, enamel, a, (d0 + d1) / 2 + 0.15, z0); }
      };
      const plates = (r, a0, a1, z, d = 0.17) => { for (let a = a0 + 0.14; a + 0.12 < a1; a += 0.27) { scyl(0.12, 0.08, tint(0xf6f4ee), P(r, a, d), z); } };   // stacks of plates
      const glasses = (r, a0, a1, z, d = 0.12) => { for (let a = a0 + 0.06; a + 0.05 < a1; a += 0.09) { scyl(0.035, 0.12, clear, P(r, a, d), z); scyl(0.035, 0.12, clear, P(r, a, d + 0.1), z); } };
      const jars = (r, a0, a1, z, d = 0.2) => {
        const fills = [0xd9a066, 0xa8472f, 0xe8e2d4, 0x8f5a36, 0xc98b4a, 0xb33a3a, 0xf0ead8];
        for (let a = a0 + 0.07, i = 0; a + 0.06 < a1; a += 0.13, i++) { const h = 0.16 + (i % 3) * 0.03; scyl(0.055, h, clear, P(r, a, d), z); scyl(0.049, h * 0.85, tint(fills[i % 7]), P(r, a, d), z + 0.004); scyl(0.057, 0.02, tint(0xc9a877), P(r, a, d), z + h); }
      };
      const tins = (r, a0, a1, z, d = 0.4) => { const c = [0xb5422e, 0x2f6b3a, 0xe0c060, 0x3a5a9a]; for (let a = a0 + 0.05, i = 0; a + 0.04 < a1; a += 0.085, i++) scyl(0.037, 0.11, tint(c[i % 4]), P(r, a, d), z); };
      const lay = (start, mods, total) => {                                                         // widths in mm so the sums are exact
        if (mods.reduce((a, [, w]) => a + w, 0) !== total) console.warn('standard kitchen modules do not add up', mods);
        const at = {}; let p = start; for (const [k, w] of mods) { at[k] = [p, p + w / 1000]; p += w / 1000; } return at;
      };
      // K.sh, the second-hand white kitchen (Marketplace, Seaford, 2014, white melamine, Quantum Stone) re-planned into this L:
      // North: end panel 18 | fridge cavity 905 with its 730 overhead | half the 1340 tall bank, 670 | its 450 drawers (keep
      // the burners clear of the tall side) | a standard 600 oven under a gas cooktop (not their Smeg) | 59 filler to the return's
      // fronts, so the oven door drops clear of them; the corner dead behind. West: filler 22 | its 998 drawers | the peninsula's
      // 390 drawers, 790 double-sink cupboard and 600 dishwasher | end panel 18. Bench assumed lowered from its 995 to 903.
      // K.gl, the second-hand gloss U (Oct 2026) re-planned into this L. North: end panel 18 | its fridge recess cut to 977
      // with a 450 overhead | its 470 drawers | its 900 oven under its 900 gas cooktop | 337 corner front (its 322 corner
      // door + 15 filler) | dead corner. The recess is sized so its cooktop leg (2270-2285 tall side to wall, tape) drops in
      // whole: its top and cooktop cutout reused uncut. West: filler 22 | two of the peninsula's drawer stacks, trimmed to 569 | its 290 door |
      // its 750 sink pair (bowls 55 off the window's centre) | its 600 dishwasher | end panel 18. Its 750 and 1100 tall units
      // and the peninsula's six cupboards are left over. Wall cupboards 700, tops at 2230 with its tall units.
      const N = K.gl ? lay(K.run[0], [['panel', 18], ['fridge', 977], ['drawers', 470], ['oven', 900], ['fill', 337], ['void', 578]], 3280)
        : K.sh ? lay(K.run[0], [['panel', 18], ['fridge', 905], ['tall', 670], ['drawers', 450], ['oven', 600], ['fill', 59], ['void', 578]], 3280)
        : lay(K.run[0], [['panel', 18], ['fridge', 600], ['pantry', 450], ['fill', 84], ['drawers', 450], ['oven', 600], ['corner', 900], ['void', 178]], 3280);
      const R = K.gl ? lay(K.return[2], [['fill', 22], ['d569a', 569], ['d569b', 569], ['door', 290], ['sink', 750], ['dw', 600], ['panel', 18]], 2818)
        : K.sh ? lay(K.return[2], [['fill', 22], ['d998', 998], ['d390', 390], ['sink', 790], ['dw', 600], ['panel', 18]], 2818)
        : lay(K.return[2], [['fill', 50], ['d450', 450], ['d900', 900], ['sink', 800], ['dw', 600], ['panel', 18]], 2818);
      const sinkCut = [wx - 0.5, wx - 0.1, R.sink[0] + 0.06, R.sink[1] - 0.06];
      // three drawers, 300 / 270 / 150 fronts: cutlery on top, tubs in the middle, pots at the bottom
      const drawers3 = (r, a0, a1) => { carc(r, a0, a1, kz, cz); drawer(r, a0, a1, kz, 0.45, pots); drawer(r, a0, a1, 0.45, 0.72, tubs); drawer(r, a0, a1, 0.72, cz, cutlery); };
      const oven600 = () => { // oven: a hollow enamel cavity with two racks, a drop-down black glass door, the control strip fixed above it, a
        // shallow drawer of baking trays under it
        const [a0, a1] = N.oven, oz = 0.27, dz = 0.8;
        carc('N', a0, a1, kz, cz);
        B('N', a0 + ct, a1 - ct, 0.04, cd, oz, oz + 0.012, enamel); B('N', a0 + ct, a1 - ct, 0.04, cd, dz - 0.012, dz, enamel);
        B('N', a0 + ct, a0 + ct + 0.012, 0.04, cd, oz, dz, enamel); B('N', a1 - ct - 0.012, a1 - ct, 0.04, cd, oz, dz, enamel); B('N', a0 + ct, a1 - ct, 0.04, 0.052, oz, dz, enamel);
        for (const z of [0.42, 0.58]) for (let i = 0; i < 7; i++) { const a = a0 + 0.06 + i * 0.08; B('N', a, a + 0.004, 0.06, cd - 0.03, z, z + 0.004, st); }
        dropDoor('N', a0, a1, oz, dz, p => {
          p.AB('N', a0 + g, a1 - g, cd, cd + 0.02, oz + g, dz - g, glassBlack);
          p.AB('N', a0 + 0.06, a1 - 0.06, cd + 0.02, cd + 0.024, oz + 0.06, oz + 0.38, smoke);
          p.AB('N', a0 + 0.06, a1 - 0.06, cd + 0.035, cd + 0.05, oz + 0.43, oz + 0.45, M.metal);
          for (const ha of [a0 + 0.08, a1 - 0.08]) p.AB('N', ha - 0.008, ha + 0.008, cd + 0.02, cd + 0.035, oz + 0.43, oz + 0.45, M.metal);
        });
        B('N', a0 + g, a1 - g, cd, cd + 0.02, dz + g, cz - g, glassBlack);                                   // control strip
        B('N', a0 + 0.2, a1 - 0.2, cd + 0.02, cd + 0.023, dz + 0.015, dz + 0.055, M.frameA);                 // display
        drawer('N', a0, a1, kz, oz, (p, r, b0, b1, e0, e1, z) => { p.AB(r, b0 + 0.02, b1 - 0.02, e0 + 0.02, e1 - 0.02, z, z + 0.01, enamel); p.AB(r, b0 + 0.04, b1 - 0.04, e0 + 0.04, e1 - 0.04, z + 0.01, z + 0.02, st); });
      };
      if (K.sh) {
        // ---- end panel, fridge cavity (fridge not included: a stainless French-door stands in) and its two-door overhead ----
        B('N', ...N.panel, 0, cd + dt, 0, tz1, walnut);
        { const [a0, a1] = N.fridge, oz = K.oak ? 1.78 : tz1 - (K.gl ? 0.45 : 0.73), fh = Math.min(1.79, oz - 0.01), f0 = a0 + 0.015, f1 = a1 - 0.015, fm = (f0 + f1) / 2, fd = 0.68;
          carc('N', a0, a1, oz, tz1, { d1: cd, zs: K.oak ? [oz + 0.5] : K.gl ? [] : [oz + 0.36] });
          const pair = asmNew(); door('N', a0, (a0 + a1) / 2, oz, tz1, 'a0', { asm: pair, m: upper, chan: !K.oak }); door('N', (a0 + a1) / 2, a1, oz, tz1, 'a1', { asm: pair, m: upper, chan: !K.oak });
          B('N', f0, f1, 0.04, fd - 0.02, 0.02, fh, st);                                                     // cabinet
          B('N', f0, fm - 0.002, fd - 0.02, fd, 0.78, fh, st); B('N', fm + 0.002, f1, fd - 0.02, fd, 0.78, fh, st);   // French doors
          B('N', f0, f1, fd - 0.02, fd, 0.04, 0.765, st);                                                      // freezer drawer
          for (const x of [fm - 0.03, fm + 0.025]) B('N', x, x + 0.012, fd, fd + 0.03, 0.95, 1.45, M.metal);
          B('N', f0 + 0.08, f1 - 0.08, fd, fd + 0.03, 0.68, 0.695, M.metal);
          B('N', f0 + 0.02, f1 - 0.02, 0.06, fd - 0.04, 0, 0.02, M.frameA); }
        if (N.tall) { // ---- tall bank, 670: two doors wide, low doors to just over the bench line and tall ones above, shelves of jars ----
          const [a0, a1] = N.tall, m = (a0 + a1) / 2, sz = 0.95;
          carc('N', a0, a1, kz, tz1, { zs: [0.55, sz, 1.3, 1.65, 2.0, 2.3] });
          for (const z of [sz, 1.3, 1.65, 2.0]) { jars('N', a0 + ct, a1 - ct, z + ct, 0.18); tins('N', a0 + ct, a1 - ct, z + ct, 0.42); }
          const lo = asmNew(); door('N', a0, m, kz, sz, 'a0', { asm: lo }); door('N', m, a1, kz, sz, 'a1', { asm: lo });
          const hi = asmNew(); door('N', a0, m, sz, tz1, 'a0', { asm: hi }); door('N', m, a1, sz, tz1, 'a1', { asm: hi });
        }
      drawers3('N', ...N.drawers); oven600();
        face(SB, 'N', ...N.fill, kz, cz, cd, false);                                                     // 59 filler to the return's fronts
      } else {
      // ---- north base ----
      drawers3('N', ...N.drawers);
      { // blind corner 900: 450 door hinged on its hall side so it swings clear of the return; a shelf of bowls and trays,
        // the blind end reaching in under the return
        const [a0, a1] = N.corner, dEnd = a0 + 0.45, fEnd = wx - cd - dt;
        carc('N', a0, a1, kz, cz, { zs: [0.5] });
        scyl(0.13, 0.1, tint(0xe8e2d4), P('N', a0 + 0.2, 0.3), 0.5 + ct); scyl(0.11, 0.08, tint(0xc9d4d8), P('N', a0 + 0.2, 0.3), 0.6 + ct);
        B('N', a0 + 0.05, a0 + 0.4, 0.05, 0.45, kz + ct, kz + ct + 0.03, st); B('N', a0 + 0.55, a1 - 0.05, 0.05, 0.5, kz + ct, kz + ct + 0.25, tint(0x8a8d90));   // trays; a box in the blind end
        door('N', a0, dEnd, kz, cz, 'a0');
        face(SB, 'N', dEnd, fEnd, kz, cz, cd, false);                                                     // corner filler to the return's face
      }
      face(SB, 'N', ...N.fill, kz, cz, cd, false);                                                       // 84 filler between the pantry and the drawers
      // ---- tall units at the hall end: end panel, fridge housing, pantry; 2400 ----
      B('N', ...N.panel, 0, cd + dt, 0, tz1, walnut);
      const nz0 = kz + ct, nz1 = nz0 + 1.78, tz = nz1 + 0.009;                                         // fridge niche 560 x 1780 x 550; door line
      { // fridge housing: the integrated fridge's white liner, glass shelves, crispers, a light and food; its door carries
        // the cabinet panel and opens from the end panel side, the cupboard over it the same way
        const [a0, a1] = N.fridge, i0 = a0 + ct + 0.02, i1 = a1 - ct - 0.02, back = 0.04, front_ = cd - 0.06;
        carc('N', a0, a1, kz, tz1, { zs: [nz1] });
        B('N', i0, i1, back - 0.01, back, nz0 + 0.03, nz1 - 0.03, liner);                                          // the fridge's liner
        B('N', i0 - 0.01, i0, back, front_, nz0 + 0.03, nz1 - 0.03, liner); B('N', i1, i1 + 0.01, back, front_, nz0 + 0.03, nz1 - 0.03, liner);
        B('N', i0, i1, back, front_, nz0 + 0.03, nz0 + 0.05, liner); B('N', i0, i1, back, front_, nz1 - 0.05, nz1 - 0.03, liner);
        for (const z of [0.6, 0.95, 1.3, 1.62]) B('N', i0, i1, back, front_ - 0.03, z - 0.006, z, clear);
        for (const [c0, c1, col] of [[i0, (i0 + i1) / 2 - 0.005, 0x6f9a3a], [(i0 + i1) / 2 + 0.005, i1, 0xc8452e]]) { B('N', c0, c1, back + 0.01, front_ - 0.03, nz0 + 0.06, 0.55, clear); B('N', c0 + 0.03, c1 - 0.03, back + 0.05, front_ - 0.08, nz0 + 0.07, 0.36, tint(col)); }
        const light = M.ikFridgeLight || (M.ikFridgeLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 1.2 }));
        B('N', i0 + 0.1, i1 - 0.1, back + 0.05, back + 0.25, nz1 - 0.065, nz1 - 0.05, light);
        B('N', i0 + 0.04, i0 + 0.13, back + 0.06, back + 0.15, 0.6, 0.84, tint(0xf5f5f2)); B('N', i0 + 0.04, i0 + 0.13, back + 0.06, back + 0.15, 0.84, 0.86, tint(0x2a6fb5));   // milk
        scyl(0.045, 0.07, tint(0xf2eee4), P('N', i0 + 0.25, back + 0.15), 0.6); scyl(0.045, 0.07, tint(0xe8c8d8), P('N', i0 + 0.36, back + 0.15), 0.6);   // yoghurt
        B('N', i0 + 0.05, i0 + 0.3, back + 0.04, back + 0.26, 0.95, 1.04, clear); B('N', i0 + 0.06, i0 + 0.29, back + 0.05, back + 0.25, 0.95, 1.01, tint(0xd88a3a));   // leftovers
        scyl(0.1, 0.07, tint(0xf4f2ec), P('N', i0 + 0.38, back + 0.2), 1.3); scyl(0.085, 0.04, tint(0x7a9a3a), P('N', i0 + 0.38, back + 0.2), 1.345);
        scyl(0.035, 0.26, tint(0x4a7a3a), P('N', i0 + 0.1, back + 0.12), 1.62); scyl(0.05, 0.12, tint(0xf0d060), P('N', i0 + 0.3, back + 0.18), 1.62);
        door('N', a0, a1, kz, tz, 'a0', { lining: p => {                                                   // the fridge door's liner and bins, behind the panel
          p.AB('N', i0, i1, front_ + 0.01, cd, nz0 + 0.03, nz1 - 0.03, liner);
          for (const z of [0.4, 1.02, 1.45]) { p.AB('N', i0 + 0.03, i1 - 0.03, front_ - 0.06, front_ + 0.01, z, z + 0.1, clear); p.AB('N', i0 + 0.03, i1 - 0.03, front_ - 0.06, front_ + 0.01, z - 0.008, z, liner); }
          [[0.08, 0.28, 0x2f6b3a], [0.17, 0.24, 0xe8e2d0], [0.26, 0.3, 0xb5422e]].forEach(([o, h, c]) => p.cyl(0.03, h, tint(c), i0 + o, front_ - 0.025, 0.4));
        } });
        door('N', a0, a1, tz, tz1, 'a0', { chan: false });
        B('N', a0 + ct, a1 - ct, ct, cd - 0.02, tz + 0.12, tz + 0.12 + ct, liner);                              // a shelf in the cupboard over it, trays on it
        B('N', a0 + 0.05, a1 - 0.05, 0.05, 0.45, tz + 0.12 + ct, tz + 0.15 + ct, st);
      }
      { // pantry 450: hinged on its bench side so it and the fridge open as a pair; shelves of jars and tins
        const [a0, a1] = N.pantry;
        carc('N', a0, a1, kz, tz1, { zs: [0.55, 0.9, 1.25, 1.6, nz1] });
        for (const z of [0.55, 0.9, 1.25, 1.6]) { jars('N', a0 + ct, a1 - ct, z + ct, 0.18); tins('N', a0 + ct, a1 - ct, z + ct, 0.42); }
        B('N', a0 + 0.05, a1 - 0.05, 0.08, 0.45, kz + ct, kz + ct + 0.3, tint(0xc9a877));                       // a basket of potatoes and onions on the floor
        door('N', a0, a1, kz, tz, 'a1');
        door('N', a0, a1, tz, tz1, 'a1', { chan: false });
      }
      // finer fridge vent in the kick under the housing (the top vents through the back of the cupboard over it)
      for (let i = 0; i < 14; i++) { const va = N.fridge[0] + 0.06 + i * 0.035; B('N', va, va + 0.012, cd - 0.0505, cd - 0.049, 0.035, kz - 0.035, ventMat); }
      }
      // ---- west return: filler, drawers, sink under the window, dishwasher, end panel ----
      face(SB, 'W', wy0 + cd, R.fill[1], kz, cz, cd, false);                                            // return filler, run back to the north run's fronts so the corner is closed
      if (K.gl) { drawers3('W', ...R.d569a); drawers3('W', ...R.d569b); carc('W', ...R.door, kz, cz, { zs: [0.5] }); door('W', ...R.door, kz, cz, 'a0', { chan: false }); }
      else if (K.sh) { drawers3('W', ...R.d998); drawers3('W', ...R.d390); } else { drawers3('W', ...R.d450); drawers3('W', ...R.d900); }
      { // sink: two doors hinged at the outer edges, opening as a pair; the bowls' wastes and trap, a bin, cleaning things
        const [a0, a1] = R.sink, m = (a0 + a1) / 2, sm = (sinkCut[2] + sinkCut[3]) / 2;
        carc('W', a0, a1, kz, cz, { top: false });
        const pipe = tint(0xe9e9e6);
        for (const y of [(sinkCut[2] + sm) / 2, (sm + sinkCut[3]) / 2]) scyl(0.022, 0.2, pipe, [wx - 0.3, y], 0.45);
        B('W', sinkCut[2] + 0.1, sinkCut[3] - 0.1, 0.28, 0.32, 0.43, 0.47, pipe); B('W', sm - 0.02, sm + 0.02, ct, 0.3, 0.43, 0.47, pipe);   // trap across to the wall waste
        B('W', a0 + 0.04, a0 + 0.34, 0.08, 0.42, kz + ct, kz + ct + 0.3, tint(0x5b6166));                        // pull-out bin
        [[0.42, 0x2a6fb5], [0.5, 0xd8c040], [0.58, 0x3a9a5a]].forEach(([o, c]) => scyl(0.035, 0.22, tint(c), P('W', a0 + o, 0.42), kz + ct));
        const pair = asmNew(); door('W', a0, m, kz, cz, 'a0', { asm: pair }); door('W', m, a1, kz, cz, 'a1', { asm: pair });
      }
      { // integrated dishwasher: steel tub, two racks of plates and glasses; the panelled door drops down
        const [a0, a1] = R.dw, i0 = a0 + 0.02, i1 = a1 - 0.02;
        B('W', i0, i1, 0.03, 0.04, kz + 0.02, cz - 0.02, st); B('W', i0, i0 + 0.01, 0.04, cd, kz + 0.02, cz - 0.02, st); B('W', i1 - 0.01, i1, 0.04, cd, kz + 0.02, cz - 0.02, st);
        B('W', i0, i1, 0.04, cd, kz + 0.02, kz + 0.03, st); B('W', i0, i1, 0.04, cd, cz - 0.03, cz - 0.02, st);
        for (const z of [0.24, 0.56]) { B('W', i0 + 0.02, i1 - 0.02, 0.06, cd - 0.03, z, z + 0.006, M.metal); B('W', i0 + 0.02, i1 - 0.02, 0.06, 0.066, z, z + 0.08, M.metal); }
        for (let i = 0; i < 8; i++) { const a = i0 + 0.07 + i * 0.06, disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 24), tint(0xf6f4ee)); disc.rotation.x = Math.PI / 2; disc.position.copy(L(wx - 0.3, a, 0.37)); disc.castShadow = true; int_.add(disc); }   // plates on edge
        for (let i = 0; i < 6; i++) for (const d of [0.15, 0.3, 0.45]) scyl(0.035, 0.11, clear, P('W', i0 + 0.06 + i * 0.09, d), 0.566);   // glasses upside down
        dropDoor('W', a0, a1, kz, cz, p => { face(p.AB, 'W', a0, a1, kz, cz); p.AB('W', i0, i1, cd - 0.02, cd, kz + 0.02, cz - 0.02, st); });
      }
      B('W', ...R.panel, 0, cd + dt, 0, cz, walnut);
      // kick, set back 50, along both runs
      if (K.sh) B('N', (N.tall || N.drawers)[0], N.fill[1], 0.04, cd - 0.05, 0, kz, kickMat); else B('N', N.fridge[0], wx, 0.04, cd - 0.05, 0, kz, kickMat);
      B('W', wy0 + cd, R.dw[1], 0.04, cd - 0.05, 0, kz, kickMat);
      // tops, 33 thick, 600 deep: the north top runs into the corner, the return's meets it
      surfUV(B('N', K.sh ? (N.tall || N.fridge)[1] : N.pantry[1], wx, 0, 0.6, cz, bz, laminate), TT);
      benchWithCut(int_, wx - 0.6, wx, K.return[2], R.panel[1], cz, bz, laminate, sinkCut, m => surfUV(m, TT));
      realSink(int_, ...sinkCut, bz, 2, 'y', { x: wx - 0.065, y: (sinkCut[2] + sinkCut[3]) / 2, face: '-x' });
      gasCooktop(int_, N.oven[0] + 0.02, N.oven[1] - 0.02, wy0 + 0.06, wy0 + 0.55, bz);
      // splashback in the top's stone: the north wall, and the west wall cut round the window
      surfUV(B('N', K.sh ? (N.tall || N.fridge)[1] : N.pantry[1], wx, 0, 0.012, bz, uz0, laminate), TT);
      { const ws = Win.W3_kitchen, y0 = wy0 + 0.012, y1 = R.panel[1];
        for (const [a, b, z0, z1] of [[y0, ws.y0, bz, uz0], [ws.y1, y1, bz, uz0], [ws.y0, ws.y1, bz, ws.sill]])
          if (b - a > 0.005 && z1 - z0 > 0.005) surfUV(B('W', a, b, 0, 0.012, z0, z1, laminate), TT); }
      // ---- wall cabinets, 900 x 330, two shelves of plates and glasses ----
      const wall = (r, a0, a1, hinges, { z0 = uz0, fill = true } = {}) => {
        const zs = []; for (let z = z0 + 0.3; z < uz1 - 0.15; z += 0.3) zs.push(z);                   // a shelf every 300
        carc(r, a0, a1, z0, uz1, { d1: ud, zs });
        if (fill) { plates(r, a0 + ct, a1 - ct, z0 + ct); glasses(r, a0 + ct, a1 - ct, z0 + 0.3 + ct); }
        const asm = asmNew(), n = hinges.length, w = (a1 - a0) / n;
        hinges.forEach((h, i) => door(r, a0 + i * w, a0 + (i + 1) * w, z0, uz1, h, { d: ud, chan: false, asm, m: upper }));
      };
      const ledUnder = (r, a0, a1) => B(r, a0 + 0.02, a1 - 0.02, ud - 0.03, ud - 0.01, uz0 - 0.006, uz0, led);
      if (!K.sh) { face(SB, 'N', ...N.fill, uz0, uz1, ud, false); B('N', ...N.fill, 0, ud, uz0, uz1, walnut); }   // 84 filler over the base filler
      wall('N', ...N.drawers, ['a0']); ledUnder('N', ...N.drawers);
      { const [a0, a1] = N.oven, hz = K.gl ? uz0 : K.sh ? bz + 0.78 : uz1 - 0.72, vz = hz + 0.04;   // second-hand: its cupboards top at 2550, so a taller one                                       // 600 rangehood space: a 720 cupboard with the
        carc('N', a0, a1, hz, uz1, { d1: ud });                                                          // slide-out hood in its base, 780 over the bench;
        scyl(0.075, uz1 - hz - 0.04, tint(0xb8bcbf), P('N', (a0 + a1) / 2, 0.15), hz + 0.02);              // its duct up through the cupboard
        if (K.gl) { const pr = asmNew(); door('N', a0, (a0 + a1) / 2, vz, uz1, 'a0', { d: ud, chan: false, asm: pr, m: upper }); door('N', (a0 + a1) / 2, a1, vz, uz1, 'a1', { d: ud, chan: false, asm: pr, m: upper }); }   // its pair of 445s, hood under
        else door('N', a0, a1, vz, uz1, 'a0', { d: ud, chan: false });
        if (hz > uz0) surfUV(B('N', a0, a1, 0, 0.012, uz0, hz, laminate), TT);                                       // splashback on up behind the hood
        B('N', a0 + 0.004, a1 - 0.004, ud - 0.01, ud + dt + 0.01, hz, vz, st);                         // visor
        B('N', a0 + 0.04, a1 - 0.04, 0.03, ud - 0.04, hz - 0.002, hz, M.frameA); }                     // filter
      if (K.gl) { const c1 = N.oven[1] + 0.445; wall('N', N.oven[1], c1, ['a1']); B('N', c1, wx - ud, 0, ud, uz0, uz1, upper); face(SB, 'N', c1, wx - ud, uz0, uz1, ud, false, upper); }   // a 445, filler to the west cupboards
      else if (K.sh) { B('N', N.oven[1], wx - ud, 0, ud, uz0, uz1, walnut); face(SB, 'N', N.oven[1], wx - ud, uz0, uz1, ud, false); }   // filler on to the west cupboards
      else { const c0 = N.corner[0], c1 = c0 + 0.6;                                                           // 600 hinged on the corner side, then a 148
        wall('N', c0, c1, ['a1']); ledUnder('N', c0, c1);                                                // filler to the west run's face
        B('N', c1, wx - ud, 0, ud, uz0, uz1, walnut); face(SB, 'N', c1, wx - ud, uz0, uz1, ud, false); }
      { const w0 = wy0 + ud + dt, f1 = w0 + 0.072, t1 = f1 + 0.9;                                       // west: 72 filler, then a 900 (a pair of
        B('W', w0, f1, 0, ud + dt, uz0, uz1, upper);                                                     // doors), stopping 150 short of the window
        wall('W', f1, t1, ['a0', 'a1']); ledUnder('W', f1, t1);
        B('W', wy0, w0, 0, ud, uz0 - dt, uz0, upper);                                                    // the dead corner's underside, closed
        // plasterboard bulkhead from the cupboard tops to the ceiling, flush with the fronts: deeper over the tall units
        const ceil = 2.8, bh_ = M.ceiling;
        const tallEnd = K.sh ? (N.tall || N.fridge)[1] : N.fill[0];
        if (tz1 < ceil) B('N', N.panel[0], tallEnd, 0, cd + dt, tz1, ceil, bh_);
        if (uz1 < ceil) { B('N', tallEnd, wx, 0, ud + dt, uz1, ceil, bh_); B('W', wy0 + ud + dt, t1, 0, ud + dt, uz1, ceil, bh_); } }
      if (!WH) { int_.updateMatrixWorld(true); int_.traverse(o => { if (o.isMesh && o.material === walnut) surfUV(o, WALNUT_TILE); }); }
      if (K.oak) { int_.updateMatrixWorld(true); int_.traverse(o => { if (o.isMesh && o.material === oak) surfUV(o, OAK_TILE); }); }
    } else
    if (K.ikea) {
      // ---- IKEA-style kitchen ----
      const ikCuts = [];                                                                          // sink cut-outs, filled in before the west bays
      const ash = M.ikAsh || (M.ikAsh = new THREE.MeshStandardMaterial({ map: ashTexture(), roughness: 0.5, color: 0xffffff }));
      const greige = M.ikGreige || (M.ikGreige = new THREE.MeshStandardMaterial({ color: 0xbcb5a6, roughness: 0.55 }));
      const carcass = M.ikCarcass || (M.ikCarcass = new THREE.MeshStandardMaterial({ color: 0xa8a196, roughness: 0.7 }));
      const marble = M.ikMarble || (M.ikMarble = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.22, color: 0xffffff }));
      const glassBlack = M.ikBlack || (M.ikBlack = new THREE.MeshStandardMaterial({ color: 0x131416, roughness: 0.15, metalness: 0.25 }));
      const led = M.ikLed || (M.ikLed = new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffe6b8, emissiveIntensity: 1.4 }));
      const st = steelMat(), dark = M.grille, wy0 = 15.02, dep = 0.6, [uz0, uz1] = K.uppers_z, ud = K.uppers_depth;
      // Walnut & quartzite: walnut base and wall fronts with a routed finger channel along their tops (no handles),
      // cream handleless tall units, quartzite top 40 thick and the same slab up the wall to the wall cabinets
      const WN = K.walnut;
      const walnut = K.cream ? (M.crFront || (M.crFront = new THREE.MeshStandardMaterial({ color: 0xe9e3d7, roughness: 0.72 })))   // cream: warm off-white, matt
        : (M.wnWalnut || (M.wnWalnut = new THREE.MeshStandardMaterial({ map: walnutTexture(), roughness: 0.42, color: new THREE.Color(1.3, 1.3, 1.3) /* lifted to LRV ~15: lacquered American walnut is 12-20, the texture alone ~11 */ })));
      const cream = M.wnCream || (M.wnCream = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.62 }));
      const channel = K.cream ? (M.crChannel || (M.crChannel = new THREE.MeshStandardMaterial({ color: 0xb9b1a3, roughness: 0.85 })))   // the channel in the front's colour, in shadow
        : (M.wnChannel || (M.wnChannel = new THREE.MeshStandardMaterial({ color: 0x21150d, roughness: 0.85 })));
      // the same honed limestone as the lounge's walnut TV wall, on the top and the splashback (was a taupe quartzite)
      const quartz = M.limestone || (M.limestone = new THREE.MeshStandardMaterial({ map: limestoneTexture(), roughness: 0.7 }));
      const ST = WN ? LIME_TILE : MARBLE_TILE;
      // walnut on every front: base, wall, and the tall run (pantry, fridge and oven tower), as the user asked
      const front = WN ? walnut : ash, wallFace = WN ? walnut : greige, tallFace = WN ? walnut : greige;
      const carcassW = WN ? walnut : carcass, carcassT = WN ? walnut : carcass, topMat = WN ? quartz : marble;
      const UP = 0.2;                                                                             // cream: a 200 upstand, not a full-height slab
      // plinth (kickboard): one continuous recessed board along each run, set back under the fronts, and round the corner
      // and along the tall units with no breaks between the cupboards (the woodwork colour, as before)
      const kickMat = M.trimDark;
      const splash = (x0, x1, y0, y1, z0, z1) => K.cream ? (z0 < bh + UP - 0.005 ? surfUV(box(int_, x0, x1, y0, y1, z0, Math.min(z1, bh + UP), quartz), ST) : null) : WN ? surfUV(box(int_, x0, x1, y0, y1, z0, z1, quartz), ST) : surfUV(box(int_, x0, x1, y0, y1, z0, z1, subwayMat()), SUBWAY_TILE);
      const mb = (x0, x1, y0, y1, z0, z1) => surfUV(box(int_, x0, x1, y0, y1, z0, z1, topMat), ST);
      // drawer front: dark ash with the rounded top-edge grip (the front's own colour, darker in the shadow under it)
      const drawer = (x0, x1, y0, y1, z0, z1, face) => {
        const g = 0.003;
        if (WN) {                                                                                   // walnut front, dark finger channel over it, set back 15
          const ch = 0.035;
          if (face === 'S') { box(int_, x0 + g, x1 - g, y1, y1 + 0.019, z0 + g, z1 - ch, front); box(int_, x0 + g, x1 - g, y1, y1 + 0.004, z1 - ch, z1 - g, channel); }
          else { box(int_, x0 - 0.019, x0, y0 + g, y1 - g, z0 + g, z1 - ch, front); box(int_, x0 - 0.004, x0, y0 + g, y1 - g, z1 - ch, z1 - g, channel); }
          return;
        }
        if (face === 'S') { box(int_, x0 + g, x1 - g, y1, y1 + 0.02, z0 + g, z1 - g, front); box(int_, x0 + g + 0.01, x1 - g - 0.01, y1 + 0.02, y1 + 0.032, z1 - 0.032, z1 - 0.012, front); box(int_, x0 + g + 0.01, x1 - g - 0.01, y1 + 0.02, y1 + 0.032, z1 - 0.036, z1 - 0.032, M.trimDark); }
        else { box(int_, x0 - 0.02, x0, y0 + g, y1 - g, z0 + g, z1 - g, front); box(int_, x0 - 0.032, x0 - 0.02, y0 + g + 0.01, y1 - g - 0.01, z1 - 0.032, z1 - 0.012, front); box(int_, x0 - 0.032, x0 - 0.02, y0 + g + 0.01, y1 - g - 0.01, z1 - 0.036, z1 - 0.032, M.trimDark); }
      };
      // a bay of base drawers under the bench: shallow drawer on top, deep drawer below, on a recessed dark kick
      const baseBay = (a0, a1, face, yOrX) => {
        if (face === 'S') { carcassBox(int_, a0, a1, wy0, wy0 + dep, 0.1, bh - top, carcassW, ikCuts); box(int_, a0, a1, wy0 + 0.04, wy0 + dep - 0.05, 0, 0.1, kickMat); drawer(a0, a1, wy0, wy0 + dep, 0.1, 0.35, 'S'); drawer(a0, a1, wy0, wy0 + dep, 0.355, bh - top - 0.003, 'S'); }
        else { const x0 = yOrX; carcassBox(int_, x0, x0 + dep, a0, a1, 0.1, bh - top, carcassW, ikCuts); box(int_, x0 + 0.05, x0 + dep - 0.04, a0 < wy0 + dep + 0.01 ? wy0 + dep - 0.05 : a0, a1, 0, 0.1, kickMat); drawer(x0, x0 + dep, a0, a1, 0.1, 0.35, 'E'); drawer(x0, x0 + dep, a0, a1, 0.355, bh - top - 0.003, 'E'); }
      };
      // greige flat door with a slim black bar handle (tall units) or none (wall cabinets, push to open)
      const tallDoor = (x0, x1, z0, z1, handle, hx) => { box(int_, x0 + 0.003, x1 - 0.003, wy0 + dep, wy0 + dep + 0.02, z0 + 0.003, z1 - 0.003, tallFace); if (handle && !WN) box(int_, hx - 0.006, hx + 0.006, wy0 + dep + 0.02, wy0 + dep + 0.045, (z0 + z1) / 2 - 0.16, (z0 + z1) / 2 + 0.16, dark); };
      // ---- opening doors (tap Open door / E in Walk, like the house doors) and what's behind them ----
      const tint = c => M['ikc' + c] || (M['ikc' + c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
      const clearPlastic = M.ikClear || (M.ikClear = new THREE.MeshStandardMaterial({ color: 0xe8f0f2, roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false }));
      const jarGlass = M.ikJar || (M.ikJar = new THREE.MeshStandardMaterial({ color: 0xdfe9ec, roughness: 0.08, transparent: true, opacity: 0.3, depthWrite: false }));
      const bamboo = M.ikBamboo || (M.ikBamboo = new THREE.MeshStandardMaterial({ color: 0xc9a877, roughness: 0.6 }));
      const cyl = (parent, r, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat); m.position.copy(L(x, y, z + h / 2)); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
      const swingDoor = (x0, x1, z0, z1, hingeAt, lining) => {
        const fy = wy0 + dep, lw = x1 - x0 - 0.006, lh = z1 - z0 - 0.006, dir = hingeAt === 'x0' ? -1 : 1, hx = hingeAt === 'x0' ? x0 + 0.003 : x1 - 0.003;
        const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
        const pivot = new THREE.Group(); pivot.position.copy(L(hx, fy, z0 + 0.003));
        const add = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; b.userData.door = true; pivot.add(b); return b; };
        add(lw, lh, 0.02, tallFace, dir * lw / 2, lh / 2, 0.01);                                   // the greige (or cream) face
        if (!WN) add(0.012, 0.32, 0.025, dark, dir * (lw - 0.045), 1.08 - z0, 0.0325);             // slim black bar handle on the free edge (walnut: handleless)
        if (lining) lining(add, lw, lh, dir, pivot);
        pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = -dir * 0.58 * Math.PI;   // opens out into the kitchen, just past square
        assembly.add(pivot);
      };
      // pantry (reference photo): shelves of glass jars with bamboo lids up top, white pull-out drawers below
      const pantryInside = (x0, x1) => {
        const fy = wy0 + dep, ix0 = x0 + 0.018, ix1 = x1 - 0.018;
        for (const z of [1.3, 1.62, 1.92]) box(int_, ix0, ix1, wy0 + 0.018, fy - 0.03, z - 0.018, z, liner);
        [[0.12, 0.34], [0.36, 0.6], [0.62, 0.9], [0.92, 1.24]].forEach(([z0, z1], i) => {          // drawers: front panel, sides and a white interior
          box(int_, ix0 + 0.01, ix1 - 0.01, fy - 0.05, fy - 0.032, z0 + 0.01, z1 - 0.005, liner);
          for (const x of [ix0 + 0.01, ix1 - 0.022]) box(int_, x, x + 0.012, wy0 + 0.05, fy - 0.05, z0 + 0.01, z1 - 0.06, liner);
          if (i === 3) for (let k = 0; k < 4; k++) { const jx = ix0 + 0.08 + k * 0.12; cyl(int_, 0.045, 0.12, jarGlass, jx, fy - 0.14, z0 + 0.03); cyl(int_, 0.04, 0.09, tint([0xb56a3a, 0x8a3b2e, 0xd8c7a2, 0x5c3a25][k]), jx, fy - 0.14, z0 + 0.03); cyl(int_, 0.046, 0.02, bamboo, jx, fy - 0.14, z0 + 0.15); }
        });
        const fills = [0xd9a066, 0xa8472f, 0xe8e2d4, 0x8f5a36, 0xc98b4a, 0xb33a3a, 0xf0ead8, 0x6e4a2f, 0xd4b27a];
        [1.3, 1.62, 1.92].forEach((z, s) => {
          for (let k = 0; k < 3; k++) {
            const jx = ix0 + 0.1 + k * 0.17, h = 0.2 + ((s + k) % 3) * 0.03, r = 0.055 + (k % 2) * 0.01;
            cyl(int_, r, h, jarGlass, jx, wy0 + 0.25, z); cyl(int_, r - 0.006, h * 0.85, tint(fills[s * 3 + k]), jx, wy0 + 0.25, z + 0.004); cyl(int_, r + 0.002, 0.025, bamboo, jx, wy0 + 0.25, z + h);
          }
        });
      };
      // integrated fridge: white liner, glass shelves, two crisper drawers, a light, some food; bins on the door
      const fridgeInside = (x0, x1) => {
        const fy = wy0 + dep, ix0 = x0 + 0.03, ix1 = x1 - 0.03, iy1 = fy - 0.13;
        box(int_, ix0, ix1, wy0 + 0.02, wy0 + 0.03, 0.12, 2.04, liner);
        for (const z of [0.56, 0.9, 1.24, 1.58]) { box(int_, ix0, ix1, wy0 + 0.03, iy1, z - 0.006, z, clearPlastic); box(int_, ix0, ix1, iy1 - 0.012, iy1, z - 0.02, z, liner); }
        for (const [a, b] of [[ix0, (ix0 + ix1) / 2 - 0.005], [(ix0 + ix1) / 2 + 0.005, ix1]]) {                        // crispers
          box(int_, a, b, wy0 + 0.04, iy1, 0.14, 0.5, clearPlastic); box(int_, a + 0.01, b - 0.01, iy1 - 0.015, iy1, 0.42, 0.48, liner);
          box(int_, a + 0.03, b - 0.03, wy0 + 0.1, iy1 - 0.05, 0.15, 0.28, tint(a < 2 ? 0x6f9a3a : 0xc8452e));      // greens / tomatoes
        }
        const light = M.ikFridgeLight || (M.ikFridgeLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 1.2 }));
        box(int_, ix0 + 0.1, ix1 - 0.1, wy0 + 0.1, wy0 + 0.3, 2.02, 2.035, light);
        box(int_, ix0 + 0.04, ix0 + 0.13, wy0 + 0.1, wy0 + 0.19, 0.56, 0.8, tint(0xf5f5f2));        // milk
        box(int_, ix0 + 0.04, ix0 + 0.13, wy0 + 0.1, wy0 + 0.19, 0.8, 0.82, tint(0x2a6fb5));
        cyl(int_, 0.045, 0.07, tint(0xf2eee4), ix0 + 0.25, wy0 + 0.2, 0.56); cyl(int_, 0.045, 0.07, tint(0xe8c8d8), ix0 + 0.36, wy0 + 0.2, 0.56);   // yoghurt
        box(int_, ix0 + 0.05, ix0 + 0.3, wy0 + 0.08, wy0 + 0.3, 0.9, 0.99, clearPlastic); box(int_, ix0 + 0.06, ix0 + 0.29, wy0 + 0.09, wy0 + 0.29, 0.9, 0.96, tint(0xd88a3a));   // leftovers
        cyl(int_, 0.1, 0.07, tint(0xf4f2ec), ix0 + 0.42, wy0 + 0.22, 1.24); cyl(int_, 0.085, 0.04, tint(0x7a9a3a), ix0 + 0.42, wy0 + 0.22, 1.285);   // bowl of salad, heaped 10 mm over the rim (level with it, the two tops flickered)
        cyl(int_, 0.035, 0.26, tint(0x4a7a3a), ix0 + 0.1, wy0 + 0.15, 1.58); cyl(int_, 0.05, 0.12, tint(0xf0d060), ix0 + 0.3, wy0 + 0.2, 1.58);   // bottle, butter tub
      };
      const fridgeDoorLining = (add, lw, lh, dir, pivot) => {                                              // white liner and three door bins, all swing with the door
        add(lw - 0.04, lh - 0.04, 0.02, liner, dir * lw / 2, lh / 2, -0.01);
        for (const z of [0.35, 0.95, 1.45]) {
          add(lw - 0.1, 0.1, 0.09, clearPlastic, dir * lw / 2, z, -0.065);
          add(lw - 0.1, 0.012, 0.09, liner, dir * lw / 2, z - 0.05, -0.065);
        }
        const bottle = (x, zb, h, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, h, 16), tint(c)); m.position.set(dir * x, zb + h / 2, -0.065); m.userData.door = true; m.castShadow = true; pivot.add(m); };
        bottle(0.12, 0.3, 0.28, 0x2f6b3a); bottle(0.2, 0.3, 0.24, 0xe8e2d0); bottle(0.28, 0.3, 0.3, 0xb5422e);
        bottle(0.15, 0.9, 0.12, 0xf2c14e); bottle(0.25, 0.9, 0.14, 0x9a3b2e);
      };
      // ---- tall run on the north wall, hall side to the cooktop: pantry, integrated fridge, oven tower (600 each) ----
      const tallX0 = K.run[0], units = [['pantry', tallX0, tallX0 + 0.6], ['fridge', tallX0 + 0.6, tallX0 + 1.2], ['oven', tallX0 + 1.2, tallX0 + 1.8]];
      // pantry and fridge are open boxes (so you can see in when their doors swing); the oven tower stays solid
      const liner = M.ikLiner || (M.ikLiner = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.5 }));
      for (const [kind, x0, x1] of units.slice(0, 2)) {
        // sides (greige or walnut end panel on the hall side, kept 1 mm off the wall jamb so their faces don't meet); the
        // back, floor and roof fit between the sides, so no lining face lies in the end panel's plane (it flickered through)
        const e0 = x0 === tallX0 ? 0.001 : 0;
        box(int_, x0 + e0, x0 + 0.018, wy0, wy0 + dep, 0.1, 2.06, x0 === tallX0 ? tallFace : liner);
        box(int_, x1 - 0.018, x1, wy0, wy0 + dep, 0.1, 2.06, liner);
        box(int_, x0 + 0.018, x1 - 0.018, wy0, wy0 + 0.018, 0.1, 2.06, liner);                     // back
        box(int_, x0 + 0.018, x1 - 0.018, wy0 + 0.018, wy0 + dep, 0.1, 0.12, liner); box(int_, x0 + 0.018, x1 - 0.018, wy0 + 0.018, wy0 + dep, 2.04, 2.06, liner);   // floor and roof
        box(int_, x0 + e0, x1, wy0, wy0 + dep, 2.06, 2.8, carcassT);                                // top cupboard
      }
      box(int_, tallX0 + 1.2, tallX0 + 1.8, wy0, wy0 + dep, 0.1, 2.8, carcassT);
      box(int_, tallX0, tallX0 + 1.8, wy0 + 0.04, wy0 + dep - 0.05, 0, 0.1, kickMat);
      // the joints between the tall units: the white liner edges would show in the 6 mm door gaps, so they read dark
      for (const jx of [tallX0 + 0.6, tallX0 + 1.2]) box(int_, jx - 0.02, jx + 0.02, wy0 + dep + 0.0005, wy0 + dep + 0.0025, 0.1, 2.06, K.cream ? M.crChannel : (M.wnChannel || M.trimDark));   // just behind the door faces: only the gap shows it
      for (const [kind, x0, x1] of units) {
        tallDoor(x0, x1, 2.08, 2.81, false);                                                     // top cupboard over every unit, joint at 2.08 like the wall cabinets
        if (kind === 'pantry') { swingDoor(x0, x1, 0.1, 2.08, 'x0'); pantryInside(x0, x1); }
        if (kind === 'fridge') { swingDoor(x0, x1, 0.1, 2.08, 'x1', fridgeDoorLining); fridgeInside(x0, x1); }   // handles meet in the middle: the two open like a pair
        if (kind === 'oven') {
          // the oven's bottom lines up with the benchtop (900) beside it: two drawers under it, the microwave stacked
          // over it, then a short cupboard up to the 2.08 joint
          const oz = bh, dz = (oz - 0.1) / 2;
          drawer(x0, x1, wy0, wy0 + dep, 0.1, 0.1 + dz - 0.002, 'S'); drawer(x0, x1, wy0, wy0 + dep, 0.1 + dz + 0.002, oz - 0.003, 'S');
          // silver appliances: brushed stainless fronts, smoky glass windows, bar handles, a slim dark display
          let smoke = M.mwGlass || (M.mwGlass = new THREE.MeshStandardMaterial({ color: 0x6d7276, roughness: 0.15, metalness: 0.35 })), fy = wy0 + dep;
          // walnut: black glass oven and combi microwave, as in the reference (the steel reads as black, the window darker)
          const st = WN ? glassBlack : steelMat();
          if (WN) smoke = M.wnSmoke || (M.wnSmoke = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.3 }));
          box(int_, x0 + 0.003, x1 - 0.003, fy, fy + 0.02, oz, oz + 0.595, st);                           // oven, 600 high
          box(int_, x0 + 0.06, x1 - 0.06, fy + 0.02, fy + 0.024, oz + 0.08, oz + 0.39, smoke);            // its window
          box(int_, x0 + 0.06, x1 - 0.06, fy + 0.035, fy + 0.05, oz + 0.43, oz + 0.45, M.metal);          // handle bar and its standoffs
          for (const hx of [x0 + 0.08, x1 - 0.08]) box(int_, hx - 0.008, hx + 0.008, fy + 0.02, fy + 0.035, oz + 0.43, oz + 0.45, M.metal);
          box(int_, x0 + 0.2, x1 - 0.2, fy + 0.02, fy + 0.023, oz + 0.51, oz + 0.56, M.frameA);            // display
          for (const kx of [x0 + 0.1, x1 - 0.1]) { const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 20), M.metal); kn.rotation.x = Math.PI / 2; kn.position.copy(L(kx, fy + 0.03, oz + 0.535)); int_.add(kn); }
          const mz = oz + 0.6;                                                                       // microwave stacked over it, 460 high
          box(int_, x0 + 0.003, x1 - 0.003, fy, fy + 0.02, mz, mz + 0.455, st);
          box(int_, x0 + 0.05, x1 - 0.17, fy + 0.02, fy + 0.024, mz + 0.06, mz + 0.4, smoke);
          box(int_, x1 - 0.14, x1 - 0.05, fy + 0.02, fy + 0.023, mz + 0.32, mz + 0.38, M.frameA);          // its display and buttons
          for (const bz of [0.14, 0.2, 0.26]) box(int_, x1 - 0.12, x1 - 0.07, fy + 0.02, fy + 0.024, mz + bz, mz + bz + 0.03, M.metal);
          tallDoor(x0, x1, mz + 0.46, 2.08, false);                                                 // short cupboard between the microwave and the joint
        }
      }
      // ---- cooktop bench from the tall run to the corner, drawers under, marble top and full-height splashback ----
      const bx0 = tallX0 + 1.8, bx1 = K.run[1], nb = Math.max(1, Math.round((bx1 - bx0) / 0.74)), bw = (bx1 - bx0) / nb;
      for (let i = 0; i < nb; i++) baseBay(bx0 + i * bw, bx0 + (i + 1) * bw, 'S');
      mb(bx0, bx1, wy0 - 0.005, wy0 + dep + 0.03, bh - top, bh);
      const [cx0, cx1] = K.cooktop_x;
      if (WN) gasCooktop(int_, cx0, cx1, wy0 + 0.06, wy0 + dep - 0.04, bh);                        // gas: four burners under cast-iron trivets
      else {
        box(int_, cx0, cx1, wy0 + 0.08, wy0 + dep - 0.08, bh, bh + 0.006, glassBlack);            // induction cooktop
        for (const bx of [0.12, 0.4]) for (const by of [0.1, 0.3]) { const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.07, 24), M.metal); ring.rotation.x = -Math.PI / 2; ring.position.copy(L(cx0 + 0.04 + bx, wy0 + 0.1 + by, bh + 0.008)); int_.add(ring); }
      }
      splash(bx0, bx1, wy0 + 0.003, wy0 + 0.015, bh, uz0);                                        // splashback: subway tile, or the quartzite slab
      // wall cabinets to the ceiling, greige, handleless; the rangehood is a slim extractor recessed under the cooktop bay
      const wcx1 = bx1 - (ud + 0.3);                                                              // stops where the diagonal corner cabinet starts
      // two rows of doors, both 600 deep in one plane from above the bench to the ceiling (joint at 2.08, as on the tall
      // run), flush with the 600-deep tall run beside them
      const zRow = 2.08;
      box(int_, bx0, wcx1, wy0, wy0 + ud, uz0, uz1, carcassW);
      { const n = Math.max(1, Math.round((wcx1 - bx0) / 0.6)), w = (wcx1 - bx0) / n;
        for (let i = 0; i < n; i++) for (const [z0, z1] of [[uz0, zRow], [zRow, uz1]])
          box(int_, bx0 + i * w + 0.003, bx0 + (i + 1) * w - 0.003, wy0 + ud, wy0 + ud + 0.02, z0 + 0.003, z1 - 0.003, wallFace); }
      box(int_, Math.max(cx0 - 0.05, bx0 + 0.01), cx1 + 0.05, wy0 + 0.04, wy0 + ud - 0.02, uz0 - 0.04, uz0, st);   // extractor panel
      box(int_, cx0, cx1, wy0 + 0.08, wy0 + ud - 0.06, uz0 - 0.042, uz0 - 0.04, M.frameA);          // its mesh filter
      box(int_, bx0 + 0.02, K.run[1] - ud - 0.02, wy0 + ud - 0.03, wy0 + ud - 0.01, uz0 - 0.006, uz0, led);   // LED strip under the cabinets, on under the corner cabinet
      // ...and the light it gives the bench: tape at the front of the underside in a diffused channel, aimed down and a
      // little back at the splashback; high-output 1,000 lm/m, CRI 90+, 2700 K (Mint: joinery tape, 120 LEDs/m), ~300+ lux on
      // the bench. It runs on under the diagonal corner cabinet (it stopped where that started: 0.5 m of a 1.5 m bench lit)
      if (spec.renovation.kl_lights !== 'grid') BL.lines.push({ room: 'Kitchen / dining', layer: 'kTask', mode: 2, x0: bx0 + 0.02, x1: K.run[1] - ud - 0.02, y: wy0 + ud - 0.02, z: uz0 - 0.008, ay: -0.34, az: -0.94, lmPerM: 1000 });
      // ---- diagonal corner wall cabinet: the north and west runs meet in a 45-degree door face (last reference photo) ----
      {
        const wx = K.run[1];
        const diag = (d, z0, z1) => {                                                               // diagonal corner cabinet d deep, z0-z1
          const c = d + 0.3, cx1 = wx - c, cy1 = wy0 + c, pts = [[wx, wy0], [cx1, wy0], [cx1, wy0 + d], [wx - d, cy1], [wx, cy1]];
          const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(-x, y)));
          const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false });
          geo.rotateX(-Math.PI / 2); geo.translate(0, z0, 0);                                      // shape in the plan, extruded up
          const m = new THREE.Mesh(geo, carcassW); m.castShadow = m.receiveShadow = true; int_.add(m);
          const ax = cx1, ay = wy0 + d, bxp = wx - d, byp = cy1, len = Math.hypot(bxp - ax, byp - ay), ang = Math.atan2(byp - ay, bxp - ax);
          const door = new THREE.Mesh(new THREE.BoxGeometry(len - 0.006, z1 - z0 - 0.006, 0.02), wallFace);
          door.position.copy(L((ax + bxp) / 2, (ay + byp) / 2, (z0 + z1) / 2)); door.position.add(L(-Math.sin(ang) * 0.01, Math.cos(ang) * 0.01, 0).sub(L(0, 0, 0)));
          door.rotation.y = ang; door.castShadow = door.receiveShadow = true; int_.add(door);
        };
        diag(ud, uz0, zRow);                                                                        // 45-degree corner cabinet, 900 each way,
        diag(ud, zRow, uz1);                                                                        // with a flush top door above it
        splash(wcx1, wx, wy0 + 0.003, wy0 + 0.015, bh, uz0);                                      // splashback runs into the corner
      }
      // ---- west bench under the window: drawers, the sink centred under it, the dishwasher beside it ----
      const [qx0, qx1, qy0, qy1] = K.return, [sy0, sy1] = K.sink_y;
      ikCuts.push([qx0 + 0.07, qx1 - 0.13, sy0, sy1]);
      const westBays = [];
      let yy = qy0;
      const dw = [sy1 + 0.05, sy1 + 0.65];                                                         // 600 dishwasher south of the sink
      for (const [a, b] of [[qy0, sy0 - 0.05], [sy0 - 0.05, sy1 + 0.05], dw, [dw[1], qy1]]) if (b - a > 0.1) westBays.push([a, b]);
      for (const [a, b] of westBays) {
        if (a === dw[0] && dw[1] <= qy1) {                                                           // the dishwasher bay: stainless front
          box(int_, qx0, qx0 + dep, a, b, 0.1, bh - top, carcassW); box(int_, qx0 + 0.05, qx0 + dep - 0.04, a, b, 0, 0.1, kickMat);
          if (WN) drawer(qx0, qx0 + dep, a, b, 0.1, bh - top - 0.003, 'E');                              // integrated: a walnut panel like the doors
          else { box(int_, qx0 - 0.02, qx0, a + 0.005, b - 0.005, 0.13, bh - top - 0.01, st); box(int_, qx0 - 0.035, qx0 - 0.02, a + 0.1, b - 0.1, 0.78, 0.8, M.metal); }
        } else if (b - a > 1.0) { const n = Math.round((b - a) / 0.7), w = (b - a) / n; for (let i = 0; i < n; i++) baseBay(a + i * w, a + (i + 1) * w, 'E', qx0); }
        else baseBay(a, b, 'E', qx0);
      }
      // marble top meeting the north top in the corner, cut for an undermount double bowl with a gooseneck mixer behind
      const sinkCut = [qx0 + 0.07, qx1 - 0.13, sy0, sy1];
      benchWithCut(int_, qx0 - 0.03, qx1, wy0 + dep + 0.03, qy1, bh - top, bh, topMat, sinkCut, m => surfUV(m, ST));
      realSink(int_, ...sinkCut, bh - top, 2, 'y', { x: qx1 - 0.065, y: (sy0 + sy1) / 2, face: '-x' });
      // subway tile splashback up the west wall, cut round the window; greige wall cabinet between the corner and the window
      { const ws = Win.W_splash || (spec.renovation.no_side_door ? Win.W3_kitchen : null), t0 = wy0 + ud + 0.3;
        const bands = ws ? [[wy0 + 0.015, ws.y0, bh, uz0], [ws.y1, qy1, bh, uz0], [ws.y0, ws.y1, bh, ws.sill], [ws.y0, ws.y1, ws.head, uz0]] : [[wy0 + 0.015, qy1, bh, uz0]];   // from the north wall, so the corner behind the north run is covered too
        for (const [a, b, z0, z1] of bands) if (b - a > 0.005 && z1 - z0 > 0.005) splash(H.x_west_inner - 0.012, H.x_west_inner, a, b, z0, z1);
        const wcEnd = ws ? Math.min(ws.y0 - 0.04, qy1) : qy1;
        if (wcEnd - t0 > 0.25) {
          const xi = H.x_west_inner;                                                                  // same 600 plane as the north run, to the ceiling
          box(int_, xi - ud, xi, t0, wcEnd, uz0, uz1, carcassW);
          const n = Math.max(1, Math.round((wcEnd - t0) / 0.6)), w = (wcEnd - t0) / n;
          for (let i = 0; i < n; i++) for (const [z0, z1] of [[uz0, zRow], [zRow, uz1]])
            box(int_, xi - ud - 0.02, xi - ud, t0 + i * w + 0.003, t0 + (i + 1) * w - 0.003, z0 + 0.003, z1 - 0.003, wallFace);
          box(int_, H.x_west_inner - ud + 0.01, H.x_west_inner - ud + 0.03, wy0 + ud + 0.02, wcEnd - 0.02, uz0 - 0.006, uz0, led);
          if (spec.renovation.kl_lights !== 'grid') BL.lines.push({ room: 'Kitchen / dining', layer: 'kTask', mode: 2, along: 'y', x0: wy0 + ud + 0.02, x1: wcEnd - 0.02, y: H.x_west_inner - ud + 0.02, z: uz0 - 0.008, ay: 0.34, az: -0.94, lmPerM: 1000 });   // from under the corner cabinet
        }
      }
      // walnut veneer laid world-aligned (grain up every vertical face, at a real scale) rather than one texture stretched
      // over each piece, so a wide drawer and a tall door show the same grain and it runs on between neighbours
      if (WN) { int_.updateMatrixWorld(true); int_.traverse(o => { if (o.isMesh && o.material === walnut) surfUV(o, WALNUT_TILE); }); }
    } else {
    // base cabinets: carcass, recessed kick, door fronts with a black bar handle, doors on the room-facing side
    const cab = (x0, x1, y0, y1, face, skips = []) => {
      carcassBox(int_, x0, x1, y0, y1, 0.12, bh - top, white, wCuts);
      box(int_, x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, 0, 0.12, kick);
      const a0 = face === 'S' ? x0 : y0, a1 = face === 'S' ? x1 : y1;
      // door fronts in bays of about 600; appliance bays (skips) get no doors and the stretches between re-divide
      const spans = []; let at = a0;
      for (const [p, q] of [...skips].sort((u, v) => u[0] - v[0])) { spans.push([at, p]); at = q; }
      spans.push([at, a1]);
      spans.splice(0, spans.length, ...spans.filter(([p, q]) => q - p > 0.1));
      for (const [p, q] of spans) {
        const n = Math.max(1, Math.round((q - p) / 0.6)), w = (q - p) / n;
        for (let i = 0; i < n; i++) {
          const s0 = p + i * w + 0.01, s1 = s0 + w - 0.02;
          if (face === 'S') { box(int_, s0, s1, y1, y1 + 0.018, 0.14, bh - top - 0.02, white); box(int_, s0 + 0.08, s1 - 0.08, y1 + 0.018, y1 + 0.03, bh - top - 0.1, bh - top - 0.08, handle); }
          else { box(int_, x0 - 0.018, x0, s0, s1, 0.14, bh - top - 0.02, white); box(int_, x0 - 0.03, x0 - 0.018, s0 + 0.08, s1 - 0.08, bh - top - 0.1, bh - top - 0.08, handle); }
        }
      }
    };
    if (K.sink_x) wCuts.push([K.sink_x[0], K.sink_x[1], K.run[2] + 0.1, K.run[3] - 0.1]);
    if (K.sink_y && K.return) wCuts.push([K.return[0] + 0.07, K.return[1] - 0.13, K.sink_y[0], K.sink_y[1]]);
    const dwRet = K.dishwasher_x === 'return' && K.return, dq0 = qy0 + (K.dishwasher_slot || 0) * 0.6;
    const dwRun = Array.isArray(K.dishwasher_x) ? K.dishwasher_x : null;
    cab(rx0, rx1, ry0, ry1, 'S', [dwRun, K.cooktop_x].filter(Boolean)); if (K.return) cab(qx0, qx1, qy0, qy1, 'E', dwRet ? [[dq0, dq0 + 0.6]] : []);
    benchWithCut(int_, rx0, rx1, ry0 - 0.01, ry1 + 0.03, bh - top, bh, stone, K.sink_x ? [K.sink_x[0], K.sink_x[1], ry0 + 0.1, ry1 - 0.1] : null);   // stone top, run
    const qTop0 = qy0 > ry1 + 0.05 ? qy0 : ry1 + 0.03;
    if (K.return) benchWithCut(int_, qx0 - 0.03, qx1, qTop0, qy1, bh - top, bh, stone, K.sink_y ? [qx0 + 0.07, qx1 - 0.13, K.sink_y[0], K.sink_y[1]] : null);   // stone top, return
    // under-bench oven with a stainless door, black glass cooktop above, slimline rangehood under the uppers
    const [cx0, cx1] = K.cooktop_x;
    box(int_, cx0, cx1, ry1, ry1 + 0.02, 0.14, 0.72, steelMat());                        // silver oven
    box(int_, cx0 + 0.05, cx1 - 0.05, ry1 + 0.02, ry1 + 0.04, 0.62, 0.65, M.metal);
    box(int_, cx0 + 0.08, cx1 - 0.08, ry1 + 0.02, ry1 + 0.024, 0.25, 0.55, M.mwGlass || (M.mwGlass = new THREE.MeshStandardMaterial({ color: 0x6d7276, roughness: 0.15, metalness: 0.35 })));   // smoky oven window
    box(int_, cx0 + 0.01, cx1 - 0.01, ry1, ry1 + 0.018, 0.74, bh - top - 0.02, white);                 // drawer front over the oven
    box(int_, cx0 + 0.09, cx1 - 0.09, ry1 + 0.018, ry1 + 0.03, 0.78, 0.8, handle);
    box(int_, cx0, cx1, ry0 + 0.08, ry1 - 0.08, bh, bh + 0.008, M.grille);
    for (const bx of [0.16, 0.44]) for (const by of [0.15, 0.4]) { const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 20), M.metal); ring.rotation.x = -Math.PI / 2; ring.position.copy(L(cx0 + bx, ry0 + 0.08 + by, bh + 0.01)); int_.add(ring); }
    box(int_, cx0 - 0.05, cx1 + 0.05, ry0, ry0 + 0.48, K.uppers_z[0] - 0.1, K.uppers_z[0], M.metal);   // rangehood
    // dishwasher: stainless front over the base cabinet (in the run, or the return when the fridge takes the hall end)
    if (K.dishwasher_x) {
      const st = steelMat();
      if (K.dishwasher_x === 'return') {
        const b = dq0, e = dq0 + 0.6;                                                               // one 600 unit in its bay along the return
        box(int_, qx0 - 0.035, qx0, b + 0.005, e - 0.005, 0.13, 0.85, st);
        box(int_, qx0 - 0.05, qx0 - 0.035, b + 0.1, e - 0.1, 0.78, 0.8, M.metal);
        box(int_, qx0 - 0.036, qx0 - 0.034, b + 0.005, e - 0.005, 0.72, 0.725, M.frameA);            // control strip line
      } else {
        const [d0, d1] = K.dishwasher_x;
        box(int_, d0 + 0.005, d1 - 0.005, ry1, ry1 + 0.035, 0.13, 0.85, st);
        box(int_, d0 + 0.1, d1 - 0.1, ry1 + 0.035, ry1 + 0.05, 0.78, 0.8, M.metal);
        box(int_, d0 + 0.005, d1 - 0.005, ry1 + 0.034, ry1 + 0.036, 0.72, 0.725, M.frameA);
      }
    }
    // undermount sink and a tall black mixer
    if (K.sink_x) {
      const [sx0, sx1] = K.sink_x;
      realSink(int_, sx0, sx1, ry0 + 0.1, ry1 - 0.1, bh - top, 1, 'x', { x: (sx0 + sx1) / 2, y: ry0 + 0.055, face: '+y' });
    }
    if (K.sink_y && K.return) {
      // double-bowl undermount sink across the west bench under the window, gooseneck mixer at the back
      const [sy0, sy1] = K.sink_y;
      realSink(int_, qx0 + 0.07, qx1 - 0.13, sy0, sy1, bh - top, 2, 'y', { x: qx1 - 0.065, y: (sy0 + sy1) / 2, face: '-x' });
    }
    // upper cabinets along the run, door fronts facing the room
    const [uz0, uz1] = K.uppers_z, ud = K.uppers_depth;
    box(int_, rx0, rx1, ry0, ry0 + ud, uz0, uz1, white);
    // built-in microwave in the second bay from the west end of the wall cupboards, or the end bay when the cooktop
    // (and its rangehood) has moved under that one
    const [hc0, hc1] = K.cooktop_x, mw = rx1 - 1.26 < hc1 + 0.05 && rx1 - 0.64 > hc0 - 0.05 ? [rx1 - 0.62, rx1] : [rx1 - 1.26, rx1 - 0.64];
    for (const [p, q] of [[rx0, mw[0]], [mw[1], rx1]].filter(([p, q]) => q - p > 0.1)) {
      const n = Math.max(1, Math.round((q - p) / 0.6)), w = (q - p) / n;
      // to the ceiling: one tall flat door per bay, handleless (push to open), as in the reference kitchen
      for (let i = 0; i < n; i++) { const s0 = p + i * w + 0.01, s1 = s0 + w - 0.02; box(int_, s0, s1, ry0 + ud, ry0 + ud + 0.018, uz0 + 0.02, uz1 - 0.02, white); if (!K.tall) box(int_, s0 + 0.08, s1 - 0.08, ry0 + ud + 0.018, ry0 + ud + 0.03, uz0 + 0.06, uz0 + 0.08, handle); }
    }
    {
      const [m0, m1] = mw, fy = ry0 + ud, mz0 = uz0 + 0.03, mz1 = mz0 + 0.39, mx0 = (m0 + m1) / 2 - 0.2975, mx1 = mx0 + 0.595;
      // brushed silver throughout, face flush with the cupboard doors, smoky glass rather than black
      const st = steelMat(), smoke = M.mwGlass || (M.mwGlass = new THREE.MeshStandardMaterial({ color: 0x6d7276, roughness: 0.15, metalness: 0.35 }));
      box(int_, m0 + 0.01, m1 - 0.01, fy, fy + 0.016, mz0 - 0.01, mz1 + 0.01, st);                     // silver trim kit filling the bay
      box(int_, mx0 + 0.155, mx1 - 0.02, fy + 0.016, fy + 0.02, mz0 + 0.03, mz1 - 0.03, smoke);         // glass door, controls on the right as you face it
      box(int_, mx0 + 0.03, mx0 + 0.125, fy + 0.016, fy + 0.019, mz0 + 0.24, mz1 - 0.04, M.metal);      // control strip
      box(int_, mx0 + 0.05, mx0 + 0.105, fy + 0.016, fy + 0.02, mz0 + 0.05, mz0 + 0.1, M.metal);        // door-release button
      box(int_, m0 + 0.01, m1 - 0.01, fy, fy + 0.018, mz1 + 0.03, uz1 - 0.02, white);                  // flap door over it
      box(int_, (m0 + m1) / 2 - 0.12, (m0 + m1) / 2 + 0.12, fy + 0.018, fy + 0.03, mz1 + 0.05, mz1 + 0.07, handle);
    }
    // uppers carry on round the corner along the west wall, over the return, doors facing east
    if (K.return && K.west_uppers !== false) {
      const wx1 = H.x_west_inner, wx0 = wx1 - ud, wy0 = Math.max(ry0 + ud, qy0), wy1 = qy1;
      if (wy1 - wy0 > 0.25) {
        box(int_, wx0, wx1, wy0, wy1, uz0, uz1, white);
        const n = Math.max(1, Math.round((wy1 - wy0) / 0.6)), w = (wy1 - wy0) / n;
        for (let i = 0; i < n; i++) {
          const s0 = wy0 + i * w + 0.01, s1 = s0 + w - 0.02;
          box(int_, wx0 - 0.018, wx0, s0, s1, uz0 + 0.02, uz1 - 0.02, white);
          box(int_, wx0 - 0.03, wx0 - 0.018, s0 + 0.08, s1 - 0.08, uz0 + 0.06, uz0 + 0.08, handle);
        }
      }
    }
    // white tile splashback between the stone top and the uppers, and along the west return
    surfUV(box(int_, rx0, rx1, ry0 + 0.003, ry0 + 0.015, bh, uz0, subwayMat()), SUBWAY_TILE);   // white subway tile splashback
    if (K.return) {                                                // west splashback, cut round the splashback window
      const t0 = qy0 > ry1 + 0.05 ? qy0 : ry1, ws = Win.W_splash || (spec.renovation.no_side_door ? Win.W3_kitchen : null);
      const bands = ws ? [[t0, ws.y0, bh, uz0], [ws.y1, qy1, bh, uz0], [ws.y0, ws.y1, bh, ws.sill], [ws.y0, ws.y1, ws.head, uz0]] : [[t0, qy1, bh, uz0]];
      for (const [a, b, z0, z1] of bands) if (b - a > 0.005 && z1 - z0 > 0.005) surfUV(box(int_, H.x_west_inner - 0.012, H.x_west_inner, a, b, z0, z1, subwayMat()), SUBWAY_TILE);
    }
    }
    // pantry shelves stay behind the existing pantry door in the south wall
    if (F.pantry_shelves && !pantryOpen) for (const z of F.pantry_shelves.levels) box(int_, F.pantry_shelves.x0, F.pantry_shelves.x1, F.pantry_shelves.y0, F.pantry_shelves.y1, z, z + 0.02, white);
    // cove cornice and downlights
    const southEnd = spec.renovation.no_pantry ? spec.renovation.pantry.x0 : spec.renovation.pantry.x1;   // the bath/pantry wall ends here
    const kSplitY = (Win.W3_kitchen.y0 + Win.W3_kitchen.y1) / 2;   // the west wall's cornice is notched behind the split system
    const cornices = [[0.115, southEnd, 18.88, 18.98], [0.115, 0.215, 15.02, 18.98], [4.59, 4.69, 15.02, kSplitY - 0.51], [4.59, 4.69, kSplitY + 0.51, 19.31], [southEnd, 4.69, 19.21, 19.31, 19.31, -1]];
    // north wall: the hall opening takes it from the party wall to x 1.30 (full height, no cornice across it), so the run
    // starts at the opening's west jamb; with tall cupboards to the ceiling it stops where they start
    if (!K.tall) cornices.push([1.30, 4.69, 15.02, 15.12]);
    else {
      // the tall units start at the fridge or its pantry cupboard when those stand at the hall end, not at the bench run
      const fr = spec.renovation.fridge, tallX = Math.min(K.run[0], fr?.at?.startsWith('runEnd') ? (fr.pantry ? fr.pantry[0] : fr.x0 - 0.02) : Infinity);
      if (tallX - 1.30 > 0.3) cornices.push([1.30, tallX, 15.02, 15.12]);   // not on the 110 mm jamb beside the tall units
    }
    // plaster cornice as in the listing's kitchen photo: a slim plain cove (the kitchen is a later, lower room; no enrichment)
    for (const [x0, x1, y0, y1, lineOv, dirOv] of cornices) {
      const alongX = x1 - x0 > y1 - y0;                                     // wall line on the band's outer edge
      let line = alongX ? (y0 < 15.5 ? y0 : spec.kitchen_south_wall.y0) : (x0 < 1 ? x0 : x1), dir = alongX ? (y0 < 15.5 ? 1 : -1) : (x0 < 1 ? 1 : -1);
      if (lineOv !== undefined) { line = lineOv; dir = dirOv; }                 // explicit wall line (the rear wall over the opening)   // south run on the bath/pantry wall's kitchen face
      if (alongX) corniceRun(int_, true, line, x0, x1, dir, 2.8, 'plain'); else corniceRun(int_, false, line, y0, y1, dir, 2.8, 'plain');
    }
    // keep every fitting 400 mm clear of joinery that runs to the ceiling, so none sits in a cupboard top or throws a hard
    // scallop down the doors: the tall run (600, or the fridge and pantry cupboard), the corner cupboard (670 each way),
    // the wall cupboards (their depth), and the west wall's cupboards
    const clearOf = (x, y) => {
      if (x >= rx0 - 0.1 && x <= rx1) {
        let d = K.uppers_depth;
        if (K.ikea) { if (x < rx0 + 1.85) d = 0.6; if (x > rx1 - 0.72) d = 0.67; }
        if (K.std && x < rx0 + (K.gl ? 0.995 : K.sh ? 1.6 : 1.1)) d = K.sh ? 0.7 : 0.6;                                     // the fridge and pantry
        const fr = spec.renovation.fridge;
        if (fr && ((x >= fr.x0 - 0.05 && x <= fr.x1 + 0.05) || (fr.pantry && x >= fr.pantry[0] - 0.05 && x <= fr.pantry[1] + 0.05))) d = Math.max(d, fr.y1 - ry0);
        y = Math.max(y, ry0 + d + 0.4);
      }
      return [Math.min(x, H.x_west_inner - K.uppers_depth - 0.4), y];
    };
    // Kitchen lighting (Reno > Kitchen > Lighting; critical review 2026-10-21 in BEDROOM-LIGHTING.md). 'designed' (default):
    // no downlight grid (Mint: grids are lazy; downlights over benches, not walkways; they threw scallops down the walnut
    // and lit the sink from behind, so you stood in your own shadow). Instead, by task:
    //  - under-cupboard tape on the north run (above, with the cupboards): the bench and splashback;
    //  - two low-glare 36-40 degree downlights over the sink bench (no wall cupboards there), 340 off the wall, in front
    //    of where you stand; one over the tall run, 500 off its face, tilted onto the walnut doors and the oven;
    //  - the table: two narrow low-glare downlights on its centreline, on their own dimmer (no pendant: too small a room);
    //  - a table lamp on the sideboard: the evening layer, with the pendant low.
    // ~4,500 lm in ~20 m2 at full, ~2.3 W/m2; 2700 K and CRI 90+ like the rest of the house. 'grid' = the old 3 x 3 grid.
    if (spec.renovation.kl_lights === 'grid') {
      for (const [dx, dy] of dlGrid(spec.rooms.find(r => r.name === 'Kitchen / dining'), 1.45).map(([x, y]) => clearOf(x, y))) { const dl = dlFitting(); dl.position.copy(L(dx, dy, 2.788)); int_.add(dl); DL.push({ x: dx, y: dy, z: 2.788, room: 'Kitchen / dining' }); }   // 3 x 3, 1.5 m apart
    } else {
      const KR = 'Kitchen / dining', kzc = 2.8, KG = kitchenGrid(spec);
      // one ceiling plan (client: the holes didn't read as symmetrical): three columns ~1.69 apart (buffet front edge,
      // room middle, sink bench front edge), pairs 800 apart on rows 0.8 apart; no wash on the tall run (the joinery is
      // lit evenly by the under-cupboard tape: one bright scallop on one run read as lopsided)
      const taskDL = (x, y, ax, ay, lm, kind = 'wash', layer = 'kTask') => { const dl = dlFitting(); dl.position.copy(L(x, y, kzc - 0.012)); int_.add(dl); BL.points.push({ room: KR, layer, kind, x, y, z: kzc - 0.03, ax, ay, lm }); };
      if (K.return && !K.west_uppers) {
        // over the bench's front edge (690 off the wall), clear of the split system over the window, whose face they lit
        // 24 degree, 400 lm: the sink bench's task light, and the narrower beam stays off the corner cupboard
        for (const y of KG.rows.slice(0, 2)) taskDL(KG.cols[2], y, 0, 0, 400, 'spot');
      }
      const Dn = spec.renovation.dining;
      // the table: no pendant (the room is too small for one, client 2026-10-21); two low-glare 40 degree downlights on
      // its centreline, 800 apart, ~300 lm each: ~250 lux on the top (Mint: dining ~150-250), dimmable
      // set out as one plan: the table pair on the table's centreline, the tall-run light in line with the table's east
      // one, and the sink pair centred on the same line (client: the scattered holes didn't look symmetrical)
      if (Dn) for (const y of KG.rows.slice(0, 2)) taskDL(KG.cols[1], y, 0, 0, 250, 'wash', 'kTable');   // the middle column, over the table (40 degree pools cover it)   // 40 degree, 300 lm: ~250 lux on the top (24 degree / 450 lm put ~600 lux on the white top, glaring)
      // the lamp stands on the sideboard's south end, in the corner (the plant moves to the north end, client 2026-10-21)
      // ...but not with the art layout 'v2': its hero beside the sideboard has its own light, which does the corner's job,
      // and the lamp stood in front of the piece leaned on the sideboard (one light per corner, not two; client 2026-10-21)
      if (spec.renovation.sideboard && spec.renovation.art !== 'v2') lamp(G.furniture, BL, KR, 0.115 + 0.005 + 0.2, spec.kitchen_south_wall.y0 - 0.005 - 0.3, 0.86, 'table', 'kLamp');
    }
  }
  // --- fridge (Reno sheet): stainless French-door fridge with a bottom freezer drawer, cupboard above ---
  if (spec.renovation.fridge) {
    const f = spec.renovation.fridge, white = M.kWhite;
    const steel = steelMat();
    const h = 1.8, g = 0.004;
    box(int_, f.x0, f.x1, f.y0, f.y1, 0.05, h, steel);                       // body sits on the kick, clear of the floor
    // work along the front face: u runs across it, the front plane sits at 'fp', proud faces step toward 'out'
    const alongX = f.face !== 'E', u0 = alongX ? f.x0 : f.y0, u1 = alongX ? f.x1 : f.y1;
    const fp = { S: f.y1, N: f.y0, E: f.x0 }[f.face], out = f.face === 'S' ? 1 : -1;
    const face = (a0, a1, z0, z1, d0, d1, m) => alongX
      ? box(int_, a0, a1, Math.min(fp + out * d0, fp + out * d1), Math.max(fp + out * d0, fp + out * d1), z0, z1, m)
      : box(int_, Math.min(fp + out * d0, fp + out * d1), Math.max(fp + out * d0, fp + out * d1), a0, a1, z0, z1, m);
    const um = (u0 + u1) / 2;
    if (f.single) {                                                        // one fridge door over a freezer door, handles on the bench side
      face(u0 + g, u1 - g, 0.76, h - 0.02, 0, 0.012, steel);
      face(u0 + g, u1 - g, 0.06, 0.74, 0, 0.012, steel);
      face(u1 - 0.07, u1 - 0.05, 0.9, 1.5, 0.012, 0.05, M.metal);
      face(u1 - 0.07, u1 - 0.05, 0.4, 0.7, 0.012, 0.05, M.metal);
    } else {
      face(u0 + g, um - g, 0.76, h - 0.02, 0, 0.012, steel);               // two upper doors
      face(um + g, u1 - g, 0.76, h - 0.02, 0, 0.012, steel);
      face(u0 + g, u1 - g, 0.06, 0.74, 0, 0.012, steel);                   // freezer drawer
      face(um - 0.002, um + 0.002, 0.76, h - 0.02, 0, 0.014, M.frameA);
      for (const hx of [um - 0.05, um + 0.03]) face(hx, hx + 0.02, 0.95, 1.55, 0.012, 0.05, M.metal);   // bar handles
      face(u0 + 0.12, u1 - 0.12, 0.62, 0.645, 0.012, 0.05, M.metal);
    }
    face(u0, u1, 0.745, 0.755, 0, 0.006, M.frameA);                        // shadow gap between fridge and freezer
    face(u0 + 0.01, u1 - 0.01, 0.002, 0.05, -0.07, -0.03, M.trimDark);     // kick, set back 30 so no face is shared with the body or floor
    // cupboard over the fridge up to the joinery line, and a gable panel where it runs beside a bench
    const cz0 = h + 0.05;
    if (f.top > cz0 + 0.1) {
      box(int_, f.x0, f.x1, f.y0, f.y1, cz0, f.top, white);
      face(u0 + g, um - g, cz0 + 0.02, f.top - 0.02, 0, 0.018, white); face(um + g, u1 - g, cz0 + 0.02, f.top - 0.02, 0, 0.018, white);
      face(um - 0.1, um - 0.03, cz0 + 0.05, cz0 + 0.07, 0.018, 0.03, M.grille); face(um + 0.03, um + 0.1, cz0 + 0.05, cz0 + 0.07, 0.018, 0.03, M.grille);
    }
    if (f.at.startsWith('runEnd')) {
      box(int_, f.x1, f.x1 + 0.02, f.y0, f.y1 + 0.02, 0, f.top, white);   // gable panel against the bench
      box(int_, f.x0 - 0.02, f.x0, f.y0, f.y1 + 0.02, 0, f.top, white);   // and on the open hall side, boxing the fridge in
    }
    if (f.at === 'doorRight') box(int_, f.x0, f.x1, f.y1, f.y1 + 0.02, 0, f.top, white);               // panel on the French-door side
    // pantry cupboard beside the fridge, floor to ceiling: open carcass with shelves of groceries behind a tall door and
    // a top door, both hinged on the fridge side (whichever side that is) and operable (tap or E in Walk)
    if (f.pantry) {
      const [p0, p1] = f.pantry, pt = 2.8, py0 = 15.02, py1 = f.y1, t = 0.018;
      box(int_, p0, p0 + t, py0, py1, 0, pt, white); box(int_, p1 - t, p1, py0, py1, 0, pt, white);           // sides
      box(int_, p0 + t, p1 - t, py0, py0 + 0.012, 0.12, pt, white);                                             // back
      box(int_, p0 + t, p1 - t, py0, py1, pt - t, pt, white);                                                   // top
      box(int_, p0 + t, p1 - t, py0, py1 - 0.05, 0, 0.12, M.trimDark);                                          // kick, set back
      const shelves = [0.12, 0.55, 0.95, 1.35, 1.75, 2.2];
      for (const z of shelves) box(int_, p0 + t, p1 - t, py0 + 0.012, py1 - 0.02, z, z + t, white);
      // groceries: jars, tins and boxes along each shelf (none on the base, where the bins would go)
      const pm = c => M['pn' + c] || (M['pn' + c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
      const goods = [[0xd9c7a0, 'jar'], [0xb2462e, 'box'], [0x3f6f8f, 'tin'], [0xe8e2d2, 'jar'], [0x6f8a3c, 'box'], [0xc9a24a, 'tin'], [0x8a5a3a, 'jar'], [0xf0ede4, 'box']];
      shelves.slice(1).forEach((z, si) => {
        const zb = z + t + 0.001, room = (shelves[si + 2] ?? pt - t) - zb - 0.04;
        let x = p0 + t + 0.02, k = si * 3;
        while (x < p1 - t - 0.1) {
          const [c, kind] = goods[k % goods.length], h = Math.min(room, kind === 'box' ? 0.28 : kind === 'jar' ? 0.2 : 0.12);
          if (kind === 'box') { box(int_, x, x + 0.07, py0 + 0.12, py0 + 0.34, zb, zb + h, pm(c)); x += 0.09; }
          else {
            const r = kind === 'jar' ? 0.045 : 0.038, cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), pm(c));
            cyl.position.copy(L(x + r, py0 + 0.2, zb + h / 2)); int_.add(cyl);
            if (kind === 'jar') { const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.02, 16), M.grille); lid.position.copy(L(x + r, py0 + 0.2, zb + h + 0.01)); int_.add(lid); }
            x += 2 * r + 0.02;
          }
          k++;
        }
      });
      const leaf = (z0, z1, pull) => {
        const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
        // hinge on the fridge side; lot x runs opposite to three x, so a leaf hung at p0 extends to -x locally
        const hr = f.x0 >= p1 - 0.05, sx = hr ? 1 : -1;
        const pivot = new THREE.Group(), w = p1 - p0 - 0.004, h = z1 - z0; pivot.position.copy(L(hr ? p1 - 0.002 : p0 + 0.002, py1 + t / 2, z0));
        const add = (bw, bh, bd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; b.userData.door = true; pivot.add(b); };
        add(w, h, t, white, sx * w / 2, h / 2, 0);
        if (pull) add(0.012, 0.35, 0.012, M.grille, sx * (w - 0.045), pull - z0, t / 2 + 0.006);   // black bar pull on the free edge
        pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = -sx * 100 * Math.PI / 180;   // opens into the room
        assembly.add(pivot);
      };
      leaf(0.14, 2.19, 1.05);
      leaf(2.21, pt - 0.01, 0);
    }
  }
  // --- laundry in the pantry (Reno sheet): washer with the dryer stacked on it, shelves of laundry above, flush doors ---
  if (spec.renovation.laundry) {
    const La = spec.renovation.laundry, fu = G.furniture;
    const mat = c => M['ld' + c] || (M['ld' + c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    const body = M.appliance, dark = M.frameA;
    const xm = (La.x0 + La.x1) / 2;
    laundryMachine(fu, xm, La.y0, 0, 'N', La.y1 - La.y0, true);
    box(fu, La.x0 + 0.01, La.x1 - 0.01, La.y0 + 0.02, La.y1, 0.85, 0.87, dark);                                         // stacking kit
    laundryMachine(fu, xm, La.y0, 0.87, 'N', La.y1 - La.y0, false);
    // shelves: full depth below the recess head, only to the rear wall face above it (brick kept there)
    const sx0 = spec.renovation.pantry.x0 + 0.005, sx1 = spec.renovation.pantry.x1 - spec.walls.int - 0.005;
    const depthAt = z => z < spec.renovation.pantry.recess_head ? spec.renovation.pantry.back_y - 0.01 : spec.house.y_rear_inner - 0.01;
    for (const z of La.shelves) box(int_, sx0, sx1, 18.99, depthAt(z), z - 0.025, z, M.kWhite || body);
    const [s1, s2, s3] = La.shelves.map(z => z + 0.001);                            // items sit a hair above the boards (no shared faces)
    // shelf 1: woven basket of washing, detergent bottles
    box(fu, sx0 + 0.04, sx0 + 0.44, 19.03, 19.4, s1, s1 + 0.26, mat(0xb08a5a));
    box(fu, sx0 + 0.06, sx0 + 0.42, 19.05, 19.38, s1 + 0.26, s1 + 0.29, mat(0x9fb7c9));
    box(fu, sx1 - 0.23, sx1 - 0.13, 19.05, 19.17, s1, s1 + 0.28, mat(0x3d7cc9));
    box(fu, sx1 - 0.11, sx1 - 0.03, 19.05, 19.15, s1, s1 + 0.22, mat(0xe8e2d0));
    // shelf 2: three stacks of folded towels
    const towels = [0xf1efe8, 0xa9b7a0, 0x8e959b], w = (sx1 - sx0 - 0.04) / 3;
    towels.forEach((c, i) => { for (let k = 0; k < 4; k++) { const inset = k % 2 ? 0.012 : 0; box(fu, sx0 + 0.02 + i * w + 0.01 + inset, sx0 + 0.02 + (i + 1) * w - 0.01 - inset, 19.03 + inset, 19.37 - inset, s2 + k * 0.06, s2 + (k + 1) * 0.06 - 0.004, mat(k % 2 ? towels[(i + 1) % 3] : c)); } });
    // shelf 3 (shallow): folded sheets and a lidded storage box
    box(fu, sx0 + 0.03, sx0 + 0.33, 19.01, 19.26, s3, s3 + 0.14, mat(0xe9e4da));
    box(fu, sx0 + 0.36, sx0 + 0.56, 19.01, 19.26, s3, s3 + 0.1, mat(0xc9d3dc));
    box(fu, sx1 - 0.2, sx1 - 0.02, 19.01, 19.27, s3, s3 + 0.18, mat(0x6f7a73));
    // pair of flush white doors, face in line with the kitchen wall, 3 mm shadow gaps, slim black pulls; both open out into the kitchen
    const px0 = spec.renovation.pantry.x0, px1 = spec.renovation.pantry.x1 - spec.walls.int, wy = spec.renovation.pantry.front_y0;
    const gap = 0.003, lt = 0.025, lw = (px1 - px0 - 3 * gap) / 2, lh = La.head - 2 * gap;
    const doorMat = M.kWhite || body;
    const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
    for (const [hx, dir] of [[px0 + gap, -1], [px1 - gap, 1]]) {                 // three.js x runs opposite to lot x
      const pivot = new THREE.Group(); pivot.position.copy(L(hx, wy + lt / 2, gap));
      const add = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; b.userData.door = true; pivot.add(b); };
      add(lw, lh, lt, doorMat, dir * lw / 2, lh / 2, 0);
      add(0.012, 0.32, 0.02, dark, dir * (lw - 0.04), 1.1, -(lt / 2 + 0.01));   // pull, kitchen side
      pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = dir * Math.PI / 2;
      assembly.add(pivot);
    }
  }
  // --- kitchen island (Reno sheet): white cabinets both sides, stone top with a 250 overhang for the stools ---
  if (spec.renovation.island) {
    const I = spec.renovation.island, white = M.kWhite, stone = M.kStone, fu = G.furniture;
    box(int_, I.x0 + 0.04, I.x1 - 0.04, I.y0 + 0.04, I.y1 - 0.29, 0, 0.12, M.trimDark);               // kick
    box(int_, I.x0, I.x1, I.y0, I.y1 - 0.25, 0.12, 0.86, white);
    const n = Math.round((I.x1 - I.x0) / 0.5), w = (I.x1 - I.x0) / n;
    for (let i = 0; i < n; i++) {                                                                      // drawer fronts facing the bench
      const s0 = I.x0 + i * w + 0.01, s1 = s0 + w - 0.02;
      box(int_, s0, s1, I.y0 - 0.018, I.y0, 0.14, 0.84, white);
      box(int_, s0 + 0.08, s1 - 0.08, I.y0 - 0.03, I.y0 - 0.018, 0.74, 0.76, M.grille);
    }
    box(int_, I.x0 - 0.02, I.x1 + 0.02, I.y0 - 0.03, I.y1, 0.86, 0.9, stone);
    const stool = (x, y) => {
      const m = (geo, z, mat) => { const o = new THREE.Mesh(geo, mat); o.position.copy(L(x, y, z)); o.castShadow = o.receiveShadow = true; fu.add(o); };
      m(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 28), 0.65, M.oak || (M.oak = new THREE.MeshStandardMaterial({ color: 0xc9a47a, roughness: 0.55 })));
      m(new THREE.CylinderGeometry(0.025, 0.025, 0.63, 12), 0.315, M.frameA);
      m(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 28), 0.01, M.frameA);
      m(new THREE.TorusGeometry(0.15, 0.01, 8, 28).rotateX(Math.PI / 2), 0.25, M.frameA);             // foot ring
    };
    for (const [x, y] of I.stools) stool(x, y);
  }
  // --- Portobello sideboard on the kitchen's east wall (spec.renovation.sideboards.portobello), 1600 x 435 x 860 ---
  // Light-brown oak veneer carcase with rounded front corners on a set-back plinth; four doors, the outer pair of each
  // side with one top corner swept round so a bronze back panel shows through in two arches; round oak rods run down
  // the joints between the outer and inner doors to the floor as legs, brass-shod; Pandora Brown sintered stone top
  // over a thin brass line. Pushed into the south-east corner against the bath wall; the bathroom door (x 1.15) is clear.
  // --- matched sideboard, same size and place as the Portobello: sand-oak carcase on a set-back plinth, four fluted
  // doors (push to open, no handles), a 30 mm top in the kitchen benchtop stone, the house plant on its south end
  if (spec.renovation.sideboard === 'matched') {
    const fu = G.furniture, K = spec.rooms.find(r => r.name === 'Kitchen / dining'), MX = matched();
    const w = 1.6, d = 0.435, h = 0.86, wx = K.x0 + 0.005, y0 = spec.kitchen_south_wall.y0 - 0.005 - w, fx = wx + d, cx = wx + d / 2;
    const zb = 0.09, zt = h - 0.03;
    box(fu, wx + 0.03, fx - 0.06, y0 + 0.04, y0 + w - 0.04, 0, zb, MX.groove);                 // plinth, set back
    box(fu, wx, fx - 0.022, y0, y0 + w, zb, zt, MX.oak);                                      // carcase
    box(fu, wx - 0.002, fx + 0.012, y0 - 0.006, y0 + w, zt, h, MX.stone);                      // stone top, a touch proud at the front
    const dw = (w - 0.012) / 4, dz0 = zb + 0.006, dz1 = zt - 0.006, pitch = 0.03;
    for (let i = 0; i < 4; i++) {
      const a0 = y0 + 0.006 + i * dw + 0.0015, a1 = a0 + dw - 0.003;                          // 3 mm between doors
      box(fu, fx - 0.022, fx - 0.01, a0, a1, dz0, dz1, MX.groove);                             // door board: the grooves' colour
      const n = Math.floor((a1 - a0) / pitch), m = (a1 - a0 - n * pitch) / 2;
      for (let k = 0; k < n; k++) {                                                            // half-round flutes
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, dz1 - dz0, 10, 1, false, 0, Math.PI), MX.oak);
        fl.position.copy(L(fx - 0.01, a0 + m + (k + 0.5) * pitch, (dz0 + dz1) / 2)); fl.rotation.y = Math.PI;   // round side to the room (lot +x)
        fl.castShadow = fl.receiveShadow = true; fu.add(fl);
      }
    }
    if (spec.renovation.art !== 'v2') plantModel(fu, 'rhyzome', cx + 0.05, spec.renovation.kl_lights === 'grid' ? y0 + w - 0.25 : y0 + 0.25, h, 0.75, 0.4);   // house plant on the south end (the north end when the lamp takes the south)
  }
  if (spec.renovation.sideboard === 'portobello') {
    const fu = G.furniture, K = spec.rooms.find(r => r.name === 'Kitchen / dining');
    const w = 1.6, d = 0.435, h = 0.86, wx = K.x0 + 0.005, cy = spec.kitchen_south_wall.y0 - 0.005 - w / 2;   // tucked into the south-east corner
    const cx = wx + d / 2, fx = wx + d, y0 = cy - w / 2;
    const veneer = M.portoOak || (M.portoOak = new THREE.MeshStandardMaterial({ color: 0xc89c6c, roughness: 0.55 }));
    const bronze = M.portoBronze || (M.portoBronze = new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.45, metalness: 0.4 }));
    const brass = M.brass || (M.brass = new THREE.MeshStandardMaterial({ color: 0xc2a064, roughness: 0.3, metalness: 0.85 }));
    const stone = M.pandora || (M.pandora = new THREE.MeshStandardMaterial({ map: pandoraTexture(), roughness: 0.2 }));
    const zb = 0.1, zt = h - 0.025;                                                     // carcase bottom and top
    planSlab(fu, cx - 0.02, cy, w - 0.08, d - 0.08, 0.03, 0, zb, bronze);                      // set-back plinth
    planSlab(fu, cx - 0.01, cy, w, d - 0.02, 0.06, zb, zt, veneer);                            // carcase, its front 10 short of the doors
    box(fu, fx - 0.021, fx - 0.019, y0 + 0.05, y0 + w - 0.05, zb + 0.01, zt - 0.01, bronze);   // bronze panel behind the doors
    planSlab(fu, cx, cy, w - 0.02, d - 0.02, 0.05, zt, zt + 0.006, brass);                     // brass line under the top
    planSlab(fu, cx, cy, w, d, 0.05, zt + 0.006, h, stone);
    // house plant in a concrete pot on the south (bathroom) end of the top, about 800 tall with its pot
    if (spec.renovation.art !== 'v2') plantModel(fu, 'rhyzome', cx + 0.05, spec.renovation.kl_lights === 'grid' ? y0 + w - 0.25 : y0 + 0.25, h, 0.75, 0.4);   // leaves clear of both walls (north end when the lamp takes the south)
    // doors: 18 mm, from 30 in from each rounded end; outer doors 360, inner 400, one top corner swept on a 170 radius
    const e0 = y0 + 0.04, dws = [0.36, 0.4, 0.4, 0.36], gap = 0.004, R = 0.17, dz0 = zb + 0.005, dz1 = zt - 0.008;
    // door outline in (y along the wall, z up), extruded 18 mm out from x = fx - 0.02; lot (x, y, z) -> three (-x, z, y)
    const door = (a0, a1, round) => {
      const s = new THREE.Shape();
      s.moveTo(a0, dz0); s.lineTo(a1, dz0);
      if (round === 'hi') { s.lineTo(a1, dz1 - R); s.absarc(a1 - R, dz1 - R, R, 0, Math.PI / 2); s.lineTo(a0, dz1); }
      else { s.lineTo(a1, dz1); s.lineTo(a0 + R, dz1); s.absarc(a0 + R, dz1 - R, R, Math.PI / 2, Math.PI); }
      s.lineTo(a0, dz0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.018, bevelEnabled: false, curveSegments: 16 });
      geo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, -(fx - 0.02), 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
      const m = new THREE.Mesh(geo, veneer); m.castShadow = m.receiveShadow = true; fu.add(m);
    };
    let a = e0; const joints = [];
    dws.forEach((dw, i) => { door(a + gap / 2, a + dw - gap / 2, i < 2 ? 'hi' : 'lo'); a += dw; joints.push(a); });
    // oak rods on the outer joints, standing proud of the doors, down to the floor with brass shoes
    for (const jy of [joints[0], joints[2]]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, zt - 0.03 - 0.035, 16), veneer);
      rod.position.copy(L(fx + 0.012, jy, (zt - 0.03 + 0.035) / 2)); rod.castShadow = true; fu.add(rod);
      const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.035, 16), brass);
      shoe.position.copy(L(fx + 0.012, jy, 0.0175)); fu.add(shoe);
    }
    box(fu, wx + 0.02, fx - 0.02, y0 + 0.02, y0 + w - 0.02, 0, h, M.hiddenSolid || (M.hiddenSolid = new THREE.MeshBasicMaterial({ visible: false })));
  }
  // --- dining table and chairs in the kitchen (spec.renovation.dining) ---
  if (spec.renovation.dining) {
    const Dn = spec.renovation.dining, fu = G.furniture, MX = Dn.style === 'matched' ? matched() : null;
    const honey = M.honeyOak || (M.honeyOak = new THREE.MeshStandardMaterial({ color: 0xb4834a, roughness: 0.5 }));
    const paleOak = M.paleOak || (M.paleOak = new THREE.MeshStandardMaterial({ color: 0xd8c4a0, roughness: 0.6 }));
    const seatFab = MX ? MX.boucle : M.chairFab || (M.chairFab = new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 1 }));
    const chairWood = MX ? MX.oak : paleOak;
    const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.copy(L(x, y, z)); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    // round tapered leg / rail between two lot-frame points
    const rod = (parent, p, q, r0, r1, mat) => {
      const a = L(...p), b = L(...q), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 14), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    // table: 25 mm top with softly rounded corners, a deep apron set in under it, four round tapered legs splayed a touch
    const { x0, x1, y0, y1, h } = Dn, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    if (Dn.style === 'tonstad') {
      // TONSTAD: brushed brown-stained oak veneer, 22 mm top with softly rounded corners, a plain 70 mm apron set just
      // in, four straight 45 mm square legs with eased arrises under the corners; the leaf joints show as fine lines
      // across the top (one in the middle closed, one either side of the 560 leaf when it's out)
      const brown = M.tonstad || (M.tonstad = new THREE.MeshStandardMaterial({ color: 0xa57a4c, roughness: 0.55 }));
      const seam = M.tonstadSeam || (M.tonstadSeam = new THREE.MeshStandardMaterial({ color: 0x3e2d1e, roughness: 0.8 }));
      planSlab(fu, xm, ym, y1 - y0, x1 - x0, 0.04, h - 0.022, h, brown);
      for (const sx of Dn.leaf ? [-0.28, 0.28] : [0]) box(fu, xm + sx - 0.0012, xm + sx + 0.0012, y0 + 0.001, y1 - 0.001, h - 0.0005, h + 0.0005, seam);
      const ai = 0.03;
      for (const [ax0, ax1, ay0, ay1] of [[x0 + ai, x1 - ai, y0 + ai, y0 + ai + 0.02], [x0 + ai, x1 - ai, y1 - ai - 0.02, y1 - ai], [x0 + ai, x0 + ai + 0.02, y0 + ai, y1 - ai], [x1 - ai - 0.02, x1 - ai, y0 + ai, y1 - ai]])
        box(fu, ax0, ax1, ay0, ay1, h - 0.092, h - 0.022, brown);
      for (const sx of [-1, 1]) for (const sy of [-1, 1])
        add(fu, new RoundedBoxGeometry(0.045, h - 0.022, 0.045, 2, 0.008), brown, xm + sx * ((x1 - x0) / 2 - ai - 0.0225), ym + sy * ((y1 - y0) / 2 - ai - 0.0225), (h - 0.022) / 2);
    } else if (MX) {
      // matched: 30 mm top in the benchtop stone, eased edges, on a sand-oak apron and four square legs tapering to the floor
      add(fu, new RoundedBoxGeometry(x1 - x0, 0.03, y1 - y0, 3, 0.008), MX.stone, xm, ym, h - 0.015);
      const ai = 0.07;
      for (const [ax0, ax1, ay0, ay1] of [[x0 + ai, x1 - ai, y0 + ai, y0 + ai + 0.022], [x0 + ai, x1 - ai, y1 - ai - 0.022, y1 - ai], [x0 + ai, x0 + ai + 0.022, y0 + ai, y1 - ai], [x1 - ai - 0.022, x1 - ai, y0 + ai, y1 - ai]])
        box(fu, ax0, ax1, ay0, ay1, h - 0.1, h - 0.03, MX.oak);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const lx = xm + sx * ((x1 - x0) / 2 - ai - 0.03), ly = ym + sy * ((y1 - y0) / 2 - ai - 0.03);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.024, h - 0.03, 4), MX.oak);            // square, tapering
        leg.rotation.y = Math.PI / 4; leg.position.copy(L(lx, ly, (h - 0.03) / 2)); leg.castShadow = leg.receiveShadow = true; fu.add(leg);
      }
    } else {
    add(fu, new RoundedBoxGeometry(x1 - x0, 0.025, y1 - y0, 3, 0.012), honey, xm, ym, h - 0.0125);
    for (const [ax0, ax1, ay0, ay1] of [[x0 + 0.1, x1 - 0.1, y0 + 0.08, y0 + 0.1], [x0 + 0.1, x1 - 0.1, y1 - 0.1, y1 - 0.08], [x0 + 0.1, x0 + 0.12, y0 + 0.1, y1 - 0.1], [x1 - 0.12, x1 - 0.1, y0 + 0.1, y1 - 0.1]])
      box(fu, ax0, ax1, ay0, ay1, h - 0.1, h - 0.025, honey);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const tx = xm + sx * ((x1 - x0) / 2 - 0.13), ty = ym + sy * ((y1 - y0) / 2 - 0.11);
      rod(fu, [tx + sx * 0.03, ty + sy * 0.02, 0], [tx, ty, h - 0.025], 0.017, 0.024, honey);
    }
    }
    // chairs: 490 wide x 530 deep x 780 high in pale oak, upholstered seat pad at 460, curved back rail, side stretchers.
    // Built facing +y (lot) around their seat centre, then turned to face the table.
    const C = Dn.chair, hw = C.w / 2, hd = C.d / 2;
    const crest = (() => {                                                   // the curved back rail, seen from above
      const s = new THREE.Shape(), R = 0.62, t = 0.022, a0 = -Math.PI / 2 - 0.42, a1 = -Math.PI / 2 + 0.42;   // middle furthest back, ends wrap forward
      s.absarc(0, 0, R, a0, a1, false); s.absarc(0, 0, R - t, a1, a0, true);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 20 });
      // shape (u, v) -> lot (u, v), extruded up; placed so the arc's middle sits just behind the back posts
      geo.applyMatrix4(new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
      return geo;
    })();
    for (const [cx, side] of Dn.chairs) {
      const tuck = 0.38, cy = side === 'N' ? y0 + tuck - hd : y1 - tuck + hd;   // pushed in until the back rail sits just outside the top's edge
      const ch = new THREE.Group(); ch.position.copy(L(cx, cy, 0)); ch.rotation.y = side === 'S' ? Math.PI : 0; fu.add(ch);   // built facing +y (south): north-side chairs as built, south-side turned round
      const lx = hw - 0.03, fy = hd - 0.04, by = -hd + 0.05, sz = C.seat_h;
      for (const sx of [-1, 1]) {
        rod(ch, [sx * lx, fy, 0], [sx * lx, fy, sz - 0.02], 0.014, 0.018, chairWood);                       // front legs
        rod(ch, [sx * (lx - 0.01), by - 0.03, 0], [sx * (lx - 0.03), by, C.h - 0.1], 0.014, 0.019, chairWood);   // back legs rise into the back posts
        rod(ch, [sx * lx, fy, 0.16], [sx * lx, by - 0.02, 0.16], 0.009, 0.009, chairWood);                  // side stretchers
      }
      rod(ch, [-lx, (fy + by) / 2, 0.19], [lx, (fy + by) / 2, 0.19], 0.008, 0.008, chairWood);               // cross stretcher
      box(ch, -hw + 0.02, hw - 0.02, by, fy + 0.02, sz - 0.08, sz - 0.03, chairWood);                         // seat frame
      add(ch, new RoundedBoxGeometry(C.w - 0.05, 0.05, C.d - 0.1, 3, 0.02), seatFab, 0, (fy + by) / 2 + 0.01, sz - 0.01);
      const cr = new THREE.Mesh(crest, chairWood); cr.castShadow = cr.receiveShadow = true;
      cr.position.copy(L(0, by - 0.02 + 0.62, C.h - 0.11)); ch.add(cr);
      if (MX) add(ch, new RoundedBoxGeometry(C.w - 0.13, 0.22, 0.035, 3, 0.015), MX.boucle, 0, by + 0.015, C.h - 0.25);   // boucle back pad under the rail
    }
  }
  // --- beds (Reno): upholstered queen or king with bedside drawers either side. Built in a local frame with the
  // headboard's face at x = 0 (the bed running toward -x) and centred on y = 0, then set against its wall.
  const bedSet = (size, bedside, bsW = 0.45, lamps = true, headH = 1.2, bsStyle = 'oak', bedStyle = 'box') => {
    const g = new THREE.Group(), cloud = bedStyle === 'cloud';
    const mw = size === 'king' ? 1.83 : 1.53, ml = 2.03, fw = mw + (cloud ? 0.3 : 0.1), fl = ml + 0.1;          // mattress, and the frame round it
    const wx = -0.015, fx0 = wx - fl, y0 = -fw / 2, y1 = fw / 2;
    const m = (k, c, o = {}) => M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o }));
    const frame = m('bedFrame', 0xb3aa9c), linen = m('bedLinen', 0xf3f0e8), duvet = m('bedDuvet', 0xe3dccf), throwM = m('bedThrow', 0x6e6a63), pillow = m('bedPillow', 0xfbfaf6);
    if (cloud) {
      // 'Cloud' upholstered bed (client reference 2026-10-21): a puffy cream boucle base that rings the mattress like a
      // bolster on a recessed dark plinth, a tall thick rounded headboard, the mattress sitting down inside; soft bedding:
      // a fitted grey-white sheet, a duvet with its top folded back in a soft roll, and two plump pillows across the bed
      // propped against the headboard
      const boucle = m('bedBoucle', 0xd8cdb9, { roughness: 1 }), plinth = m('bedPlinth', 0x2a2522, { roughness: 0.6 });
      const sheet = m('bedSheet', 0xdedcd8, { roughness: 0.9 }), duv = m('bedDuvetSoft', 0xe8e6e1, { roughness: 0.92 }), pil = m('bedPillowSoft', 0xeceae6, { roughness: 0.92 });
      const rb = (lx, lz, ly, r, mat, cx, cy, cz, rotZ = 0) => {                                       // a rounded box: lot sizes x, z, y; centre in lot coords
        const mesh = new THREE.Mesh(new RoundedBoxGeometry(lx, lz, ly, 5, r), mat); mesh.position.copy(L(cx, cy, cz)); mesh.rotation.z = rotZ; mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
      };
      const hbT = 0.24, hbH = Math.min(1.1, Math.max(1.0, headH - 0.2)), hx1 = wx - hbT;               // headboard: thick, rounded, ~1.05 tall
      rb(hbT, hbH - 0.04, fw, 0.11, boucle, wx - hbT / 2, 0, 0.04 + hbH / 2);
      const bl = ml + 0.16, bx1 = hx1 + 0.03, bx0 = bx1 - bl, bh = 0.25;                                // the base ring, tucked under the headboard
      box(g, bx0 + 0.14, bx1 - 0.06, y0 + 0.14, y1 - 0.14, 0, 0.05, plinth);                            // recessed plinth
      rb(bl, bh, fw, 0.12, boucle, (bx0 + bx1) / 2, 0, 0.05 + bh / 2);
      const mx1 = hx1 - 0.01, mx0 = mx1 - ml + 0.02, mz0 = 0.2, mz1 = 0.47;                             // mattress inside the ring
      rb(mx1 - mx0, mz1 - mz0, mw - 0.02, 0.05, sheet, (mx0 + mx1) / 2, 0, (mz0 + mz1) / 2);
      // duvet: a soft slab over the lower two-thirds, falling a little over the sides, with a folded roll at its head end
      const dx1 = mx1 - 0.62, dx0 = mx0 - 0.03;
      rb(dx1 - dx0, 0.075, mw + 0.05, 0.035, duv, (dx0 + dx1) / 2, 0, mz1 + 0.025);
      const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, mw - 0.06, 6, 16), duv); roll.rotation.x = Math.PI / 2; roll.position.copy(L(dx1 - 0.02, 0, mz1 + 0.06)); roll.castShadow = true; g.add(roll);
      // pillows: two plump ones across, propped against the headboard (the edge by the headboard raised)
      const pwid = (mw - 0.08) / 2;
      for (const s2 of [-1, 1]) rb(0.46, 0.16, pwid - 0.02, 0.075, pil, mx1 - 0.25, s2 * (pwid / 2 + 0.01), mz1 + 0.1, -0.32);
    } else {
    box(g, fx0, wx - 0.07, y0, y1, 0.08, 0.34, frame);                                             // upholstered base
    for (const x of [fx0 + 0.04, wx - 0.12]) for (const y of [y0 + 0.04, y1 - 0.08]) box(g, x, x + 0.04, y, y + 0.04, 0, 0.08, M.frameA);   // legs
    box(g, wx - 0.07, wx, y0 - 0.02, y1 + 0.02, 0.08, headH, frame);                                  // headboard
    box(g, fx0 + 0.04, wx - 0.08, y0 + 0.05, y1 - 0.05, 0.34, 0.58, linen);                         // mattress
    box(g, fx0 + 0.02, wx - 0.6, y0 + 0.02, y1 - 0.02, 0.5, 0.62, duvet);                           // duvet, turned down at the head
    box(g, fx0 + 0.01, fx0 + 0.55, y0, y1, 0.52, 0.64, throwM);                                      // throw across the foot
    const np = size === 'king' ? 3 : 2, pw = (mw - 0.1) / np;                                       // pillows standing against the headboard
    for (let i = 0; i < np; i++) { const a = y0 + 0.1 + i * pw + 0.02, b = a + pw - 0.04; box(g, wx - 0.3, wx - 0.1, a, b, 0.58, 0.82, pillow); box(g, wx - 0.55, wx - 0.3, a + 0.05, b - 0.05, 0.58, 0.7, pillow); }
    }
    if (bedside) {
      const oak = M.oak || (M.oak = new THREE.MeshStandardMaterial({ color: 0xc9a47a, roughness: 0.55 }));
      const shade = m('lampShade', 0xf1ece0, { emissive: 0x4a4436 });
      const lawson = bsStyle === 'lawson', bsTop = lawson ? 0.57 : 0.55;
      for (const [b0, b1] of [[y0 - 0.07 - bsW, y0 - 0.07], [y1 + 0.07, y1 + 0.07 + bsW]]) {
        const bx0 = wx - (lawson ? 0.43 : 0.4);
        if (lawson) {
          // Astin Sinclair 'Lawson' bedside (client 2026-10-21), walnut, 480 W x 430 D x 570 H: a plain box on a recessed
          // plinth, two equal drawers whose fronts carry a raised frame border, no handles
          const wal = M.lawsonWalnut || (M.lawsonWalnut = new THREE.MeshStandardMaterial({ map: walnutTexture(), color: 0xb89a86, roughness: 0.55 }));
          const dark = M.lawsonPlinth || (M.lawsonPlinth = new THREE.MeshStandardMaterial({ color: 0x3e2c22, roughness: 0.7 }));
          box(g, bx0 + 0.04, wx - 0.03, b0 + 0.035, b1 - 0.035, 0, 0.06, dark);                          // recessed plinth
          box(g, bx0 + 0.02, wx, b0, b1, 0.06, bsTop, wal);                                               // carcass and top
          const dh = (bsTop - 0.065) / 2;
          for (let i = 0; i < 2; i++) {
            const z0 = 0.065 + i * dh + 0.002, z1 = z0 + dh - 0.004, f = 0.022;
            box(g, bx0 + 0.004, bx0 + 0.02, b0 + 0.004, b1 - 0.004, z0, z1, wal);                          // drawer front
            for (const [a, c, za, zb] of [[b0 + 0.004, b1 - 0.004, z1 - f, z1], [b0 + 0.004, b1 - 0.004, z0, z0 + f], [b0 + 0.004, b0 + 0.004 + f, z0 + f, z1 - f], [b1 - 0.004 - f, b1 - 0.004, z0 + f, z1 - f]])
              box(g, bx0, bx0 + 0.004, a, c, za, zb, wal);                                                    // its raised frame border
          }
        } else {
        box(g, bx0, wx, b0, b1, 0.06, 0.55, oak);                                                   // carcass on short legs
        for (const x of [bx0 + 0.03, wx - 0.06]) for (const y of [b0 + 0.03, b1 - 0.06]) box(g, x, x + 0.03, y, y + 0.03, 0, 0.06, M.frameA);
        for (const [z0, z1] of [[0.08, 0.3], [0.32, 0.53]]) { box(g, bx0 - 0.012, bx0, b0 + 0.01, b1 - 0.01, z0, z1, oak); box(g, bx0 - 0.024, bx0 - 0.012, (b0 + b1) / 2 - 0.07, (b0 + b1) / 2 + 0.07, (z0 + z1) / 2 - 0.008, (z0 + z1) / 2 + 0.008, M.frameA); }
        }
        if (spec.renovation.decor === 'styled') {                                                   // a book or two at the front of each bedside
          const yb = (b0 + b1) / 2; let zz = bsTop;
          for (const [t, c, k] of [[0.03, 0xd8cdb8, 0], [0.024, 0x8d9aa6, 1]]) { box(g, bx0 + 0.006 + k * 0.006, bx0 + 0.118 - k * 0.006, yb - 0.11 + k * 0.01, yb + 0.06 - k * 0.01, zz, zz + t, decMat('book' + c.toString(16), c, { roughness: 0.8 })); zz += t; }
        }
        if (!lamps) continue;                                                                        // wall lights instead
        const lx = wx - 0.2, ly = (b0 + b1) / 2;                                                    // small lamp
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.25, 16), M.frameA); base.position.copy(L(lx, ly, bsTop + 0.125)); g.add(base);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 20, 1, true), shade); sh.material.side = THREE.DoubleSide; sh.position.copy(L(lx, ly, bsTop + 0.35)); g.add(sh);
      }
    }
    return { g, len: fl, width: fw };
  };
  // headboard wall 'west' (lot +x) or 'north' (lot -y): the local -x direction (toward the foot) turns to face into the room
  const bedProposed = ['proposed', 'corners'].includes(spec.renovation.bed_lights);   // their own bedside lights: no table lamps
  const placeBed = (bed, wall, wx, wy) => { bed.g.position.copy(L(wx, wy, 0)); bed.g.rotation.y = wall === 'north' ? -Math.PI / 2 : 0; G.furniture.add(bed.g); };
  // front bedroom: headboard on the west wall so it faces you from the hall door, centred north-south in the clear
  // space between the bay wall and the built-in
  if (spec.renovation.front_bed) {
    const FB = spec.renovation.front_bed, rm = spec.rooms.find(r => r.name === 'Front bedroom');
    placeBed(bedSet(FB.size, FB.bedside, 0.48, !bedProposed, spec.renovation.art === 'v2' ? 1.3 : 1.2, 'lawson', 'cloud'), 'west', rm.x1, frontBedY(spec));
  }
  // --- front bedroom window seat (client reference 2026-10-21): a built-in seat filling the bay and running straight
  // across its mouth 170 into the room (the bay is only ~350 deep inside), painted cream on a shadow-gap kick, its top
  // at 420; three dark-cream cushions following the bay's three facets, and two lumbar cushions against the glass.
  // Top of the cushions ~500, under the 800 sill.
  if (spec.renovation.bay_seat) {
    const fu = G.furniture, b = H.bay, fr = spec.rooms.find(r => r.name === 'Front bedroom'), ry = fr.y0, fz = fr.floor;
    const yIn = H.y_front_outer - b.projection + W.ext * 0.7 + 0.01, ys = ry + 0.17;            // bay's inside face, the seat front
    const pts = [[b.x0, ys], [b.x1, ys], [b.x1, ry], [b.front_x1 - 0.02, yIn], [b.front_x0 + 0.02, yIn], [b.x0, ry]];
    const cxp = (b.x0 + b.x1) / 2, cyp = (ys + yIn) / 2;
    const plan = (P, inset = 0) => new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(-(x + (cxp - x) * inset), -(y + (cyp - y) * inset))));
    const slab = (shape, z0, z1, mat, bevel = 0) => {                                          // a plan shape extruded up from z0 to z1
      const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, z0 + bevel, 0);
      const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; fu.add(m); return m;
    };
    const cream = M.seatCream || (M.seatCream = new THREE.MeshStandardMaterial({ color: 0xe9e1d0, roughness: 0.55 }));
    const cush = M.seatCushion || (M.seatCushion = new THREE.MeshStandardMaterial({ color: 0xc9b690, roughness: 0.95 }));
    const lumb = M.seatLumbar || (M.seatLumbar = new THREE.MeshStandardMaterial({ color: 0xd9cbb0, roughness: 0.95 }));
    slab(plan(pts, 0.025), fz, fz + 0.08, M.trimDark || cream);                                // shadow-gap kick, set back
    slab(plan(pts), fz + 0.08, fz + 0.42, cream);                                              // the box and its top
    const midA = [b.front_x0 + 0.02, yIn], midB = [b.front_x1 - 0.02, yIn];
    const facets = [                                                                           // a cushion per facet, 80 thick, soft edges
      [[b.x0 + 0.01, ys - 0.01], [midA[0], ys - 0.01], midA, [b.x0 + 0.01, ry]],
      [[midA[0] + 0.01, ys - 0.01], [midB[0] - 0.01, ys - 0.01], [midB[0] - 0.01, yIn], [midA[0] + 0.01, yIn]],
      [[midB[0], ys - 0.01], [b.x1 - 0.01, ys - 0.01], [b.x1 - 0.01, ry], midB],
    ];
    for (const f of facets) { const c = f.reduce((a, [x, y]) => [a[0] + x / f.length, a[1] + y / f.length], [0, 0]); slab(new THREE.Shape(f.map(([x, y]) => new THREE.Vector2(-(x + (c[0] - x) * 0.04), -(y + (c[1] - y) * 0.04)))), fz + 0.42, fz + 0.5, cush, 0.018); }
    for (const s2 of [-1, 1]) {                                                                // two lumbar cushions leaning on the front pane
      const c = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.26, 0.12, 4, 0.05), lumb);
      c.position.copy(L((b.front_x0 + b.front_x1) / 2 + s2 * 0.28, yIn + 0.09, fz + 0.5 + 0.12)); c.rotation.x = -0.25; c.castShadow = true; fu.add(c);
    }
  }
  // bedroom 2: the west wall has the window and the south wall is all robe, so the headboard goes on the north wall,
  // with the foot 690 short of the robe doors. The hall door swings in across the foot corner, so the bed sits 50 west
  // of centre to clear the open leaf; the window's shutters then open to 60 degrees to miss the window-side bedside.
  if (spec.renovation.bed2) {
    const B2 = spec.renovation.bed2, rm = spec.rooms.find(r => r.name === 'Bedroom 2');
    placeBed(bedSet(B2.size, B2.bedside, 0.42, !bedProposed), 'north', (rm.x0 + rm.x1) / 2 + 0.05, rm.y0);
  }
  // bedroom 3 study: a 1400 x 700 desk against the hall wall, between the door (north end of that wall) and the robe
  // across the south wall, so the window is at your side (no glare on the screen, no squinting into daylight).
  // White frame, light oak top, a 27-inch monitor on a stand, keyboard and mouse, and a mesh-back office chair on a
  // five-star base, pulled out a little. Built facing -y with its back edge at y = 0, then turned onto the wall.
  // A second, slightly smaller desk (1200 x 600) set the same way stands in the north-west corner against the north wall,
  // its west end 20 off the window wall: the window at your left, the door's swing along the other end of that wall.
  // (It sits in front of the bottom of the window's north end, so that shutter panel can't open fully past it.)
  if (spec.renovation.study) {
    const rm = spec.rooms.find(r => r.name === 'Bedroom 3');
    const yDoor = spec.renovation.bedroom3.door_y1, yRobe = 14.29;                                   // robe front (see the robe above)
    const desk = (x, y, rot, dw, dd) => {
    const fu = new THREE.Group(); fu.position.copy(L(x, y, 0)); fu.rotation.y = rot; G.furniture.add(fu);
    const white = M.deskWhite || (M.deskWhite = new THREE.MeshStandardMaterial({ color: 0xf2f1ed, roughness: 0.5 }));
    const oak = M.oak || (M.oak = new THREE.MeshStandardMaterial({ color: 0xc9a47a, roughness: 0.55 }));
    const black = M.techBlack || (M.techBlack = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.45, metalness: 0.2 }));
    const screen = M.screenGlass || (M.screenGlass = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.12, metalness: 0.1 }));
    const mesh = M.chairMesh || (M.chairMesh = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.9 }));
    const alu = M.chairAlu || (M.chairAlu = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.35, metalness: 0.8 }));
    const dh = 0.73, cx = 0, yb = 0, yf = yb - dd, x0 = cx - dw / 2, x1 = cx + dw / 2;
    box(fu, x0, x1, yf, yb, dh - 0.025, dh, oak);                                                   // 25 mm top
    for (const x of [x0 + 0.04, x1 - 0.08]) {                                                       // two white trestle ends
      box(fu, x, x + 0.04, yf + 0.06, yb - 0.04, 0, 0.03, white); box(fu, x, x + 0.04, yf + 0.06, yb - 0.04, dh - 0.065, dh - 0.025, white);
      for (const y of [yf + 0.08, yb - 0.08]) box(fu, x, x + 0.04, y, y + 0.03, 0.03, dh - 0.065, white);
    }
    box(fu, x0 + 0.08, x1 - 0.08, yb - 0.1, yb - 0.08, dh - 0.12, dh - 0.025, white);               // modesty rail at the back
    // monitor: 615 x 365 panel, 20 thick, on a slim stand, 150 in from the wall
    const my = yb - 0.2;
    box(fu, cx - 0.12, cx + 0.12, my - 0.09, my + 0.09, dh, dh + 0.012, black);                     // foot
    box(fu, cx - 0.025, cx + 0.025, my + 0.02, my + 0.05, dh, dh + 0.3, black);                      // neck
    box(fu, cx - 0.3075, cx + 0.3075, my - 0.02, my + 0.0, dh + 0.1, dh + 0.465, black);             // housing
    box(fu, cx - 0.3, cx + 0.3, my - 0.023, my - 0.02, dh + 0.11, dh + 0.455, screen);               // glass, facing the chair
    box(fu, cx - 0.22, cx + 0.22, yf + 0.12, yf + 0.25, dh, dh + 0.018, black);                      // keyboard
    const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), black); mouse.scale.set(1, 0.45, 1.6); mouse.position.copy(L(cx + 0.34, yf + 0.2, dh + 0.012)); fu.add(mouse);
    // chair, facing the desk (toward +y), seat front 250 in front of the desk edge
    const ch = new THREE.Group(); ch.position.copy(L(cx, yf - 0.5, 0)); fu.add(ch);
    for (let i = 0; i < 5; i++) {                                                                   // five-star base and castors
      const a = i * 2 * Math.PI / 5, ex = Math.cos(a) * 0.32, ey = Math.sin(a) * 0.32;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.045), alu); leg.position.copy(L(ex / 2, ey / 2, 0.085)); leg.rotation.y = Math.atan2(-ey, -ex); ch.add(leg);
      const cas = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), black); cas.position.copy(L(ex, ey, 0.03)); ch.add(cas);
    }
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.34, 16), alu); col.position.copy(L(0, 0, 0.26)); ch.add(col);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.07, 0.48, 3, 0.025), mesh); seat.position.copy(L(0, 0.02, 0.47)); ch.add(seat);
    box(ch, -0.04, 0.04, -0.3, -0.24, 0.44, 0.62, black);                                            // back spine
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.55, 0.035, 3, 0.05), mesh); back.position.copy(L(0, -0.27, 0.92)); back.rotation.x = -0.12; ch.add(back);
    for (const x of [-0.26, 0.23]) { box(ch, x, x + 0.03, -0.05, 0.0, 0.5, 0.68, black); box(ch, x - 0.01, x + 0.04, -0.14, 0.12, 0.68, 0.7, black); }   // armrests
    };
    desk(rm.x0 + 0.02, (yDoor + 0.1 + yRobe) / 2, Math.PI / 2, 1.4, 0.7);                           // on the hall wall
    desk(rm.x1 - 0.02 - 0.6, rm.y0 + 0.02, Math.PI, 1.2, 0.6);                                       // north-west corner, on the north wall
  }
  // --- plantation shutters (Reno sheet) on the bedroom windows: bedroom 2 and bedroom 3 on the west wall, and the three
  // faces of the front bedroom's bay. White, 89 mm louvres tilted part open, a divider rail on tall panels, a frame round
  // each opening on the wall face; two panels per window hinged on the jambs that swing into the room (Open shutter / E)
  if (spec.renovation.shutters) {
    const white = M.shutter || (M.shutter = new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.45 }));
    white.userData.skyRoomSide = true;                                                        // light-grid lookup on the room side (main.js)
    const mk = (parent, w, h, d, x, y, z, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), white); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = m.receiveShadow = true; m.userData.door = true; parent.add(m); return m; };
    // (cx, cy): middle of the opening on the room face of the wall; (nx, ny): lot direction into the room
    const shutterWindow = (cx, cy, nx, ny, w, z0, z1, open = 0.5) => {
      const n3 = L(nx, ny, 0), phi = Math.atan2(n3.x, n3.z), h = z1 - z0;
      const frame = new THREE.Group(); frame.position.copy(L(cx, cy, z0)); frame.rotation.y = phi; int_.add(frame);
      // in-reveal fit: a 40 mm frame lines the opening, flush with the room face of the wall, so nothing reaches past the
      // window (the bay's short angled faces leave no room for a face-fixed frame at their corners)
      // kept 3 mm clear of the reveal lining and sill and 4 mm proud of the wall face, so no faces coincide (no flicker)
      const fw = 0.04, fd = 0.035, e = 0.003, zc = -fd / 2 + 0.004;
      mk(frame, fw, h - 2 * e, fd, -w / 2 + e + fw / 2, h / 2, zc); mk(frame, fw, h - 2 * e, fd, w / 2 - e - fw / 2, h / 2, zc);
      mk(frame, w - 2 * e - 2 * fw, fw, fd, 0, h - e - fw / 2, zc); mk(frame, w - 2 * e - 2 * fw, fw, fd, 0, e + fw / 2, zc);
      const hp = h - 2 * fw - 0.012, pw = (w - 2 * fw) / 2 - 0.007, split = hp > 1.3 ? hp * 0.55 : null;
      for (const [hx, dir] of [[-w / 2 + e + fw, 1], [w / 2 - e - fw, -1]]) {
        const assembly = new THREE.Group(); assembly.position.copy(frame.position); assembly.rotation.y = phi;
        assembly.userData.operable = true; assembly.userData.open = false; assembly.userData.kind = 'shutter'; int_.add(assembly);
        const pivot = new THREE.Group(); pivot.position.set(hx, e + fw + 0.003, 0.006);
        const X = (a) => dir * a;                                                                // along the panel from the hinge
        mk(pivot, 0.045, hp, 0.028, X(0.0225), hp / 2, 0); mk(pivot, 0.045, hp, 0.028, X(pw - 0.0225), hp / 2, 0);   // stiles
        const rails = [0.0375, hp - 0.0375].concat(split ? [split] : []);
        for (const ry of rails) mk(pivot, pw - 0.09, 0.075, 0.028, X(pw / 2), ry, 0);
        // louvres between the rails, 89 wide at about 80 centres, tilted 30 degrees open. Each band is filled evenly so
        // the end louvres tuck 2 mm into the rails: a louvre spaced off a rail left a slot you could see the window through
        const lh = 0.089 * Math.cos(0.52) + 0.01 * Math.sin(0.52);                                 // height of a tilted louvre
        const bands = split ? [[0.075, split - 0.0375], [split + 0.0375, hp - 0.075]] : [[0.075, hp - 0.075]];
        for (const [b0, b1] of bands) {
          const n = Math.max(1, Math.round((b1 - b0 - lh + 0.004) / 0.08) + 1), step = n > 1 ? (b1 - b0 - lh + 0.004) / (n - 1) : 0;
          for (let i = 0; i < n; i++) mk(pivot, pw - 0.086, 0.089, 0.01, X(pw / 2), b0 - 0.002 + lh / 2 + i * step, 0, -0.52);   // 2 mm into each stile
        }
        // the second panel carries a T-astragal on the room side of its meeting stile, over the gap between the panels
        if (dir < 0) mk(pivot, 0.04, hp, 0.006, X(pw), hp / 2, 0.017);
        pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = -dir * open * Math.PI;
        assembly.add(pivot);
      }
    };
    const xi = H.x_west_inner;
    // bedrooms 2 and 3 have sheers and roller blinds instead (client 2026-10-21); the shutters stay in the front bay
    for (const k of []) { const wn = Win[k]; shutterWindow(xi, (wn.y0 + wn.y1) / 2, -1, 0, wn.y1 - wn.y0, wn.sill, wn.head, k === 'W1_bed2' && spec.renovation.bed2 ? 1 / 3 : 0.5); }   // bedroom 2: 60 degrees, clear of the bedside
    // bay: each face's glass on the inner face of its wall (pane inset 0.12 from the outer corners, as the bay is built)
    const b = H.bay, t = W.ext, yf = H.y_front_outer - b.projection;
    for (const [p, q] of [[[b.x1, H.y_front_outer], [b.front_x1, yf]], [[b.front_x1, yf], [b.front_x0, yf]], [[b.front_x0, yf], [b.x0, H.y_front_outer]]]) {
      const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      let nx = dy / len, ny = -dx / len; if (ny < 0) { nx = -nx; ny = -ny; }                    // normal into the house
      const mx = (p[0] + q[0]) / 2 + nx * t, my = (p[1] + q[1]) / 2 + ny * t;
      shutterWindow(mx, my, nx, ny, len - 0.24, b.sill, b.head);                        // same pane width the bay is built with
    }
  }
  // --- bedrooms 2 and 3 (client 2026-10-21, replacing their plantation shutters): a roller blind face-fixed on the wall
  // above the window (linen-look blockout in an 80 mm white cassette, shown lowered a little) and floor-to-ceiling sheers on a
  // ceiling track 260 off the wall, clear of the cornice and the split systems, gathered open either side of the window
  {
    const xi = H.x_west_inner;
    const sheerMat = M.sheer || (M.sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.84, side: THREE.DoubleSide, depthWrite: false }));
    const track = M.track || (M.track = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.5 }));
    const cass = M.blindCass || (M.blindCass = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.45 }));
    const fabric = M.blindFab || (M.blindFab = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.9 }));
    fabric.userData.skyRoomSide = true; cass.userData.skyRoomSide = true;
    for (const [k, rn] of [['W1_bed2', 'Bedroom 2'], ['W2_living', 'Bedroom 3']]) {
      const wn = Win[k], rm = spec.rooms.find(r => r.name === rn); if (!wn || !rm) continue;
      // roller blind, face-fixed on the wall above the window (client): an 80 x 80 cassette just over the architrave, the
      // fabric 100 wider than the window each side so it covers the architrave too, shown lowered a little
      rollerBlind(int_, 'y', xi, -1, wn.y0, wn.y1, wn.head + 0.075);
      if (!spec.renovation.curtains) continue;
      const zc = rm.floor + rm.ceil, x = xi - 0.26, a0 = Math.max(rm.y0 + 0.02, wn.y0 - 0.2), a1 = Math.min(rm.y1 - 0.02, wn.y1 + 0.2);
      box(int_, x - 0.016, x + 0.016, a0, a1, zc - 0.022, zc, track);
      const stack = (s0, s1) => {                                                              // gathered sheer, deep S-folds at 90 pitch
        const n = Math.ceil((s1 - s0) / 0.004), rows = 14, zB = rm.floor + 0.012, zT = zc - 0.025, pos = [], idx = [];
        for (let i = 0; i <= n; i++) {
          const u = s0 + (s1 - s0) * i / n, w = Math.sin(2 * Math.PI * (u - s0) / 0.09), sw = Math.sign(w) * Math.pow(Math.abs(w), 0.6);
          for (let r = 0; r <= rows; r++) { const z = zB + (zT - zB) * r / rows, v = L(x - 0.07 - 0.06 * sw * (1 + 0.35 * (1 - r / rows)), u, z); pos.push(v.x, v.y, v.z); if (i && r) { const q = i * (rows + 1) + r, qp = q - (rows + 1); idx.push(qp - 1, q - 1, qp, q - 1, q, qp); } }
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, sheerMat); m.renderOrder = 2; m.castShadow = false; int_.add(m);
      };
      stack(a0, Math.min(a0 + 0.38, wn.y0 + 0.18)); stack(Math.max(a1 - 0.38, wn.y1 - 0.18), a1);
    }
  }
  // --- light switches (2026-10-21; layout in SWITCHES.md). Latch side of each door, ~100 off the architrave, centre 1.05;
  // a rotary dimmer for each dimmed circuit, rockers for the rest. Plates live in G.switches so they can be found
  {
    const SW = spec.renovation.switches = [];
    const sw = (room, along, face, inward, u, gangs, dim, label) => { switchPlate(int_, along, face, inward, u, 1.05, gangs, { dim }); SW.push({ room, along, face, u, gangs, dim, label }); };
    // entry: just inside the front door on the latch (west) side: hall pendants (2-way with the kitchen end, dimmer) + porch light
    sw('Entry', 'y', 1.47, -1, 5.0, 1, 1, 'hall pendants (2-way, dimmer); porch light');
    // front bedroom and bedroom 2: the joinery (open shelving, robe) runs right up to each door's south jamb, so both doors
    // are rehung on that jamb (opening against the joinery) and the plate goes inside on the latch (north) side
    sw('Front bedroom', 'y', 1.58, 1, D.front_bed.y0 - 0.125, 1, 1, 'pendant (dimmer); robe-top + floor strips');
    sw('Bedroom 2', 'y', 1.41, 1, D.bed2.y0 - 0.125, 1, 1, 'pendant (dimmer); robe-top + floor strips');
    // bedroom 3: inside, latch side (south) of its door
    sw('Bedroom 3', 'y', 1.41, 1, 12.8, 1, 1, 'pendant (dimmer); robe-top + floor strips');
    // kitchen: on the party wall just inside the hall opening, where the hall ends: hall pendants (2-way), the bench task
    // lights (tape + sink pair), table + buffet downlights (dimmer)
    sw('Kitchen / dining', 'y', 0.115, 1, 15.3, 2, 1, 'hall pendants (2-way); bench task light; table + buffet (dimmer)');
    // lounge: on the kitchen's west wall at its south end, past the bench return, where you walk through into the lounge
    // (the strip beside the side glass door was too cramped): pelmet + skylight (dimmer), wall lights (dimmer), joinery glow
    sw('Lounge / living', 'y', 4.69, -1, 18.95, 1, 2, 'pelmet wash + skylight (dimmer); TV wall lights (dimmer); joinery glow');
    // bathroom: outside, on the kitchen side of the bath door's latch (inside, the room ends at the latch jamb): light + fan
    sw('Bath', 'x', 18.88, -1, 2.12, 2, 0, 'bathroom light; exhaust fan (run-on timer)');
  }
  // --- power points found on site (photo and video survey 2026-10-21, POWER-POINTS.md): the ones that survive the
  // renovation, at the height they sit now (on or just above the skirting). Positions along the wall are +-0.2-0.4 m.
  {
    const GP = spec.renovation.gpos = [];
    const gp = (room, along, face, inward, u, z, kind, note) => { gpoPlate(int_, along, face, inward, u, z, kind); GP.push({ room, along, face, u, z, kind, note }); };
    gp('Front bedroom', 'y', H.x_west_inner, -1, 6.4, 0.3, 'double', 'west wall, ~1 m north of the robe: behind the south bedside');
    gp('Bedroom 3', 'y', H.x_west_inner, -1, 13.75, 0.2, 'double', 'old living west wall, just south of W2 (the gas heater beside it goes)');
    gp('Bedroom 3', 'y', H.x_west_inner, -1, 12.9, 0.16, 'phone', 'old living, under W2 at the skirting (low confidence: may be a loose adapter)');
  }
  // --- lounge roller blinds above the big glazing (client 2026-10-21): the west glass wall and the rear sliders
  {
    const Lg = spec.renovation.lounge, fz = loungeFloor;
    for (const w of Lg.windows.filter(w => w.floorGlass)) rollerBlind(int_, 'y', Lg.wall_x, -1, w.y0, w.y1, fz + w.head + 0.02);
    // the side glass door in the north wall: over its architrave, kept inside the room
    if (Lg.side_door) rollerBlind(int_, 'x', H.y_rear_outer, 1, Lg.side_door[0] + 0.02, Math.min(Lg.side_door[1], Lg.wall_x - 0.13), fz + Lg.slider_head + 0.075);
    const bd = Lg.back_door; if (bd) rollerBlind(int_, 'x', Lg.south_y, -1, Math.max(bd.from, Lg.wall_x - 3.76 + 0.1), Math.min(bd.to ?? bd.from + bd.w, Lg.wall_x - 0.1), fz + bd.h + 0.02);
  }
  // --- sheer curtains (Reno sheet): floor-to-ceiling white sheers on a ceiling track over every glazed opening in the
  // lounge (the two west windows, the rear sliders, the side glass door), pulled open and bunched either side.
  // Soft folds, see-through, and they don't cast shadows, so daylight still comes in filtered rather than blocked.
  if (spec.renovation.curtains) {
    const Lg = spec.renovation.lounge, fz = loungeFloor, cz = Lg.ceil_z, ex = H.wing.x_outer + 0.02, wx = Lg.wall_x - 0.02;
    const sheerMat = M.sheer || (M.sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.84, side: THREE.DoubleSide, depthWrite: false }));
    const track = M.track || (M.track = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.5 }));
    // a curtain along lot 'x' or 'y' from a0 to a1, hanging in the plane 'at' (the other coordinate), folds of depth amp
    // one S-fold (wave) stack of sheer from a0 to a1 along the track, hanging in the plane 'at': deep rounded folds that
    // fan out a little toward the hem, an opaque heading band at the top, and a glider on the track at every fold
    const heading = M.sheerHead || (M.sheerHead = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    const glider = M.glider || (M.glider = new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: 0.4 }));
    const stack = (along, a0, a1, at, amp, pitch, trackAt) => {
      if (a1 - a0 < 0.05) return;
      const n = Math.ceil((a1 - a0) / 0.005), rows = 14, zB = fz + 0.012, zT = cz - 0.003, zH = zT - 0.09;   // heading runs right up to the ceiling, over the track
      const sheet = (z0, z1, rws, mat, flare) => {
        const pos = [], idx = [];
        for (let i = 0; i <= n; i++) {
          const u = a0 + (a1 - a0) * i / n, w = Math.sin(2 * Math.PI * (u - a0) / pitch);
          const sw = Math.sign(w) * Math.pow(Math.abs(w), 0.6);                          // rounder crests than a plain sine
          for (let r = 0; r <= rws; r++) {
            const z = z0 + (z1 - z0) * r / rws, down = flare ? 1 - (z - zB) / (zT - zB) : 0;
            const off = amp * sw * (1 + 0.35 * down), v = along === 'x' ? L(u, at + off, z) : L(at + off, u, z);
            pos.push(v.x, v.y, v.z);
            if (i && r) { const k = i * (rws + 1) + r, kp = k - (rws + 1); idx.push(kp - 1, k - 1, kp, k - 1, k, kp); }
          }
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.renderOrder = 2; int_.add(m);
      };
      sheet(zB, zH, rows, sheerMat, true);                                                   // the sheer drop
      sheet(zH, zT, 1, heading, false);                                                      // heading tape
      // gliders run in the track behind the fabric, each on a short arm to the heading's back: hidden from the room
      const q0 = Math.min(trackAt, at), q1 = Math.max(trackAt, at);
      for (let u = a0 + pitch / 2; u < a1; u += pitch / 2) {
        if (along === 'x') box(int_, u - 0.006, u + 0.006, q0, q1, zT - 0.01, cz - 0.022, glider);
        else box(int_, q0, q1, u - 0.006, u + 0.006, zT - 0.01, cz - 0.022, glider);
      }
    };
    // a pair of curtains on a slim ceiling-fixed track 150 past each side of the glass, both pulled open: each gathers
    // into a stack about 380 wide beside the opening, overlapping the glass by 80
    // 'at' is the track line; the fabric hangs 'inward' (+1/-1 along the other axis) clear of it, so it stands off the
    // wall and any sill or architrave and hides the track and gliders behind it
    const sheer = (along, a, b, lo, hi, at, inward, amp, pitch, sides = 'both') => {   // sides: 'both', or 'hi' (the high-coordinate side only)
      const t0 = Math.max(a - 0.15, lo), t1 = Math.min(b + 0.15, hi), fab = at + inward * (amp + 0.025);
      const tb = (p0, p1, q0, q1, z0, z1, m) => along === 'x' ? box(int_, p0, p1, q0, q1, z0, z1, m) : box(int_, q0, q1, p0, p1, z0, z1, m);
      tb(t0, t1, at - 0.016, at + 0.016, cz - 0.022, cz, track);                              // 32 x 22 aluminium track, white powdercoat
      tb(t0, t1, at - 0.004, at + 0.004, cz - 0.024, cz - 0.022, glider);                     // its running slot
      for (const e of [t0, t1 - 0.012]) tb(e, e + 0.012, at - 0.019, at + 0.019, cz - 0.026, cz, track);   // end caps
      // each stack at least 240 wide: where a wall leaves no room beside the glass, it gathers over the frame instead
      const s0 = Math.max(a - 0.3, lo), e0 = Math.max(a + 0.08, s0 + 0.24), e1 = Math.min(b + 0.3, hi), s1 = Math.min(b - 0.08, e1 - 0.24);
      if (sides === 'both') stack(along, s0, e0, fab, amp, pitch, at);
      stack(along, s1, e1, fab, amp, pitch, at);
    };
    // west windows: hung just off the wall, between it and the sofa's back (the sofa sits 60 off the wall), so shallow folds
    // west windows: track 90 off the wall so the fabric clears the sill board; the sofa moves out to suit (see below)
    for (const w of Lg.windows) sheer('y', w.y0, w.y1, H.y_rear_outer + 0.02, Lg.south_y - 0.02, Lg.wall_x - 0.09, -1, 0.035, 0.08);
    for (const [a, b] of Lg.door_pairs) sheer('x', a, b, ex, wx, Lg.south_y - 0.07, -1, 0.05, 0.1);                 // rear sliders
    sheer('x', Lg.side_door[0], Lg.side_door[1], ex, wx, H.y_rear_outer + 0.07, 1, 0.05, 0.1, 'hi');                 // side glass door: one stack, on its west (left from inside) side
  }
  // --- lounge: TV on the east wall, L-shaped couch on the west wall (spec.renovation.lounge_furniture) ---
  {
    const LF = spec.renovation.lounge_furniture, fu = G.furniture, fz = loungeFloor;
    const fabric = M.fabric || (M.fabric = new THREE.MeshStandardMaterial({ color: 0x9a9892, roughness: 0.95 }));
    const cushion = M.cushion || (M.cushion = new THREE.MeshStandardMaterial({ color: 0xa8a69f, roughness: 0.95 }));
    const walnut = M.walnut || (M.walnut = new THREE.MeshStandardMaterial({ color: 0x5b4030, roughness: 0.6 }));
    // TV unit, centred under the TV on the east wall: the white drawer cabinet, or one of two showroom pieces (Reno)
    const walnutWall = spec.renovation.lounge_style === 'walnut';
    const tvu = walnutWall ? 'none' : spec.renovation.tv_unit, tvC = LF.tv.y, wallX = LF.tv_cabinet.x0;
    const oakNat = M.oakNat || (M.oakNat = new THREE.MeshStandardMaterial({ color: 0xd6b38a, roughness: 0.6 }));
    const oakShade = M.oakShade || (M.oakShade = new THREE.MeshStandardMaterial({ color: 0x8e7457, roughness: 0.8 }));
    const trav = M.travertine || (M.travertine = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.45 }));
    if (tvu === 'rimowar') {
      // Rimowar, oak with natural finish, 2200 x 440 x 500: a slab with softly rounded corners on two round plinths;
      // from one end a long door, an open shelving niche (shelf and a divider below it), then a shorter door
      const w = 2.2, d = 0.44, cx = wallX + d / 2 + 0.005, fx = wallX + d + 0.005;
      planSlab(fu, cx, tvC, w, d, 0.07, fz + 0.09, fz + 0.47, oakNat);
      planSlab(fu, cx, tvC, w, d, 0.07, fz + 0.47, fz + 0.5, oakNat);                                  // top slab
      for (const u of [-0.62, 0.62]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 24), oakNat); f.position.copy(L(cx, tvC + u, fz + 0.045)); f.castShadow = true; fu.add(f); }
      const n0 = tvC + 0.18, n1 = tvC + 0.62, zb = fz + 0.12, zt = fz + 0.44;                          // the open niche
      box(fu, fx - 0.001, fx + 0.001, n0, n1, zb, zt, oakShade);                                       // its shadowed back, read on the front face
      box(fu, fx, fx + 0.004, n0, n1, (zb + zt) / 2 - 0.01, (zb + zt) / 2 + 0.01, oakNat);             // shelf
      box(fu, fx, fx + 0.004, (n0 + n1) / 2 - 0.01, (n0 + n1) / 2 + 0.01, zb, (zb + zt) / 2, oakNat); // divider below it
      for (const y of [n0 - 0.004, n1]) box(fu, fx, fx + 0.002, y, y + 0.004, fz + 0.1, fz + 0.46, M.frameA);   // door joints
    } else if (tvu === 'capello') {
      // Capello, oak frame with a travertine-look marble top, 2000 x 420 x 600: full half-round ends, four flat doors
      // across the front, and a round travertine plinth under each end
      const w = 2.0, d = 0.42, cx = wallX + d / 2 + 0.005, fx = wallX + d + 0.005, r = d / 2;
      planSlab(fu, cx, tvC, w, d, r, fz + 0.12, fz + 0.57, oakNat);
      planSlab(fu, cx, tvC, w + 0.01, d + 0.01, r + 0.005, fz + 0.57, fz + 0.6, trav);                 // stone top
      for (const u of [-(w / 2 - r), w / 2 - r]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.01, r - 0.01, 0.12, 32), trav); f.position.copy(L(cx, tvC + u, fz + 0.06)); f.castShadow = true; fu.add(f); }
      const s0 = tvC - (w / 2 - r), s1 = tvC + (w / 2 - r), dw = (s1 - s0) / 4;
      for (let i = 0; i <= 4; i++) box(fu, fx, fx + 0.002, s0 + i * dw - 0.002, s0 + i * dw + 0.002, fz + 0.14, fz + 0.56, M.frameA);   // door joints
    } else if (tvu === 'archie') {
      // Archie (spec.renovation.tv_units.archie), 2000 x 400 x 460: cream fluted body with half-round ends, a thin white
      // marble-look sintered stone top, a recessed taupe plinth, four doors across the front
      const w = 2.0, d = 0.4, cx = wallX + d / 2 + 0.005, fx = wallX + d + 0.005, r = d / 2;
      const flute = M.flute || (M.flute = new THREE.MeshStandardMaterial({ map: fluteTexture(), roughness: 0.7 }));
      flute.map.repeat.set(50, 1);                                                                        // a reed every 20 mm
      const sinter = M.sinter || (M.sinter = new THREE.MeshStandardMaterial({ map: veinTexture(), roughness: 0.25 }));
      const taupe = M.plinthTaupe || (M.plinthTaupe = new THREE.MeshStandardMaterial({ color: 0x9c8a73, roughness: 0.5, metalness: 0.2 }));
      planSlab(fu, cx, tvC, w - 0.06, d - 0.06, r - 0.03, fz, fz + 0.035, taupe);                          // recessed plinth
      planSlab(fu, cx, tvC, w, d, r, fz + 0.035, fz + 0.445, flute);
      planSlab(fu, cx, tvC, w, d, r, fz + 0.445, fz + 0.46, sinter);                                       // top (its UVs are in metres: one vein tile a metre)
      const s0 = tvC - (w / 2 - r), s1 = tvC + (w / 2 - r), dw = (s1 - s0) / 4;
      for (let i = 0; i <= 4; i++) box(fu, fx, fx + 0.002, s0 + i * dw - 0.002, s0 + i * dw + 0.002, fz + 0.05, fz + 0.44, M.frameA);   // door joints
    } else if (tvu !== 'none') {
    // low TV cabinet with drawer fronts and a slim plinth
    const tc = LF.tv_cabinet;
    const tcMat = tc.colour === 'white' ? (M.kWhite || (M.kWhite = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.55 }))) : walnut;
    box(fu, tc.x0 + 0.02, tc.x1, tc.y0, tc.y1, fz + 0.06, fz + tc.h, tcMat);
    box(fu, tc.x0 + 0.06, tc.x1 - 0.04, tc.y0 + 0.05, tc.y1 - 0.05, fz, fz + 0.06, M.grille);
    const nd = Math.max(2, Math.round((tc.y1 - tc.y0) / 0.6)), dw = (tc.y1 - tc.y0) / nd;   // drawer fronts about 600 wide
    for (let i = 0; i < nd; i++) {
      const y0 = tc.y0 + i * dw;
      box(fu, tc.x1, tc.x1 + 0.006, y0 + 0.004, y0 + dw - 0.004, fz + 0.1, fz + tc.h - 0.04, tcMat);
      box(fu, tc.x1 + 0.006, tc.x1 + 0.014, y0 + dw / 2 - 0.12, y0 + dw / 2 + 0.12, fz + tc.h - 0.12, fz + tc.h - 0.1, steelMat());   // silver pulls
    }
    }
    // wall-mounted TV: thin black panel with a dark screen face
    const tv = LF.tv, ty0 = tv.y - tv.w / 2, ty1 = tv.y + tv.w / 2, tz0 = fz + tv.bottom, tz1 = tz0 + tv.h;
    box(fu, tv.wall_x + 0.012, tv.wall_x + 0.05, ty0, ty1, tz0, tz1, M.grille);
    box(fu, tv.wall_x + 0.05, tv.wall_x + 0.054, ty0 + 0.01, ty1 - 0.01, tz0 + 0.01, tz1 - 0.01, M.frameA);
    // --- Walnut + stone TV wall (Reno: Lounge > TV wall; reference-photos/inspiration/lounge-fireplace-wall, without its
    // fireplace and chimney breast): a floating walnut drawer run the length of the wall under a thick honed limestone
    // top; walnut floating shelves over its left end; the TV lifted to clear the styling on the stone, a soundbar under it.
    if (walnutWall) {
      const wx = tv.wall_x;
      const walnutH = M.walnutRun || (M.walnutRun = new THREE.MeshStandardMaterial({ map: walnutTexture(), roughness: 0.55 }));
      walnutH.map.center.set(0.5, 0.5); walnutH.map.rotation = Math.PI / 2;                 // grain runs along the run, as in the photo
      const lime = M.limestone || (M.limestone = new THREE.MeshStandardMaterial({ map: limestoneTexture(), roughness: 0.7 }));
      // the run: 200 clear under it, 260 of drawers, 100 of stone (top at 560); 450 deep, stone 480 with a 30 overhang
      const by0 = 19.62, by1 = 23.6, zb = fz + 0.2, zd = fz + 0.46, zt = fz + 0.56, dep = 0.45;
      box(fu, wx, wx + dep - 0.02, by0, by1, zb, zd, walnutH);                                // carcase
      const nb = Math.round((by1 - by0) / 0.95), bw = (by1 - by0) / nb;                     // push-to-open drawer fronts, about 1 m each
      for (let i = 0; i < nb; i++) surfUV(box(fu, wx + dep - 0.02, wx + dep, by0 + i * bw + 0.0015, by0 + (i + 1) * bw - 0.0015, zb, zd - 0.003, walnutH), [1.6, 0.8]);
      surfUV(box(fu, wx + dep - 0.001, wx + dep + 0.001, by0, by1, zb + 0.002, zb + 0.004, M.grille), [1, 1]);   // shadow line under the fronts
      if (spec.renovation.kl_lights !== 'grid') {                                             // soft floor glow from under the floating run
        box(fu, wx + dep - 0.07, wx + dep - 0.05, by0 + 0.05, by1 - 0.05, zb - 0.006, zb, bedGlow('lJoin'));
        G.ceilings.userData.bedLamps.lines.push({ room: 'Lounge / living', layer: 'lJoin', mode: 1, along: 'y', x0: by0 + 0.05, x1: by1 - 0.05, y: wx + dep - 0.06, z: zb - 0.01, ay: 0.3, az: -0.95, lmPerM: 150 });
      }
      const top = box(fu, wx, wx + 0.48, by0, by1 + 0.03, zd, zt, lime); surfUV(top, LIME_TILE);
      // floating walnut shelves over the left end of the run: 860 long, 250 deep, 50 thick
      const shY1 = 20.5, styY = 21.15;
      for (const z of [1.3, 1.7, 2.1]) box(fu, wx, wx + 0.25, by0 + 0.02, shY1, fz + z, fz + z + 0.05, walnutH);
      // styling, as in the photo: stacked white vase and a green glass one on the stone left of the TV,
      // a brown amphora under the shelves, and on the shelves a pair of vases, a mushroom lamp, and books with a lidded box
      const cer = (col, rough = 0.6) => M['cer' + col] || (M['cer' + col] = new THREE.MeshStandardMaterial({ color: col, roughness: rough }));
      const lathe = (pts, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 28), mat); m.position.copy(L(x, y, z)); m.castShadow = true; fu.add(m); return m; };
      const dx = wx + 0.24;
      const styled = spec.renovation.decor === 'styled';
      if (!styled) {                                                                           // the earlier styling, from the photo
        lathe([[0, 0], [0.05, 0.005], [0.06, 0.05], [0.035, 0.1], [0.055, 0.15], [0.05, 0.2], [0.03, 0.23], [0.032, 0.25], [0, 0.25]], cer(0xeeeae2), dx, styY + 0.32, zt);
        lathe([[0, 0], [0.04, 0.002], [0.045, 0.06], [0.04, 0.13], [0.025, 0.15], [0, 0.15]], M.fireGlassGreen || (M.fireGlassGreen = new THREE.MeshPhysicalMaterial({ color: 0x3d5a3a, transparent: true, opacity: 0.75, roughness: 0.1 })), dx + 0.04, styY + 0.18, zt);
        lathe([[0, 0], [0.05, 0.005], [0.075, 0.08], [0.07, 0.16], [0.035, 0.22], [0.028, 0.27], [0.04, 0.29], [0, 0.29]], cer(0x6b4a35, 0.8), wx + 0.2, (by0 + shY1) / 2, zt);
        plantModel(fu, 'rhyzome', wx + 0.22, (by0 + shY1) / 2 + 0.34, zt, 0.5, 2.2, null, 0.42);   // house plant beside the amphora, toward the TV
      }
      lathe([[0, 0], [0.03, 0], [0.05, 0.05], [0.055, 0.1], [0.04, 0.15], [0.025, 0.17], [0.028, 0.19], [0, 0.19]], cer(styled ? 0xd9cbb4 : 0xf2efe9, styled ? 0.8 : 0.4), wx + 0.14, (by0 + shY1) / 2 + 0.06, fz + 2.15);
      lathe([[0, 0], [0.02, 0], [0.03, 0.04], [0.02, 0.07], [0, 0.07]], cer(styled ? 0xb5673f : 0xf2efe9, styled ? 0.5 : 0.4), wx + 0.12, (by0 + shY1) / 2 - 0.13, fz + 2.15);
      lathe([[0, 0], [0.04, 0], [0.012, 0.03], [0.012, 0.16], [0.09, 0.2], [0.095, 0.22], [0, 0.24]], cer(0x9c7b52, 0.5), wx + 0.13, (by0 + shY1) / 2, fz + 1.75);
      box(fu, wx + 0.02, wx + 0.23, (by0 + shY1) / 2 - 0.18, (by0 + shY1) / 2 + 0.12, fz + 1.35, fz + 1.4, cer(0x3d352c, 0.8));   // books
      box(fu, wx + 0.05, wx + 0.18, (by0 + shY1) / 2 - 0.12, (by0 + shY1) / 2 + 0.0, fz + 1.4, fz + 1.44, cer(0xe8e1d4, 0.5));    // lidded box
      if (styled) {
        // DECOR-STYLING.md D2: one tall group in the gap between the shelves and the TV (an oatmeal stoneware vase with
        // olive branches leaning away from the screen, over a stack of design books with a small bronze bowl on top), the
        // middle clear in front of the TV and soundbar, and a low group right of the TV (terracotta bowl, smoked-glass bud
        // vase) for balance; the amphora, white and green vases and the small plant came out
        const vy = 20.64;                                                                          // swapped with the books (client 2026-10-21)
        vessel(fu, wx + 0.25, vy, zt, [[0, 0], [0.07, 0], [0.1, 0.12], [0.098, 0.26], [0.06, 0.37], [0.045, 0.4], [0.05, 0.42], [0, 0.42]], cer(0xd9cbb4, 0.85));
        sprays(fu, wx + 0.25, vy, zt + 0.41, [[Math.PI / 2, 0.25, 0.62], [Math.PI / 2 - 0.6, 0.12, 0.7], [0.35, 0.22, 0.55], [Math.PI / 2, 0.42, 0.48], [0.9, 0.3, 0.5]], 'olive');   // leaning toward the room and the TV side, clear of the shelf
        const bt = bookStack(fu, wx + 0.3, 21.0, zt, 0.22, 0.3, [[0.04, 0x2c3a52], [0.032, 0xd6b98f], [0.028, 0xb5673f]], 0.15);
        vessel(fu, wx + 0.3, 21.0, bt, [[0, 0], [0.03, 0], [0.065, 0.04], [0.068, 0.05], [0.06, 0.051], [0.055, 0.04], [0.02, 0.008], [0, 0.008]], M.bronze || (M.bronze = new THREE.MeshStandardMaterial({ color: 0x6e5235, roughness: 0.45, metalness: 0.5 })));
        vessel(fu, wx + 0.3, 23.3, zt, [[0, 0], [0.05, 0], [0.11, 0.05], [0.12, 0.07], [0.112, 0.072], [0.1, 0.05], [0.04, 0.01], [0, 0.01]], cer(0xb5673f, 0.5));
        vessel(fu, wx + 0.15, 23.46, zt, [[0, 0], [0.045, 0], [0.05, 0.08], [0.03, 0.15], [0.018, 0.18], [0.02, 0.19], [0, 0.19]], M.smokedGlass || (M.smokedGlass = new THREE.MeshPhysicalMaterial({ color: 0x4a4038, transparent: true, opacity: 0.82, roughness: 0.12 })));
      }
      // soundbar under the TV
      const sb = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.075, 0.95, 3, 0.03), cer(0x1a1a1a, 0.5));
      sb.position.copy(L(wx + 0.07, tv.y, tz0 - 0.08)); sb.castShadow = true; fu.add(sb);
    }
    // King Living 1977 modular sofa: puffy rounded modules in cream boucle, backs against the west wall (6 cm off it,
    // clear of the skirting), laid out from the south-west corner north: corner, chairs, then the chaise
    const C = LF.couch, wx = C.wall_x - (spec.renovation.curtains ? 0.21 : 0.06);          // off the wall a little further with sheers behind it
    const trimZ = Math.min(Infinity, ...spec.renovation.lounge.windows.filter(w => !w.floorGlass).map(w => w.sill)) - 0.1;       // under the sill board and apron
    const seatZ = fz + C.seat_h, backZ = Math.min(fz + C.back_h, trimZ), bt = C.back_t;
    const boucle = M.boucle || (M.boucle = new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 1 }));
    const hidden = M.hiddenSolid || (M.hiddenSolid = new THREE.MeshBasicMaterial({ visible: false }));
    const puff = (x0, x1, y0, y1, z0, z1, r) => {                       // rounded block, lot-frame extents
      const m = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, z1 - z0, y1 - y0, 4, Math.min(r, (x1 - x0) / 2, (z1 - z0) / 2, (y1 - y0) / 2)), boucle);
      m.position.copy(L((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); m.castShadow = m.receiveShadow = true; fu.add(m);
      box(fu, x0 + 0.02, x1 - 0.02, y0 + 0.02, y1 - 0.02, z0, z1, hidden);                 // plain box so Walk can't pass through
    };
    // rug under the front of the sofa and the coffee table: 12 mm pile with a slightly raised, darker bound edge
    if (LF.rug) {
      const Rg = LF.rug, e = 0.03, rugMat = M.rug || (M.rug = new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
      const bind = M.rugBind || (M.rugBind = new THREE.MeshStandardMaterial({ color: 0xa89678, roughness: 0.9 }));
      box(fu, Rg.x0 + e, Rg.x1 - e, Rg.y0 + e, Rg.y1 - e, fz + 0.001, fz + 0.012, rugMat);
      for (const [x0, x1, y0, y1] of [[Rg.x0, Rg.x1, Rg.y0, Rg.y0 + e], [Rg.x0, Rg.x1, Rg.y1 - e, Rg.y1], [Rg.x0, Rg.x0 + e, Rg.y0 + e, Rg.y1 - e], [Rg.x1 - e, Rg.x1, Rg.y0 + e, Rg.y1 - e]])
        box(fu, x0, x1, y0, y1, fz + 0.001, fz + 0.014, bind);
    }
    // round coffee table in weathered oak: thick top, four splayed square legs joined by a low X stretcher
    if (LF.coffee_table && spec.renovation.coffee_table === 'monolith') {
      // Monolith (spec.renovation.coffee_tables.monolith), 1400 x 800 x 350 silver-grey travertine: a 50 mm square-edged
      // slab, long way along the sofa, on four square blocks set in from the ends. Each block stands a little proud of the
      // long edge and rises past the slab's underside there, so the top reads as sitting in a notch
      const T = LF.coffee_table, w = 1.4, d = 0.8, h = 0.35, tt = 0.05, cx = T.x + 0.15, cy = T.y, x0 = cx - d / 2, x1 = cx + d / 2, y0 = cy - w / 2, y1 = cy + w / 2;
      const travB = M.travGreyB || (M.travGreyB = new THREE.MeshStandardMaterial({ map: travTexture(), roughness: 0.5, color: 0xd8d2ca }));   // blocks: bands run level
      const travG = M.travGrey || (M.travGrey = new THREE.MeshStandardMaterial({ map: travB.map.clone(), roughness: 0.35 }));
      travG.map.center.set(0.5, 0.5); travG.map.rotation = Math.PI / 2; travG.map.needsUpdate = true;    // top: grain along its length
      box(fu, x0, x1, y0, y1, fz + h - tt, fz + h, travG);
      const bw = 0.24, bd = 0.22, proud = 0.03, notch = 0.018;                                        // block footprint and how far it stands out
      for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
        const by0 = sy < 0 ? y0 + 0.1 : y1 - 0.1 - bw, bx0 = sx < 0 ? x0 - proud : x1 + proud - bd;
        box(fu, bx0, bx0 + bd, by0, by0 + bw, fz, fz + h - tt, travB);
        const ox0 = sx < 0 ? bx0 : x1, ox1 = sx < 0 ? x0 : bx0 + bd;                                   // the lip outside the slab edge
        box(fu, ox0, ox1, by0, by0 + bw, fz + h - tt, fz + h - tt + notch, travB);
      }
      box(fu, x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, fz, fz + h - tt, M.hiddenSolid || (M.hiddenSolid = new THREE.MeshBasicMaterial({ visible: false })));
    } else if (LF.coffee_table && spec.renovation.coffee_table === 'matched') {
      // matched: a smaller round table, 850 dia x 400: 40 mm top in the kitchen benchtop stone with an eased edge on a
      // sand-oak drum pedestal and a slightly wider low plinth disc
      const T = LF.coffee_table, MX = matched(), r = 0.425, h = 0.4, tt = 0.04;
      const cyl = (rt, rb, z0, z1, mat, seg = 64) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, z1 - z0, seg), mat); m.position.copy(L(T.x, T.y, fz + (z0 + z1) / 2));
        m.castShadow = m.receiveShadow = true; fu.add(m); return m;
      };
      cyl(r, r - 0.006, h - tt, h, MX.stone);                                                   // top
      cyl(0.3, 0.3, 0.025, h - tt, MX.oak);                                                     // drum, broad enough to read under the top
      cyl(0.325, 0.33, 0, 0.025, MX.groove);                                                    // plinth disc
    } else if (LF.coffee_table) {
      const T = LF.coffee_table, elm = M.elm || (M.elm = new THREE.MeshStandardMaterial({ color: 0xcdb999, roughness: 0.85 }));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(T.dia / 2, T.dia / 2 - 0.005, T.top_t, 64), elm);
      top.position.copy(L(T.x, T.y, fz + T.h - T.top_t / 2)); top.castShadow = top.receiveShadow = true; fu.add(top);
      const legTop = T.dia / 2 - 0.16, legFoot = legTop + 0.06, zt = fz + T.h - T.top_t, zs = fz + 0.1;
      const feet = [];
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
        const p = L(T.x + ca * legFoot, T.y + sa * legFoot, fz), q = L(T.x + ca * legTop, T.y + sa * legTop, zt);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.075, p.distanceTo(q), 0.075), elm);
        leg.position.copy(p).add(q).multiplyScalar(0.5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
        leg.castShadow = leg.receiveShadow = true; fu.add(leg);
        feet.push([T.x + ca * (legFoot - 0.01), T.y + sa * (legFoot - 0.01)]);
      }
      for (const [i, j] of [[0, 2], [1, 3]]) {                                              // the X stretcher, 100 off the floor
        const p = L(feet[i][0], feet[i][1], zs), q = L(feet[j][0], feet[j][1], zs);
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, p.distanceTo(q)), elm);
        st.position.copy(p).add(q).multiplyScalar(0.5); st.lookAt(q); st.castShadow = st.receiveShadow = true; fu.add(st);
      }
    }
    const sy = C.south_y, R = C.curve_r, dep = C.depth, g = 0.004;
    // straight module with its back on the wall side; 'along' = 'y' runs up the west wall, 'x' along the south side
    const straight = (kind, along, a0, a1) => {
      const d = kind === 'chaise' ? C.chaise_depth : dep;
      if (along === 'y') {
        puff(wx - d, wx, a0 + g, a1 - g, fz + 0.01, seatZ, 0.1);
        puff(wx - bt, wx, a0 + g, a1 - g, seatZ - 0.12, backZ, 0.12);
      } else {
        puff(a0 + g, a1 - g, sy - d, sy, fz + 0.01, seatZ, 0.1);
        puff(a0 + g, a1 - g, sy - bt, sy, seatZ - 0.12, backZ, 0.12);
      }
    };
    // curve module in the corner: a quarter ring centred on the room-side corner of its 1.3 m square, outer radius
    // 1.3 (the back runs round the outside), 960 deep, extruded with soft bevelled edges
    const cx = wx - R, cy = sy - R;
    const ring = (r0, r1, z0, z1, bev) => {
      const s = new THREE.Shape(), rr0 = r0 + bev, rr1 = r1 - bev, a0 = g / R, a1 = Math.PI / 2 - g / R;
      s.absarc(0, 0, rr1, a0, a1, false); s.absarc(0, 0, rr0, a1, a0, true);
      const geo = new THREE.ExtrudeGeometry(s, { depth: z1 - z0 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 36 });
      // shape (u, v) = lot (x - cx, y - cy), extruded up: lot (x, y, z) -> three (-x, z, y)
      geo.applyMatrix4(new THREE.Matrix4().set(-1, 0, 0, -cx, 0, 0, 1, z0 + bev, 0, 1, 0, cy, 0, 0, 0, 1));
      const m = new THREE.Mesh(geo, boucle); m.castShadow = m.receiveShadow = true; fu.add(m);
    };
    ring(R - dep, R, fz + 0.01, seatZ, 0.08);                                               // base and seat
    ring(R - bt, R, seatZ - 0.12, backZ, 0.1);                                              // back round the outside
    for (let k = 0; k < 3; k++) {                                                           // plain boxes so Walk can't pass through
      const t0 = k * Math.PI / 6, t1 = t0 + Math.PI / 6, rm = R - dep / 2, tm = (t0 + t1) / 2;
      const px = cx + rm * Math.cos(tm), py = cy + rm * Math.sin(tm), hs = 0.3;
      box(fu, px - hs, px + hs, py - hs, py + hs, fz, seatZ, hidden);
    }
    let yy = cy;                                                                            // west wall, from the curve north
    for (const k of C.west) { const w = C.widths[k]; straight(k, 'y', yy - w, yy); yy -= w; }
    let xx = cx;                                                                            // south side, from the curve east
    for (const k of C.south) { const w = C.widths[k]; straight(k, 'x', xx - w, xx); xx -= w; }

  }
  // ducted heating floor grilles
  for (const v of F.floor_vents) {
    box(int_, v.x0, v.x1, v.y0, v.y1, 0, 0.006, M.grille);
    for (let x = v.x0 + 0.03; x < v.x1 - 0.02; x += 0.03) box(int_, x, x + 0.008, v.y0 + 0.02, v.y1 - 0.02, 0.006, 0.009, M.metal);
  }
  // shower cubicle: glass with chrome frame lines, tiled inside
  // shower: two glass panels (north and west faces) in a chrome frame, open on top, tray on the floor
  const SW = F.shower;
  box(int_, SW.x0 + 0.02, SW.x1 - 0.015, SW.y0 - 0.006, SW.y0 + 0.006, 0.08, SW.z1 - 0.02, M.glass);
  box(int_, SW.x1 - 0.006, SW.x1 + 0.006, SW.y0 + 0.015, SW.y1 - 0.02, 0.08, SW.z1 - 0.02, M.glass);
  for (const [x, y] of [[SW.x1, SW.y0], [SW.x1, SW.y1 - 0.01], [SW.x0 + 0.02, SW.y0]]) box(int_, x - 0.015, x + 0.015, y - 0.015, y + 0.015, 0.002, SW.z1, M.metal);
  box(int_, SW.x0 + 0.02, SW.x1, SW.y0 - 0.015, SW.y0 + 0.015, SW.z1 - 0.03, SW.z1, M.metal);
  box(int_, SW.x1 - 0.015, SW.x1 + 0.015, SW.y0, SW.y1 - 0.01, SW.z1 - 0.03, SW.z1, M.metal);
  box(int_, SW.x0 + 0.01, SW.x1 - 0.01, SW.y0 + 0.01, SW.y1 - 0.02, 0.002, 0.08, M.appliance);   // shower tray
  // vanity with laminate top and inset basin, mirror cabinet above, exhaust fan
  box(int_, F.vanity.x0, F.vanity.x1, F.vanity.y0, F.vanity.y1, 0, F.vanity.z1 - 0.03, M.white);
  box(int_, F.vanity.x0, F.vanity.x1 + 0.02, F.vanity.y0, F.vanity.y1, F.vanity.z1 - 0.03, F.vanity.z1, M.vanityTop);
  box(int_, F.vanity.x0 + 0.06, F.vanity.x1 - 0.06, F.vanity.y0 + 0.35, F.vanity.y0 + 0.8, F.vanity.z1, F.vanity.z1 + 0.004, M.appliance);
  box(int_, F.mirror_cabinet.x0, F.mirror_cabinet.x1, F.mirror_cabinet.y0, F.mirror_cabinet.y1, F.mirror_cabinet.z0, F.mirror_cabinet.z1, M.metal);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 20), M.appliance); fan.position.copy(L(F.exhaust_fan.x, F.exhaust_fan.y, 2.79)); int_.add(fan);
  // bathroom tiles: whole east (party) wall and the shower's walls
  box(int_, W.party_half, W.party_half + 0.012, 18.98, 21.18, 0, F.bath_tiles.z1, M.bathTile);
  box(int_, F.shower.x0, F.shower.x1, 21.18 - 0.012, 21.18, 0, F.bath_tiles.z1, M.bathTile);
  // toilet with cistern, cabinet above; laundry trough and washing machine
  const T = F.toilet, tm = (T.y0 + T.y1) / 2;
  toilet(int_, T.x0, tm, 1, 0, 0);
  box(int_, F.wc_cabinet.x0, F.wc_cabinet.x1, F.wc_cabinet.y0, F.wc_cabinet.y1, F.wc_cabinet.z0, F.wc_cabinet.z1, M.honey);
  // --- bathroom 2 in the former laundry, at the slab level plus any Reno build-up (spec.renovation.bathroom2) ---
  {
    const B2 = spec.renovation.bathroom2, rm = spec.rooms.find(r => r.name === 'Bathroom 2'), bz = rm.floor;
    const wallTile = M.b2Tile || (M.b2Tile = new THREE.MeshStandardMaterial({ color: 0xdcdcd8, roughness: 0.3 }));
    const mirror = M.mirror || (M.mirror = new THREE.MeshStandardMaterial({ color: 0xc9d3da, roughness: 0.08, metalness: 0.9 }));
    const chrome = M.metal, tz = bz + B2.tiles_to;
    // large-format tiles on all four walls, cut around the door (west wall) and the high rear window (south wall)
    const rw = Win.bathroom2_rear;
    box(int_, rm.x0, rm.x0 + 0.012, rm.y0, rm.y1, bz, tz, wallTile);                                                  // east (party) wall
    box(int_, rm.x0, rm.x1, rm.y0, rm.y0 + 0.012, bz, tz, wallTile);                                                  // north wall
    box(int_, rm.x1 - 0.012, rm.x1, rm.y0, D.laundry.y0 - 0.06, bz, tz, wallTile);                                    // west wall, north of the door
    box(int_, rm.x1 - 0.012, rm.x1, D.laundry.y1 + 0.06, rm.y1, bz, tz, wallTile);
    box(int_, rm.x0, rw.x0, rm.y1 - 0.012, rm.y1, bz, tz, wallTile);                                                  // south wall, tiled right up to the window
    box(int_, rw.x1, rm.x1, rm.y1 - 0.012, rm.y1, bz, tz, wallTile);
    box(int_, rw.x0, rw.x1, rm.y1 - 0.012, rm.y1, bz, rw.sill, wallTile);
    if (rw.head < tz) box(int_, rw.x0, rw.x1, rm.y1 - 0.012, rm.y1, rw.head, tz, wallTile);
    const BL = spec.renovation.bath_laundry, fu = G.furniture, white = M.kWhite || M.appliance;
    const lmat = c => M['ld' + c] || (M['ld' + c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    if (BL?.kind === 'bench') {
      // side by side on the party wall, facing west, under a 40 mm stone top at 900; 700 deep including the overhang
      const fx = BL.x0 + BL.d, top = bz + BL.top, stone = M.kStone || M.appliance;
      BL.units.forEach((y, i) => laundryMachine(fu, fx, y + 0.3, bz, 'W', BL.d, i === 0));
      box(int_, rm.x0 + 0.012, fx + 0.06, rm.y0 + 0.012, BL.y1, top - 0.04, top, stone);
      box(int_, rm.x0 + 0.012, fx + 0.04, BL.y1 - 0.02, BL.y1, bz, top - 0.04, white);                               // end panel
      box(int_, rm.x0 + 0.012, rm.x0 + 0.024, rm.y0 + 0.012, BL.y1, top, top + 0.6, M.b2Tile);                       // splashback
      const uz0 = top + 0.65, uz1 = bz + rm.ceil - 0.01, ux1 = rm.x0 + 0.36;                                        // wall cupboards
      box(int_, rm.x0 + 0.012, ux1, rm.y0 + 0.012, BL.y1, uz0, uz1, white);
      const n = 3, w = (BL.y1 - rm.y0 - 0.012) / n;
      for (let i = 0; i < n; i++) {
        const a = rm.y0 + 0.012 + i * w + 0.002, b = a + w - 0.004;
        box(int_, ux1, ux1 + 0.018, a, b, uz0 + 0.003, uz1 - 0.003, white);
        box(int_, ux1 + 0.018, ux1 + 0.03, (i % 2 ? a + 0.04 : b - 0.055), (i % 2 ? a + 0.055 : b - 0.04), uz0 + 0.04, uz0 + 0.2, M.frameA);
      }
      // a basket of washing and a bottle of detergent on the bench
      box(fu, rm.x0 + 0.08, rm.x0 + 0.46, 22.45, 22.85, top + 0.001, top + 0.25, lmat(0xb08a5a));
      box(fu, rm.x0 + 0.1, rm.x0 + 0.44, 22.47, 22.83, top + 0.25, top + 0.28, lmat(0x9fb7c9));
      box(fu, rm.x0 + 0.08, rm.x0 + 0.18, 23.2, 23.3, top + 0.001, top + 0.26, lmat(0x3d7cc9));
    } else if (BL?.kind === 'corner') {
      // tower in the south-east corner against the party wall, facing west into the room
      laundryTower(int_, rm.x0 + 0.012 + BL.d, rm.y1 - 0.012 - TOWER_W / 2, bz, 'W', BL.d, rm.ceil - 0.01);
      if (BL.fold) {
        // linen cupboard between the vanity and the tower, for the folded laundry: full height and flush with the
        // tower (same depth, door faces in line, same door split and pull heights); doors hinge on the vanity side
        // ('low': only the base, the hamper drawer under the vanity's continuous stone top)
        const F = BL.fold, fx0 = rm.x0 + 0.012, fx1 = fx0 + BL.d, fy0 = F.y0, fy1 = rm.y1 - 0.012 - TOWER_W;
        const h = F.low ? bz + B2.vanity.top_z - 0.03 : bz + rm.ceil - 0.01;
        const cz0 = bz + 1.78, lt = 0.018, lw = fy1 - fy0 - 0.004;
        box(int_, fx0, fx1, fy0, fy0 + 0.018, bz, h, white);                                                     // side panel facing the vanity
        box(int_, fx0, fx0 + 0.012, fy0, fy1, bz, h, white);                                                     // back
        if (!F.low) box(int_, fx0, fx1, fy0, fy1, h - 0.018, h, white);                                          // top
        for (const z of F.low ? [0] : [0, 0.84, 1.26, cz0 - bz - 0.025, cz0 - bz + 0.3]) box(int_, fx0 + 0.012, fx1 - 0.005, fy0 + 0.018, fy1, bz + z, bz + z + 0.018, white);   // shelves
        const towels = [0xf1efe8, 0xa9b7a0, 0x8e959b, 0xe9e4da];
        if (F.low) for (let k = 0; k < 3; k++) box(fu, fx0 + 0.1 + (k % 2) * 0.01, fx0 + 0.42 - (k % 2) * 0.01, fy0 + 0.06, fy1 - 0.06, h + 0.031 + k * 0.06, h + 0.028 + (k + 1) * 0.06, lmat(towels[k]));   // folded towels on the bench
        if (!F.low) [0.84, 1.26].forEach((z, i) => { for (let k = 0; k < 4; k++) box(fu, fx0 + 0.08 + (k % 2) * 0.01, fx1 - 0.12 - (k % 2) * 0.01, fy0 + 0.05, fy1 - 0.04, bz + z + 0.019 + k * 0.07, bz + z + 0.016 + (k + 1) * 0.07, lmat(towels[(i + k) % 4])); });
        const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
        const dz1 = F.low ? h - 0.003 : bz + 0.82;                                                               // tall laundry drawer under the doors, up to the first shelf (or the bench top)
        for (const [z0, z1, pull] of F.low ? [] : [[dz1 + 0.004, cz0 - 0.001, [bz + 0.85, bz + 1.15]], [cz0 + 0.003, h - 0.003, [cz0 + 0.045, cz0 + 0.195]]]) {
          const pivot = new THREE.Group(); pivot.position.copy(L(fx1 + 0.011, fy0 + 0.002, z0));
          const lh = z1 - z0, add = (w, hh, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dd), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; b.userData.door = true; pivot.add(b); };
          add(lt, lh, lw, white, 0, lh / 2, lw / 2);                                                            // leaf runs toward the tower (three.js +z)
          add(0.012, pull[1] - pull[0], 0.015, M.frameA, -(lt / 2 + 0.006), (pull[0] + pull[1]) / 2 - z0, lw - 0.035);   // pull at the tower edge, room side
          pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = -Math.PI / 2;           // opens out into the room
          assembly.add(pivot);
        }
        {
          // pull-out laundry drawer: an open-topped box on full-extension runners, front flush with the doors, dirty washing
          // in it. In the same assembly as the doors, so the door button opens the lot and the drawer slides out 450
          const pivot = new THREE.Group(); pivot.position.copy(L(fx1 + 0.011, fy0 + 0.002, bz + 0.003));
          const fh = dz1 - bz - 0.003, dd = BL.d - 0.1, ww = lw - 0.03;
          const add = (w, hh, d2, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d2), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; b.userData.door = true; pivot.add(b); };
          add(lt, fh, lw, white, 0, fh / 2, lw / 2);                                                            // front
          add(0.012, 0.015, 0.16, M.frameA, -(lt / 2 + 0.006), fh - 0.07, lw / 2);                                // pull, across the top of the front
          const bx = lt / 2 + dd / 2, wall = 0.012, bh = fh - 0.08;                                               // box behind the front (three.js +x is into the cupboard)
          add(dd, 0.012, ww, white, bx, 0.03, lw / 2);                                                           // bottom
          add(dd, bh, wall, white, bx, 0.03 + bh / 2, 0.015 + wall / 2); add(dd, bh, wall, white, bx, 0.03 + bh / 2, lw - 0.015 - wall / 2);   // sides
          add(wall, bh, ww, white, lt / 2 + dd - wall / 2, 0.03 + bh / 2, lw / 2);                                // back
          // a deep hamper tray, about two-thirds full of dirty clothes
          const cw = ww - 0.07, cl = dd - 0.06, ch = bh * 0.62;
          add(cl, ch, cw, lmat(0x7d93a8), bx, 0.036 + ch / 2, lw / 2);
          add(cl * 0.45, 0.06, cw * 0.55, lmat(0xd9c7a3), bx - 0.06, 0.036 + ch + 0.02, lw / 2 + 0.04);
          add(cl * 0.35, 0.05, cw * 0.4, lmat(0x9a4b4b), bx + 0.12, 0.036 + ch + 0.015, lw / 2 - 0.06);
          pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.slide = new THREE.Vector3(-0.45, 0, 0);   // out into the room
          assembly.add(pivot);
        }
      }
    }
    // shower in the north-east corner: tray, glass screen on its west face, rail and rose (gives way to the laundry)
    const S = B2.shower;
    if (!BL || BL.keepShower) {
    box(int_, S.x0, S.x1, S.y0, S.y1, bz, bz + 0.06, M.appliance);
    box(int_, S.screen_x - 0.005, S.screen_x + 0.005, S.y0, BL?.slider === 'west' ? S.y1 - 0.46 : S.y1, bz + 0.06, bz + 2.0, M.glass);   // west screen (part fixed when it takes the slider)
    box(int_, S.screen_x - 0.012, S.screen_x + 0.012, S.y0, S.y1, bz + 1.98, bz + 2.01, chrome);
    box(int_, S.screen_x - 0.012, S.screen_x + 0.012, S.y1 - 0.012, S.y1 + 0.012, bz + 0.06, bz + 2.0, chrome);
    box(int_, rm.x0 + 0.012, rm.x0 + 0.04, (S.y0 + S.y1) / 2 - 0.015, (S.y0 + S.y1) / 2 + 0.015, bz + 1.0, bz + 1.9, chrome);   // rail
    box(int_, rm.x0 + 0.012, rm.x0 + 0.3, (S.y0 + S.y1) / 2 - 0.06, (S.y0 + S.y1) / 2 + 0.06, bz + 1.88, bz + 1.92, chrome);     // rose arm and head
    if (BL?.slider === 'west') {
      // the vanity stands flush with the tower right beside the shower, so the south face is all fixed glass and the
      // door slides on the west (toilet) face instead: a leaf on a track just outside the screen, sliding north over its
      // fixed part, leaving about 400 to step out onto the clear floor beside the toilet
      const gz0 = bz + 0.06, gz1 = bz + 2.0, lw = 0.46, lh = gz1 - gz0 - 0.02;
      box(int_, rm.x0 + 0.012, S.screen_x - 0.012, S.y1 - 0.005, S.y1 + 0.005, gz0, gz1, M.glass);
      box(int_, rm.x0 + 0.012, S.screen_x, S.y1 - 0.012, S.y1 + 0.012, gz1 - 0.02, gz1 + 0.01, chrome);
      box(int_, S.screen_x - 0.012, S.screen_x + 0.03, S.y0, S.y1, gz1 - 0.02, gz1 + 0.01, chrome);             // track over the west face
      const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
      const pivot = new THREE.Group(); pivot.position.copy(L(S.screen_x + 0.02, S.y1 - 0.014, gz0 + 0.01));
      const add = (w, h, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); b.position.set(x, y, z); b.userData.door = true; pivot.add(b); };
      add(0.01, lh, lw, M.glass, 0, lh / 2, -lw / 2);                                                     // leaf runs north (three.js -z)
      add(0.02, 0.3, 0.02, chrome, -0.02, 1.05, -0.05); add(0.02, 0.3, 0.02, chrome, 0.02, 1.05, -0.05);   // pull at the open (south) edge
      pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.slide = new THREE.Vector3(0, 0, -0.4);   // slides north
      assembly.add(pivot);
    } else if (BL?.keepShower) {
      // south face: fixed glass return against the party wall, then a 550 glass door hinged at the screen corner, opening out
      const dx0 = S.screen_x - 0.55, gz0 = bz + 0.06, gz1 = bz + 2.0;
      box(int_, rm.x0 + 0.012, dx0 - 0.004, S.y1 - 0.005, S.y1 + 0.005, gz0, gz1, M.glass);
      box(int_, rm.x0 + 0.012, dx0 - 0.004, S.y1 - 0.012, S.y1 + 0.012, gz1 - 0.02, gz1 + 0.01, chrome);
      const assembly = new THREE.Group(); assembly.userData.operable = true; assembly.userData.open = false; int_.add(assembly);
      const pivot = new THREE.Group(); pivot.position.copy(L(S.screen_x - 0.012, S.y1, gz0 + 0.01));
      const add = (w, h, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); b.position.set(x, y, z); b.userData.door = true; pivot.add(b); };
      const lw = 0.55 - 0.016, lh = gz1 - gz0 - 0.02;
      add(lw, lh, 0.01, M.glass, lw / 2, lh / 2, 0);                                                    // leaf runs toward the party wall (three.js +x)
      add(0.02, 0.3, 0.02, chrome, lw - 0.05, 1.05, 0.02); add(0.02, 0.3, 0.02, chrome, lw - 0.05, 1.05, -0.02);   // handle both faces
      pivot.userData.closedPosition = pivot.position.clone(); pivot.userData.swing = -Math.PI / 2;                   // opens out into the room
      assembly.add(pivot);
    }
    }
    // back-to-wall toilet on the north wall, facing south
    const T = B2.toilet;
    toilet(int_, (T.x0 + T.x1) / 2, T.y0 - 0.02, 0, 1, bz, { concealed: true });
    // wall-hung vanity on the east wall with a round basin, wall mixer and a frameless mirror; towel rail on the south wall
    const V = B2.vanity;
    const vb = V.basin_y ?? (V.y0 + V.y1) / 2, cz1 = bz + V.top_z - 0.03;
    if (V.floor) {
      // floor-standing cupboard: set-back kick, carcass, doors (one, or a pair over 700) with vertical pulls
      box(int_, V.x0, V.x1 - 0.06, V.y0, V.y1, bz, bz + 0.1, M.trimDark);
      box(int_, V.x0, V.x1 - 0.018, V.y0, V.y1, bz + 0.1, cz1, M.appliance);
      const dy1 = V.doors_y1 ?? V.y1, n = dy1 - V.y0 > 0.7 ? 2 : 1, w = (dy1 - V.y0) / n;
      for (let i = 0; i < n; i++) {
        const a = V.y0 + i * w + 0.002, b = a + w - 0.004, py = n === 2 && i === 1 ? a + 0.035 : b - 0.05;
        box(int_, V.x1 - 0.018, V.x1, a, b, bz + 0.102, cz1 - 0.002, M.appliance);
        box(int_, V.x1, V.x1 + 0.012, py, py + 0.015, cz1 - 0.22, cz1 - 0.06, M.grille);
      }
      if (dy1 < V.y1) box(int_, V.x1 - 0.018, V.x1, dy1, V.y1, bz + 0.1, cz1, M.appliance);                  // fixed panel over the blind corner
    } else {
      box(int_, V.x0, V.x1, V.y0, V.y1, bz + V.hung_z, cz1, M.appliance);
      box(int_, V.x1 - 0.1, V.x1 - 0.06, V.y0 + 0.3, V.y1 - 0.3, bz + 0.62, bz + 0.65, M.grille);                // handle on the drawer front
    }
    box(int_, V.x0, V.x1 + 0.02, V.y0 - 0.01, V.top_y1 ?? V.y1 + 0.01, cz1, bz + V.top_z, M.kStone || M.appliance);   // stone top (runs on to the tower in the 'low' version)
    // basin toward the wall on a deep vanity, so the wall mixer reaches it
    const bx = V.basin_x ?? (V.x0 + V.x1) / 2 + 0.02;
    if (V.basin === 'rect') {
      // rectangular vessel basin on the top: 15 mm walls round a flat bowl, 130 high; benchtop mixer behind it
      const hx = 0.24, hy = 0.18, z0 = bz + V.top_z + 0.001, z1 = z0 + 0.13, t = 0.015, bw = M.appliance;
      box(int_, bx - hx, bx + hx, vb - hy, vb + hy, z0, z0 + 0.02, bw);                                          // base
      box(int_, bx - hx, bx - hx + t, vb - hy, vb + hy, z0, z1, bw); box(int_, bx + hx - t, bx + hx, vb - hy, vb + hy, z0, z1, bw);
      box(int_, bx - hx + t, bx + hx - t, vb - hy, vb - hy + t, z0, z1, bw); box(int_, bx - hx + t, bx + hx - t, vb + hy - t, vb + hy, z0, z1, bw);
      const tx = bx - hx - 0.05;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.3, 16), chrome); post.position.copy(L(tx, vb, z0 + 0.15)); int_.add(post);
      box(int_, tx, bx - hx + 0.1, vb - 0.012, vb + 0.012, z0 + 0.28, z0 + 0.3, chrome);                         // spout over the bowl
      box(int_, tx - 0.07, tx - 0.02, vb - 0.008, vb + 0.008, z0 + 0.24, z0 + 0.255, chrome);                     // lever
    } else {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.12, 24), M.appliance); basin.position.copy(L(bx, vb, bz + V.top_z + 0.06)); int_.add(basin);
      box(int_, rm.x0 + 0.012, V.basin_x ? bx - 0.1 : rm.x0 + 0.16, vb - 0.012, vb + 0.012, bz + V.top_z + 0.24, bz + V.top_z + 0.26, chrome);
    }
    if (BL?.store) {
      // more linen storage: a mirror-fronted shaving cabinet over the basin, an overhead linen cupboard above it from the
      // tower's upper-cupboard line to the ceiling, and a tall cupboard over the toilet on the north wall
      const wx = rm.x0 + 0.012, my0 = V.y0 + 0.005, my1 = V.y1 - 0.005, ceil = bz + rm.ceil - 0.01, dark = M.frameA;
      const mz0 = bz + V.top_z + 0.3, mz1 = bz + 1.74, ox1 = wx + 0.35, oz0 = bz + 1.78;
      box(int_, wx, wx + 0.15, my0, my1, mz0, mz1, white);                                                     // shaving cabinet
      box(int_, wx + 0.15, wx + 0.156, my0 + 0.004, my1 - 0.004, mz0 + 0.004, mz1 - 0.004, mirror);            // mirror door
      box(int_, wx, ox1, V.y0, V.y1, oz0, ceil, white);                                                        // overhead linen cupboard
      box(int_, ox1, ox1 + 0.018, V.y0 + 0.002, V.y1 - 0.002, oz0 + 0.003, ceil - 0.003, white);
      box(int_, ox1 + 0.018, ox1 + 0.03, V.y1 - 0.05, V.y1 - 0.035, oz0 + 0.045, oz0 + 0.195, dark);           // pull at its bottom, like the tower's
      const tm = (B2.toilet.x0 + B2.toilet.x1) / 2, tx0 = tm - 0.3, tx1 = tm + 0.3, ty0 = rm.y0 + 0.012, ty1 = ty0 + 0.3, tz0 = bz + 1.5;   // 600 wide, centred on the toilet
      box(int_, tx0, tx1, ty0, ty1 - 0.018, tz0, ceil, white);                                                 // over-toilet cupboard
      for (const [a, b] of [[tx0 + 0.002, tm - 0.002], [tm + 0.002, tx1 - 0.002]]) box(int_, a, b, ty1 - 0.018, ty1, tz0 + 0.003, ceil - 0.003, white);
      for (const x of [tm - 0.05, tm + 0.035]) box(int_, x, x + 0.015, ty1, ty1 + 0.012, tz0 + 0.045, tz0 + 0.195, dark);
    } else box(int_, rm.x0 + 0.012, rm.x0 + 0.02, Math.max(V.y0 + 0.05, vb - 0.4), Math.min(V.y1 - 0.05, vb + 0.4), bz + V.top_z + 0.4, bz + V.top_z + 1.15, mirror);
    // (no towel rail on the south wall: hooks on the back of the door instead)
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20), M.appliance); fan.position.copy(L(0.8, 23.0, bz + rm.ceil - 0.012)); int_.add(fan);
  }
  // front bedroom: open shelving niche beside the robe
  const SH = F.shelves_front;
  // the niche tops out level with the robe beside it (one height the whole way across), with a top over it
  const shTop = F.robe_front.z1;
  // cheeks: full depth above the plinth, set back 40 below it like the robe's plinth (a full-height cheek stood proud of
  // the recessed plinth as a post at the floor)
  for (const [c0, c1] of [[SH.x0, SH.x0 + 0.02], [SH.x1 - 0.02, SH.x1]]) { box(int_, c0, c1, SH.y0, SH.y1, ROBE_KICK, shTop, robePaint()); box(int_, c0, c1, SH.y0 + 0.04, SH.y1, 0, ROBE_KICK, robePaint()); }
  box(int_, SH.x0, SH.x1, SH.y1 - 0.02, SH.y1, 0, shTop, robePaint());                                                              // back, at the wall
  const shHead = Math.min(2.6, shTop - 0.4);
  box(int_, SH.x0, SH.x1, SH.y0, SH.y1, shHead, shHead + 0.02, robePaint()); box(int_, SH.x0, SH.x1, SH.y0, SH.y0 + 0.04, shHead + 0.02, shTop, robePaint()); // head with a cupboard face above
  box(int_, SH.x0, SH.x1, SH.y0, SH.y1, shTop - 0.02, shTop, robePaint());                                                          // top
  // solid base like the robe beside it: a closed cupboard from the floor to the first shelf, its door flush with the
  // robe doors (same panel, same 50 above the floor), so the run reads as one piece of joinery
  const shBase = 0.42;
  box(int_, SH.x0 + 0.02, SH.x1 - 0.02, SH.y0, SH.y1 - 0.02, ROBE_KICK, shBase, robePaint());
  box(int_, SH.x0 + 0.02, SH.x1 - 0.02, SH.y0 + 0.04, SH.y1 - 0.02, 0, ROBE_KICK, robePaint());          // plinth, set back like the robe
  robeDoor(int_, SH.x0 + 0.0015, SH.x1 - 0.0015, SH.y0, ROBE_KICK, shBase); robeKnob(int_, SH.x0 + 0.05, SH.y0, shBase - 0.08);
  for (const z of SH.levels.filter(z => z < shHead - 0.1 && z > shBase + 0.1)) box(int_, SH.x0 + 0.02, SH.x1 - 0.02, SH.y0 + 0.05, SH.y1 - 0.02, z, z + 0.025, M.glass);        // glass shelves
  // living room console gas heater
  // ceiling roses and light fittings
  for (const cr of F.ceiling_roses) {
    const rm = spec.rooms.find(r => r.name === cr.room), zc = rm.floor + rm.ceil;
    // the entry's original rose (Downloads/circle.jpeg): ~750 across with a leaf band; the others stay stepped discs
    if (rm.name === 'Entry') ornateRose(int_, cr.x, cr.y, zc, 0.75);
    else {
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(cr.dia / 2, cr.dia / 2, 0.03, 32), M.ceiling); rose.position.copy(L(cr.x, cr.y, zc - 0.015)); int_.add(rose);
    // plaster rose, as in the photos: stepped up to a raised centre rather than a flat disc
    for (const [f, h] of [[0.78, 0.045], [0.55, 0.06], [0.3, 0.075]]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(cr.dia / 2 * f, cr.dia / 2 * f * 1.04, h, 32), M.ceiling); ring.position.copy(L(cr.x, cr.y, zc - h / 2)); int_.add(ring); }
    }
    // Reno: the hanging fittings (chandeliers and pendants) come down; the plaster rose stays and the room gets flush
    // downlights like the kitchen's, one per 1.7 m or so each way, evenly spread
    // hall: the entry rose gets its pendant back (the hall's feature, as in the reference Page project): an August oval to
    // match the bedrooms, bottom at 2.1, level with the door heads (Mint's hall rule)
    if (rm.name === 'Entry' && spec.renovation.hall_lights === 'art') { bedPendant(int_, BL, 'Hall', cr.x, cr.y, zc, spec.renovation.hall_pendant, 2.1, 'hallPendant'); continue; }
    // bedroom 3: the default scheme in every version (pendant on its rose + robe strips) except the old downlight grid
    if (rm.name === 'Bedroom 3' && spec.renovation.bed_lights !== 'downlights') { bedPendant(int_, BL, rm.name, cr.x, cr.y, zc, spec.renovation.pendant_style); continue; }
    if (BED_LIT.includes(rm.name) && spec.renovation.bed_lights === 'angled') continue;   // the rose stays, no fitting on it
    if (BED_LIT.includes(rm.name) && spec.renovation.bed_lights !== 'downlights') {
      bedPendant(int_, BL, rm.name, cr.x, cr.y, zc, spec.renovation.pendant_style);
      continue;
    }
    const nx = Math.max(1, Math.round((rm.x1 - rm.x0) / 1.7)), ny = Math.max(1, Math.round((rm.y1 - rm.y0) / 1.7));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      let dx = rm.x0 + (rm.x1 - rm.x0) * (i + 0.5) / nx, dy = rm.y0 + (rm.y1 - rm.y0) * (j + 0.5) / ny;
      const clear = cr.dia / 2 + 0.15;                                     // keep off the rose: slide along the room's long side
      if (Math.hypot(dx - cr.x, dy - cr.y) < clear) {
        if (rm.y1 - rm.y0 >= rm.x1 - rm.x0) dy = cr.y + Math.sign(dy - cr.y || 1) * clear; else dx = cr.x + Math.sign(dx - cr.x || 1) * clear;
      }
      const dl = dlFitting(); dl.position.copy(L(dx, dy, zc - 0.004)); int_.add(dl); DL.push({ x: dx, y: dy, z: zc - 0.004, room: rm.name });
    }
  }
  // hall and wet rooms had no fittings: halls one row at 1.6 m, bathrooms and the WC at 1.3 m (90 mm cut-out fittings)
  for (const [name, sp] of [['Hall', 1.6], ['Hall extension', 1.6], ['Bath', 1.3], ['WC', 1.3], ['Bathroom 2', 1.3]].filter(([n]) => !(spec.renovation.hall_lights === 'art' && n.startsWith('Hall')))) {
    const rm = spec.rooms.find(r => r.name === name), zc = rm.floor + rm.ceil;
    for (const [dx, dy] of dlGrid(rm, sp)) { const dl = dlFitting(); dl.position.copy(L(dx, dy, zc - 0.004)); int_.add(dl); DL.push({ x: dx, y: dy, z: zc - 0.004, room: name }); }
  }
  // white slotted wall vents high on the west wall (living above W2, bedroom 2 above W1)
  for (const v of F.wall_vents) box(int_, H.x_west_inner - 0.012, H.x_west_inner, v.y0, v.y1, v.z0, v.z1, M.ceiling);

  // --- floors, ceilings, labels -------------------------------------------
  for (const r of spec.rooms) {
    const fm = { timber: M.timber, carpet: M.carpet, lino: M.lino, concrete: M.concrete, tile: M.tileFloor, porcelain: M.porcelain || (M.porcelain = new THREE.MeshStandardMaterial({ color: 0xd8d8d3, roughness: 0.35 })) }[r.floorMat];
    if (r.name !== 'Porch') {
      const mat = fm; // One timber finish, including the hall extension and thresholds.
      const fb = r.name === 'Front bedroom'
        ? floorPoly(G.floors, [
          [r.x0, r.y0, r.floor],
          [H.bay.x0, r.y0, r.floor],
          [H.bay.front_x0, H.y_front_outer - H.bay.projection + W.ext * 0.7, r.floor],
          [H.bay.front_x1, H.y_front_outer - H.bay.projection + W.ext * 0.7, r.floor],
          [H.bay.x1, r.y0, r.floor],
          [r.x1, r.y0, r.floor],
          [r.x1, r.y1, r.floor],
          [r.x0, r.y1, r.floor],
        ], mat)
        // the lounge floor is built up from the slab, so its full thickness shows at the openings
        : box(G.floors, r.x0, r.x1, r.y0, r.y1, ['Lounge / living', 'Bathroom 2'].includes(r.name) ? Math.min(r.floor - 0.05, Lv.slab) : r.floor - 0.05, r.floor, mat);
      if (fm.userData.tile) worldUV(fb, fm.userData.tile, r.name === 'Bedroom 2');
    }
    if (r.ceil != null && r.name !== 'Lounge / living') box(G.ceilings, r.x0, r.x1, r.y0, r.y1, r.floor + r.ceil, r.floor + r.ceil + 0.03, M.ceiling);
    const s = label(r.name);
    s.position.copy(L((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.floor + 1.6));
    G.labels.add(s);
  }
  // brushed aluminium carpet trim across each bedroom doorway, on the line where the carpet meets the boards
  for (const [name, y0, y1] of [['Front bedroom', D.front_bed.y0, D.front_bed.y1], ['Bedroom 2', D.bed2.y0, D.bed2.y1],
                                ['Bedroom 3', spec.renovation.bedroom3.door_y0, spec.renovation.bedroom3.door_y1]]) {
    const r = spec.rooms.find(q => q.name === name);
    if (r?.floorMat === 'carpet') box(G.floors, r.x0 - 0.018, r.x0 + 0.018, y0, y1, r.floor, r.floor + 0.005, steelMat());
  }
  // hall opened through: close the ceiling over the removed wall between the hall and the hall extension
  if (spec.renovation.hall_doorway === false) box(G.ceilings, W.party_half, H.hall_step.rear_wall_x0, 11.49, 11.60, W.plate_z, W.plate_z + 0.03, M.ceiling);
  // Continue the kitchen finish through the doorway using the same world-aligned pattern.
  {
    const bd = D.back, kitchen = spec.rooms.find(r => r.name === 'Kitchen / dining');
    const mat = kitchen.floorMat === 'timber' ? M.timber : M.lino;
    const th = box(G.floors, bd.x0, bd.x1, H.y_rear_inner, H.y_rear_outer, -0.05, 0, mat);
    worldUV(th, mat.userData.tile || [1, 1]);
  }
  // continuous base floor under every wall and threshold (room floors sit on top)
  // kept 5 cm inside the outer wall faces so the two surfaces never coincide (no flicker)
  const k = 0.05;
  // Keep the structural slab below the finished floor. Tile its exposed gaps
  // between room footprints at FFL so doorways have no 4 mm dip or shadow seam.
  const mainFloor = (x0, x1, y0, y1) => {
    box(G.floors, x0, x1, y0, y1, -0.3, -0.05, M.timber);
    const rooms = spec.rooms.concat([{ x0: D.back.x0, x1: D.back.x1, y0: H.y_rear_inner, y1: H.y_rear_outer, floor: Lv.ffl }]).filter(r => r.floor === Lv.ffl && r.x1 > x0 && r.x0 < x1 && r.y1 > y0 && r.y0 < y1);
    const cuts = (lo, hi, keys) => [...new Set([lo, hi, ...rooms.flatMap(r => keys.map(key => Math.max(lo, Math.min(hi, r[key]))))])].sort((a, b) => a - b);
    const xs = [...new Set([...cuts(x0, x1, ['x0', 'x1']), ...[H.bay.x0, H.bay.x1].filter(x => x > x0 && x < x1)])].sort((a, b) => a - b), ys = cuts(y0, y1, ['y0', 'y1']);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2;
      if (y < H.y_front_inner && x > H.bay.x0 && x < H.bay.x1) continue;
      if (rooms.some(r => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1)) continue;
      const floor = box(G.floors, xs[i], xs[i + 1], ys[j], ys[j + 1], -0.05, Lv.ffl, M.timber);
      floor.name = 'Flush timber threshold';
      worldUV(floor, BOARD_TILE);
    }
  };
  mainFloor(H.porch.x1 + k, H.x_west_outer - k, H.y_front_outer + k, H.porch.y1);
  mainFloor(k, H.x_west_outer - k, H.porch.y1, H.y_rear_outer - k);
  // bath and WC sit at house floor level; the laundry sits at slab level, flush with the covered area
  worldUV(box(G.floors, k, H.wing.x_outer - k, H.y_rear_outer - k, 22.21, Lv.slab - 0.2, -0.004, M.lino), [1, 1]);
  box(G.floors, k, H.wing.x_outer - k, 22.21, H.wing.y_end_outer - k, Lv.slab - 0.2, Lv.slab - 0.004, M.concrete);
  // --- front gable half-timbering, picture rails and cornices, window hood (photos) ---
  {
    const r = R.main, slope = (r.ridge_z - r.eave_z) / (r.eave_x - r.ridge_x), zAt = x => r.ridge_z - slope * x;
    const yf = r.gable_y_front - 0.03;                                     // just proud of the gable face
    // Trim the plate band to the roof slope at the low eave end.
    const bandTop = W.plate_z + 0.1, bandBottom = W.plate_z - 0.05;
    const bandKnee = (r.ridge_z - 0.025 - bandTop) / slope;
    box(ext, 0, bandKnee, yf - 0.03, yf, bandBottom, bandTop, M.green);
    const bandEnd = zAt(H.x_west_outer) - 0.025;
    for (const y of [yf - 0.03, yf]) poly(ext, [
      [bandKnee, y, bandBottom], [H.x_west_outer, y, bandBottom],
      [H.x_west_outer, y, bandEnd], [bandKnee, y, bandTop],
    ], M.green);
    poly(ext, [[bandKnee, yf - 0.03, bandTop], [H.x_west_outer, yf - 0.03, bandEnd],
      [H.x_west_outer, yf, bandEnd], [bandKnee, yf, bandTop]], M.green);
    box(ext, H.x_west_outer - 0.001, H.x_west_outer, yf - 0.03, yf, bandBottom, bandEnd, M.green);
    for (let x = 0.7; x < H.x_west_outer - 0.3; x += 1.0) {               // four vertical battens up to the roof line
      box(ext, x - 0.05, x + 0.05, yf - 0.03, yf, W.plate_z + 0.1, zAt(x + 0.05) - 0.06, M.green);
    }
    // green barge board along the front edge of the roof
    const p0 = L(0, r.y0 + 0.02, r.ridge_z - 0.11), p1 = L(r.eave_x, r.y0 + 0.02, r.eave_z - 0.11);
    const dir = p1.clone().sub(p0), len = dir.length();
    const barge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.04), M.green);
    barge.position.copy(p0.clone().add(p1).multiplyScalar(0.5));
    barge.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    barge.castShadow = true; G.roof.add(barge);
    // plaster cornices, from the photos: the enriched cove (leaf garland on the ceiling band) in the entry, hall and
    // bedrooms 2 and 3, and a plainer moulded cove with a picture rail 400 below the ceiling in the front bedroom
    const ORNATE = 'ornate', PLAIN = 'plain';
    const cr = (alongX, line, a, b, dir, zc, kind, o) => corniceRun(int_, alongX, line, a, b, dir, zc, kind, o);
    const rect = (rm, prof, skip = {}) => {
      const zc = rm.floor + rm.ceil;
      if (!skip.y0) cr(true, rm.y0, rm.x0, rm.x1, 1, zc, prof);
      if (!skip.y1) cr(true, rm.y1, rm.x0, rm.x1, -1, zc, prof);
      if (!skip.x0) cr(false, rm.x0, rm.y0, rm.y1, 1, zc, prof);
      if (!skip.x1) cr(false, rm.x1, rm.y0, rm.y1, -1, zc, prof);
    };
    const room = n => spec.rooms.find(r => r.name === n);
    // entry and hall are one hallway: one continuous cornice down both walls, turning with the west wall where the hall
    // narrows (no band across the ceiling there), and across the end at the doorway, or on down the hall extension
    {
      const en = room('Entry'), ha = room('Hall'), zc = en.floor + en.ceil, ext = room('Hall extension');
      const end = spec.renovation.hall_doorway === false ? ext.y1 : ha.y1;
      cr(true, en.y0, en.x0, en.x1, 1, zc, ORNATE);                                 // over the front door
      cr(false, en.x0, en.y0, end, 1, zc, ORNATE);                                  // party wall, full length
      cr(false, en.x1, en.y0, en.y1, -1, zc, ORNATE);                               // entry west wall
      cr(true, en.y1, ha.x1, en.x1, -1, zc, ORNATE, { aOut: true });                // the step's return, facing the front door
      cr(false, ha.x1, en.y1, end, -1, zc, ORNATE, { aOut: true });                 // hall west wall, round the outside corner
      cr(true, end, en.x0, ha.x1, -1, zc, ORNATE);                                  // across the far end
      if (spec.renovation.hall_doorway !== false) rect(ext, ORNATE);                // hall extension beyond the archway
    }
    for (const n of ['Bedroom 2', 'Bedroom 3']) if (room(n)) rect(room(n), ORNATE);
    {
      const fb = room('Front bedroom'), zr = fb.floor + fb.ceil - 0.4;
      rect(fb, PLAIN);
      // picture rail: a small moulded rail round the walls 400 below the ceiling
      for (const [alongX, line, a, b, dir] of [[true, fb.y0, fb.x0, fb.x1, 1], [true, fb.y1, fb.x0, fb.x1, -1], [false, fb.x0, fb.y0, fb.y1, 1], [false, fb.x1, fb.y0, fb.y1, -1]]) {
        const o1 = line + dir * 0.022, lo = Math.min(line, o1), hi = Math.max(line, o1);
        if (alongX) box(int_, a, b, lo, hi, zr - 0.035, zr, M.ceiling); else box(int_, lo, hi, a, b, zr - 0.035, zr, M.ceiling);
      }
    }
    // small green metal hood over the bedroom 2 window (W1)
    const w1 = Win.W1_bed2;
    box(ext, H.x_west_outer, H.x_west_outer + 0.28, w1.y0 - 0.08, w1.y1 + 0.08, w1.head + 0.05, w1.head + 0.1, M.green);
  }

  // --- roofs --------------------------------------------------------------
  {
    const r = R.main;
    poly(G.roof, [[r.ridge_x, r.y0, r.ridge_z], [r.eave_x, r.y0, r.eave_z], [r.eave_x, r.y1, r.eave_z], [r.ridge_x, r.y1, r.ridge_z]], M.tile);
    // ridge cap: covers the party wall where it meets the ridge
    box(G.roof, -0.16, 0.16, r.y0, r.y1, r.ridge_z - 0.06, r.ridge_z + 0.07, M.tile);
    // gutter along the west eave
    box(G.roof, r.eave_x - 0.06, r.eave_x + 0.06, r.y0, r.y1, r.eave_z - 0.1, r.eave_z, M.gutter);
    const k = R.kitchen_flat;
    const lift = 0.03;
    // a raised lounge ceiling would expose the fascias on its side: keep only the part above the ceiling
    const cv = R.covered, lounge = spec.renovation.lounge;
    const loungeCeil = lounge.ceil_z;
    const overLounge = (z0, z1) => [Math.max(z0, loungeCeil), z1];
    box(G.roof, k.x0, k.x1, k.y0 + 0.02, k.y1, k.z - 0.05 + lift, k.z + lift, M.metal);
    box(G.roof, k.x1 + 0.005, k.x1 + 0.045, k.y0 + 0.02, k.y1 + 0.045, k.z - k.fascia + lift, k.z + lift + 0.01, M.green);   // green fascia, west edge
    { const [z0, z1] = overLounge(k.z - k.fascia + lift, k.z + lift + 0.01); if (z1 > z0) box(G.roof, H.wing.x_outer + 0.005, k.x1 + 0.045, k.y1 + 0.005, k.y1 + 0.045, z0, z1, M.green); }   // and along the rear wall
    const w = R.wing_flat;
    box(G.roof, w.x0, w.x1, w.y0 + 0.01, w.y1, w.z_top - 0.05 + lift, w.z_top + lift, M.metal);
    { const [z0, z1] = overLounge(w.z_top - w.fascia + lift, w.z_top + lift + 0.01); if (z1 > z0) box(G.roof, w.x1 + 0.005, w.x1 + 0.045, w.y0 + 0.01, w.y1 + 0.045, z0, z1, M.green); }   // west fascia, proud of the wall face
    box(G.roof, w.x0 + 0.005, w.x1 + 0.045, w.y1 + 0.005, w.y1 + 0.045, w.z_top - w.fascia + lift, w.z_top + lift + 0.01, M.green); // rear fascia
    const c = R.covered;
    // Colorbond deck and plaster ceiling, built as strips around the skylight opening when it is switched on
    const LG = spec.renovation.lounge, sk = LG.skylight ? LG.skylight_rect : null;
    const zDeck = x => c.z_top_east + (c.z_top_west - c.z_top_east) * (x - c.x0) / (c.x1 - c.x0);
    const sheet = (grp, zAt, mat) => {
      const q = (x0, x1, y0, y1) => { if (x1 - x0 > 1e-3 && y1 - y0 > 1e-3) poly(grp, [[x0, y0, zAt(x0)], [x1, y0, zAt(x1)], [x1, y1, zAt(x1)], [x0, y1, zAt(x0)]], mat); };
      if (!sk) return q(c.x0, c.x1, c.y0, c.y1);
      q(c.x0, c.x1, c.y0, sk.y0); q(c.x0, c.x1, sk.y1, c.y1); q(c.x0, sk.x0, sk.y0, sk.y1); q(sk.x1, c.x1, sk.y0, sk.y1);
    };
    sheet(G.roof, zDeck, M.metal);
    // Insulated roof: 300 mm total depth; continuous white plaster underside.
    const depth = spec.renovation.lounge.roof_thickness;
    const roofZ = x => c.z_top_east + (c.z_top_west-c.z_top_east)*(x-c.x0)/(c.x1-c.x0);
    const ceilZ = LG.ceil_z;
    sheet(G.ceilings, () => ceilZ, M.ceiling);
    if (sk) {
      // plastered light well from the ceiling up to the deck, a charcoal upstand, and a glazed top.
      // The well stops just under the deck: above it the upstand's inner faces take over (sharing a plane z-fights).
      // The linings sit just inside the ceiling hole, faces flush with its edges, so none of them shares a plane with the
      // plaster ceiling (a lining 20 mm outside the hole put its underside in the ceiling plane: z-fighting round the rim)
      const lt = 0.018;
      // designed lighting: tape at the top of the well, behind the upstand, lights the linings (they glow at night)
      const wellM = spec.renovation.kl_lights === 'grid' ? M.ceiling : M.wellGlow || (M.wellGlow = (() => { const m = bedGlow('lSky').clone(); m.emissive.set(0xfff0dc); m.userData.bedLamp = 'lSky'; m.userData.glowK = 0.3; return m; })());
      for (const [x0, x1] of [[sk.x0, sk.x0 + lt], [sk.x1 - lt, sk.x1]]) box(G.roof, x0, x1, sk.y0, sk.y1, ceilZ + 0.0005, zDeck((x0 + x1) / 2) - 0.002, wellM);
      for (const y of [sk.y0 + 0.001, sk.y1 - 0.001])                                            // short sides follow the deck's fall
        poly(G.roof, [[sk.x0 + lt, y, ceilZ + 0.0005], [sk.x1 - lt, y, ceilZ + 0.0005], [sk.x1 - lt, y, zDeck(sk.x1 - lt) - 0.002], [sk.x0 + lt, y, zDeck(sk.x0 + lt) - 0.002]], wellM);
      for (const [x0, x1, y0, y1] of [[sk.x0 - 0.06, sk.x1 + 0.06, sk.y0 - 0.06, sk.y0], [sk.x0 - 0.06, sk.x1 + 0.06, sk.y1, sk.y1 + 0.06], [sk.x0 - 0.06, sk.x0, sk.y0, sk.y1], [sk.x1, sk.x1 + 0.06, sk.y0, sk.y1]]) {
        const zm = zDeck((x0 + x1) / 2); box(G.roof, x0, x1, y0, y1, zm, zm + 0.14, M.frameA);
      }
      const gl = poly(G.roof, [[sk.x0, sk.y0, zDeck(sk.x0) + 0.13], [sk.x1, sk.y0, zDeck(sk.x1) + 0.13], [sk.x1, sk.y1, zDeck(sk.x1) + 0.13], [sk.x0, sk.y1, zDeck(sk.x0) + 0.13]], M.glass);
      gl.castShadow = false;
    }
    // green fascia on every exposed edge, matching the wing; cream gutter on the west edge; flush downlights in the ceiling
    for(const y of [c.y0,c.y1]) poly(G.roof,[[c.x0,y,roofZ(c.x0)-depth],[c.x1,y,roofZ(c.x1)-depth],
      [c.x1,y,roofZ(c.x1)],[c.x0,y,roofZ(c.x0)]],M.green);
    box(G.roof,c.x1-0.005,c.x1+0.04,c.y0-0.02,c.y1+0.02,roofZ(c.x1)-depth,roofZ(c.x1),M.green);
    box(G.roof,c.gutter_x+0.04,c.gutter_x+0.14,c.y0,c.y1,roofZ(c.x1)-0.12,roofZ(c.x1)+0.01,M.creamMetal);
    // Lounge lighting (Reno > Kitchen > Lighting, with the kitchen). 'designed' (default): no downlights (the six lit
    // the floor, left the ceiling dark, glared at anyone lying on the curved sofa, and the glass walls and skylight went
    // black at night). Instead:
    //  - a pelmet along the west glass and over the rear sliders, 200 off the glass, tape inside washing down the sheers
    //    (Mint, Middle Park: concealed linear LED in curtain pelmets kills the black window at night), 400 lm/m;
    //  - tape hidden at the top of the skylight well lighting its plaster linings: the well glows instead of a black
    //    hole, and lights the room below softly (~600 lm);
    //  - (the shelf's mushroom ornament stays unlit, client 2026-10-21);
    //  - a soft floor glow under the floating walnut run (in its block);
    //  - nothing over the TV (reflections in the screen).
    if (spec.renovation.kl_lights === 'grid') {
      for (const [dx, dy] of dlGrid(spec.rooms.find(r => r.name === 'Lounge / living'), 1.6, sk)) { const dl = dlFitting(); dl.position.copy(L(dx, dy, ceilZ - 0.003)); G.ceilings.add(dl); DL.push({ x: dx, y: dy, z: ceilZ - 0.003, room: 'Lounge / living' }); }   // 2 x 3, 1.8 m apart
    } else {
      const LR = 'Lounge / living', lz = ceilZ, wallX = spec.renovation.lounge.wall_x, sy = spec.renovation.lounge.south_y;
      if (spec.renovation.curtains) {
        const pel = (x0, x1, y0, y1) => box(G.ceilings, x0, x1, y0, y1, lz - 0.13, lz - 0.001, M.ceiling);
        // the west board stops short of the north wall, behind the side door's sheer stack (it ran through it), and returns
        // to the wall there
        const pn = spec.renovation.lounge.side_door ? 19.76 : 19.62;
        pel(wallX - 0.218, wallX - 0.2, pn, sy - 0.2);                                           // west pelmet board
        if (pn > 19.62) pel(wallX - 0.218, wallX - 0.001, pn, pn + 0.018);                         // its return to the wall
        pel(spec.renovation.lounge.wall_x - 3.76, wallX - 0.2, sy - 0.218, sy - 0.2);              // south pelmet board
        box(G.ceilings, wallX - 0.17, wallX - 0.15, pn + 0.04, sy - 0.22, lz - 0.02, lz - 0.012, bedGlow('lPelmet'));   // the tape, seen as a glow in the slot
        box(G.ceilings, wallX - 3.72, wallX - 0.22, sy - 0.17, sy - 0.15, lz - 0.02, lz - 0.012, bedGlow('lPelmet'));
        BL.lines.push({ room: LR, layer: 'lPelmet', mode: 2, along: 'y', x0: pn + 0.04, x1: sy - 0.22, y: wallX - 0.16, z: lz - 0.02, ay: 0.35, az: -0.94, lmPerM: 400 });
        BL.lines.push({ room: LR, layer: 'lPelmet', mode: 2, x0: wallX - 3.72, x1: wallX - 0.22, y: sy - 0.16, z: lz - 0.02, ay: 0.35, az: -0.94, lmPerM: 400 });
      }
      if (sk) BL.points.push({ room: LR, layer: 'lSky', kind: 'down', x: (sk.x0 + sk.x1) / 2, y: (sk.y0 + sk.y1) / 2, z: lz - 0.01, lm: 600 });
      const C = spec.renovation.lounge_furniture?.couch;
      // the back corner behind the sofa's curve: a slender indoor tree (client reference), in place of the floor lamp
      // pushed right into the south-west corner (client 2026-10-21): the 460 pot just in front of the gathered sheers on
      // both walls (west sheer ~90 off the wall, slider sheer ~70 off the glass), behind the sofa's curve
      if (C) slenderTree(G.furniture, C.wall_x - 0.36, spec.renovation.lounge.south_y - 0.3, 0, { xMax: spec.renovation.lounge.wall_x - 0.03, yMax: spec.renovation.lounge.south_y - 0.03 });   // canopy held inside the two walls   // nudged 70 closer to the sliders (client)
      // and instead of a lamp, a pair of opal wall lights flanking the TV on the east wall (the sofa backs onto glass,
      // so it has no wall for a reading light; a floor lamp elsewhere stood in a walkway or a door's swing). They light
      // the TV wall softly (easier on the eyes for evening viewing) and give the room its eye-level glow. Centred on the
      // TV, 300 clear of its sides, at 1.6
      const TVs = spec.renovation.lounge_furniture?.tv;
      // (taken out, client 2026-10-21: no wall lights beside the TV; wallLight() stays available)
      void TVs;
    }
    const p = { ...R.porch_hood, y1: H.y_front_outer + 0.015 };
    poly(G.roof, [[p.x0, p.y0, p.z_low], [p.x1, p.y0, p.z_low], [p.x1, p.y1, p.z_high], [p.x0, p.y1, p.z_high]], M.tile);
    poly(G.roof, [[p.x0, p.y0, p.z_low - 0.06], [p.x1, p.y0, p.z_low - 0.06], [p.x1, p.y1, p.z_high - 0.06], [p.x0, p.y1, p.z_high - 0.06]], M.ceiling);
    // The entry has a shallow tiled lean-to hood, with a green timber fascia and a
    // small gutter across its street edge (front elevation photo).
    box(G.roof, p.x0, p.x1, p.y0 - 0.05, p.y0 + 0.025, p.z_low - 0.12, p.z_low + 0.015, M.green);
    box(G.roof, p.x0, p.x1, p.y0 - 0.075, p.y0 - 0.025, p.z_low - 0.06, p.z_low + 0.03, M.gutter);
    for (const x of [p.x0, p.x1]) {
      poly(G.roof, [[x, p.y0, p.z_low], [x, p.y1, p.z_high], [x, p.y1, p.z_low - 0.1], [x, p.y0, p.z_low - 0.1]], M.green);
    }
    for (const x of [p.x0 + 0.18, p.x1 - 0.18]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, p.z_low - 0.1 - Lv.porch, 16), M.green);
      post.position.copy(L(x, p.y0 + 0.05, (Lv.porch + p.z_low - 0.1) / 2));
      post.castShadow = post.receiveShadow = true;
      G.roof.add(post);
    }
    // The bay has a low hipped tiled canopy.  Its four continuous faces follow the
    // two splayed sides and the front window, rather than converging as disconnected triangles.
    const b = H.bay, bh = R.bay_hood, o = bh.overhang, yf = H.y_front_outer - b.projection;
    const wallY = H.y_front_outer;
    const outer = [[b.x1 + o, wallY], [b.front_x1 + o * 0.6, yf - o], [b.front_x0 - o * 0.6, yf - o], [b.x0 - o, wallY]];
    const inner = [[b.x1, wallY + 0.015], [b.front_x1, yf + 0.1], [b.front_x0, yf + 0.1], [b.x0, wallY + 0.015]];
    // Close the upper canopy back to the wall; the three hip faces alone leave a hole.
    // Reno can take the tiled hood off: the bay then gets a flat metal roof just over its walls with a white edge.
    if (spec.renovation.bay_hood === false) {
      const top = b.wall_top + 0.06, pts = [[b.x1, wallY], [b.front_x1, yf], [b.front_x0, yf], [b.x0, wallY]];
      poly(G.roof, pts.map(([x, y]) => [x, y, top]), M.metal);
      for (let i = 0; i < 3; i++) wallSeg(G.roof, pts[i], pts[i + 1], 0.04, b.wall_top, top + 0.01, [], M.white, M.glass);
    } else {
    poly(G.roof, inner.map(([x, y]) => [x, y, bh.z_high]), M.tile);
    for (let i = 0; i < 3; i++) {
      const j = i + 1;
      poly(G.roof, [
        [inner[i][0], inner[i][1], bh.z_high],
        [inner[j][0], inner[j][1], bh.z_high],
        [outer[j][0], outer[j][1], bh.z_low],
        [outer[i][0], outer[i][1], bh.z_low],
      ], M.tile);
      wallSeg(G.roof, outer[i], outer[j], 0.06, bh.z_low - 0.12, bh.z_low + 0.015, [], M.green, M.glass);
    }
    }
    // bay soffit, so the top of the bay is closed from below
    poly(G.roof, [[b.x1, wallY, b.wall_top], [b.front_x1, yf, b.wall_top], [b.front_x0, yf, b.wall_top], [b.x0, wallY, b.wall_top]], M.ceiling);
  }

  // --- site ----------------------------------------------------------------
  {
    const S = spec.site_items, lot = spec.site.lot;
    const soil = M.soil || (M.soil = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 1 }));
    const pebble = M.pebble || (M.pebble = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.95 }));
    const leaf = M.leaf || (M.leaf = new THREE.MeshStandardMaterial({ color: 0x4d6b3a, roughness: 0.9 }));
    const bark = M.bark || (M.bark = new THREE.MeshStandardMaterial({ color: 0x5b4633, roughness: 1 }));
    const brick = M.red;
    // base under everything so there are never holes in the ground
    box(G.site, 0, lot.width, 0, lot.depth, gz - 0.15, gz - 0.06, soil);
    // front garden, tiled path from the gate to the porch
    const fg = S.front_garden, fp = S.front_path;
    // photos: the front yard in front of the bay is exposed-aggregate concrete, and the path from the gate to the porch is
    // the same tessellated tile as the porch, with its border
    const aggregate = M.aggregate || (M.aggregate = new THREE.MeshStandardMaterial({ color: 0x8f8d88, roughness: 0.95 }));
    box(G.site, fg.x0, fg.x1, fg.y0, fg.y1, gz - 0.06, fg.z, aggregate);
    tessPanel(G.site, fp.x0, fp.x1, fp.y0, fp.y1, gz - 0.06, fp.z);
    // front tree: a small ornamental with a rounded canopy of small leaves on a few branches
    const ft = S.front_tree; M.frontLeaf = M.frontLeaf || new THREE.MeshStandardMaterial({ color: 0x4a6d33, roughness: 0.9 });
    leafyTree(G.site, ft.x, ft.y, gz, ft.h * 0.45,
      [[0, 0, ft.h - ft.r * 0.9, ft.r * 0.62], [0.35, 0.2, ft.h - ft.r * 1.1, ft.r * 0.5], [-0.35, -0.15, ft.h - ft.r * 1.15, ft.r * 0.5], [0.05, -0.38, ft.h - ft.r * 1.3, ft.r * 0.45], [-0.1, 0.36, ft.h - ft.r * 1.25, ft.r * 0.45]].map(([dx, dy, z, r]) => [ft.x + dx, ft.y + dy, gz + z, r]),
      M.frontLeaf, 3);
    // front garden, planted modern: a low clipped hedge inside the front fence, white hydrangeas in front of it and box
    // balls by the house (canopies kept 50 mm inside the fence rails)
    // a narrow charcoal-edged bed just inside the front fence (the rest stays concrete): low clipped hedge behind the
    // pickets, white hydrangeas in front of it
    const P = plantMats(), fgz = fg.z, by0 = S.front_fence.y + 0.05, by1 = by0 + 0.7, bx0 = fp.x1 + 0.25, bx1 = fg.x1 - 0.05, bh = 0.15;
    box(G.site, bx0, bx1, by1 - 0.012, by1, fgz, fgz + bh, P.edge); box(G.site, bx0, bx0 + 0.012, by0, by1, fgz, fgz + bh, P.edge); box(G.site, bx1 - 0.012, bx1, by0, by1, fgz, fgz + bh, P.edge);
    box(G.site, bx0 + 0.012, bx1 - 0.012, by0, by1 - 0.012, fgz, fgz + bh - 0.02, P.mulch);
    clippedHedge(G.site, bx0 + 0.05, bx1 - 0.05, by0 + 0.04, by0 + 0.34, fgz + bh - 0.02, 0.55, P.buxus);
    [2.1, 2.8, 3.5, 4.2].forEach((x, i) => hydrangea(G.site, x, by1 - 0.2, fgz + bh - 0.02, 0.8, P, 11 + i));
    // west side: pavers, then a brick-edged planted bed along the fence
    const wp = S.west_path, wb = S.west_bed;
    // side path: plain concrete by default; Reno can put the grey pavers back
    const pathMat = spec.renovation.side_pavers ? M.paving : M.concrete;
    box(G.site, wp.x0, wp.x1, wp.y0, wp.y1, gz - 0.06, wp.z, pathMat);
    bed({...wb,y1:spec.chimney.y1}, gz - 0.06, wp.z, soil);
    box(G.site,wb.x0,wb.x1,spec.chimney.y1,wp.y1,gz-0.06,wp.z,pathMat);
    // timber deck over the patio end of the side path, 100 above the pavers: subframe, boards running along the path
    // with 6 mm gaps, and a fascia board across the open (north) end
    const sd = S.side_deck, dy0 = spec.chimney.y1, dTop = wp.z + sd.h;
    const deckMat = M.deck || (M.deck = new THREE.MeshStandardMaterial({ color: 0x8a5d3b, roughness: 0.7 }));
    box(G.site, sd.x0 + 0.01, sd.x1 - 0.01, dy0 + 0.02, sd.y1, wp.z, dTop - 0.025, M.darkTimber);             // bearers and joists
    for (let x = sd.x0; x < sd.x1 - 0.02; x += sd.board + sd.gap) box(G.site, x, Math.min(x + sd.board, sd.x1), dy0 + 0.02, sd.y1, dTop - 0.025, dTop, deckMat);
    box(G.site, sd.x0, sd.x1, dy0, dy0 + 0.02, wp.z, dTop, deckMat);                                             // fascia at the north end
    // Bistro table touches the fence's inside face, with a chair at either end.
    // Table 550 mm square, 740 mm high; chair 440 mm wide, seat 450 mm high.
    const furniture = new THREE.Group(); furniture.name='Kitchen patio table and chairs'; G.furniture.add(furniture);
    const fz=dTop;
    const tx=S.west_fence.x-0.03-0.55, ty=17.47;
    box(furniture,tx,tx+0.55,ty,ty+0.55,fz+0.71,fz+0.74,M.darkTimber);
    for(const x of [tx+0.04,tx+0.48]) for(const y of [ty+0.04,ty+0.48])
      box(furniture,x,x+0.035,y,y+0.035,fz,fz+0.71,M.frameA);
    for(const [cy,backNorth] of [[ty-0.52,true],[ty+0.63,false]]) {
      const cx=tx+0.055;
      box(furniture,cx,cx+0.44,cy,cy+0.44,fz+0.42,fz+0.45,M.darkTimber);
      for(const x of [cx+0.03,cx+0.38]) for(const [y,isNorth] of [[cy+0.03,true],[cy+0.38,false]])
        box(furniture,x,x+0.03,y,y+0.03,fz,fz+(isNorth===backNorth?0.82:0.42),M.frameA);
      const by=backNorth?cy+0.015:cy+0.395;
      box(furniture,cx,cx+0.44,by,by+0.03,fz+0.58,fz+0.82,M.darkTimber);
    }
    // side bed along the west fence: box balls alternating with lomandra tufts (no trees)
    {
      const Ps = plantMats(), bz = wp.z + wb.edge_h - 0.03, cx = (wb.x0 + wb.x1) / 2, yEnd = spec.chimney.y1 - 0.3;
      let k = 0;
      for (let y = wb.y0 + 0.5; y < yEnd; y += 0.6, k++) {
        if (k % 2 === 0) leafyBall(G.site, cx, y, bz, 0.2, Ps.buxus, 0.9, 40 + k);
        else grassTuft(G.site, cx, y, bz, 0.65, Ps, 50 + k, wb.x1 - wb.x0 - 0.24);   // kept inside the bed, clear of the fence
      }
    }
    // rear: one concrete slab from the covered area to the rear fence, pebble bed along the west fence
    const rs = S.rear_slab;
    // Yard slab stops at the interior footprint, avoiding coplanar concrete and timber.
    // Lawn behind the bathroom wing; concrete remains outside the sliding doors.
    lawn(G.site, rs.x0, 2.55, 25.0, rs.y1, gz - 0.06, rs.z);
    // the back-yard concrete is tiled like the front porch: tessellated octagon field everywhere, and round the main
    // yard (behind the wing, inside the beds) the porch's border of terracotta, a charcoal line, the triangle band and
    // another charcoal line
    const deckYard = spec.renovation.yard === 'deck';
    worldUV(box(G.site, 2.55, rs.x1, 25.0, rs.y1, gz - 0.06, rs.z, deckYard ? M.concrete : M.tess), TESS_TILE);   // under the deck: the old slab
    // down the side of the house (west of the lounge, up to the deck) stays plain concrete like the side path
    for (const [x0, x1, y0, y1] of [[6.33, rs.x1, 19.54, 25.0], [rs.x0, rs.x1, rs.y0, 19.54]]) box(G.site, x0, x1, y0, y1, gz - 0.06, rs.z, M.concrete);
    if (!deckYard) {
      const fx0 = 2.55, fx1 = S.west_fence.x - 0.05, fy0 = 25.0, fy1 = S.rear_bed_south.y0, zt = rs.z + 0.003;   // border runs right out to the side fence
      const bands = [[0, 0.075, M.tessRed], [0.075, 0.085, M.tessBlack], [0.085, 0.145, M.tessBand], [0.145, 0.155, M.tessBlack]];
      for (const [b0, b1, m] of bands) {
        // four sides, mitred by letting the east-west strips run full length and the north-south ones fit between
        for (const [alongX, outer, inward] of [[true, fy0, 1], [true, fy1, -1], [false, fx0, 1], [false, fx1, -1]]) {
          const o0 = outer + inward * b0, o1 = outer + inward * b1, lo = Math.min(o0, o1), hi = Math.max(o0, o1);
          const mesh = alongX ? box(G.site, fx0 + b0, fx1 - b0, lo, hi, rs.z, zt, m) : box(G.site, lo, hi, fy0 + b1, fy1 - b1, rs.z, zt, m);
          if (m === M.tessBand) stripUV(mesh, alongX, o0, inward, b1 - b0, 0.12);
        }
      }
    }
    // Solid thresholds across the rear and side openings.
    { const [tx0, tx1] = spec.renovation.lounge.door_pairs[0]; worldUV(box(G.floors,tx0,tx1,24.77,25.0,loungeFloor-0.05,loungeFloor,M.timber),BOARD_TILE); }
    box(G.floors,5.18,6.02,19.31,19.54,loungeFloor-0.04,loungeFloor+0.003,M.concrete);
    // bathroom 2 door threshold, up to the higher of the two floors
    const b2Floor = spec.rooms.find(r => r.name === 'Bathroom 2').floor;
    if (Math.max(loungeFloor, b2Floor) > Lv.slab + 0.005) box(G.floors, H.wing.x_inner, H.wing.x_outer, D.laundry.y0, D.laundry.y1, Lv.slab - 0.05, Math.max(loungeFloor, b2Floor), M.tileFloor);
    // steps up to the built-up lounge floor: equal risers of at most 190, 300 treads, from the tiled yard to the
    // sliders (tiled like the porch step, terracotta nosing) and from the side path to the side door (concrete)
    const stepsUp = (x0, x1, yFace, dir, zLow, mat, nosing) => {
      const n = Math.ceil((loungeFloor - zLow) / 0.19 - 1e-6), r = (loungeFloor - zLow) / n;
      for (let i = 1; i < n; i++) {
        const ya = yFace + dir * 0.3 * (i - 1), yb = yFace + dir * 0.3 * i, zt = loungeFloor - r * i;
        const m = box(G.site, x0, x1, Math.min(ya, yb), Math.max(ya, yb), zLow - 0.02, zt, mat);
        if (mat === M.tess) worldUV(m, TESS_TILE);
        if (nosing) box(G.site, x0, x1, dir > 0 ? yb : yb - 0.012, dir > 0 ? yb + 0.012 : yb, zLow, zt, nosing);
      }
    };
    if (!deckYard) { const [sx0, sx1] = spec.renovation.lounge.door_pairs[0]; stepsUp(Math.min(sx0, 2.55), Math.max(sx1 + 0.1, 6.0), 25.0, 1, rs.z, M.tess, M.tessRed); }
    else {
      // Raised deck (client 2026-10-21): level with the sliders' threshold, from the back of the lounge to the rear bed
      // (notched round the lemon tree's bump-out), boards running across the yard parallel to the house (140 + 6 gap) on
      // a dark subframe, fascia boards on the open edges. Two equal 190 risers down: a full-length step along the east
      // edge onto the lawn behind the bathroom wing, and a step at the north-west corner down onto the side path.
      const dz = loungeFloor, r = (dz - rs.z) / 2, deckMat = M.deck || (M.deck = new THREE.MeshStandardMaterial({ color: 0x8a5d3b, roughness: 0.7 }));
      const dx0 = 2.85, dx1 = S.west_fence.x - 0.035, tb = S.tree.bed, by = S.rear_bed_south.y0 - 0.005, board = 0.14, gap = 0.006;
      const deckRect = (x0, x1, y0, y1, zTop, zBase) => {                                     // subframe, then boards along x
        box(G.site, x0 + 0.02, x1 - 0.02, y0 + 0.02, y1 - 0.02, zBase, zTop - 0.025, M.darkTimber);
        for (let x = x0; x < x1 - 0.02; x += board + gap) box(G.site, x, Math.min(x + board, x1), y0, y1, zTop - 0.025, zTop, deckMat);   // boards run north-south, like the floor inside
      };
      const px0 = spec.renovation.lounge.wall_outer_x;                                         // the side-path step: lounge's west wall to the fence
      // walkable levels for Walk mode (main.js floorAt): the deck and its two treads
      spec.renovation.deck_zones = [{ x0: dx0, x1: tb.x0, y0: 25.0, y1: by, z: dz }, { x0: tb.x0, x1: dx1, y0: 25.0, y1: tb.y0, z: dz },
        { x0: 2.55, x1: dx0, y0: 25.0, y1: by, z: dz - r }, { x0: px0, x1: dx1, y0: 24.7, y1: 25.0, z: dz - r }];
      deckRect(dx0, tb.x0, 25.0, by, dz, rs.z);                                                 // the main deck, to the rear bed
      deckRect(tb.x0, dx1, 25.0, tb.y0 - 0.005, dz, rs.z);                                      // west of the bump-out, to its front
      box(G.site, tb.x0 - 0.02, tb.x0, tb.y0 - 0.005, by, rs.z, dz, deckMat);                   // fascia down the notch
      box(G.site, tb.x0, dx1, tb.y0 - 0.025, tb.y0 - 0.005, rs.z, dz, deckMat);                 // fascia along the bump-out front
      box(G.site, dx0, tb.x0, by - 0.02, by, rs.z, dz, deckMat);                                // fascia along the rear bed
      // east step onto the lawn: a 300 tread at mid height the whole depth of the deck, fascia on its face
      deckRect(2.55, dx0, 25.0, by, dz - r, rs.z);
      box(G.site, dx0 - 0.02, dx0, 25.0, by, dz - r, dz, deckMat);                              // riser face of the deck above it
      box(G.site, 2.55, 2.57, 25.0, by, rs.z, dz - r, deckMat);                                 // riser face of the tread
      // north-west step onto the side path (concrete, 6.33 to the fence, ending at y 25.0): a tread on the path's end
      box(G.site, px0, dx1, 24.7, 25.0, rs.z, dz - r, deckMat);
      for (let x = px0; x < dx1 - 0.02; x += board + gap) box(G.site, x, Math.min(x + board, dx1), 24.7, 25.0, dz - r - 0.002, dz - r + 0.001, deckMat);
      box(G.site, px0, dx1, 25.0, 25.02, dz - r, dz, deckMat);                                 // riser face of the deck above it
    }
    stepsUp(spec.renovation.lounge.side_door[0] - 0.05, spec.renovation.lounge.side_door[1] + 0.05, 19.31, -1, S.west_path.z, M.concrete);
    // Concrete continues around the extension into the backyard along the fence.
    // the rear bed bulges out round the lemon tree (the real brick edge curves out there), one bed with it
    {
      // edged in 45 mm hardwood sleepers and filled with white pebbles instead of the steel edge and bark
      const rb = { ...S.rear_bed_south, x0: 2.55 }, tb = S.tree.bed, e = 0.045, top = rs.z + rb.edge_h;
      const sleeper = M.sleeper || (M.sleeper = new THREE.MeshStandardMaterial({ map: sleeperTexture(), roughness: 0.78 }));
      if (!M.pebbles) { const t = pebbleTextures(); M.pebbles = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.02, roughness: 0.85 }); }
      const sl = (x0, x1, y0, y1) => surfUV(box(G.site, x0, x1, y0, y1, rs.z, top, sleeper), SLEEPER_TILE);
      const pb = (x0, x1, y0, y1) => surfUV(box(G.site, x0, x1, y0, y1, rs.z, top - 0.03, M.pebbles), PEBBLE_TILE);
      sl(rb.x0, rb.x0 + e, rb.y0, rb.y1);                                                        // east end
      sl(rb.x0 + e, tb.x0 + e, rb.y0, rb.y0 + e);                                                // front, up to the bump-out
      sl(tb.x0, tb.x0 + e, tb.y0, rb.y0);                                                        // bump-out side
      sl(tb.x0, rb.x1, tb.y0, tb.y0 + e);                                                        // bump-out front, to the west fence
      sl(rb.x0 + e, rb.x1, rb.y1 - e, rb.y1);                                                    // along the rear fence
      pb(rb.x0 + e, rb.x1, rb.y0 + e, rb.y1 - e);
      pb(tb.x0 + e, rb.x1, tb.y0 + e, rb.y0 + e);
    }
    // back bed along the rear fence: white hydrangeas in front of a clipped hedge, uplit (no trees)
    {
      const Pr = plantMats(), rb2 = S.rear_bed_south, bz = rs.z + rb2.edge_h - 0.03;
      clippedHedge(G.site, 2.7, 5.6, rb2.y1 - 0.4, rb2.y1 - 0.06, bz, 0.9, Pr.buxus);           // stops short of the lemon
      [2.95, 3.6, 4.25, 4.9, 5.5].forEach((x, i) => hydrangea(G.site, x, rb2.y0 + 0.28, bz, 1, Pr, 60 + i));
      for (const x of [3.3, 5.2]) upLight(G.site, x, rb2.y0 + 0.08, bz, Pr);                // uplights washing the hedge
      // (the outdoor print on the rear fence came out, client 2026-10-21)
    }
    function bed(b, zBase, zTop, fill) {
      // modern raised bed: slim charcoal steel edge, dark bark mulch
      const e = 0.012, h = b.edge_h, Pm = plantMats();
      box(G.site, b.x0, b.x0 + e, b.y0, b.y1, zBase, zTop + h, Pm.edge);
      box(G.site, b.x0, b.x1, b.y0, b.y0 + e, zBase, zTop + h, Pm.edge);
      box(G.site, b.x0, b.x1, b.y1 - e, b.y1, zBase, zTop + h, Pm.edge);
      box(G.site, b.x0 + e, b.x1, b.y0 + e, b.y1 - e, zBase, zTop + h - 0.03, Pm.mulch);
    }
    // citrus tree in the back west corner, yucca clump by the covered-area posts
    // slim lemon tree: thin trunk, loose canopy of a few small clumps, all kept inside the fences
    const tr = S.tree; M.lemonLeaf = M.lemonLeaf || new THREE.MeshStandardMaterial({ color: 0x4d7030, roughness: 0.9 });
    const lemonFruit = M.lemonFruit || (M.lemonFruit = new THREE.MeshStandardMaterial({ color: 0xf2d23a, roughness: 0.6 }));
    { // canopy centred a little out from the corner so it can be full without crossing either fence
      const cx = tr.x - 0.35, cy = tr.y - 0.45, ring = [];
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; ring.push([cx + Math.cos(a) * 0.42, cy + Math.sin(a) * 0.42, rs.z + 1.5 + (i % 2) * 0.2, 0.46]); }
      // the lemon-tree model standing in the bed where the photos have it, its wider side along the rear fence, the
      // canopy pruned flat where it meets the fences as the real one is
      const tree = plantModel(G.site, 'lemon', tr.x, tr.y, rs.z + S.rear_bed_south.edge_h - 0.03, tr.h, 0);
      if (tree) pruneToFences(tree, S.west_fence.x - 0.04, S.rear_fence.y - 0.05);
      else leafyTree(G.site, tr.x, tr.y, rs.z, 0.95, [[cx, cy, rs.z + 1.7, 0.6], ...ring, [cx, cy, rs.z + 2.15, 0.42]], M.lemonLeaf, 7, { per: 3, r: 0.035, mat: lemonFruit });
    }
    // Former yucca bed beside the extension is now an unobstructed concrete path.
    // fences: pickets at the front (with the gate) and between us and No. 11; palings elsewhere
    const pickets = (x0, y0, x1, y1, h, skip) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 0.1);
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        if (skip && skip(x, y)) continue;
        const along = Math.abs(x1 - x0) > Math.abs(y1 - y0);
        box(G.site, x - (along ? 0.035 : 0.01), x + (along ? 0.035 : 0.01), y - (along ? 0.01 : 0.035), y + (along ? 0.01 : 0.035), gz, gz + h, M.fence);
      }
      const along = Math.abs(x1 - x0) > Math.abs(y1 - y0);
      for (const hz of [0.25, h - 0.2]) {                              // rails
        if (along) {
          const runs = skip ? [[Math.min(x0,x1),S.front_fence.gate_x0],[S.front_fence.gate_x1,Math.max(x0,x1)]] : [[Math.min(x0,x1),Math.max(x0,x1)]];
          for (const [start,end] of runs) box(G.site,start,end,y0+0.012,y0+0.035,gz+hz,gz+hz+0.07,M.fence);
        }
        else box(G.site, x0 + 0.012, x0 + 0.035, Math.min(y0, y1), Math.max(y0, y1), gz + hz, gz + hz + 0.07, M.fence);
      }
    };
    const ff = S.front_fence;
    pickets(0, 0, lot.width, 0, ff.h, (x) => x > ff.gate_x0 && x < ff.gate_x1);
    // gate as its own panel so it can hide in walk mode
    box(G.site, ff.gate_x0, ff.gate_x1, 0.02, 0.05, gz + 0.05, gz + ff.h - 0.05, M.fence).userData.door = true;
    const dv = S.divider_fence;
    pickets(dv.x, dv.y0 + 0.05, dv.x, dv.y1, dv.h);
    palingFence(G.site, S.west_fence.x - 0.03, S.west_fence.x + 0.03, S.west_fence.y0, S.west_fence.y1, gz, gz + S.west_fence.h, -1, '-x');   // our side painted white
    // feature screen on our side of the side fence, opposite the lounge's glass wall and 1 m past it each way (client reference 2026-10-21):
    // fine vertical composite battens in a warm brown over a dark backing, so the gaps read as shadow lines; the fence's
    // height. ~32 mm battens at 42 mm pitch, 30 mm proud of a 15 mm backing board fixed to the face of the fence posts
    // (90 proud of the palings), so the posts and rails sit hidden behind it; end battens close the sides
    {
      const LgW = (spec.renovation.lounge?.windows || []).filter(w => w.floorGlass);
      if (LgW.length && spec.renovation.lounge_fence !== 'screen') {
        // 'lattice' (default): star jasmine trained on stainless wires in a diamond lattice straight on the fence (client
        // reference 2026-10-21), over the same stretch; the wires on stand-offs just proud of the fence posts
        const y0 = Math.min(...LgW.map(w => w.y0)) - 1.0, y1 = Math.max(...LgW.map(w => w.y1)) + 1.0;
        jasmineLattice(G.site, S.west_fence.x - 0.03 - 0.1, y0, y1, gz, gz + 0.3, gz + S.west_fence.h - 0.08);
      } else if (LgW.length) {
        // 'screen': 1 m past the glass each way: the screen is ~0.9 m beyond it, so from across the room the white fence showed past its ends
        const y0 = Math.min(...LgW.map(w => w.y0)) - 1.0, y1 = Math.max(...LgW.map(w => w.y1)) + 1.0, fx = S.west_fence.x - 0.03 - 0.09, z0 = gz, z1 = gz + S.west_fence.h;
        const back = M.screenBack || (M.screenBack = new THREE.MeshStandardMaterial({ color: 0x241a13, roughness: 0.9 }));
        const slatM = [0x6e4e3a, 0x684934, 0x72523d].map((c, i) => M['screenSlat' + i] || (M['screenSlat' + i] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })));
        box(G.site, fx - 0.015, fx, y0, y1, z0, z1, back);
        const n = Math.round((y1 - y0) / 0.042), pitch = (y1 - y0) / n;
        for (let i = 0; i < n; i++) box(G.site, fx - 0.045, fx - 0.015, y0 + i * pitch + 0.005, y0 + (i + 1) * pitch - 0.005, z0, z1, slatM[i % 3]);
        for (const [a, b] of [[y0 - 0.02, y0], [y1, y1 + 0.02]]) box(G.site, fx - 0.045, fx + 0.09, a, b, z0, z1, slatM[0]);   // end battens back to the palings
        // three star jasmines trained flat on wires across it (client reference), ~1.9 m apart, the outer two a little in
        // from the ends so the screen's edges stay crisp
        // planted in three long rectangular troughs along its foot (realistic: there is no soil under the side path's
        // paving): charcoal powder-coated steel, 200 deep x 400 high, ~1.8 m each with 60 mm gaps, a soil surface 30 below
        // the rim; the jasmines grow out of them
        const span = y1 - y0, pD = 0.2, pH = 0.4, gap = 0.06, nP = 3, pL = (span - gap * (nP - 1)) / nP, pf = fx - 0.046;
        const steel = M.planterSteel || (M.planterSteel = new THREE.MeshStandardMaterial({ color: 0x34363a, roughness: 0.55, metalness: 0.35 }));
        const soil = M.planterSoil || (M.planterSoil = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 1 }));
        for (let i = 0; i < nP; i++) {
          const a = y0 + i * (pL + gap), b = a + pL, t = 0.004;
          box(G.site, pf - pD, pf, a, b, z0, z0 + pH - 0.03, soil);                              // body (soil inside)
          for (const [xa, xb, ya, yb] of [[pf - pD, pf - pD + t, a, b], [pf - t, pf, a, b], [pf - pD, pf, a, a + t], [pf - pD, pf, b - t, b]]) box(G.site, xa, xb, ya, yb, z0, z0 + pH, steel);
          box(G.site, pf - pD - 0.006, pf - pD + 0.012, a, b, z0 + pH - 0.004, z0 + pH, steel);  // folded top lip on the path side
          box(G.site, pf - pD, pf, a + 0.02, b - 0.02, z0, z0 + 0.03, M.planterFoot || (M.planterFoot = new THREE.MeshStandardMaterial({ color: 0x1e1f21, roughness: 0.8 })));   // shadow gap at the foot
          starJasmine(G.site, pf, (a + b) / 2, z0 + pH - 0.03, [3, 8, 13][i], { pocket: false, height: S.west_fence.h - pH - 0.06 });   // kept below the screen's top
        }
      }
    }
    palingFence(G.site, S.east_fence.x - 0.03, S.east_fence.x + 0.03, S.east_fence.y0, S.east_fence.y1, gz, gz + S.east_fence.h, 1, '+x');
    palingFence(G.site, 0, lot.width, S.rear_fence.y - 0.03, S.rear_fence.y + 0.03, gz, gz + S.rear_fence.lattice_from, -1, '-y');
    for (let x = 0.05; x < lot.width; x += 0.1) box(G.site, x, x + 0.02, S.rear_fence.y - 0.015, S.rear_fence.y + 0.015, gz + S.rear_fence.lattice_from, gz + S.rear_fence.h, M.fence);   // lattice top
    box(G.site, 0, lot.width, S.rear_fence.y - 0.02, S.rear_fence.y + 0.02, gz + S.rear_fence.h - 0.04, gz + S.rear_fence.h, M.fence);
    // --- garden lighting (2026-10-21; DECOR-STYLING / BEDROOM-LIGHTING rules: 2700 K, CRI 90+, light surfaces, no glare) ---
    {
      const rz = S.rear_slab.z, deck = spec.renovation.deck_zones?.[0], dz = deck ? deck.z : rz;
      // the feature wall: the white rear fence, washed up from a continuous LED strip at its base (behind the hedge, so
      // the hedge reads backlit), ~400 lm/m, wide 120-degree diffused tape in an aluminium angle, aimed up the palings
      const fy = S.rear_fence.y - 0.03, sz = rz + S.rear_bed_south.edge_h - 0.03;
      box(G.site, 0.12, lot.width - 0.08, fy - 0.035, fy - 0.01, sz, sz + 0.02, decMat('alu', 0x8d8f91, { roughness: 0.4, metalness: 0.6 }));
      box(G.site, 0.12, lot.width - 0.08, fy - 0.03, fy - 0.015, sz + 0.02, sz + 0.023, bedGlow('lGarden'));
      wallFace(G.site, 'y', fy - 0.004, -1, lot.width / 2, rz + 0.95, lot.width - 0.1, 1.9, glowMat('strip', 0.85));   // flat on the palings; soft at the ends
      // the side fences: uplights grazing the white palings, ~1.3 m apart. West (along the deck): recessed in the deck
      // boards beside the fence; east (along the lawn behind the bathroom wing): on spikes in the lawn.
      const wf = S.west_fence.x - 0.03;
      for (const y of deck ? [25.55, 26.85, 28.0] : [25.6, 27.0]) fenceUplight(G.site, 'x', wf, -1, y, dz, { recessed: !!deck });
      // the jasmine feature wall (west fence opposite the lounge's glass): a continuous strip at its foot behind the vines,
      // washing up through the leaves (~350 lm/m), the same soft wash as the rear fence
      const LgW = (spec.renovation.lounge?.windows || []).filter(w => w.floorGlass);
      if (LgW.length) {
        const jy0 = Math.min(...LgW.map(w => w.y0)) - 1.0, jy1 = Math.max(...LgW.map(w => w.y1)) + 1.0;
        if (spec.renovation.lounge_fence === 'screen') {
          // the batten screen with its planters (default): a strip tucked under each planter's folded rim on the screen
          // side, washing up the battens from the rim (z0 + 0.4) to the top; the wash lies on the batten faces, just
          // behind the vines
          const sx = S.west_fence.x - 0.03 - 0.09 - 0.045 - 0.004, z0 = gz + 0.4, zt = gz + S.west_fence.h;
          box(G.site, sx - 0.012, sx, jy0 + 0.05, jy1 - 0.05, z0 - 0.01, z0 + 0.008, bedGlow('lGarden'));
          wallFace(G.site, 'x', sx, -1, (jy0 + jy1) / 2, (z0 + zt) / 2, jy1 - jy0, zt - z0, glowMat('tall', 1.0));
        } else {
          // the lattice on the fence: a strip at the fence's foot behind the vines, the wash flat on the palings
          const jz = rz, jf = wf - 0.12;
          box(G.site, jf - 0.025, jf, jy0 + 0.05, jy1 - 0.05, jz, jz + 0.02, decMat('alu', 0x8d8f91, { roughness: 0.4, metalness: 0.6 }));
          box(G.site, jf - 0.02, jf - 0.005, jy0 + 0.05, jy1 - 0.05, jz + 0.02, jz + 0.023, bedGlow('lGarden'));
          wallFace(G.site, 'x', wf - 0.004, -1, (jy0 + jy1) / 2, jz + 1.0, jy1 - jy0, 2.0, glowMat('tall', 0.9));
        }
        // and the vines themselves catch it: the jasmine's leaves and flowers glow softly on the garden circuit, so they read
        // lit in front of the bright wall instead of as silhouettes (client)
        for (const [m, col, k] of [[M.jasLeaf, 0x3c5c34, 0.45], [M.jasFlower, 0xfff0d8, 0.3]]) if (m) { m.emissive.set(col); m.userData.bedLamp = 'lGarden'; m.userData.glowK = k; }
      }
      // the side path by the kitchen: recessed uplights in the bistro deck beside the fence, and spike uplights in the
      // planted bed further north, grazing the white palings
      { const sd = S.side_deck, wp = S.west_path, dTop = wp.z + sd.h;
        for (const y of [16.5, 17.8, 19.0]) fenceUplight(G.site, 'x', wf, -1, y, dTop, { recessed: true });
        for (const y of [12.6, 13.9, 15.2]) fenceUplight(G.site, 'x', wf, -1, y, wp.z); }
      const ef = S.east_fence.x + 0.03;
      for (const y of [25.7, 27.05, 28.4]) fenceUplight(G.site, 'x', ef, 1, y, rz);
      // (the deck step lights and their pools came out, client 2026-10-21)
    }
    box(G.site, S.side_pier.x0, S.side_pier.x1, S.side_pier.y0, S.side_pier.y1, gz, gz + S.side_pier.h, M.white);
    box(G.site, S.side_gate.x0, S.side_gate.x1, S.side_gate.y - 0.02, S.side_gate.y + 0.02, gz, gz + S.side_gate.h, M.creamMetal).userData.door = true;
    box(G.site, S.side_gate.x0, S.side_gate.x0 + 0.05, S.side_gate.y - 0.05, S.side_gate.y + 0.05, gz, gz + S.side_gate.h + 0.1, M.green);   // hinge post on the house
    // back-door steps down to the lounge floor: equal risers, fewer steps as the floor is built up
    const bs = S.back_steps, lf = spec.rooms.find(r => r.name === 'Lounge / living').floor, rise = -lf;
    const nSteps = rise >= 0.3 ? 2 : rise >= 0.15 ? 1 : 0;
    if (nSteps === 2) {
      box(G.site, bs.x0, bs.x1, bs.y0, bs.y0 + 0.3, Lv.slab, lf + rise * 2 / 3, M.concrete);
      box(G.site, bs.x0, bs.x1, bs.y0 + 0.3, bs.y1, Lv.slab, lf + rise / 3, M.concrete);
    } else if (nSteps === 1) box(G.site, bs.x0, bs.x1, bs.y0, bs.y0 + 0.3, Lv.slab, lf + rise / 2, M.concrete);
    // downpipes and the gas meter on the west wall
    for (const dp of S.downpipes) box(G.site, dp.x - 0.04, dp.x + 0.04, dp.y - 0.04, dp.y + 0.04, gz, dp.x > 4 ? W.plate_z - 0.1 : W.wing_plate_z - 0.3, dp.y > 24 && !spec.renovation.cream_exterior ? M.metal : M.fence);
    const gm = S.gas_meter; box(G.site, gm.x0, gm.x1, gm.y0, gm.y1, gm.z0, gm.z1, M.tileCream);
    // white steel security screen closing the porch at the street face
    // The fixed surround meets both porch walls, the floor and the lintel.
    // Keep the operable grille inside it with a 3 mm clearance on every edge.
    // (Reno can remove it)
    if (spec.renovation.porch_screen !== false) {
    const opening = S.security_screen, frame = 0.04, clearance = 0.003;
    const surround = new THREE.Group(); surround.name = 'Porch screen fixed frame'; G.site.add(surround);
    for (const [x0, x1] of [[opening.x0, opening.x0 + frame], [opening.x1 - frame, opening.x1]])
      box(surround, x0, x1, opening.y - 0.02, opening.y + 0.02, opening.z0, opening.z1, M.fence);
    for (const z of [opening.z0, opening.z1 - frame])
      box(surround, opening.x0 + frame, opening.x1 - frame, opening.y - 0.02, opening.y + 0.02, z, z + frame, M.fence);
    const inset = frame + clearance;
    const ss = { ...opening, x0: opening.x0 + inset, x1: opening.x1 - inset, z0: opening.z0 + inset, z1: opening.z1 - inset };
    // open scrollwork: a frame with bars, so the door behind stays visible
    const scr = new THREE.Group(); scr.name = 'Porch screen grille'; G.site.add(scr);
    for (const [x0, x1] of [[ss.x0, ss.x0 + 0.04], [ss.x1 - 0.04, ss.x1]]) box(scr, x0, x1, ss.y - 0.015, ss.y + 0.015, ss.z0, ss.z1, M.fence);
    for (const z of [ss.z0, ss.z0 + 0.9, 2.04, ss.z1 - 0.04]) box(scr, ss.x0, ss.x1, ss.y - 0.015, ss.y + 0.015, z, z + 0.04, M.fence);
    for (let x = ss.x0 + 0.12; x < ss.x1 - 0.06; x += 0.11) box(scr, x, x + 0.015, ss.y - 0.008, ss.y + 0.008, ss.z0 + 0.04, ss.z1 - 0.04, M.fence);
    for (let z = ss.z0 + 0.3; z < 2.0; z += 0.3) box(scr, ss.x0 + 0.04, ss.x1 - 0.04, ss.y - 0.006, ss.y + 0.006, z, z + 0.012, M.fence);
    scr.traverse(o => { if (o.isMesh) o.userData.door = true; });           // hidden in walk mode, never a collider
    }
    // raised concrete apron along the wall inside the side gate, and the Brivis heater standing on it
    const ap = S.apron, pz = S.west_path.z, az = pz + ap.h;
    box(G.site, ap.x0, ap.x1, ap.y0, ap.y1, pz - 0.02, az, M.concrete);
    const dh = S.ducted_heater, grey = M.heaterGrey || (M.heaterGrey = new THREE.MeshStandardMaterial({ color: 0xc9c9c4, roughness: 0.6, metalness: 0.2 }));
    const light = M.heaterLight || (M.heaterLight = new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: 0.55, metalness: 0.15 }));
    box(G.site, dh.x0, dh.x1 - 0.04, dh.y0, dh.y1, az, az + dh.h * 0.62, grey);                    // lower cabinet
    box(G.site, dh.x0, dh.x1, dh.y0 + 0.01, dh.y1 - 0.01, az + dh.h * 0.62, az + dh.h, light);      // access panel box on top, slightly proud
    box(G.site, dh.x1, dh.x1 + 0.005, dh.y0 + 0.2, dh.y1 - 0.2, az + dh.h * 0.8, az + dh.h * 0.84, M.grille);   // flue outlet
    box(G.site, dh.x1 - 0.045, dh.x1 - 0.04, dh.y0 + 0.08, dh.y0 + 0.2, az + 0.35, az + 0.45, M.grille);          // badge
    box(G.site, 4.93, 4.97, dh.y0 - 0.6, dh.y1 + 0.4, az + 0.3, az + 0.34, M.fence);               // white pipe along the wall
    const hw = S.hot_water; box(G.site, hw.x0, hw.x1, hw.y0, hw.y1, hw.z0, hw.z1, M.appliance);
  }
  // Enclose the former covered area. Walls follow the existing roof underside.
  const lr = spec.renovation.lounge, cr = R.covered;
  // Two shallow steps from the new kitchen French doors to the side path.
  if (!spec.renovation.no_side_door) {
    box(G.site,4.92,5.22,Win.W3_kitchen.y0,Win.W3_kitchen.y1,-0.42,-0.14,M.concrete);
    box(G.site,5.22,5.52,Win.W3_kitchen.y0,Win.W3_kitchen.y1,-0.42,-0.28,M.concrete);
  }
  const top = x => cr.z_top_east + (cr.z_top_west-cr.z_top_east)*(x-cr.x0)/(cr.x1-cr.x0)-lr.roof_thickness;
  const low = top(lr.wall_outer_x), floor = Lv.slab;
  wallRect(ext,lr.wall_x,lr.wall_outer_x,19.54,25.0,floor,low,
    lr.windows.map(w=>({from:w.y0,to:w.y1,sill:w.sill,head:w.head,kind:'window',frame:w.floorGlass?'alu':'white',panels:w.panels,floorGlass:w.floorGlass,trim:w.floorGlass?false:undefined})),M.white);
  // Fill to the sloping ceiling along the inner wall face.
  box(ext,lr.wall_x,lr.wall_outer_x,19.54,25.0,low,top(lr.wall_x),M.intWall);
  wallRect(ext,2.25,lr.wall_x,lr.south_y,25.0,floor,low,
    [{from:lr.back_door.from,to:lr.back_door.to,sill:loungeFloor,head:loungeFloor+lr.back_door.h,kind:lr.back_door.kind,frame:lr.back_door.frame,leaves:lr.back_door.leaves,stack:lr.back_door.stack,screens:lr.back_door.screens,swing:lr.back_door.swing}],M.white);
  wallRect(ext,4.92,lr.wall_outer_x,19.31,19.54,floor,low,
    [{from:lr.side_door[0],to:lr.side_door[1],sill:loungeFloor,head:loungeFloor+lr.slider_head,kind:'glassDoor',hinge:'end',frame:'whiteAlu'}],M.white);   // hinged on the west (left, from inside)
  // A raised roof can clear the wing and kitchen walls (plate 3.35): carry them up as parapets to meet it.
  const roofTop = x => top(x) + lr.roof_thickness, plate = W.wing_plate_z;
  if (roofTop(cr.x0) > plate + 0.005) {
    const zt = roofTop(cr.x0), ya = H.y_rear_outer, yb = H.wing.y_end_outer, xi = H.wing.x_inner, xo = H.wing.x_outer;
    poly(ext, [[xi, ya, plate], [xi, yb, plate], [xi, yb, zt], [xi, ya, zt]], M.red);            // above the wing roof
    poly(ext, [[xo, ya, plate], [xo, yb, plate], [xo, yb, zt], [xo, ya, zt]], M.intWall);        // lounge side, plastered
    poly(ext, [[xi, ya, zt], [xo, ya, zt], [xo, yb, zt], [xi, yb, zt]], M.red);
    poly(ext, [[xi, yb, plate], [xo, yb, plate], [xo, yb, zt], [xi, yb, zt]], M.red);
    // kitchen rear wall: sloped top following the roof, from the wing to where the roof drops below the plate
    const xa = H.wing.x_outer, xb = Math.min(H.x_west_outer, cr.x0 + (roofTop(cr.x0) - plate) / (roofTop(cr.x0) - roofTop(cr.x1)) * (cr.x1 - cr.x0));
    if (xb > xa + 0.01) {
      for (const y of [H.y_rear_inner, H.y_rear_outer]) poly(ext, [[xa, y, plate], [xb, y, plate], [xb, y, roofTop(xb)], [xa, y, roofTop(xa)]], y === H.y_rear_outer ? M.intWall : M.red);
      poly(ext, [[xa, H.y_rear_inner, roofTop(xa)], [xb, H.y_rear_inner, roofTop(xb)], [xb, H.y_rear_outer, roofTop(xb)], [xa, H.y_rear_outer, roofTop(xa)]], M.red);
    }
  }
  for(const [x0,x1,y0,y1] of [[2.25,lr.wall_x,24.77,25.0],[4.92,lr.wall_outer_x,19.31,19.54]]) {
    poly(ext,[[x0,y0,low],[x1,y0,low],[x1,y0,top(x1)],[x0,y0,top(x0)]],M.white);
    poly(ext,[[x0,y1,low],[x1,y1,low],[x1,y1,top(x1)],[x0,y1,top(x0)]],M.intWall);
  }
  // --- outdoor lounge on the rear tiles (spec.site_items.outdoor_lounge, reference screenshots 2026-09-27): a teak
  // three-seat sofa and two armchairs with open frames (tapered legs, a base rail, a flat 120 mm arm band that wraps
  // round the back) and off-white cushions; a small slatted teak coffee table between them
  {
    const ol = spec.site_items.outdoor_lounge, z = spec.renovation.yard === 'deck' ? loungeFloor : spec.site_items.rear_slab.z;   // on the deck when there is one
    const teak = M.teak || (M.teak = new THREE.MeshStandardMaterial({ color: 0xc19a6c, roughness: 0.65 }));
    const fab = M.outdoorFab || (M.outdoorFab = new THREE.MeshStandardMaterial({ color: 0xebe8e1, roughness: 0.95 }));
    // everything below is built round its own centre in lot axes (front to -y) and then placed and turned
    const cushion = (g, x, y, zc, w, d, t, r, tilt = 0) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, t, d, 3, r), fab); m.position.copy(L(x, y, zc)); m.rotation.x = tilt; g.add(m);
    };
    const lounger = (W, D, H, n) => {
      const g = new THREE.Group(), x0 = -W / 2, x1 = W / 2, y0 = -D / 2, y1 = D / 2, lw = 0.05, t = 0.035, a0 = 0.5, a1 = 0.62;
      for (const x of n > 1 ? [x0, -lw / 2, x1 - lw] : [x0, x1 - lw]) {                          // legs, a middle pair on the sofa
        box(g, x, x + lw, y0, y0 + lw, 0, x === x0 || x === x1 - lw ? a1 : 0.2, teak);           // front ones run up as the arm posts
        box(g, x, x + lw, y1 - lw, y1, 0, x === x0 || x === x1 - lw ? a1 : 0.2, teak);
      }
      box(g, x0 + lw, x1 - lw, y0, y0 + t, 0.14, 0.2, teak); box(g, x0 + lw, x1 - lw, y1 - t, y1, 0.14, 0.2, teak);   // base rails
      box(g, x0, x0 + t, y0 + lw, y1 - lw, 0.14, 0.2, teak); box(g, x1 - t, x1, y0 + lw, y1 - lw, 0.14, 0.2, teak);
      box(g, x0 + t, x1 - t, y0 + t, y1 - t, 0.18, 0.2, teak);                                    // seat deck
      box(g, x0, x0 + t, y0 + lw, y1 - lw, a0, a1, teak); box(g, x1 - t, x1, y0 + lw, y1 - lw, a0, a1, teak);   // arm bands
      box(g, x0 + t, x1 - t, y1 - t, y1, a0, a1, teak);                                          // and round the back
      const cw = (W - 2 * t - 0.02) / n;
      for (let i = 0; i < n; i++) {
        const cx = x0 + t + 0.01 + cw * (i + 0.5);
        cushion(g, cx, -0.07, 0.3, cw - 0.012, D - 0.2, 0.2, 0.045);                              // seat, top at 400
        cushion(g, cx, y1 - 0.16, (0.4 + H) / 2 + 0.01, cw - 0.02, 0.17, H - 0.42, 0.06, 0.2);  // back, leaning onto the band
      }
      return g;
    };
    const place = (g, x, y, faceX, faceY) => {                                                     // turn the front (-y) toward (faceX, faceY)
      g.position.copy(L(x, y, z)); if (faceX !== undefined) g.rotation.y = Math.atan2(faceX - x, -(faceY - y));
      g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      G.furniture.add(g);
    };
    const so = ol.sofa, tb = ol.table, ac = ol.armchair;
    place(lounger(so.w, so.d, so.h, 3), so.x, so.y);
    for (const c of ol.armchairs) place(lounger(ac.w, ac.d, ac.h, 1), c.x, c.y, tb.x, c.straight ? c.y : tb.y);   // straight: square to the table
    // coffee table: seven top slats with 6 mm gaps over an apron, square legs
    const tg = new THREE.Group(), hx = tb.w / 2, hy = tb.d / 2, sw = (tb.d - 6 * 0.006) / 7;
    for (let i = 0; i < 7; i++) { const y = -hy + i * (sw + 0.006); box(tg, -hx, hx, y, y + sw, tb.h - 0.022, tb.h, teak); }
    box(tg, -hx + 0.03, hx - 0.03, -hy + 0.03, -hy + 0.05, tb.h - 0.08, tb.h - 0.022, teak); box(tg, -hx + 0.03, hx - 0.03, hy - 0.05, hy - 0.03, tb.h - 0.08, tb.h - 0.022, teak);
    for (const x of [-hx + 0.03, hx - 0.075]) for (const y of [-hy + 0.03, hy - 0.075]) box(tg, x, x + 0.045, y, y + 0.045, 0, tb.h - 0.022, teak);
    place(tg, tb.x, tb.y);
  }
  // Give site gates and the porch security screen the same door interaction.
  const siteDoors = G.site.children.filter(o => o.userData.door || (o.isGroup && o.children.some(c=>c.userData.door)));
  for (const obj of siteDoors) {
    const bounds = new THREE.Box3().setFromObject(obj);
    const assembly = new THREE.Group(); assembly.userData.operable=true; assembly.userData.open=false; G.site.add(assembly);
    const pivot = new THREE.Group(); pivot.position.set(bounds.min.x,bounds.min.y,(bounds.min.z+bounds.max.z)/2);
    G.site.add(pivot); G.site.updateMatrixWorld(true); pivot.attach(obj); assembly.attach(pivot);
    pivot.userData.closedPosition=pivot.position.clone(); pivot.userData.swing=Math.PI/2;
  }
  // face brick: world-aligned coursing on every brick surface, including the cloned double-sided pieces
  for (const k in G) G[k].traverse(o => { if (o.isMesh && o.material?.userData?.brick) brickUV(o); });
  return G;
}

function label(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(20,20,20,0.6)'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(2, 0.5, 1);
  return s;
}
