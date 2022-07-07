import { all, create } from "mathjs/number";
import {
  Box2,
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

/*
# HTML-elements
*/

const canvas = document.getElementById("graph");
const textIOArea = document.getElementById("text-io");
const modeSelect = document.getElementById("mode-selection");

/*
# three.js
*/

// sets the z-axis to mean up
Object3D.DefaultUp.set(0, 0, 1);

const renderer = new WebGLRenderer({
  canvas: canvas,
  antialias: true,
  stencil: false,
  alpha: false,
  powerPreference: "high-performance",
});

const scene = new Scene();

/*
fov chosen abitrarily,
aspect ratio takes input area into account,
near- and far-plane chosen to avoid clipping at current min/max zoom,
while still being as small as possible for performance reasons 
*/
const camera = new PerspectiveCamera(
  45,
  ((window.innerWidth - textIOArea.getBoundingClientRect().width) *
    window.devicePixelRatio) /
    (window.innerHeight * window.devicePixelRatio),
  0.075,
  250
);

const controls = new OrbitControls(camera, canvas);

/*
# utility
*/

// width and height of view area in world units, detached from camera position
const visibleCoords = new Vector2();

// size between major grid lines
let gridSizeX, gridSizeY, gridSize;

// size between minor grid lines
let gridCellSize;

// resolution of the display area
const resolution = new Vector2();

// world units the camera currently sees, position factored in
const viewArea = new Box2();

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

// update resolution of camera, renderer etc. and check for redrawing
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

// deallocate memory when removing object
function removeMesh(mesh) {
  if (mesh) {
    mesh.traverse((object) => {
      if (object.material) object.material.dispose();
      if (object.geometry) object.geometry.dispose();
    });
    scene.remove(mesh);
  }
}

/*
# drawing background
*/

let activeAxes;
function drawAxes(zoomRepaint) {
  const intersection = new Vector2();

  if (activeAxes) {
    switch (modeSelect.value) {
      case "2D":
        /*
        end of axes isn't in view and no redraw based on zoom
        -> checks for change in intersection
        */
        if (
          !(
            activeAxes.boundingBox.max.x < viewArea.max.x ||
            activeAxes.boundingBox.max.y < viewArea.max.y ||
            activeAxes.boundingBox.min.x > viewArea.min.x ||
            activeAxes.boundingBox.min.y > viewArea.min.y
          ) &&
          !zoomRepaint
        ) {
          // how far the axis should be from the edge of the viewport
          const sideOffset = 2 * gridCellSize;

          for (const dimension of "xy") {
            // move intersection depending on view
            if (viewArea.min[dimension] + sideOffset >= 0) {
              // align intersection with grid
              intersection[dimension] =
                Math.round(viewArea.min[dimension] / gridCellSize) *
                  gridCellSize +
                sideOffset;
            } else if (viewArea.max[dimension] - sideOffset <= 0) {
              intersection[dimension] =
                Math.round(viewArea.max[dimension] / gridCellSize) *
                  gridCellSize -
                sideOffset;
            } else {
              intersection[dimension] = 0;
            }
          }

          // cancels redraw if intersection is the same
          if (
            activeAxes.intersection.x === intersection.x &&
            activeAxes.intersection.y === intersection.y
          )
            return;
        } else {
          /*
          end of axes is in view or redraw based on zoom,
          reuse same intersection
          */
          intersection.copy(activeAxes.intersection);
        }
        break;
      // only draws axes once
      case "3D":
        return;
    }

    removeMesh(activeAxes.mesh);
  }

  activeAxes = generateAxes(
    modeSelect.value,
    resolution,
    visibleCoords,
    camera.position,
    intersection
  );

  // coordinates get added to axes group
  activeAxes.mesh.add(
    generateCoordinates(
      modeSelect.value,
      visibleCoords,
      gridSize,
      camera.position,
      intersection
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
    gridSize,
    camera.position
  );

  scene.add(activeGrid.mesh);
}

/*
# plotting math
*/

function plotGraph(input) {
  // get the graph previously associated with the input element
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

    scene.add(input.graph.mesh);
  }
}

const pointMaterial = new PointsMaterial({
  color: 0x8c0101,
  size: 15,

  // size now refers to pixels instead
  sizeAttenuation: false,
});

function generatePoint(coords) {
  for (let i = 0; i < 3; i++) {
    try {
      coords[i] = coords[i].evaluate(globalScope) || 0;
    } catch (e) {
      coords[i] = 0;
    }
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(coords, 3));

  const point = new Points(geometry, pointMaterial);
  point.renderOrder = 6;

  return { mesh: point };
}

const polygonMaterial = new LineMaterial({
  color: 0xfe6262,

  // linewidth now refers to pixels instead
  worldUnits: false,
  linewidth: 5,

  /*
  doesn't affect the three.js depth buffer to avoid
  the lines clipping through the points
  */
  depthWrite: false,
});

function generatePolygon(points) {
  const linePoints = [];

  for (const point of points) {
    // scope contains value for all dimensions
    linePoints.push(globalScope[point].scope);
  }

  linePoints.push(linePoints[0]);

  const polygonGeometry = new LineGeometry();

  // remove nested arrays so the position attribute can function properly
  polygonGeometry.setPositions(linePoints.flat());

  // resolution needed for adaptive line width (world units == false)
  polygonMaterial.resolution = resolution;

  const polygon = new Line2(polygonGeometry, polygonMaterial);
  polygon.renderOrder = 5;

  return { mesh: polygon };
}

/*
# draw-managing 
*/

function updateView() {
  // because z acts as zoom, depth must be 0
  visibleCoords.set(
    visibleWidthAtZDepth(0, camera),
    visibleHeightAtZDepth(0, camera)
  );

  // logarithmic grid size
  gridSizeX = Math.pow(2, Math.floor(Math.log2(visibleCoords.x) - 2));
  gridSizeY = Math.pow(2, Math.floor(Math.log2(visibleCoords.y) - 2));

  // max better deals with extreme aspect ratios
  gridSize = Math.max(gridSizeX, gridSizeY);

  viewArea.set(
    new Vector2(
      -visibleCoords.x / 2 + camera.position.x,
      -visibleCoords.y / 2 + camera.position.y
    ),
    new Vector2(
      visibleCoords.x / 2 + camera.position.x,
      visibleCoords.y / 2 + camera.position.y
    )
  );

  gridCellSize = gridSize / 10;

  const redraw = needsRedraw(
    modeSelect.value,
    viewArea,
    camera.position,
    activeInputs,
    activeGrid
  );

  for (let i = 0; i < activeInputs.length; i++) {
    if (redraw.graph[i]) {
      plotGraph(activeInputs[i]);
    }
  }

  if (redraw.grid) {
    drawGrid();
  }

  /*
  handling is done inside generateAxes to reuse the
  calculated intersection needed for the 2D redraw check
  */
  drawAxes(redraw.zoomRepaint);

  renderer.render(scene, camera);
}

function animate() {
  // only rerender once, if it is necessary
  let rerender = false;

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

      rerender = true;
    }
  }

  if (rerender) renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

