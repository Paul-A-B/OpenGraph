import * as THREE from "three";

let lastCameraZ;
let zoomRepaint = false;

function Redraw(graph = false, grid = false, axes = false) {
  this.graph = graph;
  this.grid = grid;
  this.axes = axes;
}

export function needsRedraw(
  mode,
  visibleCoords,
  step,
  cameraPosition,
  activeGraphs,
  activeGrid,
  activeAxes
) {
  switch (mode) {
    case "2D":
      return cartesian2D(
        visibleCoords,
        step,
        cameraPosition,
        activeGraphs,
        activeGrid,
        activeAxes
      );
    case "3D":
      const redraw = new Redraw();

      if (!activeGrid) {
        redraw.grid = true;
      }
      if (!activeAxes) {
        redraw.axes = true;
      }

      return redraw;
  }
}

function cartesian2D(
  visibleCoords,
  step,
  cameraPosition,
  activeGraphs,
  activeGrid,
  activeAxes
) {
  const cameraBox = new THREE.Box3(
    new THREE.Vector3(
      -visibleCoords.x / 2 + cameraPosition.x,
      -visibleCoords.y / 2 + cameraPosition.y,
      0
    ),
    new THREE.Vector3(
      visibleCoords.x / 2 + cameraPosition.x,
      visibleCoords.y / 2 + cameraPosition.y,
      0
    )
  );

  const redraw = new Redraw();

  if (
    cameraPosition.z >= lastCameraZ * 1.2 ||
    cameraPosition.z <= lastCameraZ / 1.2 ||
    !lastCameraZ
  ) {
    zoomRepaint = true;
    lastCameraZ = cameraPosition.z;
  } else {
    zoomRepaint = false;
  }

  if (activeGraphs.length) {
    if (
      activeGraphs[0].boundingBox.max.x < cameraBox.max.x ||
      activeGraphs[0].boundingBox.min.x > cameraBox.min.x ||
      zoomRepaint
    ) {
      redraw.graph = true;
    }
  }

  if (activeGrid) {
    if (
      activeGrid.boundingBox.max.x < cameraBox.max.x ||
      activeGrid.boundingBox.max.y < cameraBox.max.y ||
      activeGrid.boundingBox.min.x > cameraBox.min.x ||
      activeGrid.boundingBox.min.y > cameraBox.min.y ||
      zoomRepaint
    ) {
      redraw.grid = true;
    }
  } else {
    redraw.grid = true;
  }

  if (activeAxes) {
    if (
      activeAxes.intersection.x !==
        Math.round((-visibleCoords.x / 2 + cameraPosition.x) / (step / 10)) *
          (step / 10) +
          step / 5 ||
      activeAxes.intersection.x !==
        Math.round((visibleCoords.x / 2 + cameraPosition.x) / (step / 10)) *
          (step / 10) -
          step / 5 ||
      activeAxes.intersection.y !==
        Math.round((-visibleCoords.y / 2 + cameraPosition.y) / (step / 10)) *
          (step / 10) +
          step / 5 ||
      activeAxes.intersection.y !==
        Math.round((visibleCoords.y / 2 + cameraPosition.y) / (step / 10)) *
          (step / 10) -
          step / 5 ||
      zoomRepaint
    ) {
      redraw.axes = true;
    }
  } else {
    redraw.axes = true;
  }
  return redraw;
}
