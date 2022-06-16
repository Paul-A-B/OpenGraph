import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const graph2DMaterial = new LineMaterial({
  color: 0x062596,
  worldUnits: false,
  linewidth: 10,
  depthTest: false,
  depthWrite: false,
});
const graph3DMaterial = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
  vertexColors: true,
});

function Graph(statement, mesh, boundingBox) {
  this.statement = statement;
  this.mesh = mesh;
  this.boundingBox = boundingBox;
}

export function generateGraph(
  mode,
  resolution,
  statement,
  visibleCoords,
  cameraPosition,
  canvas
) {
  graph2DMaterial.resolution.copy(resolution);
  switch (mode) {
    case "2D":
      return cartesian2D(statement, visibleCoords, cameraPosition, canvas);
    case "3D":
      return cartesian3D(statement, graph3DMaterial);
  }
}

function cartesian2D(statement, visibleCoords, cameraPosition, canvas) {
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
      try {
        variable.evaluate();
      } catch (error) {
        scope[variable] = undefined;
      }
    }
  }

  if (statement.usesTime) {
    scope.t = Math.sin(Date.now() / 1000) * 2 * Math.PI;
  }

  for (
    let x = -visibleCoords.x + cameraPosition.x;
    x <= visibleCoords.x + cameraPosition.x;
    x += visibleCoords.x / canvas.width
  ) {
    scope.x = x;
    const point = { x: x, y: statement.fnNode.evaluate(scope), z: 0 };
    if (Number.isFinite(point.y)) graphPoints.push(point.x, point.y, point.z);
  }

  const graphGeometry = new LineGeometry().setPositions(graphPoints);

  const graphLine = new Line2(graphGeometry, graph2DMaterial);
  graphLine.renderOrder = 3; // rendert über Grid und Beschriftung
  graphLine.geometry.computeBoundingBox();

  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox
    .copy(graphLine.geometry.boundingBox)
    .applyMatrix4(graphLine.matrixWorld);

  return new Graph(statement, graphLine, graphBoundingBox);
}

function cartesian3D(statement, graphMaterial) {
  const graphPoints = [];
  const graphColors = [];
  const graphIndices = [];

  const length = {
    x: 10,
    y: 10,
    z: 10,
  };

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
      try {
        variable.evaluate();
      } catch (error) {
        scope[variable] = undefined;
      }
    }
  }

  if (statement.usesTime) {
    scope.t = Math.sin(Date.now() / 1000) * 2 * Math.PI;
  }

  const colorFactor = {
    from: {
      r: 0.314,
      g: 0.42,
      b: 0.69,
    },
    to: {
      r: 0.97,
      g: 0.78,
      b: 0.89,
    },
  };

  const precision = 50;

  const segments = 2 * precision; // nur eine Achse, müsste man ausbauen

  for (let x = -length.x; x <= length.x; x += length.x / precision) {
    scope.x = x;
    for (let y = -length.y; y <= length.y; y += length.y / precision) {
      scope.y = y;
      const point = { x: x, y: y, z: statement.fnNode.evaluate(scope) };
      if (Number.isFinite(point.z)) {
        graphPoints.push(point.x, point.y, point.z);
        graphColors.push(
          colorFactor.from.r +
            ((length.z + point.z) / (length.z * 2)) *
              (colorFactor.to.r - colorFactor.from.r),
          colorFactor.from.g +
            ((length.z + point.z) / (length.z * 2)) *
              (colorFactor.to.g - colorFactor.from.g),
          colorFactor.from.b +
            ((length.z + point.z) / (length.z * 2)) *
              (colorFactor.to.b - colorFactor.from.b)
        );
      }
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + (j + 1);
      const b = i * (segments + 1) + j;
      const c = (i + 1) * (segments + 1) + (j + 1);
      const d = (i + 1) * (segments + 1) + j;

      graphIndices.push(a, b, d);
      graphIndices.push(c, a, d);
    }
  }

  const graphGeometry = new THREE.BufferGeometry();

  graphGeometry.setIndex(graphIndices);
  graphGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(graphPoints, 3)
  );
  graphGeometry.computeVertexNormals();
  graphGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(graphColors, 3)
  );

  // const wireframe = new THREE.WireframeGeometry(graphGeometry);

  // const graphMesh = new THREE.LineSegments(wireframe);
  // graphMesh.material.depthTest = false;
  // graphMesh.material.setValues({ color: 0x000000 });

  const graphMesh = new THREE.Mesh(graphGeometry, graphMaterial);
  graphMesh.renderOrder = 3; // rendert über Grid und Beschriftung
  graphMesh.geometry.computeBoundingBox();

  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox
    .copy(graphMesh.geometry.boundingBox)
    .applyMatrix4(graphMesh.matrixWorld);

  return new Graph(statement, graphMesh, graphBoundingBox);
}
