const canvas = document.getElementById("renderCanvas");
const hint = document.getElementById("hint");

const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.05, 0.03, 1.0);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0025;
  scene.fogColor = new BABYLON.Color3(0.03, 0.07, 0.05);
  scene.collisionsEnabled = true;

  const environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
    "https://assets.babylonjs.com/environments/environmentSpecular.env",
    scene
  );
  scene.environmentTexture = environmentTexture;
  scene.createDefaultSkybox(environmentTexture, true, 1200, 0.6);

  const camera = new BABYLON.UniversalCamera(
    "forestCamera",
    new BABYLON.Vector3(0, 2.2, 8),
    scene
  );
  camera.attachControl(canvas, true);
  camera.speed = 0.9;
  camera.angularSensibility = 3500;
  camera.minZ = 0.1;
  camera.applyGravity = true;
  camera.ellipsoid = new BABYLON.Vector3(0.6, 1.1, 0.6);
  camera.checkCollisions = true;
  scene.gravity = new BABYLON.Vector3(0, -0.25, 0);

  const hemi = new BABYLON.HemisphericLight(
    "hemi",
    new BABYLON.Vector3(0.3, 1, 0.4),
    scene
  );
  hemi.intensity = 0.45;

  const sun = new BABYLON.DirectionalLight(
    "sun",
    new BABYLON.Vector3(-0.4, -1, -0.2),
    scene
  );
  sun.position = new BABYLON.Vector3(60, 80, 30);
  sun.intensity = 2.4;

  const shadowGenerator = new BABYLON.ShadowGenerator(2048, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;

  const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
    "ground",
    "https://assets.babylonjs.com/environments/villageheightmap.png",
    {
      width: 360,
      height: 360,
      subdivisions: 180,
      minHeight: -2,
      maxHeight: 8,
    },
    scene
  );
  ground.receiveShadows = true;
  ground.checkCollisions = true;

  const groundMaterial = new BABYLON.PBRMaterial("groundMaterial", scene);
  groundMaterial.albedoTexture = new BABYLON.Texture(
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_ground_02/forest_ground_02_diff_1k.jpg",
    scene
  );
  groundMaterial.bumpTexture = new BABYLON.Texture(
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_ground_02/forest_ground_02_nor_gl_1k.jpg",
    scene
  );
  groundMaterial.metallicTexture = new BABYLON.Texture(
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_ground_02/forest_ground_02_rough_1k.jpg",
    scene
  );
  groundMaterial.metallicTexture.getAlphaFromRGB = true;
  groundMaterial.metallic = 0.1;
  groundMaterial.roughness = 0.95;
  groundMaterial.albedoTexture.uScale = 20;
  groundMaterial.albedoTexture.vScale = 20;
  groundMaterial.bumpTexture.uScale = 20;
  groundMaterial.bumpTexture.vScale = 20;
  groundMaterial.metallicTexture.uScale = 20;
  groundMaterial.metallicTexture.vScale = 20;
  ground.material = groundMaterial;

  const river = BABYLON.MeshBuilder.CreateGround(
    "river",
    { width: 140, height: 24, subdivisions: 1 },
    scene
  );
  river.position = new BABYLON.Vector3(0, 0.2, -20);
  river.rotation.y = BABYLON.Tools.ToRadians(12);

  const waterMaterial = new BABYLON.PBRMaterial("waterMaterial", scene);
  waterMaterial.albedoColor = new BABYLON.Color3(0.04, 0.2, 0.2);
  waterMaterial.metallic = 0.1;
  waterMaterial.roughness = 0.1;
  waterMaterial.clearCoat.isEnabled = true;
  waterMaterial.clearCoat.intensity = 0.6;
  waterMaterial.reflectivityColor = new BABYLON.Color3(0.2, 0.35, 0.35);
  waterMaterial.alpha = 0.9;
  waterMaterial.bumpTexture = new BABYLON.Texture(
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/water_002/water_002_nor_gl_1k.jpg",
    scene
  );
  waterMaterial.bumpTexture.uScale = 4;
  waterMaterial.bumpTexture.vScale = 4;
  river.material = waterMaterial;
  river.receiveShadows = true;

  const treeContainer = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    "https://assets.babylonjs.com/meshes/",
    "Tree.glb",
    scene
  );

  const treeMeshes = treeContainer.meshes.filter(
    (mesh) => mesh instanceof BABYLON.Mesh && mesh.getTotalVertices() > 0
  );

  treeMeshes.forEach((mesh) => {
    mesh.isVisible = false;
    mesh.receiveShadows = true;
    shadowGenerator.addShadowCaster(mesh);
  });

  const matrixData = [];
  const treeCount = 280;
  for (let i = 0; i < treeCount; i += 1) {
    const radius = 40 + Math.random() * 140;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 25;
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 25;
    if (Math.abs(x) < 12 && Math.abs(z) < 18) {
      i -= 1;
      continue;
    }
    const y = 0.5;
    const scale = 1.2 + Math.random() * 1.6;
    const rotation = BABYLON.Quaternion.FromEulerAngles(0, Math.random() * Math.PI * 2, 0);
    const matrix = BABYLON.Matrix.Compose(
      new BABYLON.Vector3(scale, scale, scale),
      rotation,
      new BABYLON.Vector3(x, y, z)
    );
    matrixData.push(...matrix.m);
  }

  treeMeshes.forEach((mesh) => {
    mesh.thinInstanceSetBuffer("matrix", matrixData, 16, true);
  });

  const fireflyMaterial = new BABYLON.StandardMaterial("fireflyMaterial", scene);
  fireflyMaterial.emissiveColor = new BABYLON.Color3(1, 0.9, 0.6);
  fireflyMaterial.disableLighting = true;

  const fireflies = [];
  for (let i = 0; i < 45; i += 1) {
    const firefly = BABYLON.MeshBuilder.CreateSphere(`firefly-${i}`,
      { diameter: 0.18, segments: 8 },
      scene
    );
    firefly.material = fireflyMaterial;
    firefly.position = new BABYLON.Vector3(
      (Math.random() - 0.5) * 30,
      2 + Math.random() * 6,
      (Math.random() - 0.5) * 30
    );
    fireflies.push(firefly);
  }

  const pipeline = new BABYLON.DefaultRenderingPipeline(
    "pipeline",
    true,
    scene,
    [camera]
  );
  pipeline.bloomEnabled = true;
  pipeline.bloomWeight = 0.35;
  pipeline.bloomKernel = 64;
  pipeline.bloomThreshold = 0.8;
  pipeline.fxaaEnabled = true;
  pipeline.imageProcessing.contrast = 1.2;
  pipeline.imageProcessing.exposure = 1.1;

  scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;
    fireflies.forEach((firefly, index) => {
      firefly.position.y += Math.sin(time * 1.4 + index) * 0.005;
      firefly.position.x += Math.cos(time * 0.7 + index) * 0.002;
    });
    waterMaterial.bumpTexture.uOffset = time * 0.02;
    waterMaterial.bumpTexture.vOffset = time * 0.015;
  });

  canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    hint.classList.toggle("hidden", locked);
  });

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => {
    scene.render();
  });
});

window.addEventListener("resize", () => {
  engine.resize();
});
