/* Building kit: materials, geometry helpers, signs and reusable props.
   Everything is placed in world coordinates; groups are only used to toggle
   visibility (roofs) or fade (front walls). Physics shapes are registered on Town. */
(function () {
  "use strict";
  const T = (window.Town = window.Town || {});
  T.colliders = [];    // {minX,maxX,minZ,maxZ,top}  top <= feet+step => walkable surface
  T.circles = [];      // {x,z,r,top}
  T.interactions = []; // {id,x,z,r,prompt,action,payload}
  T.clickables = [];   // meshes with userData.click = {action,payload}
  T.animated = [];     // functions (t, dt) => void
  T.buildings = [];
  T.regions = [];
  T.doors = [];
  T.coins = [];

  /* ---------- seeded random so the town is identical on every visit ---------- */
  let seed = 7;
  T.rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  T.pick = (arr) => arr[Math.floor(T.rand() * arr.length)];

  /* ---------- materials & geometry caches ---------- */
  const mats = new Map();
  T.mat = function (color, o = {}) {
    const key = [color, o.flat ? 1 : 0, o.rough ?? 0.85, o.metal || 0, o.emissive || 0, o.ei ?? 1, o.opacity ?? 1].join("|");
    const make = () => new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.85, metalness: o.metal || 0, flatShading: !!o.flat,
      emissive: o.emissive || 0, emissiveIntensity: o.ei ?? 1,
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, depthWrite: (o.opacity ?? 1) >= 0.6
    });
    if (o.unique) return make();
    if (!mats.has(key)) mats.set(key, make());
    return mats.get(key);
  };
  const geos = new Map();
  const geo = (key, make) => { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); };

  function roundedBoxGeometry(w, h, d, r) {
    r = Math.max(0.01, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
    const iw = w - 2 * r, ih = h - 2 * r, cr = Math.min(r * 0.6, iw / 2, ih / 2);
    const s = new THREE.Shape(), x = -iw / 2, y = -ih / 2;
    s.moveTo(x + cr, y); s.lineTo(x + iw - cr, y); s.quadraticCurveTo(x + iw, y, x + iw, y + cr);
    s.lineTo(x + iw, y + ih - cr); s.quadraticCurveTo(x + iw, y + ih, x + iw - cr, y + ih);
    s.lineTo(x + cr, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - cr);
    s.lineTo(x, y + cr); s.quadraticCurveTo(x, y, x + cr, y);
    const depth = Math.max(0.001, d - 2 * r);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 3 });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  }
  T.geo = {
    box: (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)),
    rbox: (w, h, d, r) => geo(`r${w}|${h}|${d}|${r}`, () => roundedBoxGeometry(w, h, d, r)),
    cyl: (rt, rb, h, s = 12) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)),
    ico: (r, detail = 0) => geo(`i${r}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail)),
    dodeca: (r) => geo(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0)),
    sphere: (r, w = 12, h = 8) => geo(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h)),
    cone: (r, h, s = 8) => geo(`k${r}|${h}|${s}`, () => new THREE.ConeGeometry(r, h, s)),
    plane: (w, h) => geo(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h)),
    torus: (r, t, rs = 8, ts = 24) => geo(`t${r}|${t}|${rs}|${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts))
  };

  /* ---------- placement ---------- */
  T.place = function (geometry, material, x, y, z, o = {}) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    if (o.scale) Array.isArray(o.scale) ? m.scale.set(...o.scale) : m.scale.setScalar(o.scale);
    m.castShadow = o.cast !== false;
    m.receiveShadow = o.receive !== false;
    (o.parent || T.world).add(m);
    return m;
  };
  /* Axis-aligned box (optionally rounded). opts.solid registers a collider. */
  T.box = function (x, y, z, w, h, d, color, o = {}) {
    const g = o.r ? T.geo.rbox(w, h, d, o.r) : T.geo.box(w, h, d);
    const m = T.place(g, o.material || T.mat(color, o), x, y, z, o);
    if (o.solid) T.solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, o.top ?? y + h / 2);
    if (o.fade) o.fade.push(m);
    return m;
  };
  T.cyl = function (x, y, z, rt, rb, h, color, o = {}) {
    const m = T.place(T.geo.cyl(rt, rb, h, o.seg || 12), o.material || T.mat(color, o), x, y, z, o);
    if (o.solid) T.circles.push({ x, z, r: Math.max(rt, rb), top: o.top ?? y + h / 2 });
    return m;
  };
  T.solid = (minX, maxX, minZ, maxZ, top = 99) => T.colliders.push({ minX, maxX, minZ, maxZ, top });
  T.solidCircle = (x, z, r, top = 99) => T.circles.push({ x, z, r, top });
  T.interact = (id, x, z, prompt, action, payload, r = 3.2) => T.interactions.push({ id, x, z, r, prompt, action, payload });
  T.clickable = (mesh, action, payload) => { mesh.userData.click = { action, payload }; T.clickables.push(mesh); return mesh; };

  /* ---------- instanced batches (tiles, flowers, books, leaves…) ---------- */
  const batches = new Map();
  T.batch = function (key, geometry, o = {}) {
    if (!batches.has(key)) batches.set(key, { geometry, o, items: [] });
    return batches.get(key);
  };
  T.addInstance = function (key, geometry, x, y, z, color, o = {}) {
    T.batch(key, geometry, o).items.push({ x, y, z, color, rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0, s: o.s || [1, 1, 1] });
  };
  T.flushBatches = function () {
    const dummy = new THREE.Object3D(), c = new THREE.Color();
    batches.forEach((b) => {
      if (!b.items.length) return;
      const im = new THREE.InstancedMesh(b.geometry, T.mat(0xffffff, b.o), b.items.length);
      b.items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(it.rx, it.ry, it.rz); dummy.scale.set(...it.s); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, c.set(it.color));
      });
      im.castShadow = b.o.cast !== false; im.receiveShadow = true;
      T.world.add(im);
    });
    batches.clear();
  };

  /* ---------- canvas text: signs, labels, screens ---------- */
  T.FONT = '"Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
  T.canvasTexture = function (w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.userData = { canvas: c, draw };
    return t;
  };
  T.roundRect = function (g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  };
  /* Floating pill label (always faces camera). */
  T.label = function (text, x, y, z, o = {}) {
    const size = o.size || 1.6, fontPx = 64, pad = 34;
    const probe = document.createElement("canvas").getContext("2d"); probe.font = `700 ${fontPx}px ${T.FONT}`;
    const w = Math.ceil(probe.measureText(text).width + pad * 2), h = fontPx + 44;
    const tex = T.canvasTexture(w, h, (g) => {
      T.roundRect(g, 6, 6, w - 12, h - 12, 26); g.fillStyle = o.bg || "#ffffff"; g.fill();
      g.lineWidth = 9; g.strokeStyle = o.border || "#17202b"; g.stroke();
      g.font = `700 ${fontPx}px ${T.FONT}`; g.fillStyle = o.fg || "#17202b"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 3);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.position.set(x, y, z); s.scale.set(size * w / h, size, 1); s.renderOrder = 2;
    (o.parent || T.world).add(s);
    return s;
  };
  /* Flat sign panel facing +z (rotate with ry). */
  T.sign = function (text, x, y, z, w, h, o = {}) {
    const px = 128, cw = Math.round(w * px), ch = Math.round(h * px);
    const tex = T.canvasTexture(cw, ch, (g) => {
      T.roundRect(g, 4, 4, cw - 8, ch - 8, Math.min(ch, cw) * 0.22); g.fillStyle = o.bg || "#fff6dc"; g.fill();
      g.lineWidth = Math.max(8, ch * 0.07); g.strokeStyle = o.border || "#3b2a20"; g.stroke();
      g.fillStyle = o.fg || "#3b2a20"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `700 ${Math.round(ch * (o.fontScale || 0.5))}px ${T.FONT}`; g.fillText(text, cw / 2, ch / 2 + ch * 0.04, cw * 0.9);
    });
    const m = T.place(T.geo.plane(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent: true }), x, y, z, { ry: o.ry || 0, cast: false, parent: o.parent });
    return m;
  };
  /* Textured plane from a custom drawing (screens, boards, frames). */
  T.panel = function (x, y, z, w, h, draw, o = {}) {
    const px = o.px || 128;
    const tex = T.canvasTexture(Math.round(w * px), Math.round(h * px), draw);
    const material = o.glow
      ? new THREE.MeshBasicMaterial({ map: tex })
      : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    return T.place(T.geo.plane(w, h), material, x, y, z, { ry: o.ry || 0, cast: false, parent: o.parent });
  };

  /* ---------- nature ---------- */
  const LEAF = [0x5fb848, 0x4fa83f, 0x72c457, 0x63b04a, 0x58b05e];
  T.tree = function (x, z, s = 1, kind) {
    kind = kind || (T.rand() < 0.25 ? "pine" : "round");
    const trunk = 0x8a5a3a;
    T.cyl(x, 1.6 * s, z, 0.38 * s, 0.55 * s, 3.2 * s, trunk, { seg: 7, flat: true });
    T.solidCircle(x, z, 0.75 * s);
    if (kind === "pine") {
      const c = T.pick([0x3f9a4f, 0x4aa257, 0x358c48]);
      [[2.4, 3.2, 3.6], [1.9, 2.8, 5.4], [1.3, 2.4, 7]].forEach(([r, h, y]) =>
        T.place(T.geo.cone(r * s, h * s, 7), T.mat(c, { flat: true }), x, y * s, z, { ry: T.rand() * 3 }));
    } else {
      const c1 = T.pick(LEAF), c2 = T.pick(LEAF);
      T.place(T.geo.ico(2.3 * s, 1), T.mat(c1, { flat: true }), x, 5 * s, z, { ry: T.rand() * 3 });
      T.place(T.geo.ico(1.6 * s, 1), T.mat(c2, { flat: true }), x + 1.2 * s, 5.9 * s, z - 0.5 * s, { ry: T.rand() * 3 });
      T.place(T.geo.ico(1.4 * s, 1), T.mat(c1, { flat: true }), x - 1.1 * s, 4.5 * s, z + 0.7 * s, { ry: T.rand() * 3 });
    }
  };
  T.bush = function (x, z, s = 1, color) {
    const c = color || T.pick([0x5aae47, 0x4f9f43, 0x67bb52]);
    T.place(T.geo.ico(1 * s, 1), T.mat(c, { flat: true }), x, 0.7 * s, z, { scale: [1.2, 0.8, 1.1], ry: T.rand() * 3 });
    T.place(T.geo.ico(0.7 * s, 1), T.mat(c, { flat: true }), x + 0.8 * s, 0.55 * s, z + 0.2 * s, { ry: T.rand() * 3 });
  };
  const FLOWER = [0xff6b81, 0xffd23f, 0xffffff, 0xb07cf0, 0xff9f43, 0x6ec6ff];
  T.flowers = function (x, z, w, d, n = 10, palette = FLOWER, y0 = 0) {
    for (let i = 0; i < n; i++) {
      const fx = x + (T.rand() - 0.5) * w, fz = z + (T.rand() - 0.5) * d;
      T.addInstance("stem", T.geo.box(0.08, 0.6, 0.08), fx, y0 + 0.3, fz, 0x3f8f3a, { cast: false });
      T.addInstance("bloom", T.geo.ico(0.2, 0), fx, y0 + 0.68, fz, T.pick(palette), { flat: true, cast: false, ry: T.rand() * 3 });
    }
  };
  T.flowerBed = function (x, z, w, d, o = {}) {
    T.box(x, 0.2, z, w + 0.5, 0.4, d + 0.5, o.edge || 0xb98a62, { r: 0.12 });
    T.box(x, 0.38, z, w, 0.12, d, 0x6b4a32, { cast: false });
    T.flowers(x, z, w * 0.9, d * 0.85, Math.round(w * d * 1.6), o.palette, 0.3);
  };
  T.rock = function (x, z, s = 1) {
    T.place(T.geo.dodeca(0.9 * s), T.mat(T.pick([0xa3a8a6, 0xb6b9b2, 0x9a9f9b]), { flat: true }), x, 0.35 * s, z, { scale: [1.2, 0.7, 1], ry: T.rand() * 3 });
  };
  T.grassTufts = function (cx, cz, radius, n, ok = () => true) {
    for (let i = 0; i < n; i++) {
      const a = T.rand() * Math.PI * 2, r = Math.sqrt(T.rand()) * radius;
      if (!ok(cx + Math.cos(a) * r, cz + Math.sin(a) * r)) continue;
      T.addInstance("tuft", T.geo.cone(0.25, 0.7, 4), cx + Math.cos(a) * r, 0.3, cz + Math.sin(a) * r, T.pick([0x5daa45, 0x6cbb50, 0x4f9a3d]), { flat: true, cast: false, ry: T.rand() * 3 });
    }
  };

  /* ---------- street furniture ---------- */
  T.lamp = function (x, z) {
    T.cyl(x, 0.25, z, 0.45, 0.55, 0.5, 0x3c4a55, { seg: 8 });
    T.cyl(x, 2.6, z, 0.14, 0.18, 4.4, 0x3c4a55, { seg: 8 });
    T.box(x, 5.1, z, 0.9, 0.9, 0.9, 0xfff1b8, { emissive: 0xffd77a, ei: 0.55, r: 0.15 });
    T.place(T.geo.cone(0.85, 0.6, 4), T.mat(0x2f3b45, { flat: true }), x, 5.85, z, { ry: Math.PI / 4 });
    T.solidCircle(x, z, 0.5);
  };
  T.bench = function (x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; T.world.add(g);
    const wood = 0xc07a45, metal = 0x3c4a55;
    [-0.35, 0, 0.35].forEach((o) => T.box(0, 1.1, o, 3.6, 0.16, 0.3, wood, { parent: g, r: 0.06 }));
    [1.6, 2.05].forEach((y) => T.box(0, y, 0.62, 3.6, 0.3, 0.12, wood, { parent: g, r: 0.05 }));
    [-1.5, 1.5].forEach((o) => { T.box(o, 0.55, 0, 0.16, 1.1, 1, metal, { parent: g }); T.box(o, 1.6, 0.62, 0.14, 1.1, 0.14, metal, { parent: g }); });
    T.solidCircle(x, z, 1.4, 1.2);
  };
  /* Picket fence along an axis-aligned segment. */
  T.fence = function (x1, z1, x2, z2, color = 0xfdf6e8) {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 1.1)), alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
      T.addInstance("picket", T.geo.box(0.22, 1.5, 0.12), px, 0.75, pz, color, { ry: alongX ? 0 : Math.PI / 2 });
      T.addInstance("picketTop", T.geo.cone(0.16, 0.3, 4), px, 1.62, pz, color, { ry: Math.PI / 4 });
    }
    [0.5, 1.1].forEach((y) => T.box((x1 + x2) / 2, y, (z1 + z2) / 2, alongX ? len : 0.1, 0.14, alongX ? 0.1 : len, color));
    T.solid(Math.min(x1, x2) - 0.15, Math.max(x1, x2) + 0.15, Math.min(z1, z2) - 0.15, Math.max(z1, z2) + 0.15, 1.7);
  };
  T.crate = function (x, y, z, s = 1.4, ry = 0) {
    T.box(x, y + s / 2, z, s, s, s, 0xc8955c, { ry, r: 0.06 });
    T.box(x, y + s / 2, z, s * 1.02, s * 0.18, s * 1.02, 0x9c6b3c, { ry });
    if (!ry) T.solid(x - s / 2, x + s / 2, z - s / 2, z + s / 2, y + s);
  };

  /* ---------- stone paths along a smooth curve ---------- */
  T.path = function (points, width = 3.6) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "catmullrom", 0.2);
    const len = curve.getLength(), n = Math.ceil(len / 1.5);
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t), ang = Math.atan2(tan.x, tan.z);
      const side = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
      // base strip
      T.addInstance("pathBase", T.geo.box(1, 0.06, 1), p.x, 0.03, p.z, 0xd8ccb2, { ry: ang, s: [width + 0.6, 1, 1.7], cast: false });
      // two staggered slabs per row
      const off = (i % 2 ? 0.45 : -0.45);
      [[-width / 4 + off * 0.5, width / 2 - 0.2], [width / 4 + off * 0.5, width / 2 - 0.2]].forEach(([o, w]) => {
        const sx = p.x + side.x * o, sz = p.z + side.z * o;
        T.addInstance("slab", T.geo.box(1, 0.14, 1), sx, 0.08, sz, T.pick([0xeee7d6, 0xe4dbc6, 0xf3ede0, 0xdcd2bc]), { ry: ang + (T.rand() - 0.5) * 0.12, s: [w, 1, 1.2], cast: false });
      });
    }
  };

  /* ---------- windows and walls with real openings ---------- */
  T.GLASS = () => T.mat(0xbfe9ff, { opacity: 0.32, rough: 0.1, emissive: 0x2a5d7a, ei: 0.15 });
  /* Wall running along X (axis "x") at fixed z, or along Z at fixed x.
     openings: [{c, w, y0, y1}] (c = centre along the wall). y0 < 0.5 means walk-through (door). */
  T.wall = function (axis, a0, a1, fixed, h, t, color, openings = [], o = {}) {
    const ops = openings.slice().sort((p, q) => p.c - q.c);
    const add = (from, to, y0, y1) => {
      if (to - from < 0.01 || y1 - y0 < 0.01) return;
      const c = (from + to) / 2, len = to - from;
      if (axis === "x") T.box(c, (y0 + y1) / 2, fixed, len, y1 - y0, t, color, { fade: o.fade, material: o.material, parent: o.parent });
      else T.box(fixed, (y0 + y1) / 2, c, t, y1 - y0, len, color, { fade: o.fade, material: o.material, parent: o.parent });
    };
    let cur = a0;
    ops.forEach((op) => {
      const s = op.c - op.w / 2, e = op.c + op.w / 2;
      add(cur, s, 0, h); add(s, e, 0, op.y0); add(s, e, op.y1, h); cur = e;
      if (op.y0 > 0.5) {
        // glass + frame
        const glass = T.GLASS(), fr = o.frame ?? 0xffffff, gy = (op.y0 + op.y1) / 2, gh = op.y1 - op.y0;
        if (axis === "x") {
          T.place(T.geo.box(op.w, gh, 0.08), glass, op.c, gy, fixed, { cast: false, parent: o.parent });
          T.box(op.c, gy, fixed, 0.12, gh, t + 0.1, fr, { parent: o.parent });
          T.box(op.c, op.y0 - 0.08, fixed, op.w + 0.5, 0.2, t + 0.5, fr, { parent: o.parent });
          T.box(op.c, op.y1 + 0.06, fixed, op.w + 0.3, 0.16, t + 0.25, fr, { parent: o.parent });
        } else {
          T.place(T.geo.box(0.08, gh, op.w), glass, fixed, gy, op.c, { cast: false, parent: o.parent });
          T.box(fixed, gy, op.c, t + 0.1, gh, 0.12, fr, { parent: o.parent });
          T.box(fixed, op.y0 - 0.08, op.c, t + 0.5, 0.2, op.w + 0.5, fr, { parent: o.parent });
          T.box(fixed, op.y1 + 0.06, op.c, t + 0.25, 0.16, op.w + 0.3, fr, { parent: o.parent });
        }
      }
    });
    add(cur, a1, 0, h);
    // colliders: full wall except walk-through openings
    let c0 = a0;
    ops.filter((op) => op.y0 <= 0.5).forEach((op) => {
      const s = op.c - op.w / 2;
      if (axis === "x") T.solid(c0, s, fixed - t / 2, fixed + t / 2); else T.solid(fixed - t / 2, fixed + t / 2, c0, s);
      c0 = op.c + op.w / 2;
    });
    if (axis === "x") T.solid(c0, a1, fixed - t / 2, fixed + t / 2); else T.solid(fixed - t / 2, fixed + t / 2, c0, a1);
  };

  /* Gable roof, ridge along X. Returns nothing; meshes go into parent. */
  T.gableRoof = function (parent, cx, y0, cz, w, d, rise, color, gableColor, o = {}) {
    const over = o.over ?? 1.1, half = d / 2 + over, slant = Math.hypot(half, rise), ang = Math.atan2(rise, half), th = 0.45;
    [1, -1].forEach((s) => {
      T.box(cx, y0 + rise / 2, cz + s * half / 2, w + over * 2, th, slant + 0.25, color, { parent, rx: s * ang, r: 0.08 });
    });
    T.box(cx, y0 + rise + 0.12, cz, w + over * 2 + 0.1, 0.45, 0.6, o.ridge ?? color, { parent, r: 0.1 });
    // attic prism (gable ends)
    const shape = new THREE.Shape(); shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, rise - 0.2); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
    T.place(g, T.mat(gableColor), cx, y0, cz, { parent });
    if (o.ridges) for (let x = -w / 2 - over + 0.5; x <= w / 2 + over - 0.4; x += 0.9)
      [1, -1].forEach((s) => T.box(cx + x, y0 + rise / 2 + 0.25, cz + s * half / 2, 0.12, 0.12, slant, o.ridges, { parent, rx: s * ang, cast: false }));
  };

  /* ---------- animated doors ---------- */
  T.swingDoor = function (hingeX, hingeZ, w, h, color, dirOpen = 1, axis = "x", parent) {
    const pivot = new THREE.Group(); pivot.position.set(hingeX, 0, hingeZ); (parent || T.world).add(pivot);
    const leaf = T.box(axis === "x" ? w / 2 : 0, h / 2 + 0.3, axis === "x" ? 0 : w / 2, axis === "x" ? w : 0.18, h, axis === "x" ? 0.18 : w, color, { parent: pivot, r: 0.05 });
    T.box(axis === "x" ? w - 0.35 : 0.15, h / 2, axis === "x" ? 0.15 : w - 0.35, 0.18, 0.18, 0.18, 0xffd54a, { parent: pivot, metal: 0.4 });
    leaf.userData.isDoor = true;
    T.doors.push({ x: hingeX + (axis === "x" ? w / 2 : 0), z: hingeZ + (axis === "z" ? w / 2 : 0), open: 0, apply: (k) => { pivot.rotation.y = dirOpen * k * 1.45; } });
  };
})();
