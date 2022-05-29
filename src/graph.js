import * as THREE from "three";

const canvas = document.getElementById("graph");
const textIOArea = document.getElementById("text-io");

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(
  (window.innerWidth - textIOArea.getBoundingClientRect().width) *
    window.devicePixelRatio,
  window.innerHeight * window.devicePixelRatio,
  false
);

const camera = new THREE.PerspectiveCamera(
  45,
  ((window.innerWidth - textIOArea.getBoundingClientRect().width) *
    window.devicePixelRatio) /
    (window.innerHeight * window.devicePixelRatio),
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

let visibleX, visibleY;
let stepX, stepY, step;

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
  stepX = Math.pow(2, Math.floor(Math.log2(visibleX) - 1));
  stepY = Math.pow(2, Math.floor(Math.log2(visibleY) - 1));
  step = Math.min(stepX, stepY);
  reset();
}

window.addEventListener("resize", reset);

function reset() {
  const width =
    ((window.innerWidth - textIOArea.getBoundingClientRect().width) *
      window.devicePixelRatio) |
    0;
  const height = (window.innerHeight * window.devicePixelRatio) | 0;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect =
      (window.innerWidth - textIOArea.getBoundingClientRect().width) /
      window.innerHeight;
    camera.updateProjectionMatrix();
  }
  draw();
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
    color: 0x606060,
    resolution: new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    ),
    sizeAttenuation: 0,
    lineWidth: 2.5,
  });
  const majorGridLineMaterial = new MeshLineMaterial({
    color: 0x303030,
    resolution: new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    ),
    sizeAttenuation: 0,
    lineWidth: 5,
  });

  const gridGroup = new THREE.Group();

  const verticalLines = new THREE.Group();
  const horizontalLines = new THREE.Group();

  for (
    let x = Math.round((-visibleX + camera.position.x) / step) * step,
      iteration = 0;
    x <= visibleX + camera.position.x;
    x += step / 10, iteration++
  ) {
    const verticalPoints = [];
    verticalPoints.push(new THREE.Vector3(x, -visibleY + camera.position.y, 0));
    verticalPoints.push(new THREE.Vector3(x, visibleY + camera.position.y, 0));

    const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(
      verticalPoints
    );

    const verticalLine = new MeshLine();
    verticalLine.setGeometry(verticalLineGeometry);

    let verticalLineMesh;
    if (iteration % 10 === 0) {
      verticalLineMesh = new THREE.Mesh(verticalLine, majorGridLineMaterial);
    } else {
      verticalLineMesh = new THREE.Mesh(verticalLine, minorGridLineMaterial);
    }

    verticalLines.add(verticalLineMesh);
  }
  gridGroup.add(verticalLines);

  for (
    let y = Math.floor((-visibleY + camera.position.y) / step) * step,
      iteration = 0;
    y <= visibleY + camera.position.y;
    y += step / 10, iteration++
  ) {
    const horizontalPoints = [];
    horizontalPoints.push(
      new THREE.Vector3(-visibleX + camera.position.x, y, 0)
    );
    horizontalPoints.push(
      new THREE.Vector3(visibleX + camera.position.x, y, 0)
    );

    const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(
      horizontalPoints
    );

    const horizontalLine = new MeshLine();
    horizontalLine.setGeometry(horizontalLineGeometry);

    let horizontalLineMesh;
    if (iteration % 10 === 0) {
      horizontalLineMesh = new THREE.Mesh(
        horizontalLine,
        majorGridLineMaterial
      );
    } else {
      horizontalLineMesh = new THREE.Mesh(
        horizontalLine,
        minorGridLineMaterial
      );
    }

    horizontalLines.add(horizontalLineMesh);
  }
  gridGroup.add(horizontalLines);

  const gridBoundingBox = new THREE.Box3();
  gridBoundingBox.setFromObject(gridGroup, true);

  activeGrid = new Grid(gridGroup, gridBoundingBox);

  scene.add(activeGrid.mesh);
}

function Axes(mesh, intersection) {
  this.mesh = mesh;
  this.intersection = intersection;
}

let activeAxes;

