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

  const dimensions = ["x", "y"];

  const intersection = new Vector2();

  for (const currentDimension of dimensions) {
    const otherDimension = dimensions.filter(
      (dimension) => dimension != currentDimension
    )[0];

    if (
      -visibleCoords[otherDimension] / 2 +
        cameraPosition[otherDimension] +
        step / 5 >=
      0
    ) {
      intersection[otherDimension] =
        Math.round(
          (-visibleCoords[otherDimension] / 2 +
            cameraPosition[otherDimension]) /
            (step / 10)
        ) *
          (step / 10) +
        step / 5;
    } else if (
      visibleCoords[otherDimension] / 2 +
        cameraPosition[otherDimension] -
        step / 5 <=
      0
    ) {
      intersection[otherDimension] =
        Math.round(
          (visibleCoords[otherDimension] / 2 + cameraPosition[otherDimension]) /
            (step / 10)
        ) *
          (step / 10) -
        step / 5;
    } else {
      intersection[otherDimension] = 0;
    }

    const axisPoints = [];
    const min = new Vector3();
    const max = new Vector3();

    min[currentDimension] =
      -visibleCoords[currentDimension] + cameraPosition[currentDimension];
    max[currentDimension] =
      visibleCoords[currentDimension] + cameraPosition[currentDimension];

    min[otherDimension] = intersection[otherDimension];
    max[otherDimension] = intersection[otherDimension];

    axisPoints.push(min.x, min.y, min.z);
    axisPoints.push(max.x, max.y, min.z);

    const axisGeometry = new LineGeometry().setPositions(axisPoints);

    const axis = new Line2(axisGeometry, axesMaterial);
    axis.renderOrder = 2;

    axesLinesGroup.add(axis);
  }

  const axesGroup = new Group();

  axesGroup.add(axesLinesGroup);

  return new Axes(axesGroup, intersection);
}

function cartesian3D() {
  const axesLinesGroup = new Group();

  const length = new Vector3(10, 10, 10);

  const dimensions = ["x", "y", "z"];

  for (const currentDimension of dimensions) {
    const axisPoints = [];
    const min = new Vector3();
    const max = new Vector3();

    min[currentDimension] = -length[currentDimension];
    max[currentDimension] = length[currentDimension];

    axisPoints.push(min.x, min.y, min.z);
    axisPoints.push(max.x, max.y, min.z);

    const axisGeometry = new LineGeometry().setPositions(axisPoints);

    const axis = new Line2(axisGeometry, axesMaterial);
    axis.renderOrder = 2;

    axesLinesGroup.add(axis);
  }

  const axesGroup = new Group();

  axesGroup.add(axesLinesGroup);

  return new Axes(axesGroup, new Vector3());
}
