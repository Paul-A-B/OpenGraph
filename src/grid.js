import { Group, Box3 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const minorGridLineMaterial = new LineMaterial({
  color: 0x454545,
  worldUnits: false,
  linewidth: 2.5,
  depthWrite: false,
});
const majorGridLineMaterial = new LineMaterial({
  color: 0x151515,
  worldUnits: false,
  linewidth: 5,
  depthWrite: false,
});

function Grid(mesh, boundingBox) {
  (this.mesh = mesh), (this.boundingBox = boundingBox);
}

export function generateGrid(
  mode,
  resolution,
  visibleCoords,
  step,
  cameraPosition
) {
  minorGridLineMaterial.resolution.copy(resolution);
  majorGridLineMaterial.resolution.copy(resolution);
  switch (mode) {
    case "2D":
      return cartesian2D(visibleCoords, step, cameraPosition);
    case "3D":
      return cartesian3D();
  }
}

function cartesian2D(visibleCoords, step, cameraPosition) {
  const gridGroup = new Group();

  const verticalLines = new Group();
  const horizontalLines = new Group();

  for (
    let x = Math.round((-visibleCoords.x + cameraPosition.x) / step) * step,
      iteration = 0;
    x <= visibleCoords.x + cameraPosition.x;
    x += step / 10, iteration++
  ) {
    const verticalPoints = [];
    verticalPoints.push(x, -visibleCoords.y + cameraPosition.y, 0);
    verticalPoints.push(x, visibleCoords.y + cameraPosition.y, 0);

    const verticalLineGeometry = new LineGeometry().setPositions(
      verticalPoints
    );

    if (iteration % 10 === 0) {
      verticalLines.add(new Line2(verticalLineGeometry, majorGridLineMaterial));
    } else {
      verticalLines.add(new Line2(verticalLineGeometry, minorGridLineMaterial));
    }
  }
  gridGroup.add(verticalLines);

  for (
    let y = Math.floor((-visibleCoords.y + cameraPosition.y) / step) * step,
      iteration = 0;
    y <= visibleCoords.y + cameraPosition.y;
    y += step / 10, iteration++
  ) {
    const horizontalPoints = [];
    horizontalPoints.push(-visibleCoords.x + cameraPosition.x, y, 0);
    horizontalPoints.push(visibleCoords.x + cameraPosition.x, y, 0);

    const horizontalLineGeometry = new LineGeometry().setPositions(
      horizontalPoints
    );

    if (iteration % 10 === 0) {
      horizontalLines.add(
        new Line2(horizontalLineGeometry, majorGridLineMaterial)
      );
    } else {
      horizontalLines.add(
        new Line2(horizontalLineGeometry, minorGridLineMaterial)
      );
    }
  }
  gridGroup.add(horizontalLines);

  const gridBoundingBox = new Box3();
  gridBoundingBox.setFromObject(gridGroup, true);

  return new Grid(gridGroup, gridBoundingBox);
}

function cartesian3D() {
  const gridGroup = new Group();

  const length = {
    x: 10,
    y: 10,
    z: 10,
  };

  const xyLines = new Group();
  const xzLines = new Group();
  const yxLines = new Group();
  const yzLines = new Group();
  const zxLines = new Group();
  const zyLines = new Group();

  for (
    let x = Math.round(-length.x), iteration = -5;
    x <= length.x;
    x += Math.round(length.x / 5) / 5, iteration++
  ) {
    const xyPoints = [];
    xyPoints.push(x, -length.y, 0);
    xyPoints.push(x, length.y, 0);

    const xyLineGeometry = new LineGeometry().setPositions(xyPoints);

    let xyLine;
    if (iteration % 10 === 0) {
      xyLine = new Line2(xyLineGeometry, majorGridLineMaterial);
    } else {
      xyLine = new Line2(xyLineGeometry, minorGridLineMaterial);
    }
    xyLine.renderOrder = 1;
    xyLines.add(xyLine);
  }
  gridGroup.add(xyLines);

  for (
    let x = Math.round(-length.x), iteration = -5;
    x <= length.x;
    x += Math.round(length.x / 5) / 5, iteration++
  ) {
    const xzPoints = [];
    xzPoints.push(x, 0, -length.z);
    xzPoints.push(x, 0, length.z);

    const xzLineGeometry = new LineGeometry().setPositions(xzPoints);

    let xzLine;
    if (iteration % 10 === 0) {
      xzLine = new Line2(xzLineGeometry, majorGridLineMaterial);
    } else {
      xzLine = new Line2(xzLineGeometry, minorGridLineMaterial);
    }
    xzLine.renderOrder = 1;
    xzLines.add(xzLine);
  }
  gridGroup.add(xzLines);

  for (
    let y = -length.y, iteration = -5;
    y <= length.y;
    y += Math.round(length.y / 5) / 5, iteration++
  ) {
    const yxPoints = [];
    yxPoints.push(-length.x, y, 0);
    yxPoints.push(length.x, y, 0);

    const yxLineGeometry = new LineGeometry().setPositions(yxPoints);

    let yxLine;
    if (iteration % 10 === 0) {
      yxLine = new Line2(yxLineGeometry, majorGridLineMaterial);
    } else {
      yxLine = new Line2(yxLineGeometry, minorGridLineMaterial);
    }
    yxLine.renderOrder = 1;
    yxLines.add(yxLine);
  }
  gridGroup.add(yxLines);

  for (
    let y = -length.y, iteration = -5;
    y <= length.y;
    y += Math.round(length.y / 5) / 5, iteration++
  ) {
    const yzPoints = [];
    yzPoints.push(0, y, -length.z);
    yzPoints.push(0, y, length.z);

    const yzLineGeometry = new LineGeometry().setPositions(yzPoints);

    let yzLine;
    if (iteration % 10 === 0) {
      yzLine = new Line2(yzLineGeometry, majorGridLineMaterial);
    } else {
      yzLine = new Line2(yzLineGeometry, minorGridLineMaterial);
    }
    yzLine.renderOrder = 1;
    yzLines.add(yzLine);
  }
  gridGroup.add(yzLines);

  for (
    let z = -length.z, iteration = -5;
    z <= length.z;
    z += Math.round(length.z / 5) / 5, iteration++
  ) {
    const zxPoints = [];
    zxPoints.push(-length.x, 0, z);
    zxPoints.push(length.x, 0, z);

    const zxLineGeometry = new LineGeometry().setPositions(zxPoints);

    let zxLine;
    if (iteration % 10 === 0) {
      zxLine = new Line2(zxLineGeometry, majorGridLineMaterial);
    } else {
      zxLine = new Line2(zxLineGeometry, minorGridLineMaterial);
    }
    zxLine.renderOrder = 1;
    zxLines.add(zxLine);
  }
  gridGroup.add(zxLines);

  for (
    let z = -length.z, iteration = -5;
    z <= length.z;
    z += Math.round(length.z / 5) / 5, iteration++
  ) {
    const zyPoints = [];
    zyPoints.push(0, -length.z, z);
    zyPoints.push(0, length.z, z);

    const zyLineGeometry = new LineGeometry().setPositions(zyPoints);

    let zyLine;
    if (iteration % 10 === 0) {
      zyLine = new Line2(zyLineGeometry, majorGridLineMaterial);
    } else {
      zyLine = new Line2(zyLineGeometry, minorGridLineMaterial);
    }
    zyLine.renderOrder = 1;
    zyLines.add(zyLine);
  }
  gridGroup.add(zyLines);

  const gridBoundingBox = new Box3();
  gridBoundingBox.setFromObject(gridGroup, true);

  return new Grid(gridGroup, gridBoundingBox);
}
