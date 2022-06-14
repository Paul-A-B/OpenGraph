import { Vector3, Group, BufferGeometry, Mesh, Box3 } from "three";
import * as THREE from "three";
import { MeshLine } from "three.meshline";

function Grid(mesh, boundingBox) {
  (this.mesh = mesh), (this.boundingBox = boundingBox);
}

export function generateGrid(
  mode,
  minorGridLineMaterial,
  majorGridLineMaterial,
  visibleCoords,
  step,
  cameraPosition
) {
  switch (mode) {
    case "2D":
      return cartesian2D(
        minorGridLineMaterial,
        majorGridLineMaterial,
        visibleCoords,
        step,
        cameraPosition
      );
    case "3D":
      return cartesian3D(
        minorGridLineMaterial,
        majorGridLineMaterial,
        visibleCoords,
        step,
        cameraPosition
      );
  }
}

function cartesian2D(
  minorGridLineMaterial,
  majorGridLineMaterial,
  visibleCoords,
  step,
  cameraPosition
) {
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
    verticalPoints.push(new Vector3(x, -visibleCoords.y + cameraPosition.y, 0));
    verticalPoints.push(new Vector3(x, visibleCoords.y + cameraPosition.y, 0));

    const verticalLineGeometry = new BufferGeometry().setFromPoints(
      verticalPoints
    );

    const verticalLine = new MeshLine();
    verticalLine.setGeometry(verticalLineGeometry);

    let verticalLineMesh;
    if (iteration % 10 === 0) {
      verticalLineMesh = new Mesh(verticalLine, majorGridLineMaterial);
    } else {
      verticalLineMesh = new Mesh(verticalLine, minorGridLineMaterial);
    }

    verticalLines.add(verticalLineMesh);
  }
  gridGroup.add(verticalLines);

  for (
    let y = Math.floor((-visibleCoords.y + cameraPosition.y) / step) * step,
      iteration = 0;
    y <= visibleCoords.y + cameraPosition.y;
    y += step / 10, iteration++
  ) {
    const horizontalPoints = [];
    horizontalPoints.push(
      new Vector3(-visibleCoords.x + cameraPosition.x, y, 0)
    );
    horizontalPoints.push(
      new Vector3(visibleCoords.x + cameraPosition.x, y, 0)
    );

    const horizontalLineGeometry = new BufferGeometry().setFromPoints(
      horizontalPoints
    );

    const horizontalLine = new MeshLine();
    horizontalLine.setGeometry(horizontalLineGeometry);

    let horizontalLineMesh;
    if (iteration % 10 === 0) {
      horizontalLineMesh = new Mesh(horizontalLine, majorGridLineMaterial);
    } else {
      horizontalLineMesh = new Mesh(horizontalLine, minorGridLineMaterial);
    }

    horizontalLines.add(horizontalLineMesh);
  }
  gridGroup.add(horizontalLines);

  const gridBoundingBox = new Box3();
  gridBoundingBox.setFromObject(gridGroup, true);

  return new Grid(gridGroup, gridBoundingBox);
}

function cartesian3D(
  minorGridLineMaterial,
  majorGridLineMaterial,
  visibleCoords,
  step,
  cameraPosition
) {
  return new Grid(new THREE.AxesHelper(10), null);
}
