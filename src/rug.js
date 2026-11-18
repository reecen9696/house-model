// Large cream rug for the current house's living room (client 2026-11-18): a soft, plain cream wool-look pile with a
// faint mottle and a slightly darker bound edge, 15 mm thick. R = {x0, x1, y0, y1} in the lot frame (spec.fixtures.living_rug.<layout>)
import * as THREE from 'three';

const L = (x, y, z) => new THREE.Vector3(-x, z, y);
let MAT = null;

export function creamRug(parent, R, floor = 0) {
  if (!R) return null;
  if (!MAT) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#ece4d3'; g.fillRect(0, 0, 512, 512);
    let sd = 17; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    for (let i = 0; i < 9000; i++) { const l = rnd() < 0.5; g.fillStyle = l ? `rgba(250,246,236,${0.15 + rnd() * 0.25})` : `rgba(196,184,160,${0.08 + rnd() * 0.18})`; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace;
    MAT = { pile: new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), bind: new THREE.MeshStandardMaterial({ color: 0xd9cfba, roughness: 0.95 }) };
  }
  const grp = new THREE.Group(); grp.name = 'Cream rug';
  const bx = (x0, x1, y0, y1, z0, z1, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0), m); o.position.copy(L((x0 + x1) / 2, (y0 + y1) / 2, floor + (z0 + z1) / 2)); o.receiveShadow = true; grp.add(o); };
  const e = 0.03, { x0, x1, y0, y1 } = R;
  bx(x0 + e, x1 - e, y0 + e, y1 - e, 0.001, 0.015, MAT.pile);
  bx(x0, x1, y0, y0 + e, 0.001, 0.016, MAT.bind); bx(x0, x1, y1 - e, y1, 0.001, 0.016, MAT.bind);
  bx(x0, x0 + e, y0 + e, y1 - e, 0.001, 0.016, MAT.bind); bx(x1 - e, x1, y0 + e, y1 - e, 0.001, 0.016, MAT.bind);
  parent.add(grp);
  return grp;
}
