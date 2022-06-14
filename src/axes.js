import { Vector3, Group, BufferGeometry, Mesh } from "three";
import { MeshLine } from "three.meshline";

function Axes(mesh, intersection) {
  this.mesh = mesh;
  this.intersection = intersection;
}

export function generateAxes(
  visibleCoords,
  step,
  cameraPosition,
  axesMaterial
) {
  const axesLinesGroup = new Group();

  let intersection = {
    x: undefined,
    y: undefined,
  };

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
    new Vector3(intersection.x, -visibleCoords.y + cameraPosition.y, 0)
  );
  verticalAxesPoints.push(
    new Vector3(intersection.x, visibleCoords.y + cameraPosition.y, 0)
  );

  const verticalLineGeometry = new BufferGeometry().setFromPoints(
    verticalAxesPoints
  );

  const verticalAxis = new MeshLine();
  verticalAxis.setGeometry(verticalLineGeometry);

  const verticalAxisMesh = new Mesh(verticalAxis, axesMaterial);
  axesLinesGroup.add(verticalAxisMesh);

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
    new Vector3(-visibleCoords.x + cameraPosition.x, intersection.y, 0)
  );
  horizontalAxesPoints.push(
    new Vector3(visibleCoords.x + cameraPosition.x, intersection.y, 0)
  );

  const horizontalLineGeometry = new BufferGeometry().setFromPoints(
    horizontalAxesPoints
  );

  const horizontalAxis = new MeshLine();
  horizontalAxis.setGeometry(horizontalLineGeometry);

  const horizontalAxisMesh = new Mesh(horizontalAxis, axesMaterial);
  axesLinesGroup.add(horizontalAxisMesh);

  const axesGroup = new Group();

  axesGroup.add(axesLinesGroup);

  return new Axes(axesGroup, intersection);
}
