import { Box3, Group, Vector2, Vector3 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/*
# materials
*/

const axesMaterial = new LineMaterial({
  color: 0x000000,

  // linewidth now refers to pixels instead
  worldUnits: false,
  linewidth: 7.5,

  /*
  doesn't affect the three.js depth buffer to avoid
  the axes clipping through the graph
  */
  depthWrite: false,
});

/*
# export
*/

function Axes(mesh, intersection, boundingBox) {
  this.mesh = mesh;

  // store the current intersection for later redraw checks
  this.intersection = intersection;
  this.boundingBox = boundingBox;
}

export function generateAxes(
  mode,
  resolution,
  visibleCoords,
  cameraPosition,
  intersection
) {
  // resolution needed for adaptive line width (world units == false)
  axesMaterial.resolution.copy(resolution);

  switch (mode) {
    case "2D":
      return cartesian2D(visibleCoords, cameraPosition, intersection);
    case "3D":
      return cartesian3D();
  }
}

function cartesian2D(visibleCoords, cameraPosition, intersection) {
  const axes = new Group();

  const dimensions = ["x", "y"];

  for (const currentDimension of dimensions) {
    const otherDimension = dimensions.filter(
      (dimension) => dimension != currentDimension
    )[0];

    const axisPoints = [];
    const min = new Vector2();
    const max = new Vector2();

    // double the size of the view
    min[currentDimension] =
      -visibleCoords[currentDimension] + cameraPosition[currentDimension];
    max[currentDimension] =
      visibleCoords[currentDimension] + cameraPosition[currentDimension];

    min[otherDimension] = intersection[otherDimension];
    max[otherDimension] = intersection[otherDimension];

    axisPoints.push(min.x, min.y, 0);
    axisPoints.push(max.x, max.y, 0);

    const axisGeometry = new LineGeometry().setPositions(axisPoints);
    axisGeometry.computeBoundingBox();

    const axis = new Line2(axisGeometry, axesMaterial);
    axis.renderOrder = 2;

    axes.add(axis);
  }

  const boundingBox = new Box3();
  boundingBox.setFromObject(axes);

  const axesGroup = new Group();

  axesGroup.add(axes);

  return new Axes(axesGroup, intersection, boundingBox);
}

function cartesian3D() {
  const axes = new Group();

  // arbitrary value
  const length = new Vector3(10, 10, 10);

  const dimensions = ["x", "y", "z"];

  for (const currentDimension of dimensions) {
    const axisPoints = [];
    const min = new Vector3();
    const max = new Vector3();

    min[currentDimension] = -length[currentDimension];
    max[currentDimension] = length[currentDimension];

    axisPoints.push(min.x, min.y, min.z);
    axisPoints.push(max.x, max.y, max.z);

    const axisGeometry = new LineGeometry().setPositions(axisPoints);
    axisGeometry.computeBoundingBox();

    const axis = new Line2(axisGeometry, axesMaterial);
    axis.renderOrder = 2;

    axes.add(axis);
  }

  const boundingBox = new Box3();
  boundingBox.setFromObject(axes);

  const axesGroup = new Group();

  axesGroup.add(axes);

  return new Axes(axesGroup, new Vector3(), boundingBox);
}