function drawAxes() {
  if (activeAxes) scene.remove(activeAxes.mesh);

  const axesMaterial = new MeshLineMaterial({
    color: 0x000000,
    resolution: new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    ),
    sizeAttenuation: 0,
    lineWidth: 7.5,
  });

  const axesLinesGroup = new THREE.Group();

  let intersection = {
    x: null,
    y: null,
  };

  if (-visibleX / 2 + camera.position.x + step / 5 >= 0) {
    intersection.x =
      Math.round((-visibleX / 2 + camera.position.x) / (step / 10)) *
        (step / 10) +
      step / 5;
  } else if (visibleX / 2 + camera.position.x - step / 5 <= 0) {
    intersection.x =
      Math.round((visibleX / 2 + camera.position.x) / (step / 10)) *
        (step / 10) -
      step / 5;
  } else {
    intersection.x = 0;
  }

  const verticalAxesPoints = [];
  verticalAxesPoints.push(
    new THREE.Vector3(intersection.x, -visibleY + camera.position.y, 0)
  );
  verticalAxesPoints.push(
    new THREE.Vector3(intersection.x, visibleY + camera.position.y, 0)
  );

  const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(
    verticalAxesPoints
  );

  const verticalAxis = new MeshLine();
  verticalAxis.setGeometry(verticalLineGeometry);

  const verticalAxisMesh = new THREE.Mesh(verticalAxis, axesMaterial);
  axesLinesGroup.add(verticalAxisMesh);

  if (-visibleY / 2 + camera.position.y + step / 5 >= 0) {
    intersection.y =
      Math.round((-visibleY / 2 + camera.position.y) / (step / 10)) *
        (step / 10) +
      step / 5;
  } else if (visibleY / 2 + camera.position.y - step / 5 <= 0) {
    intersection.y =
      Math.round((visibleY / 2 + camera.position.y) / (step / 10)) *
        (step / 10) -
      step / 5;
  } else {
    intersection.y = 0;
  }

  const horizontalAxesPoints = [];
  horizontalAxesPoints.push(
    new THREE.Vector3(-visibleX + camera.position.x, intersection.y, 0)
  );
  horizontalAxesPoints.push(
    new THREE.Vector3(visibleX + camera.position.x, intersection.y, 0)
  );

  const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(
    horizontalAxesPoints
  );

  const horizontalAxis = new MeshLine();
  horizontalAxis.setGeometry(horizontalLineGeometry);

  const horizontalAxisMesh = new THREE.Mesh(horizontalAxis, axesMaterial);
  axesLinesGroup.add(horizontalAxisMesh);

  const axesGroup = new THREE.Group();

  axesGroup.add(axesLinesGroup);
  axesGroup.add(generateCoordinates(axesMaterial, intersection));

  activeAxes = new Axes(axesGroup, intersection);

  scene.add(activeAxes.mesh);
}

