import { Box2, Box3, Group, Vector2, Vector3 } from "three";
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

  const dimensions = ["x", "y"];

  for (const currentDimension of dimensions) {
    const otherDimension = dimensions.filter(
      (dimension) => dimension != currentDimension
    )[0];

    const lineGroup = new Group();

    for (
      let variable =
          Math.round(
            (-visibleCoords[currentDimension] +
              cameraPosition[currentDimension]) /
              step
          ) * step,
        iteration = 0;
      variable <=
      visibleCoords[currentDimension] + cameraPosition[currentDimension];
      variable += step / 10, iteration++
    ) {
      const points = [];
      const min = new Vector2();
      const max = new Vector2();

      min[currentDimension] = variable;
      max[currentDimension] = variable;

      min[otherDimension] =
        -visibleCoords[otherDimension] + cameraPosition[otherDimension];
      max[otherDimension] =
        visibleCoords[otherDimension] + cameraPosition[otherDimension];

      points.push(min.x, min.y, 0);
      points.push(max.x, max.y, 0);

      const lineGeometry = new LineGeometry().setPositions(points);

      if (iteration % 10 === 0) {
        lineGroup.add(new Line2(lineGeometry, majorGridLineMaterial));
      } else {
        lineGroup.add(new Line2(lineGeometry, minorGridLineMaterial));
      }
    }

    gridGroup.add(lineGroup);
  }

  const gridBoundingBox = new Box2();

  gridBoundingBox.min.set(
    -visibleCoords.x + cameraPosition.x,
    -visibleCoords.y + cameraPosition.y
  );
  gridBoundingBox.max.set(
    visibleCoords.x + cameraPosition.x,
    visibleCoords.y + cameraPosition.y
  );

  return new Grid(gridGroup, gridBoundingBox);
}

function cartesian3D() {
  const gridGroup = new Group();

  const length = new Vector3(10, 10, 10);

  const dimensions = ["x", "y", "z"];

  for (const currentDimension of dimensions) {
    const otherDimensions = dimensions.filter(
      (dimension) => dimension != currentDimension
    );

    const lineGroup = new Group();

    for (const otherDimension of otherDimensions) {
      for (
        let variable = Math.round(-length[currentDimension]), iteration = -5;
        variable <= length[currentDimension];
        variable += Math.round(length.x / 5) / 5, iteration++
      ) {
        const points = [];
        const min = new Vector3();
        const max = new Vector3();

        min[currentDimension] = variable;
        max[currentDimension] = variable;

        min[otherDimension] = -length[otherDimension];
        max[otherDimension] = length[otherDimension];

        points.push(min.x, min.y, min.z);
        points.push(max.x, max.y, max.z);

        min[otherDimension] = 0;
        max[otherDimension] = 0;

        const lineGeometry = new LineGeometry().setPositions(points);

        let line;
        if (iteration % 10 === 0) {
          line = new Line2(lineGeometry, majorGridLineMaterial);
        } else {
          line = new Line2(lineGeometry, minorGridLineMaterial);
        }

        line.renderOrder = 1;

        lineGroup.add(line);
      }
    }

    gridGroup.add(lineGroup);
  }

  const gridBoundingBox = new Box3();

  gridBoundingBox.min.set(-length.x, -length.y, -length.z);
  gridBoundingBox.max.set(length.x, length.y, length.z);

  return new Grid(gridGroup, gridBoundingBox);
}
