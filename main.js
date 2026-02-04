import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

const container = document.getElementById("scene");
const hint = document.getElementById("hint");

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0f1d10, 10, 140);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0f1d10);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const hemisphere = new THREE.HemisphereLight(0x8ad1ff, 0x1b2d12, 0.6);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);

const groundGeometry = new THREE.PlaneGeometry(240, 240, 32, 32);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b3a1e,
  roughness: 0.9,
  metalness: 0,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a3d25,
  roughness: 1,
});
const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x2e7d32,
  roughness: 0.8,
});

const treeGroup = new THREE.Group();
const treeCount = 160;
for (let i = 0; i < treeCount; i += 1) {
  const trunkHeight = 2 + Math.random() * 3;
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.35, trunkHeight, 6);
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  const canopyHeight = 2.2 + Math.random() * 2.2;
  const canopyGeometry = new THREE.ConeGeometry(1.4, canopyHeight, 8);
  const canopy = new THREE.Mesh(canopyGeometry, leafMaterial);
  canopy.position.y = trunkHeight / 2 + canopyHeight / 2 - 0.4;
  canopy.castShadow = true;

  const tree = new THREE.Group();
  tree.add(trunk, canopy);

  const radius = 20 + Math.random() * 90;
  const angle = Math.random() * Math.PI * 2;
  tree.position.set(Math.cos(angle) * radius, trunkHeight / 2, Math.sin(angle) * radius);
  treeGroup.add(tree);
}
scene.add(treeGroup);

const fireflies = new THREE.Group();
const fireflyMaterial = new THREE.MeshStandardMaterial({
  color: 0xfff5a6,
  emissive: 0xfff0a0,
  emissiveIntensity: 1,
});
for (let i = 0; i < 30; i += 1) {
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), fireflyMaterial);
  glow.position.set(
    (Math.random() - 0.5) * 40,
    1.5 + Math.random() * 4,
    (Math.random() - 0.5) * 40
  );
  fireflies.add(glow);
}
scene.add(fireflies);

camera.position.set(0, 1.6, 6);

const keys = new Set();
let pointerLocked = false;
let yaw = 0;
let pitch = 0;

const walkSpeed = 6;
const lookSpeed = 0.0025;

function lockPointer() {
  renderer.domElement.requestPointerLock();
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  hint.classList.toggle("hidden", pointerLocked);
}

renderer.domElement.addEventListener("click", () => {
  if (!pointerLocked) {
    lockPointer();
  }
});

document.addEventListener("pointerlockchange", onPointerLockChange);

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked) return;
  yaw -= event.movementX * lookSpeed;
  pitch -= event.movementY * lookSpeed;
  pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
});

document.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function updateMovement(delta) {
  if (!pointerLocked) return;

  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  if (keys.has("w") || keys.has("arrowup")) direction.add(forward);
  if (keys.has("s") || keys.has("arrowdown")) direction.sub(forward);
  if (keys.has("d") || keys.has("arrowright")) direction.add(right);
  if (keys.has("a") || keys.has("arrowleft")) direction.sub(right);

  if (direction.lengthSq() > 0) {
    direction.normalize();
    camera.position.addScaledVector(direction, walkSpeed * delta);
  }

  camera.position.y = 1.6 + Math.sin(clock.elapsedTime * 6) * 0.03;
}

function animate() {
  const delta = clock.getDelta();
  updateMovement(delta);

  camera.rotation.set(pitch, yaw, 0, "YXZ");

  fireflies.children.forEach((glow, index) => {
    glow.position.y += Math.sin(clock.elapsedTime * 1.5 + index) * 0.002;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
