import { all, create } from "mathjs/number";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { generateAxes } from "./axes";
import { generateCoordinates, initCharacterCache } from "./coords";
import { needsRedraw } from "./draw";
import { generateGraph } from "./graph";
import { generateGrid } from "./grid";
import { initInputFields } from "./inputField";
import { outputError, outputText } from "./textOutput";

/**
 * # HTML-elements
 */

const canvas = document.getElementById("graph");
const textIOArea = document.getElementById("text-io");
const modeSelect = document.getElementById("mode-selection");

/**
 * # three.js variables
 */

const renderer = new WebGLRenderer({
  canvas: canvas,
  antialias: true,
  stencil: false,
  alpha: false,
  powerPreference: "high-performance",
});

const scene = new Scene();

const camera = new PerspectiveCamera(
  45,
  ((window.innerWidth - textIOArea.getBoundingClientRect().width) *
    window.devicePixelRatio) /
    (window.innerHeight * window.devicePixelRatio),
  0.075,
  500
);

const controls = new OrbitControls(camera, canvas);

const polygonMaterial = new LineMaterial({
  color: 0xfe6262,
  worldUnits: false,
  linewidth: 5,
});

/**
 * # utility
 */

const visibleCoords = new Vector2();
let stepX, stepY, step;
const resolution = new Vector2();

// https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
function visibleHeightAtZDepth(depth, camera) {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
}

function visibleWidthAtZDepth(depth, camera) {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
}

function reset() {
  const width =
    (window.innerWidth - textIOArea.getBoundingClientRect().width) *
      window.devicePixelRatio || 0;
  const height = window.innerHeight * window.devicePixelRatio || 0;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect =
      (window.innerWidth - textIOArea.getBoundingClientRect().width) /
      window.innerHeight;
    camera.updateProjectionMatrix();
  }
  resolution.set(canvas.width, canvas.height);
  updateView();
}

function removeMesh(mesh) {
  if (mesh) {
    mesh.traverse((object) => {
      if (object.material) object.material.dispose();
      if (object.geometry) object.geometry.dispose();
    });
    scene.remove(mesh);
  }
}

/**
 * # drawing functions
 */

let activeAxes;
function drawAxes() {
  if (activeAxes) {
    removeMesh(activeAxes.mesh);
  }

  activeAxes = generateAxes(
    modeSelect.value,
    resolution,
    visibleCoords,
    step,
    camera.position
  );
  activeAxes.mesh.add(
    generateCoordinates(
      modeSelect.value,
      visibleCoords,
      step,
      camera.position,
      activeAxes.intersection
    )
  );

  scene.add(activeAxes.mesh);
}

let activeGrid;
function drawGrid() {
  if (activeGrid) {
    removeMesh(activeGrid.mesh);
  }

  activeGrid = generateGrid(
    modeSelect.value,
    resolution,
    visibleCoords,
    step,
    camera.position
  );

  scene.add(activeGrid.mesh);
}

function plotGraph(input) {
  const oldInput = activeInputs.filter((existingInput) => {
    return existingInput.owner === input.owner;
  })[0];

  if (oldInput) {
    removeMesh(oldInput.graph.mesh);

    oldInput.statement = input.statement;

    if (input.statement.isPoint) {
      oldInput.graph = generatePoint(input.statement.scope);
    } else if (input.statement.isPolygon) {
      oldInput.graph = generatePolygon(input.statement.scope);
    } else {
      oldInput.graph = generateGraph(
        modeSelect.value,
        globalScope,
        resolution,
        input.statement,
        visibleCoords,
        camera.position,
        canvas
      );
    }

    scene.add(oldInput.graph.mesh);
  } else {
    if (input.statement.isPoint) {
      input.graph = generatePoint(input.statement.scope);
    } else if (input.statement.isPolygon) {
      input.graph = generatePolygon(input.statement.scope);
    } else {
      input.graph = generateGraph(
        modeSelect.value,
        globalScope,
        resolution,
        input.statement,
        visibleCoords,
        camera.position,
        canvas
      );
    }

    activeInputs.push(input);

    scene.add(activeInputs[activeInputs.length - 1].graph.mesh);
  }
}

const pointMaterial = new PointsMaterial({
  color: 0x8c0101,
  size: 15,
  sizeAttenuation: false,
});

function generatePoint(coords) {
  for (let i = 0; i < 3; i++) {
    if (coords[i]) {
      coords[i] =
        coords[i].evaluate(globalScope) || globalScope[coords[i].name] || 0;
    } else {
      coords[i] = 0;
    }
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(coords, 3));

  const point = new Points(geometry, pointMaterial);
  point.renderOrder = 6;

  return { mesh: point };
}

function generatePolygon(points) {
  const linePoints = [];

  for (const point of points) {
    linePoints.push(globalScope[point].scope);
  }

  linePoints.push(linePoints[0]);

  const polygonGeometry = new LineGeometry();
  polygonGeometry.setPositions(linePoints.flat());

  polygonMaterial.resolution = resolution;

  const polygon = new Line2(polygonGeometry, polygonMaterial);
  polygon.renderOrder = 1;

  return { mesh: polygon };
}

/**
 * # draw-managing functions
 */

function updateView() {
  visibleCoords.set(
    visibleWidthAtZDepth(camera.position.z, camera) / 2,
    visibleHeightAtZDepth(camera.position.z, camera) / 2
  );

  stepX = Math.pow(2, Math.floor(Math.log2(visibleCoords.x) - 1));
  stepY = Math.pow(2, Math.floor(Math.log2(visibleCoords.y) - 1));
  step = Math.min(stepX, stepY);

  const redraw = needsRedraw(
    modeSelect.value,
    visibleCoords,
    step,
    camera.position,
    activeInputs,
    activeGrid,
    activeAxes
  );

  for (let i = 0; i < activeInputs.length; i++) {
    if (redraw.graph[i]) {
      plotGraph(activeInputs[i]);
    }
  }

  if (redraw.grid) {
    drawGrid();
  }
  if (redraw.axes) {
    drawAxes();
  }
  renderer.render(scene, camera);
}

