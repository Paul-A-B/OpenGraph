import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const graph2DMaterial = new LineMaterial({
  color: 0x062596,
  worldUnits: false,
  linewidth: 10,
});
const graph3DMaterial = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
  vertexColors: true,
  // wireframe: true,
  // color: 0xff0000,
});

const scope = {};

function generateScope(statement) {
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
    scope.t = Math.sin(Date.now() / 10000) * 2 * Math.PI;
  }
}

function Dimensions(input, output) {
  this.input = input;
  this.output = output;
}

function generateDimensions(possibleDimensions) {
  const inputDimensions = Object.keys(scope).filter((variable) =>
    possibleDimensions.includes(variable)
  );

  const outputDimensions = possibleDimensions.filter(
    (variable) => !inputDimensions.includes(variable)
  );

  while (outputDimensions.length > 1) {
    inputDimensions.push(outputDimensions.shift());
  }

  if (outputDimensions.length === 1) {
    return new Dimensions(inputDimensions, outputDimensions);
  } else {
    throw new Error("Die Eingabe kann nicht alle Axen enthalten.");
  }
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

const graphPoints = [];
const graphColors = [];
const graphIndices = [];

const point = {
  x: 0,
  y: 0,
  z: 0,
};

let iterations = 0;

function calculatePoints(
  statement,
  dimensions,
  size,
  offset,
  precision,
  dimensionCount = 1
) {
  if (!dimensions.input.length) {
    point[dimensions.output[0]] = statement.fnNode.evaluate(scope);
    if (Number.isFinite(point[dimensions.output[0]])) {
      graphPoints.push(point.x, point.y, point.z);

      if (dimensionCount === 3) {
        graphColors.push(
          colorFactor.from.r +
            ((size[dimensions.output[0]] + point[dimensions.output[0]]) /
              (size[dimensions.output[0]] * 2)) *
              (colorFactor.to.r - colorFactor.from.r),
          colorFactor.from.g +
            ((size[dimensions.output[0]] + point[dimensions.output[0]]) /
              (size[dimensions.output[0]] * 2)) *
              (colorFactor.to.g - colorFactor.from.g),
          colorFactor.from.b +
            ((size[dimensions.output[0]] + point[dimensions.output[0]]) /
              (size[dimensions.output[0]] * 2)) *
              (colorFactor.to.b - colorFactor.from.b)
        );
      }
    }
    return;
  }

  const variable = dimensions.input[0];
  iterations = 0;
  for (
    let variableValue = -size[variable] + offset[variable];
    variableValue <= size[variable] + offset[variable];
    variableValue += size[variable] / precision
  ) {
    iterations++;
    scope[variable] = variableValue;
    point[variable] = variableValue;
    calculatePoints(
      statement,
      new Dimensions(dimensions.input.slice(1), dimensions.output),
      size,
      offset,
      precision,
      dimensionCount + 1
    );
  }
}

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
  graphPoints.length = 0;
  graphColors.length = 0;
  graphIndices.length = 0;

  point.x = 0;
  point.y = 0;
  point.z = 0;

  for (const variable in scope) {
    delete scope[variable];
  }

  graph2DMaterial.resolution.copy(resolution);
  generateScope(statement);
  switch (mode) {
    case "2D":
      return cartesian2D(statement, visibleCoords, cameraPosition, canvas);
    case "3D":
      return cartesian3D(statement);
  }
}

function cartesian2D(statement, visibleCoords, cameraPosition, canvas) {
  const dimensions = generateDimensions(["x", "y"]);

  calculatePoints(
    statement,
    dimensions,
    visibleCoords,
    cameraPosition,
    canvas.width
  );

  const graphGeometry = new LineGeometry().setPositions(graphPoints);

  const graphLine = new Line2(graphGeometry, graph2DMaterial);
  graphLine.renderOrder = 5; // rendert über Grid und Beschriftung
  graphLine.geometry.computeBoundingBox();

  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox.setFromObject(graphLine);

  return new Graph(statement, graphLine, graphBoundingBox);
}

function cartesian3D(statement) {
  const length = {
    x: 10,
    y: 10,
    z: 10,
  };
  const offset = {
    x: 0,
    y: 0,
    z: 0,
  };
  const precision = 100;

  const dimensions = generateDimensions(["x", "y", "z"]);

  const graphGroup = new THREE.Group();

  calculatePoints(statement, dimensions, length, offset, precision);

  if (graphPoints.length) {
    const segments = iterations - 1;

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

    const graphMesh = new THREE.Mesh(graphGeometry, graph3DMaterial);
    graphMesh.renderOrder = 0; // rendert über Grid und Beschriftung

    graphGroup.add(graphMesh);
  }

  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox.setFromObject(graphGroup);

  return new Graph(statement, graphGroup, graphBoundingBox);
}
