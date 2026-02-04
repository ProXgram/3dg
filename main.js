const canvas = document.getElementById("scene");
const hint = document.getElementById("hint");
const context = canvas.getContext("2d");

const world = {
  width: 120,
  depth: 120,
  trees: [],
};

const camera = {
  x: 0,
  y: 1.6,
  z: 6,
  yaw: 0,
  pitch: 0,
};

const keys = new Set();
let pointerLocked = false;

const walkSpeed = 5.5;
const lookSpeed = 0.0025;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seedTrees() {
  const trees = [];
  for (let i = 0; i < 180; i += 1) {
    const radius = 10 + Math.random() * 60;
    const angle = Math.random() * Math.PI * 2;
    trees.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height: 2.5 + Math.random() * 3.2,
      sway: Math.random() * Math.PI * 2,
    });
  }
  world.trees = trees;
}

function lockPointer() {
  canvas.requestPointerLock();
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === canvas;
  hint.classList.toggle("hidden", pointerLocked);
}

canvas.addEventListener("click", () => {
  if (!pointerLocked) {
    lockPointer();
  }
});

document.addEventListener("pointerlockchange", onPointerLockChange);

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked) return;
  camera.yaw -= event.movementX * lookSpeed;
  camera.pitch = clamp(
    camera.pitch - event.movementY * lookSpeed,
    -Math.PI / 3,
    Math.PI / 3
  );
});

document.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function updateMovement(delta) {
  if (!pointerLocked) return;

  const forward = {
    x: Math.sin(camera.yaw),
    z: Math.cos(camera.yaw),
  };
  const right = {
    x: Math.cos(camera.yaw),
    z: -Math.sin(camera.yaw),
  };

  let moveX = 0;
  let moveZ = 0;

  if (keys.has("w") || keys.has("arrowup")) {
    moveX += forward.x;
    moveZ += forward.z;
  }
  if (keys.has("s") || keys.has("arrowdown")) {
    moveX -= forward.x;
    moveZ -= forward.z;
  }
  if (keys.has("d") || keys.has("arrowright")) {
    moveX += right.x;
    moveZ += right.z;
  }
  if (keys.has("a") || keys.has("arrowleft")) {
    moveX -= right.x;
    moveZ -= right.z;
  }

  const length = Math.hypot(moveX, moveZ) || 1;
  camera.x += (moveX / length) * walkSpeed * delta;
  camera.z += (moveZ / length) * walkSpeed * delta;
}

function project(point) {
  const dx = point.x - camera.x;
  const dz = point.z - camera.z;

  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);

  const viewX = dx * cosYaw - dz * sinYaw;
  const viewZ = dx * sinYaw + dz * cosYaw;

  const viewY = point.y - camera.y;

  if (viewZ <= 0.2) return null;

  const scale = 500 / viewZ;
  const screenX = canvas.width / 2 + viewX * scale;
  const screenY = canvas.height / 2 - (viewY * scale + camera.pitch * 220);

  return { x: screenX, y: screenY, scale, depth: viewZ };
}

function drawGround() {
  const gradient = context.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
  gradient.addColorStop(0, "#1b3a1e");
  gradient.addColorStop(1, "#0f1d10");
  context.fillStyle = gradient;
  context.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.6);
}

function drawSky() {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height * 0.6);
  gradient.addColorStop(0, "#0b1215");
  gradient.addColorStop(1, "#1e2f1c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height * 0.6);
}

function drawTree(tree, time) {
  const sway = Math.sin(time * 0.6 + tree.sway) * 0.2;
  const trunk = project({ x: tree.x + sway, y: 0, z: tree.z });
  if (!trunk) return null;

  const canopy = project({ x: tree.x + sway, y: tree.height, z: tree.z });
  if (!canopy) return null;

  const trunkWidth = 0.12 * trunk.scale;
  const trunkHeight = tree.height * trunk.scale;
  const canopyRadius = 0.6 * canopy.scale;

  return {
    depth: trunk.depth,
    draw: () => {
      context.strokeStyle = "#4e3422";
      context.lineWidth = trunkWidth;
      context.beginPath();
      context.moveTo(trunk.x, trunk.y);
      context.lineTo(trunk.x, trunk.y - trunkHeight);
      context.stroke();

      context.fillStyle = "#2f7d32";
      context.beginPath();
      context.arc(canopy.x, canopy.y - trunkHeight, canopyRadius, 0, Math.PI * 2);
      context.fill();
    },
  };
}

function drawFireflies(time) {
  for (let i = 0; i < 18; i += 1) {
    const angle = time * 0.2 + i * 0.6;
    const radius = 6 + (i % 5) * 1.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 4;
    const y = 1.4 + Math.sin(time + i) * 0.6;
    const projected = project({ x, y, z });
    if (!projected) continue;
    const size = 2.2 * projected.scale * 0.01;
    context.fillStyle = "rgba(255, 245, 170, 0.85)";
    context.beginPath();
    context.arc(projected.x, projected.y, size, 0, Math.PI * 2);
    context.fill();
  }
}

function render(time) {
  const now = time * 0.001;
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawGround();

  const treesToDraw = world.trees
    .map((tree) => drawTree(tree, now))
    .filter(Boolean)
    .sort((a, b) => b.depth - a.depth);

  treesToDraw.forEach((item) => item.draw());
  drawFireflies(now);

  context.fillStyle = "rgba(0,0,0,0.15)";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

let lastTime = performance.now();
function animate(time) {
  const delta = Math.min(0.05, (time - lastTime) / 1000);
  lastTime = time;

  updateMovement(delta);
  render(time);
  requestAnimationFrame(animate);
}

resize();
seedTrees();
requestAnimationFrame(animate);
window.addEventListener("resize", resize);
