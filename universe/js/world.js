/* Town layout. Geometry only; portfolio text comes from CONTENT (../js/content.js).
   Layout (top view, north = -z):
        Nhi's House (NW)   park    Library (NE)
     lookout ── Achievement Plaza (spawn) ── pond
        Project Garage (SW) sign   Research Lab (SE)            */
(function () {
  "use strict";
  const T = window.Town;
  const PI = Math.PI;

  /* ===================================================================== */
  /*  Ground, sky dressing                                                  */
  /* ===================================================================== */
  function ground() {
    const g = new THREE.PlaneGeometry(320, 320, 110, 110);
    g.rotateX(-PI / 2);
    const pos = g.attributes.position, colors = [], c = new THREE.Color();
    const greens = [new THREE.Color(0x7ccb55), new THREE.Color(0x71c24e), new THREE.Color(0x86d160), new THREE.Color(0x69b84a)];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
      const n = Math.sin(x * 0.11) * Math.cos(z * 0.09) + Math.sin((x + z) * 0.05) * 0.6;
      let y = -0.02;
      if (r > 66) y = Math.min(1, (r - 66) / 45) * (7 + 4 * Math.sin(Math.atan2(z, x) * 5 + n) + 2 * n);
      pos.setY(i, y);
      c.copy(greens[Math.abs(Math.floor(n * 2.2 + x * 0.02)) % 4]);
      if (r > 70) c.lerp(new THREE.Color(0x5aa847), Math.min(1, (r - 70) / 40));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    m.receiveShadow = true;
    T.world.add(m);
  }

  function clouds() {
    for (let i = 0; i < 11; i++) {
      const g = new THREE.Group(), a = (i / 11) * PI * 2, r = 70 + T.rand() * 70;
      g.position.set(Math.cos(a) * r, 46 + T.rand() * 18, Math.sin(a) * r);
      const n = 3 + Math.floor(T.rand() * 3);
      for (let k = 0; k < n; k++) {
        const s = 3 + T.rand() * 3.5;
        T.place(T.geo.ico(s, 1), T.mat(0xffffff, { flat: true, rough: 1, emissive: 0xffffff, ei: 0.25 }), k * 4 - n * 2, T.rand() * 1.5, T.rand() * 3, { parent: g, cast: false, receive: false, scale: [1, 0.7, 1] });
      }
      T.world.add(g);
      const speed = 0.6 + T.rand() * 0.8;
      T.animated.push((t, dt) => { g.position.x += speed * dt; if (g.position.x > 160) g.position.x = -160; });
    }
  }

  /* ===================================================================== */
  /*  Building shell: floor, walls with real openings, fade-able front,     */
  /*  hideable roof. Returns refs used by interiors and the game loop.      */
  /* ===================================================================== */
  function shell(o) {
    const front = new THREE.Group(), roof = new THREE.Group();
    T.world.add(front, roof);
    const t = 0.6, x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, z0 = o.z - o.d / 2, z1 = o.z + o.d / 2;
    const frontZ = o.front > 0 ? z1 : z0, backZ = o.front > 0 ? z0 : z1;
    const fz = frontZ - o.front * t / 2, bz = backZ + o.front * t / 2;
    // floor + foundation
    T.box(o.x, 0.17, o.z, o.w - 0.3, 0.34, o.d - 0.3, o.floor, { cast: false, material: o.floorMat });
    T.solid(x0, x1, z0, z1, 0.34);
    T.box(o.x, 0.15, o.z, o.w + 0.4, 0.3, o.d + 0.4, o.base || 0xb9b3a6, { cast: false });
    T.label(o.name, o.x, o.h + (o.labelY || 7.5), o.z, { parent: roof, size: 1.7, bg: o.labelBg || "#ffffff", fg: o.labelFg || "#17202b" });
    // walls
    T.wall("x", x0, x1, fz, o.h, t, o.wall, o.frontOpenings, { parent: front, frame: o.trim });
    T.wall("x", x0, x1, bz, o.h, t, o.wall, o.backOpenings || [], { frame: o.trim });
    T.wall("z", z0 + t, z1 - t, x0 + t / 2, o.h, t, o.wall, o.sideOpenings || [], { frame: o.trim });
    T.wall("z", z0 + t, z1 - t, x1 - t / 2, o.h, t, o.wall, o.sideOpenings || [], { frame: o.trim });
    // corner trim + top band
    [x0, x1].forEach((x) => [z0, z1].forEach((z) => T.box(x, o.h / 2, z, 0.8, o.h, 0.8, o.trim, { parent: z === frontZ ? front : undefined })));
    T.box(o.x, o.h - 0.15, fz - o.front * 0.08, o.w + 0.4, 0.35, t + 0.3, o.trim, { parent: front });
    // interior wainscot (back + sides)
    if (o.inner) {
      T.box(o.x, 1.2, bz + o.front * 0.33, o.w - 1.3, 1.7, 0.06, o.inner, { cast: false });
      [x0 + t + 0.03, x1 - t - 0.03].forEach((x) => T.box(x, 1.2, o.z, 0.06, 1.7, o.d - 1.3, o.inner, { cast: false }));
    }
    const b = {
      id: o.id, name: o.name, x: o.x, z: o.z, w: o.w, d: o.d, front: o.front, frontZ, backZ,
      minX: x0 + 0.4, maxX: x1 - 0.4, minZ: z0 + 0.4, maxZ: z1 - 0.4,
      h: o.h, frontGroup: front, roof, fadeMats: [], fade: 1,
      outside: { x: o.x + (o.doorX || 0), z: frontZ + o.front * 4.2 }, inside: { x: o.x + (o.doorX || 0), z: frontZ - o.front * 3.6 }
    };
    T.buildings.push(b);
    T.regions.push({ name: o.name, x: o.x, z: o.z, r: Math.max(o.w, o.d) * 0.85, visit: o.id });
    return b;
  }
  /* Called after everything is added to a building's front group. */
  function finishFront(b) {
    b.frontGroup.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone(); m.material.transparent = true; m.userData.baseOpacity = m.material.opacity;
      b.fadeMats.push(m.material);
    });
  }
  function doorInteractions(b, verb) {
    T.interact(`${b.id}-enter`, b.outside.x, b.outside.z - b.front * 1.2, `${verb}`, "enter", b, 3.2);
    T.interact(`${b.id}-leave`, b.inside.x, b.inside.z, `Leave ${b.name}`, "leave", b, 2.2);
  }

  /* ===================================================================== */
  /*  Furniture                                                             */
  /* ===================================================================== */
  function table(x, z, w, d, top = 1.9, wood = 0xa86b3c) {
    T.box(x, top - 0.12, z, w, 0.24, d, wood, { r: 0.08 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => T.box(x + a * (w / 2 - 0.3), (top - 0.2) / 2, z + c * (d / 2 - 0.3), 0.24, top - 0.2, 0.24, wood));
    T.solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, top);
  }
  function chair(x, z, ry, color = 0x8a5a36) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; T.world.add(g);
    T.box(0, 1.15, 0, 1.3, 0.2, 1.3, color, { parent: g, r: 0.06 });
    T.box(0, 2.05, 0.58, 1.3, 1.6, 0.16, color, { parent: g, r: 0.06 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => T.box(a * 0.5, 0.55, c * 0.5, 0.16, 1.1, 0.16, color, { parent: g }));
    T.solidCircle(x, z, 0.7, 1.25);
  }
  function plantPot(x, z, s = 1) {
    T.cyl(x, 0.6 * s, z, 0.55 * s, 0.42 * s, 1.2 * s, 0xc96f4a, { seg: 10 });
    T.place(T.geo.ico(0.9 * s, 1), T.mat(0x4fa95a, { flat: true }), x, 1.7 * s, z, { scale: [1, 1.2, 1] });
    T.place(T.geo.ico(0.6 * s, 1), T.mat(0x63bd5e, { flat: true }), x + 0.4 * s, 2.3 * s, z, {});
    T.solidCircle(x, z, 0.6 * s, 1.2 * s);
  }
  function books(x, y, z, width, ry, palette, depth = 0.55) {
    // a row of books standing on a shelf, centred at x,z, running along local x
    let off = -width / 2 + 0.12;
    const cos = Math.cos(ry), sin = Math.sin(ry);
    while (off < width / 2 - 0.2) {
      const bw = 0.16 + T.rand() * 0.14, bh = 0.6 + T.rand() * 0.38;
      const lx = off + bw / 2, wx = x + lx * cos, wz = z - lx * sin;
      T.addInstance("book", T.geo.box(1, 1, 1), wx, y + bh / 2, wz, T.pick(palette), { ry, rz: T.rand() < 0.08 ? 0.25 : 0, s: [bw, bh, depth] });
      off += bw + 0.03;
    }
  }
  /* Bookshelf facing direction ry (0 = faces +z). Returns clickable meshes. */
  function bookshelf(x, z, ry, w, h, palette, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; T.world.add(g);
    const wood = o.wood || 0x7a4a2c, dpt = 1.0;
    const back = T.box(0, h / 2, -dpt / 2 + 0.06, w, h, 0.12, wood, { parent: g });
    [-w / 2, w / 2].forEach((sx) => T.box(sx, h / 2, 0, 0.18, h, dpt, wood, { parent: g }));
    T.box(0, h + 0.1, 0.05, w + 0.4, 0.22, dpt + 0.2, wood, { parent: g, r: 0.06 });
    const rows = o.rows || 4, gap = (h - 0.5) / rows;
    for (let r = 0; r < rows; r++) T.box(0, 0.25 + r * gap, 0, w, 0.12, dpt, wood, { parent: g });
    g.updateMatrixWorld(true);
    // books in world coordinates
    for (let r = 0; r < rows; r++) {
      const local = new THREE.Vector3(0, 0, 0.02).applyMatrix4(g.matrixWorld);
      books(local.x, 0.31 + r * gap, local.z, w - 0.3, ry, palette);
    }
    const along = Math.abs(Math.sin(ry)) > 0.5;
    if (along) T.solid(x - dpt / 2, x + dpt / 2, z - w / 2, z + w / 2, 99); else T.solid(x - w / 2, x + w / 2, z - dpt / 2, z + dpt / 2, 99);
    return { group: g, back };
  }
  function monitor(x, y, z, ry, w, h, draw, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; T.world.add(g);
    T.box(0, 0, -0.08, w + 0.3, h + 0.3, 0.16, o.bezel || 0x2b3440, { parent: g, r: 0.06 });
    if (!o.wall) {
      const desk = o.desk ?? 2.0, len = Math.max(0.1, y - h / 2 - desk);
      T.box(0, -h / 2 - len / 2, -0.15, 0.25, len, 0.2, 0x2b3440, { parent: g });
      T.box(0, desk - y + 0.04, -0.15, 1.2, 0.08, 0.8, 0x2b3440, { parent: g });
    }
    const screen = T.panel(0, 0, 0.01, w, h, draw, { parent: g, glow: true, px: o.px || 128 });
    return screen;
  }
  function frameOnWall(x, y, z, ry, w, h, draw, color = 0x6b4a32, px) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; T.world.add(g);
    T.box(0, 0, 0, w + 0.35, h + 0.35, 0.14, color, { parent: g, r: 0.05 });
    return T.panel(0, 0, 0.08, w, h, draw, { parent: g, px });
  }
  function chalkboard(x, y, z, ry, w, h, lines) {
    return frameOnWall(x, y, z, ry, w, h, (g, cw, ch) => {
      g.fillStyle = "#2f5d4a"; g.fillRect(0, 0, cw, ch);
      g.fillStyle = "rgba(255,255,255,.06)"; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * cw, Math.random() * ch, 60, 4);
      g.fillStyle = "#f4f1e6"; g.textBaseline = "top";
      lines.forEach((l) => { g.font = `${l.b ? 700 : 500} ${Math.round(ch * (l.s || 0.11))}px ${T.FONT}`; g.fillStyle = l.c || "#f4f1e6"; g.fillText(l.t, cw * l.x, ch * l.y); });
    }, 0x9c6b3c);
  }
  function drawHypergraph(g, cx, cy, s, light) {
    const pts = [[-1, -0.6], [0, -1], [1, -0.5], [-0.8, 0.7], [0.3, 0.6], [1.1, 0.8]].map(([a, b]) => [cx + a * s, cy + b * s]);
    const edges = [[0, 1, 2, "rgba(255,93,143,.35)"], [1, 3, 4, "rgba(58,134,255,.35)"], [2, 4, 5, "rgba(255,183,3,.4)"]];
    edges.forEach(([a, b, c, col]) => { g.beginPath(); g.moveTo(...pts[a]); g.lineTo(...pts[b]); g.lineTo(...pts[c]); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = light ? "#f4f1e6" : "#1d2433"; g.lineWidth = s * 0.03; g.stroke(); });
    pts.forEach((p) => { g.beginPath(); g.arc(p[0], p[1], s * 0.11, 0, PI * 2); g.fillStyle = light ? "#f4f1e6" : "#1d2433"; g.fill(); });
  }

  /* ===================================================================== */
  /*  Achievement Plaza (spawn)                                             */
  /* ===================================================================== */
  function plaza() {
    T.cyl(0, 0.08, 0, 12.6, 12.8, 0.16, 0xefe6d2, { seg: 48, cast: false });
    const ring = (r0, r1, color, y) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48), T.mat(color)); m.rotation.x = -PI / 2; m.position.y = y; m.receiveShadow = true; T.world.add(m); };
    ring(11.4, 12.6, 0xd8c9ab, 0.17); ring(5.2, 5.9, 0xd8c9ab, 0.17);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; T.addInstance("ptile", T.geo.box(1.6, 0.04, 0.9), Math.cos(a) * 8.6, 0.18, Math.sin(a) * 8.6, i % 2 ? 0xe6dcc6 : 0xdcd0b6, { ry: -a, cast: false }); }

    // fountain
    T.cyl(0, 0.55, 0, 4, 4.2, 1.1, 0xcfd6d8, { seg: 28 });
    T.cyl(0, 1.15, 0, 4.1, 4.1, 0.18, 0xe3e8ea, { seg: 28 });
    const water = T.cyl(0, 1.02, 0, 3.55, 3.55, 0.1, 0x55c3ef, { seg: 28, emissive: 0x1f7fb0, ei: 0.25, rough: 0.2, cast: false });
    T.cyl(0, 2.3, 0, 0.55, 0.85, 2.6, 0xdfe5e7, { seg: 12 });
    T.cyl(0, 3.65, 0, 1.7, 0.6, 0.5, 0xcfd6d8, { seg: 16 });
    T.cyl(0, 3.88, 0, 1.45, 1.45, 0.06, 0x7fd6f6, { seg: 16, emissive: 0x3fa7d6, ei: 0.3, cast: false });
    const spout = T.cyl(0, 4.4, 0, 0.18, 0.28, 1.1, 0xbdeeff, { seg: 8, emissive: 0x6fcff5, ei: 0.4, opacity: 0.85, cast: false });
    const drops = [];
    for (let i = 0; i < 10; i++) drops.push(T.place(T.geo.sphere(0.13, 6, 4), T.mat(0xc9f1ff, { emissive: 0x6fcff5, ei: 0.5 }), 0, 4, 0, { cast: false }));
    T.animated.push((t) => {
      spout.scale.y = 1 + Math.sin(t * 6) * 0.12;
      water.material.emissiveIntensity = 0.22 + Math.sin(t * 2) * 0.05;
      drops.forEach((d, i) => { const p = (t * 0.8 + i / drops.length) % 1, a = (i / drops.length) * PI * 2; d.position.set(Math.cos(a) * (0.3 + p * 1.6), 4.9 + p * 0.9 - p * p * 3.6, Math.sin(a) * (0.3 + p * 1.6)); });
    });
    T.solidCircle(0, 0, 4.3, 1.2);

    // spawn pad
    T.box(0, 0.16, 8.6, 4.6, 0.32, 4.6, 0xc9d1d6, { r: 0.12, cast: false });
    T.solid(-2.3, 2.3, 6.3, 10.9, 0.32);
    const pad = T.panel(0, 0.33, 8.6, 4.1, 4.1, (g, w, h) => {
      g.fillStyle = "#d6dde1"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#3a86ff"; g.lineWidth = w * 0.05; g.beginPath(); g.arc(w / 2, h / 2, w * 0.36, 0, PI * 2); g.stroke();
      g.fillStyle = "#3a86ff"; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -PI / 2 + (i * PI) / 5, r = i % 2 ? w * 0.11 : w * 0.25; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
      g.fill();
    });
    pad.rotation.x = -PI / 2;
    const glow = T.place(T.geo.cyl(2.1, 2.1, 1.6, 24), new THREE.MeshBasicMaterial({ color: 0x7fbaff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), 0, 1.1, 8.6, { cast: false, receive: false });
    T.animated.push((t) => { glow.material.opacity = 0.1 + (Math.sin(t * 2.5) + 1) * 0.06; });

    // achievement board
    const wood = 0x8a5a36;
    [-6.4, 6.4].forEach((x) => T.cyl(x, 4, -9.7, 0.35, 0.4, 8, wood, { seg: 8 }));
    T.box(0, 4.7, -9.8, 13, 7, 0.5, wood, { r: 0.2 });
    T.gableRoof(T.world, 0, 8.2, -9.8, 13.4, 1.6, 0.9, 0xd8544b, wood, { over: 0.35 });
    T.solid(-6.8, 6.8, -10.2, -9.3);
    const quests = CONTENT.careerQuests;
    const boardFace = T.panel(0, 4.7, -9.53, 12.2, 6.4, (g, w, h) => {
      g.fillStyle = "#fff6dc"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffb703"; T.roundRect(g, w * 0.03, h * 0.035, w * 0.94, h * 0.16, 30); g.fill();
      g.fillStyle = "#3b2a20"; g.font = `700 ${h * 0.1}px ${T.FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ACHIEVEMENTS", w / 2, h * 0.12);
      const top = h * 0.24, rowH = (h * 0.74) / quests.length;
      quests.forEach((q, i) => {
        const y = top + i * rowH;
        g.fillStyle = i % 2 ? "#fbeec9" : "#fff2d2"; T.roundRect(g, w * 0.03, y + 6, w * 0.94, rowH - 12, 22); g.fill();
        const done = q.status === "done";
        g.fillStyle = done ? "#2fbf5b" : "#ffb703"; g.beginPath(); g.arc(w * 0.075, y + rowH / 2, rowH * 0.3, 0, PI * 2); g.fill();
        g.strokeStyle = "#fff"; g.lineWidth = rowH * 0.08; g.lineCap = "round"; g.beginPath();
        if (done) { g.moveTo(w * 0.062, y + rowH * 0.5); g.lineTo(w * 0.072, y + rowH * 0.62); g.lineTo(w * 0.09, y + rowH * 0.38); }
        else { g.moveTo(w * 0.065, y + rowH * 0.5); g.lineTo(w * 0.085, y + rowH * 0.5); }
        g.stroke();
        g.textAlign = "left"; g.fillStyle = "#3b2a20"; g.font = `700 ${rowH * 0.36}px ${T.FONT}`; g.fillText(q.name, w * 0.12, y + rowH * 0.4, w * 0.62);
        g.fillStyle = "#7a6650"; g.font = `600 ${rowH * 0.24}px ${T.FONT}`; g.fillText(q.note, w * 0.12, y + rowH * 0.74, w * 0.62);
        g.textAlign = "right"; g.fillStyle = done ? "#1f8a43" : "#c27c00"; g.font = `700 ${rowH * 0.3}px ${T.FONT}`; g.fillText(done ? "COMPLETE" : "IN PROGRESS", w * 0.94, y + rowH / 2);
      });
    }, { px: 110 });
    T.clickable(boardFace, "boardClick", { rows: quests.length, top: 0.24, span: 0.74 });
    T.interact("plaza-board", 0, -7.4, "View Achievements", "achievements", null, 3.4);
    T.flowerBed(-8.8, -10.6, 2.6, 1.3); T.flowerBed(8.8, -10.6, 2.6, 1.3);

    // benches, planters, lamps
    [20, 160, 200, 340].forEach((deg) => { const a = (deg * PI) / 180, x = Math.cos(a) * 10.2, z = Math.sin(a) * 10.2; T.bench(x, z, Math.atan2(x, z)); });
    [[-4.8, 12.3], [4.8, 12.3]].forEach(([x, z]) => { T.cyl(x, 0.4, z, 1.3, 1.4, 0.8, 0xd9cdb4, { seg: 12, solid: true }); T.cyl(x, 0.82, z, 1.1, 1.1, 0.06, 0x6b4a32, { seg: 12, cast: false }); T.flowers(x, z, 1.6, 1.6, 10, undefined, 0.8); });
    [30, 150, 210, 330].forEach((deg) => { const a = (deg * PI) / 180; T.lamp(Math.cos(a) * 12.4, Math.sin(a) * 12.4); });
    T.npc = { x: 4.6, z: -6.6, ry: 0.3 };
    T.regions.push({ name: "Achievement Plaza", x: 0, z: 0, r: 13 });
  }

  /* ===================================================================== */
  /*  Nhi's House (NW)                                                      */
  /* ===================================================================== */
  function house() {
    // A cozy, slightly messy home: living room (west), bedroom (east), backyard court (north).
    const X = -34, Z = -31, W = 26, D = 17, H = 7.2;
    const wall = 0xf6e0a8, trim = 0xffffff, roofC = 0xc2634a;
    const BACK_DOOR = -44.6, BED_WIN = -25.4;
    const b = shell({
      id: "house", name: "Nhi's House", labelBg: "#fff1c9", x: X, z: Z, w: W, d: D, h: H, front: 1, wall, trim, floor: 0xc8945f, inner: 0xe9c88f, base: 0xb39f86,
      frontOpenings: [{ c: X, w: 3.4, y0: 0, y1: 5.6 }, { c: X - 8, w: 3.4, y0: 1.9, y1: 4.9 }, { c: BED_WIN, w: 3, y0: 1.9, y1: 4.9 }],
      backOpenings: [{ c: BACK_DOOR, w: 2.8, y0: 0, y1: 5.3 }, { c: BED_WIN, w: 3, y0: 2.6, y1: 5 }],
      sideOpenings: [{ c: Z, w: 3.2, y0: 2.6, y1: 5.2 }]
    });
    T.gableRoof(b.roof, X, H, Z, W, D, 5.4, roofC, wall, { ridge: 0xa84f3a });
    T.box(X - 7, H + 3.2, Z - 3.6, 1.7, 5, 1.7, 0xb0563f, { parent: b.roof });
    T.box(X - 7, H + 5.8, Z - 3.6, 2, 0.4, 2, 0x8f4535, { parent: b.roof });
    // porch
    T.box(X, 0.28, Z + D / 2 + 1.55, 7.4, 0.56, 3.1, 0xb07a4f, { r: 0.06 });
    T.solid(X - 3.7, X + 3.7, Z + D / 2, Z + D / 2 + 3.1, 0.56);
    T.box(X, 0.15, Z + D / 2 + 3.6, 4, 0.3, 1.1, 0xc08a5c);
    [-3.3, 3.3].forEach((o) => T.cyl(X + o, 3.1, Z + D / 2 + 2.8, 0.2, 0.22, 5.1, trim, { seg: 8, solid: true }));
    T.box(X, 5.75, Z + D / 2 + 1.7, 8.2, 0.3, 3.9, roofC, { parent: b.roof, rx: 0.16, r: 0.08 });
    T.swingDoor(X - 1.7, Z + D / 2, 3.4, 5.3, 0x6e8fb3, 1, "x", b.frontGroup);
    // window boxes outside
    [X - 8, BED_WIN].forEach((wx) => T.box(wx, 1.65, Z + D / 2 + 0.55, 3.7, 0.5, 0.6, 0x8a5a3a, { parent: b.frontGroup }));
    T.flowers(X - 8, Z + D / 2 + 0.55, 3.2, 0.3, 9, undefined, 1.6); T.flowers(BED_WIN, Z + D / 2 + 0.55, 2.8, 0.3, 8, undefined, 1.6);
    finishFront(b);
    doorInteractions(b, "Enter Nhi's House");

    const iz0 = Z - D / 2 + 0.6, iz1 = Z + D / 2 - 0.6, ix0 = X - W / 2 + 0.6, ix1 = X + W / 2 - 0.6;
    const PX = -29.4;                         // living room | bedroom
    const vase = (x, y, z, col = 0x8fd3ff, n = 6) => { T.cyl(x, y + 0.25, z, 0.2, 0.15, 0.5, col, { seg: 10 }); T.flowers(x, z, 0.35, 0.35, n, undefined, y + 0.3); };
    const sill = (x, y, z, along, len) => { T.box(x, y, z, along === "x" ? len : 0.5, 0.3, along === "x" ? 0.5 : len, 0x8a5a3a, { r: 0.05 }); T.flowers(x, z, along === "x" ? len - 0.3 : 0.3, along === "x" ? 0.3 : len - 0.3, Math.round(len * 3), undefined, y + 0.12); };

    // inner wall with a doorway into the bedroom
    T.wall("z", iz0, iz1, PX, H, 0.4, 0xfbefd6, [{ c: -25.2, w: 3, y0: 0, y1: 5.4 }]);
    T.box(PX, 5.55, -25.2, 0.5, 0.3, 3.3, trim);

    /* ---------- living room ---------- */
    T.box(-41.4, 0.36, Z, 7.5, 0.04, 5.6, 0xd9776a, { cast: false, r: 0.01 });
    T.box(-41.4, 0.38, Z, 6.3, 0.04, 4.4, 0xf2c27b, { cast: false });
    const sofa = 0x5f9e8f;
    T.box(ix0 + 1.25, 0.8, Z, 2.3, 0.9, 6, sofa, { r: 0.25 });
    T.box(ix0 + 0.45, 1.9, Z, 0.7, 1.9, 6, sofa, { r: 0.25 });
    [-3.05, 3.05].forEach((o) => T.box(ix0 + 1.25, 1.4, Z + o, 2.3, 1.5, 0.7, 0x548c7f, { r: 0.25 }));
    [-1.4, 1.4].forEach((o) => T.box(ix0 + 1.4, 1.38, Z + o, 1.8, 0.35, 2.6, 0x77b3a5, { r: 0.15 }));
    T.box(ix0 + 1, 2.1, Z - 1.5, 0.5, 1.1, 1.1, 0xffc857, { r: 0.2, rz: 0.2 });
    T.box(ix0 + 1.3, 1.62, Z + 1.2, 0.7, 0.12, 0.5, 0xe84a5f, { ry: 0.4 });          // a manga left on the couch
    T.box(ix0 + 1.5, 1.72, Z + 1.4, 0.7, 0.12, 0.5, 0xf4f1e6, { ry: -0.2 });
    T.solid(ix0, ix0 + 2.4, Z - 3.4, Z + 3.4, 1.55);
    table(-41.6, Z, 2.2, 3.4, 1.15, 0xa86b3c);
    vase(-41.6, 1.15, Z - 0.8, 0xff8fbf);
    T.cyl(-41.4, 1.42, Z + 0.9, 0.22, 0.2, 0.45, 0xffffff, { seg: 10 });
    // floor lamp
    T.cyl(ix0 + 0.9, 2.2, -35.6, 0.08, 0.08, 4.2, 0x3c4a55, { seg: 6 });
    T.cyl(ix0 + 0.9, 0.08, -35.6, 0.5, 0.5, 0.16, 0x3c4a55, { seg: 10 });
    T.cyl(ix0 + 0.9, 4.4, -35.6, 0.45, 0.8, 0.9, 0xfff1c7, { seg: 10, emissive: 0xffd77a, ei: 0.5 });
    T.solidCircle(ix0 + 0.9, -35.6, 0.55);
    sill(-42, 1.78, iz1 - 0.1, "x", 3.2);

    // music corner (front-west): records, speakers, headphones and a "currently listening" board
    const music = CONTENT.home.music;
    T.box(ix0 + 0.8, 0.85, -25.6, 1.5, 1.3, 2.4, 0x8a5a3a, { r: 0.08 });
    T.solid(ix0, ix0 + 1.6, -26.8, -24.4, 1.5);
    for (let i = 0; i < 9; i++) T.box(ix0 + 0.8, 0.85, -26.6 + i * 0.24, 1.2, 1.0, 0.06, [0x17202b, 0xe84a5f, 0x3a86ff, 0xffb703][i % 4]);
    T.box(ix0 + 0.8, 1.6, -26.1, 1.2, 0.2, 1.2, 0x2b3440, { r: 0.05 });
    const platter = T.cyl(ix0 + 0.8, 1.75, -26.1, 0.5, 0.5, 0.06, 0x111111, { seg: 20 });
    T.cyl(ix0 + 0.8, 1.79, -26.1, 0.16, 0.16, 0.04, 0xe84a5f, { seg: 12, cast: false });
    T.box(ix0 + 1.2, 1.8, -25.75, 0.06, 0.06, 0.6, 0xd9dde1, { ry: 0.5 });
    T.animated.push((t) => { platter.rotation.y = t * 3.5; });
    const hp = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 14, PI), T.mat(0xff8fbf)); hp.position.set(ix0 + 0.8, 1.72, -24.95); hp.rotation.y = PI / 2; T.world.add(hp);
    [-1, 1].forEach((s) => T.box(ix0 + 0.8, 1.66, -24.95 + s * 0.32, 0.22, 0.26, 0.14, 0xff8fbf, { r: 0.05 }));
    [-27.6, -23.75].forEach((sz) => {
      T.box(ix0 + 0.6, 0.98, sz, 0.95, 1.6, 0.95, 0x2b3440, { r: 0.08 });
      [1.35, 0.7].forEach((y, k) => T.cyl(ix0 + 1.09, y, sz, k ? 0.32 : 0.2, k ? 0.32 : 0.2, 0.05, 0x5c6b78, { seg: 14, rz: PI / 2, cast: false }));
      T.solid(ix0, ix0 + 1.1, sz - 0.5, sz + 0.5, 1.8);
    });
    const listening = music.djs.filter(real);
    const board = T.panel(ix0 + 0.05, 4.4, -25.7, 3.2, 2.1, (g, w, h) => {
      g.fillStyle = "#c79a6b"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff6dc"; T.roundRect(g, w * 0.04, h * 0.05, w * 0.92, h * 0.9, 18); g.fill();
      g.fillStyle = "#e0559a"; g.font = `700 ${h * 0.13}px ${T.FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("currently listening ♪", w / 2, h * 0.2);
      g.fillStyle = "#3b2a20"; g.font = `700 ${h * 0.1}px ${T.FONT}`;
      if (listening.length) listening.slice(0, 4).forEach((d, i) => g.fillText(`♫ ${d}`, w / 2, h * (0.42 + i * 0.14), w * 0.86));
      else { g.fillStyle = "#7a6650"; g.fillText("house music · coming soon", w / 2, h * 0.5); }
      g.fillStyle = "#1db954"; g.beginPath(); g.arc(w * 0.88, h * 0.85, h * 0.06, 0, PI * 2); g.fill();
    }, { ry: PI / 2 });
    T.clickable(board, "music"); T.clickable(platter, "music");
    T.interact("house-music", ix0 + 2.6, -25.6, "Check out the music corner", "music", null, 2);

    // basketball by the front door + shoes
    const ball = T.place(T.geo.sphere(0.42, 16, 12), T.mat(0xf07a24, { rough: 0.7 }), -36.6, 0.76, -24.1, {});
    T.box(-36.6, 0.76, -24.1, 0.86, 0.04, 0.04, 0x2b2b2b, { cast: false }); T.box(-36.6, 0.76, -24.1, 0.04, 0.86, 0.04, 0x2b2b2b, { cast: false });
    [-37.75, -37.25].forEach((sx, i) => {
      T.box(sx, 0.42, -24.0 + i * 0.1, 0.42, 0.14, 0.95, 0xffffff, { r: 0.05 });
      T.box(sx, 0.62, -24.1 + i * 0.1, 0.4, 0.3, 0.75, 0xe84a5f, { r: 0.08 });
    });
    T.clickable(ball, "basketball");
    T.interact("house-ball", -37, -24.5, "Basketball stuff", "basketball", null, 1.4);

    // the cat and her bed
    const cx = -37.4, cz = -28.6;
    T.cyl(cx, 0.45, cz, 1.2, 1.3, 0.3, 0x9b6bd0, { seg: 16 });
    T.cyl(cx, 0.56, cz, 0.95, 0.95, 0.06, 0xc9a7f0, { seg: 16, cast: false });
    T.cat = buildCat(cx, 0.6, cz);
    T.interact("house-cat", cx, cz, "Pet the cat", "cat", null, 2.4);

    // family photo wall (back wall, right of the back door)
    const frameZ = iz0 + 0.1;
    const fCat = frameOnWall(-41.5, 4.3, frameZ, 0, 1.8, 1.8, drawCatPhoto);
    const fI = frameOnWall(-39.3, 4.5, frameZ, 0, 2, 1.7, drawBlockI);
    const fam = frameOnWall(-35.9, 4.4, frameZ, 0, 3.4, 2.3, drawFamily, 0x8a5a36, 240);
    const bros = frameOnWall(-32.6, 4.3, frameZ, 0, 2.2, 2, drawBrothers, 0xc2416a, 200);
    T.sign("my favorite people ♥", -34.3, 2.75, frameZ + 0.05, 3.6, 0.6, { bg: "#fff1f6", fg: "#c2416a", border: "#c2416a", fontScale: 0.5 });
    T.clickable(fCat, "catInfo"); T.clickable(fI, "education"); T.clickable(fam, "family"); T.clickable(bros, "brothers");
    T.drawFamily = drawFamily; T.drawBrothers = drawBrothers;
    T.interact("house-photos", -35.9, iz0 + 2.4, "Look at the family photos", "family", null, 2.2);

    // manga shelf + posters + LEGO display on the inner wall
    const manga = bookshelf(PX - 0.7, -30.2, -PI / 2, 4, 3.6, [0xe84a5f, 0xf4f1e6, 0xffd166, 0x3a86ff, 0xe84a5f, 0xf4f1e6], { rows: 3 });
    figure(PX - 0.7, 3.95, -29.2, { shirt: 0xe84a5f, pants: 0x3a86ff, hat: true });       // straw hat
    figure(PX - 0.7, 3.95, -31.2, { shirt: 0x2a4f9e, pants: 0x2a4f9e, glasses: true });   // little detective
    T.panel(PX - 0.22, 2.3, -32.45, 0.9, 0.8, (g, w, h) => {
      g.fillStyle = "#ffe066"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#3b2a20"; g.font = `700 ${h * 0.17}px ${T.FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
      CONTENT.home.anime.note.split(/(?<=,) /).forEach((ln, i, a) => g.fillText(ln, w / 2, h * (0.5 + (i - (a.length - 1) / 2) * 0.24), w * 0.9));
    }, { ry: -PI / 2, px: 200 });
    const pOP = T.panel(PX - 0.22, 5.4, -29, 1.7, 2.1, drawStrawHatPoster, { ry: -PI / 2, px: 160 });
    const pDC = T.panel(PX - 0.22, 5.4, -31.4, 1.7, 2.1, drawDetectivePoster, { ry: -PI / 2, px: 160 });
    [manga.back, pOP, pDC].forEach((m) => T.clickable(m, "anime"));
    T.interact("house-anime", -32, -30.2, "Browse the anime & manga shelf", "anime", null, 2);

    const lego = legoShelf(PX - 0.7, -36.1, 3.8);
    T.clickable(lego, "lego");
    [[-31.6, -34.2, 0xe84a5f], [-32.2, -34.9, 0xffd166], [-31.3, -35.6, 0x3a86ff], [-32.6, -35.3, 0x2fbf5b]].forEach(([x, z, c], i) => brick(x, 0.34, z, c, i * 0.7));
    T.interact("house-lego", -32, -36.1, "Look at the LEGO collection", "lego", null, 2);

    /* ---------- bedroom ---------- */
    // bed with a pink blanket and flowers by it
    const bx = -24, bz = -36.3;
    T.box(bx, 0.6, bz, 3.4, 0.6, 4.8, 0x9c6b3c, { r: 0.08 });
    T.box(bx, 3.0 - 1.4, bz - 2.3, 3.4, 2.4, 0.3, 0x9c6b3c, { r: 0.08 });
    T.box(bx, 1.1, bz, 3.2, 0.4, 4.6, 0xffffff, { r: 0.12 });
    T.box(bx, 1.36, bz + 0.6, 3.3, 0.18, 3.3, 0xff8fbf, { r: 0.08 });
    T.box(bx, 1.45, bz - 1.65, 2.2, 0.35, 0.9, 0xfff6dc, { r: 0.15 });
    T.box(bx + 0.9, 1.7, bz - 1.2, 0.6, 0.7, 0.4, 0xc9a7f0, { r: 0.2 });                     // plushie
    T.solid(bx - 1.7, bx + 1.7, bz - 2.4, bz + 2.4, 1.45);
    T.box(-27, 0.75, -37.9, 1.3, 1.5, 1.1, 0xa86b3c, { r: 0.08 }); T.solid(-27.65, -26.35, -38.45, -37.35, 1.5);
    vase(-27.2, 1.5, -37.7, 0xffffff, 7);
    T.cyl(-26.7, 1.9, -38.1, 0.25, 0.3, 0.8, 0xfff1c7, { seg: 10, emissive: 0xffd77a, ei: 0.4 });
    sill(ix1 - 0.15, 2.55, Z, "z", 3);
    // Vietnamese flag above the nightstand
    const flag = new THREE.Group(); flag.position.set(-27.9, 4.7, iz0 + 0.12); T.world.add(flag);
    T.panel(0, 0, 0, 2.1, 1.4, drawVietFlag, { parent: flag });
    T.cyl(0, 0.78, 0.06, 0.05, 0.05, 2.4, 0x7a4a2c, { parent: flag, seg: 6, rz: PI / 2 });
    [-1.25, 1.25].forEach((x) => T.place(T.geo.sphere(0.1, 8, 6), T.mat(0xffcd00), x, 0.78, 0.06, { parent: flag }));
    // basketball jersey in a frame (east wall)
    const jersey = frameOnWall(ix1 - 0.1, 4.4, -36.2, -PI / 2, 1.9, 2.2, drawJersey, 0x2b3440, 160);
    T.clickable(jersey, "basketball");
    // Roblox gaming setup on the inner wall, plus the "now working on" screen
    table(PX + 1.1, -31, 1.8, 4.2, 2.0, 0x3c4a55);
    const robloxScreen = monitor(PX + 0.65, 3.35, -32.05, PI / 2, 1.8, 1.15, drawRobloxScreen, { px: 200 });
    const cur = CONTENT.current || [];
    const workScreen = monitor(PX + 0.65, 3.35, -29.95, PI / 2, 1.8, 1.15, (g, w, h) => {
      g.fillStyle = "#1d2433"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#3a86ff"; g.fillRect(0, 0, w, h * 0.22);
      g.fillStyle = "#fff"; g.font = `700 ${h * 0.12}px ${T.FONT}`; g.textBaseline = "middle"; g.fillText("now working on…", w * 0.05, h * 0.11);
      cur.slice(0, 3).forEach((c, i) => { g.fillStyle = ["#ffb703", "#2fbf5b", "#ff5d8f"][i]; g.fillRect(w * 0.05, h * (0.33 + i * 0.22), h * 0.09, h * 0.09); g.fillStyle = "#e9eef7"; g.font = `600 ${h * 0.1}px ${T.FONT}`; g.fillText(c.title, w * 0.13, h * (0.38 + i * 0.22), w * 0.84); });
    }, { px: 200 });
    T.box(PX + 1.4, 2.06, -31, 0.6, 0.08, 1.8, 0x1d2433);
    T.box(PX + 1.41, 2.11, -31, 0.5, 0.02, 1.7, 0x8a5cf6, { emissive: 0x8a5cf6, ei: 0.6, cast: false });   // RGB keyboard
    T.box(PX + 1.4, 2.08, -29.7, 0.3, 0.08, 0.2, 0xffffff, { r: 0.04 });
    vase(PX + 1.3, 2.0, -33.4, 0xff8fbf, 6);
    chair(PX + 3, -31, PI / 2, 0xff8fbf);
    T.clickable(robloxScreen, "gaming"); T.clickable(workScreen, "current");
    T.interact("house-gaming", PX + 3.2, -32.4, "Check out the gaming setup", "gaming", null, 1.6);
    T.interact("house-desk", PX + 3.2, -29.6, "See what I'm working on", "current", null, 1.6);
    // hi! photo by the desk
    const fHi = frameOnWall(PX + 0.25, 4.7, -35.4, PI / 2, 1.8, 2.1, drawHiPhoto);
    T.clickable(fHi, "intro");
    // my avatar's outfit on a clothes rack (front-east corner)
    const rx = ix1 - 0.9, rz = -25.3;
    [-1.3, 1.3].forEach((o) => T.cyl(rx, 2.2, rz + o, 0.06, 0.06, 4.1, 0xd9dde1, { seg: 6 }));
    T.cyl(rx, 4.2, rz, 0.05, 0.05, 2.7, 0xd9dde1, { seg: 6, rx: PI / 2 });
    [-1.3, 1.3].forEach((o) => T.box(rx, 0.38, rz + o, 0.9, 0.08, 0.2, 0xd9dde1));
    T.box(rx, 3.15, rz - 0.4, 0.28, 1.4, 1.25, 0xff8fbf, { r: 0.1 });                         // hoodie
    [-1, 1].forEach((s) => T.box(rx, 3.0, rz - 0.4 + s * 0.78, 0.26, 1.3, 0.34, 0xff8fbf, { r: 0.1 }));
    T.box(rx + 0.15, 2.95, rz - 0.4, 0.04, 0.42, 0.7, 0xf06ea6);
    T.box(rx, 3.6, rz + 0.75, 0.24, 0.9, 0.9, 0xffffff, { r: 0.06 });                           // tank top
    T.box(rx, 3.0, rz + 0.75, 0.24, 0.5, 0.95, 0xdcc8a2, { r: 0.06 });                          // shorts
    T.solid(rx - 0.5, rx + 0.5, rz - 1.4, rz + 1.4);
    // a little mess: clothes on the floor, a backpack
    T.box(-27.3, 0.42, -34.6, 1.1, 0.14, 0.8, 0xff8fbf, { ry: 0.4, cast: false });
    T.box(-27.0, 0.5, -34.3, 0.8, 0.12, 0.6, 0x3a86ff, { ry: -0.3, cast: false });
    T.box(-26.6, 0.85, -27.2, 0.8, 1.0, 0.5, 0x8a5cf6, { r: 0.18 }); T.box(-26.6, 0.65, -26.92, 0.6, 0.4, 0.1, 0x6d47c9, { r: 0.05 });

    /* ---------- backyard: half court + flowers ---------- */
    T.box(BACK_DOOR, 0.15, -40.2, 3.2, 0.3, 1.2, 0xc08a5c);
    T.swingDoor(BACK_DOOR - 1.4, iz0 - 0.3, 2.8, 5, 0x6e8fb3, -1, "x");
    T.box(-34, 0.06, -43.7, 12, 0.12, 7, 0xb9c2c9, { cast: false, r: 0.02 });
    const court = T.panel(-34, 0.13, -43.7, 11.6, 6.6, (g, w, h) => {
      g.fillStyle = "#b9c2c9"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#ffffff"; g.lineWidth = w * 0.008;
      g.fillStyle = "#e86a5a"; g.fillRect(w * 0.4, 0, w * 0.2, h * 0.52); g.strokeRect(w * 0.4, 0, w * 0.2, h * 0.52);
      g.beginPath(); g.arc(w / 2, h * 0.52, w * 0.1, 0, PI); g.stroke();
      g.beginPath(); g.arc(w / 2, h * 0.08, w * 0.4, 0.05 * PI, 0.95 * PI); g.stroke();
    }, { px: 80 });
    court.rotation.x = -PI / 2;
    const hoopZ = -46.2, rimY = 5.2;
    T.cyl(-34, 3.2, -47.6, 0.16, 0.2, 6.4, 0x3c4a55, { seg: 8, solid: true });
    T.box(-34, 6.0, -47.1, 0.2, 0.2, 1.0, 0x3c4a55);
    T.box(-34, 6.1, -46.62, 3.2, 2, 0.12, 0xffffff, { r: 0.04 });
    T.panel(-34, 5.95, -46.55, 1.1, 0.8, (g, w, h) => { g.strokeStyle = "#e84a27"; g.lineWidth = w * 0.08; g.strokeRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84); });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 20), T.mat(0xff5a1f)); rim.position.set(-34, rimY, hoopZ); rim.rotation.x = PI / 2; T.world.add(rim);
    T.place(new THREE.CylinderGeometry(0.55, 0.36, 0.8, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true }), -34, rimY - 0.4, hoopZ, { cast: false });
    const yardBall = T.place(T.geo.sphere(0.42, 16, 12), T.mat(0xf07a24, { rough: 0.7 }), -31.5, 0.54, -42.6, {});
    T.hoop = shooter(yardBall, new THREE.Vector3(-34, rimY, hoopZ));
    T.clickable(yardBall, "shoot");
    T.interact("house-hoop", -34, -42.6, "Shoot a hoop", "shoot", null, 3);
    // fence + flower beds
    T.fence(-47, -39.8, -47, -48); T.fence(-21, -39.8, -21, -48); T.fence(-47, -48, -21, -48);
    T.solid(-47.15, -46.85, -48, -39.5); T.solid(-21.15, -20.85, -48, -39.5); T.solid(-47, -21, -48.15, -47.85);
    T.flowerBed(-45.2, -44.6, 1.6, 5.4); T.flowerBed(-22.8, -44.6, 1.6, 5.4); T.flowerBed(-41.5, -47, 3.6, 1); T.flowerBed(-26.5, -47, 3.6, 1);
    T.regions.push({ name: "Nhi's Backyard", x: -34, z: -44, r: 5.5 });

    // front yard
    T.fence(X - 13, Z + D / 2 + 6, X - 2.6, Z + D / 2 + 6); T.fence(X + 2.6, Z + D / 2 + 6, X + 13, Z + D / 2 + 6);
    T.box(X + 3.6, 1.1, Z + D / 2 + 7, 0.25, 2.2, 0.25, 0x7a4a2c);
    T.box(X + 3.6, 2.35, Z + D / 2 + 7, 0.6, 0.6, 1.1, 0x3a86ff, { r: 0.15 });
    T.flowerBed(X - 8.3, Z + D / 2 + 2.2, 2.6, 1.6); T.flowerBed(X + 8.3, Z + D / 2 + 2.2, 2.6, 1.6);
    T.flowerBed(X - 11.4, Z + D / 2 + 2.2, 2, 1.6); T.flowerBed(X + 11.4, Z + D / 2 + 2.2, 2, 1.6);
    T.bush(X - 14.5, Z + 4); T.bush(X + 14.4, Z + 5); T.tree(X + 15.6, Z - 7, 0.9, "pine");
    T.lamp(X + 4.6, Z + D / 2 + 7.4);
  }
  const real = (s) => s && !String(s).startsWith("[");
  /* Simple ball physics for the backyard hoop: arc into the rim, drop through the net, roll back out. */
  function shooter(ball, rim) {
    const s = { t: -1, from: new THREE.Vector3(), rest: ball.position.clone() };
    T.animated.push((t, dt) => {
      if (s.t < 0) return;
      s.t += dt;
      const p = ball.position;
      if (s.t < 1) {
        const k = s.t;
        p.lerpVectors(s.from, rim, k); p.y = s.from.y + (rim.y + 0.5 - s.from.y) * k + Math.sin(k * PI) * 3.2;
      } else if (s.t < 1.5) { const k = (s.t - 1) / 0.5; p.set(rim.x, rim.y + 0.5 - k * (rim.y + 0.5 - 0.54), rim.z); }
      else if (s.t < 2.4) { const k = (s.t - 1.5) / 0.9; p.set(rim.x + (s.rest.x - rim.x) * k, 0.54 + Math.abs(Math.sin(k * PI * 2)) * 0.8 * (1 - k), rim.z + (s.rest.z - rim.z) * k); }
      else { p.copy(s.rest); s.t = -1; }
      ball.rotation.x += dt * 8;
    });
    return { shoot: (from) => { if (s.t >= 0) return false; s.from.set(from.x, from.y + 4, from.z); s.t = 0; return true; } };
  }
  function brick(x, y, z, color, ry = 0) {
    T.box(x, y + 0.15, z, 0.6, 0.3, 0.3, color, { ry, r: 0.03 });
    [-0.15, 0.15].forEach((o) => T.cyl(x + o * Math.cos(ry), y + 0.34, z - o * Math.sin(ry), 0.08, 0.08, 0.08, color, { seg: 8, cast: false }));
  }
  /* Open display shelf with little brick builds, facing -x. Returns a clickable mesh. */
  function legoShelf(x, z, len) {
    const wood = 0xf4f1e6, d = 1;
    const back = T.box(x + 0.44, 1.9, z, 0.12, 3.8, len, wood);
    [-len / 2, len / 2].forEach((o) => T.box(x, 1.9, z + o, d, 3.8, 0.14, wood));
    [0.3, 1.55, 2.8, 3.8].forEach((y) => T.box(x, y, z, d, 0.12, len, wood));
    T.solid(x - d / 2, x + d / 2, z - len / 2, z + len / 2, 99);
    const stud = (bx, by, bz, c) => T.cyl(bx, by + 0.05, bz, 0.07, 0.07, 0.1, c, { seg: 8, cast: false });
    const blk = (bx, by, bz, w, h, dd, c) => { T.box(bx, by + h / 2, bz, dd, h, w, c, { r: 0.02 }); stud(bx, by + h, bz, c); };
    // row 1: a little house and a car
    let y = 0.36;
    blk(x, y, z - 1.1, 1, 0.5, 0.6, 0xe84a5f); T.box(x, y + 0.75, z - 1.1, 0.62, 0.3, 1.05, 0x3a86ff, { r: 0.02 }); T.box(x - 0.31, y + 0.25, z - 1.1, 0.02, 0.28, 0.2, 0x7a4a2c);
    blk(x, y, z + 0.4, 1.1, 0.25, 0.55, 0xffd166); blk(x, y + 0.25, z + 0.3, 0.55, 0.25, 0.5, 0xffd166);
    [-0.35, 0.35].forEach((o) => T.cyl(x - 0.28, y + 0.12, z + 0.4 + o, 0.12, 0.12, 0.08, 0x17202b, { seg: 10, rz: PI / 2, cast: false }));
    blk(x, y, z + 1.4, 0.4, 0.4, 0.4, 0x2fbf5b);
    // row 2: castle tower and a tree
    y = 1.61;
    blk(x, y, z - 0.9, 0.7, 0.9, 0.6, 0x9aa5b1); [-0.25, 0.25].forEach((o) => blk(x, y + 0.9, z - 0.9 + o, 0.2, 0.2, 0.6, 0x9aa5b1));
    T.box(x, y + 0.2, z + 0.5, 0.2, 0.4, 0.2, 0x7a4a2c); T.box(x, y + 0.6, z + 0.5, 0.6, 0.5, 0.6, 0x2fbf5b, { r: 0.04 }); stud(x, y + 0.85, z + 0.5, 0x2fbf5b);
    blk(x, y, z + 1.4, 0.5, 0.3, 0.5, 0xff8a3d);
    // row 3: a spaceship and a minifigure
    y = 2.86;
    blk(x, y, z - 0.6, 1.4, 0.2, 0.5, 0xf4f1e6); blk(x, y + 0.2, z - 0.6, 0.5, 0.3, 0.4, 0x3a86ff); T.box(x, y + 0.1, z - 1.35, 0.3, 0.12, 0.25, 0xff8a3d, { emissive: 0xff8a3d, ei: 0.5 });
    T.box(x, y + 0.25, z + 0.8, 0.3, 0.5, 0.4, 0xe84a5f); T.cyl(x, y + 0.62, z + 0.8, 0.13, 0.13, 0.25, 0xffd166, { seg: 10 });
    T.place(T.geo.cone(0.24, 0.26, 10), T.mat(0x7a4a2c), x, y + 0.86, z + 0.8, {});
    return back;
  }
  /* Tiny blocky anime figure standing on a shelf. */
  function figure(x, y, z, o) {
    T.box(x, y + 0.15, z, 0.24, 0.3, 0.34, o.pants);
    T.box(x, y + 0.45, z, 0.26, 0.32, 0.42, o.shirt, { r: 0.03 });
    T.box(x, y + 0.78, z, 0.3, 0.32, 0.32, 0xf0c49c, { r: 0.06 });
    T.box(x, y + 0.97, z, 0.32, 0.08, 0.34, 0x1b1416, { r: 0.03 });
    if (o.hat) { T.cyl(x, y + 1.0, z, 0.36, 0.36, 0.04, 0xf2c94c, { seg: 14 }); T.cyl(x, y + 1.08, z, 0.18, 0.2, 0.14, 0xf2c94c, { seg: 12 }); T.cyl(x, y + 1.03, z, 0.205, 0.205, 0.05, 0xe84a5f, { seg: 12, cast: false }); }
    if (o.glasses) { T.box(x - 0.17, y + 0.8, z, 0.02, 0.1, 0.26, 0x1d2433); T.box(x - 0.17, y + 0.55, z, 0.02, 0.06, 0.12, 0xe84a5f); }
    T.box(x, y + 0.02, z, 0.36, 0.04, 0.46, 0x2b3440);
  }

  /* ---------- canvas drawings for the house ---------- */
  function drawCatPhoto(g, w, h) {
    g.fillStyle = "#e8edf2"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#20242b"; g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.3, h * 0.22, 0, 0, PI * 2); g.fill();
    g.beginPath(); g.arc(w / 2, h * 0.36, w * 0.2, 0, PI * 2); g.fill();
    g.beginPath(); g.moveTo(w * 0.33, h * 0.3); g.lineTo(w * 0.36, h * 0.12); g.lineTo(w * 0.45, h * 0.22); g.fill();
    g.beginPath(); g.moveTo(w * 0.67, h * 0.3); g.lineTo(w * 0.64, h * 0.12); g.lineTo(w * 0.55, h * 0.22); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(w / 2, h * 0.64, w * 0.14, h * 0.19, 0, 0, PI * 2); g.fill();
    g.beginPath(); g.ellipse(w / 2, h * 0.43, w * 0.12, h * 0.09, 0, 0, PI * 2); g.fill();
    g.fillStyle = "#1d2433"; g.fillRect(w * 0.42, h * 0.34, w * 0.04, h * 0.05); g.fillRect(w * 0.54, h * 0.34, w * 0.04, h * 0.05);
    g.fillStyle = "#ef8ca2"; g.beginPath(); g.arc(w / 2, h * 0.43, w * 0.025, 0, PI * 2); g.fill();
  }
  function drawBlockI(g, w, h) {
    // Illinois "Block I": orange I with a navy outline
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    const blockI = (pad) => {
      const cx = w / 2, top = h * 0.12 - pad, bot = h * 0.88 + pad, bw = h * 0.27 + pad, sw = h * 0.12 + pad, bar = h * 0.17 + pad;
      g.beginPath();
      g.moveTo(cx - bw, top); g.lineTo(cx + bw, top); g.lineTo(cx + bw, top + bar); g.lineTo(cx + sw, top + bar);
      g.lineTo(cx + sw, bot - bar); g.lineTo(cx + bw, bot - bar); g.lineTo(cx + bw, bot); g.lineTo(cx - bw, bot);
      g.lineTo(cx - bw, bot - bar); g.lineTo(cx - sw, bot - bar); g.lineTo(cx - sw, top + bar); g.lineTo(cx - bw, top + bar);
      g.closePath(); g.fill();
    };
    g.fillStyle = "#13294b"; blockI(h * 0.045);
    g.fillStyle = "#ff5f05"; blockI(0);
  }
  function drawHiPhoto(g, w, h) {
    g.fillStyle = "#bfe6ff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#24181a"; T.roundRect(g, w * 0.24, h * 0.14, w * 0.52, h * 0.62, 30); g.fill();
    g.fillStyle = "#d9a07a"; T.roundRect(g, w * 0.31, h * 0.22, w * 0.38, h * 0.32, 26); g.fill();
    g.fillStyle = "#1d2433"; g.fillRect(w * 0.4, h * 0.33, w * 0.04, h * 0.06); g.fillRect(w * 0.56, h * 0.33, w * 0.04, h * 0.06);
    g.fillStyle = "#c2416a"; g.beginPath(); g.arc(w / 2, h * 0.44, w * 0.06, 0, PI); g.fill();
    g.fillStyle = "#ff8fbf"; T.roundRect(g, w * 0.26, h * 0.56, w * 0.48, h * 0.3, 26); g.fill();
    g.fillStyle = "#3b2a20"; g.font = `700 ${h * 0.08}px ${T.FONT}`; g.textAlign = "center"; g.fillText("hi! i'm nhi", w / 2, h * 0.95);
  }
  function drawVietFlag(g, w, h) {
    g.fillStyle = "#da251d"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffcd00"; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -PI / 2 + (i * PI) / 5, r = i % 2 ? h * 0.12 : h * 0.31; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
    g.closePath(); g.fill();
  }
  function drawJersey(g, w, h) {
    const bb = CONTENT.home.basketball;
    g.fillStyle = "#f3efe6"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#552583";
    g.beginPath(); g.moveTo(w * 0.3, h * 0.1); g.lineTo(w * 0.42, h * 0.1); g.quadraticCurveTo(w / 2, h * 0.22, w * 0.58, h * 0.1); g.lineTo(w * 0.7, h * 0.1);
    g.lineTo(w * 0.86, h * 0.3); g.lineTo(w * 0.76, h * 0.36); g.lineTo(w * 0.74, h * 0.9); g.lineTo(w * 0.26, h * 0.9); g.lineTo(w * 0.24, h * 0.36); g.lineTo(w * 0.14, h * 0.3); g.closePath(); g.fill();
    g.strokeStyle = "#fdb927"; g.lineWidth = w * 0.025; g.stroke();
    g.fillStyle = "#fdb927"; g.textAlign = "center"; g.textBaseline = "middle";
    if (real(bb.jerseyNumber)) { g.font = `700 ${h * 0.26}px ${T.FONT}`; g.fillText(bb.jerseyNumber, w / 2, h * 0.58); }
    else { g.beginPath(); g.arc(w / 2, h * 0.56, w * 0.13, 0, PI * 2); g.fill(); g.strokeStyle = "#552583"; g.lineWidth = w * 0.015; g.beginPath(); g.moveTo(w * 0.37, h * 0.56); g.lineTo(w * 0.63, h * 0.56); g.moveTo(w / 2, h * 0.45); g.lineTo(w / 2, h * 0.67); g.stroke(); }
  }
  function drawStrawHatPoster(g, w, h) {
    g.fillStyle = "#17305e"; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.5;
    g.strokeStyle = "#fff"; g.lineWidth = w * 0.07; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx - w * 0.3, cy + h * 0.12); g.lineTo(cx + w * 0.3, cy + h * 0.32); g.moveTo(cx + w * 0.3, cy + h * 0.12); g.lineTo(cx - w * 0.3, cy + h * 0.32); g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, w * 0.22, 0, PI * 2); g.fill(); g.fillRect(cx - w * 0.12, cy + w * 0.12, w * 0.24, w * 0.12);
    g.fillStyle = "#17305e"; [-1, 1].forEach((s) => { g.beginPath(); g.arc(cx + s * w * 0.08, cy + w * 0.02, w * 0.055, 0, PI * 2); g.fill(); });
    g.fillStyle = "#f2c94c"; g.beginPath(); g.ellipse(cx, cy - w * 0.16, w * 0.38, w * 0.07, 0, 0, PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx, cy - w * 0.22, w * 0.2, w * 0.12, 0, PI, 0); g.fill();
    g.fillStyle = "#e84a5f"; g.fillRect(cx - w * 0.2, cy - w * 0.22, w * 0.4, w * 0.05);
    g.fillStyle = "#f2c94c"; g.font = `700 ${h * 0.09}px ${T.FONT}`; g.textAlign = "center"; g.fillText("ONE PIECE", cx, h * 0.12);
  }
  function drawDetectivePoster(g, w, h) {
    g.fillStyle = "#c7302f"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#17202b"; const cx = w * 0.45, cy = h * 0.52;
    g.beginPath(); g.arc(cx, cy - h * 0.1, w * 0.17, 0, PI * 2); g.fill();
    T.roundRect(g, cx - w * 0.22, cy + h * 0.02, w * 0.44, h * 0.3, 20); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = w * 0.035;
    g.beginPath(); g.arc(cx - w * 0.06, cy - h * 0.1, w * 0.05, 0, PI * 2); g.arc(cx + w * 0.07, cy - h * 0.1, w * 0.05, 0, PI * 2); g.stroke();
    g.strokeStyle = "#ffcd00"; g.lineWidth = w * 0.05; g.beginPath(); g.arc(w * 0.74, h * 0.66, w * 0.11, 0, PI * 2); g.stroke();
    g.beginPath(); g.moveTo(w * 0.81, h * 0.73); g.lineTo(w * 0.9, h * 0.84); g.stroke();
    g.fillStyle = "#fff"; g.font = `700 ${h * 0.075}px ${T.FONT}`; g.textAlign = "center"; g.fillText("DETECTIVE", w / 2, h * 0.1); g.fillText("CONAN", w / 2, h * 0.18);
  }
  function drawRobloxScreen(g, w, h) {
    const games = CONTENT.home.gaming.games.filter(real);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#7ec8ff"); sky.addColorStop(1, "#d8f0ff");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = "#6cc04a"; g.fillRect(0, h * 0.78, w, h * 0.22);
    // my avatar: pink hoodie, long black hair
    const ax = w * 0.24, ay = h * 0.78, s = h * 0.62;
    g.fillStyle = "#d9a07a"; g.fillRect(ax - s * 0.13, ay - s * 0.3, s * 0.11, s * 0.3); g.fillRect(ax + s * 0.02, ay - s * 0.3, s * 0.11, s * 0.3);
    g.fillStyle = "#ff8fbf"; T.roundRect(g, ax - s * 0.2, ay - s * 0.66, s * 0.4, s * 0.38, 6); g.fill();
    g.fillRect(ax - s * 0.3, ay - s * 0.64, s * 0.1, s * 0.32); g.fillRect(ax + s * 0.2, ay - s * 0.64, s * 0.1, s * 0.32);
    g.fillStyle = "#171213"; T.roundRect(g, ax - s * 0.19, ay - s * 0.98, s * 0.38, s * 0.42, 10); g.fill();
    g.fillStyle = "#d9a07a"; T.roundRect(g, ax - s * 0.14, ay - s * 0.92, s * 0.28, s * 0.26, 8); g.fill();
    g.fillStyle = "#171213"; g.fillRect(ax - s * 0.15, ay - s * 0.95, s * 0.3, s * 0.07);
    g.fillStyle = "#16100e"; g.fillRect(ax - s * 0.07, ay - s * 0.84, s * 0.03, s * 0.05); g.fillRect(ax + s * 0.04, ay - s * 0.84, s * 0.03, s * 0.05);
    // favorite games card
    g.fillStyle = "rgba(255,255,255,.92)"; T.roundRect(g, w * 0.46, h * 0.08, w * 0.5, h * 0.66, 14); g.fill();
    g.fillStyle = "#17202b"; g.font = `700 ${h * 0.09}px ${T.FONT}`; g.textBaseline = "middle"; g.fillText("favorite games", w * 0.5, h * 0.18);
    g.font = `600 ${h * 0.075}px ${T.FONT}`; g.fillStyle = "#3b4a5c";
    if (games.length) games.slice(0, 4).forEach((n, i) => g.fillText(`★ ${n}`, w * 0.5, h * (0.32 + i * 0.12), w * 0.44));
    else g.fillText("coming soon!", w * 0.5, h * 0.36);
    g.fillStyle = "#17202b"; g.font = `700 ${h * 0.08}px ${T.FONT}`; g.fillText("PLAY ▶", w * 0.52, h * 0.88);
  }
  /* "my favorite people": Nhi and her two brothers. */
  function drawBrothers(g, w, h) {
    g.fillStyle = "#ffe3ee"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 97) % w, (i * 53) % (h * 0.6), 4, 0, PI * 2); g.fill(); }
    const kid = (x, s, shirt, long, skin = "#e9b98f") => {
      const y = h * 0.86, hw = s * 0.34, headY = y - s * 1.12;
      g.fillStyle = "#3b4a6b"; g.fillRect(x - s * 0.22, y - s * 0.18, s * 0.44, s * 0.18);
      g.fillStyle = shirt; T.roundRect(g, x - s * 0.3, y - s * 0.66, s * 0.6, s * 0.5, s * 0.06); g.fill();
      if (long) { g.fillStyle = "#171213"; T.roundRect(g, x - hw * 1.05, headY - hw * 0.1, hw * 2.1, s * 0.86, s * 0.12); g.fill(); }
      g.fillStyle = skin; T.roundRect(g, x - hw * 0.82, headY, hw * 1.64, s * 0.6, s * 0.14); g.fill();
      g.fillStyle = "#171213"; T.roundRect(g, x - hw * 0.9, headY - s * 0.06, hw * 1.8, s * 0.2, s * 0.1); g.fill();
      g.fillStyle = "#1d2433"; g.fillRect(x - hw * 0.4, headY + s * 0.24, s * 0.05, s * 0.09); g.fillRect(x + hw * 0.4 - s * 0.05, headY + s * 0.24, s * 0.05, s * 0.09);
      g.strokeStyle = "#1d2433"; g.lineWidth = s * 0.03; g.beginPath(); g.arc(x, headY + s * 0.36, s * 0.09, 0.15 * PI, 0.85 * PI); g.stroke();
    };
    kid(w * 0.24, h * 0.5, "#2fbf5b", false);
    kid(w * 0.76, h * 0.5, "#ffb703", false);
    kid(w * 0.5, h * 0.55, "#ff8fbf", true, "#d9a07a");
    g.fillStyle = "#e0559a"; g.font = `700 ${h * 0.14}px ${T.FONT}`; g.textAlign = "center"; g.fillText("♥", w * 0.5, h * 0.17);
  }
  /* Family photo: Nhi, her two brothers, parents, grandparents and lots of relatives, drawn Roblox-style. */
  function drawFamily(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#bfe6ff"); sky.addColorStop(1, "#fff1d6");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = "#8fd06a"; g.fillRect(0, h * 0.78, w, h * 0.22);
    const skins = ["#e9b98f", "#dfa97c", "#f0c49c", "#d89f74"];
    const shirts = ["#3a86ff", "#2fbf5b", "#ffb703", "#8a5cf6", "#ff8a3d", "#2ec4b6", "#e84a5f", "#5f9e8f"];
    let k = 0;
    // one blocky person; feet at (x, y), s = size
    function person(x, y, s, o = {}) {
      const skin = o.skin || skins[k % skins.length], shirt = o.shirt || shirts[k % shirts.length], hair = o.hair || "#1b1416"; k++;
      const hw = s * 0.34, bh = s * 0.5, headY = y - bh - s * 0.62;
      g.fillStyle = o.legs || "#3b4a6b"; g.fillRect(x - s * 0.22, y - s * 0.18, s * 0.44, s * 0.18);
      g.fillStyle = shirt; T.roundRect(g, x - s * 0.3, y - bh - s * 0.16, s * 0.6, bh, s * 0.06); g.fill();
      g.fillStyle = skin; g.fillRect(x - s * 0.42, y - bh - s * 0.12, s * 0.11, bh * 0.75); g.fillRect(x + s * 0.31, y - bh - s * 0.12, s * 0.11, bh * 0.75);
      if (o.long) { g.fillStyle = hair; T.roundRect(g, x - hw * 1.05, headY - hw * 0.1, hw * 2.1, s * 0.86, s * 0.12); g.fill(); }
      g.fillStyle = skin; T.roundRect(g, x - hw * 0.82, headY, hw * 1.64, s * 0.6, s * 0.14); g.fill();
      g.fillStyle = o.gray ? "#cfd3d8" : hair; T.roundRect(g, x - hw * 0.9, headY - s * 0.06, hw * 1.8, s * 0.2, s * 0.1); g.fill();
      if (o.bun) { g.beginPath(); g.arc(x, headY - s * 0.08, s * 0.12, 0, PI * 2); g.fill(); }
      g.fillStyle = "#1d2433";
      g.fillRect(x - hw * 0.4, headY + s * 0.24, s * 0.05, s * 0.09); g.fillRect(x + hw * 0.4 - s * 0.05, headY + s * 0.24, s * 0.05, s * 0.09);
      g.strokeStyle = "#1d2433"; g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.arc(x, headY + s * 0.36, s * 0.09, 0.15 * PI, 0.85 * PI); g.stroke();
      if (o.glasses) { g.lineWidth = Math.max(1.5, s * 0.025); [-1, 1].forEach((d) => { g.beginPath(); g.arc(x + d * hw * 0.37, headY + s * 0.28, s * 0.075, 0, PI * 2); g.stroke(); }); }
    }
    // back row: lots of aunts, uncles and cousins
    const back = h * 0.5, bs = h * 0.24;
    for (let i = 0; i < 11; i++) person(w * (0.06 + i * 0.088), back, bs, { long: i % 3 === 1, hair: i % 4 === 3 ? "#3b2a20" : undefined });
    // middle row: grandparents in the middle, parents next to them, more relatives on the ends
    const mid = h * 0.7, ms = h * 0.3;
    person(w * 0.1, mid, ms * 0.95, { long: true });
    person(w * 0.24, mid, ms, { shirt: "#ff8fbf", long: true });                           // mom
    person(w * 0.39, mid, ms, { gray: true, glasses: true, shirt: "#8a5cf6", bun: true });   // grandma
    person(w * 0.61, mid, ms, { gray: true, glasses: true, shirt: "#5f9e8f" });             // grandpa
    person(w * 0.76, mid, ms, { shirt: "#3a86ff" });                                        // dad
    person(w * 0.9, mid, ms * 0.95, {});
    // front row: Nhi (pink hoodie, long black hair) between her two brothers
    const front = h * 0.97, fs = h * 0.34;
    person(w * 0.33, front, fs * 0.95, { shirt: "#2fbf5b", legs: "#2b3440" });              // brother
    person(w * 0.5, front, fs, { shirt: "#ff8fbf", long: true, skin: "#d9a07a", hair: "#171213", legs: "#dcc8a2" }); // Nhi
    person(w * 0.67, front, fs * 0.95, { shirt: "#ffb703", legs: "#2b3440" });              // brother
    // a little heart
    g.fillStyle = "#ff5d8f"; g.font = `700 ${h * 0.12}px ${T.FONT}`; g.textAlign = "center"; g.fillText("♥", w * 0.93, h * 0.14);
  }
  function buildCat(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = 0.6; T.world.add(g);
    const fur = 0x20242b, light = 0xf8f8f4;
    const body = T.box(0, 0.45, 0, 1.3, 0.75, 0.8, fur, { parent: g, r: 0.3 });
    T.box(0.1, 0.35, 0, 0.9, 0.5, 0.82, light, { parent: g, r: 0.2 });
    [-0.34, 0.34].forEach((px) => [-0.28, 0.28].forEach((pz) => T.box(px, 0.12, pz, 0.28, 0.22, 0.25, light, { parent: g, r: 0.1 })));
    const head = new THREE.Group(); head.position.set(0.75, 0.95, 0); g.add(head);
    T.box(0, 0, 0, 0.75, 0.65, 0.75, fur, { parent: head, r: 0.25 });
    [-0.22, 0.22].forEach((o) => T.place(T.geo.cone(0.17, 0.35, 4), T.mat(fur, { flat: true }), 0, 0.42, o, { parent: head, ry: PI / 4 }));
    [-0.13, 0.13].forEach((o) => T.box(0.38, -0.1, o, 0.05, 0.24, 0.24, light, { parent: head, r: 0.08 }));
    [-0.16, 0.16].forEach((o) => T.box(0.38, 0.05, o, 0.04, 0.1, 0.08, 0x1d2433, { parent: head }));
    T.box(0.38, -0.08, 0, 0.04, 0.06, 0.08, 0xff8fa8, { parent: head });
    const tail = new THREE.Group(); tail.position.set(-0.6, 0.45, 0); g.add(tail);
    T.box(-0.35, 0.3, 0, 0.18, 0.9, 0.18, fur, { parent: tail, r: 0.08, rz: 0.5 });
    T.box(-0.58, 0.64, 0, 0.2, 0.25, 0.2, light, { parent: tail, r: 0.08, rz: 0.5 });
    const heart = T.label("♥", x, y + 2.6, z, { size: 0.9, bg: "#ff5d8f", fg: "#ffffff", border: "#ffffff" });
    heart.visible = false;
    T.clickable(body, "cat");
    return { group: g, head, tail, heart, x, z, y, jump: -1 };
  }

  /* ===================================================================== */
  /*  Library (NE)                                                          */
  /* ===================================================================== */
  function library() {
    const X = 34, Z = -31, W = 24, D = 17, H = 8.6;
    const wall = 0xcf7f55, trim = 0xf4e4c6, slate = 0x4e6482;
    const b = shell({
      id: "library", name: "Library", labelBg: "#ffd9c2", x: X, z: Z, w: W, d: D, h: H, front: 1, wall, trim, floor: 0xa8703f, inner: 0x7a4a2c, base: 0xa89a86,
      frontOpenings: [{ c: X, w: 4.2, y0: 0, y1: 6.2 }, { c: X - 8.4, w: 2.6, y0: 1.5, y1: 6.4 }, { c: X - 4.9, w: 2.2, y0: 1.5, y1: 6.4 }, { c: X + 4.9, w: 2.2, y0: 1.5, y1: 6.4 }, { c: X + 8.4, w: 2.6, y0: 1.5, y1: 6.4 }],
      backOpenings: [{ c: X - 5.6, w: 3, y0: 6.7, y1: 8 }, { c: X, w: 3, y0: 6.7, y1: 8 }, { c: X + 5.6, w: 3, y0: 6.7, y1: 8 }],
      sideOpenings: [{ c: Z + 5.4, w: 2.6, y0: 1.6, y1: 6.2 }]
    });
    T.gableRoof(b.roof, X, H, Z, W, D, 5.2, slate, trim, { ridge: 0x3d4f69 });
    // portico: steps, columns, entablature with sign, pediment
    const fz = Z + D / 2;
    T.box(X, 0.3, fz + 1.5, 10, 0.6, 3, 0xe9dcc4, { r: 0.05, parent: b.frontGroup }); T.solid(X - 5, X + 5, fz, fz + 3, 0.6);
    T.box(X, 0.15, fz + 3.5, 8, 0.3, 1.2, 0xded0b5, { parent: b.frontGroup });
    [-3.9, 3.9].forEach((o) => { T.cyl(X + o, 3.5, fz + 2.3, 0.42, 0.48, 5.8, trim, { seg: 12, parent: b.frontGroup }); T.solidCircle(X + o, fz + 2.3, 0.55); T.box(X + o, 6.5, fz + 2.3, 1.2, 0.3, 1.2, trim, { parent: b.frontGroup }); });
    T.box(X, 7.15, fz + 1.4, 10.6, 1.2, 2.6, trim, { parent: b.frontGroup });
    T.sign("LIBRARY", X, 7.15, fz + 2.72, 7.4, 1, { bg: "#f4e4c6", fg: "#4e6482", border: "#f4e4c6", fontScale: 0.75, parent: b.frontGroup });
    const ped = new THREE.Shape(); ped.moveTo(-5.5, 0); ped.lineTo(5.5, 0); ped.lineTo(0, 2.4); ped.closePath();
    const pg = new THREE.ExtrudeGeometry(ped, { depth: 2.8, bevelEnabled: false }); pg.translate(0, 0, -1.4);
    T.place(pg, T.mat(slate), X, 7.75, fz + 1.4, { parent: b.frontGroup });
    T.place(new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-4.2, 0); s.lineTo(4.2, 0); s.lineTo(0, 1.8); s.closePath(); return s; })(), { depth: 0.1, bevelEnabled: false }), T.mat(trim), X, 7.95, fz + 2.8, { parent: b.frontGroup });
    T.cyl(X, 8.6, fz + 2.9, 0.55, 0.55, 0.1, 0x4e6482, { seg: 20, rx: PI / 2, parent: b.frontGroup });
    T.swingDoor(X - 2.1, fz, 4.2, 5.9, 0x5a3a24, 1, "x", b.frontGroup);
    finishFront(b);
    doorInteractions(b, "Open Library");
    T.lamp(X - 6.4, fz + 4.4); T.lamp(X + 6.4, fz + 4.4);

    // ---- interior ----
    const ix0 = X - W / 2 + 0.6, ix1 = X + W / 2 - 0.6, iz0 = Z - D / 2 + 0.6;
    T.box(X, 0.36, Z + 0.5, 3, 0.03, 14, 0xb8423d, { cast: false });
    const slots = [
      [X - 8.4, iz0 + 0.55, 0], [X - 2.8, iz0 + 0.55, 0], [X + 2.8, iz0 + 0.55, 0], [X + 8.4, iz0 + 0.55, 0],
      [ix0 + 0.55, Z - 4.3, PI / 2], [ix0 + 0.55, Z + 0.5, PI / 2], [ix1 - 0.55, Z - 4.3, -PI / 2]
    ];
    (CONTENT.library || []).slice(0, slots.length).forEach((cat, i) => {
      const [sx, sz, ry] = slots[i];
      const col = new THREE.Color(cat.color), pal = [cat.color, col.clone().offsetHSL(0, 0, 0.12).getHex(), col.clone().offsetHSL(0, -0.1, -0.12).getHex(), 0xf4f1e6, 0x3b2a20];
      const sh = bookshelf(sx, sz, ry, 4.4, 6, pal, { rows: 5 });
      T.clickable(sh.back, "shelf", cat);
      const nx = Math.sin(ry), nz = Math.cos(ry);
      const plate = T.sign(cat.title, sx + nx * 0.62, 6.75, sz + nz * 0.62, 4.2, 0.8, { bg: cat.color, fg: "#ffffff", border: "#3b2a20", ry, fontScale: 0.55 });
      T.clickable(plate, "shelf", cat);
      T.interact(`shelf-${cat.id}`, sx + nx * 2.4, sz + nz * 2.4, `Browse ${cat.title}`, "shelf", cat, 2.1);
    });
    // reading tables
    [X - 5.6, X + 5.6].forEach((tx) => {
      table(tx, Z + 0.4, 4.4, 2.4, 1.9, 0x8a5a36);
      [-1.2, 1.2].forEach((o) => { chair(tx + o, Z - 1.6, PI, 0x6b4426); chair(tx + o, Z + 2.4, 0, 0x6b4426); });
      T.cyl(tx + 1.3, 2.1, Z + 0.4, 0.06, 0.18, 0.4, 0xc9a227, { seg: 8 });
      T.cyl(tx + 1.3, 2.6, Z + 0.4, 0.3, 0.45, 0.4, 0x2f8f5b, { seg: 10, emissive: 0x2f8f5b, ei: 0.25 });
      T.box(tx - 0.8, 1.95, Z + 0.2, 1.1, 0.12, 0.8, 0xf4f1e6, { ry: 0.3 });
    });
    // directory desk
    const ddx = ix1 - 2.4, ddz = Z + D / 2 - 2.6;
    T.box(ddx, 0.95, ddz, 3.8, 1.9, 1.5, 0x8a5a36, { r: 0.1, solid: true });
    T.box(ddx, 1.95, ddz, 4, 0.12, 1.7, 0x6b4426);
    books(ddx - 0.8, 2.0, ddz, 1.2, 0, [0x3a86ff, 0xff5d8f, 0xffb703]);
    const dsign = T.sign("DIRECTORY", ddx, 2.6, ddz + 0.2, 2.2, 0.55, { bg: "#ffb703", fg: "#3b2a20", fontScale: 0.55 });
    T.clickable(dsign, "libraryIndex");
    T.interact("library-desk", ddx - 0.4, ddz - 1.8, "Library directory", "libraryIndex", null, 2.2);
    chalkboard(ix1 - 0.02, 4.1, Z + 1.4, -PI / 2, 4.6, 2.8, [
      { t: "today's reading", x: 0.06, y: 0.07, s: 0.14, b: 1, c: "#ffd27a" },
      { t: "Σ 1/n²  =  π²/6", x: 0.08, y: 0.33, s: 0.13 },
      { t: "P(A ∪ B) ≤ P(A) + P(B)", x: 0.08, y: 0.55, s: 0.11 },
      { t: "e^{iπ} + 1 = 0", x: 0.08, y: 0.76, s: 0.12 }
    ]);
    // globe
    T.cyl(ix0 + 1.6, 0.9, Z + D / 2 - 1.8, 0.12, 0.4, 1.8, 0x6b4426, { seg: 8 });
    T.place(T.geo.ico(0.75, 1), T.mat(0x4aa3df, { flat: true }), ix0 + 1.6, 2.4, Z + D / 2 - 1.8, {});
    T.solidCircle(ix0 + 1.6, Z + D / 2 - 1.8, 0.8);
    plantPot(X - 4, Z + D / 2 - 1.4, 0.8); plantPot(X + 4, Z + D / 2 - 1.4, 0.8);

    // grounds
    T.flowerBed(X - 9.5, fz + 2, 3.4, 1.4, { palette: [0xff6b81, 0xffffff, 0xffd23f] });
    T.flowerBed(X + 9.5, fz + 2, 3.4, 1.4, { palette: [0xb07cf0, 0xffffff, 0x6ec6ff] });
    T.tree(X + 15, Z + 2, 1.1); T.tree(X - 14.5, Z - 6, 0.95, "pine"); T.bush(X + 13.6, Z + 8.4); T.bush(X - 13.4, Z + 6);
    T.bench(X + 11.5, fz + 6.5, PI);
  }

  /* ===================================================================== */
  /*  Project Garage (SW)                                                   */
  /* ===================================================================== */
  function garage() {
    const X = -34, Z = 31, W = 24, D = 17, H = 8.4;
    const wall = 0x7b90a6, trim = 0x4a5868;
    const floorTex = T.canvasTexture(256, 256, (g, w, h) => { g.fillStyle = "#a3abb0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#959ea4"; g.lineWidth = 3; g.strokeRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 12, 12); } });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(6, 4);
    const b = shell({
      id: "garage", name: "Project Garage", labelBg: "#ffc93c", labelY: 5.5, x: X, z: Z, w: W, d: D, h: H, front: -1, wall, trim, floor: 0xffffff, floorMat: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }), base: 0x8e979c,
      frontOpenings: [{ c: X, w: 9, y0: 0, y1: 6 }, { c: X - 8.6, w: 2.4, y0: 4, y1: 6.2 }, { c: X + 8.6, w: 2.4, y0: 4, y1: 6.2 }],
      backOpenings: [{ c: X - 6, w: 2.6, y0: 6.6, y1: 7.8 }, { c: X, w: 2.6, y0: 6.6, y1: 7.8 }, { c: X + 6, w: 2.6, y0: 6.6, y1: 7.8 }],
      sideOpenings: [{ c: Z - 4, w: 2.4, y0: 4.6, y1: 6.4 }, { c: Z + 1, w: 2.4, y0: 4.6, y1: 6.4 }, { c: Z + 5.4, w: 2.4, y0: 4.6, y1: 6.4 }]
    });
    T.gableRoof(b.roof, X, H, Z, W, D, 2.8, 0x5a6672, wall, { ridges: 0x47515b, ridge: 0x3c454e, over: 0.9 });
    T.box(X + 7, H + 2.2, Z + 3, 2.4, 1.4, 2.4, 0x9aa6b0, { parent: b.roof, r: 0.1 });
    // hazard frame around the door
    const fz = Z - D / 2;
    const hazard = T.canvasTexture(64, 512, (g, w, h) => { g.fillStyle = "#ffc93c"; g.fillRect(0, 0, w, h); g.fillStyle = "#1d2433"; for (let y = -w; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + w); g.lineTo(w, y + w + 28); g.lineTo(0, y + 28); g.fill(); } });
    const hzMat = new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.8 });
    [-4.75, 4.75].forEach((o) => T.box(X + o, 3, fz - 0.15, 0.5, 6, 0.4, 0, { material: hzMat, parent: b.frontGroup }));
    T.box(X, 6.2, fz - 0.15, 10, 0.45, 0.4, 0xffc93c, { parent: b.frontGroup });
    T.sign("PROJECT GARAGE", X, 7.3, fz - 0.33, 8.2, 1.15, { bg: "#ffc93c", fg: "#1d2433", border: "#1d2433", ry: PI, parent: b.frontGroup });
    // roll-up door (raises as you approach)
    const doorTex = T.canvasTexture(256, 256, (g, w, h) => { g.fillStyle = "#d8dee3"; g.fillRect(0, 0, w, h); g.fillStyle = "#b5bec6"; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 6); });
    const roll = T.box(X, 3, fz - 0.05, 8.9, 6, 0.2, 0, { material: new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.6 }) });
    b.frontGroup.add(roll);
    T.doors.push({ x: X, z: fz, open: 0, range: 8, apply: (k) => { roll.scale.y = Math.max(0.06, 1 - k * 0.94); roll.position.y = 6 - (6 * roll.scale.y) / 2; } });
    finishFront(b);
    doorInteractions(b, "Enter Project Garage");

    // ---- interior ----
    const ix0 = X - W / 2 + 0.6, ix1 = X + W / 2 - 0.6, iz1 = Z + D / 2 - 0.6;
    [-2.6, 2.6].forEach((o) => T.box(X + o, 0.36, Z - 2, 0.25, 0.02, 11, 0xffc93c, { cast: false }));
    const projects = CONTENT.projects || [];
    const xs = [X + 8.4, X + 2.8, X - 2.8, X - 8.4]; // #1 on the left as you walk in
    projects.slice(0, 4).forEach((p, i) => {
      const sx = xs[i], sz = iz1 - 1.1;
      table(sx, sz, 4.4, 2, 2.0, 0x5c6870);
      const scr = monitor(sx, 3.55, sz + 0.2, PI, 3.2, 1.8, (g, w, h) => {
        g.fillStyle = "#1d2433"; g.fillRect(0, 0, w, h);
        g.fillStyle = p.color; g.fillRect(0, 0, w, h * 0.24);
        g.fillStyle = "#fff"; g.font = `700 ${h * 0.14}px ${T.FONT}`; g.textBaseline = "middle"; g.fillText(p.title, w * 0.05, h * 0.12, w * 0.9);
        g.fillStyle = "#aab4cc"; g.font = `600 ${h * 0.09}px ${T.FONT}`; g.fillText(p.tag, w * 0.05, h * 0.36, w * 0.9);
        p.stack.slice(0, 4).forEach((s, k) => { g.fillStyle = "#2e3a55"; T.roundRect(g, w * 0.05 + (k % 2) * w * 0.46, h * (0.5 + Math.floor(k / 2) * 0.2), w * 0.42, h * 0.15, 14); g.fill(); g.fillStyle = "#e9eef7"; g.font = `600 ${h * 0.08}px ${T.FONT}`; g.fillText(s, w * 0.08 + (k % 2) * w * 0.46, h * (0.575 + Math.floor(k / 2) * 0.2), w * 0.36); });
      });
      T.clickable(scr, "project", p);
      // tower + blinking LED
      T.box(sx + 1.6, 0.95, sz - 0.2, 0.8, 1.9, 1.5, 0x2b3440, { r: 0.06 });
      const led = T.box(sx + 1.6, 1.6, sz - 0.96, 0.18, 0.18, 0.04, 0x2fbf5b, { emissive: 0x2fbf5b, ei: 1, unique: true, material: new THREE.MeshStandardMaterial({ color: 0x2fbf5b, emissive: 0x2fbf5b }) });
      T.animated.push((t) => { led.material.emissiveIntensity = (Math.sin(t * 4 + i * 1.7) > 0.2) ? 1.2 : 0.1; });
      T.box(sx - 0.2, 2.06, sz - 0.4, 1.8, 0.08, 0.6, 0x3c4a55);
      const banner = T.sign(`${i + 1}. ${p.title}`, sx, 5.7, iz1 - 0.07, 4.2, 0.85, { bg: p.color, fg: "#ffffff", border: "#1d2433", ry: PI, fontScale: 0.45 });
      T.clickable(banner, "project", p);
      chair(sx, sz - 2.2, PI, 0x3c4a55);
      T.interact(`project-${i}`, sx - 1.6, sz - 2.8, `Inspect ${p.title}`, "project", p, 2.0);
    });
    // workbench with robot arm
    const wbx = X - 6.6, wbz = Z - 2.4;
    table(wbx, wbz, 5, 2.4, 2.0, 0x9c6b3c);
    T.box(wbx - 1.8, 2.3, wbz, 0.6, 0.5, 0.6, 0x3c4a55);
    const arm = new THREE.Group(); arm.position.set(wbx + 1, 2, wbz); T.world.add(arm);
    T.cyl(0, 0.2, 0, 0.5, 0.6, 0.4, 0xff8a3d, { seg: 12, parent: arm });
    const seg1 = new THREE.Group(); seg1.position.y = 0.4; arm.add(seg1);
    T.box(0, 0.8, 0, 0.35, 1.6, 0.35, 0xff8a3d, { parent: seg1, r: 0.1 });
    const seg2 = new THREE.Group(); seg2.position.y = 1.6; seg1.add(seg2);
    T.box(0.6, 0, 0, 1.2, 0.3, 0.3, 0xffb703, { parent: seg2, r: 0.1 });
    T.box(1.25, -0.2, 0, 0.2, 0.5, 0.4, 0x3c4a55, { parent: seg2 });
    T.animated.push((t) => { arm.rotation.y = Math.sin(t * 0.8) * 1.2; seg1.rotation.z = Math.sin(t * 1.3) * 0.35; seg2.rotation.z = -0.4 + Math.sin(t * 1.7) * 0.3; });
    // 3D printer
    const px = X + 7.6, pz = Z - 2.4;
    table(px, pz, 4, 2.4, 1.6, 0x5c6870);
    [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach(([a, c]) => T.box(px + a, 2.7, pz + c, 0.14, 2.2, 0.14, 0x2b3440));
    T.box(px, 3.8, pz, 3, 0.16, 2, 0x2b3440);
    const head = T.box(px, 3.3, pz, 0.5, 0.5, 0.5, 0x3a86ff, { r: 0.1 });
    const print = T.place(T.geo.ico(0.45, 0), T.mat(0x2fbf5b, { flat: true }), px, 2.05, pz, {});
    T.animated.push((t) => { head.position.x = px + Math.sin(t * 2.2) * 1.1; head.position.z = pz + Math.cos(t * 1.5) * 0.6; print.rotation.y = t * 0.5; });
    // tool wall + chest (west), shelving (east)
    T.panel(ix0 + 0.05, 3.6, Z + 0.5, 7, 3, (g, w, h) => {
      g.fillStyle = "#c8a26b"; g.fillRect(0, 0, w, h); g.fillStyle = "#a9844f";
      for (let x = 20; x < w; x += 40) for (let y = 20; y < h; y += 40) { g.beginPath(); g.arc(x, y, 5, 0, PI * 2); g.fill(); }
      const tool = (x, y, ww, hh, c) => { g.fillStyle = c; T.roundRect(g, x * w, y * h, ww * w, hh * h, 10); g.fill(); };
      tool(0.06, 0.15, 0.04, 0.6, "#3c4a55"); tool(0.03, 0.12, 0.1, 0.12, "#ff5d8f");
      tool(0.2, 0.2, 0.03, 0.55, "#8a97a3"); tool(0.18, 0.12, 0.07, 0.1, "#8a97a3");
      tool(0.32, 0.15, 0.12, 0.3, "#ffb703"); tool(0.36, 0.45, 0.04, 0.35, "#3c4a55");
      tool(0.52, 0.18, 0.04, 0.6, "#3a86ff"); tool(0.62, 0.18, 0.04, 0.6, "#2fbf5b"); tool(0.72, 0.18, 0.04, 0.6, "#ff8a3d");
      tool(0.82, 0.2, 0.12, 0.12, "#8a97a3"); tool(0.86, 0.32, 0.04, 0.45, "#8a97a3");
    }, { ry: PI / 2 });
    T.box(ix0 + 0.9, 1.3, Z - 5.4, 1.6, 2.6, 2.6, 0xd8463f, { r: 0.1, solid: true });
    [0.8, 1.5, 2.2].forEach((y) => T.box(ix0 + 1.72, y, Z - 5.4, 0.05, 0.1, 1.6, 0xdfe5e7));
    const shx = ix1 - 0.7;
    [0.2, 1.8, 3.4, 5].forEach((y) => T.box(shx, y, Z + 1, 1.2, 0.12, 6, 0x8e979c));
    [-2.95, 2.95].forEach((o) => T.box(shx, 2.6, Z + 1 + o, 1.2, 5.2, 0.12, 0x6c7880));
    [[0.65, -2], [0.65, 0.4], [2.25, -1], [2.25, 1.8], [3.85, -2.2], [3.85, 0.6]].forEach(([y, o], k) => T.box(shx, y + 0.45, Z + 1 + o, 1, 0.8, 1.6, [0x3a86ff, 0xffb703, 0x2fbf5b, 0xff5d8f][k % 4], { r: 0.08 }));
    T.solid(shx - 0.6, shx + 0.6, Z - 2, Z + 4);
    // project list whiteboard
    const wb = T.panel(ix1 - 0.05, 3.3, Z - 5.4, 3.6, 2.3, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9aa6b0"; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
      g.fillStyle = "#1d2433"; g.font = `700 ${h * 0.16}px ${T.FONT}`; g.fillText("PROJECTS", w * 0.07, h * 0.22);
      projects.slice(0, 4).forEach((p, i) => { g.fillStyle = p.color; g.fillRect(w * 0.07, h * (0.33 + i * 0.16), h * 0.08, h * 0.08); g.fillStyle = "#1d2433"; g.font = `600 ${h * 0.1}px ${T.FONT}`; g.fillText(p.title, w * 0.16, h * (0.41 + i * 0.16), w * 0.78); });
    }, { ry: -PI / 2 });
    T.clickable(wb, "projects");
    T.interact("garage-list", ix1 - 2.2, Z - 5.4, "Project list", "projects", null, 2.0);

    // outside
    T.crate(X - 13.6, 0, Z - 6.5, 1.6); T.crate(X - 13.6, 0, Z - 4.6, 1.4); T.crate(X - 13.6, 1.6, Z - 6.5, 1.2, 0.3);
    T.cyl(X + 13.3, 0.9, Z - 6, 0.7, 0.7, 1.8, 0x3a86ff, { seg: 12, solid: true }); T.cyl(X + 13.3, 1.82, Z - 6, 0.72, 0.72, 0.08, 0x2a5fb8, { seg: 12 });
    [-6.2, 6.2].forEach((o) => { T.place(T.geo.cone(0.4, 1.1, 10), T.mat(0xff8a3d), X + o, 0.55, fz - 2.2, {}); T.box(X + o, 0.05, fz - 2.2, 0.9, 0.1, 0.9, 0xff8a3d); });
    T.tree(X - 14.5, Z + 4, 1.05); T.tree(X + 14.5, Z + 8, 0.9, "pine"); T.bush(X - 13.5, Z + 9.5); T.bush(X + 13, Z + 2.5);
    T.lamp(X - 7.5, fz - 4.5); T.lamp(X + 7.5, fz - 4.5);
  }

  /* ===================================================================== */
  /*  Research Lab (SE)                                                     */
  /* ===================================================================== */
  function lab() {
    const X = 34, Z = 31, W = 24, D = 17, H = 8;
    const wall = 0xf3f7fa, trim = 0x7cc4e4;
    const floorTex = T.canvasTexture(256, 256, (g, w, h) => { g.fillStyle = "#eef2f5"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d7dfe5"; g.lineWidth = 4; g.strokeRect(0, 0, w, h); });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 6);
    const b = shell({
      id: "lab", name: "Research Lab", labelBg: "#cfe9ff", labelY: 4.5, x: X, z: Z, w: W, d: D, h: H, front: -1, wall, trim, floor: 0xffffff, floorMat: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }), inner: 0xdbe9f1, base: 0xc3ccd2,
      frontOpenings: [{ c: X, w: 4.6, y0: 0, y1: 6 }, { c: X - 7.4, w: 6.6, y0: 1, y1: 6.6 }, { c: X + 7.4, w: 6.6, y0: 1, y1: 6.6 }],
      sideOpenings: [{ c: Z - 3.5, w: 3.6, y0: 2.2, y1: 6 }, { c: Z + 3.5, w: 3.6, y0: 2.2, y1: 6 }]
    });
    // flat roof with parapet and rooftop details
    T.box(X, H + 0.25, Z, W + 0.8, 0.5, D + 0.8, 0xe3edf2, { parent: b.roof });
    [[0, D / 2 + 0.3, W + 0.8, 0.3], [0, -D / 2 - 0.3, W + 0.8, 0.3]].forEach(([dx, dz, w, d]) => T.box(X + dx, H + 0.8, Z + dz, w, 0.7, d, trim, { parent: b.roof }));
    [-W / 2 - 0.3, W / 2 + 0.3].forEach((dx) => T.box(X + dx, H + 0.8, Z, 0.3, 0.7, D + 0.8, trim, { parent: b.roof }));
    T.box(X + 6, H + 1.3, Z + 3, 3.6, 1.6, 2.6, 0xc3ccd2, { parent: b.roof, r: 0.1 });
    const dish = new THREE.Group(); dish.position.set(X - 6, H + 0.5, Z + 2); b.roof.add(dish);
    T.cyl(0, 0.8, 0, 0.15, 0.2, 1.6, 0x9aa6b0, { parent: dish });
    T.place(new THREE.SphereGeometry(1.6, 16, 8, 0, PI * 2, 0, PI / 3), T.mat(0xffffff, { rough: 0.4 }), 0, 1.8, 0, { parent: dish, rx: -0.7 });
    T.animated.push((t) => { dish.rotation.y = Math.sin(t * 0.3) * 0.8; });
    // facade
    const fz = Z - D / 2;
    T.box(X, 7.2, fz - 0.2, W + 0.2, 0.5, 0.3, trim, { parent: b.frontGroup });
    T.sign("RESEARCH LAB", X, 6.75, fz - 0.37, 6.6, 0.95, { bg: "#3a86ff", fg: "#ffffff", border: "#ffffff", ry: PI, parent: b.frontGroup });
    T.box(X, 0.2, fz - 1.6, 7, 0.4, 3, 0xdfe7ec, { r: 0.05 });
    T.solid(X - 3.5, X + 3.5, fz - 3.1, fz, 0.4);
    // sliding glass doors
    const glassMat = T.GLASS();
    const panes = [-1, 1].map((s) => { const p = T.place(T.geo.box(2.3, 5.8, 0.12), glassMat, X + s * 1.15, 2.95, fz - 0.05, { cast: false }); T.box(0, 0, 0, 2.3, 0.18, 0.18, trim, { parent: p }).position.y = -2.9; return p; });
    T.doors.push({ x: X, z: fz, open: 0, range: 6, apply: (k) => panes.forEach((p, i) => { p.position.x = X + (i ? 1 : -1) * (1.15 + k * 2.2); }) });
    finishFront(b);
    doorInteractions(b, "Enter Research Lab");

    // ---- interior ----
    const ix0 = X - W / 2 + 0.6, ix1 = X + W / 2 - 0.6, iz1 = Z + D / 2 - 0.6;
    chalkboard(X - 6, 4.6, iz1 - 0.02, PI, 7, 3.4, [
      { t: "H = (V, E),  |e| = k", x: 0.05, y: 0.08, s: 0.12, b: 1, c: "#ffd27a" },
      { t: "independent set  I ⊆ V:", x: 0.05, y: 0.32, s: 0.095 },
      { t: "no edge e ⊆ I", x: 0.09, y: 0.48, s: 0.095 },
      { t: "α(H)  = ?", x: 0.05, y: 0.7, s: 0.12 }
    ]);
    const hgBoard = T.panel(X + 6, 4.6, iz1 - 0.03, 7, 3.4, (g, w, h) => {
      g.fillStyle = "#2f5d4a"; g.fillRect(0, 0, w, h);
      drawHypergraph(g, w * 0.32, h * 0.52, h * 0.3, true);
      g.fillStyle = "#ffd27a"; g.font = `700 ${h * 0.11}px ${T.FONT}`; g.fillText("list colouring", w * 0.6, h * 0.3);
      g.fillStyle = "#f4f1e6"; g.font = `500 ${h * 0.1}px ${T.FONT}`; g.fillText("χ_ℓ(H) ≤ ?", w * 0.62, h * 0.5); g.fillText("Δ = max degree", w * 0.6, h * 0.7);
    }, { ry: PI });
    T.box(X + 6, 4.6, iz1 + 0.05, 7.35, 3.75, 0.14, 0x9c6b3c);
    hgBoard.position.z = iz1 - 0.06;
    // paper stations
    (CONTENT.papers || []).slice(0, 2).forEach((p, i) => {
      const sx = i ? X + 6 : X - 6, sz = iz1 - 3.2;
      table(sx, sz, 5, 2.2, 2.0, 0xdfe7ec);
      const scr = monitor(sx, 3.6, sz + 0.3, PI, 3.6, 1.9, (g, w, h) => {
        g.fillStyle = "#f7fbff"; g.fillRect(0, 0, w, h);
        g.fillStyle = i ? "#14b8a6" : "#3a86ff"; g.fillRect(0, 0, w, h * 0.22);
        g.fillStyle = "#fff"; g.font = `700 ${h * 0.12}px ${T.FONT}`; g.textBaseline = "middle"; g.fillText(`${p.venue} · ${p.year}`, w * 0.05, h * 0.11);
        g.fillStyle = "#1d2433"; g.font = `700 ${h * 0.1}px ${T.FONT}`;
        const words = p.title.split(" "); let line = "", y = h * 0.36;
        words.forEach((wd) => { const test = line ? line + " " + wd : wd; if (g.measureText(test).width > w * 0.9) { g.fillText(line, w * 0.05, y); line = wd; y += h * 0.14; } else line = test; });
        g.fillText(line, w * 0.05, y);
      });
      T.clickable(scr, "paper", p);
      chair(sx, sz - 2.2, PI, 0xffffff);
      T.interact(`paper-${i}`, sx + 2, sz - 2.6, "View Research", "paper", p, 2.2);
    });
    // hypergraph hologram table (puzzle)
    const hx = X, hz = Z + 0.6;
    T.cyl(hx, 0.8, hz, 2.2, 2.4, 1.6, 0xdfe7ec, { seg: 20, solid: true });
    T.cyl(hx, 1.63, hz, 2, 2, 0.06, 0x7cc4e4, { seg: 20, emissive: 0x3fa7d6, ei: 0.6, cast: false });
    const holo = new THREE.Group(); holo.position.set(hx, 3.4, hz); T.world.add(holo);
    const pts = [[-1.2, 0.2, -0.6], [0, 0.9, -1], [1.2, 0.1, -0.4], [-0.9, -0.5, 0.8], [0.4, -0.2, 0.9], [1.1, 0.7, 0.8]].map((p) => new THREE.Vector3(...p));
    pts.forEach((p, i) => T.place(T.geo.sphere(0.2, 10, 8), T.mat([0xff5d8f, 0x3a86ff, 0xffb703][i % 3], { emissive: [0xff5d8f, 0x3a86ff, 0xffb703][i % 3], ei: 0.6 }), p.x, p.y, p.z, { parent: holo, cast: false }));
    [[0, 1, 2, 0xff5d8f], [1, 3, 4, 0x3a86ff], [2, 4, 5, 0xffb703]].forEach(([a, b2, c, col]) => {
      const g = new THREE.BufferGeometry().setFromPoints([pts[a], pts[b2], pts[c]]); g.computeVertexNormals();
      holo.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
    });
    const beam = T.place(T.geo.cyl(1.9, 1.9, 3.2, 20), new THREE.MeshBasicMaterial({ color: 0x7cc4e4, transparent: true, opacity: 0.08, depthWrite: false }), hx, 3.3, hz, { cast: false, receive: false });
    T.animated.push((t) => { holo.rotation.y = t * 0.5; holo.position.y = 3.4 + Math.sin(t * 1.5) * 0.12; beam.material.opacity = 0.06 + Math.sin(t * 3) * 0.02; });
    T.interact("hypergraph", hx, hz - 3.1, "Try the hypergraph puzzle", "puzzle", null, 2.2);
    T.clickable(beam, "puzzle");
    // west lab bench with computers, east pedestals
    table(ix0 + 1, Z, 2, 9, 2.0, 0xdfe7ec);
    [-2.5, 2.5].forEach((o, k) => monitor(ix0 + 0.8, 3.4, Z + o, PI / 2, 2.4, 1.4, (g, w, h) => {
      g.fillStyle = "#1d2433"; g.fillRect(0, 0, w, h);
      if (k) { g.strokeStyle = "#2fbf5b"; g.lineWidth = 6; g.beginPath(); for (let x = 0; x < w; x += 8) g.lineTo(x, h * 0.55 - Math.sin(x * 0.03) * h * 0.25 * Math.exp(-x / w)); g.stroke(); }
      else { ["#ff5d8f", "#3a86ff", "#2fbf5b", "#ffb703", "#aab4cc"].forEach((c, i) => { g.fillStyle = c; g.fillRect(w * 0.08 + (i % 2) * 30, h * (0.15 + i * 0.15), w * (0.3 + ((i * 37) % 40) / 100), h * 0.07); }); }
    }));
    [[ix1 - 1.2, Z - 3.5, "ico"], [ix1 - 1.2, Z + 3.5, "knot"]].forEach(([x, z, kind]) => {
      T.cyl(x, 0.9, z, 0.7, 0.85, 1.8, 0xffffff, { seg: 10, solid: true });
      const m = kind === "ico"
        ? T.place(T.geo.ico(0.9, 0), T.mat(0x8a5cf6, { flat: true, emissive: 0x3d1f8a, ei: 0.3 }), x, 3, z, {})
        : T.place(new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8), T.mat(0x14b8a6, { emissive: 0x0a5c53, ei: 0.3 }), x, 3, z, {});
      T.animated.push((t) => { m.rotation.y = t * 0.7; m.rotation.x = t * 0.4; m.position.y = 3 + Math.sin(t * 1.4 + x) * 0.15; });
    });
    plantPot(ix1 - 1, iz1 - 1, 0.8);

    // outside: hypergraph sculpture on the lawn
    const sx = X + 15.5, sz = Z - 12.5;
    T.cyl(sx, 0.3, sz, 1.6, 1.8, 0.6, 0xdfe7ec, { seg: 12, solid: true });
    const sculpt = new THREE.Group(); sculpt.position.set(sx, 3, sz); T.world.add(sculpt);
    const sp = [[-1, 0, 0], [1, 0.4, 0], [0, 1.6, 0.4], [0, -0.6, 1]].map((p) => new THREE.Vector3(...p));
    sp.forEach((p, i) => T.place(T.geo.sphere(0.35, 12, 8), T.mat([0x3a86ff, 0xff5d8f, 0xffb703, 0x2fbf5b][i]), p.x, p.y, p.z, { parent: sculpt }));
    [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3]].forEach(([a, c]) => {
      const d = sp[c].clone().sub(sp[a]), mid = sp[a].clone().add(sp[c]).multiplyScalar(0.5);
      const m = T.place(T.geo.cyl(0.08, 0.08, d.length(), 6), T.mat(0x9aa6b0), mid.x, mid.y, mid.z, { parent: sculpt });
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    });
    T.cyl(sx, 1.6, sz, 0.12, 0.12, 2.2, 0x9aa6b0, { seg: 6 });
    T.animated.push((t) => { sculpt.rotation.y = t * 0.3; });
    T.flowerBed(X - 9.5, fz - 2.2, 3.6, 1.4, { palette: [0x6ec6ff, 0xffffff, 0xb07cf0] }); T.flowerBed(X + 9.5, fz - 2.2, 3.6, 1.4, { palette: [0x6ec6ff, 0xffffff, 0xffd23f] });
    T.tree(X + 14.5, Z + 6, 1); T.tree(X - 14.5, Z + 7, 0.9, "pine"); T.bush(X - 13.6, Z - 2);
    T.lamp(X - 4.4, fz - 4.2); T.lamp(X + 4.4, fz - 4.2);
  }

  /* ===================================================================== */
  /*  Paths, edges, extras                                                  */
  /* ===================================================================== */
  function paths() {
    T.path([[-8.4, -8.4], [-16, -13.4], [-27, -13.4], [-34, -14.3], [-34, -18.6]]);
    T.path([[8.4, -8.4], [16, -13.4], [27, -14], [34, -15.2], [34, -18.9]]);
    T.path([[-8.4, 8.4], [-16, 13.4], [-27, 14], [-34, 15.4], [-34, 19.6]]);
    T.path([[8.4, 8.4], [16, 13.4], [27, 14], [34, 15.4], [34, 18.6]]);
    T.path([[-12.4, 0], [-22, 1.2], [-31, 0.2], [-40.5, -0.3]], 3);
    T.path([[12.4, 0], [22, -1.2], [32, 0], [41, 0.8]], 3);
    T.path([[0, 12.4], [0, 18], [0, 23.5]], 3.2);
  }
  /* Walking routes Nhi uses to guide visitors (from her plaza spot to each door, along the paths). */
  T.npcRoutes = {
    house: [[-2, -6.4], [-8.4, -8.4], [-16, -13.4], [-27, -13.4], [-34, -14.3]],
    library: [[8.4, -8.4], [16, -13.4], [27, -14], [34, -15.2]],
    garage: [[-2, -6.4], [-7.2, -3.5], [-7.2, 3.5], [-8.4, 8.4], [-16, 13.4], [-27, 14], [-34, 15.4]],
    lab: [[7.2, -3.5], [7.2, 3.5], [8.4, 8.4], [16, 13.4], [27, 14], [34, 15.4]]
  };
  function lookout() {
    // stepping-stone obby to a secret lookout (west)
    const stones = [[-43.4, 0, 0.9], [-46.2, 1.7, 1.8], [-49, 0.3, 2.7], [-51.8, -1.4, 3.6]];
    const cols = [0xff8fa8, 0xffd27a, 0x8fd3ff, 0xb9a3ff];
    stones.forEach(([x, z, top], i) => { T.box(x, top / 2, z, 2.2, top, 2.2, cols[i], { r: 0.18 }); T.solid(x - 1.1, x + 1.1, z - 1.1, z + 1.1, top); });
    const px = -55.6, pz = 0, top = 4.5;
    T.box(px, top / 2, pz, 4.4, top, 4.4, 0xc9b79c, { r: 0.2 }); T.solid(px - 2.2, px + 2.2, pz - 2.2, pz + 2.2, top);
    T.box(px, top + 0.75, pz - 1.2, 1.6, 1.1, 1.1, 0x9c6b3c, { r: 0.1 }); T.box(px, top + 1.35, pz - 1.2, 1.65, 0.35, 1.15, 0xffb703, { r: 0.08 });
    T.label("SECRET LOOKOUT", px, top + 3.6, pz, { size: 1.1, bg: "#fff6dc", fg: "#7a4a2c", border: "#7a4a2c" });
    T.sign("jump! ↗", -41.2, 1.8, 2.6, 2.4, 0.8, { bg: "#fff6dc", ry: -PI / 2 });
    T.box(-41.2, 0.7, 2.6, 0.2, 1.4, 0.2, 0x7a4a2c);
    T.interact("secret", px, pz, "Open the lookout chest", "secret", null, 2.4);
    T.interactions[T.interactions.length - 1].minY = top - 0.4;
    T.tree(-50, -9, 1.1); T.tree(-49, 10, 0.95, "pine"); T.flowers(-47, 6, 5, 3, 16); T.flowers(-46, -6, 5, 3, 16);
    T.regions.push({ name: "Secret Lookout", x: -50, z: 0, r: 9 });
  }
  function pond() {
    const cx = 50, cz = 1.5;
    T.cyl(cx, 0.06, cz, 5.6, 5.6, 0.12, 0x4fb8e8, { seg: 28, rough: 0.15, emissive: 0x1f6f9b, ei: 0.2, cast: false });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 2; T.rock(cx + Math.cos(a) * 6, cz + Math.sin(a) * 6, 0.7 + T.rand() * 0.4); }
    T.solidCircle(cx, cz, 6.2);
    [[-2, 1], [1.8, -1.6], [0.5, 2.5]].forEach(([dx, dz]) => T.cyl(cx + dx, 0.14, cz + dz, 0.6, 0.6, 0.04, 0x4caf50, { seg: 10, cast: false }));
    const duck = new THREE.Group(); T.world.add(duck);
    T.box(0, 0.35, 0, 0.9, 0.5, 0.6, 0xffd23f, { parent: duck, r: 0.2 }); T.box(0.4, 0.75, 0, 0.42, 0.42, 0.42, 0xffd23f, { parent: duck, r: 0.15 }); T.box(0.68, 0.7, 0, 0.2, 0.1, 0.2, 0xff8a3d, { parent: duck });
    T.animated.push((t) => { const a = t * 0.25; duck.position.set(cx + Math.cos(a) * 3.2, Math.sin(t * 3) * 0.04, cz + Math.sin(a) * 3.2); duck.rotation.y = -a - PI / 2; });
    T.bench(cx - 8.6, cz - 4, Math.atan2(-8.6, -4) + PI);
    T.flowerBed(44, -8, 3, 1.6); T.flowerBed(44, 11, 3, 1.6, { palette: [0xb07cf0, 0xffffff, 0x6ec6ff] });
    T.tree(56, -9, 1.05); T.tree(57, 11, 0.95, "pine");
    T.regions.push({ name: "Duck Pond", x: cx, z: cz, r: 9 });
  }
  function northPark() {
    T.tree(0, -27, 1.5, "round");
    T.flowerBed(-5, -18.5, 3, 1.4); T.flowerBed(5, -18.5, 3, 1.4, { palette: [0xffd23f, 0xff9f43, 0xffffff] });
    table(-6.5, -32, 3.4, 2, 1.6, 0xc07a45); table(7, -33, 3.4, 2, 1.6, 0xc07a45);
    T.tree(-10, -40, 1); T.tree(11, -42, 1.1, "pine"); T.bush(-3, -36); T.bush(4, -38);
  }
  function welcome() {
    const z = 27.5;
    [-5.2, 5.2].forEach((x) => T.cyl(x, 2.6, z, 0.3, 0.35, 5.2, 0x8a5a36, { seg: 8, solid: true }));
    // big signs also stop the camera so it never ends up inside them
    T.camBlockers = (T.camBlockers || []).concat(
      T.sign("NHI'S UNIVERSE", 0, 5.6, z, 11, 2.2, { bg: "#ffb703", fg: "#17202b", border: "#17202b", ry: PI, fontScale: 0.55 }),
      T.sign("NHI'S UNIVERSE", 0, 5.6, z + 0.02, 11, 2.2, { bg: "#ffb703", fg: "#17202b", border: "#17202b", fontScale: 0.55 }));
    T.flowerBed(-7.5, z, 2.4, 2.4); T.flowerBed(7.5, z, 2.4, 2.4);
    T.tree(-9, 36, 1.1); T.tree(9, 38, 1, "pine"); T.tree(0, 44, 1.2);
  }
  function free(x, z, pad = 2) {
    if (Math.hypot(x, z) < 15) return false;
    if (T.buildings.some((b) => x > b.x - b.w / 2 - pad && x < b.x + b.w / 2 + pad && z > b.z - b.d / 2 - pad - 5 && z < b.z + b.d / 2 + pad + 5)) return false;
    if (Math.hypot(x - 50, z - 1.5) < 9 || Math.hypot(x + 50, z) < 9) return false;
    if (x > -49 && x < -19 && z > -50 && z < -38) return false;   // Nhi's backyard
    return true;
  }
  function edges() {
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * PI * 2 + T.rand() * 0.05, r = 61 + T.rand() * 9;
      T.tree(Math.cos(a) * r, Math.sin(a) * r, 0.9 + T.rand() * 0.5);
    }
    const fill = [[-50, -44], [-22, -48], [-12, -52], [18, -50], [50, -44], [-52, 44], [-20, 50], [20, 52], [52, 44], [-56, -20], [-56, 22], [57, -24], [58, 24], [-30, -50], [33, -51], [-33, 50], [34, 50]];
    fill.forEach(([x, z], i) => T.tree(x, z, 0.9 + (i % 3) * 0.15));
    for (let i = 0; i < 60; i++) { const a = T.rand() * PI * 2, r = 44 + T.rand() * 14; if (free(Math.cos(a) * r, Math.sin(a) * r)) T.bush(Math.cos(a) * r, Math.sin(a) * r, 0.8 + T.rand() * 0.4); }
    for (let i = 0; i < 24; i++) { const a = T.rand() * PI * 2, r = 48 + T.rand() * 11; if (free(Math.cos(a) * r, Math.sin(a) * r)) T.rock(Math.cos(a) * r, Math.sin(a) * r, 0.6 + T.rand() * 0.6); }
    T.grassTufts(0, 0, 58, 700, free);
  }
  function coins() {
    [[-14, -11.5], [14, -11.5], [-14, 11.5], [14, 11.5], [-25, -13.4], [25, -14], [-25, 14], [25, 14], [-28, 0.8], [28, -0.4],
      [0, 20], [0, -17], [50, -8], [-46, -9]].forEach(([x, z]) => T.coins.push({ x, y: 1.2, z }));
    T.coins.push({ x: -55.6, y: 5.8, z: 1.2 });
  }

  T.buildWorld = function () {
    ground(); clouds();
    plaza(); house(); library(); garage(); lab();
    paths(); lookout(); pond(); northPark(); welcome(); edges(); coins();
    T.flushBatches();
  };
})();
