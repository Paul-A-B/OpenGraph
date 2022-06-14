import { all, create } from "mathjs";
import * as THREE from "three";
import { MeshLineMaterial } from "three.meshline";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { generateAxes } from "./axes";
import { Coordinates } from "./coords";
import { generateGrid } from "./grid";
import { outputError, outputText } from "./textOutput";
import { generateGraph } from "./graph";
import { needsRedraw } from "./draw";

window.addEventListener("load", init);

function init() {
  const canvas = document.getElementById("graph");
  const textIOArea = document.getElementById("text-io");
  const select = document.getElementById("mode-selection");

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

  const controls = new OrbitControls(camera, canvas);
  controls.enableRotate = false;
  controls.maxDistance = 200;
  controls.minDistance = 0.1;

  canvas.addEventListener("webglcontextlost", function () {
    location.reload();
  });

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
    updateView();
  }

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

  const visibleCoords = { x: undefined, y: undefined };

  let stepX = Math.pow(2, Math.floor(Math.log2(visibleCoords.x) - 1));
  let stepY = Math.pow(2, Math.floor(Math.log2(visibleCoords.y) - 1));
  let step = Math.min(stepX, stepY);

  const minorGridLineMaterial = new MeshLineMaterial({
    color: 0x606060,
    resolution: new THREE.Vector2(canvas.width, canvas.height),
    sizeAttenuation: 0,
    lineWidth: 2.5,
  });
  const majorGridLineMaterial = new MeshLineMaterial({
    color: 0x303030,
    resolution: new THREE.Vector2(canvas.width, canvas.height),
    sizeAttenuation: 0,
    lineWidth: 5,
  });
  const axesMaterial = new MeshLineMaterial({
    color: 0x000000,
    resolution: new THREE.Vector2(canvas.width, canvas.height),
    sizeAttenuation: 0,
    lineWidth: 7.5,
  });
  const graphMaterial = new MeshLineMaterial({
    color: 0x000000,
    resolution: new THREE.Vector2(canvas.width, canvas.height),
    sizeAttenuation: 0,
    lineWidth: 10,
  });

  let activeGrid;
  function drawGrid() {
    if (activeGrid) scene.remove(activeGrid.mesh);

    activeGrid = generateGrid(
      minorGridLineMaterial,
      majorGridLineMaterial,
      visibleCoords,
      step,
      camera.position
    );

    scene.add(activeGrid.mesh);
  }

  let activeAxes;
  const coordinates = new Coordinates();
  function drawAxes() {
    if (activeAxes) scene.remove(activeAxes.mesh);

    activeAxes = generateAxes(
      visibleCoords,
      step,
      camera.position,
      axesMaterial
    );
    activeAxes.mesh.add(
      coordinates.generate(
        visibleCoords,
        step,
        camera.position,
        axesMaterial,
        activeAxes.intersection
      )
    );

    scene.add(activeAxes.mesh);
  }

  const math = create(all, {});

  const inputArea = document.getElementById("input");

  inputArea.addEventListener("input", takeInput);

  function Statement(fnNode) {
    this.fnNode = fnNode;
    this.usesTime = fnNode.filter((node) => {
      return node.isSymbolNode && node.name == "t";
    }).length;
  }

  const activeGraphs = [];
  const scope = { x: 0, y: 0, z: 0 };
  function takeInput() {
    const input = inputArea.value;
    try {
      if (activeGraphs[0]) {
        scene.remove(activeGraphs[0].mesh);
        activeGraphs.shift();
      }

      const mathNode = math.parse(input);
      outputText(input, mathNode);

      if (mathNode.isAssignmentNode) {
        scope[mathNode.name] = mathNode.value;
      }

      if (input) {
        plotGraph(new Statement(mathNode));
      }
    } catch (error) {
      outputError(input, error);
    }
  }

  function plotGraph(statement) {
    if (activeGraphs[0]) {
      scene.remove(activeGraphs[0].mesh);
      activeGraphs.shift();
    }

    activeGraphs.push(
      generateGraph(
        statement,
        scope,
        visibleCoords,
        camera.position,
        canvas,
        graphMaterial
      )
    );

    scene.add(activeGraphs[activeGraphs.length - 1].mesh);
  }

  controls.addEventListener("change", updateView);

  function updateView() {
    visibleCoords.x = visibleWidthAtZDepth(camera.position.z, camera) / 2;
    visibleCoords.y = visibleHeightAtZDepth(camera.position.z, camera) / 2;

    stepX = Math.pow(2, Math.floor(Math.log2(visibleCoords.x) - 1));
    stepY = Math.pow(2, Math.floor(Math.log2(visibleCoords.y) - 1));
    step = Math.min(stepX, stepY);

    const redraw = needsRedraw(
      visibleCoords,
      step,
      camera.position,
      activeGraphs,
      activeGrid,
      activeAxes
    );

    if (redraw.graph) {
      plotGraph(activeGraphs[0].statement);
    }
    if (redraw.grid) {
      drawGrid();
    }
    if (redraw.axes) {
      drawAxes();
    }
  }

  updateView();

  select.addEventListener("change", () => {
    controls.enableRotate = !controls.enableRotate;
    updateView();
  });

  function animate() {
    if (activeGraphs[0]) {
      if (activeGraphs[0].statement.usesTime) {
        plotGraph(activeGraphs[0].statement);
      }
    }
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  animate();
}
