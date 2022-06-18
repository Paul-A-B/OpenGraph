import { Group, Vector2, Vector3 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const axesMaterial = new LineMaterial({
  color: 0x000000,
  worldUnits: false,
  linewidth: 7.5,
  depthWrite: false,
});

function Axes(mesh, intersection) {
  this.mesh = mesh;
  this.intersection = intersection;
}

export function generateAxes(
  mode,
  resolution,
  visibleCoords,
  step,
  cameraPosition
) {
  axesMaterial.resolution.copy(resolution);
  switch (mode) {
    case "2D":
      return cartesian2D(visibleCoords, step, cameraPosition);
    case "3D":
      return cartesian3D();
  }
}

function cartesian2D(visibleCoords, step, cameraPosition) {
  const axesLinesGroup = new Group();

  const intersection = new Vector2();

  if (-visibleCoords.x / 2 + cameraPosition.x + step / 5 >= 0) {
    intersection.x =
      Math.round((-visibleCoords.x / 2 + cameraPosition.x) / (step / 10)) *
        (step / 10) +
      step / 5;
  } else if (visibleCoords.x / 2 + cameraPosition.x - step / 5 <= 0) {
    intersection.x =
      Math.round((visibleCoords.x / 2 + cameraPosition.x) / (step / 10)) *
        (step / 10) -
      step / 5;
  } else {
    intersection.x = 0;
  }

  const verticalAxesPoints = [];
  verticalAxesPoints.push(
    intersection.x,
    -visibleCoords.y + cameraPosition.y,
    0
  );
  verticalAxesPoints.push(
    intersection.x,
    visibleCoords.y + cameraPosition.y,
    0
  );

  const verticalAxisGeometry = new LineGeometry().setPositions(
    verticalAxesPoints
  );

  const verticalAxis = new Line2(verticalAxisGeometry, axesMaterial);
  verticalAxis.renderOrder = 2;

  axesLinesGroup.add(verticalAxis);

  if (-visibleCoords.y / 2 + cameraPosition.y + step / 5 >= 0) {
    intersection.y =
      Math.round((-visibleCoords.y / 2 + cameraPosition.y) / (step / 10)) *
        (step / 10) +
      step / 5;
  } else if (visibleCoords.y / 2 + cameraPosition.y - step / 5 <= 0) {
    intersection.y =
      Math.round((visibleCoords.y / 2 + cameraPosition.y) / (step / 10)) *
        (step / 10) -
      step / 5;
  } else {
    intersection.y = 0;
  }

  const horizontalAxesPoints = [];
  horizontalAxesPoints.push(
    -visibleCoords.x + cameraPosition.x,
    intersection.y,
    0
  );
  horizontalAxesPoints.push(
    visibleCoords.x + cameraPosition.x,
    intersection.y,
    0
  );

  const horizontalAxisGeometry = new LineGeometry().setPositions(
    horizontalAxesPoints
  );

  const horizontalAxis = new Line2(horizontalAxisGeometry, axesMaterial);
  horizontalAxis.renderOrder = 2;

  axesLinesGroup.add(horizontalAxis);

  const axesGroup = new Group();

  axesGroup.add(axesLinesGroup);

  return new Axes(axesGroup, intersection);
}

function cartesian3D() {
  const axesLinesGroup = new Group();

  const length = new Vector3(10, 10, 10);

  const verticalAxesPoints = [];
  verticalAxesPoints.push(0, -length.y, 0);
  verticalAxesPoints.push(0, length.y, 0);

  const verticalAxisGeometry = new LineGeometry().setPositions(
    verticalAxesPoints
  );

  const verticalAxis = new Line2(verticalAxisGeometry, axesMaterial);
  verticalAxis.renderOrder = 2;

  axesLinesGroup.add(verticalAxis);

  const horizontalAxesPoints = [];
  horizontalAxesPoints.push(-length.x, 0, 0);
  horizontalAxesPoints.push(length.x, 0, 0);

  const horizontalAxisGeometry = new LineGeometry().setPositions(
    horizontalAxesPoints
  );

  const horizontalAxis = new Line2(horizontalAxisGeometry, axesMaterial);
  horizontalAxis.renderOrder = 2;

  axesLinesGroup.add(horizontalAxis);

  const lateralAxesPoints = [];
  lateralAxesPoints.push(0, 0, -length.z);
  lateralAxesPoints.push(0, 0, length.z);

  const lateralAxesGeometry = new LineGeometry().setPositions(
    lateralAxesPoints
  );

  const lateralAxis = new Line2(lateralAxesGeometry, axesMaterial);
  lateralAxis.renderOrder = 2;

  axesLinesGroup.add(lateralAxis);

  const axesGroup = new Group();

  axesGroup.add(axesLinesGroup);

  return new Axes(axesGroup, new Vector3());
}
