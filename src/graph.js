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
  xScale = visibleWidthAtZDepth(camera.position.z, camera) / 4; // so viel, wie man sehen kann
  yScale = visibleHeightAtZDepth(camera.position.z, camera) / 4;
  drawGrid();
}

function Grid(mesh, boundingBox) {
  (this.mesh = mesh), (this.boundingBox = boundingBox);
}

let activeGrid;

function drawGrid() {
  if (activeGrid) scene.remove(activeGrid.mesh);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

  const gridGroup = new THREE.Group();
  const verticalLines = new THREE.Group();
  const horizontalLines = new THREE.Group();

  for (
    let x = Math.round(-xScale * 2 + camera.position.x);
    x <= Math.round(xScale * 2 + camera.position.x);
    x++
  ) {
    const verticalPoints = [];
    verticalPoints.push(
      new THREE.Vector3(x, -yScale * 2 + camera.position.y, 0)
    );
    verticalPoints.push(
      new THREE.Vector3(x, yScale * 2 + camera.position.y, 0)
    );

    const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(
      verticalPoints
    );

    const verticalLine = new THREE.Line(verticalLineGeometry, lineMaterial);

    verticalLines.add(verticalLine);
  }
  gridGroup.add(verticalLines);

  for (
    let y = Math.round(-yScale * 2 + camera.position.y);
    y <= Math.round(yScale * 2 + camera.position.y);
    y++
  ) {
    const horizontalPoints = [];
    horizontalPoints.push(
      new THREE.Vector3(-xScale * 2 + camera.position.x, y, 0)
    );
    horizontalPoints.push(
      new THREE.Vector3(xScale * 2 + camera.position.x, y, 0)
    );

    const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(
      horizontalPoints
    );

    const horizontalLine = new THREE.Line(horizontalLineGeometry, lineMaterial);

    horizontalLines.add(horizontalLine);
  }
  gridGroup.add(horizontalLines);

  const gridBoundingBox = new THREE.Box3();
  gridBoundingBox.setFromObject(gridGroup, true);

  activeGrid = new Grid(gridGroup, gridBoundingBox);

  scene.add(activeGrid.mesh);
}

import { create, all } from "mathjs";

const config = {};
const math = create(all, config);
const parser = math.parser();

parser.set("x", null);

const inputArea = document.getElementById("input");
const outputArea = document.getElementById("output");

inputArea.addEventListener("input", takeInput);

function Graph(fx, mesh, boundingBox) {
  this.fx = fx;
  this.mesh = mesh;
  this.boundingBox = boundingBox;
}

const activeGraphs = [];

function takeInput() {
  let input = inputArea.value;
  try {
    if (activeGraphs[0]) {
      scene.remove(activeGraphs[0].mesh);
      activeGraphs.shift();
    }

    if (input) {
      if (input.includes("x")) {
        outputArea.textContent = `f(x) = ${input}`;
      } else {
        outputArea.textContent = `${input} = ${parser.evaluate(input)}`;
      }

      plotGraph(input);
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

import { MeshLine, MeshLineMaterial } from "three.meshline";

function plotGraph(fx) {
  if (activeGraphs[0]) {
    scene.remove(activeGraphs[0].mesh);
    activeGraphs.shift();
  }

  const graphPoints = [];

  for (
    let x = -xScale * 2 + camera.position.x;
    x <= xScale * 2 + camera.position.x;
    x += (xScale * 2) / renderer.domElement.width
  ) {
    parser.set("x", x);
    const point = { x: x, y: parser.evaluate(fx), z: 0 };
    if (point.y) graphPoints.push(new THREE.Vector3(point.x, point.y, point.z));
  }

  const graphGeometry = new THREE.BufferGeometry().setFromPoints(graphPoints);

  const graphMaterial = new MeshLineMaterial({
    color: 0x000000,
    resolution: new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    ),
    sizeAttenuation: 0,
    lineWidth: 10,
  });

  const graphLine = new MeshLine();
  graphLine.setGeometry(graphGeometry);

  const graphMesh = new THREE.Mesh(graphLine, graphMaterial);
  graphMesh.geometry.computeBoundingBox();

  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox
    .copy(graphMesh.geometry.boundingBox)
    .applyMatrix4(graphMesh.matrixWorld);

  const newGraph = new Graph(fx, graphMesh, graphBoundingBox);

  activeGraphs.push(newGraph);

  scene.add(activeGraphs[0].mesh);
}

let lastCameraZ = camera.position.z;

controls.addEventListener("change", draw);

function draw() {
  xScale = visibleWidthAtZDepth(camera.position.z, camera) / 4; // so viel, wie man sehen kann
  yScale = visibleHeightAtZDepth(camera.position.z, camera) / 4;
  let cameraBox = {
    max: new THREE.Vector3(
      xScale + camera.position.x,
      yScale + camera.position.y,
      0
    ),
    min: new THREE.Vector3(
      -xScale + camera.position.x,
      -yScale + camera.position.y,
      0
    ),
  };
  if (activeGraphs[0]) {
    if (
      activeGraphs[0].boundingBox.max.x < cameraBox.max.x ||
      activeGraphs[0].boundingBox.min.x > cameraBox.min.x ||
      camera.position.z >= lastCameraZ * 2 ||
      camera.position.z <= lastCameraZ / 2
    ) {
      plotGraph(activeGraphs[0].fx);
      lastCameraZ = camera.position.z;
    }
  }
  if (activeGrid) {
    if (
      activeGrid.boundingBox.max.x < cameraBox.max.x ||
      activeGrid.boundingBox.max.y < cameraBox.max.y ||
      activeGrid.boundingBox.min.x > cameraBox.min.x ||
      activeGrid.boundingBox.min.y > cameraBox.min.y
    ) {
      drawGrid();
    }
  }
}
