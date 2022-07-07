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

/*
# materials
*/

const charMaterial = new MeshBasicMaterial({
  color: 0x000000,
});
const coordBackgroundMaterial = new MeshBasicMaterial({
  color: 0xffffff,

  /*
  doesn't affect the three.js depth buffer to avoid
  the background clipping through the text in 3D
  */
  depthWrite: false,
});

/*
# utility
*/

// cache TextGeometry for later use because the generation is expensive

function PrecalculatedTextGeometry(geometry, size, offset) {
  this.geometry = geometry;
  this.size = size;

  // difference between the text position and the actual start of the character
  this.offset = offset;
}

const charCache = {};

const fontSize = 0.25;
function addToCharCache(char) {
  const character = new TextGeometry(`${char}`, {
    font: font,
    size: fontSize,
    height: 0,
  });
  character.computeBoundingBox();

  charCache[char] = new PrecalculatedTextGeometry(
    character,
    new Vector2(
      character.boundingBox.max.x - character.boundingBox.min.x,
      character.boundingBox.max.y - character.boundingBox.min.y
    ),
    new Vector2(character.boundingBox.min.x, character.boundingBox.min.y)
  );
}

let font;
export async function initCharacterCache() {
  const loader = new FontLoader();

  // waits for font to load before it generates the geometries
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

/*
general function for turning a number into a coordinate, consisting of a
group of characters and a plane background
 */
function generateCoord(number, scale = 1) {
  const coord = new Group();

  let widthOfPreviousCharacters = 0;
  const characters = new Group();

  // display numbers 0 <-> 1 in scientific notation
  if (Math.abs(number) < 1 && number !== 0) number = number.toExponential();

  for (let char of number.toString()) {
    if (!charCache[char]) {
      addToCharCache(char);
    }

    const characterMesh = new Mesh(charCache[char].geometry, charMaterial);

    characterMesh.scale.setScalar(scale);

    characterMesh.position.x =
      widthOfPreviousCharacters - charCache[char].offset.x * scale;
    if (char === "-") {
      // center minus-symbol
      characterMesh.position.y =
        (fontSize / 2 - charCache[char].offset.y - charCache[char].size.y / 2) *
        scale;
    } else {
      // align along consistent baseline
      characterMesh.position.y = -charCache[char].offset.y * scale;
    }
    characterMesh.renderOrder = 4;

    characters.add(characterMesh);

    widthOfPreviousCharacters +=
      (charCache[char].size.x + fontSize / 10) * scale;
  }

  const boundingBox = new Box3();
  boundingBox.setFromObject(characters, true);

  const size = new Vector2(
    boundingBox.max.x - boundingBox.min.x,
    boundingBox.max.y - boundingBox.min.y
  );

  // center the characters
  characters.position.set(-size.x / 2, -size.y / 2, 0);

  coord.add(characters);

  // generate background on which the characters can be displayed
  const coordBackgroundGeometry = new PlaneGeometry(size.x, size.y);
  const coordBackground = new Mesh(
    coordBackgroundGeometry,
    coordBackgroundMaterial
  );
  coordBackground.renderOrder = 3;

  // used for distinction
  coordBackground.name = "background";

  coord.add(coordBackground);

  return new Coord(coord, size, boundingBox);
}

/*
# export
*/

export function generateCoordinates(
  mode,
  visibleCoords,
  gridSize,
  cameraPosition,
  intersection
) {
  switch (mode) {
    case "2D":
      return cartesian2D(visibleCoords, gridSize, cameraPosition, intersection);
    case "3D":
      return cartesian3D();
  }
}

function cartesian2D(visibleCoords, gridSize, cameraPosition, intersection) {
  const coords = new Group();

  const dimensions = ["x", "y"];

  // all the coords along one axis
  let coordLine = new Group();
  let lastBoundingBox;

  // scaling indirectly based on zoom
  const scale = gridSize / 4;

  for (const currentDimension of dimensions) {
    lastBoundingBox = undefined;

    const otherDimension = dimensions.filter(
      (dimension) => dimension !== currentDimension
    )[0];

    // double the size of the view
    for (
      // starting value is aligned to the grid
      let dimensionValue =
        Math.round(
          (-visibleCoords[currentDimension] +
            cameraPosition[currentDimension]) /
            gridSize
        ) * gridSize;
      dimensionValue <=
      visibleCoords[currentDimension] + cameraPosition[currentDimension];
      dimensionValue += gridSize / 2
    ) {
      const coord = generateCoord(dimensionValue, scale);

      coord.mesh.position[currentDimension] = dimensionValue;

      // position coords next to the axis
      if (intersection[otherDimension] <= 0) {
        coord.mesh.position[otherDimension] -=
          coord.size[otherDimension] / 2 + (fontSize / 2) * scale;
      } else {
        coord.mesh.position[otherDimension] +=
          coord.size[otherDimension] / 2 + (fontSize / 2) * scale;
      }

      coord.boundingBox.setFromObject(coord.mesh, true);

      /*
       only add new coord, if it doesn't intersect the previous one and
       it isn't at the axis intersection
      */
      if (lastBoundingBox) {
        if (
          !(
            lastBoundingBox.max[currentDimension] >
              coord.boundingBox.min[currentDimension] ||
            lastBoundingBox.max[currentDimension] >
              coord.boundingBox.max[currentDimension]
          ) &&
          dimensionValue.toFixed(10) !==
            intersection[currentDimension].toFixed(10)
        ) {
          coordLine.add(coord.mesh);
          lastBoundingBox = coord.boundingBox;
        }
      } else {
        lastBoundingBox = coord.boundingBox;
      }
    }
    // move coords next to axis
    coordLine.position[otherDimension] += intersection[otherDimension];

    coords.add(coordLine);

    // reset the group for the next iteration
    coordLine = new Group();
  }

  return coords;
}

function cartesian3D() {
  const coords = new Group();

  const dimensions = ["x", "y", "z"];

  // all the coords along one axis
  let coordLine = new Group();

  // arbitrary value
  const length = new Vector3(10, 10, 10);

  for (const currentDimension of dimensions) {
    for (
      let dimensionValue = -length[currentDimension];
      dimensionValue <= length[currentDimension];
      dimensionValue += Math.round(length[currentDimension] / 5)
    ) {
      const coord = generateCoord(dimensionValue);

      coord.mesh.position[currentDimension] = dimensionValue;

      const background = coord.mesh.children.find(
        (element) => element.name === "background"
      );

      if (background) {
        background.onBeforeRender = (renderer, scene, camera) => {
          // rotate coords towards camera
          coord.mesh.quaternion.copy(camera.quaternion);
        };
      }

      coordLine.add(coord.mesh);
    }
    coords.add(coordLine);

    // reset the group for the next iteration
    coordLine = new Group();
  }

  return coords;
}
