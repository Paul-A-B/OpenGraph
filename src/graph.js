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

/*
# materials
*/

const graph2DMaterial = new LineMaterial({
  color: 0x062596,

  // linewidth now refers to pixels instead
  worldUnits: false,
  linewidth: 7.5,
});
const graph3DMaterial = new MeshBasicMaterial({
  side: DoubleSide,

  // used for the fading graph colors
  vertexColors: true,
});

/*
# utility
*/

// holds values for all known variables
const scope = {};

function Dimensions(input, output) {
  this.input = input;
  this.output = output;
}

// find, which dimensions are given and which can be calculated
function generateDimensions(possibleDimensions) {
  const inputDimensions = Object.keys(scope).filter((variable) =>
    possibleDimensions.includes(variable)
  );

  const outputDimensions = possibleDimensions.filter(
    (variable) => !inputDimensions.includes(variable)
  );

  // only one output dimension is possible
  while (outputDimensions.length > 1) {
    inputDimensions.push(outputDimensions.shift());
  }

  if (outputDimensions.length === 1) {
    return new Dimensions(inputDimensions, outputDimensions[0]);
  } else {
    throw new Error("Die Eingabe kann nicht alle Axen enthalten.");
  }
}

// splits graph and renders current part as one line
function generateLine() {
  if (graphPoints.length) {
    const graphGeometry = new LineGeometry().setPositions(graphPoints);

    const graphLine = new Line2(graphGeometry, graph2DMaterial);
    graphLine.renderOrder = 5;
    graphLine.geometry.computeBoundingBox();

    graph.add(graphLine);
  }
}

// used for fade
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

// group containing all lines associated with it
let graph = new Group();

const graphPoints = [];
const graphColors = [];

// used for indexed BufferGeometry to save memory
const graphIndices = [];

const point = new Vector3();

// used to determine indices
let iterations = 0;

// plot the graph, offset acts as origin point
function calculatePoints(
  statement,
  dimensions,
  size,
  offset,
  precision,
  dimensionCount = 1
) {
  // recursion stops if there is no input variables left to set
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

      // angleTo() now treats the second to last point as (0, 0, 0)
      centeredPoint.add(secondToLastPoint);
      centeredLastPoint.add(secondToLastPoint);

      // https://patents.google.com/patent/US6704013B2/en

      // in radians
      const angle = centeredPoint.angleTo(centeredLastPoint);

      const scopeBackup = {};
      for (const variable in scope) {
        scopeBackup[variable] = scope[variable];
      }
      const pointBackup = {};
      for (const variable in point) {
        pointBackup[variable] = point[variable];
      }

      // angle from last point to new point, threshold is arbitrary
      if (angle > Math.PI / 4) {
        continuous = false;
        const inputDimension = Object.keys(scope)[0];

        /*
        use bisection method to find out if
        there is a point between new and old point
        or if the graph is not continuous,
        higher iteration count is more accurate but more expensive
        */
        for (let i = 0; i < 10; i++) {
          const variableDifference =
            Math.max(lastPoint[inputDimension], point[inputDimension]) -
            Math.min(lastPoint[inputDimension], point[inputDimension]);

          const midpoint = new Vector3(point.x, point.y, point.z);

          scope[inputDimension] =
            Math.max(lastPoint[inputDimension], point[inputDimension]) -
            variableDifference / 2;
          midpoint[inputDimension] = scope[inputDimension];
          midpoint[dimensions.output] = statement.mathNode.evaluate(scope);

          if (
            Math.min(lastPoint[dimensions.output], point[dimensions.output]) <
              midpoint[dimensions.output] &&
            midpoint[dimensions.output] <
              Math.max(lastPoint[dimensions.output], point[dimensions.output])
          ) {
            continuous = true;
            break;
          }

          /*
          perform next check in the half with a
          bigger change in the output dimension
          */
          const sectionsOutputDifference = {
            lastMid:
              Math.max(
                lastPoint[dimensions.output],
                midpoint[dimensions.output]
              ) -
              Math.min(
                lastPoint[dimensions.output],
                midpoint[dimensions.output]
              ),
            midNew:
              Math.max(point[dimensions.output], midpoint[dimensions.output]) -
              Math.min(point[dimensions.output], midpoint[dimensions.output]),
          };

          if (
            sectionsOutputDifference.lastMid > sectionsOutputDifference.midNew
          ) {
            point.copy(midpoint);
          } else {
            lastPoint.copy(midpoint);
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
      if (dimensionCount === 2) {
        generateLine();
        graphPoints.length = 0;
      }
    }
    return;
  }

  // choose next variable for recursion
  const variable = dimensions.input[0];

  // iterations only increases when at the bottom of the recursion
  iterations = 0;

  // go through specified range for next variable
  for (
    let variableValue = -size[variable] + offset[variable];
    variableValue <= size[variable] + offset[variable];
    variableValue += size[variable] / precision
  ) {
    iterations++;

    // sets value for the current variable
    scope[variable] = variableValue;
    point[variable] = variableValue;

    /*
    recursion with one input dimension less,
    count for set dimensions increases
    */
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

/*
# export
*/

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
  // reset variables
  graph = new Group();

  graphPoints.length = 0;
  graphColors.length = 0;
  graphIndices.length = 0;

  point.set(0, 0, 0);

  for (const variable in scope) {
    delete scope[variable];
  }

  // init scope, globalScope overrides statement.scope
  Object.assign(scope, statement.scope, globalScope);

  switch (mode) {
    case "2D":
      // resolution needed for adaptive line width (world units == false)
      graph2DMaterial.resolution.copy(resolution);

      return cartesian2D(statement, visibleCoords, cameraPosition, canvas);
    case "3D":
      return cartesian3D(statement);
  }
}

function cartesian2D(statement, visibleCoords, cameraPosition, canvas) {
  const dimensions = generateDimensions(["x", "y"]);

  // sets precision depending on orientation
  if (dimensions.input[0] === "x") {
    canvas = canvas.width;
  } else {
    canvas = canvas.height;
  }

  // double the size of the view
  calculatePoints(statement, dimensions, visibleCoords, cameraPosition, canvas);

  generateLine();

  const boundingBox = new Box3();
  boundingBox.setFromObject(graph);

  return new Graph(graph, boundingBox);
}

function cartesian3D(statement) {
  // arbitrary value
  const length = new Vector3(10, 10, 10);
  const offset = new Vector3(0, 0, 0);

  // abitrary value, trade-off between quality and effort
  const precision = 100;

  const dimensions = generateDimensions(["x", "y", "z"]);

  calculatePoints(statement, dimensions, length, offset, precision);

  // generate indices and connect points to mesh
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
    graphMesh.renderOrder = 0;

    graph.add(graphMesh);
  }

  const boundingBox = new Box3();
  boundingBox.setFromObject(graph);

  return new Graph(graph, boundingBox);
}
