import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const graph2DMaterial = new LineMaterial({
  color: 0x062596,
  worldUnits: false,
  linewidth: 7.5,
});
const graph3DMaterial = new MeshBasicMaterial({
  side: DoubleSide,
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

const meshColor = {
  start: {
    r: 0.314,
    g: 0.42,
    b: 0.69,
  },
  end: {
    r: 0.97,
    g: 0.78,
    b: 0.89,
  },
};

let graphGroup;

const graphPoints = [];
const graphColors = [];
const graphIndices = [];

const point = new Vector3();

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

    if (dimensionCount === 2 && graphPoints.length >= 6) {
      const secondToLastPoint = new Vector3(
        graphPoints[graphPoints.length - 6],
        graphPoints[graphPoints.length - 5],
        graphPoints[graphPoints.length - 4]
      );
      const lastPoint = new Vector3(
        graphPoints[graphPoints.length - 3],
        graphPoints[graphPoints.length - 2],
        graphPoints[graphPoints.length - 1]
      );
      const centeredPoint = new Vector3().copy(point);
      const centeredLastPoint = new Vector3().copy(lastPoint);

      secondToLastPoint.negate();

      centeredPoint.add(secondToLastPoint);
      centeredLastPoint.add(secondToLastPoint); // versetzt den Nullpunkt

      // https://patents.google.com/patent/US6704013B2/en
      const angle = centeredPoint.angleTo(centeredLastPoint);
      const scopeBackup = {};
      for (const variable in scope) {
        scopeBackup[variable] = scope[variable];
      }
      const pointBackup = {};
      for (const variable in point) {
        pointBackup[variable] = point[variable];
      }
      if (angle > Math.PI / 4) {
        continuous = false;
        const otherDimension = Object.keys(scope)[0];

        for (let i = 0; i < 10; i++) {
          const inputDifference =
            Math.max(lastPoint[otherDimension], point[otherDimension]) -
            Math.min(lastPoint[otherDimension], point[otherDimension]);
          const midPoint = new Vector3(point.x, point.y, point.z);
          scope[otherDimension] =
            Math.max(lastPoint[otherDimension], point[otherDimension]) -
            inputDifference / 2;
          midPoint[otherDimension] = scope[otherDimension];
          midPoint[dimensions.output] = statement.mathNode.evaluate(scope);

          if (
            Math.min(lastPoint[dimensions.output], point[dimensions.output]) <
              midPoint[dimensions.output] &&
            midPoint[dimensions.output] <
              Math.max(lastPoint[dimensions.output], point[dimensions.output])
          ) {
            continuous = true;
            break;
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
              Math.max(point[dimensions.output], midPoint[dimensions.output]) -
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

    if (Number.isFinite(point[dimensions.output]) && continuous) {
      graphPoints.push(point.x, point.y, point.z);

      if (dimensionCount === 3) {
        graphColors.push(
          meshColor.start.r +
            ((size[dimensions.output] + point[dimensions.output]) /
              (size[dimensions.output] * 2)) *
              (meshColor.end.r - meshColor.start.r),
          meshColor.start.g +
            ((size[dimensions.output] + point[dimensions.output]) /
              (size[dimensions.output] * 2)) *
              (meshColor.end.g - meshColor.start.g),
          meshColor.start.b +
            ((size[dimensions.output] + point[dimensions.output]) /
              (size[dimensions.output] * 2)) *
              (meshColor.end.b - meshColor.start.b)
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
  graphGroup = new Group();

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
  const graphBoundingBox = new Box3();
  graphBoundingBox.setFromObject(graphGroup);

  return new Graph(graphGroup, graphBoundingBox);
}

function cartesian3D(statement) {
  const length = new Vector3(10, 10, 10);
  const offset = new Vector3(0, 0, 0);
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

    const graphGeometry = new BufferGeometry();

    graphGeometry.setIndex(graphIndices);
    graphGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(graphPoints, 3)
    );
    graphGeometry.computeVertexNormals();
    graphGeometry.setAttribute(
      "color",
      new Float32BufferAttribute(graphColors, 3)
    );

    const graphMesh = new Mesh(graphGeometry, graph3DMaterial);
    graphMesh.renderOrder = 0; // rendert über Grid und Beschriftung

    graphGroup.add(graphMesh);
  }

  const graphBoundingBox = new Box3();
  graphBoundingBox.setFromObject(graphGroup);

  return new Graph(graphGroup, graphBoundingBox);
}
