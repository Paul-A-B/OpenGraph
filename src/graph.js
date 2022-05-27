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

window.addEventListener("load", init);

function PrecalculatedGeometry(geometry, size, offset) {
  this.geometry = geometry;
  this.size = size;
  this.offset = offset;
}

const charCache = {};

function init() {
  for (let char of "1234567890.-") {
    const characterGeometry = new TextGeometry(`${char}`, {
      font: font,
      size: 0.25,
      height: 0,
    });
    characterGeometry.computeBoundingBox();

    charCache[char] = new PrecalculatedGeometry(
      characterGeometry,
      {
        width:
          characterGeometry.boundingBox.max.x -
          characterGeometry.boundingBox.min.x,
        height:
          characterGeometry.boundingBox.max.y -
          characterGeometry.boundingBox.min.y,
      },
      {
        x: characterGeometry.boundingBox.min.x,
        y: characterGeometry.boundingBox.min.y,
      }
    );
  }
  reset();
}

window.addEventListener("resize", reset);

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

import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

let font;
new FontLoader().load("fonts/IBM Plex Mono_Regular.json", (response) => {
  font = response;
});

let activeGrid;

function drawGrid() {
  if (activeGrid) scene.remove(activeGrid.mesh);

  const minorGridLineMaterial = new MeshLineMaterial({
    color: 0x000000,
    resolution: new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    ),
    sizeAttenuation: 0,
    lineWidth: 2.5,
  });
  const majorGridLineMaterial = new MeshLineMaterial({
    color: 0x000000,
    resolution: new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    ),
    sizeAttenuation: 0,
    lineWidth: 7.5,
  });

  const gridGroup = new THREE.Group();

  const lineGroup = new THREE.Group();

  const verticalLines = new THREE.Group();
  const horizontalLines = new THREE.Group();

  const coordGroup = new THREE.Group();

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

    const verticalLine = new MeshLine();
    verticalLine.setGeometry(verticalLineGeometry);

    if (x === 0) {
      const verticalLineMesh = new THREE.Mesh(
        verticalLine,
        majorGridLineMaterial
      );
      verticalLines.add(verticalLineMesh);
    } else {
      const verticalLineMesh = new THREE.Mesh(
        verticalLine,
        minorGridLineMaterial
      );
      verticalLines.add(verticalLineMesh);

      const coordMesh = new THREE.Group();
      let widthOfPreviousCharacters = 0;

      for (let char of x.toString()) {
        const characterMesh = new THREE.Mesh(
          charCache[char].geometry,
          minorGridLineMaterial
        );
        characterMesh.position.x =
          widthOfPreviousCharacters + x - charCache[char].offset.x;
        if (char === "-") {
          characterMesh.position.y =
            0.125 - charCache[char].offset.y - charCache[char].size.height;
        } else {
          characterMesh.position.y = -charCache[char].offset.y;
        }
        characterMesh.renderOrder = 1; // rendert es später -> es ist vor dem Hintergrund
        coordMesh.add(characterMesh);
        widthOfPreviousCharacters += charCache[char].size.width + 0.025;
      }
      const coordBoundingBox = new THREE.Box3();
      coordBoundingBox.setFromObject(coordMesh, true);

      const coordBoundingBoxWidth =
        coordBoundingBox.max.x - coordBoundingBox.min.x;
      const coordBoundingBoxHeight =
        coordBoundingBox.max.y - coordBoundingBox.min.y;

      coordMesh.position.x -= coordBoundingBoxWidth / 2;
      coordMesh.position.y -= coordBoundingBoxHeight + 0.05;

      const coordBackgroundGeometry = new THREE.PlaneGeometry(
        coordBoundingBoxWidth,
        coordBoundingBoxHeight
      );
      const coordBackgroundMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      const coordBackground = new THREE.Mesh(
        coordBackgroundGeometry,
        coordBackgroundMaterial
      );

      coordBackground.position.x =
        coordBoundingBox.min.x + coordBoundingBoxWidth / 2;
      coordBackground.position.y =
        coordBoundingBox.min.y + coordBoundingBoxHeight / 2;

      coordMesh.add(coordBackground);

      coordGroup.add(coordMesh);
    }
  }
  lineGroup.add(verticalLines);

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

    const horizontalLine = new MeshLine();
    horizontalLine.setGeometry(horizontalLineGeometry);

    if (y === 0) {
      const horizontalLineMesh = new THREE.Mesh(
        horizontalLine,
        majorGridLineMaterial
      );
      horizontalLines.add(horizontalLineMesh);
    } else {
      const horizontalLineMesh = new THREE.Mesh(
        horizontalLine,
        minorGridLineMaterial
      );
      horizontalLines.add(horizontalLineMesh);
    }

    const coordMesh = new THREE.Group();
    let widthOfPreviousCharacters = 0;

    for (let char of y.toString()) {
      const characterMesh = new THREE.Mesh(
        charCache[char].geometry,
        minorGridLineMaterial
      );
      characterMesh.position.x =
        widthOfPreviousCharacters - charCache[char].offset.x;
      if (char === "-") {
        characterMesh.position.y =
          y + 0.125 - charCache[char].offset.y - charCache[char].size.height;
      } else {
        characterMesh.position.y = y - charCache[char].offset.y;
      }
      characterMesh.renderOrder = 1; // rendert es später -> es ist vor dem Hintergrund
      coordMesh.add(characterMesh);
      widthOfPreviousCharacters += charCache[char].size.width + 0.025;
    }
    const coordBoundingBox = new THREE.Box3();
    coordBoundingBox.setFromObject(coordMesh, true);

    const coordBoundingBoxWidth =
      coordBoundingBox.max.x - coordBoundingBox.min.x;
    const coordBoundingBoxHeight =
      coordBoundingBox.max.y - coordBoundingBox.min.y;

    coordMesh.position.x -= coordBoundingBoxWidth + 0.05;
    if (y === 0) {
      coordMesh.position.y -= coordBoundingBoxHeight + 0.05;
    } else {
      coordMesh.position.y -= coordBoundingBoxHeight / 2;
    }

    const coordBackgroundGeometry = new THREE.PlaneGeometry(
      coordBoundingBoxWidth,
      coordBoundingBoxHeight
    );
    const coordBackgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const coordBackground = new THREE.Mesh(
      coordBackgroundGeometry,
      coordBackgroundMaterial
    );

    coordBackground.position.x =
      coordBoundingBox.min.x + coordBoundingBoxWidth / 2;
    coordBackground.position.y =
      coordBoundingBox.min.y + coordBoundingBoxHeight / 2;

    coordMesh.add(coordBackground);

    coordGroup.add(coordMesh);
  }
  lineGroup.add(horizontalLines);

  gridGroup.add(lineGroup);
  gridGroup.add(coordGroup);

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

window.MathJax = {
  options: {
    enableMenu: false,
  },
  chtml: {
    scale: 1.5,
  },
};

(function () {
  var script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
  script.async = true;
  document.head.appendChild(script);
})();

const mj = function (expression) {
  return MathJax.tex2chtml(
    expression.toTex({ parenthesis: "keep", implicit: "hide" }),
    { display: false }
  );
};

function takeInput() {
  let input = inputArea.value;
  try {
    if (activeGraphs[0]) {
      scene.remove(activeGraphs[0].mesh);
      activeGraphs.shift();
    }

    if (input) {
      if (input.includes("x")) {
        outputArea.textContent = "";
        outputArea.appendChild(mj(math.parse(input)));
      } else {
        outputArea.textContent = "";
        outputArea.appendChild(mj(math.parse(input)));
        outputArea.appendChild(
          document.createTextNode(` = ${math.evaluate(input)}`)
        );
      }
      MathJax.startup.document.clear();
      MathJax.startup.document.updateDocument();

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
  graphMesh.renderOrder = 2; // rendert über Grid und Beschriftung
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
