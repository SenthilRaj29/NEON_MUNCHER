import * as THREE from '../node_modules/three/build/three.module.js';

let mapRenderer;
let mapScene;
let mapCamera;
let mapAnimation;
let mapRaycaster;
let mapPointer;
let mapCanvas;
let mapNodes = [];
let mapTarget;
let mapAmbient;
let mapDemo;
let mapDemoCurve;
let mapDemoEnabled = false;
let mapSceneryMaterial;
let cameraDistance = 22;
const cameraYaw = 0;
const cameraPitch = 1.42;
let dragging = false;
let lastPointer = {x:0, y:0};

const palette = {
  water: 0x075b78,
  waterLight: 0x14a9a9,
  island: 0x159878,
  islandTop: 0x38d78c,
  path: 0xffd76a,
  rangeOne: 0xff8a24,
  rangeTwo: 0x35d0ff,
  rangeThree: 0x9b65ff,
  rangeFour: 0xffd23f,
  dangerPath: 0xff2638,
  wood: 0x9a5b2d,
  woodDark: 0x4d2718,
  complete: 0x00eaff,
  current: 0xffd23f,
  boss: 0xff2638,
  locked: 0x4c5872,
  pink: 0xff2fd0
};

const roadmapPatterns = [
  [0, .28, .72, .9, .48, -.12, -.7, -.92, -.5, .18, .78],
  [.78, .45, -.18, -.8, -.58, .08, .82, .64, -.22, -.86, -.35],
  [-.35, -.72, -.42, .2, .82, .7, .08, -.58, -.88, -.3, .52],
  [.52, .86, .62, -.05, -.72, -.9, -.35, .42, .88, .58, -.08],
  [-.08, .48, .92, .56, -.28, -.84, -.68, .12, .8, .74, .2]
];
const roadmapLevelSpacing = 1.65;
const sceneryImageAspect = 739 / 415;
const sceneryPlaneAspect = 72 / 260;
const sceneryRepeatY = sceneryImageAspect / sceneryPlaneAspect;

function levelRangeColor(level){
  if (level <= 10) return palette.rangeOne;
  if (level <= 25) return palette.rangeTwo;
  if (level <= 35) return palette.rangeThree;
  if (level <= 45) return palette.rangeFour;
  return palette.dangerPath;
}

function makeMaterial(color, roughness = .72){
  return new THREE.MeshStandardMaterial({color, roughness, metalness:.12, emissive:color, emissiveIntensity:.08});
}

function makeLevelTexture(level, state){
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = state === 'current' ? '#fff3a2' : '#ffffff';
  context.font = 'bold 148px Arial';
  context.lineWidth = 14;
  context.strokeStyle = '#020a12';
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.strokeText(String(level), 256, 132);
  context.fillText(String(level), 256, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  return texture;
}

function makeSignTexture(text){
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffd23f';
  context.font = 'bold 42px Arial';
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeMarker(level, state, isBoss){
  const isFinal = level === 50;
  const color = isBoss || isFinal ? palette.boss : state === 'current' ? palette.current : state === 'complete' ? levelRangeColor(level) : palette.locked;
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.82, 1.02, .24, 32), makeMaterial(0x718397));
  base.position.y = .12;
  group.add(base);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.7, .78, .18, 32), makeMaterial(color));
  plate.position.y = .32;
  group.add(plate);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({map:makeLevelTexture(level, state), transparent:true, depthTest:false}));
  label.position.y = .72;
  label.scale.set(2.45, 1.225, 1);
  group.add(label);
  if (state === 'complete' || state === 'current'){
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.94, .045, 8, 32), new THREE.MeshBasicMaterial({color:isBoss || isFinal ? palette.boss : state === 'current' ? palette.current : palette.complete}));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .37;
    group.add(ring);
  }
  if (state === 'current'){
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshBasicMaterial({color:palette.pink}));
    beacon.position.y = 1.08;
    group.add(beacon);
    group.userData.beacon = beacon;
  }
  if (isFinal){
    const dangerBeacon = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), new THREE.MeshBasicMaterial({color:palette.boss, transparent:true}));
    dangerBeacon.position.y = 1.08;
    group.add(dangerBeacon);
    group.userData.dangerBeacon = dangerBeacon;
  }
  group.userData.level = level;
  group.userData.state = state;
  group.userData.isFinal = isFinal;
  return group;
}

