import * as THREE from "three";
import { MeshBasicMaterial } from "three";

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
const planeMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);

const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

const graphPoints = [];

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

for (let i = -5; i <= 5; i += 1 / renderer.domElement.width) {
  if (i && Math.log(i)) graphPoints.push(new THREE.Vector3(i, Math.log(i), 0));
}

// const graphGeometry = new THREE.BufferGeometry().setFromPoints(graphPoints);
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
