/* Nhi's Universe — game loop, player, camera, input, panels and badges.
   World geometry lives in kit.js + world.js; portfolio text lives in ../js/content.js. */
(function () {
  "use strict";
  const T = window.Town;
  const $ = (id) => document.getElementById(id);
  const DEBUG = /[?&]debug\b/.test(location.search);
  const canvas = $("game");
  const isTouch = matchMedia("(pointer: coarse)").matches;
  if (isTouch) document.body.classList.add("is-touch");

  /* ---------------- renderer, scene, lighting ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcdeeff, 95, 260);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
  T.world = new THREE.Group();
  scene.add(T.world);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3d97f5) }, horizon: { value: new THREE.Color(0xc4ebff) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0); }"
  }));
  scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }));
  scene.add(sunDisc);

  scene.add(new THREE.HemisphereLight(0xe2f4ff, 0x6f9a4c, 0.72));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const sun = new THREE.DirectionalLight(0xfff0d2, 1.0);
  const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.45).normalize();
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  /* ---------------- save data ---------------- */
  const BADGES = [
    { id: "welcome", icon: "★", color: "#ffb703", name: "New in Town", desc: "Entered Nhi's Universe." },
    { id: "explorer", icon: "⌖", color: "#3a86ff", name: "Town Explorer", desc: "Visited all four buildings." },
    { id: "paper", icon: "◈", color: "#14b8a6", name: "Paper Trail", desc: "Read about a research paper." },
    { id: "github", icon: "</>", color: "#1d2433", name: "Source Seeker", desc: "Opened a project repository." },
    { id: "cat", icon: "=^", color: "#ff8a3d", name: "Cat Person", desc: "Met the resident cat." },
    { id: "npc", icon: "☺", color: "#8a5cf6", name: "Good Neighbor", desc: "Talked with Nhi." },
    { id: "puzzle", icon: "⬡", color: "#ff5d8f", name: "Hypergraph Hero", desc: "Solved the lab puzzle." },
    { id: "obby", icon: "▲", color: "#2fbf5b", name: "Shortcut Finder", desc: "Reached the secret lookout." },
    { id: "coins", icon: "$", color: "#e0a100", name: "Coin Collector", desc: "Collected ten NhiCoins." }
  ];
  const defaultState = { coins: 0, xp: 0, badges: [], rewarded: [], visited: [], puzzle: false };
  const S = loadState();
  function loadState() {
    try { return Object.assign({}, defaultState, JSON.parse(localStorage.getItem("nhi-town-save") || "{}")); }
    catch (_) { return Object.assign({}, defaultState); }
  }
  function saveState() { try { localStorage.setItem("nhi-town-save", JSON.stringify(S)); } catch (_) {} }

  /* ---------------- avatar (classic blocky R6 build) ---------------- */
  const headGeo = (() => {
    const R = 0.62, H = 1.16, rc = 0.2, pts = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(R - rc + Math.cos(a) * rc, rc + Math.sin(a) * rc)); }
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(R - rc + Math.cos(a) * rc, H - rc + Math.sin(a) * rc)); }
    pts.push(new THREE.Vector2(0, H));
    return new THREE.LatheGeometry(pts, 28);
  })();
  const classicFace = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const x = cv.getContext("2d"); x.fillStyle = "#111"; x.strokeStyle = "#111";
    [100, 156].forEach((ex) => { x.beginPath(); x.ellipse(ex, 104, 11, 22, 0, 0, Math.PI * 2); x.fill(); });
    x.lineWidth = 9; x.lineCap = "round"; x.beginPath(); x.arc(128, 128, 48, 0.22 * Math.PI, 0.78 * Math.PI); x.stroke();
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
  })();
  const faceTex = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const x = cv.getContext("2d");
    // eyes
    x.fillStyle = "#16100e";
    [[98, -0.12], [158, 0.12]].forEach(([ex, rot]) => { x.beginPath(); x.ellipse(ex, 100, 12, 21, rot, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = "#fff"; [[102, 92], [162, 92]].forEach(([ex, ey]) => { x.beginPath(); x.arc(ex, ey, 4, 0, Math.PI * 2); x.fill(); });
    // brows
    x.strokeStyle = "#2a1a14"; x.lineWidth = 5; x.lineCap = "round";
    [[84, 66, 108, 62], [148, 62, 172, 66]].forEach(([a1, b1, a2, b2]) => { x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke(); });
    // open "D" smile with tongue
    x.save(); x.beginPath(); x.moveTo(98, 140); x.quadraticCurveTo(128, 146, 160, 138); x.quadraticCurveTo(156, 186, 126, 188); x.quadraticCurveTo(100, 184, 98, 140); x.closePath();
    x.fillStyle = "#3b1418"; x.fill(); x.clip();
    x.fillStyle = "#ff7d8e"; x.beginPath(); x.ellipse(130, 190, 26, 18, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#fff"; x.fillRect(96, 136, 66, 9); x.restore();
    x.fillStyle = "rgba(255,110,120,0.28)"; [70, 186].forEach((cx) => { x.beginPath(); x.ellipse(cx, 142, 15, 8, 0, 0, Math.PI * 2); x.fill(); });
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
  })();
  const faceGeo = new THREE.CylinderGeometry(0.627, 0.627, 0.9, 16, 1, true, -0.95, 1.9);
  function makeAvatar(c, name, o = {}) {
    const g = new THREE.Group();
    const plastic = (col) => T.mat(col, { rough: 0.5 });
    const P = (parent, x, y, z, w, h, d, color, r = 0.08) => T.box(x, y, z, w, h, d, color, { parent, r, material: plastic(color) });
    const ball = (parent, x, y, z, r, col, scale, rz) => { const m = T.place(T.geo.sphere(r, 16, 12), plastic(col), x, y, z, { parent, scale }); if (rz) m.rotation.z = rz; return m; };
    const limb = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); return p; };
    const head = new THREE.Group(); head.position.set(0, 3.8, 0); g.add(head);
    const addHead = (tex) => {
      T.place(headGeo, plastic(c.skin), 0, 0.02, 0, { parent: head });
      const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
      face.position.y = 0.6; head.add(face);
    };
    const finish = (legL, legR, armL, armR) => {
      if (name) T.label(name, 0, 6.1, 0, { parent: g, size: o.tagSize || 0.72, bg: "rgba(23,32,43,0.78)", fg: "#ffffff", border: "rgba(255,255,255,0.85)" });
      if (o.scale) g.scale.setScalar(o.scale);
      return { group: g, legL, legR, armL, armR, head };
    };
    if (o.classic) {
      // classic blocky R6 Roblox character
      P(g, 0, 2.85, 0, 1.9, 1.9, 0.95, c.shirt, 0.05);
      const legL = limb(-0.475, 1.9), legR = limb(0.475, 1.9), armL = limb(-1.425, 3.6), armR = limb(1.425, 3.6);
      [legL, legR].forEach((l) => P(l, 0, -0.95, 0, 0.94, 1.9, 0.94, c.pants, 0.05));
      [armL, armR].forEach((a) => P(a, 0, -0.75, 0, 0.92, 1.9, 0.92, c.skin, 0.05));
      addHead(classicFace);
      return finish(legL, legR, armL, armR);
    }
    // Nhi: R15-style body in a pink hoodie, shorts, long black hair
    const HD = c.hoodie, HT = c.hoodieTrim;
    P(g, 0, 2.95, 0, 1.68, 1.7, 0.86, HD, 0.14);
    P(g, 0, 2.12, 0, 1.72, 0.18, 0.9, HT, 0.06);
    P(g, 0, 3.72, -0.42, 1.3, 0.42, 0.42, HT, 0.18);
    P(g, 0, 2.5, 0.43, 1.0, 0.42, 0.06, HT, 0.03);
    [-0.2, 0.2].forEach((x) => P(g, x, 3.35, 0.45, 0.06, 0.5, 0.04, 0xffffff, 0.02));
    P(g, 0, 1.98, 0, 1.6, 0.36, 0.84, c.pants, 0.08);
    const legL = limb(-0.42, 1.95), legR = limb(0.42, 1.95), armL = limb(-1.1, 3.62), armR = limb(1.1, 3.62);
    [legL, legR].forEach((l) => {
      P(l, 0, -0.22, 0, 0.84, 0.56, 0.84, c.pants, 0.08);
      P(l, 0, -0.72, 0, 0.74, 0.62, 0.74, c.skin, 0.1);
      P(l, 0, -1.36, 0, 0.72, 0.68, 0.72, c.skin, 0.1);
      P(l, 0, -1.8, 0.04, 0.76, 0.3, 0.84, 0xffffff, 0.1);
    });
    [armL, armR].forEach((a) => {
      P(a, 0, -0.38, 0, 0.6, 0.86, 0.62, HD, 0.12);
      P(a, 0, -1.12, 0, 0.56, 0.72, 0.58, HD, 0.12);
      P(a, 0, -1.47, 0, 0.58, 0.14, 0.6, HT, 0.05);
      P(a, 0, -1.74, 0.02, 0.48, 0.38, 0.48, c.skin, 0.16);
    });
    addHead(faceTex);
    // long wavy hair: cap, side-swept bangs, back mass and strands over the shoulders
    const H = c.hair;
    ball(head, 0, 0.92, -0.04, 0.7, H, [1.02, 0.66, 1.04]);
    ball(head, 0.14, 1.02, 0.4, 0.42, H, [1.45, 0.55, 0.62], -0.32);
    ball(head, -0.4, 0.98, 0.42, 0.26, H, [1, 0.7, 0.7], 0.5);
    ball(head, 0, 0.3, -0.42, 0.72, H, [1.08, 1.5, 0.58]);
    [[-0.38, -0.55], [0.38, -0.6], [0, -0.75]].forEach(([x, y]) => ball(head, x, y, -0.46, 0.4, H, [1, 1.45, 0.6]));
    [-1, 1].forEach((sx) => {
      ball(head, sx * 0.6, 0.48, 0.02, 0.3, H, [0.8, 1.6, 0.95]);
      ball(head, sx * 0.62, -0.35, -0.3, 0.32, H, [0.8, 1.9, 0.7], sx * 0.1);
      ball(head, sx * 0.5, -0.05, 0.4, 0.24, H, [0.75, 2.1, 0.45], -sx * 0.12);
    });
    return finish(legL, legR, armL, armR);
  }
  const AV = CONTENT.avatar;
  const player = makeAvatar(CONTENT.playerAvatar, "You", { classic: true });
  scene.add(player.group);
  const P = { pos: new THREE.Vector3(0, 0.32, 8.6), vy: 0, grounded: true, yaw: Math.PI, phase: 0, moving: false, auto: null };
  const R = 0.7, STEP = 0.72, SPEED = 12.5, JUMP_V = 9.6, GRAVITY = 26, BOUND = 59.5;

  /* ---------------- state ---------------- */
  let lastInside = null, playing = false, panelOpen = false, soundOn = true, active = null, insideB = null, playStart = 0;
  let camYaw = 0, camPitch = 0.42, camDist = 20;
  const eff = { yaw: 0, pitch: 0.6, dist: 90 };
  const camTarget = new THREE.Vector3(0, 4, 0);
  const keys = {};
  let toastTimer, badgeTimer, audioCtx;
  const clock = new THREE.Clock();

  /* ---------------- physics ---------------- */
  function blockedAt(x, z, feet) {
    if (Math.hypot(x, z) > BOUND) return true;
    for (const c of T.colliders) {
      if (c.top <= feet + STEP) continue;
      if (x + R > c.minX && x - R < c.maxX && z + R > c.minZ && z - R < c.maxZ) return true;
    }
    for (const c of T.circles) {
      if (c.top <= feet + STEP) continue;
      if (Math.hypot(x - c.x, z - c.z) < R + c.r) return true;
    }
    return false;
  }
  function groundAt(x, z, feet) {
    let g = 0; const r = R * 0.55;
    for (const c of T.colliders) {
      if (c.top > feet + STEP || c.top <= g) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) g = c.top;
    }
    for (const c of T.circles) {
      if (c.top > feet + STEP || c.top <= g) continue;
      if (Math.hypot(x - c.x, z - c.z) < c.r + r * 0.5) g = c.top;
    }
    return g;
  }
  const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

  function updatePlayer(dt) {
    let ix = 0, iz = 0;
    if (playing && !panelOpen) {
      ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
      iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
      // arrow keys turn and tilt the camera
      camYaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.4 * dt;
      camPitch = Math.max(0.1, Math.min(1.25, camPitch + ((keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0)) * 1.2 * dt));
      if (joy.x || joy.y) { ix = joy.x; iz = -joy.y; }
    }
    let dx = 0, dz = 0;
    if (P.auto) {
      const tx = P.auto.x - P.pos.x, tz = P.auto.z - P.pos.z, d = Math.hypot(tx, tz);
      if (d < 0.35 || clock.elapsedTime > P.auto.until || ix || iz) P.auto = null;
      else { dx = (tx / d) * SPEED * 0.8 * dt; dz = (tz / d) * SPEED * 0.8 * dt; }
    }
    if (!P.auto) {
      const len = Math.hypot(ix, iz);
      if (len > 0.05) {
        const k = Math.min(1, len); ix /= len; iz /= len;
        const fX = -Math.sin(camYaw), fZ = -Math.cos(camYaw), rX = Math.cos(camYaw), rZ = -Math.sin(camYaw);
        dx = (rX * ix + fX * iz) * SPEED * k * dt; dz = (rZ * ix + fZ * iz) * SPEED * k * dt;
      }
    }
    P.moving = Math.hypot(dx, dz) > 0.001;
    if (P.moving) {
      const feet = P.pos.y;
      if (!blockedAt(P.pos.x + dx, P.pos.z, feet)) P.pos.x += dx;
      if (!blockedAt(P.pos.x, P.pos.z + dz, feet)) P.pos.z += dz;
      P.yaw = lerpAngle(P.yaw, Math.atan2(dx, dz), Math.min(1, dt * 14));
    }
    // vertical
    const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.grounded && P.pos.y < g + 0.01) P.pos.y = g;           // step up
    P.vy -= GRAVITY * dt;
    P.pos.y += P.vy * dt;
    if (P.pos.y <= g) { P.pos.y = g; P.vy = 0; P.grounded = true; }
    else if (P.pos.y > g + 0.05) P.grounded = false;
    // pose
    const av = player;
    av.group.position.copy(P.pos);
    av.group.rotation.y = P.yaw;
    if (!P.grounded) {
      av.armL.rotation.x = av.armR.rotation.x = THREE.MathUtils.lerp(av.armL.rotation.x, -2.6, Math.min(1, dt * 12));
      av.legL.rotation.x = THREE.MathUtils.lerp(av.legL.rotation.x, -0.5, dt * 10); av.legR.rotation.x = THREE.MathUtils.lerp(av.legR.rotation.x, 0.3, dt * 10);
    } else if (P.moving) {
      P.phase += dt * 11;
      const s = Math.sin(P.phase);
      av.legL.rotation.x = s * 0.75; av.legR.rotation.x = -s * 0.75; av.armL.rotation.x = -s * 0.65; av.armR.rotation.x = s * 0.65;
    } else {
      ["legL", "legR", "armL", "armR"].forEach((k) => { av[k].rotation.x *= Math.max(0, 1 - dt * 10); });
      av.head.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.12;
    }
  }
  function jump() {
    if (!playing || panelOpen || !P.grounded) return;
    P.vy = JUMP_V; P.grounded = false; beep(330, 0.05);
  }

  /* ---------------- camera ---------------- */
  const camPos = new THREE.Vector3(60, 50, 60);
  const tmpV = new THREE.Vector3();
  const camRay = new THREE.Raycaster(), camBox = new THREE.Box3(), boxHit = new THREE.Vector3();
  const probeDir = new THREE.Vector3();
  function buildingInWay(target, yaw, pitch, dist) {
    probeDir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    camRay.set(target, probeDir);
    return T.buildings.some((b) => {
      camBox.min.set(b.x - b.w / 2 - 0.4, 0, b.z - b.d / 2 - 0.4); camBox.max.set(b.x + b.w / 2 + 0.4, b.h + 0.4, b.z + b.d / 2 + 0.4);
      return camRay.ray.intersectBox(camBox, boxHit) && boxHit.distanceTo(target) < dist;
    });
  }
  let labels = [];
  function updateCamera(dt, t) {
    let target, yaw, pitch, dist;
    if (!playing) {
      target = new THREE.Vector3(0, 3, 0); yaw = t * 0.06 - 0.6; pitch = 0.56; dist = 88;
    } else {
      target = new THREE.Vector3(P.pos.x, P.pos.y + 3, P.pos.z);
      yaw = camYaw; pitch = camPitch; dist = camDist;
      if (insideB) dist = Math.min(dist, 17);
      // if a building would hide you, lift the camera up over its roof instead of squeezing in
      else while (pitch < 1.4 && buildingInWay(target, yaw, pitch, dist)) pitch += 0.06;
    }
    const slow = playing && t - playStart < 1.6;
    const k = 1 - Math.pow(slow ? 0.12 : 0.0008, dt);
    camTarget.lerp(target, playing ? 1 - Math.pow(0.00002, dt) : k);
    eff.yaw = lerpAngle(eff.yaw, yaw, playing ? 1 - Math.pow(0.0005, dt) : 1);
    eff.pitch += (pitch - eff.pitch) * (1 - Math.pow(0.01, dt));
    eff.dist += (dist - eff.dist) * (1 - Math.pow(slow ? 0.2 : 0.01, dt));
    const desired = new THREE.Vector3(
      camTarget.x + Math.sin(eff.yaw) * Math.cos(eff.pitch) * eff.dist,
      camTarget.y + Math.sin(eff.pitch) * eff.dist,
      camTarget.z + Math.cos(eff.yaw) * Math.cos(eff.pitch) * eff.dist);
    desired.y = Math.max(desired.y, 1.2);
    if (playing && T.camBlockers) {
      tmpV.subVectors(desired, camTarget); const len = tmpV.length(); tmpV.divideScalar(len);
      camRay.set(camTarget, tmpV); camRay.far = len;
      const hit = camRay.intersectObjects(T.camBlockers, false)[0];
      let near = hit ? hit.distance - 0.6 : len;
      // don't let the camera sink into a building you're standing outside of
      T.buildings.forEach((b) => {
        if (b === insideB) return;
        camBox.min.set(b.x - b.w / 2 - 0.4, 0, b.z - b.d / 2 - 0.4); camBox.max.set(b.x + b.w / 2 + 0.4, b.h + 0.4, b.z + b.d / 2 + 0.4);
        if (camRay.ray.intersectBox(camBox, boxHit)) near = Math.min(near, boxHit.distanceTo(camTarget) - 0.5);
      });
      // inside a building: keep the camera within the room unless it's high enough to look over the walls
      if (insideB) {
        const b = insideB, pad = 0.6;
        const tx = tmpV.x > 1e-4 ? (b.maxX - pad - camTarget.x) / tmpV.x : tmpV.x < -1e-4 ? (b.minX + pad - camTarget.x) / tmpV.x : Infinity;
        const tz = tmpV.z > 1e-4 ? (b.maxZ - pad - camTarget.z) / tmpV.z : tmpV.z < -1e-4 ? (b.minZ + pad - camTarget.z) / tmpV.z : Infinity;
        const tExit = Math.min(tx, tz);
        if (tExit < len && camTarget.y + tmpV.y * tExit < b.h + 0.6) near = Math.min(near, tExit);
      }
      if (near < len) desired.copy(camTarget).addScaledVector(tmpV, Math.max(insideB ? 0.8 : 2, near));
    }
    camPos.lerp(desired, slow ? k : 1);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    sky.position.copy(camera.position);
    // hide floating labels that the camera is about to pass through
    labels.forEach((l) => {
      l.getWorldPosition(tmpV);
      const near = tmpV.distanceTo(camera.position) < 7;
      if (near && l.visible) { l.visible = false; l.userData.hidNear = true; }
      else if (!near && l.userData.hidNear) { l.visible = true; l.userData.hidNear = false; }
    });
    sunDisc.position.copy(camera.position).addScaledVector(SUN_DIR, 420); sunDisc.lookAt(camera.position);
    // keep the shadow box around the player
    const focus = playing ? P.pos : new THREE.Vector3(0, 0, 0);
    sun.position.copy(focus).addScaledVector(SUN_DIR, 110);
    sun.target.position.copy(focus);
    Object.assign(sun.shadow.camera, playing ? { left: -45, right: 45, top: 45, bottom: -45 } : { left: -75, right: 75, top: 75, bottom: -75 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  /* ---------------- world updates ---------------- */
  const coinMeshes = [];
  function buildCoins() {
    const gold = T.mat(0xffcf34, { rough: 0.35, metal: 0.3, emissive: 0x8a5a00, ei: 0.25 });
    T.coins.forEach((c) => {
      const g = new THREE.Group(); g.position.set(c.x, c.y, c.z); scene.add(g);
      const m = new THREE.Mesh(T.geo.cyl(0.55, 0.55, 0.18, 18), gold); m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m);
      const star = new THREE.Mesh(T.geo.cyl(0.32, 0.32, 0.22, 5), T.mat(0xfff1a2)); star.rotation.x = Math.PI / 2; g.add(star);
      const id = `${c.x},${c.z}`;
      g.visible = !S.rewarded.includes(`coin:${id}`);
      coinMeshes.push({ g, id, base: c.y });
    });
  }
  let npc;
  function buildNPC() {
    const n = T.npc;
    npc = makeAvatar(AV, "Nhi", { tagSize: 0.8 });
    npc.group.position.set(n.x, 0.16, n.z); npc.group.rotation.y = n.ry; scene.add(npc.group);
    const bubble = T.label("!", 0, 7.6, 0, { parent: npc.group, size: 1.2, bg: "#ffb703" });
    npc.bubble = bubble;
    npc.group.traverse((m) => { if (m.isMesh) T.clickable(m, "npc"); });
    T.solidCircle(n.x, n.z, 1.1);
    npc.circle = T.circles[T.circles.length - 1];
    T.interact("npc", n.x, n.z + 0.6, "Talk to Nhi", "npc", null, 3);
    npc.talk = T.interactions[T.interactions.length - 1];
    npc.mode = "idle"; npc.phase = 0; npc.ambientHello = false;
  }

  /* ---------------- Nhi the tour guide: walks you to a building, waits, then walks home ---------------- */
  const tour = { id: null, pts: [], idx: 0, entered: false, waiting: false, lines: [], said: 0, sayUntil: 0 };
  const NPC_SPEED = 7.5;
  function say(text, ms = 4200) {
    const el = $("guideBubble");
    el.textContent = text; el.hidden = false; tour.sayUntil = clock.elapsedTime + ms / 1000;
    beep(720, 0.03);
  }
  function startTour(id) {
    const b = B(id), route = T.npcRoutes[id], t = CONTENT.npc.tours[id];
    if (!b || !route || npc.mode !== "idle") return;
    const home = [T.npc.x, T.npc.z];
    tour.id = id; tour.idx = 1; tour.entered = false; tour.waiting = false; tour.said = 0; tour.lines = t.lines;
    tour.pts = [home, ...route, [b.outside.x + 3, b.outside.z]];
    npc.mode = "lead"; npc.talk.r = 0;
    say(t.lines[0]);
  }
  function walkHome() {
    // retrace the route back to the plaza spot, starting from where she is now
    tour.pts = tour.pts.slice(0, tour.idx).reverse();
    tour.idx = 0; npc.mode = "return"; tour.waiting = false;
    say(CONTENT.npc.byeLine);
  }
  function updateGuide(dt, t) {
    if (!npc) return;
    const g = npc.group, pos = g.position;
    const distP = Math.hypot(P.pos.x - pos.x, P.pos.z - pos.z);
    let moving = false;
    if (npc.mode === "lead" || npc.mode === "return") {
      if (npc.mode === "lead") {
        if (insideB && insideB.id === tour.id) tour.entered = true;
        else if (tour.entered) return void walkHome();   // the visitor left the building
      }
      // while leading, wait for the visitor if they fall behind
      if (npc.mode === "lead" && !tour.entered && distP > 11) {
        if (!tour.waiting) { tour.waiting = true; say(CONTENT.npc.waitLine, 3000); }
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(P.pos.x - pos.x, P.pos.z - pos.z), Math.min(1, dt * 6));
      } else {
        if (distP < 7) tour.waiting = false;
        const tgt = tour.pts[tour.idx];
        if (tgt) {
          const dx = tgt[0] - pos.x, dz = tgt[1] - pos.z, d = Math.hypot(dx, dz), step = NPC_SPEED * dt;
          if (d <= step) {
            pos.x = tgt[0]; pos.z = tgt[1]; tour.idx++;
            if (npc.mode === "lead" && tour.said < 1 && tour.idx >= tour.pts.length / 2) { tour.said = 1; say(tour.lines[1], 5000); }
          } else { pos.x += (dx / d) * step; pos.z += (dz / d) * step; moving = true; }
          if (d > 0.01) g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10));
        } else if (npc.mode === "lead") {
          // arrived at the door: face the visitor and wait for them to go in and come back out
          if (tour.said < 2) { tour.said = 2; say(tour.lines[2], 6000); }
          g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(P.pos.x - pos.x, P.pos.z - pos.z), Math.min(1, dt * 4));
          if (!tour.entered && distP > 34) walkHome();     // wandered off without going in
        } else {
          npc.mode = "idle"; tour.id = null; npc.talk.r = 3;
          g.rotation.y = T.npc.ry;
        }
      }
      pos.y = Math.hypot(pos.x, pos.z) < 12.6 ? 0.16 : 0.02;
      npc.circle.x = pos.x; npc.circle.z = pos.z;
    }
    // Greet from a distance, then clear the bubble before conversation range.
    const el = $("guideBubble");
    const timedSpeech = t <= tour.sayUntil;
    const ambientHello = npc.mode === "idle" && playing && !panelOpen && distP > 4.5 && distP < 22 && !timedSpeech;
    if (ambientHello) {
      if (!npc.ambientHello) el.textContent = CONTENT.npc.hello;
      el.hidden = false;
    } else if (npc.ambientHello && !timedSpeech) {
      el.hidden = true;
    }
    npc.ambientHello = ambientHello;
    // pose: walk cycle while moving, wave while idle at home
    if (moving) {
      npc.phase += dt * 9;
      const sw = Math.sin(npc.phase);
      npc.legL.rotation.x = sw * 0.7; npc.legR.rotation.x = -sw * 0.7;
      npc.armL.rotation.x = -sw * 0.6; npc.armR.rotation.x = sw * 0.6; npc.armR.rotation.z = 0;
      g.position.y += Math.abs(Math.cos(npc.phase)) * 0.08;
    } else {
      ["legL", "legR", "armL", "armR"].forEach((k) => { npc[k].rotation.x *= Math.max(0, 1 - dt * 10); });
      npc.armR.rotation.z = npc.mode === "idle" ? 2.5 + Math.sin(t * 5) * 0.35 : npc.armR.rotation.z * Math.max(0, 1 - dt * 8);
    }
    // speech bubble follows her head
    if (!el.hidden) {
      if ((!timedSpeech && !ambientHello) || !playing) el.hidden = true;
      else {
        tmpV.set(pos.x, pos.y + 6.9, pos.z).project(camera);
        const off = tmpV.z > 1 || Math.abs(tmpV.x) > 1.1 || Math.abs(tmpV.y) > 1.1;
        el.style.visibility = off ? "hidden" : "visible";
        el.style.left = `${((tmpV.x + 1) / 2) * innerWidth}px`; el.style.top = `${((1 - tmpV.y) / 2) * innerHeight}px`;
      }
    }
  }
  const marker = { sprite: null };

  function updateWorld(t, dt) {
    T.animated.forEach((f) => f(t, dt));
    // coins
    coinMeshes.forEach((c) => {
      if (!c.g.visible) return;
      c.g.rotation.y = t * 2.4; c.g.position.y = c.base + Math.sin(t * 3 + c.base * 7) * 0.18;
      if (playing && Math.hypot(P.pos.x - c.g.position.x, P.pos.z - c.g.position.z) < 1.6 && Math.abs(P.pos.y + 1.2 - c.g.position.y) < 2.4) {
        c.g.visible = false; S.coins++; S.rewarded.push(`coin:${c.id}`); S.xp += 10; saveState(); updateHUD();
        toast("+1 NhiCoin · +10 XP"); beep(980, 0.05);
        if (S.coins >= 10) unlock("coins");
      }
    });
    // doors
    T.doors.forEach((d) => {
      const near = playing && Math.hypot(P.pos.x - d.x, P.pos.z - d.z) < (d.range || 5.5);
      d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 5);
      d.apply(d.open);
    });
    // inside detection, roof hiding and front-wall fade
    insideB = playing ? T.buildings.find((b) => P.pos.x > b.minX && P.pos.x < b.maxX && P.pos.z > b.minZ && P.pos.z < b.maxZ) || null : null;
    // start each visit with a nice overhead view; the arrow keys can change it from there
    if (insideB && insideB !== lastInside) camPitch = Math.max(camPitch, 0.92);
    lastInside = insideB;
    T.buildings.forEach((b) => {
      const target = b === insideB ? 0.14 : 1;
      if (Math.abs(b.fade - target) > 0.002) {
        b.fade += (target - b.fade) * Math.min(1, dt * 6);
        b.fadeMats.forEach((m) => { m.opacity = b.fade; m.depthWrite = b.fade > 0.95; });
      }
      // hide the roof when you're inside, or when the camera floats over the building
      const over = Math.abs(camera.position.x - b.x) < b.w / 2 + 1.5 && Math.abs(camera.position.z - b.z) < b.d / 2 + 1.5;
      b.roof.visible = b !== insideB && !over;
    });
    // cat
    const cat = T.cat;
    if (cat) {
      cat.tail.rotation.z = Math.sin(t * (cat.jump >= 0 ? 12 : 3)) * 0.45;
      if (cat.jump >= 0) {
        cat.jump += dt / 0.9;
        const p = Math.min(1, cat.jump);
        cat.group.position.y = cat.y + Math.sin(p * Math.PI) * 1.3;
        cat.group.rotation.y = 0.6 + p * Math.PI * 2;
        cat.heart.visible = true; cat.heart.position.y = cat.y + 2.6 + p * 1.6; cat.heart.material.opacity = 1 - p * 0.8;
        if (p >= 1) { cat.jump = -1; cat.heart.visible = false; cat.group.position.y = cat.y; cat.group.rotation.y = 0.6; }
      } else cat.head.rotation.z = Math.sin(t * 0.8) * 0.12;
    }
    // npc idle
    if (npc) {
      updateGuide(dt, t);
      npc.bubble.visible = !S.badges.includes("npc");
      npc.bubble.position.y = 7.6 + Math.sin(t * 3) * 0.15;
    }
    if (!playing) return;
    // regions + location label
    let where = insideB ? insideB.name : "Nhi's Town", best = Infinity;
    T.regions.forEach((r) => {
      const d = Math.hypot(P.pos.x - r.x, P.pos.z - r.z);
      if (d < r.r && r.visit && !S.visited.includes(r.visit)) {
        S.visited.push(r.visit); reward(`visit:${r.visit}`, 50, 1); toast(`${r.name} discovered · +50 XP`);
        if (["house", "library", "garage", "lab"].every((v) => S.visited.includes(v))) unlock("explorer");
      }
      if (!insideB && d < r.r && d < best) { best = d; where = r.name; }
    });
    $("locationName").textContent = where;
    updateInteraction(t);
  }

  /* ---------------- interactions ---------------- */
  function updateInteraction(t) {
    let bestI = null, bestD = Infinity;
    for (const i of T.interactions) {
      if (i.action === "enter" && insideB) continue;
      if (i.action === "leave" && insideB !== i.payload) continue;
      if (i.minY != null && P.pos.y < i.minY) continue;
      const d = Math.hypot(P.pos.x - i.x, P.pos.z - i.z);
      if (d < i.r && d < bestD) { bestI = i; bestD = d; }
    }
    if (panelOpen) bestI = null;
    if (bestI !== active) {
      active = bestI;
      $("interactPrompt").hidden = !active;
      if (active) $("interactText").textContent = active.prompt;
    }
    const showMarker = !!active && active.action !== "enter" && active.action !== "leave";
    marker.sprite.visible = showMarker;
    if (showMarker) marker.sprite.position.set(active.x, (active.minY || P.pos.y) + 8 + Math.sin(t * 4) * 0.15, active.z);
  }
  function interact() { if (active && playing && !panelOpen) { beep(520, 0.05); run(active.action, active.payload); } }

  /* ---------------- rewards, HUD ---------------- */
  function reward(key, xp = 0, coins = 0) {
    if (S.rewarded.includes(key)) return;
    S.rewarded.push(key); S.xp += xp; S.coins += coins; saveState(); updateHUD();
    if (S.coins >= 10) unlock("coins");
  }
  function unlock(id) {
    if (S.badges.includes(id)) return;
    const b = BADGES.find((x) => x.id === id); if (!b) return;
    S.badges.push(id); S.xp += 100; saveState(); updateHUD(); beep(760, 0.12);
    $("badgePop").innerHTML = `<span class="bicon" style="--bc:${b.color}">${esc(b.icon)}</span><div><small>Badge unlocked · +100 XP</small>${esc(b.name)}</div>`;
    $("badgePop").classList.add("show"); clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => $("badgePop").classList.remove("show"), 3200);
  }
  function updateHUD() {
    $("coinCount").textContent = `${S.coins} NhiCoins`;
    $("badgeBtn").textContent = `Badges ${S.badges.length}/${BADGES.length}`;
  }
  function toast(msg) {
    $("toast").textContent = msg; $("toast").classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
  }
  function beep(freq = 420, dur = 0.06) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = "triangle";
      g.gain.setValueAtTime(0.05, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  /* ---------------- panels ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // https/mailto links pass through; repo-relative files (e.g. "notes/x.pdf", "assets/cv.pdf") resolve from the site root.
  const safeUrl = (u) => {
    const url = u || "";
    if (/^(https?:\/\/|mailto:)/.test(url)) return url;
    if (/^\/[\w-][\w./-]*\.(pdf|html?|md)$/i.test(url)) return url;
    return /^[\w-][\w./-]*\.(pdf|html?|md)$/i.test(url) ? "../" + url : "";
  };
  const chips = (items, cls = "") => `<div class="chips">${items.map((x) => `<span class="chip ${cls}">${esc(x)}</span>`).join("")}</div>`;
  const ext = (url, text, cls = "go") => { const u = safeUrl(url); return u ? `<a class="btn ${cls}" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>` : ""; };
  let lastFocus = null;
  let disposePanel = null;
  function panel({ title, kicker, color = "#ffb703", light = false, body, back }) {
    if (disposePanel) { disposePanel(); disposePanel = null; }
    panelOpen = true; Object.keys(keys).forEach((k) => (keys[k] = false));
    lastFocus = document.activeElement;
    $("panel").innerHTML = `<article class="card" role="dialog" aria-modal="true" aria-labelledby="panelTitle">
      <header class="card-head ${light ? "light" : ""}" style="--head:${color}"><div><span class="eyebrow">${esc(kicker || "")}</span><h2 id="panelTitle">${esc(title)}</h2></div><button class="btn plain x" type="button" aria-label="Close">✕</button></header>
      <div class="card-body">${body}<div class="row panel-foot">${back ? `<button class="btn plain" type="button" data-back>← ${esc(back.label)}</button>` : ""}<button class="btn blue" type="button" data-close>Back to exploring</button></div></div></article>`;
    $("panel").hidden = false;
    const root = $("panel");
    root.querySelector(".x").onclick = closePanel;
    root.querySelector("[data-close]").onclick = closePanel;
    if (back) root.querySelector("[data-back]").onclick = () => run(back.action, back.payload);
    root.onclick = (e) => { if (e.target === root) closePanel(); };
    root.querySelector(".x").focus();
    return root;
  }
  function closePanel() {
    if (disposePanel) { disposePanel(); disposePanel = null; }
    panelOpen = false; $("panel").hidden = true; $("panel").innerHTML = "";
    canvas.focus({ preventScroll: true });
  }
  function bindList(root, sel, fn) { root.querySelectorAll(sel).forEach((el) => (el.onclick = () => fn(el))); }

  const B = (id) => T.buildings.find((b) => b.id === id);
  const H = CONTENT.home, real = (x) => x && !String(x).startsWith("[");
  let hoops = 0;
  const pics = {};
  function drawnPic(key, draw, w, h) {
    if (!pics[key]) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); pics[key] = c.toDataURL(); }
    return pics[key];
  }
  function run(action, data) {
    const pf = CONTENT.profile || {};
    switch (action) {
      case "enter": P.auto = { x: data.inside.x, z: data.inside.z, until: clock.elapsedTime + 2.5 }; toast(`Welcome to ${data.name}!`); break;
      case "leave": P.auto = { x: data.outside.x, z: data.outside.z, until: clock.elapsedTime + 2.5 }; break;

      case "intro": panel({
        title: "Hi, I'm Nhi!", kicker: "Nhi's House · photo", color: "#ffd27a",
        body: `<p>${esc(pf.about || CONTENT.about)}</p><div class="block"><b>${esc(pf.title || CONTENT.role)}</b><span>${esc(pf.status || "Chicago")}</span></div>${chips((pf.chips || []).map((c) => c.label))}<div class="row">${`<a class="btn plain" href="../">My profile</a>`}${ext(CONTENT.resume, "Resume", "plain")}</div>`
      }); break;
      case "education": panel({
        title: "Education", kicker: "Nhi's House · diploma", color: "#ff8a3d",
        body: CONTENT.education.map((e) => `<div class="block"><b>${esc(e.full)}</b><span class="muted">${esc(e.degree)} · ${esc(e.years)}</span><span>${esc(e.story)}</span></div>`).join("")
      }); break;
      case "brothers": panel({
        title: "My favorite people", kicker: "Nhi's House · photo wall", color: "#ff8fbf", light: true,
        body: `<img class="family-pic" alt="Drawing of Nhi with her two brothers" src="${drawnPic("brothers", T.drawBrothers, 660, 600)}"><p>${esc(H.favoritePeople)}</p>`,
        back: { label: "Whole family", action: "family" }
      }); break;
      case "music": {
        const djs = H.music.djs.filter(real);
        panel({ title: "Currently listening", kicker: "Nhi's House · music corner", color: "#1db954", light: true,
          body: `<p>House music on the turntable.</p>${djs.length ? chips(djs) : `<p class="muted">Favorite DJs coming soon.</p>`}${H.music.playlist ? `<div class="row">${ext(H.music.playlist, "Open my Spotify playlist")}</div>` : ""}` });
        break;
      }
      case "lego": {
        const sets = H.lego.sets.filter(real);
        panel({ title: "My LEGO collection", kicker: "Nhi's House · display shelf", color: "#ffcf00", light: true,
          body: `<p>${esc(H.lego.blurb)}</p>${sets.length ? `<ul>${sets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">The list of sets is coming soon.</p>`}` });
        break;
      }
      case "anime": panel({
        title: "Anime & manga", kicker: "Nhi's House · shelf", color: "#e84a5f",
        body: `${chips(H.anime.series)}<div class="block"><b>Note on the shelf</b><span>${esc(H.anime.note)}</span></div>` }); break;
      case "gaming": {
        const games = H.gaming.games.filter(real);
        panel({ title: "My Roblox setup", kicker: "Nhi's House · bedroom", color: "#3a86ff", light: true,
          body: `<p>That's my avatar on screen. Her outfit (the pink hoodie, tank top and shorts) is hanging on the rack by the window.</p><div class="block"><b>Favorite games</b>${games.length ? games.map((x) => `<span>★ ${esc(x)}</span>`).join("") : `<span class="muted">Coming soon</span>`}</div>`,
          back: { label: "What I'm working on", action: "current" } });
        break;
      }
      case "basketball": {
        const bb = H.basketball;
        panel({ title: "Basketball corner", kicker: "Nhi's House", color: "#f07a24", light: true,
          body: `<p>${esc(bb.blurb)}</p>${real(bb.favoritePlayer) ? `<div class="block"><b>Favorite player</b><span>${esc(bb.favoritePlayer)}</span></div>` : ""}` });
        break;
      }
      case "shoot":
        if (T.hoop && T.hoop.shoot(P.pos)) { hoops++; beep(500, 0.05); setTimeout(() => { beep(880, 0.08); toast(hoops === 1 ? "Swish! Nothing but net" : `Swish! ${hoops} in a row`); }, 1100); }
        break;
      case "family": panel({
        title: "My family", kicker: "Nhi's House · photo", color: "#ff8fbf", light: true,
        body: `<img class="family-pic" alt="Drawing of Nhi with her two brothers, parents, grandparents and lots of relatives" src="${drawnPic("family", T.drawFamily, 900, 609)}"><p>${esc(CONTENT.personal.family)}</p>`
      }); break;
      case "cat": {
        const cat = T.cat, known = !String(CONTENT.personal.catName).startsWith("[");
        if (cat && cat.jump < 0) cat.jump = 0;
        beep(880, 0.08); setTimeout(() => beep(1180, 0.08), 90);
        toast(known ? `${CONTENT.personal.catName} purrs happily ♥` : "The cat purrs happily ♥");
        unlock("cat"); reward("cat", 40, 2);
        break;
      }
      case "catInfo": {
        const known = !String(CONTENT.personal.catName).startsWith("[");
        run("cat");
        panel({ title: known ? CONTENT.personal.catName : "The resident cat", kicker: "Nhi's House · photo", color: "#ffb47a",
          body: `<p>${known ? esc(CONTENT.personal.catBlurb) : "Name and story coming soon. For now: excellent at supervising research and sitting on keyboards."}</p>` });
        break;
      }
      case "current": {
        const cur = CONTENT.current || [];
        panel({ title: "What I'm working on", kicker: "Nhi's House · desk", color: "#3a86ff", light: true,
          body: cur.length ? cur.map((c) => `<div class="block"><b>${esc(c.title)}</b><span>${esc(c.note)}</span>${c.link ? `<div class="row">${ext(c.link, "Read more", "plain")}</div>` : ""}</div>`).join("") : "<p>Nothing listed yet.</p>" });
        break;
      }
      case "homeShelf": panel({ title: "Nhi's bookshelf", kicker: "Nhi's House", color: "#2fbf5b", light: true,
        body: `<p>The full collection of study notes lives in the <b>Library</b>, northeast of the plaza. Each subject has its own shelf.</p>`,
        back: { label: "Library directory", action: "libraryIndex" } }); break;

      case "libraryIndex": {
        const lib = CONTENT.library || [];
        const root = panel({ title: "Library directory", kicker: "Library", color: "#4e6482", light: true,
          body: `<p>Pick a subject, or walk up to its shelf and press <kbd>E</kbd>.</p><div class="choices">${lib.map((s, i) => `<button class="btn plain shelf-btn" type="button" data-i="${i}"><span class="dot" style="--c:${s.color}"></span>${esc(s.title)}<small>${s.notes && s.notes.length ? `${s.notes.length} note${s.notes.length > 1 ? "s" : ""}` : "coming soon"}</small></button>`).join("")}</div>` });
        bindList(root, ".shelf-btn", (el) => run("shelf", lib[+el.dataset.i]));
        break;
      }
      case "shelf": {
        const notes = data.notes || [];
        panel({ title: data.title, kicker: "Library shelf", color: data.color, light: true,
          body: notes.length
            ? `<div class="choices">${notes.map((n) => { const u = safeUrl(n.url); return u ? `<a class="btn plain note" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><b>${esc(n.title)}</b>${n.desc ? `<small>${esc(n.desc)}</small>` : ""}<span aria-hidden="true">↗</span></a>` : `<div class="block"><b>${esc(n.title)}</b><span class="muted">${esc(n.desc || "Not published yet")}</span></div>`; }).join("")}</div>`
            : `<div class="block empty"><b>Notes coming soon</b><span class="muted">Nothing has been shelved under ${esc(data.title)} yet.</span></div>`,
          back: { label: "All shelves", action: "libraryIndex" } });
        break;
      }

      case "projects": {
        const root = panel({ title: "Project Garage", kicker: "Things I've built", color: "#ffc93c",
          body: `<p>Every station in the garage is one of my real projects. Pick one:</p><div class="choices">${CONTENT.projects.map((p, i) => `<button class="btn plain proj-btn" type="button" data-i="${i}"><span class="dot" style="--c:${p.color}"></span>${esc(p.title)}<small>${esc(p.tag)}</small></button>`).join("")}</div>` });
        bindList(root, ".proj-btn", (el) => run("project", CONTENT.projects[+el.dataset.i]));
        break;
      }
      case "project": {
        const root = panel({ title: data.title, kicker: data.tag, color: data.color, light: true,
          body: `${data.image ? `<img class="preview" src="${esc(data.image)}" alt="${esc(data.title)} preview">` : ""}<p>${esc(data.desc)}</p><h3>Built with</h3>${chips(data.stack)}<div class="row">${ext(data.github, "GitHub", "dark repo")}${ext(data.demo, "Live demo", "go")}</div>`,
          back: { label: "All projects", action: "projects" } });
        const repo = root.querySelector(".repo"); if (repo) repo.addEventListener("click", () => { unlock("github"); reward("github", 60, 0); });
        break;
      }

      case "paper": {
        unlock("paper"); reward(`paper:${data.title}`, 75, 1);
        panel({ title: data.title, kicker: `${data.venue} · ${data.year}`, color: "#14b8a6", light: true,
          body: `<h3>The problem</h3><p>${esc(data.problem)}</p><h3>In plain words</h3><p>${esc(data.why)}</p><h3>What we found</h3><p>${esc(data.found)}</p><h3>Collaborators</h3><p class="muted">${esc(data.authors)}</p><div class="row">${ext(data.link, "Read the paper", "go")}</div>`,
          back: { label: "All research", action: "papers" } });
        break;
      }
      case "papers": {
        const root = panel({ title: "Research Lab", kicker: "Publications", color: "#14b8a6", light: true,
          body: `<div class="choices">${CONTENT.papers.map((p, i) => `<button class="btn plain paper-btn" type="button" data-i="${i}">${esc(p.title)}<small>${esc(p.venue)} · ${esc(p.year)}</small></button>`).join("")}</div>` });
        bindList(root, ".paper-btn", (el) => run("paper", CONTENT.papers[+el.dataset.i]));
        break;
      }
      case "puzzle": openPuzzle(); break;

      case "achievements": {
        const q = CONTENT.careerQuests;
        const root = panel({ title: "Achievements", kicker: "Achievement Plaza", color: "#ffb703",
          body: `<div class="quests">${q.map((x, i) => `<button class="quest ${x.status === "done" ? "done" : ""}" type="button" data-i="${i}"><b>${esc(x.name)}</b><span class="xp">+${x.xp} XP</span><span class="meta"><span class="chip ${x.status === "done" ? "done" : "prog"}">${x.status === "done" ? "Complete" : "In progress"}</span>${esc(x.note)}</span></button>`).join("")}</div>` });
        bindList(root, ".quest", (el) => run("achievement", +el.dataset.i));
        break;
      }
      case "achievement": {
        const x = CONTENT.careerQuests[data];
        if (!x) break;
        panel({ title: x.name, kicker: "Achievement", color: x.status === "done" ? "#2fbf5b" : "#ffb703", light: x.status === "done",
          body: `<div class="block"><b>${x.status === "done" ? "✓ Complete" : "In progress"}</b><span>${esc(x.note)}</span></div><p class="muted">Worth +${x.xp} XP on Nhi's achievement path.</p>`,
          back: { label: "All achievements", action: "achievements" } });
        break;
      }
      case "boardClick": run("achievement", data); break;

      case "npc": {
        if (npc.mode !== "idle") { say(npc.mode === "lead" ? "Follow me, we're almost there!" : "Heading back to the plaza. Talk to me there!", 2500); break; }
        unlock("npc"); reward("npc", 35, 1);
        const root = panel({ title: "Chat with Nhi", kicker: "Achievement Plaza", color: "#8a5cf6", light: true,
          body: `${window.NhiChat.markup()}
            <p class="muted" style="margin:14px 0 8px">Want a tour? I'll walk you there:</p>
            <div class="choices">${Object.entries(CONTENT.npc.tours).map(([id, tt]) => `<button class="btn go npc-tour" type="button" data-id="${id}">Take me to ${esc(tt.label)}</button>`).join("")}</div>` });
        bindList(root, ".npc-tour", (el) => { closePanel(); startTour(el.dataset.id); });
        root.querySelector(".card").classList.add("chat-card");
        disposePanel = window.NhiChat.mount(root);
        break;
      }
      case "secret": unlock("obby"); reward("secret", 80, 4);
        panel({ title: "Secret Lookout", kicker: "You found it!", color: "#2fbf5b", light: true,
          body: `<p>Nice jumping. From up here you can see the whole town: the house, the library, the garage and the lab.</p><p class="muted">Shortcut Finder badge unlocked · +4 NhiCoins</p>` }); break;
      case "badges": panel({ title: `Badges ${S.badges.length}/${BADGES.length}`, kicker: "Your collection", color: "#ffb703",
        body: `<div class="badges">${BADGES.map((b) => `<div class="badge ${S.badges.includes(b.id) ? "" : "locked"}"><span class="bicon" style="--bc:${b.color}">${esc(b.icon)}</span><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join("")}</div>` }); break;
    }
  }
  function openPuzzle() {
    const pts = [[60, 60], [160, 35], [260, 70], [80, 170], [180, 160], [270, 185]];
    const edges = [[0, 1, 2, "#ff5d8f"], [1, 3, 4, "#3a86ff"], [2, 4, 5, "#ffb703"]];
    const svg = `<svg viewBox="0 0 330 230" role="group" aria-label="Hypergraph with six vertices">${edges.map(([a, b, c, col]) => `<polygon points="${[a, b, c].map((i) => pts[i].join(",")).join(" ")}" fill="${col}" fill-opacity=".22" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>`).join("")}${pts.map((p, i) => `<g class="v" tabindex="0" role="button" aria-pressed="false" aria-label="Vertex ${i + 1}" data-i="${i}"><circle cx="${p[0]}" cy="${p[1]}" r="20" fill="#fff" stroke="#17202b" stroke-width="4"/><text x="${p[0]}" y="${p[1] + 6}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="17">${i + 1}</text></g>`).join("")}</svg>`;
    const root = panel({ title: "Hypergraph puzzle", kicker: "Research Lab", color: "#ff5d8f", light: true,
      body: `<p>Pick <b>three</b> vertices so that no coloured hyperedge is completely selected. That's an <b>independent set</b>, the object behind Nhi's RANDOM 2026 paper.</p><div class="pz-svg">${svg}</div><p class="pz-status" id="pzStatus">0 / 3 selected</p>` });
    const chosen = new Set();
    const toggle = (el) => {
      const i = +el.dataset.i;
      if (chosen.has(i)) chosen.delete(i); else if (chosen.size < 3) chosen.add(i);
      root.querySelectorAll(".v").forEach((v) => { const on = chosen.has(+v.dataset.i); v.setAttribute("aria-pressed", on); v.querySelector("circle").setAttribute("fill", on ? "#3a86ff" : "#fff"); v.querySelector("text").setAttribute("fill", on ? "#fff" : "#17202b"); });
      const bad = edges.some((e) => e.slice(0, 3).every((v) => chosen.has(v)));
      $("pzStatus").textContent = bad ? "That covers a whole hyperedge. Swap one vertex." : `${chosen.size} / 3 selected`;
      if (chosen.size === 3 && !bad) { S.puzzle = true; saveState(); unlock("puzzle"); reward("puzzle", 150, 5); $("pzStatus").textContent = "Solved! No hyperedge is fully inside your set. 🎉"; beep(900, 0.15); }
    };
    root.querySelectorAll(".v").forEach((v) => { v.onclick = () => toggle(v); v.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(v); } }; });
  }

  /* ---------------- input ---------------- */
  const joy = { x: 0, y: 0, id: null };
  function joyMove(e) {
    const r = $("joy").getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.32, d = Math.max(1, Math.hypot(dx, dy)), m = Math.min(max, d);
    joy.x = (dx / d) * (m / max); joy.y = (dy / d) * (m / max);
    $("knob").style.transform = `translate(${joy.x * max}px, ${joy.y * max}px)`;
  }
  $("joy").addEventListener("pointerdown", (e) => { joy.id = e.pointerId; $("joy").setPointerCapture(e.pointerId); joyMove(e); e.preventDefault(); });
  $("joy").addEventListener("pointermove", (e) => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $("knob").style.transform = ""; } };
  $("joy").addEventListener("pointerup", joyEnd); $("joy").addEventListener("pointercancel", joyEnd);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(T.clickables, false).filter((h) => h.object.visible && (!h.object.material.opacity || h.object.material.opacity > 0.3));
    return hits[0] || null;
  }
  function clickHit(hit) {
    const c = hit.object.userData.click;
    if (hit.point.distanceTo(P.pos) > 26) toast("Walk a little closer to check that out");
    else if (c.action === "boardClick") {
      const v = 1 - hit.uv.y, row = Math.floor((v - c.payload.top) / (c.payload.span / c.payload.rows));
      if (row >= 0 && row < c.payload.rows) run("achievement", row); else run("achievements");
    } else run(c.action, c.payload);
  }
  let hoverT = 0;
  const drag = { on: false, x: 0, y: 0, sx: 0, sy: 0, moved: 0, id: null };
  canvas.addEventListener("pointerdown", (e) => {
    if (drag.on) return;
    Object.assign(drag, { on: true, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0, id: e.pointerId });
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (drag.on && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (playing && !panelOpen && drag.moved > 4 && e.pointerType !== "mouse") {
        camYaw -= dx * 0.0065;
        camPitch = Math.max(0.1, Math.min(1.25, camPitch + dy * 0.0045));
      }
    } else if (e.pointerType === "mouse" && playing && !panelOpen) hoverCheck(e);
  });
  const endDrag = (e) => {
    if (!drag.on || e.pointerId !== drag.id) return;
    drag.on = false;
    if (drag.moved < 8 && playing && !panelOpen) {
      const hit = pick(e.clientX, e.clientY);
      if (hit) clickHit(hit);
    }
  };
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
  function hoverCheck(e) {
    const now = performance.now(); if (now - hoverT < 70) return; hoverT = now;
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit && hit.point.distanceTo(P.pos) <= 26 ? "pointer" : "";
  }
  canvas.addEventListener("wheel", (e) => { camDist = Math.max(8, Math.min(36, camDist + e.deltaY * 0.014)); e.preventDefault(); }, { passive: false });

  addEventListener("keydown", (e) => {
    if (e.code === "Escape" && panelOpen) { closePanel(); return; }
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === "Tab" && panelOpen) {
      const focusable = [...$("panel").querySelectorAll('button:not(:disabled), a[href], input, textarea, [tabindex="0"]')];
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (panelOpen) return;
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "Space" && !e.repeat) jump();
    if (e.code === "KeyE" && !e.repeat) interact();
    if (e.code === "Enter" && !playing && !e.repeat) startPlay();
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  addEventListener("blur", () => Object.keys(keys).forEach((k) => (keys[k] = false)));
  $("jumpBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); jump(); });
  $("interactPrompt").onclick = interact;
  $("badgeBtn").onclick = () => run("badges");
  $("soundBtn").onclick = () => { soundOn = !soundOn; $("soundBtn").textContent = `Sound ${soundOn ? "on" : "off"}`; if (soundOn) beep(); };

  function startPlay() {
    if (playing) return;
    const spot = { house: "house", library: "library", garage: "garage", lab: "lab" }[location.hash.slice(1)];
    if (spot) {
      const b = B(spot); P.pos.set(b.outside.x, 0, b.outside.z + b.front * 1.5);
      camYaw = b.front > 0 ? 0 : Math.PI; P.yaw = camYaw + Math.PI;
    } else { P.pos.set(0, 0.32, 8.6); camYaw = 0; P.yaw = Math.PI; }
    playing = true; playStart = clock.elapsedTime;
    $("start").hidden = true; document.body.classList.add("playing");
    unlock("welcome"); reward("first-play", 50, 2);
    canvas.focus({ preventScroll: true });
    toast(spot ? `Welcome to ${B(spot).name}!` : "Welcome! Follow a path to any building.");
  }
  $("playBtn").onclick = startPlay;

  /* ---------------- lobby card ---------------- */
  /* ---------------- boot ---------------- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < h ? 62 : 50; camera.updateProjectionMatrix();
  }
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    updatePlayer(dt); updateWorld(t, dt); updateCamera(dt, t);
    renderer.render(scene, camera);
  }
  async function boot() {
    updateHUD(); resize();
    try { await Promise.race([document.fonts.load(`700 64px Fredoka`), new Promise((r) => setTimeout(r, 2500))]); } catch (_) {}
    T.buildWorld();
    buildNPC(); buildCoins();
    marker.sprite = T.label("E", 0, 0, 0, { size: 1, bg: "#ffffff" }); marker.sprite.visible = false;
    scene.add(marker.sprite);
    // static labels only; the cat heart, NPC bubble and E marker manage their own visibility
    [T.cat && T.cat.heart, npc.bubble, marker.sprite].forEach((m) => m && (m.userData.managed = true));
    scene.traverse((o) => { if (o.isSprite && !o.userData.managed && o.parent !== player.group) labels.push(o); });
    document.body.classList.add("ready");
    $("playBtn").disabled = false;
    if (DEBUG) window.__town = { T, P, S, player, npc, camera, scene, renderer, run, startPlay, teleport: (x, z, y = 0) => { P.pos.set(x, y, z); P.vy = 0; }, look: (yaw, pitch, dist) => { camYaw = yaw; if (pitch != null) camPitch = pitch; if (dist != null) camDist = dist; }, get inside() { return insideB && insideB.id; }, get active() { return active && active.id; } };
    loop();
  }
  addEventListener("resize", resize);
  boot();
})();