function makeDemoMarker(){
  const demo = new THREE.Group();
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(.3, 16, 12),
    new THREE.MeshBasicMaterial({color:palette.pink, transparent:true, opacity:.9})
  );
  glow.position.y = .52;
  demo.add(glow);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(.55, .045, 8, 24),
    new THREE.MeshBasicMaterial({color:palette.pink, transparent:true, opacity:.8})
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .08;
  demo.add(ring);
  demo.userData.glow = glow;
  return demo;
}

function updateMarkerState(marker, level, state, isBoss){
  const isFinal = level === 50;
  const color = isBoss || isFinal ? palette.boss : state === 'current' ? palette.current : state === 'complete' ? levelRangeColor(level) : palette.locked;
  marker.userData.state = state;
  marker.userData.isFinal = isFinal;
  marker.scale.setScalar(state === 'current' ? 1.12 : 1);
  const plate = marker.children[1];
  if (plate?.material?.color){
    plate.material.color.setHex(color);
    plate.material.emissive.setHex(color);
    plate.material.emissiveIntensity = state === 'locked' ? .02 : .16;
  }
  const label = marker.children[2];
  if (label?.material) {
    label.material.map = makeLevelTexture(level, state);
    label.material.needsUpdate = true;
  }
}

function makeIsland(x, z, scale, rotation){
  const group = new THREE.Group();
  group.position.set(x, -.05, z);
  group.rotation.y = rotation;
  group.scale.set(scale, scale, scale);
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.85, .42, 9), makeMaterial(0x176275));
  cliff.position.y = -.15;
  group.add(cliff);
  const land = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.65, .28, 9), makeMaterial(palette.island));
  land.position.y = .12;
  group.add(land);
  const bush = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), makeMaterial(palette.islandTop));
  bush.position.set(-.45, .55, .2);
  group.add(bush);
  return group;
}

function makeWoodenBridge(start, end){
  const bridge = new THREE.Group();
  const midpoint = start.clone().add(end).multiplyScalar(.5);
  const direction = end.clone().sub(start);
  const length = Math.max(1.2, Math.hypot(direction.x, direction.z) + .55);
  bridge.position.set(midpoint.x, -.3, midpoint.z);
  bridge.rotation.y = Math.atan2(-direction.z, direction.x);

  for (let index = -2; index <= 2; index++){
    const plank = new THREE.Mesh(new THREE.BoxGeometry(length / 4.2, .14, 1.05), makeMaterial(palette.wood, .9));
    plank.position.set(index * length / 5.2, .04, 0);
    plank.rotation.y = (index % 2 ? .025 : -.025);
    bridge.add(plank);
  }
  [-.58, .58].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, .1, .08), makeMaterial(palette.woodDark, .95));
    rail.position.set(0, .47, x);
    bridge.add(rail);
    const postCount = Math.max(2, Math.ceil(length / 1.2));
    for (let index = 0; index <= postCount; index++){
      const post = new THREE.Mesh(new THREE.BoxGeometry(.09, .55, .09), makeMaterial(palette.woodDark, .95));
      post.position.set(-length / 2 + index * length / postCount, .25, x);
      bridge.add(post);
    }
  });
  mapScene.add(bridge);
}

function makeKingdom(destination){
  const kingdom = new THREE.Group();
  kingdom.position.set(destination.x, -.28, destination.z - 3.8);
  const texture = new THREE.TextureLoader().load('assets/Castle.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const image = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 7.6), new THREE.MeshBasicMaterial({map:texture, side:THREE.DoubleSide}));
  image.rotation.x = -Math.PI / 2;
  kingdom.add(image);
  const frameMaterial = new THREE.MeshBasicMaterial({color:palette.pink, transparent:true, opacity:.85});
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(14.1, 8.2), frameMaterial);
  frame.rotation.x = -Math.PI / 2;
  frame.position.y = -.02;
  frame.position.z = .02;
  kingdom.add(frame);
  const entrance = new THREE.Mesh(new THREE.RingGeometry(.8, .94, 24), new THREE.MeshBasicMaterial({color:palette.current, transparent:true, opacity:.9}));
  entrance.rotation.x = -Math.PI / 2;
  entrance.position.set(2.5, .08, 1.35);
  kingdom.add(entrance);
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({map:makeSignTexture('GRAND ENTRANCE'), transparent:true, depthTest:false}));
  sign.position.set(0, .18, -3.15);
  sign.scale.set(4.2, 1.05, 1);
  kingdom.add(sign);
  mapScene.add(kingdom);
}

