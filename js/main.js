import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
const clock = new THREE.Clock();

let mixer;

const params = {
  asset: [
    "Standing Taunt Battlecry",
    "Pain Gesture",
    "Samba Dancing",
    "Standing Torch Light Torch",
    "Jump Push Up",
  ],
  ColorDeNiebla: 0xa0a0a0,
  NieblaCerca: 200,
  NieblaLejos: 1000,
  hemiLightColor: 0xfff555,
  hemiLightGroundColor: 0x444444,
  hemiLightIntensity: 5,
  ColorDeIluminacion: 0xfff555,
  IntensidadDeIluminacion: 5,
};

const assets = [
  "Standing Taunt Battlecry",
  "Pain Gesture",
  "Samba Dancing",
  "Jump Push Up",
  "Standing Torch Light Torch",
];

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  jump: false,
  velocity: new THREE.Vector3(),
};

const collisionObjects = []; // Almacena los objetos de colisión
const collisionBoxes = []; // Almacena las cajas de colisión de los objetos

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    120,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.set(100, 200, 300);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  scene.fog = new THREE.Fog(
    params.ColorDeNiebla,
    params.NieblaCerca,
    params.NieblaLejos
  );

  const hemiLight = new THREE.HemisphereLight(
    params.hemiLightColor,
    params.hemiLightGroundColor,
    params.hemiLightIntensity
  );
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(
    params.ColorDeIluminacion,
    params.IntensidadDeIluminacion
  );
  dirLight.position.set(0, 200, 100);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 180;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  scene.add(dirLight);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 1000),
    new THREE.MeshPhongMaterial({ color: 0xfffffff, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const grid = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  loader = new FBXLoader();
  loadAsset(params.asset[0]);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  stats = new Stats();
  container.appendChild(stats.dom);

  const gui = new GUI();
  gui.add(params, "asset", assets).onChange(function (value) {
    loadAsset(value);
  });

  gui.addColor(params, "ColorDeNiebla").onChange((value) => {
    scene.fog.color.set(value);
  });

  gui.add(params, "NieblaCerca", 0, 2000).onChange((value) => {
    scene.fog.near = value;
  });

  gui.add(params, "NieblaLejos", 0, 2000).onChange((value) => {
    scene.fog.far = value;
  });

  gui.addColor(params, "ColorDeIluminacion").onChange((value) => {
    dirLight.color.set(value);
  });

  gui.add(params, "IntensidadDeIluminacion", 0, 10).onChange((value) => {
    dirLight.intensity = value;
  });

  guiMorphsFolder = gui.addFolder("Morphs").hide();

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Generar objetos de colisión aleatoriamente
  generateCollisionObjects(20); // Genera 10 objetos de colisión
}

function generateCollisionObjects(num) {
  for (let i = 0; i < num; i++) {
    const geometry = new THREE.BoxGeometry(50, 50, 40);
    const material = new THREE.MeshPhongMaterial({
      color: Math.random() * 0xffffff,
    });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(
      (Math.random() - 0.5) * 1000,
      10,
      (Math.random() - 0.5) * 1000
    );
    scene.add(box);
    collisionObjects.push(box);

    // Crear y almacenar la caja de colisión
    const box3 = new THREE.Box3().setFromObject(box);
    collisionBoxes.push(box3);
  }
}

function loadAsset(asset) {
  loader.load("models/fbx/" + asset + ".fbx", function (group) {
    if (object) {
      object.traverse(function (child) {
        if (child.material) child.material.dispose();
        if (child.material && child.material.map) child.material.map.dispose();
        if (child.geometry) child.geometry.dispose();
      });

      scene.remove(object);
    }

    object = group;

    if (object.animations && object.animations.length) {
      mixer = new THREE.AnimationMixer(object);
      const action = mixer.clipAction(object.animations[0]);
      action.play();
    } else {
      mixer = null;
    }

    guiMorphsFolder.children.forEach((child) => child.destroy());
    guiMorphsFolder.hide();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.morphTargetDictionary) {
          guiMorphsFolder.show();
          const meshFolder = guiMorphsFolder.addFolder(
            child.name || child.uuid
          );
          Object.keys(child.morphTargetDictionary).forEach((key) => {
            meshFolder.add(
              child.morphTargetInfluences,
              child.morphTargetDictionary[key],
              0,
              1,
              0.01
            );
          });
        }
      }
    });

    scene.add(object);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      controls.moveForward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      controls.moveLeft = true;
      break;
    case "ArrowDown":
    case "KeyS":
      controls.moveBackward = true;
      break;
    case "ArrowRight":
    case "KeyD":
      controls.moveRight = true;
      break;
    case "Space":
      if (controls.velocity.y === 0) {
        controls.jump = true;
        controls.velocity.y = 10;
      }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      controls.moveForward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      controls.moveLeft = false;
      break;
    case "ArrowDown":
    case "KeyS":
      controls.moveBackward = false;
      break;
    case "ArrowRight":
    case "KeyD":
      controls.moveRight = false;
      break;
  }
}

function animate() {
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  // Asegurarse de que object esté definido antes de acceder a su posición
  if (object) {
    // Movimiento del personaje
    const moveSpeed = 100 * delta;
    const gravity = 30 * delta;
    const jumpSpeed = 10 * delta;

    if (controls.moveForward) object.position.z -= moveSpeed;
    if (controls.moveBackward) object.position.z += moveSpeed;
    if (controls.moveLeft) object.position.x -= moveSpeed;
    if (controls.moveRight) object.position.x += moveSpeed;

    if (controls.jump) {
      controls.velocity.y = jumpSpeed;
      controls.jump = false;
    }

    object.position.y += controls.velocity.y;
    controls.velocity.y -= gravity;

    if (object.position.y < 0) {
      object.position.y = 0;
      controls.velocity.y = 0;
    }

    // Detección y resolución de colisiones
    const playerBox = new THREE.Box3().setFromObject(object);

    collisionBoxes.forEach((box, index) => {
      box.setFromObject(collisionObjects[index]);

      if (playerBox.intersectsBox(box)) {
        const collisionNormal = new THREE.Vector3();
        const boxCenter = box.getCenter(new THREE.Vector3());
        const playerCenter = playerBox.getCenter(new THREE.Vector3());
        collisionNormal.subVectors(playerCenter, boxCenter).normalize();

        if (
          Math.abs(collisionNormal.y) > Math.abs(collisionNormal.x) &&
          Math.abs(collisionNormal.y) > Math.abs(collisionNormal.z)
        ) {
          if (collisionNormal.y > 0) {
            object.position.y = box.max.y;
            controls.velocity.y = 0;
          } else {
            object.position.y =
              box.min.y - playerBox.getSize(new THREE.Vector3()).y;
            controls.velocity.y = 0;
          }
        } else {
          if (Math.abs(collisionNormal.x) > Math.abs(collisionNormal.z)) {
            if (collisionNormal.x > 0) {
              object.position.x = box.max.x;
            } else {
              object.position.x =
                box.min.x - playerBox.getSize(new THREE.Vector3()).x;
            }
          } else {
            if (collisionNormal.z > 0) {
              object.position.z = box.max.z;
            } else {
              object.position.z =
                box.min.z - playerBox.getSize(new THREE.Vector3()).z;
            }
          }
        }
      }
    });
  }

  renderer.render(scene, camera);
  stats.update();
}
