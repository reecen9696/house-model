// Bedroom 2 study (client 2026-11-18, IKEA reference build "IKEA desk hack"): an L-shaped desk in the north-west corner
// from two IKEA EKBACKEN brown walnut worktops, one under W1 on the west wall and one along the north wall, butted at
// the corner; a stack of two EKET 2-drawer cabinets at the far end of each run, wall cleats, and an ADILS leg under the
// inside corner; a BILLY bookcase (with height extension) at the east end of the north wall. Shared by the current-house
// and renovated generators. A King Living 1977 Sofa Chaise on the east wall. Sizes from ikea.com/au (2026-11-18); positions in spec fixtures.study_bed2 (lot frame).
//
// Heights: the cabinets stand straight on the floor (no EKET feet): 2 x 350 = 700, + 28 worktop = 728 to the top.
// With the 19-24 mm feet the top would be ~750 and hit W1's architraves, which come down to ~740 (sill 800 - 60).
// Leg room (floor to the underside of the worktop) = 700, the length of an ADILS leg.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const L = (x, y, z) => new THREE.Vector3(-x, z, y);
const MAT = {};

function grain(base, dark, light, seed) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 1024, 128);
  let sd = seed; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
  for (let i = 0; i < 150; i++) {
    const d = rnd() < 0.6; g.strokeStyle = d ? `rgba(${dark},${0.08 + rnd() * 0.22})` : `rgba(${light},${0.06 + rnd() * 0.14})`; g.lineWidth = 0.5 + rnd() * 2.4;
    let x = -10, y = rnd() * 128; g.beginPath(); g.moveTo(x, y); while (x < 1034) { x += 14 + rnd() * 36; y += (rnd() - 0.5) * 3; g.lineTo(x, y); } g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mats() {
  if (MAT.top) return MAT;
  // EKBACKEN brown walnut: darker, redder than the EKET / BILLY foil (reference photos)
  const topT = grain('#5e3c2a', '38,20,12', '140,95,70', 11);
  const ekT = grain('#7a5238', '45,26,15', '160,115,82', 29);
  const mk = (t, rot, rx, ry) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.5, map: t.clone() }); m.map.needsUpdate = true; m.map.center.set(0.5, 0.5); m.map.rotation = rot; m.map.repeat.set(rx, ry); return m; };
  MAT.top = mk(topT, Math.PI / 2, 1, 1);         // worktop: grain along the wall (lot y)
  MAT.topEdge = mk(topT, 0, 1, 1);
  MAT.ek = mk(ekT, 0, 1, 1);                     // drawer fronts: grain across
  MAT.ekV = mk(ekT, Math.PI / 2, 1, 1);          // sides, shelves
  MAT.cleat = new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.7 });
  MAT.books = [0xe9e4da, 0xcfc6b5, 0x9a8f80, 0x3b3a36, 0xb8a58a, 0x6f5b4a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  MAT.boucle = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 1 });
  MAT.chrome = new THREE.MeshStandardMaterial({ color: 0xc4c7ca, roughness: 0.25, metalness: 0.3 });
  MAT.legBlack = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.4, metalness: 0.4 });
  MAT.foot = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.8 });
  MAT.steel = new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.5, metalness: 0.5 });
  MAT.screen = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.12, metalness: 0.1 });
  MAT.alu = new THREE.MeshStandardMaterial({ color: 0xc9cacc, roughness: 0.3, metalness: 0.9 });
  return MAT;
}

