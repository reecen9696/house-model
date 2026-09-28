// Builds the house from spec.json. Pure geometry: no camera, lights or UI here.
// Lot frame (x west, y south, z up) -> three.js (X = -x, Y = z, Z = y). Right-handed.
import * as THREE from 'three';

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
// Baltic pine floorboards about 0.1 m wide, 1.5-4 m long, running along the length of the house.
// One tile = 2 m across x 6 m along, so the repeat is not obvious. Each plank gets its own tone, long
// wavering grain lines, the odd knot, a shadow line in the gap and a lit edge; the same canvas doubles
// as a bump map so the gaps and grain catch the light.
const BOARD_TILE = [2, 6];
function boardTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 3072; const g = c.getContext('2d');
  const bw = c.width / 20;                                              // 20 boards across 2 m
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 20; i++) {
    const x = i * bw;
    // Wrap whole planks across the texture boundary. Clipping random planks at
    // the tile edges created a straight colour seam across every board at 6 m.
    const count = 2 + Math.floor(Math.random() * 2);
    const weights = Array.from({ length: count }, () => 0.8 + Math.random() * 0.4);
    const total = weights.reduce((a, b) => a + b, 0);
    let y = Math.random() * c.height;
    for (const weight of weights) {
      const len = weight / total * c.height;
      const h = rnd(31, 35), s = rnd(34, 40), l = rnd(56, 61);        // planks close in tone: one consistent honey pine
      for (const offset of [-c.height, 0]) {
        const y0 = y + offset;
        g.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        g.fillRect(x, y0, bw, len + 1);
        // grain: long slightly wavy streaks along the plank, darker and lighter than the base
        g.save(); g.beginPath(); g.rect(x, y0, bw, len + 1); g.clip();
        for (let k = 0; k < 14; k++) {
          const gx = x + rnd(1, bw - 1), dark = Math.random() < 0.65;
          g.strokeStyle = dark ? `hsla(${h - 3}, ${s + 8}%, ${l - rnd(8, 16)}%, ${rnd(0.12, 0.28)})` : `hsla(${h + 3}, ${s - 6}%, ${l + rnd(4, 9)}%, ${rnd(0.1, 0.22)})`;
          g.lineWidth = rnd(0.6, 2.2); g.beginPath(); g.moveTo(gx, y0);
          for (let yy = y0; yy < y0 + len + 40; yy += 40) g.quadraticCurveTo(gx + rnd(-3, 3), yy + 20, gx + rnd(-1.5, 1.5), yy + 40);
          g.stroke();
        }
        // wider soft cathedral figure down the middle of some planks
        if (Math.random() < 0.5) {
          const cx = x + bw / 2 + rnd(-8, 8);
          g.strokeStyle = `hsla(${h - 3}, ${s + 6}%, ${l - 7}%, 0.1)`; g.lineWidth = rnd(5, 9);
          g.beginPath(); g.moveTo(cx, y0);
          for (let yy = y0; yy < y0 + len + 60; yy += 60) g.quadraticCurveTo(cx + rnd(-6, 6), yy + 30, cx + rnd(-4, 4), yy + 60);
          g.stroke();
        }
        // the odd knot: a small dark oval with a ring or two around it
        if (Math.random() < 0.35) {
          const kx = x + rnd(10, bw - 10), ky = y0 + rnd(60, len - 60);
          for (let r = 7; r > 0; r -= 2) {
            g.fillStyle = `hsla(${h - 8}, ${s + 12}%, ${l - 30 + r * 2}%, ${r === 1 ? 0.9 : 0.35})`;
            g.beginPath(); g.ellipse(kx, ky, r, r * 1.6, 0, 0, Math.PI * 2); g.fill();
          }
        }
        g.restore();
        // end joint: a dark line where the next plank starts
        g.fillStyle = 'rgba(50,30,12,0.7)'; g.fillRect(x, y0, bw, 2);
      }
      y = (y + len) % c.height;
    }
    // gap between boards (shadow line) and the lit edge of the next board
    g.fillStyle = 'rgba(45,25,10,0.6)'; g.fillRect(x, 0, 2.5, c.height);
    g.fillStyle = 'rgba(255,240,210,0.18)'; g.fillRect(x + 2.5, 0, 1.5, c.height);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Treated-pine paling fence, weathered grey-brown: 100 mm palings with 9 mm gaps, vertical grain, nail
// heads at the rail lines. One tile = 1.2 m along (11 palings) x 2 m high; applied with fenceUV so the
// palings run upright and continue along a fence of any length.
const PALING_TILE = [1.2, 2.0];
function palingTexture() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 1280; const g = c.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  g.fillStyle = '#2a2520'; g.fillRect(0, 0, c.width, c.height);          // the gaps: dark, whatever is behind
  const n = 11, pw = c.width / n, gap = 5.8;
  for (let i = 0; i < n; i++) {
    const x = i * pw, w = pw - gap;
    const grey = Math.random() < 0.55;                                    // some palings silvered, some still brown
    const h = grey ? rnd(25, 40) : rnd(28, 36), s = grey ? rnd(6, 14) : rnd(18, 30), l = grey ? rnd(46, 60) : rnd(40, 52);
    g.fillStyle = `hsl(${h}, ${s}%, ${l}%)`; g.fillRect(x, 0, w, c.height);
    g.save(); g.beginPath(); g.rect(x, 0, w, c.height); g.clip();
    for (let k = 0; k < 22; k++) {                                        // vertical grain streaks
      const gx = x + rnd(1, w - 1), dark = Math.random() < 0.6;
      g.strokeStyle = dark ? `hsla(${h}, ${s + 8}%, ${l - rnd(10, 20)}%, ${rnd(0.2, 0.45)})` : `hsla(${h}, ${s - 4}%, ${l + rnd(6, 12)}%, ${rnd(0.15, 0.3)})`;
      g.lineWidth = rnd(0.5, 2); g.beginPath(); g.moveTo(gx, -10);
      for (let yy = 0; yy < c.height + 40; yy += 40) g.quadraticCurveTo(gx + rnd(-2.5, 2.5), yy + 20, gx + rnd(-1.5, 1.5), yy + 40);
      g.stroke();
    }
    // weather staining: darker toward the bottom, a paler band near the top
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(30,20,10,0.28)');
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
function palingFence(group, x0, x1, y0, y1, z0, z1, rails = 0) {
  const along = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? 'x' : 'y';
  const panel = fenceUV(box(group, x0, x1, y0, y1, z0, z1, M.paling), PALING_TILE, along);
  if (!rails) return panel;
  const h = z1 - z0, a0 = along === 'x' ? Math.min(x0, x1) : Math.min(y0, y1), a1 = along === 'x' ? Math.max(x0, x1) : Math.max(y0, y1);
  const face = along === 'x' ? (rails > 0 ? Math.max(y0, y1) : Math.min(y0, y1)) : (rails > 0 ? Math.max(x0, x1) : Math.min(x0, x1));
  const r0 = face, r1 = face + rails * 0.038, p1 = face + rails * 0.09;
  for (const f of [0.12, 0.5, 0.88]) {                                      // 75 x 38 rails
    const rz = z0 + h * f - 0.037;
    if (along === 'x') box(group, a0, a1, Math.min(r0, r1), Math.max(r0, r1), rz, rz + 0.075, M.railTimber);
    else box(group, Math.min(r0, r1), Math.max(r0, r1), a0, a1, rz, rz + 0.075, M.railTimber);
  }
  for (let a = a0 + 0.05; a < a1 - 0.05; a += 2.4) {                        // 90 x 90 posts
    if (along === 'x') box(group, a, a + 0.09, Math.min(r0, p1), Math.max(r0, p1), z0, z1 - 0.02, M.railTimber);
    else box(group, Math.min(r0, p1), Math.max(r0, p1), a, a + 0.09, z0, z1 - 0.02, M.railTimber);
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

function mats() {
  const s = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, shadowSide: THREE.FrontSide, ...o });
  M.white = s(0xe8e4dc);                 // painted brick, main house
  { const bt = brickTextures(); M.red = s(0xffffff, { map: bt.map, bumpMap: bt.bump, bumpScale: 0.035, roughness: 0.88 }); M.red.userData.brick = true; }   // face brick, wing and chimney
  M.intWall = s(0xf2efe6);
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
  M.tileFloor = s(0x8f4a3a);
  M.grass = s(0x6f8f4a);
  M.paving = s(0xc2c1bb);
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide });
  M.frameT = s(0x3a2a1c);
  M.frameA = s(0x2b2b2b, { metalness: 0.5, roughness: 0.4 });
  M.door = s(0xb0703a, { roughness: 0.6 });          // honey-stained timber doors (photos)
  M.honey = s(0xa9652f, { roughness: 0.6 });         // kitchen joinery carcass
  M.honeyPanel = s(0xb8773d, { roughness: 0.55 });   // raised door panels
  M.trimDark = s(0x3b2317, { roughness: 0.6 });      // dark-stained skirting and architraves (hall, bedrooms, living)
  M.laminate = s(0x9a7a55, { roughness: 0.5 });      // benchtop: tan speckled laminate (listing photo)
  M.appliance = s(0xf2f2ef, { roughness: 0.35 });
  M.tileCream = s(0xe9e3d3, { roughness: 0.4 });
  M.grille = s(0x1f1f1f, { roughness: 0.5, metalness: 0.4 });
  M.lino = s(0xffffff, { map: linoTexture(), roughness: 0.8 }); M.lino.userData.tile = [1, 1];
  M.timber = s(0xffffff, { map: boardTexture(), roughness: 0.6 }); M.timber.bumpMap = M.timber.map; M.timber.bumpScale = 0.012; M.timber.userData.tile = BOARD_TILE;
  M.fence = s(0xf4f2ee);
  M.paling = s(0xffffff, { map: palingTexture(), roughness: 0.9 }); M.paling.bumpMap = M.paling.map; M.paling.bumpScale = 0.02;
  M.railTimber = s(0x8b7b66, { roughness: 0.9 });   // rails and posts, plain treated pine
  M.green = s(0x3f5a3a);
  M.shed = s(0xb9bec2, { metalness: 0.5, roughness: 0.5 });
  M.ceiling = s(0xf7f5f0, { side: THREE.DoubleSide });
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
    if (!isWall) return;
    for (const sgn of [1, -1]) {
      const r = sideRoom(o.at + o.w / 2, sgn); if (!r) continue;
      const m = (o.honey ? M.honey : trimFor(r)), aw = o.kind === 'opening' ? 0.2 : 0.075, bot = o.kind === 'window' ? o.sill - 0.06 : r.floor;
      const left = o.leftArchi !== false, right = o.rightArchi !== false;
      if (left) strip(o.at - aw, o.at, bot, o.head + aw, sgn, 0.02, m);
      if (right) strip(o.at + o.w, o.at + o.w + aw, bot, o.head + aw, sgn, 0.02, m);
      strip(left ? o.at - aw : o.at, right ? o.at + o.w + aw : o.at + o.w, o.head, o.head + aw, sgn, 0.02, m);
      if (o.kind === 'window') strip(o.at - aw, o.at + o.w + aw, o.sill - 0.03, o.sill, sgn, 0.06, m);   // sill board
    }
  };
  const ops = [...openings].sort((p, q) => p.at - q.at);
  let cur = 0;
  for (const o of ops) {
    piece(cur, o.at, z0, z1, mat); skirt(cur, o.at, z0); archi(o);
    if (o.kind === 'window') { if (o.sill > z0) piece(o.at, o.at + o.w, z0, o.sill, mat); skirt(o.at, o.at + o.w, z0); }
    else if (o.sill - 0.05 > z0 + 0.01) piece(o.at, o.at + o.w, z0, o.sill - 0.05, mat);   // stop below the full 5 cm threshold, including its exposed front edge
    piece(o.at, o.at + o.w, o.head, z1, mat);
    if (o.kind === 'window') {
      // Fit the pane inside the frame aperture: full-width glass puts its edge
      // on the jamb face, causing flicker beside the front-door sidelight.
      const f = o.frame === 'alu' ? M.frameA : o.frame === 'sage' ? M.sage : M.frameT, t = 0.05;
      piece(o.at + t, o.at + o.w - t, o.sill + t, o.head - t, o.amber ? M.amber : glassMat, 0.02);
      piece(o.at, o.at + t, o.sill, o.head, f); piece(o.at + o.w - t, o.at + o.w, o.sill, o.head, f);
      // Rails meet the stiles without overlapping their front faces.
      piece(o.at + t, o.at + o.w - t, o.sill, o.sill + t, f); piece(o.at + t, o.at + o.w - t, o.head - t, o.head, f);
    } else if (o.kind === 'door' && o.leaf !== 'none') {
      const gd = new THREE.BoxGeometry(o.w - 0.04, o.head - Math.max(o.sill, z0) - 0.02, 0.04);
      const m = new THREE.Mesh(gd, o.white ? M.fence : M.door);
      const cx = a[0] + ux * (o.at + o.w / 2), cy = a[1] + uy * (o.at + o.w / 2);
      m.position.copy(L(cx, cy, (o.head + Math.max(o.sill, z0)) / 2));
      m.rotation.y = phi; m.castShadow = true; if (!o.cupboard) m.userData.door = true; group.add(m);   // cupboard doors stay shut in walk mode
      if (o.leaf === 'open') { m.rotation.y += Math.PI / 2 * 0.85; m.position.add(L(0, 0, 0)); }
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
function roomAt(x, y) {
  return ROOMS.find(r => r.ceil != null && x >= r.x0 - 0.02 && x <= r.x1 + 0.02 && y >= r.y0 - 0.02 && y <= r.y1 + 0.02);
}
const trimFor = r => (r.name.startsWith('Kitchen') ? M.honey : M.trimDark);
function inRoom(x, y, z) {
  return ROOMS.some(r => r.ceil != null && x >= r.x0 - 0.02 && x <= r.x1 + 0.02 && y >= r.y0 - 0.02 && y <= r.y1 + 0.02 && z >= r.floor - 0.5 && z <= r.floor + r.ceil + 0.3);
}

export function buildHouse(spec) {
  mats();
  ROOMS = spec.rooms.concat([{ name: 'bay', x0: spec.house.bay.x0, x1: spec.house.bay.x1, y0: spec.house.y_front_outer - spec.house.bay.projection, y1: spec.house.y_front_inner, floor: 0, ceil: spec.house.bay.wall_top }]);
  const G = {
    exterior: new THREE.Group(), interior: new THREE.Group(), roof: new THREE.Group(),
    ceilings: new THREE.Group(), floors: new THREE.Group(), site: new THREE.Group(), labels: new THREE.Group(),
  };
  const H = spec.house, W = spec.walls, R = spec.roof, D = spec.doors, Win = spec.windows, Lv = spec.levels;
  const gz = spec.site.ground_z;
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
  wallRect(ext, H.porch.x0, H.porch.x1, H.porch.y1, H.porch.y1 + W.ext, Lv.porch, W.plate_z, [
    { from: D.front.x0, to: D.front.x1, sill: Lv.porch, head: D.front.head, kind: 'door', rightArchi: false },
    { from: D.front.sidelight.x0, to: D.front.sidelight.x1, sill: D.front.sidelight.sill, head: D.front.head, kind: 'window', frame: 'timber', amber: true, leftArchi: false },
  ], M.white);
  box(ext, D.front.sidelight.x0, D.front.sidelight.x1, H.porch.y1 + 0.02, H.porch.y1 + W.ext - 0.02, Lv.porch, D.front.sidelight.sill, M.fence);   // painted panel under the leadlight
  // porch floor and front step
  box(G.floors, H.porch.x0, H.porch.x1, H.porch.y0, H.porch.y1, Lv.porch - 0.1, Lv.porch, M.tileFloor);
  box(G.floors, D.front.x0 - 0.05, D.front.x1 + 0.05, H.porch.y1 - 0.3, H.porch.y1 - 0.01, Lv.porch, Lv.ffl - 0.03, M.tileFloor);   // tiled step up to the door
  // west wall with W1-W3
  wallRect(ext, H.x_west_inner, H.x_west_outer, H.y_front_outer, spec.chimney.y0, gz, W.plate_z,
    ['W1_bed2', 'W2_living'].map(k => ({ from: Win[k].y0, to: Win[k].y1, sill: Win[k].sill, head: Win[k].head, kind: 'window', frame: Win[k].frame, honey: true })),
    M.white);
  // one run from the chimney to the rear corner carries the whole kitchen window; a brick strip on top
  // lifts the wall to the flat kitchen roof where that roof begins
  const w3 = Win.W3_kitchen;
  wallRect(ext, H.x_west_inner, H.x_west_outer, spec.chimney.y0, H.y_rear_outer, gz, W.plate_z,
    [{ from: w3.y0, to: w3.y1, sill: w3.sill, head: w3.head, kind: 'window', frame: w3.frame }], M.red);
  box(ext, H.x_west_inner, H.x_west_outer, R.kitchen_flat.y0, H.y_rear_outer, W.plate_z, R.kitchen_flat.z, M.red);
  // 6. lintel wall over the porch opening, from the hood up to the plate
  wallRect(ext, H.porch.x0 - W.party_half, H.porch.x1, H.y_front_outer, H.y_front_inner, R.porch_hood.z_high - 0.05, W.plate_z, [], M.white);
  // kitchen rear wall (west of the wing) with the back door
  wallRect(ext, H.wing.x_inner + 0.055, H.x_west_outer, H.y_rear_inner, H.y_rear_outer, gz, W.wing_plate_z,
    [{ from: D.back.x0, to: D.back.x1, sill: 0, head: D.back.head, kind: 'door' }], M.red);
  // wing west wall (bath, wc, laundry windows + laundry door)
  wallRect(ext, H.wing.x_inner, H.wing.x_outer, H.y_rear_outer, H.wing.y_end_outer, gz, W.wing_plate_z, [
    ...['bath', 'wc', 'laundry'].map(k => ({ from: Win[k].y0, to: Win[k].y1, sill: Win[k].sill, head: Win[k].head, kind: 'window', frame: Win[k].frame })),
    { from: D.laundry.y0, to: D.laundry.y1, sill: Lv.slab, head: D.laundry.head + Lv.slab, kind: 'door', white: true },
  ], M.red);
  // wing rear wall
  wallRect(ext, 0, H.wing.x_outer, H.wing.y_end_inner, H.wing.y_end_outer, gz, W.wing_plate_z, [], M.red);
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
    { from: D.front_bed.y0, to: D.front_bed.y1, sill: 0, head: D.front_bed.head, kind: 'door' }], M.intWall);
  wallRect(int_, hs.rear_wall_x0, hs.rear_wall_x1, hs.step_y, 11.49, 0, W.plate_z, [
    { from: D.bed2.y0, to: D.bed2.y1, sill: 0, head: D.bed2.head, kind: 'door' }], M.intWall);
  wallRect(int_, hs.rear_wall_x0, H.x_west_inner, hs.step_y, hs.step_y + iw, 0, W.plate_z, [], M.intWall);   // bed1 / bed2, including the step's return
  wallRect(int_, W.party_half, H.x_west_inner, 11.49, 11.60, 0, W.plate_z, [                            // bed2+hall / living
    { from: D.hall_living.x0, to: D.hall_living.x1, sill: 0, head: D.hall_living.head, kind: 'door', leaf: D.hall_living.leaf }], M.intWall);
  wallRect(int_, W.party_half, H.x_west_inner, 14.91, 15.02, 0, W.plate_z, [                            // living / kitchen
    { from: D.living_kitchen_opening.x0, to: D.living_kitchen_opening.x1, sill: 0, head: D.living_kitchen_opening.head, kind: 'opening', honey: true }], M.intWall);
  const ks = spec.kitchen_south_wall;
  wallRect(int_, ks.x0, ks.x1, ks.y0, ks.y1, 0, 2.8, [                                                  // bath door + pantry door, flush
    { from: D.bath.x0, to: D.bath.x1, sill: 0, head: D.bath.head, kind: 'door' },
    { from: D.pantry.x0, to: D.pantry.x1, sill: 0, head: D.pantry.head, kind: 'door', cupboard: true }], M.intWall);
  wallRect(int_, ks.x1, ks.x1 + iw, ks.y0, H.y_rear_inner, 0, 2.8, [], M.intWall);                      // return into the back-door recess
  wallRect(int_, 2.02, 2.13, 18.98, H.y_rear_outer, 0, 2.8, [], M.intWall);                             // bath west wall inside kitchen
  wallRect(int_, W.party_half, H.wing.x_inner, 21.18, 21.29, 0, 2.8, [                                  // bath / wc
    { from: D.wc.x0, to: D.wc.x1, sill: 0, head: D.wc.head, kind: 'door' }], M.intWall);
  wallRect(int_, W.party_half, H.wing.x_inner, 22.16, 22.27, Lv.slab, 2.8, [], M.intWall);              // wc / laundry

  // fixtures
  const F = spec.fixtures;
  box(int_, F.robe_front.x0, F.robe_front.x1, F.robe_front.y0, F.robe_front.y1, 0, F.robe_front.z1, M.robe);
  box(int_, F.robe_bed2.x0, F.robe_bed2.x1, F.robe_bed2.y0, F.robe_bed2.y1, 0, F.robe_bed2.z1, M.robe);
  // robe fronts: door panels so the full-height robes read as joinery
  for (const r of [F.robe_front, F.robe_bed2]) {
    const n = Math.round((r.x1 - r.x0) / 0.6), w = (r.x1 - r.x0) / n;
    for (let i = 0; i < n; i++) { box(int_, r.x0 + i * w + 0.015, r.x0 + (i + 1) * w - 0.015, r.y0 - 0.012, r.y0, 0.05, 2.08, M.robePanel); box(int_, r.x0 + i * w + 0.015, r.x0 + (i + 1) * w - 0.015, r.y0 - 0.012, r.y0, 2.14, r.z1 - 0.05, M.robePanel); box(int_, r.x0 + (i + 0.85) * w, r.x0 + (i + 0.85) * w + 0.02, r.y0 - 0.03, r.y0 - 0.012, 1.0, 1.02, M.brass); }
    box(int_, r.x0, r.x1, r.y0 - 0.014, r.y0, 2.08, 2.14, M.robe);   // rail between doors and overhead cupboards
  }
  // --- kitchen, west wall and south corner (listing photo) ---
  {
    const B = F.bench, R = F.bench_return, t = B.top, fz = B.z1 - t;
    const run = (x0, x1, y0, y1, face) => {                 // base cabinets: carcass, kick, raised door fronts
      box(int_, x0, x1, y0, y1, 0.1, fz, M.honey);
      box(int_, x0 + 0.05, x1, y0, y1, 0, 0.1, M.trimDark);
      box(int_, x0 - 0.02, x1, y0 - 0.02, y1, fz, B.z1, M.laminate);
      const n = Math.max(1, Math.round((face === 'x' ? y1 - y0 : x1 - x0) / 0.5));
      for (let i = 0; i < n; i++) {
        if (face === 'x') {
          const w = (y1 - y0) / n, ya = y0 + i * w + 0.02, yb = y0 + (i + 1) * w - 0.02;
          if (yb > F.dishwasher.y0 + 0.05 && ya < F.dishwasher.y1 - 0.05) continue;         // dishwasher sits here
          if (yb > F.drawers.y0 + 0.05 && ya < F.drawers.y1 - 0.05) continue;               // drawer bank sits here
          box(int_, x0 - 0.014, x0, ya, yb, 0.14, fz - 0.03, M.honeyPanel);
        }
        else { const w = (x1 - x0) / n; box(int_, x0 + i * w + 0.02, x0 + (i + 1) * w - 0.02, y0 - 0.014, y0, 0.14, fz - 0.03, M.honeyPanel); }
      }
    };
    run(B.x0, B.x1, B.y0, B.y1, 'x');
    run(R.x0, B.x0, R.y0, R.y1, 'y');                      // short end cupboard only
    // dishwasher face and stainless double sink
    box(int_, B.x0 - 0.02, B.x0 + 0.01, F.dishwasher.y0 + 0.01, F.dishwasher.y1 - 0.01, 0.1, fz - 0.005, M.appliance);
    for (let i = 0; i < F.drawers.count; i++) { const dh = (fz - 0.14) / F.drawers.count; box(int_, B.x0 - 0.014, B.x0, F.drawers.y0 + 0.02, F.drawers.y1 - 0.02, 0.14 + i * dh + 0.01, 0.14 + (i + 1) * dh - 0.01, M.honeyPanel); }
    box(int_, B.x0 + 0.08, B.x1 - 0.12, F.sink.y0, F.sink.y1, B.z1, B.z1 + 0.006, M.metal);
    const sm = (F.sink.y0 + F.sink.y1) / 2; box(int_, B.x0 + 0.12, B.x1 - 0.16, sm - 0.02, sm + 0.02, B.z1 + 0.006, B.z1 + 0.01, M.laminate);   // divider between the two bowls
    box(int_, B.x1 - 0.09, B.x1 - 0.05, (F.sink.y0 + F.sink.y1) / 2 - 0.02, (F.sink.y0 + F.sink.y1) / 2 + 0.02, B.z1, B.z1 + 0.28, M.metal);   // tap
    // freestanding white gas stove, rangehood, tall uppers above
    const S = F.stove;
    box(int_, S.x0, S.x1, S.y0 + 0.01, S.y1 - 0.01, 0, S.z1, M.appliance);
    box(int_, S.x0 - 0.01, S.x0, S.y0 + 0.06, S.y1 - 0.06, 0.12, 0.62, M.frameA);          // oven door glass
    box(int_, S.x0 + 0.03, S.x1 - 0.03, S.y0 + 0.04, S.y1 - 0.04, S.z1, S.z1 + 0.01, M.appliance); // white cooktop
    for (const [bx, by] of [[0.17, 0.16], [0.43, 0.16], [0.17, 0.42], [0.43, 0.42]]) box(int_, S.x0 + bx - 0.06, S.x0 + bx + 0.06, S.y0 + by - 0.06, S.y0 + by + 0.06, S.z1 + 0.01, S.z1 + 0.03, M.grille);   // burner trivets
    const RH = F.rangehood; box(int_, RH.x0, RH.x1, RH.y0, RH.y1, RH.z0, RH.z1, M.appliance);
    const uppers = (u, face) => {
      box(int_, u.x0, u.x1, u.y0, u.y1, u.z0, u.z1, M.honey);
      const n = Math.max(1, Math.round((face === 'x' ? u.y1 - u.y0 : u.x1 - u.x0) / 0.45));
      for (let i = 0; i < n; i++) {
        if (face === 'x') { const w = (u.y1 - u.y0) / n; box(int_, u.x0 - 0.014, u.x0, u.y0 + i * w + 0.02, u.y0 + (i + 1) * w - 0.02, u.z0 + 0.03, u.z1 - 0.03, M.honeyPanel); }
        else { const w = (u.x1 - u.x0) / n; box(int_, u.x0 + i * w + 0.02, u.x0 + (i + 1) * w - 0.02, u.y0 - 0.014, u.y0, u.z0 + 0.03, u.z1 - 0.03, M.honeyPanel); }
      }
    };
    uppers(F.uppers_north, 'x'); uppers(F.uppers_corner, 'x');
    // cream tiled splashback: west wall (lower under the window), behind the stove, and the south return
    const sp = F.splash, wx = H.x_west_inner, w3 = Win.W3_kitchen;
    box(int_, wx - 0.012, wx, B.y0, w3.y0, sp.z0, F.uppers_north.z0, M.tileCream);
    box(int_, wx - 0.012, wx, w3.y0, w3.y1, sp.z0, w3.sill - 0.03, M.tileCream);
    box(int_, wx - 0.012, wx, w3.y1, B.y1, sp.z0, F.uppers_corner.z0, M.tileCream);
    box(int_, wx - 0.012, wx, S.y0, S.y1, S.z1, RH.z0, M.tileCream);
    box(int_, 3.84, wx, H.y_rear_inner - 0.012, H.y_rear_inner, sp.z0, 1.5, M.tileCream);            // bare tiled south wall, no cupboards
    // kitchen: cove cornice, oyster light, high wall vent
    for (const [x0, x1, y0, y1] of [[0.115, 4.69, 15.02, 15.12], [0.115, 4.69, 18.88, 18.98], [0.115, 0.215, 15.02, 18.98], [4.59, 4.69, 15.02, 18.98]]) box(int_, x0, x1, y0, y1, 2.7, 2.8, M.ceiling);
    const kl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.07, 20), M.appliance); kl.position.copy(L(F.kitchen_light.x, F.kitchen_light.y, 2.765)); int_.add(kl);
    box(int_, F.kitchen_wall_vent.x0, F.kitchen_wall_vent.x1, 18.98, 19.0, F.kitchen_wall_vent.z0, F.kitchen_wall_vent.z1, M.metal);
    // pantry shelves behind the tall door
    const P = F.pantry_shelves;
    for (const z of P.levels) box(int_, P.x0, P.x1, P.y0, P.y1, z, z + 0.02, M.robe);
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
  box(int_, T.x0, T.x0 + 0.2, T.y0 + 0.05, T.y1 - 0.05, 0.42, 0.85, M.appliance);                                   // cistern
  box(int_, T.x0 + 0.2, T.x1, tm - 0.19, tm + 0.19, 0.38, 0.42, M.appliance);                                       // seat
  box(int_, T.x0 + 0.25, T.x1 - 0.05, tm - 0.14, tm + 0.14, 0, 0.38, M.appliance);                                  // pan
  box(int_, F.wc_cabinet.x0, F.wc_cabinet.x1, F.wc_cabinet.y0, F.wc_cabinet.y1, F.wc_cabinet.z0, F.wc_cabinet.z1, M.honey);
  const LT = F.laundry_trough; box(int_, LT.x0, LT.x1, LT.y0, LT.y1, Lv.slab, Lv.slab + 0.88, M.appliance); box(int_, LT.x0 + 0.05, LT.x1 - 0.05, LT.y0 + 0.05, LT.y1 - 0.05, Lv.slab + 0.6, Lv.slab + 0.885, M.metal);
  const WM = F.washing_machine; box(int_, WM.x0, WM.x1, WM.y0, WM.y1, Lv.slab, Lv.slab + 0.85, M.appliance);
  // front bedroom: open shelving niche beside the robe
  const SH = F.shelves_front;
  box(int_, SH.x0, SH.x0 + 0.02, SH.y0, SH.y1, 0, 3.14, M.robe); box(int_, SH.x1 - 0.02, SH.x1, SH.y0, SH.y1, 0, 3.14, M.robe);   // cheeks
  box(int_, SH.x0, SH.x1, SH.y1 - 0.02, SH.y1, 0, 3.14, M.robe);                                                              // back, at the wall
  box(int_, SH.x0, SH.x1, SH.y0, SH.y1, 2.6, 2.62, M.robe); box(int_, SH.x0, SH.x1, SH.y0, SH.y0 + 0.04, 2.62, 3.14, M.robe); // head with a cupboard face above
  for (const z of SH.levels) box(int_, SH.x0 + 0.02, SH.x1 - 0.02, SH.y0 + 0.05, SH.y1 - 0.02, z, z + 0.025, M.glass);        // glass shelves
  // living room console gas heater
  const WH = F.wall_heater; box(int_, WH.x0, WH.x1, WH.y0, WH.y1, WH.z0, WH.z1, M.trimDark); box(int_, WH.x0 - 0.005, WH.x0, WH.y0 + 0.05, WH.y1 - 0.05, WH.z0 + 0.1, WH.z1 - 0.1, M.grille);
  // ceiling roses and light fittings
  for (const cr of F.ceiling_roses) {
    const rm = spec.rooms.find(r => r.name === cr.room), zc = rm.floor + rm.ceil;
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(cr.dia / 2, cr.dia / 2, 0.03, 32), M.ceiling); rose.position.copy(L(cr.x, cr.y, zc - 0.015)); int_.add(rose);
    if (cr.light === 'chandelier') {
      box(int_, cr.x - 0.01, cr.x + 0.01, cr.y - 0.01, cr.y + 0.01, zc - 0.45, zc - 0.03, M.brass);
      for (let i = 0; i < 5; i++) {
        const ang = i * Math.PI * 2 / 5, ax = cr.x + Math.cos(ang) * 0.2, ay = cr.y + Math.sin(ang) * 0.2;
        box(int_, Math.min(cr.x, ax), Math.max(cr.x, ax) + 0.01, Math.min(cr.y, ay), Math.max(cr.y, ay) + 0.01, zc - 0.45, zc - 0.43, M.brass);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.1, 12), M.appliance); shade.position.copy(L(ax, ay, zc - 0.38)); int_.add(shade);
      }
    } else {
      box(int_, cr.x - 0.008, cr.x + 0.008, cr.y - 0.008, cr.y + 0.008, zc - 0.5, zc - 0.03, M.brass);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.16, 16), M.amber); shade.position.copy(L(cr.x, cr.y, zc - 0.58)); int_.add(shade);
    }
  }
  // white slotted wall vents high on the west wall (living above W2, bedroom 2 above W1)
  for (const v of F.wall_vents) box(int_, H.x_west_inner - 0.012, H.x_west_inner, v.y0, v.y1, v.z0, v.z1, M.ceiling);

  // --- floors, ceilings, labels -------------------------------------------
  for (const r of spec.rooms) {
    const fm = { timber: M.timber, lino: M.lino, concrete: M.concrete, tile: M.tileFloor }[r.floorMat];
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
        : box(G.floors, r.x0, r.x1, r.y0, r.y1, r.floor - 0.05, r.floor, mat);
      if (fm.userData.tile) worldUV(fb, fm.userData.tile, r.name === 'Bedroom 2');
    }
    if (r.ceil != null) box(G.ceilings, r.x0, r.x1, r.y0, r.y1, r.floor + r.ceil, r.floor + r.ceil + 0.03, M.ceiling);
    const s = label(r.name);
    s.position.copy(L((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.floor + 1.6));
    G.labels.add(s);
  }
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
    // plaster cornices: deep stepped cornice in the front rooms, plain cove in bedroom 2 (no picture rails in this house)
    for (const rm of spec.rooms) {
      if (!['Entry', 'Hall', 'Front bedroom', 'Bedroom 2', 'Living'].includes(rm.name)) continue;
      const [ch, cd] = F.cornice.deep_rooms.includes(rm.name) ? F.cornice.deep : F.cornice.plain, zc = rm.floor + rm.ceil;
      const edges = [[rm.x0, rm.x1, rm.y0, rm.y0 + cd], [rm.x0, rm.x1, rm.y1 - cd, rm.y1], [rm.x0, rm.x0 + cd, rm.y0, rm.y1], [rm.x1 - cd, rm.x1, rm.y0, rm.y1]];
      for (const [x0, x1, y0, y1] of edges) {
        box(int_, x0, x1, y0, y1, zc - ch, zc - ch * 0.55, M.ceiling);                                       // lower step, full depth
        const in2 = cd * 0.5;
        box(int_, x0 === rm.x0 ? x0 : x0 + in2, x1 === rm.x1 ? x1 : x1 - in2, y0 === rm.y0 ? y0 : y0 + in2, y1 === rm.y1 ? y1 : y1 - in2, zc - ch * 0.55, zc, M.ceiling);   // upper step, half depth
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
    box(G.roof, k.x0, k.x1, k.y0 + 0.02, k.y1, k.z - 0.05 + lift, k.z + lift, M.metal);
    box(G.roof, k.x1 + 0.005, k.x1 + 0.045, k.y0 + 0.02, k.y1 + 0.045, k.z - k.fascia + lift, k.z + lift + 0.01, M.green);   // green fascia, west edge
    box(G.roof, H.wing.x_outer + 0.005, k.x1 + 0.045, k.y1 + 0.005, k.y1 + 0.045, k.z - k.fascia + lift, k.z + lift + 0.01, M.green);   // and along the rear wall
    const w = R.wing_flat;
    box(G.roof, w.x0, w.x1, w.y0 + 0.01, w.y1, w.z_top - 0.05 + lift, w.z_top + lift, M.metal);
    box(G.roof, w.x1 + 0.005, w.x1 + 0.045, w.y0 + 0.01, w.y1 + 0.045, w.z_top - w.fascia + lift, w.z_top + lift + 0.01, M.green);   // west fascia, proud of the wall face
    box(G.roof, w.x0 + 0.005, w.x1 + 0.045, w.y1 + 0.005, w.y1 + 0.045, w.z_top - w.fascia + lift, w.z_top + lift + 0.01, M.green); // rear fascia
    const c = R.covered;
    poly(G.roof, [[c.x0, c.y0, c.z_top_east], [c.x1, c.y0, c.z_top_west], [c.x1, c.y1, c.z_top_west], [c.x0, c.y1, c.z_top_east]], M.fibro);
    // underside: timber lining boards on green beams; bare corrugated strip along the wing wall; gutter on the west edge
    const zu = (x) => c.z_top_east + (c.z_top_west - c.z_top_east) * (x - c.x0) / (c.x1 - c.x0) - c.thick;
    poly(G.roof, [[c.bare_strip_to_x, c.y0, zu(c.bare_strip_to_x) - 0.02], [c.x1, c.y0, zu(c.x1) - 0.02], [c.x1, c.y1, zu(c.x1) - 0.02], [c.bare_strip_to_x, c.y1, zu(c.bare_strip_to_x) - 0.02]], M.lining);
    poly(G.roof, [[c.x0, c.y0, zu(c.x0) - 0.01], [c.bare_strip_to_x, c.y0, zu(c.bare_strip_to_x) - 0.01], [c.bare_strip_to_x, c.y1, zu(c.bare_strip_to_x) - 0.01], [c.x0, c.y1, zu(c.x0) - 0.01]], M.iron);
    for (const by of c.beams_y) box(G.roof, c.x0, c.x1, by - 0.045, by + 0.045, zu(c.x1) - 0.2, zu(c.x1) - 0.02, M.green);      // cross rafters
    for (const bx of [3.9, c.posts_x]) box(G.roof, bx - 0.05, bx + 0.05, c.y0, c.y1, zu(bx) - 0.22, zu(bx) - 0.02, M.green);     // longitudinal beams
    box(G.roof, c.gutter_x, c.gutter_x + 0.1, c.y0, c.y1, zu(c.x1) - 0.1, zu(c.x1) + 0.02, M.creamMetal);
    // roll-down canvas blinds on the west side
    const showCoveredBlinds = false; // temporarily raised while reviewing the covered area
    if (showCoveredBlinds) for (const [y0, y1, kind] of R.blinds.bays) box(G.exterior, R.blinds.x - 0.01, R.blinds.x + 0.01, y0, y1, R.blinds.z_bottom, R.blinds.z_top, kind === 'striped' ? M.canvasStripe : M.canvasBeige);
    // striped canvas awning over the kitchen window
    const aw = R.awning_W3;
    poly(G.exterior, [[aw.x0, aw.y0, aw.z_wall], [aw.x1, aw.y0, aw.z_edge], [aw.x1, aw.y1, aw.z_edge], [aw.x0, aw.y1, aw.z_wall]], M.canvasStripe);
    box(G.exterior, aw.x1 - 0.02, aw.x1, aw.y0, aw.y1, aw.z_edge - 0.15, aw.z_edge, M.canvasStripe);   // valance
    for (const y of c.posts_y) box(G.exterior, c.posts_x - c.post / 2, c.posts_x + c.post / 2, y - c.post / 2, y + c.post / 2, Lv.slab, c.z_top_west - c.thick, M.green);
    const p = { ...R.porch_hood, y1: H.y_front_outer + 0.015 };
    poly(G.roof, [[p.x0, p.y0, p.z_low], [p.x1, p.y0, p.z_low], [p.x1, p.y1, p.z_high], [p.x0, p.y1, p.z_high]], M.tile);
    poly(G.roof, [[p.x0, p.y0, p.z_low - 0.06], [p.x1, p.y0, p.z_low - 0.06], [p.x1, p.y1, p.z_high - 0.06], [p.x0, p.y1, p.z_high - 0.06]], M.ceiling);
    // The entry has a shallow tiled lean-to hood, with a green timber fascia and a
    // small gutter across its street edge (front elevation photo).
    box(G.roof, p.x0, p.x1, p.y0 - 0.05, p.y0 + 0.025, p.z_low - 0.12, p.z_low + 0.015, M.green);
    box(G.roof, p.x0, p.x1, p.y0 - 0.075, p.y0 - 0.025, p.z_low - 0.06, p.z_low + 0.03, M.gutter);
    for (const x of [p.x0, p.x1]) {
      // Triangular timber end fascia follows the single roof slope; it is not a
      // rectangular side wall.
      poly(G.roof, [[x, p.y0, p.z_low], [x, p.y1, p.z_high], [x, p.y1, p.z_low - 0.1], [x, p.y0, p.z_low - 0.1]], M.green);
    }
    // Two round timber posts sit inside the porch edges, clear of the front divider
    // fence and gate. The front elevation shows them as slender painted supports.
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
    box(G.site, fg.x0, fg.x1, fg.y0, fg.y1, gz - 0.06, fg.z, soil);
    box(G.site, fp.x0, fp.x1, fp.y0, fp.y1, gz - 0.06, fp.z, M.tileFloor);
    const ft = S.front_tree; box(G.site, ft.x - 0.05, ft.x + 0.05, ft.y - 0.05, ft.y + 0.05, gz, gz + ft.h * 0.5, bark);
    { const can = new THREE.Mesh(new THREE.SphereGeometry(ft.r, 12, 10), new THREE.MeshStandardMaterial({ color: 0x5a3a4a, roughness: 0.9 })); can.position.copy(L(ft.x, ft.y, gz + ft.h - ft.r)); can.castShadow = true; G.site.add(can); }
    // Keep each shrub canopy 50 mm inside the front fence rails.
    for (const [x, r] of [[2.4, 0.45], [3.6, 0.4], [4.4, 0.35]]) {
      const y = S.front_fence.y + 0.035 + 0.05 + r;
      const sh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), leaf);
      sh.scale.y = 0.75; sh.position.copy(L(x, y, fg.z + r * 0.6)); sh.castShadow = sh.receiveShadow = true; G.site.add(sh);
    }
    // west side: pavers, then a brick-edged planted bed along the fence
    const wp = S.west_path, wb = S.west_bed;
    box(G.site, wp.x0, wp.x1, wp.y0, wp.y1, gz - 0.06, wp.z, M.paving);
    bed(wb, gz - 0.06, wp.z, soil);
    for (const y of [9.0, 13.0]) {                                     // two cordyline clumps, kept inside the bed
      for (const [dx, dy, hh] of [[0, 0, 2.2], [0.06, 0.2, 1.7], [-0.05, -0.18, 1.9]]) {
        const cx = (wb.x0 + wb.x1) / 2 + dx;
        box(G.site, cx - 0.025, cx + 0.025, y + dy - 0.025, y + dy + 0.025, wp.z + wb.edge_h, wp.z + hh - 0.3, bark);
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), leaf); tuft.scale.set(1, 0.8, 1); tuft.position.copy(L(cx, y + dy, wp.z + hh - 0.2)); tuft.castShadow = true; G.site.add(tuft);
      }
    }
    for (const y of [5.5, 16.5]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), leaf); sh.position.copy(L((wb.x0 + wb.x1) / 2, y, wp.z + wb.edge_h + 0.25)); G.site.add(sh); }
    // rear: one concrete slab from the covered area to the rear fence, pebble bed along the west fence
    const rs = S.rear_slab, rb = S.rear_bed;
    box(G.site, rs.x0, rs.x1, rs.y0, rs.y1, gz - 0.06, rs.z, M.concrete);
    bed(rb, rs.z, rs.z, pebble);
    bed(S.rear_bed_south, rs.z, rs.z, soil);                          // soil bed along the rear fence, the lemon tree stands in it
    function bed(b, zBase, zTop, fill) {
      const e = 0.11, h = b.edge_h;                                   // one brick on edge, two courses
      box(G.site, b.x0, b.x0 + e, b.y0, b.y1, zBase, zTop + h, brick);   // inner edge
      box(G.site, b.x0, b.x1, b.y0, b.y0 + e, zBase, zTop + h, brick);   // end
      box(G.site, b.x0, b.x1, b.y1 - e, b.y1, zBase, zTop + h, brick);   // end
      box(G.site, b.x0 + e, b.x1, b.y0 + e, b.y1 - e, zBase, zTop + h - 0.03, fill);
    }
    // citrus tree in the back west corner, yucca clump by the covered-area posts
    // slim lemon tree: thin trunk, loose canopy of a few small clumps, all kept inside the fences
    const tr = S.tree, lemon = M.lemonLeaf || (M.lemonLeaf = new THREE.MeshStandardMaterial({ color: 0x5f7f3c, roughness: 0.9 }));
    box(G.site, tr.x - 0.035, tr.x + 0.035, tr.y - 0.035, tr.y + 0.035, rs.z, rs.z + tr.h * 0.5, bark);
    for (const [dx, dy, dz, r] of [[0, 0, 0.78, 1], [0.18, -0.12, 0.6, 0.8], [-0.2, 0.08, 0.62, 0.8], [0.05, 0.15, 0.93, 0.7], [-0.08, -0.18, 0.72, 0.75]]) {
      const cl = new THREE.Mesh(new THREE.SphereGeometry(tr.r * r, 12, 10), lemon);
      cl.scale.set(1, 1.25, 1); cl.position.copy(L(tr.x + dx, tr.y + dy, rs.z + tr.h * dz)); cl.castShadow = cl.receiveShadow = true; G.site.add(cl);
    }
    const yu = S.yucca;
    // yucca clump in the pebble bed: stems and tufts stay between the roof edge (x 6.4) and the fence
    for (const [dx, dy, hh] of [[0, 0, 1], [0.04, 0.25, 0.8], [-0.03, -0.22, 0.9]]) {
      const hgt = yu.h * hh, cx = 6.71 + dx * 0.5;
      box(G.site, cx - 0.03, cx + 0.03, yu.y + dy - 0.03, yu.y + dy + 0.03, rs.z + 0.14, rs.z + hgt - 0.3, bark);
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), leaf);
      tuft.scale.set(1, 1.2, 1); tuft.position.copy(L(cx, yu.y + dy, rs.z + hgt - 0.15)); tuft.castShadow = true; G.site.add(tuft);
    }
    // rotary clothesline
    const cl = S.clothesline;
    box(G.site, cl.x - 0.03, cl.x + 0.03, cl.y - 0.03, cl.y + 0.03, rs.z, rs.z + cl.h, M.metal);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(cl.arm * 2, 0.02, 0.02), M.metal);
      arm.position.copy(L(cl.x, cl.y, rs.z + cl.h - 0.05)); arm.rotation.y = i * Math.PI / 4; G.site.add(arm);
    }
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
        if (along) box(G.site, Math.min(x0, x1), Math.max(x0, x1), y0 + 0.012, y0 + 0.035, gz + hz, gz + hz + 0.07, M.fence);
        else box(G.site, x0 + 0.012, x0 + 0.035, Math.min(y0, y1), Math.max(y0, y1), gz + hz, gz + hz + 0.07, M.fence);
      }
    };
    const ff = S.front_fence;
    pickets(0, 0, lot.width, 0, ff.h, (x) => x > ff.gate_x0 && x < ff.gate_x1);
    // gate as its own panel so it can hide in walk mode
    box(G.site, ff.gate_x0, ff.gate_x1, 0.02, 0.05, gz + 0.05, gz + ff.h - 0.05, M.fence).userData.door = true;
    const dv = S.divider_fence;
    pickets(dv.x, dv.y0 + 0.05, dv.x, dv.y1, dv.h);
    palingFence(G.site, S.west_fence.x - 0.03, S.west_fence.x + 0.03, S.west_fence.y0, S.west_fence.y1, gz, gz + S.west_fence.h, -1);
    palingFence(G.site, S.east_fence.x - 0.03, S.east_fence.x + 0.03, S.east_fence.y0, S.east_fence.y1, gz, gz + S.east_fence.h, 1);
    palingFence(G.site, 0, lot.width, S.rear_fence.y - 0.03, S.rear_fence.y + 0.03, gz, gz + S.rear_fence.lattice_from, -1);
    for (let x = 0.05; x < lot.width; x += 0.1) box(G.site, x, x + 0.02, S.rear_fence.y - 0.015, S.rear_fence.y + 0.015, gz + S.rear_fence.lattice_from, gz + S.rear_fence.h, M.fence);   // lattice top
    box(G.site, 0, lot.width, S.rear_fence.y - 0.02, S.rear_fence.y + 0.02, gz + S.rear_fence.h - 0.04, gz + S.rear_fence.h, M.fence);
    box(G.site, S.side_pier.x0, S.side_pier.x1, S.side_pier.y0, S.side_pier.y1, gz, gz + S.side_pier.h, M.white);
    box(G.site, S.side_gate.x0, S.side_gate.x1, S.side_gate.y - 0.02, S.side_gate.y + 0.02, gz, gz + S.side_gate.h, M.creamMetal).userData.door = true;
    box(G.site, S.side_gate.x0, S.side_gate.x0 + 0.05, S.side_gate.y - 0.05, S.side_gate.y + 0.05, gz, gz + S.side_gate.h + 0.1, M.green);   // hinge post on the house
    // gate line into the covered area: green timber gate, corrugated iron infill above it, paling panel with lattice to the fence
    const rg = S.rear_gate;
    box(G.site, rg.x0, rg.x1, rg.y - 0.02, rg.y + 0.02, gz, gz + rg.h, M.green).userData.door = true;
    palingFence(G.site, rg.x1, rg.panel_x1, rg.y - 0.02, rg.y + 0.02, gz, gz + rg.panel_h);
    // corrugated iron closes the whole gate line from the gate and panel tops up to the covered roof (photos)
    const cr = R.covered, roofZ = x => cr.z_top_east + (cr.z_top_west - cr.z_top_east) * (x - cr.x0) / (cr.x1 - cr.x0);
    poly(G.site, [[rg.x0, rg.y, gz + rg.h], [rg.x1, rg.y, gz + rg.h], [rg.x1, rg.y, gz + rg.panel_h], [rg.panel_x1, rg.y, gz + rg.panel_h],
                  [rg.panel_x1, rg.y, roofZ(rg.panel_x1)], [rg.x0, rg.y, roofZ(rg.x0)]], M.iron);
    // back-door steps: concrete landing plus one riser down to the slab
    const bs = S.back_steps;
    box(G.site, bs.x0, bs.x1, bs.y0, bs.y0 + 0.3, Lv.slab, Lv.slab + 0.22, M.concrete);
    box(G.site, bs.x0, bs.x1, bs.y0 + 0.3, bs.y1, Lv.slab, Lv.slab + 0.1, M.concrete);
    box(G.site, F.grab_rail.x - 0.015, F.grab_rail.x + 0.015, F.grab_rail.y, F.grab_rail.y + 0.03, F.grab_rail.z0, F.grab_rail.z1, M.metal);
    // downpipes and the gas meter on the west wall
    for (const dp of S.downpipes) box(G.site, dp.x - 0.04, dp.x + 0.04, dp.y - 0.04, dp.y + 0.04, gz, dp.x > 4 ? W.plate_z - 0.1 : W.wing_plate_z - 0.3, dp.y > 24 ? M.metal : M.fence);
    const gm = S.gas_meter; box(G.site, gm.x0, gm.x1, gm.y0, gm.y1, gm.z0, gm.z1, M.tileCream);
    // white steel security screen closing the porch at the street face
    // The fixed surround meets both porch walls, the floor and the lintel.
    // Keep the operable grille inside it with a 3 mm clearance on every edge.
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
    box(G.site, S.shed.x0, S.shed.x1, S.shed.y0, S.shed.y1, rs.z, rs.z + S.shed.h, M.shed);
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
