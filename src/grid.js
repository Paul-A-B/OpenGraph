import { Box2, Box3, Group, Vector2, Vector3 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/*
# materials
*/

const minorGridLineMaterial = new LineMaterial({
  color: 0x454545,

  // linewidth now refers to pixels instead
  worldUnits: false,
  linewidth: 2.5,

  /*
  doesn't affect the three.js depth buffer to avoid
  the grid lines clipping through the axes
  */
  depthWrite: false,
});
const majorGridLineMaterial = new LineMaterial({
  color: 0x151515,

  // linewidth now refers to pixels instead
  worldUnits: false,
  linewidth: 5,

  /*
  doesn't affect the three.js depth buffer to avoid
  the grid lines clipping through the axes
  */
  depthWrite: false,
});

/*
# export
*/

function Grid(mesh, boundingBox) {
  (this.mesh = mesh), (this.boundingBox = boundingBox);
}

export function generateGrid(
  mode,
  resolution,
  visibleCoords,
  gridSize,
  cameraPosition
) {
  // resolution needed for adaptive line width (world units == false)
  minorGridLineMaterial.resolution.copy(resolution);
  majorGridLineMaterial.resolution.copy(resolution);

  switch (mode) {
    case "2D":
      return cartesian2D(visibleCoords, gridSize, cameraPosition);
    case "3D":
      return cartesian3D();
  }
}

function cartesian2D(visibleCoords, gridSize, cameraPosition) {
  const grid = new Group();

  const dimensions = ["x", "y"];

  for (const currentDimension of dimensions) {
    const otherDimension = dimensions.filter(
      (dimension) => dimension != currentDimension
    )[0];

    const lines = new Group();

    // double the size of the view
    for (
      let dimensionValue =
          Math.round(
            (-visibleCoords[currentDimension] +
              cameraPosition[currentDimension]) /
              gridSize
          ) * gridSize,
        iteration = 0;
      dimensionValue <=
      visibleCoords[currentDimension] + cameraPosition[currentDimension];
      dimensionValue += gridSize / 10, iteration++
    ) {
      const points = [];
      const min = new Vector2();
      const max = new Vector2();

      min[currentDimension] = dimensionValue;
      max[currentDimension] = dimensionValue;

      // double the size of the view
      min[otherDimension] =
        -visibleCoords[otherDimension] + cameraPosition[otherDimension];
      max[otherDimension] =
        visibleCoords[otherDimension] + cameraPosition[otherDimension];

      points.push(min.x, min.y, 0);
      points.push(max.x, max.y, 0);

      const lineGeometry = new LineGeometry().setPositions(points);
      lineGeometry.computeBoundingBox();

      if (iteration % 10 === 0) {
        lines.add(new Line2(lineGeometry, majorGridLineMaterial));
      } else {
        lines.add(new Line2(lineGeometry, minorGridLineMaterial));
      }
    }

    grid.add(lines);
  }

  const boundingBox = new Box2();
  boundingBox.set(
    new Vector2(
      Math.max(
        Math.round((-visibleCoords.x + cameraPosition.x) / gridSize) * gridSize,
        -visibleCoords.x + cameraPosition.x
      ),
      Math.max(
        Math.round((-visibleCoords.y + cameraPosition.y) / gridSize) * gridSize,
        -visibleCoords.y + cameraPosition.y
      )
    ),
    new Vector2(
      Math.min(
        Math.round((visibleCoords.x + cameraPosition.x) / gridSize) * gridSize,
        visibleCoords.x + cameraPosition.x
      ),
      Math.min(
        Math.round((visibleCoords.y + cameraPosition.y) / gridSize) * gridSize,
        visibleCoords.y + cameraPosition.y
      )
    )
  );

  return new Grid(grid, boundingBox);
}

function cartesian3D() {
  const grid = new Group();

  // arbitrary value
  const length = new Vector3(10, 10, 10);

  const dimensions = ["x", "y", "z"];

  for (const currentDimension of dimensions) {
    const otherDimensions = dimensions.filter(
      (dimension) => dimension != currentDimension
    );

    const lines = new Group();

    for (const otherDimension of otherDimensions) {
      for (
        let dimensionValue = Math.round(-length[currentDimension]),
          iteration = -5;
        dimensionValue <= length[currentDimension];
        dimensionValue += Math.round(length[currentDimension] / 5) / 5,
          iteration++
      ) {
        const points = [];
        const min = new Vector3();
        const max = new Vector3();

        min[currentDimension] = dimensionValue;
        max[currentDimension] = dimensionValue;

        min[otherDimension] = -length[otherDimension];
        max[otherDimension] = length[otherDimension];

        points.push(min.x, min.y, min.z);
        points.push(max.x, max.y, max.z);

        min[otherDimension] = 0;
        max[otherDimension] = 0;

        const lineGeometry = new LineGeometry().setPositions(points);
        lineGeometry.computeBoundingBox();

        if (iteration % 10 === 0) {
          lines.add(new Line2(lineGeometry, majorGridLineMaterial));
        } else {
          lines.add(new Line2(lineGeometry, minorGridLineMaterial));
        }
      }
    }

    grid.add(lines);
  }

  const boundingBox = new Box3();
  boundingBox.setFromObject(grid);

  return new Grid(grid, boundingBox);
}