export function studyDesk(parent, S, floor = 0) {
  if (!S || S.show === false) return null;
  const M = mats(), grp = new THREE.Group(); grp.name = 'Bedroom 2 study';
  const bx = (x0, x1, y0, y1, z0, z1, m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0), m);
    o.position.copy(L((x0 + x1) / 2, (y0 + y1) / 2, floor + (z0 + z1) / 2)); o.castShadow = o.receiveShadow = true; grp.add(o); return o;
  };
  const xw = S.wall_x, D = S.depth, xf = xw - D, y0 = S.y0, y1 = S.y0 + S.length;   // worktop: x xf..xw, y y0..y1
  const wt = 0.028, hc = 0.35, zt = 2 * hc;                                            // cabinets 2 x 350, worktop underside at 700
  const t = 0.016, rv = 0.002, N = S.north;
  // two EKET 70x35x35 2-drawer cabinets stacked, standing on the floor. face 'x': fronts toward the room at x = a
  // (cabinet x a..a+0.35, y b..b+0.70); face 'y': fronts toward +y at y = b (cabinet x a..a+0.70, y b-0.35..b)
  const stack = (a, b, face) => {
    const [x0, x1, y0s, y1s] = face === 'x' ? [a, a + 0.35, b, b + 0.70] : [a, a + 0.70, b - 0.35, b];
    for (const z0 of [0, hc]) {
      const z1 = z0 + hc, mid = (z0 + z1) / 2;
      bx(x0, x1, y0s, y1s, z1 - t, z1, M.ekV); bx(x0, x1, y0s, y1s, z0, z0 + t, M.ekV);
      if (face === 'x') {
        bx(x0, x1, y0s, y0s + t, z0 + t, z1 - t, M.ekV); bx(x0, x1, y1s - t, y1s, z0 + t, z1 - t, M.ekV); bx(x1 - 0.006, x1, y0s + t, y1s - t, z0 + t, z1 - t, M.ekV);
        for (const [za, zb] of [[z0 + t, mid], [mid, z1 - t]]) bx(x0, x0 + t - 0.001, y0s + t + rv, y1s - t - rv, za + rv, zb - rv, M.ek);
      } else {
        bx(x0, x0 + t, y0s, y1s, z0 + t, z1 - t, M.ekV); bx(x1 - t, x1, y0s, y1s, z0 + t, z1 - t, M.ekV); bx(x0 + t, x1 - t, y0s, y0s + 0.006, z0 + t, z1 - t, M.ekV);
        for (const [za, zb] of [[z0 + t, mid], [mid, z1 - t]]) bx(x0 + t + rv, x1 - t - rv, y1s - t + 0.001, y1s, za + rv, zb - rv, M.ek);
      }
    }
  };
  // west run (under the window): one 246 length cut to S.length, S.depth deep (635 full, or ripped narrower), running into the corner;
  // wall_x is its back edge: the wall, or standing off it so floor-length curtains drop behind (v4)
  bx(xf, xw, y0, y1, zt, zt + wt, M.top);
  const adils = (x, y) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, zt - 0.012, 16), M.legBlack); leg.position.copy(L(x, y, floor + 0.012 + (zt - 0.012) / 2)); leg.castShadow = true; grp.add(leg);
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 16), M.foot); ft.position.copy(L(x, y, floor + 0.006)); grp.add(ft); };   // ADILS: 40 dia tube, adjustable foot
  const free = !!S.legs;                                                               // freestanding: legs, no wall cleats
  if (!free) bx(xw - 0.019, xw, y0, S.drawers_y0 ?? y1, zt - 0.042, zt, M.cleat);      // 42 x 19 cleat on the west wall
  if (S.drawers_y0 != null) stack(xf + 0.01, S.drawers_y0, 'x');                       // fronts 10 behind the worktop edge
  else if (!free) adils(xf + 0.03, y1 - 0.03);
  const yN = y0 + (S.depth_north ?? D);                                              // the north run can stay full depth when the window run is ripped narrower
  if (N) {
    // north run: a second length butted against the west run's front edge (worktop connector bolts underneath), out
    // toward the chaise; an EKET drawer stack at its far end facing the room (+y)
    bx(N.x_end, xf, y0, yN, zt, zt + wt, M.top);
    bx(xf - 0.0006, xf + 0.0006, y0, yN, zt + wt, zt + wt + 0.0004, M.cleat);         // the joint line
    if (!free) bx(N.drawers_x1 ?? N.x_end + 0.01, xw - 0.019, y0, y0 + 0.019, zt - 0.042, zt, M.cleat);
    if (N.drawers_x1 != null) stack(N.drawers_x1 - 0.70, yN - (N.drawers_inset ?? 0.01), 'y');
    else if (!free) adils(N.x_end + 0.03, yN - 0.03);
    if (N.corner_leg && !free) adils(xf + 0.03, yN - 0.03);
  } else if (!free) bx(xf + 0.02, xw - 0.019, y0, y0 + 0.019, zt - 0.042, zt, M.cleat);
  if (free) {
    for (const [x, y] of S.legs) adils(x, y);
    // steel under-frame along both front edges (S.front_angle): 50 x 25 x 2 RHS, welded into one L at the inside corner,
    // screwed up into the worktops, ends sitting on the EKET stack and on the window run's end leg. A closed section, not
    // angle: with no leg at the corner the frame has to resist twist as well as bending
    if (S.front_angle) {
      const w = 0.05, h = 0.025, o = 0.03, xe = N?.drawers_x1 ?? xf;
      bx(xf + o, xf + o + w, yN - o - w, y1 - 0.02, zt - h, zt, M.steel);
      if (N) bx(xe, xf + o, yN - o - w, yN - o, zt - h, zt, M.steel);
    }
  }
  // BILLY 80x28x202 + height extension 80x28x35 (237 total), on the north wall (x B.x1-0.8 .. B.x1)
  const B = S.bookcase;
  if (B) {
    const bxE = B.x1, bx0 = bxE - 0.8, by0 = y0 + 0.018, by1 = by0 + 0.28, s = 0.015, H = 2.37;
    bx(bx0, bx0 + s, by0, by1, 0, H, M.ekV); bx(bxE - s, bxE, by0, by1, 0, H, M.ekV);   // sides
    bx(bx0 + s, bxE - s, by0, by0 + 0.004, 0, H, M.ekV);                                 // back
    bx(bx0 + s, bxE - s, by1 - 0.02, by1 - 0.004, 0, 0.06, M.ekV);                       // plinth
    const shelves = [0.06, 0.40, zt + wt - 0.018, 1.07, 1.40, 1.72, 2.005, 2.02, 2.20, 2.355];
    for (const z of shelves) bx(bx0 + s, bxE - s, by0 + 0.004, by1, z, z + 0.018, M.ekV);
    // a few books, so the scale reads
    let sd = 5; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    for (const z of [0.418, 1.088, 1.418, 1.738]) {
      let x = bx0 + s + 0.02; const xEnd = bxE - s - 0.02 - (rnd() < 0.5 ? 0.3 : 0.1);
      while (x < xEnd) { const w = 0.02 + rnd() * 0.03, h = 0.2 + rnd() * 0.08; bx(x, x + w, by0 + 0.04, by0 + 0.04 + 0.16 + rnd() * 0.05, z, z + h, M.books[Math.floor(rnd() * 6)]); x += w + 0.002; }
    }
  }
  // King Living 1977 Sofa Chaise (860 W x 1480 D x 710 H, seat 420, back cushion 260 deep; Leura S boucle like the
  // lounge couch) along the east wall: x C.x0 .. +0.86, y C.y0 .. +1.48, the back cushion at the C.back end
  const C = S.chaise;
  if (C) {
    const W = 0.86, Dp = 1.48, seat = 0.42, back = 0.71, bt = 0.26, x0 = C.x0, x1 = x0 + W, ya = C.y0, yb = ya + Dp;
    const puff = (xa, xb, y_a, y_b, z0, z1, r) => { const m = new THREE.Mesh(new RoundedBoxGeometry(xb - xa, z1 - z0, y_b - y_a, 4, Math.min(r, (xb - xa) / 2, (z1 - z0) / 2, (y_b - y_a) / 2)), M.boucle); m.position.copy(L((xa + xb) / 2, (y_a + y_b) / 2, floor + (z0 + z1) / 2)); m.castShadow = m.receiveShadow = true; grp.add(m); };
    puff(x0, x1, ya, yb, 0.01, seat, 0.1);
    if (C.back === 'south') puff(x0, x1, yb - bt, yb, seat - 0.12, back, 0.12); else puff(x0, x1, ya, ya + bt, seat - 0.12, back, 0.12);
  }
  // two-screen setup on the north run (v2): IKEA STUBBERGET bracket for 2 monitors clamped to the back edge, two 27"
  // screens (615 x 365 picture, ~625 x 375 overall) side by side, toed in 10 degrees, top edge at seated eye height (~1.20),
  // their faces ~0.30 out from the wall; a keyboard and mouse in front
  const MO = S.monitors;
  if (MO) {
    const yN0 = y0, zt2 = zt + wt, cx = MO.x, yf = yN0 + MO.face_y, zc = MO.centre_z, w = 0.625, h = 0.375;
    bx(cx - 0.05, cx + 0.05, yN0 + 0.02, yN0 + 0.09, zt2, zt2 + 0.01, M.legBlack);                   // clamp foot
    bx(cx - 0.018, cx + 0.018, yN0 + 0.04, yN0 + 0.076, zt2, zc + 0.05, M.legBlack);                  // pole
    bx(cx - 0.55, cx + 0.55, yN0 + 0.05, yN0 + 0.08, zc - 0.03, zc, M.legBlack);                      // arms
    for (const sg of [-1, 1]) {
      const pg = new THREE.Group(); pg.position.copy(L(cx + sg * 0.315, yf, floor + zc)); pg.rotation.y = sg * 0.17; grp.add(pg);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), M.legBlack); pg.add(sh);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 0.012, h - 0.012, 0.002), M.screen); gl.position.z = 0.011; pg.add(gl);
    }
    bx(cx - 0.22, cx + 0.22, yN0 + D - 0.24, yN0 + D - 0.11, zt2, zt2 + 0.018, M.legBlack);         // keyboard
    bx(cx - 0.36, cx - 0.30, yN0 + D - 0.2, yN0 + D - 0.1, zt2, zt2 + 0.03, M.legBlack);             // mouse, on the right (east) facing north
  }
  // IKEA SIGNUM cable trays (70 cm, silver) screwed under the back of the north run: power board and screen leads
  for (const [a0, a1] of S.cable_trays || []) {
    bx(a0, a1, y0 + 0.03, y0 + 0.13, zt - 0.085, zt - 0.08, M.alu); bx(a0, a1, y0 + 0.125, y0 + 0.13, zt - 0.085, zt - 0.02, M.alu); bx(a0, a1, y0 + 0.03, y0 + 0.035, zt - 0.085, zt, M.alu);
  }
  // IKEA EKET wall-mounted units (35 x 25 x 35, brown walnut) in a row on the north wall above the screens; open, or
  // with a door ('door' = EKET cabinet with door 35 x 35 x 35 on a suspension rail)
  const WU = S.wall_units;
  if (WU) {
    const dd = WU.type === 'door' ? 0.35 : 0.25, t = 0.016;
    for (let i = 0; i < WU.n; i++) {
      const a0 = WU.x0 + i * 0.35, a1 = a0 + 0.35, z0 = WU.z0, z1 = z0 + 0.35, b0 = y0, b1 = y0 + dd;
      bx(a0, a1, b0, b1, z0, z0 + t, M.ekV); bx(a0, a1, b0, b1, z1 - t, z1, M.ekV);
      bx(a0, a0 + t, b0, b1, z0 + t, z1 - t, M.ekV); bx(a1 - t, a1, b0, b1, z0 + t, z1 - t, M.ekV);
      bx(a0 + t, a1 - t, b0, b0 + 0.006, z0 + t, z1 - t, M.ekV);
      if (WU.type === 'door') bx(a0 + t + 0.002, a1 - t - 0.002, b1 - t, b1 - 0.001, z0 + t + 0.002, z1 - t - 0.002, M.ek);
    }
    // a few books and a plant pot in the open ones, so the scale reads
    if (WU.type !== 'door') { let sd = 3; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
      for (let i = 0; i < WU.n; i += 2) { let x = WU.x0 + i * 0.35 + 0.03; const xe = x + 0.16; while (x < xe) { const bw = 0.02 + rnd() * 0.025; bx(x, x + bw, y0 + 0.03, y0 + 0.2, WU.z0 + 0.016, WU.z0 + 0.016 + 0.2 + rnd() * 0.07, M.books[Math.floor(rnd() * 6)]); x += bw + 0.002; } }
    }
  }
  // a painting on the north wall above the screens (S.painting), the hall's Sarah Brooke "Middle of Nowhere" copied in:
  // 1200 x 1500 canvas in its slim walnut float frame (12 face, 6 shadow gap, 45 deep), photo from renovated/assets/art
  const PT = S.painting;
  if (PT) {
    const fr = 0.012, gp = 0.006, dp = 0.045, ow = PT.w + 2 * (fr + gp), oh = PT.h + 2 * (fr + gp), yw = y0, zc = PT.zc;
    if (!M.artFrame) M.artFrame = new THREE.MeshStandardMaterial({ map: M.top.map, color: new THREE.Color(1.25, 1.25, 1.25), roughness: 0.45 });
    if (!M.artGap) M.artGap = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 });
    bx(PT.x - ow / 2, PT.x + ow / 2, yw, yw + dp, zc - oh / 2, zc + oh / 2, M.artFrame);
    const face = (w, h, y, m) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.copy(L(PT.x, y, floor + zc)); grp.add(o); };   // a plane faces +z three = +y lot, into the room
    face(PT.w + 2 * gp, PT.h + 2 * gp, yw + dp + 0.001, M.artGap);
    const t = new THREE.TextureLoader().load(new URL(`../renovated/assets/art/${PT.file}.jpg`, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    face(PT.w, PT.h, yw + dp + 0.002, new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22 }));
  }
  // IKEA KOLON floor protector (120 x 100, clear polypropylene) under the chair (S.chair_mat = {x0, x1, y0, y1})
  if (S.chair_mat) {
    const CM = S.chair_mat;
    M.kolon = M.kolon || new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
    const m = bx(CM.x0, CM.x1, CM.y0, CM.y1, 0.001, 0.0035, M.kolon); m.castShadow = false; m.renderOrder = 2;
  }
  // boucle swivel chair (like the reference), pulled up to the leg-room bay under the window
  if (S.chair_y != null || S.chair) {
    const ch = new THREE.Group(); grp.add(ch);
    if (S.chair) { ch.position.copy(L(S.chair.x, S.chair.y, floor)); ch.rotation.y = S.chair.face === 'north' ? -Math.PI / 2 : 0; }   // turned to face the north run
    else ch.position.copy(L(xf - 0.28, S.chair_y, floor));
    for (let i = 0; i < 5; i++) {
      const a = i * 2 * Math.PI / 5 + 0.3, ex = Math.cos(a) * 0.3, ey = Math.sin(a) * 0.3;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.035), M.chrome); leg.position.copy(L(ex / 2, ey / 2, 0.07)); leg.rotation.y = Math.atan2(-ey, -ex); ch.add(leg);
      const cas = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), M.chrome); cas.position.copy(L(ex, ey, 0.03)); ch.add(cas);
    }
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.32, 14), M.chrome); col.position.copy(L(0, 0, 0.24)); ch.add(col);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.25, 0.1, 28), M.boucle); seat.position.copy(L(0, 0, 0.46)); ch.add(seat);
    // rounded tub back, open toward the desk (+x lot = toward the wall)
    const back = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 12, 28, Math.PI * 1.15), M.boucle);
    const bg = new THREE.Group(); bg.position.copy(L(0, 0, 0.6)); bg.rotation.y = Math.PI * 0.575; back.rotation.x = Math.PI / 2; bg.add(back); ch.add(bg);
  }
  parent.add(grp);
  return grp;
}
