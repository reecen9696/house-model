// Modelled neighbours, Fern Avenue and the surrounding ground, from neighbours.json.
// Clean geometry sized from the Google 3D mesh, for sun and shadow studies. Lot frame in the
// data (x west, y south, z above our FFL); three.js X = -x, Y = z, Z = y, same as the house.
import * as THREE from 'three';

const L = (x, y, z) => new THREE.Vector3(-x, z, y);

// Build a mesh from lot-frame triangles [[x,y,z] x3, ...].
function triMesh(tris, mat) {
  const pos = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => t.forEach((p, j) => { const v = L(...p); pos.set([v.x, v.y, v.z], i * 9 + j * 3); }));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];

// Roof surface over the rectangle, returned as triangles plus the vertical infill (gable ends, shed sides).
function roofTris(p) {
  const { x0, x1, y0, y1, e } = p, r = p.r ?? e, T = [];
  if (p.roof === 'flat') {
    T.push(...quad([x0, y0, e], [x1, y0, e], [x1, y1, e], [x0, y1, e]));
    return T;
  }
  if (p.roof === 'shed') {
    // height at each corner: r on the 'high' edge, e on the opposite one
    const h = (x, y) => ({ x0: x === x0, x1: x === x1, y0: y === y0, y1: y === y1 }[p.high] ? r : e);
    const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [x, y, h(x, y)]);
    T.push(...quad(...c));
    // vertical triangles on the two sloping sides, down to the eave
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      if (a[2] !== b[2]) { const lo = a[2] < b[2] ? a : b, hi = lo === a ? b : a; T.push([lo, hi, [hi[0], hi[1], e]]); }
    }
    return T;
  }
  // hip / gable: ridge on the centre line along 'axis', ends inset by i0 / i1 (0 = gable)
  const ax = p.axis === 'x';
  const [u0, u1, v0, v1] = ax ? [y0, y1, x0, x1] : [x0, x1, y0, y1];   // u across, v along the ridge
  const P = (u, v, z) => ax ? [v, u, z] : [u, v, z];
  const um = (u0 + u1) / 2, len = v1 - v0;
  let i0 = p.i0 || 0, i1 = p.i1 || 0;
  if (i0 + i1 > len) { const k = len / (i0 + i1); i0 *= k; i1 *= k; }
  const ra = P(um, v0 + i0, r), rb = P(um, v1 - i1, r);
  const c00 = P(u0, v0, e), c10 = P(u1, v0, e), c11 = P(u1, v1, e), c01 = P(u0, v1, e);
  T.push(...quad(c00, ra, rb, c01));          // side slopes
  T.push(...quad(c10, c11, rb, ra));
  T.push([c00, c10, ra]);                       // ends: hip slope, or a vertical gable triangle when i = 0
  T.push([c11, c01, rb]);
  return T;
}

// Walls: a box under the roof, set 0.3 in from pitched eaves except along party walls ('keep' edges).
function wallBox(p, mat) {
  const keep = p.keep || '', pitched = p.roof !== 'flat';
  const inset = k => (pitched && !keep.includes(k) && Math.min(p.x1 - p.x0, p.y1 - p.y0) > 3) ? 0.3 : 0;
  const x0 = p.x0 + inset('x0'), x1 = p.x1 - inset('x1'), y0 = p.y0 + inset('y0'), y1 = p.y1 - inset('y1');
  const w = p.wall || {};                               // measured wall lines override the inset
  const [wx0, wx1, wy0, wy1] = [w.x0 ?? x0, w.x1 ?? x1, w.y0 ?? y0, w.y1 ?? y1];
  const top = p.roof === 'shed' ? Math.min(p.e, p.r) : p.e, bot = p.base - 0.1;
  const m = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, top - bot, wy1 - wy0), mat);
  m.position.copy(L((wx0 + wx1) / 2, (wy0 + wy1) / 2, (top + bot) / 2));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// A tree: trunk forking into limbs, and an open crown of separate leaf clumps so its shadow comes out