/*
# input management
*/

// used for expression parsing and evaluation
const math = create(all, {});

const activeInputs = [];

// holds variables for every function
const globalScope = {};

// t used for time
globalScope.t = Math.sin(Date.now() / 1000) * 2 * Math.PI;

// find the variables used in the expression
function generateScope(mathNode) {
  const scope = {};

  // if parameters are given, use them
  if (mathNode.isFunctionAssignmentNode) {
    for (const variable of mathNode.params) {
      scope[variable] = undefined;
    }
  } else {
    for (const variable of mathNode.filter((node, path, parent) => {
      if (parent) {
        // if parent.fn == node, then it is a predefined function in math.js
        return node.isSymbolNode && !(parent.fn === node);
      } else {
        return node.isSymbolNode;
      }
    })) {
      if (!scope[variable]) {
        // sees if the variable already exists in math.js
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
  // makes f(x) = x && x behave the same way
  if (mathNode.isFunctionAssignmentNode) {
    this.mathNode = mathNode.expr;
  } else {
    this.mathNode = mathNode;
  }

  // check for custom geometry functions
  if (
    mathNode.isFunctionNode &&
    (mathNode.name === "Punkt" || mathNode.name === "Polygon")
  ) {
    // scope contains the values of one point or multiple points
    this.scope = mathNode.args;
  } else {
    // scope containes used variables
    this.scope = generateScope(mathNode);
  }

  this.usesTime = Boolean(
    mathNode.filter((node) => {
      return node.isSymbolNode && node.name === "t";
    }).length
  );

  // || false to avoid undefined values
  this.isPoint =
    (mathNode.isFunctionNode && mathNode.name === "Punkt") || false;

  this.isPolygon =
    (mathNode.isFunctionNode && mathNode.name === "Polygon") || false;
}

function takeInput(event) {
  const inputText = event.target.value;

  if (!inputText) {
    const oldInput = activeInputs.filter((existingInput) => {
      return existingInput.owner === event.target;
    })[0];

    if (oldInput) {
      removeMesh(oldInput.graph.mesh);

      // remove variable from global scope
      delete globalScope[oldInput.statement.mathNode.name];

      // remove input in array
      activeInputs.splice(activeInputs.indexOf(oldInput), 1);
    }
  }

  // only one output class should exist in parent
  const outputArea =
    event.target.parentNode.getElementsByClassName("output")[0];
  try {
    // input becomes expression tree
    let mathNode = math.parse(inputText);

    // display formatted math
    outputText(math, globalScope, inputText, mathNode, outputArea);

    // adds variable to global scope
    if (mathNode.isAssignmentNode) {
      // assign point to a variable for use with polygon
      if (mathNode.value.isFunctionNode && mathNode.value.name === "Punkt") {
        globalScope[mathNode.name] = new Statement(mathNode.value);
        mathNode = mathNode.value;
      } else {
        // evaluate allows assignment that depends on existing variables
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

    // remove variable from global scope
    delete globalScope[oldInput.statement.mathNode.name];

    // remove input in array
    activeInputs.splice(activeInputs.indexOf(oldInput), 1);
  }

  renderer.render(scene, camera);
}

/*
# mode initialisation
*/

window.addEventListener("load", init);

// reset to initial configuration for specific mode
function changeMode() {
  activeGrid = null;
  activeAxes = null;

  scene.clear();

  switch (modeSelect.value) {
    case "2D":
      scene.background = new Color(0xffffff);
      camera.position.set(0, 0, 25);
      controls.enableRotate = false;
      break;
    case "3D":
      scene.background = new Color(0x999999);
      camera.position.set(25, 25, 12.5);
      controls.enableRotate = true;
      break;
  }

  camera.lookAt(0, 0, 0);

  // point around which the controls orbit
  controls.target.set(0, 0, 0);

  // need to be called after manual alteration of controls
  controls.update();

  updateView();

  // replot every existing graph, independent from updateView()
  for (const activeInput of activeInputs) {
    plotGraph(activeInput);
  }

  renderer.render(scene, camera);
}

async function init() {
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

  // max/min zoom
  controls.maxDistance = 200;
  controls.minDistance = 0.1;

  resolution.set(canvas.width, canvas.height);

  // waits for the charCache to initialise
  await initCharacterCache();

  // reloads site if webglcontext error accurs
  canvas.addEventListener("webglcontextlost", function () {
    location.reload();
  });

  // adds corresponding event handlers

  window.addEventListener("resize", reset);

  initInputFields(textIOArea, takeInput);

  textIOArea.addEventListener("inputFieldRemoved", handleInputRemoval);

  controls.addEventListener("change", updateView);

  modeSelect.addEventListener("change", changeMode);

  // needed for initial rotation of camera
  controls.update();

  // start animation loop
  animate();
}
