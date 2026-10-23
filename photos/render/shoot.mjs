// usage: node shoot.mjs <outdir> <scale> [only-id]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/Users/reece/code/personal/web/concretecalculator/');
const { chromium } = require('playwright');
const [out, scaleArg, only] = process.argv.slice(2);
const SCALE = parseFloat(scaleArg || '1');
const SHOTS = JSON.parse(fs.readFileSync(new URL('./shots.json', import.meta.url)));
const b = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const s of SHOTS) {
  if (only && !only.split(',').includes(s.id)) continue;
  const [w, h] = s.size;
  const p = await b.newPage({ viewport: { width: w, height: h }, timezoneId: 'Australia/Melbourne' });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('http://127.0.0.1:8765/renovated/');
  await p.evaluate(() => { localStorage.clear(); });
  await p.reload();
  await p.waitForFunction(() => document.getElementById('loading')?.classList.contains('done'), null, { timeout: 180000 });
  const data = await p.evaluate(async ({ s, SCALE }) => {
    const A = window.__app, T = A.THREE, $ = id => document.getElementById(id);
    const t = $('time'); t.value = s.time ?? 21; t.dispatchEvent(new Event('input'));
    if (!$('lights').checked) $('lights').click();         // every light on, as for a listing's dusk shoot
    // doors: open those nearest the given lot points
    for (const [x, y] of s.open || []) {
      let best = null, bd = 1e9; const v = new T.Vector3();
      for (const d of A.doors) { new T.Box3().setFromObject(d).getCenter(v); const dd = Math.hypot(-v.x - x, v.z - y); if (dd < bd) { bd = dd; best = d; } }
      if (best && bd < 1.2 && !best.userData.open) A.toggleDoor(best);
    }
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(1500);
    A.view(s.pos, s.target);
    const cam = A.camera;
    // hfov (lens across the frame) or vfov; level shots give target the same height as pos
    const vfov = s.hfov ? T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(s.hfov) / 2) / (innerWidth / innerHeight))) : s.vfov;
    cam.fov = vfov; cam.near = 0.05; cam.updateProjectionMatrix();
    await sleep(3500);                                   // doors swing, exposure settles, light pool re-aims
    
    A.renderer.setAnimationLoop(null);
    const W = innerWidth, H = innerHeight;
    A.renderer.setPixelRatio(SCALE); A.renderer.setSize(W, H); cam.aspect = W / H; cam.fov = vfov; cam.updateProjectionMatrix();
    // shift (rising front, as a tilt-shift lens): the camera stays level so verticals stay vertical, and the frame
    // slides up by shift x its height. Rendered as the top window of a taller level frame with the same focal length
    if (s.shift) {
      const f = (H / 2) / Math.tan(T.MathUtils.degToRad(vfov) / 2), FH = H * (1 + 2 * s.shift);
      cam.fov = T.MathUtils.radToDeg(2 * Math.atan(FH / 2 / f)); cam.aspect = W / FH;
      cam.setViewOffset(W, FH, 0, 0, W, H);
    }
    if (s.exposure) A.renderer.toneMappingExposure *= s.exposure;
    A.renderer.render(A.scene, cam);
    const src = A.renderer.domElement;
    if (!s.fisheye) return src.toDataURL('image/jpeg', 0.92);
    // stereographic remap: a rectilinear render squeezed toward the edges, so straight lines bow like a fisheye lens
    const c0 = document.createElement('canvas'); c0.width = src.width; c0.height = src.height; c0.getContext('2d').drawImage(src, 0, 0);
    const sd = c0.getContext('2d').getImageData(0, 0, c0.width, c0.height).data;
    const SW = c0.width, SH = c0.height, cx = SW / 2, cy = SH / 2;
    const fR = (SH / 2) / Math.tan(T.MathUtils.degToRad(vfov) / 2);           // rectilinear focal length, px
    const rMaxSrc = Math.hypot(cx, cy), thMax = Math.atan(rMaxSrc / fR);
    const OW = Math.round(SW * s.crop), OH = Math.round(SH * s.crop);
    const ocx = OW / 2, ocy = OH / 2;
    // stereographic: r = 2 f tan(theta/2); choose f so the frame corner shows the same corner angle as the source
    const fS = Math.hypot(ocx, ocy) / (2 * Math.tan(thMax / 2)) * s.fill;
    const c1 = document.createElement('canvas'); c1.width = OW; c1.height = OH;
    const ctx = c1.getContext('2d'), od = ctx.createImageData(OW, OH), o = od.data;
    for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
      const dx = x - ocx, dy = y - ocy, r = Math.hypot(dx, dy);
      const th = 2 * Math.atan(r / (2 * fS)), rs = r > 0 ? fR * Math.tan(th) / r : 1;
      const sx = cx + dx * rs, sy = cy + dy * rs, i = (y * OW + x) * 4;
      if (sx < 0 || sy < 0 || sx >= SW - 1 || sy >= SH - 1) { o[i] = o[i + 1] = o[i + 2] = 12; o[i + 3] = 255; continue; }
      const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
      for (let k = 0; k < 3; k++) {
        const a = sd[(y0 * SW + x0) * 4 + k], bb = sd[(y0 * SW + x0 + 1) * 4 + k], c = sd[((y0 + 1) * SW + x0) * 4 + k], d = sd[((y0 + 1) * SW + x0 + 1) * 4 + k];
        o[i + k] = (a * (1 - fx) + bb * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
      }
      o[i + 3] = 255;
    }
    ctx.putImageData(od, 0, 0);
    return c1.toDataURL('image/jpeg', 0.92);
  }, { s, SCALE });
  fs.writeFileSync(`${out}/${s.id}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', s.id);
  await p.close();
}
await b.close();
