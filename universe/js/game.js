(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x83d8f3);
  scene.fog = new THREE.Fog(0x9cdef3, 105, 205);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  const clock = new THREE.Clock();
  const world = new THREE.Group();
  scene.add(world);

  const BADGES = [
    { id: "welcome", icon: "★", name: "New in Town", desc: "Entered Nhi's Universe." },
    { id: "explorer", icon: "⌖", name: "Town Explorer", desc: "Visited all four portfolio buildings." },
    { id: "paper", icon: "◈", name: "Paper Trail", desc: "Inspected a research paper." },
    { id: "github", icon: "⌘", name: "Source Seeker", desc: "Opened a project repository." },
    { id: "cat", icon: "=^", name: "Cat Person", desc: "Met the resident cat." },
    { id: "npc", icon: "☺", name: "Good Neighbor", desc: "Talked with Mini Nhi." },
    { id: "puzzle", icon: "⬡", name: "Hypergraph Hero", desc: "Solved the lab puzzle." },
    { id: "obby", icon: "▲", name: "Shortcut Finder", desc: "Found the garden stepping stones." },
    { id: "coins", icon: "$", name: "Coin Collector", desc: "Collected ten NhiCoins." }
  ];
  const defaultState = { coins: 0, xp: 0, badges: [], rewarded: [], visited: [], puzzle: false };
  let S = loadState();
  let playing = false, panelOpen = false, soundOn = true, activeInteraction = null;
  let camYaw = 0, camPitch = 0.43, camDist = 18;
  const keys = {}, colliders = [], interactions = [], coins = [], animated = [], regions = [];
  const materials = new Map();
  let toastTimer, badgeTimer, audioCtx;

  function loadState() {
    try { return Object.assign({}, defaultState, JSON.parse(localStorage.getItem("nhi-town-save") || "{}")); }
    catch (_) { return Object.assign({}, defaultState); }
  }
  function saveState() { try { localStorage.setItem("nhi-town-save", JSON.stringify(S)); } catch (_) {} }
  function material(color, roughness = 0.86) {
    const key = `${color}-${roughness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 }));
    return materials.get(key);
  }
  function box(x, y, z, w, h, d, color, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, opts.roughness));
    mesh.position.set(x, y, z); mesh.rotation.y = opts.ry || 0;
    mesh.castShadow = opts.cast !== false; mesh.receiveShadow = opts.receive !== false;
    (opts.parent || world).add(mesh);
    if (opts.solid && !opts.ry) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  }
  function cylinder(x, y, z, rt, rb, h, color, sides = 8, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material(color, opts.roughness));
    mesh.position.set(x, y, z); mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true; (opts.parent || world).add(mesh); return mesh;
  }
  function roof(x, y, z, w, d, h, color) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), material(color));
    mesh.position.set(x, y, z); mesh.rotation.y = Math.PI / 4; mesh.scale.set(w * .71, h, d * .71); mesh.castShadow = true; world.add(mesh); return mesh;
  }
  function label(text, x, y, z, width = 5.8, bg = "#ffffff", fg = "#244052") {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(4, 4, 504, 120); g.strokeStyle = "#274455"; g.lineWidth = 10; g.strokeRect(4, 4, 504, 120);
    g.fillStyle = fg; g.font = "700 44px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 66, 465);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); s.position.set(x, y, z); s.scale.set(width, width / 4, 1); world.add(s); return s;
  }
  function windowBox(x, y, z, w = 2.5, h = 2.4, axis = "z") {
    const d = axis === "z" ? .18 : w; const ww = axis === "z" ? w : .18;
    box(x, y, z, ww, h, d, 0x9de5ff, { cast: false });
    box(x, y, z + (axis === "z" ? .12 : 0), axis === "z" ? .12 : w, h, axis === "z" ? .22 : .12, 0xffffff, { cast: false });
    box(x, y, z + (axis === "z" ? .13 : 0), axis === "z" ? w : .12, .12, axis === "z" ? .22 : .12, 0xffffff, { cast: false });
  }
  function door(x, z, color, front = "south") {
    const zz = front === "south" ? z + .05 : z - .05;
    box(x, 2.25, zz, 2.8, 4.5, .35, color); box(x + .85, 2.2, zz + (front === "south" ? .2 : -.2), .16, .16, .16, 0xffd44f);
  }
  function path(x1, z1, x2, z2, width = 4.2) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.ceil(len / 3.1), angle = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n, wobble = Math.sin(i * 2.3) * .2;
      const mesh = box(x1 + dx * t + Math.cos(angle) * wobble, .055 + (i % 2) * .008, z1 + dz * t - Math.sin(angle) * wobble, width, .11, 2.75, i % 3 === 0 ? 0xc4c8c2 : 0xd4d5ce, { cast: false, receive: true });
      mesh.rotation.y = angle + (i % 2 ? .025 : -.02);
    }
  }
  function tree(x, z, scale = 1, tint = 0x58ad4d) {
    cylinder(x, 2 * scale, z, .55 * scale, .72 * scale, 4 * scale, 0x8b5a35, 7);
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.25 * scale, 0), material(tint)); crown.position.set(x, 5.1 * scale, z); crown.rotation.set(.2, x * .11, .1); crown.castShadow = true; world.add(crown);
    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65 * scale, 0), material(tint === 0x58ad4d ? 0x71c65e : tint)); crown2.position.set(x + .8 * scale, 5.8 * scale, z - .35 * scale); crown2.castShadow = true; world.add(crown2);
  }
  function bush(x, z, color = 0x55aa4f) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), material(color)); b.position.set(x, .8, z); b.scale.y = .72; b.castShadow = true; world.add(b); }
  function lamp(x, z) { cylinder(x, 2, z, .13, .18, 4, 0x40515c, 8); box(x, 4.15, z, .85, .55, .85, 0xffe99a); box(x, 4.55, z, 1.02, .12, 1.02, 0x2e414d); }
  function bench(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
    box(0, 1.15, 0, 3.6, .32, 1, 0xae6c3c, { parent: g }); box(0, 2.05, .43, 3.6, 1.05, .24, 0xae6c3c, { parent: g });
    box(-1.35, .55, 0, .25, 1.1, .7, 0x364955, { parent: g }); box(1.35, .55, 0, .25, 1.1, .7, 0x364955, { parent: g });
  }
  function fence(x, z, count, axis = "x") {
    for (let i = 0; i < count; i++) { const px = x + (axis === "x" ? i * 2 : 0), pz = z + (axis === "z" ? i * 2 : 0); box(px, 1, pz, .22, 2, .22, 0xf4e9d0); }
    box(x + (axis === "x" ? (count - 1) : 0), .9, z + (axis === "z" ? (count - 1) : 0), axis === "x" ? (count - 1) * 2 : .18, .22, axis === "z" ? (count - 1) * 2 : .18, 0xf4e9d0);
  }
  function addInteraction(id, x, z, labelText, type, payload, radius = 3.4) { interactions.push({ id, x, z, label: labelText, type, payload, radius }); }
  function addCoin(x, z) {
    const g = new THREE.Group(); g.position.set(x, 1, z); world.add(g);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .16, 16), material(0xffcf34, .45)); m.rotation.z = Math.PI / 2; m.castShadow = true; g.add(m);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(.08, .55, .12), material(0xfff1a2)); mark.position.x = .1; g.add(mark);
    const id = `${x},${z}`; g.visible = !S.rewarded.includes(`coin:${id}`); coins.push({ g, id, base: 1 + (x + z) * .001 });
  }
  function addFlower(x, z, color) { cylinder(x, .35, z, .04, .04, .7, 0x3b8a3f, 5); const f = new THREE.Mesh(new THREE.OctahedronGeometry(.24), material(color)); f.position.set(x, .8, z); world.add(f); }

  function buildGround() {
    box(0, -.65, 0, 132, 1.3, 132, 0x78bb56, { cast: false, receive: true });
    box(0, -1.4, 0, 136, 1.5, 136, 0x8a5b37, { cast: false });
    const road = material(0x92a0a6); const r1 = new THREE.Mesh(new THREE.PlaneGeometry(13, 116), road), r2 = new THREE.Mesh(new THREE.PlaneGeometry(116, 13), road);
    [r1, r2].forEach((m) => { m.rotation.x = -Math.PI / 2; m.position.y = .025; m.receiveShadow = true; world.add(m); });
    r2.rotation.z = Math.PI / 2;
    for (let i = -52; i <= 52; i += 9) { box(.03, .05, i, .18, .05, 4, 0xdce2df, { cast: false }); box(i, .055, .03, 4, .05, .18, 0xdce2df, { cast: false }); }
    path(-5, -5, -32, -20, 4.5); path(5, -5, 32, -20, 4.5); path(-5, 5, -32, 20, 4.5); path(5, 5, 32, 20, 4.5);
  }
  function buildPlaza() {
    const disk = new THREE.Mesh(new THREE.CircleGeometry(13, 32), material(0xd8d7cd)); disk.rotation.x = -Math.PI / 2; disk.position.y = .075; disk.receiveShadow = true; world.add(disk);
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = 10 + (i % 2) * 1.3; const tile = box(Math.sin(a) * r, .12, Math.cos(a) * r, 2.7, .12, 1.8, i % 2 ? 0xbcc1bd : 0xcbd0ca, { cast: false }); tile.rotation.y = a; }
    cylinder(0, .45, 0, 4.3, 4.5, .9, 0xb4bcc0, 16, { cast: false });
    cylinder(0, .92, 0, 3.55, 3.7, .25, 0x64c9e9, 20, { cast: false });
    cylinder(0, 2, 0, .5, .8, 3.1, 0xd9dedc, 10); cylinder(0, 3.35, 0, 1.4, .35, .25, 0xb7c0c4, 12);
    const water = cylinder(0, 3.65, 0, .3, .3, .7, 0x8de9ff, 9); animated.push({ type: "water", mesh: water, baseY: 3.65 });
    label("ACHIEVEMENT PLAZA", 0, 7.3, 0, 6.4, "#ffe16a");
    addInteraction("plaza-board", -8.7, 1.5, "View career milestones", "achievements", null, 3.2);
    const board = box(-9, 2.3, 1.7, 4.3, 3.5, .4, 0x176fa7, { solid: true }); box(-10.5, .7, 1.7, .22, 1.4, .22, 0x40505a); box(-7.5, .7, 1.7, .22, 1.4, .22, 0x40505a); label("MILESTONES", -9, 2.7, 1.42, 3.2, "#ffffff");
    buildNPC(8.4, 1.5);
    bench(-8.5, -6.5, .7); bench(8.5, 6.5, -2.4); lamp(-11, -4); lamp(11, 4); lamp(-4, 11); lamp(4, -11);
    regions.push({ name: "Achievement Plaza", x: 0, z: 0, r: 16 });
  }
  function buildNPC(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
    box(0, 3.9, 0, 1.4, 1.4, 1.25, CONTENT.avatar.skin, { parent: g }); box(0, 2.55, 0, 1.7, 1.45, .95, CONTENT.avatar.shirt, { parent: g });
    box(-.5, 1.25, 0, .62, 1.25, .7, CONTENT.avatar.pants, { parent: g }); box(.5, 1.25, 0, .62, 1.25, .7, CONTENT.avatar.pants, { parent: g });
    box(0, 4.65, 0, 1.55, .3, 1.35, CONTENT.avatar.hair, { parent: g });
    label("MINI NHI", x, 6.1, z, 3.2, "#ffffff"); addInteraction("npc", x, z, "Talk to Mini Nhi", "npc", null, 3.1);
  }
  function shell(x, z, w, d, wall, roofColor, name, front = "south") {
    box(x, .14, z, w - .6, .28, d - .6, 0xeadfc8, { cast: false });
    box(x - w / 2, 4.3, z, .65, 8.6, d, wall, { solid: true }); box(x + w / 2, 4.3, z, .65, 8.6, d, wall, { solid: true });
    const backZ = front === "south" ? z - d / 2 : z + d / 2, frontZ = front === "south" ? z + d / 2 : z - d / 2;
    box(x, 4.3, backZ, w, 8.6, .65, wall, { solid: true });
    box(x - w * .34, 4.3, frontZ, w * .32, 8.6, .65, wall, { solid: true }); box(x + w * .34, 4.3, frontZ, w * .32, 8.6, .65, wall, { solid: true }); box(x, 7.25, frontZ, w * .36, 2.7, .65, wall, { solid: true });
    roof(x, 10.2, z, w + 2, d + 2, 4.4, roofColor); label(name, x, 8, frontZ + (front === "south" ? .5 : -.5), Math.min(w * .55, 7), "#ffffff");
    return { frontZ, backZ };
  }
  function buildHouse() {
    const x = -33, z = -33, s = shell(x, z, 24, 20, 0xf08c83, 0xcc4d56, "NHI'S HOUSE", "south");
    door(x, s.frontZ + .25, 0x58a8bf, "south"); windowBox(x - 6.9, 4.8, s.frontZ + .36, 3.5, 2.6); windowBox(x + 6.9, 4.8, s.frontZ + .36, 3.5, 2.6);
    windowBox(x - 11.68, 4.7, z, 3.3, 2.5, "x");
    box(x - 6.4, .65, z + 4, 6, 1.15, 2.6, 0x56a4b8, { solid: true }); box(x - 6.4, 1.8, z + 5, 6, 1.4, .65, 0x367889);
    box(x + 5.6, 1.25, z - 4.8, 5.5, 2.5, 2.2, 0x9b6b3f, { solid: true }); box(x + 5.6, 3.35, z - 5.6, 2.7, 2.1, .3, 0x283d4b); box(x + 5.6, 3.35, z - 5.42, 2.35, 1.7, .12, 0x5dc8e6, { cast: false });
    box(x + 5.6, 2.15, z - 3.95, .45, .25, 1.2, 0xe8e4d8); box(x + 5.6, .7, z - 2.7, 2.2, 1.3, 2.2, 0x3d6b87);
    const picColors = [0x3a86ff, 0xffc857, 0x74bf5d]; [-4, 0, 4].forEach((o, i) => { box(x + o, 5.2, z - 9.55, 2.7, 2.4, .16, 0xf5ead8); box(x + o, 5.2, z - 9.44, 2.2, 1.9, .12, picColors[i], { cast: false }); });
    buildCat(x - 1, z + 2.2);
    addInteraction("house-enter", x, s.frontZ + 2.8, "Enter Nhi's House", "intro", null, 3.2);
    addInteraction("house-photos", x, z - 7.6, "Inspect the picture wall", "intro", null, 3.3);
    addInteraction("house-desk", x + 5.5, z - 3.8, "Inspect Nhi's desk", "current", null, 3.3);
    addInteraction("house-cat", x - 1, z + 2.2, "Say hello to the cat", "cat", null, 3.2);
    fence(-44, -45, 7, "x"); [ [-43,-22],[-40,-18],[-22,-43],[-19,-39] ].forEach((p) => bush(p[0],p[1],0x6db24f));
    regions.push({ name: "Nhi's House", x, z, r: 16, visit: "house" });
  }
  function buildCat(x, z) {
    const g = new THREE.Group(); g.position.set(x, .3, z); world.add(g);
    box(0, .85, 0, 1.55, .8, .65, 0xe49a50, { parent: g }); box(.72, 1.28, 0, .72, .72, .7, 0xefaa61, { parent: g });
    const ear = new THREE.ConeGeometry(.22, .45, 4); const e1 = new THREE.Mesh(ear, material(0xe49a50)), e2 = e1.clone(); e1.position.set(.5,1.76,-.2); e2.position.set(.95,1.76,-.2); g.add(e1,e2);
    const tail = box(-.95, 1.15, 0, 1.05, .18, .18, 0xe49a50, { parent: g }); tail.rotation.z = .6; animated.push({ type: "tail", mesh: tail });
  }
  function bookshelf(x, z, ry, shelf) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
    box(0, 3.05, 0, 4.2, 5.8, .7, 0x744b2d, { parent: g });
    [1,2.25,3.5,4.75].forEach((y, row) => { box(0, y, -.42, 4.35, .18, .9, 0x4f321f, { parent: g }); for(let i=-4;i<=4;i++){ box(i*.38, y+.45, -.5, .28, .78+(i%2)*.12, .45, [0x3a86ff,0xe84a5f,0xf4bd3c,0x4faf70][(i+row+8)%4], { parent:g }); } });
    label(shelf.title, x, 6.45, z, 3.4, shelf.color); addInteraction(`shelf-${shelf.id}`, x, z, `Browse ${shelf.title}`, "library", shelf, 3.4);
  }
  function buildLibrary() {
    const x = 33, z = -33, s = shell(x, z, 26, 22, 0xf2c861, 0x1686bd, "LIBRARY", "south");
    door(x, s.frontZ + .25, 0x34516a, "south"); windowBox(x - 7.5, 4.7, s.frontZ + .36, 4, 2.8); windowBox(x + 7.5, 4.7, s.frontZ + .36, 4, 2.8);
    const shelves = CONTENT.library || [];
    shelves.slice(0,4).forEach((sh, i) => bookshelf(x - 8.5 + i * 5.65, z - 6, 0, sh));
    shelves.slice(4).forEach((sh, i) => bookshelf(x - 5.7 + i * 5.7, z + 4.8, Math.PI, sh));
    box(x, .75, z - .2, 5.5, 1.4, 2.4, 0x2d728f, { solid: true }); label("CHECKOUT", x, 2, z - .2, 3.2, "#ffffff");
    addInteraction("library-enter", x, s.frontZ + 3, "Enter the Library", "libraryIndex", null, 3.2);
    bench(25, -18, .4); tree(46, -19, 1.05); bush(20,-43); bush(45,-43);
    regions.push({ name: "Library", x, z, r: 17, visit: "library" });
  }
  function projectStation(x, z, p, i) {
    box(x, .75, z, 5, 1.5, 3.2, 0x5c6870, { solid: true }); box(x, 2.55, z - .8, 3.6, 2.2, .35, p.color); box(x, 2.55, z - .58, 3.1, 1.7, .08, 0x163343, { cast: false });
    label(`${i + 1}. ${p.title}`, x, 4.45, z, 4.6, "#ffffff"); addInteraction(`project-${i}`, x, z + 1.3, `Inspect ${p.title}`, "project", p, 3.7);
  }
  function buildGarage() {
    const x = -33, z = 33, s = shell(x, z, 27, 22, 0xf29c47, 0x5a6872, "PROJECT GARAGE", "north");
    door(x, s.frontZ - .25, 0x3d5968, "north");
    box(x, 4, s.frontZ - .38, 9.2, 5.8, .3, 0x7e929c); for(let i=-3;i<=3;i++) box(x+i*1.25,4,s.frontZ-.58,.12,5.2,.16,0x53646e);
    const pos = [[x-7, z-5],[x+7,z-5],[x-7,z+4.3],[x+7,z+4.3]]; CONTENT.projects.forEach((p,i)=>projectStation(pos[i][0],pos[i][1],p,i));
    box(x-11.5,1.5,z+8.5,2.2,3,2.2,0x3d4950); box(x-11.5,3.25,z+8.5,2.5,.3,2.5,0xffca3a);
    addInteraction("garage-enter", x, s.frontZ - 3, "Enter the Project Garage", "projects", null, 3.2);
    lamp(-19, 20); tree(-48, 20, 1.05); bush(-45,45); fence(-46,46,7,"x");
    regions.push({ name: "Project Garage", x, z, r: 17, visit: "garage" });
  }
  function paperStation(x,z,p,i) {
    box(x,.85,z,5.8,1.55,3.4,0xd9e3e7,{solid:true}); box(x,3,z-.9,4.1,3.3,.3,i?0x2ec4b6:0x3a86ff); label(`PAPER ${i+1}`,x,5.15,z,3.5,"#ffffff"); addInteraction(`paper-${i}`,x,z+1.1,`Inspect paper ${i+1}`,"paper",p,3.8);
  }
  function buildHypergraph(x,z) {
    const g = new THREE.Group(); g.position.set(x,0,z); world.add(g);
    box(0,.45,0,8,.8,6,0x203c4c,{parent:g,solid:false});
    const pts=[[-2.6,-1.5],[0,-2],[2.6,-1.2],[-2,1.5],[.5,1.3],[2.7,1.6]];
    pts.forEach((p,i)=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8),material([0xff6577,0xffc53d,0x2ec4b6][i%3]));m.position.set(p[0],1.4,p[1]);m.castShadow=true;g.add(m); });
    [[0,1],[1,2],[0,3],[3,4],[4,5],[2,5],[1,4]].forEach(e=>{ const a=new THREE.Vector3(pts[e[0]][0],1.4,pts[e[0]][1]),b=new THREE.Vector3(pts[e[1]][0],1.4,pts[e[1]][1]); const d=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);const line=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,d.length(),6),material(0x8be5f7));line.position.copy(mid);line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());g.add(line); });
    label("HYPERGRAPH CONSOLE",x,4.7,z,5.2,"#ffffff"); addInteraction("hypergraph",x,z+2,"Use the hypergraph console","puzzle",null,4.3);
  }
  function buildLab() {
    const x=33,z=33,s=shell(x,z,27,22,0xbfdfe0,0x23879b,"RESEARCH LAB","north"); door(x,s.frontZ-.25,0x2c8196,"north");
    windowBox(x-7.4,4.7,s.frontZ-.36,4.3,2.8); windowBox(x+7.4,4.7,s.frontZ-.36,4.3,2.8);
    paperStation(x-7,z+4.8,CONTENT.papers[0],0); paperStation(x+7,z+4.8,CONTENT.papers[1],1); buildHypergraph(x,z-5.2);
    addInteraction("lab-enter",x,s.frontZ-3,"Enter the Research Lab","papers",null,3.2);
    tree(48,20,.95,0x4ba99d); bush(20,45,0x4fae71); lamp(20,22);
    regions.push({ name:"Research Lab",x,z,r:17,visit:"lab" });
  }
  function buildGardenShortcut() {
    const stones=[[-55,4],[-58,8],[-56,12],[-59,16],[-56,20]]; stones.forEach((p,i)=>{ const s=box(p[0],.25+i*.16,p[1],2.5,.5,2.2,i%2?0xbcc2bd:0xd4d6cf,{solid:false});s.rotation.y=i*.45; });
    label("GARDEN SHORTCUT",-56,3.7,20,4.7,"#fff6c6"); addInteraction("secret",-56,20,"Inspect the garden shortcut","secret",null,4);
    tree(-61,8,1.15);tree(-61,19,.9); [3,8,13,18].forEach((v,i)=>addFlower(-52.5-(i%2),v,[0xff5d73,0xffd34d,0x8c69d8][i%3]));
  }
  function buildWorld() {
    scene.add(new THREE.HemisphereLight(0xcff4ff,0x5f7045,.78));
    const sun=new THREE.DirectionalLight(0xfff3d5,1.18);sun.position.set(-35,70,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;sun.shadow.bias=-.0005;scene.add(sun);
    buildGround();buildPlaza();buildHouse();buildLibrary();buildGarage();buildLab();buildGardenShortcut();
    const treePositions=[[-52,-48],[-38,-54],[-18,-50],[18,-51],[39,-54],[54,-45],[-53,-28],[-55,37],[-40,55],[-18,52],[18,53],[40,55],[54,43],[55,-25],[-16,-16],[16,-16],[-16,16],[16,16]];
    treePositions.forEach((p,i)=>tree(p[0],p[1],.75+(i%3)*.12,i%4===0?0x4fae85:0x58ad4d));
    [[-12,-4],[12,4],[-5,-12],[5,12],[-27,-10],[27,-10],[-27,10],[27,10],[-49,-5],[49,6],[-12,48],[10,-48],[45,-14],[-44,27]].forEach(p=>addCoin(p[0],p[1]));
    [[-13,-13],[13,-13],[-13,13],[13,13],[-50,0],[50,0],[0,-50],[0,50]].forEach(p=>lamp(p[0],p[1]));
    for(let i=-60;i<=60;i+=6){ if(Math.abs(i)>12){ addFlower(i,-60,i%12===0?0xff6577:0xffd34d);addFlower(i,60,i%12===0?0x9a75db:0xffffff); } }
  }

  function createAvatar() {
    const g=new THREE.Group();
    const part=(x,y,z,w,h,d,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
    part(0,3.9,0,1.45,1.45,1.35,CONTENT.avatar.skin);part(0,2.55,0,1.7,1.4,1.05,CONTENT.avatar.shirt);part(-.48,1.15,0,.68,1.45,.82,CONTENT.avatar.pants);part(.48,1.15,0,.68,1.45,.82,CONTENT.avatar.pants);part(-1.05,2.65,0,.42,1.4,.55,CONTENT.avatar.skin);part(1.05,2.65,0,.42,1.4,.55,CONTENT.avatar.skin);
    part(0,4.62,0,1.58,.3,1.45,CONTENT.avatar.hair);part(-.68,4.18,0,.22,.8,1.4,CONTENT.avatar.hair);part(.68,4.18,0,.22,.8,1.4,CONTENT.avatar.hair);
    const face=part(0,3.92,.69,.48,.15,.03,0x5e3c35);face.position.y=3.65;
    g.position.set(0,.05,9);scene.add(g);return g;
  }
  const avatar=createAvatar(); let vy=0, grounded=true, walkTime=0;

  function reward(key,xp=0,coinsAdd=0){ if(S.rewarded.includes(key))return;S.rewarded.push(key);S.xp+=xp;S.coins+=coinsAdd;saveState();updateHUD();if(xp||coinsAdd)toast(`+${xp} XP${coinsAdd?` · +${coinsAdd} NhiCoins`:""}`); }
  function unlock(id){ if(S.badges.includes(id))return;const b=BADGES.find(x=>x.id===id);if(!b)return;S.badges.push(id);S.xp+=100;saveState();updateHUD();beep(720,.12);$("badgePop").innerHTML=`<strong>BADGE UNLOCKED</strong><b>${b.icon} ${b.name}</b><div>${b.desc}</div>`;$("badgePop").classList.add("show");clearTimeout(badgeTimer);badgeTimer=setTimeout(()=>$("badgePop").classList.remove("show"),3500); }
  function updateHUD(){ const level=Math.floor(S.xp/300)+1,current=S.xp%300;$("hudName").textContent=CONTENT.username;$("hudLv").textContent=`Lv ${String(level).padStart(2,"0")}`;$("xpText").textContent=`${current} / 300 XP`;$("xpFill").style.width=`${current/3}%`;$("coinCount").textContent=`${S.coins} NhiCoins`;$("badgeBtn").textContent=`Badges ${S.badges.length}/${BADGES.length}`; }
  function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2200);}
  function beep(freq=420,dur=.06){ if(!soundOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="square";g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch(_){} }
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function safeUrl(url){return /^https:\/\//.test(url||"")?url:"#";}
  function tags(items){return `<div class="tag-list">${items.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`;}
  function panel(title,kicker,body){panelOpen=true;keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=false;$("panel").innerHTML=`<article class="panel-card" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="card-head"><span class="eyebrow">${esc(kicker)}</span><button class="close" type="button" aria-label="Close">×</button></header><div class="panel-body">${body}</div></article>`;$("panel").hidden=false;$("panel").querySelector(".close").onclick=closePanel;$("panel").onclick=e=>{if(e.target===$("panel"))closePanel();};$("panel").querySelector(".close").focus();}
  function closePanel(){panelOpen=false;$("panel").hidden=true;canvas.focus();}
  function openInfo(type,data){
    if(type==="intro")panel("Nhi's House","ABOUT NHI",`<h2>${esc(CONTENT.displayName)}</h2><p class="meta">${esc(CONTENT.role)} · Chicago</p><p>${esc(CONTENT.about)}</p><h3>Education</h3><div class="data-list">${CONTENT.education.map(e=>`<div class="data-item"><strong>${esc(e.full)}</strong><small>${esc(e.degree)} · ${esc(e.years)}</small></div>`).join("")}</div>`);
    else if(type==="current")panel("Desk Console","CURRENT WORK",`<h2>What's on Nhi's desk?</h2><p>The desk connects Nhi's research interests with her latest applied builds. Everything shown here comes from the portfolio data.</p><div class="data-list"><div class="data-item"><strong>Research</strong><small>${esc(CONTENT.papers[0].title)}</small></div>${CONTENT.projects.slice(0,2).map(p=>`<div class="data-item"><strong>${esc(p.title)}</strong><small>${esc(p.tag)}</small></div>`).join("")}</div>`);
    else if(type==="cat"){unlock("cat");reward("cat",40,2);const known=!String(CONTENT.personal.catName).startsWith("[");panel("Resident Cat","NHI'S HOUSE",`<h2>${known?esc(CONTENT.personal.catName):"The resident cat"}</h2><p>${known?esc(CONTENT.personal.catBlurb):"Nhi can personalize this cat's name and story later. For now, it is very good at supervising research."}</p><p class="meta">Badge earned: Cat Person</p>`);}
    else if(type==="libraryIndex")panel("Library","SUBJECT DIRECTORY",`<h2>Choose a shelf</h2><p>Walk up to a labeled shelf and press <b>E</b>. Notes are data-driven; empty shelves are honestly marked instead of linking to fake files.</p>${tags((CONTENT.library||[]).map(x=>x.title))}`);
    else if(type==="library"){const notes=data.notes||[];panel(data.title,"LIBRARY SHELF",`<h2>${esc(data.title)}</h2>${notes.length?`<div class="data-list">${notes.map(n=>`<div class="data-item"><strong>${esc(n.title)}</strong></div>`).join("")}</div>`:`<p>No public notes are linked to this shelf yet.</p><p class="meta">The shelf is ready for real notes whenever Nhi adds them to content.js.</p>`}`);}
    else if(type==="projects")panel("Project Garage","CREATION DIRECTORY",`<h2>${CONTENT.projects.length} working stations</h2><p>Each station is connected to a real project from Nhi's existing portfolio. Walk up to a screen and press <b>E</b> to inspect it.</p>${tags(CONTENT.projects.map(p=>p.title))}`);
    else if(type==="project"){panel(data.title,"PROJECT STATION",`<h2>${esc(data.title)}</h2><p class="meta">${esc(data.tag)}</p><p>${esc(data.desc)}</p>${tags(data.stack)}<div class="panel-actions"><a class="repo-link" href="${safeUrl(data.github)}" target="_blank" rel="noopener noreferrer">Open GitHub ↗</a></div>`);setTimeout(()=>{const l=$("panel").querySelector(".repo-link");if(l)l.onclick=()=>{unlock("github");reward("github",60,0);};},0);}
    else if(type==="papers")panel("Research Lab","PUBLICATION DIRECTORY",`<h2>${CONTENT.papers.length} research stations</h2><p>Inspect a paper console or use the hypergraph table to solve a small independent-set puzzle.</p>${tags(CONTENT.papers.map(p=>p.venue))}`);
    else if(type==="paper"){unlock("paper");reward(`paper:${data.title}`,75,1);panel(data.title,"RESEARCH PAPER",`<h2>${esc(data.title)}</h2><p class="meta">${esc(data.venue)} · ${esc(data.year)}</p><p><b>Authors:</b> ${esc(data.authors)}</p><h3>Problem</h3><p>${esc(data.problem)}</p><h3>Why it matters</h3><p>${esc(data.why)}</p><h3>Result</h3><p>${esc(data.found)}</p><div class="panel-actions"><a href="${safeUrl(data.link)}" target="_blank" rel="noopener noreferrer">Read paper ↗</a></div>`);}
    else if(type==="npc"){unlock("npc");reward("npc",35,1);panel("Mini Nhi","ACHIEVEMENT PLAZA",`<h2>${esc(CONTENT.npc.greeting)}</h2><div class="data-list">${CONTENT.npc.topics.map((q,i)=>`<button class="data-item npc-q" data-i="${i}" type="button"><strong>${esc(q.q)}</strong><small>Ask this question</small></button>`).join("")}</div><p id="npcAnswer" class="meta"></p>`);$("panel").querySelectorAll(".npc-q").forEach(b=>b.onclick=()=>{$("npcAnswer").textContent=CONTENT.npc.topics[+b.dataset.i].a;});}
    else if(type==="achievements")panel("Career Milestones","ACHIEVEMENT PLAZA",`<h2>Completed quests</h2><div class="data-list">${CONTENT.careerQuests.map(q=>`<div class="quest"><span><strong>${esc(q.name)}</strong><small>${esc(q.note)}</small></span><b>${q.status==="done"?"COMPLETE":"IN PROGRESS"}<br>+${q.xp} XP</b></div>`).join("")}</div>`);
    else if(type==="quests")panel("Town Quests","QUEST LOG",questHtml());
    else if(type==="badges")panel("Badge Collection","PLAYER PROGRESS",`<h2>${S.badges.length} / ${BADGES.length} unlocked</h2><div class="badge-grid">${BADGES.map(b=>`<div class="badge ${S.badges.includes(b.id)?"got":""}"><i>${b.icon}</i><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></div>`).join("")}</div>`);
    else if(type==="puzzle")openPuzzle();
    else if(type==="secret"){unlock("obby");reward("secret",80,4);panel("Garden Shortcut","SECRET FOUND",`<h2>You found the quiet route.</h2><p>This little stepping-stone trail is a preserved nod to the original world's obstacle badge.</p><p class="meta">Shortcut Finder badge unlocked.</p>`);}
  }
  function questHtml(){const all=S.visited.filter(x=>["house","library","garage","lab"].includes(x)).length;return `<h2>Active quests</h2><div class="quest"><span><strong>Tour the whole town</strong><small>Visit House, Library, Garage, and Lab</small></span><b>${all}/4</b></div><div class="quest"><span><strong>Collect ten NhiCoins</strong><small>Look beside paths and buildings</small></span><b>${Math.min(S.coins,10)}/10</b></div><div class="quest"><span><strong>Solve the hypergraph</strong><small>Use the console in the Research Lab</small></span><b>${S.puzzle?"DONE":"OPEN"}</b></div>`;}
  function openPuzzle(){panel("Hypergraph Console","RESEARCH LAB",`<h2>Build an independent set</h2><p>Select exactly three vertices without selecting every vertex in any highlighted hyperedge: {1,2,3}, {2,4,5}, or {1,5,6}.</p><div class="puzzle"><div class="puzzle-graph">${[[12,20],[43,10],[75,23],[20,65],[52,62],[80,70]].map((p,i)=>`<button class="node" style="left:${p[0]}%;top:${p[1]}%" data-i="${i}" type="button">${i+1}</button>`).join("")}</div><p class="puzzle-status" id="puzzleStatus">0 / 3 selected</p></div>`);const chosen=new Set(),edges=[[0,1,2],[1,3,4],[0,4,5]];$("panel").querySelectorAll(".node").forEach(n=>n.onclick=()=>{const i=+n.dataset.i;if(chosen.has(i)){chosen.delete(i);n.classList.remove("active");}else if(chosen.size<3){chosen.add(i);n.classList.add("active");}const bad=edges.some(e=>e.every(v=>chosen.has(v)));$("puzzleStatus").textContent=bad?"That completes a hyperedge—swap one vertex.":`${chosen.size} / 3 selected`;if(chosen.size===3&&!bad){S.puzzle=true;saveState();unlock("puzzle");reward("puzzle",150,5);$("puzzleStatus").textContent="Solved! This set contains no complete hyperedge.";}});}

  function interact(){if(activeInteraction&&!panelOpen){beep();openInfo(activeInteraction.type,activeInteraction.payload);}}
  function updateInteraction(){let best=null,bestD=Infinity;interactions.forEach(i=>{const d=Math.hypot(avatar.position.x-i.x,avatar.position.z-i.z);if(d<i.radius&&d<bestD){best=i;bestD=d;}});activeInteraction=best;$("interactPrompt").hidden=!best;$("interactText").textContent=best?best.label:"Interact";}
  function blocked(x,z){const r=.72;if(x<-64+r||x>64-r||z<-64+r||z>64-r)return true;return colliders.some(c=>x+r>c.minX&&x-r<c.maxX&&z+r>c.minZ&&z-r<c.maxZ);}
  function updatePlayer(dt){if(!playing||panelOpen)return;let ix=(keys.KeyD?1:0)-(keys.KeyA?1:0),iz=(keys.KeyW?1:0)-(keys.KeyS?1:0);if(joyVec.x||joyVec.y){ix=joyVec.x;iz=-joyVec.y;}const len=Math.hypot(ix,iz);if(len){ix/=len;iz/=len;const fX=-Math.sin(camYaw),fZ=-Math.cos(camYaw),rX=Math.cos(camYaw),rZ=-Math.sin(camYaw),dx=(rX*ix+fX*iz)*8.5*dt,dz=(rZ*ix+fZ*iz)*8.5*dt;let nx=avatar.position.x+dx,nz=avatar.position.z;if(!blocked(nx,nz))avatar.position.x=nx;nx=avatar.position.x;nz=avatar.position.z+dz;if(!blocked(nx,nz))avatar.position.z=nz;avatar.rotation.y=Math.atan2(dx,dz);walkTime+=dt*11;avatar.position.y=.05+Math.abs(Math.sin(walkTime))*.09;}else if(grounded)avatar.position.y=.05;vy-=22*dt;avatar.position.y+=vy*dt;if(avatar.position.y<=.05){avatar.position.y=.05;vy=0;grounded=true;} }
  function jump(){if(playing&&!panelOpen&&grounded){vy=8.8;grounded=false;beep(260,.05);}}
  function updateWorld(t){coins.forEach(c=>{if(!c.g.visible)return;c.g.rotation.y=t*2.4;c.g.position.y=c.base+Math.sin(t*3+c.base)*.22;const d=Math.hypot(avatar.position.x-c.g.position.x,avatar.position.z-c.g.position.z);if(playing&&d<1.55){c.g.visible=false;S.coins++;S.rewarded.push(`coin:${c.id}`);S.xp+=10;saveState();updateHUD();toast("+1 NhiCoin · +10 XP");beep(900,.05);if(S.coins>=10)unlock("coins");}});animated.forEach(a=>{if(a.type==="water"){a.mesh.position.y=a.baseY+Math.sin(t*3)*.18;a.mesh.rotation.y=t;}else if(a.type==="tail")a.mesh.rotation.z=.55+Math.sin(t*4)*.35;});let nearest="Town Road",nd=Infinity;regions.forEach(r=>{const d=Math.hypot(avatar.position.x-r.x,avatar.position.z-r.z);if(d<r.r&&d<nd){nearest=r.name;nd=d;if(playing&&r.visit&&!S.visited.includes(r.visit)){S.visited.push(r.visit);reward(`visit:${r.visit}`,50,1);toast(`${r.name} discovered · +50 XP`);}}});$("locationName").textContent=nearest;const visits=["house","library","garage","lab"].filter(x=>S.visited.includes(x));if(visits.length===4)unlock("explorer");updateInteraction();}
  function updateCamera(dt){const target=playing?new THREE.Vector3(avatar.position.x,avatar.position.y+2.5,avatar.position.z):new THREE.Vector3(0,3,0);const dist=playing?camDist:79,pitch=playing?camPitch:.58,yaw=playing?camYaw:-.7;const desired=new THREE.Vector3(target.x+Math.sin(yaw)*Math.cos(pitch)*dist,target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(target);}
  function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;updatePlayer(dt);updateWorld(t);updateCamera(dt);renderer.render(scene,camera);}

  const joyVec={x:0,y:0};let joyPointer=null;
  function joyMove(e){const el=$("joy"),r=el.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=29,d=Math.max(1,Math.hypot(dx,dy)),m=Math.min(max,d);joyVec.x=dx/d*(m/max);joyVec.y=dy/d*(m/max);$("knob").style.transform=`translate(${joyVec.x*max}px,${joyVec.y*max}px)`;}
  $("joy").addEventListener("pointerdown",e=>{joyPointer=e.pointerId;$("joy").setPointerCapture(e.pointerId);joyMove(e);});$("joy").addEventListener("pointermove",e=>{if(e.pointerId===joyPointer)joyMove(e);});$("joy").addEventListener("pointerup",e=>{if(e.pointerId===joyPointer){joyPointer=null;joyVec.x=joyVec.y=0;$("knob").style.transform="";}});
  let dragging=false,lastX=0,lastY=0;
  canvas.addEventListener("pointerdown",e=>{if(e.pointerType!=="touch"||e.clientX>120){dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener("pointermove",e=>{if(!dragging||panelOpen)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;camYaw-=dx*.006;camPitch=Math.max(.16,Math.min(1.05,camPitch+dy*.004));});canvas.addEventListener("pointerup",()=>dragging=false);canvas.addEventListener("wheel",e=>{camDist=Math.max(9,Math.min(29,camDist+e.deltaY*.012));e.preventDefault();},{passive:false});
  addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(e.code==="Space"&&!e.repeat)jump();if(e.code==="KeyE"&&!e.repeat)interact();if(e.code==="Escape"&&panelOpen)closePanel();});addEventListener("keyup",e=>keys[e.code]=false);addEventListener("resize",resize);
  $("jumpBtn").onclick=jump;$("interactPrompt").onclick=interact;$("questBtn").onclick=()=>openInfo("quests");$("badgeBtn").onclick=()=>openInfo("badges");$("skipBtn").onclick=()=>location.href="../#about";$("soundBtn").onclick=()=>{soundOn=!soundOn;$("soundBtn").textContent=`Sound ${soundOn?"on":"off"}`;if(soundOn)beep();};
  $("playBtn").onclick=()=>{playing=true;$("start").hidden=true;camDist=18;unlock("welcome");reward("first-play",50,2);canvas.focus();toast("Welcome! Follow a path to any building.");};
  $("startName").textContent=CONTENT.displayName;$("startLevel").textContent=`@${CONTENT.username} · ${CONTENT.role}`;$("startTag").textContent=CONTENT.tagline;$("startStats").innerHTML=CONTENT.stats.map(s=>`<div><small>${esc(s.label)}</small><strong>${esc(s.value)}</strong></div>`).join("");
  buildWorld();updateHUD();resize();animate();
})();
