import { all, create } from "mathjs";
import * as THREE from "three";
import { MeshLine } from "three.meshline";

const math = create(all, {});

function Graph(statement, mesh, boundingBox) {
  this.statement = statement;
  this.mesh = mesh;
  this.boundingBox = boundingBox;
}

export function generateGraph(
  statement,
  visibleCoords,
  cameraPosition,
  canvas,
  graphMaterial
) {
  const graphPoints = [];

  const scope = {};

  if (statement.fnNode.isFunctionAssignmentNode) {
    for (const variable of statement.fnNode.params) {
      scope[variable] = undefined;
    }
    statement.fnNode = statement.fnNode.expr;
  } else {
    for (const variable of statement.fnNode.filter((node, path, parent) => {
      if (parent) {
        return node.isSymbolNode && !(parent.fn === node);
      } else {
        return node.isSymbolNode;
      }
    })) {
      scope[variable] = undefined;
    }
  }

  if (statement.usesTime) {
    scope.t = Math.sin(Date.now() / 1000) * 2 * Math.PI;
  }

  console.log(Object.keys(scope));

  for (
    let x = -visibleCoords.x + cameraPosition.x;
    x <= visibleCoords.x + cameraPosition.x;
    x += visibleCoords.x / canvas.width
  ) {
    scope.x = x;
    const point = { x: x, y: statement.fnNode.evaluate(scope), z: 0 };
    if (point.y) graphPoints.push(new THREE.Vector3(point.x, point.y, point.z));
  }

  const graphGeometry = new THREE.BufferGeometry().setFromPoints(graphPoints);

  const graphLine = new MeshLine();
  graphLine.setGeometry(graphGeometry);

  const graphMesh = new THREE.Mesh(graphLine, graphMaterial);
  graphMesh.renderOrder = 2; // rendert über Grid und Beschriftung
  graphMesh.geometry.computeBoundingBox();

  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox
    .copy(graphMesh.geometry.boundingBox)
    .applyMatrix4(graphMesh.matrixWorld);

  return new Graph(statement, graphMesh, graphBoundingBox);
}