function animate() {
  for (const activeInput of activeInputs) {
    if (activeInput.statement.usesTime) {
      globalScope.t = Math.sin(Date.now() / 1000) * 2 * Math.PI;

      try {
        plotGraph(activeInput);
      } catch (error) {
        const outputArea =
          activeInput.owner.parentNode.getElementsByClassName("output")[0];
        outputError(activeInput.mathNode, error, outputArea);
      }

      renderer.render(scene, camera);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * # input management
 */

const math = create(all, {});

const activeInputs = [];

const globalScope = {};
globalScope.t = Math.sin(Date.now() / 1000) * 2 * Math.PI;

function generateScope(mathNode) {
  const scope = {};

  if (mathNode.isFunctionAssignmentNode) {
    for (const variable of mathNode.params) {
      scope[variable] = undefined;
    }
  } else {
    for (const variable of mathNode.filter((node, path, parent) => {
      if (parent) {
        return node.isSymbolNode && !(parent.fn === node);
      } else {
        return node.isSymbolNode;
      }
    })) {
      if (!scope[variable]) {
        try {
          variable.evaluate();
        } catch (error) {
          scope[variable] = undefined;
        }
      }
    }
  }

  return scope;
}

function Input(htmlElement, statement, graph) {
  this.owner = htmlElement;
  this.statement = statement;
  this.graph = graph;
}

function Statement(mathNode) {
  if (mathNode.isFunctionAssignmentNode) {
    this.mathNode = mathNode.expr;
  } else {
    this.mathNode = mathNode;
  }

  if (
    mathNode.isFunctionNode &&
    (mathNode.name === "Punkt" || mathNode.name === "Polygon")
  ) {
    this.scope = mathNode.args;
  } else {
    this.scope = generateScope(mathNode);
  }

  this.usesTime = Boolean(
    mathNode.filter((node) => {
      return node.isSymbolNode && node.name == "t";
    }).length
  );

  this.isPoint =
    (mathNode.isFunctionNode && mathNode.name === "Punkt") || false;

  this.isPolygon =
    (mathNode.isFunctionNode && mathNode.name === "Polygon") || false;
}

function takeInput(event) {
  const inputText = `${event.target.value}`;

  if (!inputText) {
    const oldInput = activeInputs.filter((existingInput) => {
      return existingInput.owner === event.target;
    })[0];

    if (oldInput) {
      removeMesh(oldInput.graph.mesh);
      activeInputs.splice(activeInputs.indexOf(oldInput), 1);
    }
  }

  const outputArea =
    event.target.parentNode.getElementsByClassName("output")[0];
  try {
    let mathNode = math.parse(inputText);
    outputText(math, inputText, mathNode, outputArea);

    if (mathNode.isAssignmentNode) {
      if (mathNode.value.isFunctionNode && mathNode.value.name === "Punkt") {
        globalScope[mathNode.name] = new Statement(mathNode.value);
        mathNode = mathNode.value;
      } else {
        globalScope[mathNode.name] = mathNode.value.evaluate(globalScope);
      }
    }

    if (inputText) {
      plotGraph(new Input(event.target, new Statement(mathNode)));
    }
  } catch (error) {
    outputError(inputText, error, outputArea);
  }
  renderer.render(scene, camera);
}

function handleInputRemoval(event) {
  const oldInput = activeInputs.filter((existingInput) => {
    return existingInput.owner === event.detail;
  })[0];

  if (oldInput) {
    removeMesh(oldInput.graph.mesh);
    activeInputs.splice(activeInputs.indexOf(oldInput), 1);
  }

  renderer.render(scene, camera);
}

/**
 * # mode initialisation
 */

window.addEventListener("load", init);

function changeMode() {
  activeGrid = null;
  activeAxes = null;

  scene.clear();

  switch (modeSelect.value) {
    case "2D":
      scene.background = new Color(0xffffff);
      camera.position.set(0, 0, 25);
      camera.up.set(0, 1, 0);
      controls.enableRotate = false;
      break;
    case "3D":
      scene.background = new Color(0x999999);
      camera.position.set(25, 25, 12.5);
      camera.up.set(0, 0, 1);
      controls.enableRotate = true;
      break;
  }

  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();

  updateView();

  for (const activeInput of activeInputs) {
    plotGraph(activeInput);
    renderer.render(scene, camera);
  }
}

async function init() {
  Object3D.DefaultUp.set(0, 0, 1);

  renderer.setSize(
    (window.innerWidth - textIOArea.getBoundingClientRect().width) *
      window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio,
    false
  );

  camera.position.set(0, 0, 25);
  camera.lookAt(0, 0, 0);

  scene.background = new Color(0xffffff);

  controls.enableRotate = false;
  controls.maxDistance = 200;
  controls.minDistance = 0.1;

  canvas.addEventListener("webglcontextlost", function () {
    location.reload();
  });

  window.addEventListener("resize", reset);

  resolution.set(canvas.width, canvas.height);

  await initCharacterCache();

  initInputFields(textIOArea, takeInput);

  textIOArea.addEventListener("inputFieldRemoved", handleInputRemoval);

  controls.addEventListener("change", updateView);

  updateView();

  modeSelect.addEventListener("change", changeMode);

  animate();
}
