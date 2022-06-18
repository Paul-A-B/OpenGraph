import { all, create } from "mathjs";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { generateAxes } from "./axes";
import { initCharacterCache, generateCoordinates } from "./coords";
import { generateGrid } from "./grid";
import { outputError, outputText } from "./textOutput";
import { generateGraph } from "./graph";
import { needsRedraw } from "./draw";

window.addEventListener("load", init);

THREE.Object3D.DefaultUp.set(0, 0, 1);

function init() {
  const canvas = document.getElementById("graph");
  const textIOArea = document.getElementById("text-io");
  const select = document.getElementById("mode-selection");

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    stencil: false,
    alpha: false,
    powerPreference: "high-performance",
  });
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
    0.1,
    500
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
    resolution.set(canvas.width, canvas.height);
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

  const visibleCoords = new THREE.Vector2();

  let stepX, stepY, step;

  const resolution = new THREE.Vector2(canvas.width, canvas.height);

  let activeGrid;
  function drawGrid() {
    if (activeGrid) scene.remove(activeGrid.mesh);

    activeGrid = generateGrid(
      select.value,
      resolution,
      visibleCoords,
      step,
      camera.position
    );

    scene.add(activeGrid.mesh);
  }

  initCharacterCache();

  let activeAxes;
  function drawAxes() {
    if (activeAxes) scene.remove(activeAxes.mesh);

    activeAxes = generateAxes(
      select.value,
      resolution,
      visibleCoords,
      step,
      camera.position
    );
    activeAxes.mesh.add(
      generateCoordinates(
        select.value,
        visibleCoords,
        step,
        camera.position,
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
    renderer.render(scene, camera);
  }

  function plotGraph(statement) {
    if (activeGraphs[0]) {
      scene.remove(activeGraphs[0].mesh);
      activeGraphs.shift();
    }

    activeGraphs.push(
      generateGraph(
        select.value,
        resolution,
        statement,
        visibleCoords,
        camera.position,
        canvas
      )
    );

    scene.add(activeGraphs[activeGraphs.length - 1].mesh);
  }

  controls.addEventListener("change", updateView);

  function updateView() {
    visibleCoords.set(
      visibleWidthAtZDepth(camera.position.z, camera) / 2,
      visibleHeightAtZDepth(camera.position.z, camera) / 2
    );

    stepX = Math.pow(2, Math.floor(Math.log2(visibleCoords.x) - 1));
    stepY = Math.pow(2, Math.floor(Math.log2(visibleCoords.y) - 1));
    step = Math.min(stepX, stepY);

    const redraw = needsRedraw(
      select.value,
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
    renderer.render(scene, camera);
  }

  updateView();

  select.addEventListener("change", () => {
    activeGrid = null;
    activeAxes = null;

    scene.clear();

    switch (select.value) {
      case "2D":
        scene.background = new THREE.Color(0xffffff);
        camera.position.set(0, 0, 25);
        camera.up.set(0, 1, 0);
        controls.enableRotate = false;
        break;
      case "3D":
        scene.background = new THREE.Color(0x999999);
        camera.position.set(25, 25, 12.5);
        camera.up.set(0, 0, 1);
        controls.enableRotate = true;
    }

    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    updateView();

    if (activeGraphs[0]) {
      plotGraph(activeGraphs[0].statement);
      renderer.render(scene, camera);
    }
  });

  function animate() {
    if (activeGraphs[0]) {
      if (activeGraphs[0].statement.usesTime) {
        plotGraph(activeGraphs[0].statement);
        renderer.render(scene, camera);
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}