function generateCoordinates(axesMaterial, intersection) {
  const coordGroup = new THREE.Group();

  const verticalCoordGroup = new THREE.Group();
  const horizontalCoordGroup = new THREE.Group();

  let lastXCoordBoundingBox;

  let scale = step / 4;

  for (
    let x = Math.round((-visibleX + camera.position.x) / step) * step;
    x <= visibleX + camera.position.x;
    x += step / 2
  ) {
    const coordMesh = new THREE.Group();
    let widthOfPreviousCharacters = 0;

    for (let char of x.toString()) {
      if (!charCache[char]) {
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
      const characterMesh = new THREE.Mesh(
        charCache[char].geometry,
        axesMaterial
      );
      characterMesh.scale.setScalar(scale);
      characterMesh.position.x =
        widthOfPreviousCharacters + x - charCache[char].offset.x * scale;
      if (char === "-") {
        characterMesh.position.y =
          (0.125 - charCache[char].offset.y - charCache[char].size.height) *
          scale;
      } else {
        characterMesh.position.y = -charCache[char].offset.y * scale;
      }
      characterMesh.renderOrder = 1; // rendert es später -> es ist vor dem Hintergrund
      coordMesh.add(characterMesh);
      widthOfPreviousCharacters += (charCache[char].size.width + 0.025) * scale;
    }
    const coordBoundingBox = new THREE.Box3();
    coordBoundingBox.setFromObject(coordMesh, true);

    const coordBoundingBoxWidth =
      coordBoundingBox.max.x - coordBoundingBox.min.x;
    const coordBoundingBoxHeight =
      coordBoundingBox.max.y - coordBoundingBox.min.y;

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

    if (x === intersection.x) {
      coordMesh.position.x -= coordBoundingBoxWidth + 0.05 * scale;
    } else {
      coordMesh.position.x -= coordBoundingBoxWidth / 2;
    }
    coordMesh.position.y -= coordBoundingBoxHeight + 0.05 * scale;

    coordBoundingBox.setFromObject(coordMesh, true);

    if (lastXCoordBoundingBox) {
      if (
        !(
          lastXCoordBoundingBox.max.x > coordBoundingBox.min.x ||
          lastXCoordBoundingBox.max.x > coordBoundingBox.max.x
        )
      ) {
        verticalCoordGroup.add(coordMesh);
      }
    }

    lastXCoordBoundingBox = coordBoundingBox;
  }
  verticalCoordGroup.position.y += intersection.y;

  for (
    let y = Math.floor((-visibleY + camera.position.y) / step) * step;
    y <= visibleY + camera.position.y;
    y += step / 2
  ) {
    if (y !== intersection.y) {
      const coordMesh = new THREE.Group();
      let widthOfPreviousCharacters = 0;

      for (let char of y.toString()) {
        const characterMesh = new THREE.Mesh(
          charCache[char].geometry,
          axesMaterial
        );
        characterMesh.scale.setScalar(scale);
        characterMesh.position.x =
          widthOfPreviousCharacters - charCache[char].offset.x * scale;
        if (char === "-") {
          characterMesh.position.y =
            y +
            (0.125 - charCache[char].offset.y - charCache[char].size.height) *
              scale;
        } else {
          characterMesh.position.y = y - charCache[char].offset.y * scale;
        }
        characterMesh.renderOrder = 1; // rendert es später -> es ist vor dem Hintergrund
        coordMesh.add(characterMesh);
        widthOfPreviousCharacters +=
          (charCache[char].size.width + 0.025) * scale;
      }
      const coordBoundingBox = new THREE.Box3();
      coordBoundingBox.setFromObject(coordMesh, true);

      const coordBoundingBoxWidth =
        coordBoundingBox.max.x - coordBoundingBox.min.x;
      const coordBoundingBoxHeight =
        coordBoundingBox.max.y - coordBoundingBox.min.y;

      coordMesh.position.x -= coordBoundingBoxWidth + 0.05 * scale;
      coordMesh.position.y -= coordBoundingBoxHeight / 2;

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

      horizontalCoordGroup.add(coordMesh);
    }
  }
  horizontalCoordGroup.position.x += intersection.x;

  coordGroup.add(verticalCoordGroup);
  coordGroup.add(horizontalCoordGroup);
  return coordGroup;
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
      if (
        math.parse(input).filter((node) => {
          return node.isSymbolNode;
        }).length
      ) {
        outputArea.textContent = "";
        outputArea.appendChild(mj(math.parse(input)));
      } else {
        outputArea.textContent = "";
        outputArea.appendChild(mj(math.parse(input)));
        outputArea.appendChild(mj(new math.SymbolNode(" = ")));
        outputArea.appendChild(mj(new math.ConstantNode(math.evaluate(input))));
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

  parser.set("x", 0);

  if (math.parse(fx) instanceof math.FunctionAssignmentNode) {
    parser.set("f", parser.evaluate(fx));
  }

  for (
    let x = -visibleX + camera.position.x;
    x <= visibleX + camera.position.x;
    x += visibleX / renderer.domElement.width
  ) {
    let point;
    if (math.parse(fx) instanceof math.FunctionAssignmentNode) {
      let f = parser.get("f");
      point = { x: x, y: f(x), z: 0 };
    } else {
      parser.set("x", x);
      point = { x: x, y: parser.evaluate(fx), z: 0 };
    }

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
  visibleX = visibleWidthAtZDepth(camera.position.z, camera) / 2;
  visibleY = visibleHeightAtZDepth(camera.position.z, camera) / 2;

  stepX = Math.pow(2, Math.floor(Math.log2(visibleX) - 1));
  stepY = Math.pow(2, Math.floor(Math.log2(visibleY) - 1));
  step = Math.min(stepX, stepY);

  let cameraBox = {
    max: new THREE.Vector3(
      visibleX / 2 + camera.position.x,
      visibleY / 2 + camera.position.y,
      0
    ),
    min: new THREE.Vector3(
      -visibleX / 2 + camera.position.x,
      -visibleY / 2 + camera.position.y,
      0
    ),
  };
  if (activeGraphs.length) {
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
      activeGrid.boundingBox.min.y > cameraBox.min.y ||
      camera.position.z >= lastCameraZ * 2 ||
      camera.position.z <= lastCameraZ / 2
    ) {
      drawGrid();
    }
  } else {
    drawGrid();
  }
  if (activeAxes) {
    if (
      activeAxes.intersection.x !==
        Math.round((-visibleX / 2 + camera.position.x) / (step / 10)) *
          (step / 10) +
          step / 5 ||
      activeAxes.intersection.x !==
        Math.round((visibleX / 2 + camera.position.x) / (step / 10)) *
          (step / 10) -
          step / 5 ||
      activeAxes.intersection.y !==
        Math.round((-visibleY / 2 + camera.position.y) / (step / 10)) *
          (step / 10) +
          step / 5 ||
      activeAxes.intersection.y !==
        Math.round((visibleY / 2 + camera.position.y) / (step / 10)) *
          (step / 10) -
          step / 5
    ) {
      drawAxes();
    }
  } else {
    drawAxes();
  }
}
