import * as THREE from "three";

const canvas = document.getElementById("graph");

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight, false);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  500
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();

const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);

const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

for (let i = -5; i <= 5; i++) {
  const verticalPoints = [];
  verticalPoints.push(new THREE.Vector3(i * 1, -100, 0));
  verticalPoints.push(new THREE.Vector3(i * 1, 100, 0));
  const horizontalPoints = [];
  horizontalPoints.push(new THREE.Vector3(-100, i * 1, 0));
  horizontalPoints.push(new THREE.Vector3(100, i * 1, 0));

  const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(
    verticalPoints
  );
  const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(
    horizontalPoints
  );

  const verticalLine = new THREE.Line(verticalLineGeometry, lineMaterial);
  const horizontalLine = new THREE.Line(horizontalLineGeometry, lineMaterial);

  scene.add(verticalLine);
  scene.add(horizontalLine);
}

renderer.render(scene, camera);

window.addEventListener("resize", reset);
window.addEventListener("load", reset);

function reset() {
  const width = (canvas.clientWidth * window.devicePixelRatio) | 0;
  const height = (canvas.clientHeight * window.devicePixelRatio) | 0;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
}

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.update();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

import { create, all } from "mathjs";

const config = {};
const math = create(all, config);
const parser = math.parser();

parser.set("x", null);

const inputArea = document.getElementById("input");
const outputArea = document.getElementById("output");

inputArea.addEventListener("input", takeInput);

function takeInput() {
  let input = inputArea.value;
  try {
    if (input) {
      if (input.includes("x")) {
        outputArea.textContent = `f(x) = ${input}`;
      } else {
        outputArea.textContent = `${input} = ${parser.evaluate(input)}`;
      }

      const graphPoints = [];

      for (let x = -5; x <= 5; x += 1 / renderer.domElement.width) {
        parser.set("x", x);
        const point = { x: x, y: parser.evaluate(input), z: 0 };
        if (point.y)
          graphPoints.push(new THREE.Vector3(point.x, point.y, point.z));
      }

      const graphGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(graphPoints),
        graphPoints.length,
        0.025,
        8,
        false
      );

      const graphMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

      const graph = new THREE.Mesh(graphGeometry, graphMaterial);

      scene.add(graph);
      renderer.render(scene, camera);
    } else {
      renderer.render(scene, camera);
      outputArea.textContent = "";
    }
  } catch (e) {
    if (inputArea.value) {
      outputArea.textContent = `${input} (${e.message})`;
    } else {
      outputArea.textContent = `${e.message}`;
    }
  }
}