// dappled rather than as one solid disc. Pale street-gum colours unless the entry gives 'leaf' and 'bark'.
// one gum leaf on a small canvas, used as an alpha cut-out card
let GUM_TEX = null;
function gumTexture() {
  if (GUM_TEX) return GUM_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.beginPath(); g.moveTo(64, 126); g.bezierCurveTo(40, 100, 30, 50, 58, 4); g.bezierCurveTo(70, 30, 78, 80, 64, 126); g.closePath();
  const gr = g.createLinearGradient(30, 0, 80, 0); gr.addColorStop(0, '#5e7355'); gr.addColorStop(0.5, '#83977a'); gr.addColorStop(1, '#5a6d50');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(200,210,190,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(64, 124); g.bezierCurveTo(52, 90, 48, 50, 58, 8); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return GUM_TEX = t;
}
let GUM_MAT = null;
function gumLeaves(g, c, r, count, rnd) {
  GUM_MAT = GUM_MAT || new THREE.MeshLambertMaterial({ map: gumTexture(), alphaTest: 0.5, side: THREE.DoubleSide, color: 0xffffff });
  const size = 0.16, geo = new THREE.PlaneGeometry(size, size * 1.4); geo.translate(0, size * 0.7, 0);
  const mesh = new THREE.InstancedMesh(geo, GUM_MAT, count), d = new THREE.Object3D(), Y = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, sq = Math.sqrt(1 - u * u), rr = r * (0.7 + rnd() * 0.3);
    const n = new THREE.Vector3(sq * Math.cos(ph), u, sq * Math.sin(ph));
    d.position.set(c.x + n.x * rr * 1.25, c.y + n.y * rr * 0.75, c.z + n.z * rr * 1.25);
    dir.set(n.x + (rnd() - 0.5), n.y - 0.9 + (rnd() - 0.5) * 0.6, n.z + (rnd() - 0.5)).normalize();   // gum leaves hang downward
    d.quaternion.setFromUnitVectors(Y, dir); d.rotateY(rnd() * Math.PI * 2);
    const s = 0.7 + rnd() * 0.6; d.scale.set(s, s, s); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    const t = 0.8 + rnd() * 0.4; col.setRGB(t * (0.95 + rnd() * 0.1), t, t * (0.9 + rnd() * 0.15)); mesh.setColorAt(i, col);
  }
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); g.add(mesh);
}

function buildTree(t) {
  const g = new THREE.Group(); g.name = t.id;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bark = new THREE.MeshLambertMaterial({ color: t.bark || 0xcdb89a });
  const leaf = new THREE.MeshLambertMaterial({ color: t.leaf || 0x6b7a4e, flatShading: true });
  const base = L(t.x, t.y, t.base), top = t.base + t.h;
  const limb = (a, b, r0, r1) => {
    const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 8), bark);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  const fork = base.clone().add(new THREE.Vector3(0, t.crown_base + 0.3, 0));
  limb(base, fork, t.trunk_r, t.trunk_r * 0.8);
  const crownMid = t.base + (t.crown_base + t.h) / 2;
  for (let i = 0; i < 3; i++) {                       // three main limbs up into the crown
    const a = i / 3 * Math.PI * 2 + 0.4;
    const end = new THREE.Vector3(base.x + Math.cos(a) * t.r * 0.45, crownMid + 0.8, base.z + Math.sin(a) * t.r * 0.45);
    limb(fork, end, t.trunk_r * 0.6, t.trunk_r * 0.3);
  }
  // crown: eleven clump centres filling an ellipsoid with gaps; each clump is a dark core hung with thousands
  // of gum leaves (long, narrow, grey-green cards), so the canopy is ragged and lets light through
  const core = new THREE.MeshLambertMaterial({ color: 0x3f4a36 });
  for (let i = 0; i < 11; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * t.r * 0.8;
    const zc = t.base + t.crown_base + 0.9 + rnd() * (t.h - t.crown_base - 1.8);
    const k = 1 - Math.pow((zc - crownMid) / ((t.h - t.crown_base) / 2 + 0.3), 2);
    const s = 0.75 + rnd() * 0.6, c = new THREE.Vector3(base.x + Math.cos(a) * rr * Math.max(k, 0.3), zc, base.z + Math.sin(a) * rr * Math.max(k, 0.3));
    const m = new THREE.Mesh(new THREE.SphereGeometry(s * 0.7, 12, 10), core);
    m.position.copy(c); m.scale.set(1.25, 0.75, 1.25); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const count = Math.round(4 * Math.PI * s * s * 1.1 * 170);
    gumLeaves(g, c, s, count, () => rnd());
  }
  return g;
}

