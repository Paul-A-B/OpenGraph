import * as THREE from "three";

const canvas = document.getElementById("graph");

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight, false);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  9999
);
camera.position.set(0, 0, 25);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.maxDistance = 200;
controls.minDistance = 0.1;

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

let xScale, yScale;

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
  xScale = visibleWidthAtZDepth(camera.position.z, camera) / 2; // doppelt so viel, wie man sehen kann
  yScale = visibleHeightAtZDepth(camera.position.z, camera) / 2;
  drawGrid();
}

let activeGrid;

function drawGrid() {
  if (activeGrid) scene.remove(activeGrid);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

  const grid = new THREE.Group();
  const verticalLines = new THREE.Group();
  const horizontalLines = new THREE.Group();

  for (
    let x = Math.round(-xScale + camera.position.x);
    x <= Math.round(xScale + camera.position.x);
    x++
  ) {
    const verticalPoints = [];
    verticalPoints.push(new THREE.Vector3(x, -yScale + camera.position.y, 0));
    verticalPoints.push(new THREE.Vector3(x, yScale + camera.position.y, 0));

    const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(
      verticalPoints
    );

    const verticalLine = new THREE.Line(verticalLineGeometry, lineMaterial);

    verticalLines.add(verticalLine);
  }
  grid.add(verticalLines);

  for (
    let y = Math.round(-yScale + camera.position.y);
    y <= Math.round(yScale + camera.position.y);
    y++
  ) {
    const horizontalPoints = [];
    horizontalPoints.push(new THREE.Vector3(-xScale + camera.position.x, y, 0));
    horizontalPoints.push(new THREE.Vector3(xScale + camera.position.x, y, 0));

    const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(
      horizontalPoints
    );

    const horizontalLine = new THREE.Line(horizontalLineGeometry, lineMaterial);

    horizontalLines.add(horizontalLine);
  }
  grid.add(horizontalLines);

  activeGrid = grid;

  scene.add(grid);
}

import { create, all } from "mathjs";

const config = {};
const math = create(all, config);
const parser = math.parser();

parser.set("x", null);

const inputArea = document.getElementById("input");
const outputArea = document.getElementById("output");

inputArea.addEventListener("input", takeInput);

const activeGraphs = [];
const activeFunctions = [];

function takeInput() {
  activeFunctions.shift();
  let input = inputArea.value;
  try {
    if (input) {
      if (input.includes("x")) {
        outputArea.textContent = `f(x) = ${input}`;
      } else {
        outputArea.textContent = `${input} = ${parser.evaluate(input)}`;
      }

      activeFunctions.push(input);

      plotGraph(activeFunctions[0]);
    } else {
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

function plotGraph(fx) {
  scene.remove(activeGraphs[0]);

  activeGraphs.shift();

  const graphPoints = [];

  for (
    let x = -xScale / 2 + camera.position.x;
    x <= xScale / 2 + camera.position.x;
    x += 1 / renderer.domElement.width
  ) {
    parser.set("x", x);
    const point = { x: x, y: parser.evaluate(fx), z: 0 };
    if (point.y) graphPoints.push(new THREE.Vector3(point.x, point.y, point.z));
  }

  const graphGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(graphPoints),
    graphPoints.length,
    0.05,
    4,
    false
  );

  const graphMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const graph = new THREE.Mesh(graphGeometry, graphMaterial);

  activeGraphs.push(graph);

  scene.add(graph);
}

controls.addEventListener("end", draw);

function draw() {
  xScale = visibleWidthAtZDepth(camera.position.z, camera) / 2; // doppelt so viel, wie man sehen kann
  yScale = visibleHeightAtZDepth(camera.position.z, camera) / 2;

  drawGrid();
  if (activeFunctions[0]) plotGraph(activeFunctions[0]);
}
