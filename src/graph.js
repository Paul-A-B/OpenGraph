import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const graph2DMaterial = new LineMaterial({
  color: 0x062596,
  worldUnits: false,
  linewidth: 7.5,
});
const graph3DMaterial = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
  vertexColors: true,
  // wireframe: true,
  // color: 0xff0000,
});

const scope = {};

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
    return new Dimensions(inputDimensions, outputDimensions[0]);
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

let graphGroup;

const graphPoints = [];
const graphColors = [];
const graphIndices = [];

const point = new THREE.Vector3();

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
    point[dimensions.output] = statement.mathNode.evaluate(scope);
    let continuous = true;

    if (dimensionCount === 2) {
      if (graphPoints.length >= 3) {
        const lastPoint = new THREE.Vector3(
          graphPoints[graphPoints.length - 3],
          graphPoints[graphPoints.length - 2],
          graphPoints[graphPoints.length - 1]
        );

        // https://patents.google.com/patent/US6704013B2/en
        const angle = point.angleTo(lastPoint);
        const scopeBackup = {};
        for (const variable in scope) {
          scopeBackup[variable] = scope[variable];
        }
        const pointBackup = {};
        for (const variable in point) {
          pointBackup[variable] = point[variable];
        }
        if (
          angle > Math.PI / 4 &&
          Math.round((angle + Number.EPSILON) * 100) / 100 !=
            Math.round((Math.PI + Number.EPSILON) * 100) / 100
        ) {
          continuous = false;
          const otherDimension = Object.keys(scope)[0];

          for (let i = 0; i < 10; i++) {
            const inputDifference =
              Math.max(lastPoint[otherDimension], point[otherDimension]) -
              Math.min(lastPoint[otherDimension], point[otherDimension]);
            const midPoint = new THREE.Vector3(point.x, point.y, point.z);
            scope[otherDimension] =
              Math.max(lastPoint[otherDimension], point[otherDimension]) -
              inputDifference / 2;
            midPoint[otherDimension] = scope[otherDimension];
            midPoint[dimensions.output] = statement.mathNode.evaluate(scope);

            if (
              Math.min(
                lastPoint[dimensions.output],
                point[dimensions.output]
              ) <= midPoint[dimensions.output] &&
              midPoint[dimensions.output] <=
                Math.max(lastPoint[dimensions.output], point[dimensions.output])
            ) {
              continuous = true;
              return;
            }

            const sectionsOutputDifference = {
              lastMid:
                Math.max(
                  lastPoint[dimensions.output],
                  midPoint[dimensions.output]
                ) -
                Math.min(
                  lastPoint[dimensions.output],
                  midPoint[dimensions.output]
                ),
              midNew:
                Math.max(
                  point[dimensions.output],
                  midPoint[dimensions.output]
                ) -
                Math.min(point[dimensions.output], midPoint[dimensions.output]),
            };

            if (
              sectionsOutputDifference.lastMid > sectionsOutputDifference.midNew
            ) {
              point.copy(midPoint);
            } else {
              lastPoint.copy(midPoint);
            }
          }
          for (const variable in scopeBackup) {
            scope[variable] = scopeBackup[variable];
          }
          for (const variable in point) {
            point[variable] = pointBackup[variable];
          }
        }
      }
    }

    if (
      Number.isFinite(point[dimensions.output]) &&
      // point[dimensions.output] <= size[dimensions.output] &&
      // point[dimensions.output] >= -size[dimensions.output] &&
      continuous
    ) {
      graphPoints.push(point.x, point.y, point.z);

      if (dimensionCount === 3) {
        graphColors.push(
          colorFactor.from.r +
            ((size[dimensions.output] + point[dimensions.output]) /
              (size[dimensions.output] * 2)) *
              (colorFactor.to.r - colorFactor.from.r),
          colorFactor.from.g +
            ((size[dimensions.output] + point[dimensions.output]) /
              (size[dimensions.output] * 2)) *
              (colorFactor.to.g - colorFactor.from.g),
          colorFactor.from.b +
            ((size[dimensions.output] + point[dimensions.output]) /
              (size[dimensions.output] * 2)) *
              (colorFactor.to.b - colorFactor.from.b)
        );
      }
    } else {
      if (graphPoints.length) {
        if (dimensionCount === 2) {
          const graphGeometry = new LineGeometry().setPositions(graphPoints);
          const graphLine = new Line2(graphGeometry, graph2DMaterial);
          graphLine.renderOrder = 5; // rendert über Grid und Beschriftung
          graphLine.geometry.computeBoundingBox();
          graphGroup.add(graphLine);
          graphPoints.length = 0;
        }
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

function Graph(mesh, boundingBox) {
  this.mesh = mesh;
  this.boundingBox = boundingBox;
}

export function generateGraph(
  mode,
  globalScope,
  resolution,
  statement,
  visibleCoords,
  cameraPosition,
  canvas
) {
  graphGroup = new THREE.Group();

  graphPoints.length = 0;
  graphColors.length = 0;
  graphIndices.length = 0;

  point.set(0, 0, 0);

  for (const variable in scope) {
    delete scope[variable];
  }

  Object.assign(scope, statement.scope, globalScope);

  graph2DMaterial.resolution.copy(resolution);
  switch (mode) {
    case "2D":
      return cartesian2D(statement, visibleCoords, cameraPosition, canvas);
    case "3D":
      return cartesian3D(statement);
  }
}

function cartesian2D(statement, visibleCoords, cameraPosition, canvas) {
  const dimensions = generateDimensions(["x", "y"]);

  if (dimensions.input[0] === "x") {
    canvas = canvas.width;
  } else {
    canvas = canvas.height;
  }

  calculatePoints(statement, dimensions, visibleCoords, cameraPosition, canvas);

  if (graphPoints.length) {
    const graphGeometry = new LineGeometry().setPositions(graphPoints);

    const graphLine = new Line2(graphGeometry, graph2DMaterial);
    graphLine.renderOrder = 5; // rendert über Grid und Beschriftung
    graphLine.geometry.computeBoundingBox();

    graphGroup.add(graphLine);
  }
  const graphBoundingBox = new THREE.Box3();
  graphBoundingBox.setFromObject(graphGroup);

  return new Graph(graphGroup, graphBoundingBox);
}

function cartesian3D(statement) {
  const length = new THREE.Vector3(10, 10, 10);
  const offset = new THREE.Vector3(0, 0, 0);
  const precision = 100;

  const dimensions = generateDimensions(["x", "y", "z"]);

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

  return new Graph(graphGroup, graphBoundingBox);
}