export async function buildNeighbours(url = new URL('./neighbours.json', import.meta.url)) {
  const data = await (await fetch(url)).json();
  const group = new THREE.Group(); group.name = 'neighbours';
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xd8d1c4 });
  const roofMats = new Map();
  const roofMat = hex => {
    if (!roofMats.has(hex)) roofMats.set(hex, new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color(0x9a8f86), 0.25), side: THREE.DoubleSide }));
    return roofMats.get(hex);
  };
  const buildParts = keep => {
    const buildings = new THREE.Group(); buildings.name = 'buildings';
    for (const p of data.parts.filter(keep)) {
      const part = new THREE.Group(); part.name = p.id; part.userData = { addr: p.addr };
      part.add(wallBox(p, wallMat));
      part.add(triMesh(roofTris(p), roofMat(p.colour)));
      buildings.add(part);
    }
    return buildings;
  };

  // Fern Avenue: bands across the reserve, following the carriageway level along the street,
  // optionally only between xmin and xmax
  const R = data.road;
  const bandMat = {
    footpath: new THREE.MeshLambertMaterial({ color: 0xc9c5bc, side: THREE.DoubleSide }),
    verge: new THREE.MeshLambertMaterial({ color: 0x8fa36a, side: THREE.DoubleSide }),
    kerb: new THREE.MeshLambertMaterial({ color: 0x5d6064, side: THREE.DoubleSide }),
    carriageway: new THREE.MeshLambertMaterial({ color: 0x55585c, side: THREE.DoubleSide }),
  };
  const buildStreet = (xmin = -Infinity, xmax = Infinity) => {
    const street = new THREE.Group(); street.name = 'street';
    const zAt = x => { for (let i = 0; i < R.x.length - 1; i++) if (x <= R.x[i + 1]) return R.ground[i] + (R.ground[i + 1] - R.ground[i]) * (x - R.x[i]) / (R.x[i + 1] - R.x[i]); return R.ground.at(-1); };
    for (const b of R.bands) {
      const lift = b.kind === 'carriageway' ? 0 : R.kerb_h, T = [];
      for (let i = 0; i < R.x.length - 1; i++) {
        const xa = Math.max(R.x[i], xmin), xb = Math.min(R.x[i + 1], xmax);
        if (xb <= xa) continue;
        const za = zAt(xa) + lift, zb = zAt(xb) + lift;
        T.push(...quad([xa, b.y0, za], [xa, b.y1, za], [xb, b.y1, zb], [xb, b.y0, zb]));
        if (b.kind === 'kerb') {                // kerb faces down to the road
          for (const y of [b.y0, b.y1]) T.push(...quad([xa, y, za - R.kerb_h], [xa, y, za], [xb, y, zb], [xb, y, zb - R.kerb_h]));
        }
      }
      if (T.length) { const m = triMesh(T, bandMat[b.kind]); m.castShadow = false; street.add(m); }
    }
    return street;
  };

  // Ground: coarse surface from the mesh, cells chosen by their centre. It sits a little under the
  // modelled surfaces, and well under our lot so its own paving and garden show.
  const Gd = data.ground, groundMat = new THREE.MeshLambertMaterial({ color: 0xa9a894, side: THREE.DoubleSide });
  const buildGround = keepCell => {
    const z = (i, j) => {
      const x = Gd.x0 + i * Gd.step, y = Gd.y0 + j * Gd.step;
      return Gd.z[j][i] - (x > -2.6 && x < 9.6 && y > -2.6 && y < 32.1 ? 0.2 : 0.04);
    };
    const T = [];
    for (let j = 0; j < Gd.ny - 1; j++) for (let i = 0; i < Gd.nx - 1; i++) {
      const xa = Gd.x0 + i * Gd.step, xb = xa + Gd.step, ya = Gd.y0 + j * Gd.step, yb = ya + Gd.step;
      if (!keepCell((xa + xb) / 2, (ya + yb) / 2)) continue;
      T.push(...quad([xa, ya, z(i, j)], [xa, yb, z(i, j + 1)], [xb, yb, z(i + 1, j + 1)], [xb, ya, z(i + 1, j)]));
    }
    const ground = triMesh(T, groundMat);
    ground.castShadow = false; ground.name = 'ground';
    return ground;
  };

  group.add(buildParts(() => true));
  group.add(buildStreet());
  group.add(buildGround((cx, cy) => !(cy > -15.3 && cy < 0 && cx < 60)));   // the road reserve is modelled above

  // Underlay for the photo mesh (scan/edit_context.py): No. 11 is cut out of it, and so are the
  // canopy blobs and road surface in front of Nos 9-17. Fill those with the modelled versions.
  const F = data.photo_mesh_cuts;
  const underlay = new THREE.Group(); underlay.name = 'photo-underlay';
  underlay.add(buildParts(p => F.parts_addr.includes(p.addr)));
  underlay.add(buildStreet(F.front[0], F.front[1]));
  underlay.add(buildGround((cx, cy) =>
    (cx > F.front[0] && cx < F.front[1] && cy > F.front[2] && cy < -15.3) ||
    (cx > F.lot11[0] - 1 && cx < F.lot11[1] + 1 && cy > F.lot11[2] - 1 && cy < F.lot11[3] + 1)));

  // trees are returned separately: they belong with both the modelled context and the photo mesh
  const trees = new THREE.Group(); trees.name = 'trees';
  for (const t of data.trees || []) trees.add(buildTree(t));
  return { group, trees, underlay };
}