function addScenicRoadmap(){
  const texture = new THREE.TextureLoader().load('assets/Castle.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  mapSceneryMaterial = new THREE.ShaderMaterial({
    uniforms:{map:{value:texture}, time:{value:0}},
    vertexShader:`
      varying vec2 mapUv;
      void main(){
        mapUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader:`
      uniform sampler2D map;
      uniform float time;
      varying vec2 mapUv;
      void main(){
        vec2 uv = vec2(mapUv.x, fract(mapUv.y * ${sceneryRepeatY.toFixed(4)}));
        float drift = sin(time * .12) * .003;
        uv.x += drift + sin(uv.y * 18.0 + time * .24) * .0015;
        uv.y += cos(uv.x * 14.0 + time * .18) * .0012;
        vec3 color = texture2D(map, uv).rgb;
        float atmosphericDark = smoothstep(.0, .58, 1.0 - mapUv.y) * .48;
        color = mix(color, vec3(.015, .055, .07), atmosphericDark);
        float water = smoothstep(.38, .72, color.b - color.r * .25);
        float shimmer = sin((uv.x + uv.y) * 90.0 + time * 1.8) * .018 * water;
        float light = .98 + sin(time * .16 + uv.x * 4.0) * .035;
        gl_FragColor = vec4(color * light + vec3(shimmer * .2, shimmer * .55, shimmer), 1.0);
      }
    `,
    side:THREE.DoubleSide
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(72, 260), mapSceneryMaterial);
  backdrop.rotation.x = -Math.PI / 2;
  backdrop.position.set(0, -.35, -42);
  mapScene.add(backdrop);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(72, 260), new THREE.MeshBasicMaterial({color:0x041b35, transparent:true, opacity:.18, side:THREE.DoubleSide}));
  veil.rotation.x = -Math.PI / 2;
  veil.position.set(0, -.32, -42);
  mapScene.add(veil);
}

function addOceanDetails(){
  const details = new THREE.Group();
  const rippleMaterial = new THREE.MeshBasicMaterial({color:palette.waterLight, transparent:true, opacity:.28});
  const bubbleMaterial = new THREE.MeshBasicMaterial({color:0x8fffff, transparent:true, opacity:.42});
  for (let index = 0; index < 46; index++){
    const x = ((index * 17) % 31) - 15;
    const z = ((index * 23) % 62) - 30;
    const ripple = new THREE.Mesh(new THREE.RingGeometry(.18 + (index % 3) * .08, .22 + (index % 3) * .08, 16), rippleMaterial);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(x, -.19, z);
    ripple.scale.set(1.8 + (index % 4) * .4, 1, .65 + (index % 3) * .2);
    details.add(ripple);
    if (index % 4 === 0){
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(.07 + (index % 3) * .025, 8, 6), bubbleMaterial);
      bubble.position.set(x + .25, -.05, z + .18);
      bubble.userData.floatOffset = index * .7;
      details.add(bubble);
    }
  }
  for (let index = 0; index < 13; index++){
    const curve = new THREE.EllipseCurve(0, 0, 2.4, .55, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(32).map(point => new THREE.Vector3(point.x, -.16, point.y));
    const wave = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color:palette.cyan || 0x00eaff, transparent:true, opacity:.13}));
    wave.position.set((index % 2 ? -1 : 1) * (index * 1.9 - 10), 0, index * 4.2 - 25);
    wave.userData.baseX = wave.position.x;
    wave.rotation.y = index % 2 ? -.12 : .12;
    details.add(wave);
  }
  mapAmbient = details;
  mapScene.add(details);
}

function addWorldProps(){
  const props = new THREE.Group();
  const rockMaterial = makeMaterial(0x65768b);
  const crystalMaterial = new THREE.MeshStandardMaterial({color:palette.pink, emissive:palette.pink, emissiveIntensity:.7, roughness:.35});
  for (let index = 0; index < 22; index++){
    const x = ((index * 29) % 27) - 13;
    const z = ((index * 19) % 56) - 27;
    const prop = index % 3 === 0
      ? new THREE.Mesh(new THREE.OctahedronGeometry(.22 + (index % 3) * .08), crystalMaterial)
      : new THREE.Mesh(new THREE.DodecahedronGeometry(.2 + (index % 2) * .1, 0), rockMaterial);
    prop.position.set(x, .04, z);
    prop.rotation.set(index * .4, index * .7, index * .2);
    props.add(prop);
  }
  mapScene.add(props);
}

function buildScene(container, levels, unlockedLevel, onSelect){
  container.innerHTML = '';
  mapCanvas = document.createElement('canvas');
  mapCanvas.className = 'adventure-map-canvas';
  container.appendChild(mapCanvas);
  mapRenderer = new THREE.WebGLRenderer({canvas:mapCanvas, antialias:true, alpha:false});
  mapRenderer.setPixelRatio(Math.max(2, Math.min(window.devicePixelRatio, 3)));
  mapRenderer.outputColorSpace = THREE.SRGBColorSpace;
  mapRenderer.setClearColor(0x041b35, 1);
  mapScene = new THREE.Scene();
  mapScene.fog = new THREE.Fog(0x075b78, 28, 52);
  mapCamera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  mapRaycaster = new THREE.Raycaster();
  mapPointer = new THREE.Vector2();
  mapTarget = new THREE.Vector3(0, 0, 0);
  mapNodes = [];

  mapScene.add(new THREE.HemisphereLight(0x9afaff, 0x051126, 3.2));
  const sun = new THREE.DirectionalLight(0xffe5a1, 3.8);
  sun.position.set(-8, 14, 8); mapScene.add(sun);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(55, 65), makeMaterial(palette.water));
  water.rotation.x = -Math.PI / 2; water.position.y = -.42; mapScene.add(water);
  addScenicRoadmap();

  addOceanDetails();
  addWorldProps();

  const points = levels.map((_, index) => {
    const y = 0.1;
    const z = 18 - index * roadmapLevelSpacing;
    const patternIndex = Math.min(Math.floor(index / 10), roadmapPatterns.length - 1);
    const patternStep = index % 10;
    const pattern = roadmapPatterns[patternIndex];
    const x = pattern[patternStep] * 6.2 + Math.sin(index * .23) * .65;
    return new THREE.Vector3(x, y, z);
  });
  const curve = new THREE.CatmullRomCurve3(points);
  mapDemoCurve = curve;
  const gapStart = points[34].clone().lerp(points[35], .24);
  const gapEnd = points[35].clone().lerp(points[34], .24);
  const pathRanges = [
    [1, 10, palette.rangeOne],
    [11, 25, palette.rangeTwo],
    [26, 35, palette.rangeThree, [ ...points.slice(25, 35), gapStart ]],
    [36, 45, palette.rangeFour, [ gapEnd, ...points.slice(35, 45) ]],
    [46, 50, palette.dangerPath]
  ];
  pathRanges.forEach(([firstLevel, lastLevel, color, customPoints]) => {
    const segmentPoints = customPoints || points.slice(firstLevel - 1, lastLevel);
    const segmentCurve = new THREE.CatmullRomCurve3(segmentPoints);
    mapScene.add(new THREE.Mesh(new THREE.TubeGeometry(segmentCurve, Math.max(12, segmentPoints.length * 8), .14, 8, false), new THREE.MeshBasicMaterial({color})));
    mapScene.add(new THREE.Mesh(new THREE.TubeGeometry(segmentCurve, Math.max(12, segmentPoints.length * 8), .28, 8, false), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.18})));
  });
  [10, 45].forEach(level => makeWoodenBridge(points[level - 1], points[level]));
  makeWoodenBridge(gapStart, gapEnd);

  levels.forEach((level, index) => {
    const state = level < unlockedLevel ? 'complete' : level === unlockedLevel ? 'current' : 'locked';
    const marker = makeMarker(level, state, level % 5 === 0);
    marker.position.copy(points[index]);
    marker.userData.worldIndex = index;
    mapScene.add(marker);
    mapNodes.push(marker);
  });
  mapDemoEnabled = unlockedLevel > 1;
  mapDemo = makeDemoMarker();
  mapDemo.visible = mapDemoEnabled;
  mapScene.add(mapDemo);
  mapTarget.set(0, 0, points[Math.min(unlockedLevel - 1, points.length - 1)].z);
  updateCamera();
  mapCanvas.addEventListener('pointerdown', onPointerDown);
  mapCanvas.addEventListener('pointermove', onPointerMove);
  mapCanvas.addEventListener('pointerup', onPointerUp);
  mapCanvas.addEventListener('pointerleave', onPointerUp);
  mapCanvas.addEventListener('wheel', onWheel, {passive:false});
  mapCanvas.addEventListener('click', event => onMapClick(event, onSelect));
  if (mapAnimation) cancelAnimationFrame(mapAnimation);
  animateMap();
}

function updateCamera(){
  if (!mapCamera) return;
  const horizontal = Math.cos(cameraPitch) * cameraDistance;
  mapCamera.position.set(mapTarget.x, mapTarget.y + Math.sin(cameraPitch) * cameraDistance, mapTarget.z + horizontal);
  mapCamera.lookAt(mapTarget);
}

function onPointerDown(event){ dragging = true; lastPointer = {x:event.clientX, y:event.clientY}; mapCanvas.setPointerCapture(event.pointerId); }
function onPointerMove(event){
  if (!dragging) return;
  mapTarget.z = Math.max(-70, Math.min(18, mapTarget.z + (event.clientY - lastPointer.y) * .055));
  lastPointer = {x:event.clientX, y:event.clientY}; updateCamera();
}
function onPointerUp(){ dragging = false; }
function onWheel(event){ event.preventDefault(); cameraDistance = Math.max(12, Math.min(26, cameraDistance + event.deltaY * .018)); updateCamera(); }
function onMapClick(event, onSelect){
  if (Math.abs(event.clientX - lastPointer.x) > 5 || Math.abs(event.clientY - lastPointer.y) > 5) return;
  const rect = mapCanvas.getBoundingClientRect();
  mapPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mapPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  mapRaycaster.setFromCamera(mapPointer, mapCamera);
  const hit = mapRaycaster.intersectObjects(mapNodes, true).find(item => item.object.parent?.userData.level || item.object.userData.level);
  if (!hit) return;
  let marker = hit.object;
  while (marker.parent && !marker.userData.level) marker = marker.parent;
  onSelect(marker.userData.level, marker.userData.state);
}

function animateMap(){
  mapAnimation = requestAnimationFrame(animateMap);
  const time = performance.now() * .002;
  if (mapSceneryMaterial) mapSceneryMaterial.uniforms.time.value = time;
  if (mapAmbient){
    mapAmbient.children.forEach((detail, index) => {
      if (detail.userData.floatOffset !== undefined) detail.position.y = -.05 + Math.sin(time * .8 + detail.userData.floatOffset) * .08;
      if (detail.type === 'Line') detail.position.x = detail.userData.baseX + Math.sin(time * .16 + index) * .18;
      if (detail.geometry?.type === 'RingGeometry') detail.rotation.z = time * .08 + index;
    });
  }
  mapNodes.forEach(node => {
    if (node.userData.state === 'current'){
      const pulse = 1 + Math.sin(time * 2.4) * .08;
      node.scale.setScalar(pulse);
      if (node.userData.beacon) node.userData.beacon.position.y = 1.08 + Math.sin(time * 3) * .12;
    }
    if (node.userData.isFinal){
      const dangerPulse = (Math.sin(time * 5.5) + 1) / 2;
      node.scale.setScalar(.94 + dangerPulse * .18);
      if (node.userData.dangerBeacon){
        node.userData.dangerBeacon.material.opacity = .25 + dangerPulse * .75;
        node.userData.dangerBeacon.scale.setScalar(1 + dangerPulse * .55);
      }
    }
  });
  if (mapDemo?.visible && mapDemoCurve){
    const progress = (time / 24) % 1;
    mapDemo.position.copy(mapDemoCurve.getPointAt(progress));
    mapDemo.userData.glow.position.y = .52 + Math.sin(time * 3.2) * .1;
    mapDemo.children[1].rotation.z = time * 1.4;
  }
  mapRenderer.render(mapScene, mapCamera);
}

function resizeMap(){
  if (!mapCanvas || !mapRenderer || !mapCamera) return;
  const width = mapCanvas.clientWidth;
  const height = mapCanvas.clientHeight;
  if (!width || !height) return;
  mapRenderer.setPixelRatio(Math.max(2, Math.min(window.devicePixelRatio, 3)));
  mapRenderer.setSize(width, height, false);
  mapCamera.aspect = width / height;
  mapCamera.updateProjectionMatrix();
}

window.renderAdventureMap3D = function(container, unlockedLevel, totalLevels, onSelect){
  const levels = Array.from({length:totalLevels}, (_, index) => index + 1);
  if (!mapScene) buildScene(container, levels, unlockedLevel, onSelect);
  else {
    mapTarget.z = 18 - Math.min(unlockedLevel - 1, totalLevels - 1) * roadmapLevelSpacing;
    mapNodes.forEach((node, index) => {
      const state = index + 1 < unlockedLevel ? 'complete' : index + 1 === unlockedLevel ? 'current' : 'locked';
      updateMarkerState(node, index + 1, state, (index + 1) % 5 === 0);
    });
    mapDemoEnabled = unlockedLevel > 1;
    if (mapDemo) mapDemo.visible = mapDemoEnabled;
    updateCamera();
  }
  requestAnimationFrame(resizeMap);
};
window.addEventListener('resize', resizeMap);
