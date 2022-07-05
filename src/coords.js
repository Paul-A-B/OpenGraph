import {
  Box3,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector2,
  Vector3,
} from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

const charMaterial = new MeshBasicMaterial({
  color: 0x000000,
});
const coordBackgroundMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  depthWrite: false,
});

function PrecalculatedTextGeometry(geometry, size, offset) {
  this.geometry = geometry;
  this.size = size;
  this.offset = offset;
}

const charCache = {};

const fontSize = 0.25;
function addToCharCache(char) {
  const characterGeometry = new TextGeometry(`${char}`, {
    font: font,
    size: fontSize,
    height: 0,
  });
  characterGeometry.computeBoundingBox();

  charCache[char] = new PrecalculatedTextGeometry(
    characterGeometry,
    {
      width:
        characterGeometry.boundingBox.max.x -
        characterGeometry.boundingBox.min.x,
      height:
        characterGeometry.boundingBox.max.y -
        characterGeometry.boundingBox.min.y,
    },
    new Vector2(
      characterGeometry.boundingBox.min.x,
      characterGeometry.boundingBox.min.y
    )
  );
}

let font;
export async function initCharacterCache() {
  const loader = new FontLoader();
  font = await loader.loadAsync("fonts/IBM Plex Mono_Regular.json");
  for (let char of "1234567890.-") {
    addToCharCache(char);
  }
}

function Coord(mesh, size, boundingBox) {
  this.mesh = mesh;
  this.size = size;
  this.boundingBox = boundingBox;
}

function generateCoord(number, scale = 1) {
  const coordMesh = new Group();

  let widthOfPreviousCharacters = 0;
  const charGroup = new Group();
  for (let char of number.toString()) {
    if (!charCache[char]) {
      addToCharCache(char);
    }
    const characterMesh = new Mesh(charCache[char].geometry, charMaterial);
    characterMesh.scale.setScalar(scale);
    characterMesh.position.x =
      widthOfPreviousCharacters - charCache[char].offset.x * scale;
    if (char === "-") {
      characterMesh.position.y =
        (fontSize / 2 -
          charCache[char].offset.y -
          charCache[char].size.height) *
        scale;
    } else {
      characterMesh.position.y = -charCache[char].offset.y * scale;
    }
    characterMesh.renderOrder = 4; // rendert es später -> es ist vor dem Hintergrund
    charGroup.add(characterMesh);
    widthOfPreviousCharacters +=
      (charCache[char].size.width + fontSize / 10) * scale;
  }

  const coordBoundingBox = new Box3();
  coordBoundingBox.setFromObject(charGroup, true);

  const size = {
    x: coordBoundingBox.max.x - coordBoundingBox.min.x,
    y: coordBoundingBox.max.y - coordBoundingBox.min.y,
  };

  charGroup.position.set(-size.x / 2, -size.y / 2, 0);

  coordMesh.add(charGroup);

  const coordBackgroundGeometry = new PlaneGeometry(size.x, size.y);
  const coordBackground = new Mesh(
    coordBackgroundGeometry,
    coordBackgroundMaterial
  );
  coordBackground.renderOrder = 3;

  coordBackground.name = "background";

  coordMesh.add(coordBackground);

  return new Coord(coordMesh, size, coordBoundingBox);
}

export function generateCoordinates(
  mode,
  visibleCoords,
  step,
  cameraPosition,
  intersection
) {
  switch (mode) {
    case "2D":
      return cartesian2D(visibleCoords, step, cameraPosition, intersection);
    case "3D":
      return cartesian3D(intersection);
  }
}

function cartesian2D(visibleCoords, step, cameraPosition, intersection) {
  const coordGroup = new Group();

  let coordLineGroup;

  let lastXCoordBoundingBox;

  const scale = step / 4;

  const dimensions = ["x", "y"];

  for (const currentDimension of dimensions) {
    const otherDimension = dimensions.filter(
      (dimension) => dimension !== currentDimension
    )[0];

    coordLineGroup = new Group();

    for (
      let variable =
        Math.round(
          (-visibleCoords[currentDimension] +
            cameraPosition[currentDimension]) /
            step
        ) * step;
      variable <=
      visibleCoords[currentDimension] + cameraPosition[currentDimension];
      variable += step / 2
    ) {
      const coord = generateCoord(variable, scale);

      coord.mesh.position[currentDimension] = variable;
      coord.mesh.position[otherDimension] -=
        coord.size[otherDimension] / 2 + (fontSize / 2) * scale;

      coord.boundingBox.setFromObject(coord.mesh, true);

      if (lastXCoordBoundingBox) {
        if (
          !(
            lastXCoordBoundingBox.max[currentDimension] >
              coord.boundingBox.min[currentDimension] ||
            lastXCoordBoundingBox.max[currentDimension] >
              coord.boundingBox.max[currentDimension]
          ) &&
          variable !== intersection[currentDimension]
        ) {
          coordLineGroup.add(coord.mesh);
        }
      }
      lastXCoordBoundingBox = coord.boundingBox;
    }
    coordLineGroup.position[otherDimension] += intersection[otherDimension];

    coordGroup.add(coordLineGroup);
  }
  return coordGroup;
}

function cartesian3D(intersection) {
  const coordGroup = new Group();

  const dimensions = ["x", "y", "z"];

  let coordLineGroup;

  const length = new Vector3(10, 10, 10);

  for (const currentDimension of dimensions) {
    coordLineGroup = new Group();

    for (
      let variable = -length[currentDimension];
      variable <= length[currentDimension];
      variable += Math.round(length[currentDimension] / 5)
    ) {
      const coord = generateCoord(variable);

      coord.mesh.position[currentDimension] = variable;

      const background = coord.mesh.children.find(
        (element) => element.name === "background"
      );

      if (background) {
        background.onBeforeRender = (renderer, scene, camera) => {
          coord.mesh.quaternion.copy(camera.quaternion);
        };
      }

      coordLineGroup.add(coord.mesh);
    }
    coordLineGroup.position[currentDimension] += intersection[currentDimension];

    coordGroup.add(coordLineGroup);
  }

  return coordGroup;
}
