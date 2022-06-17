import { Group, Mesh, Box3, PlaneGeometry, MeshBasicMaterial } from "three";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { BufferGeometry } from "three";

const charMaterial = new MeshBasicMaterial({
  color: 0x000000,
});
const coordBackgroundMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  depthWrite: false,
});

let font;
const loader = new FontLoader();
loader.crossOrigin = ""; // vllt wieder rausnehmen
loader.load("fonts/IBM Plex Mono_Regular.json", (response) => {
  font = response;
});

function PrecalculatedTextGeometry(geometry, size, offset) {
  this.geometry = geometry;
  this.size = size;
  this.offset = offset;
}

const charCache = {};

function addToCharCache(char) {
  const characterGeometry = new TextGeometry(`${char}`, {
    font: font,
    size: 0.25,
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
    {
      x: characterGeometry.boundingBox.min.x,
      y: characterGeometry.boundingBox.min.y,
    }
  );
}

export function initCharacterCache() {
  for (let char of "1234567890.-") {
    addToCharCache(char);
  }
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

  const verticalCoordGroup = new Group();
  const horizontalCoordGroup = new Group();

  let lastXCoordBoundingBox;

  const scale = step / 4;

  for (
    let x = Math.round((-visibleCoords.x + cameraPosition.x) / step) * step;
    x <= visibleCoords.x + cameraPosition.x;
    x += step / 2
  ) {
    const coordMesh = new Group();
    let widthOfPreviousCharacters = 0;

    for (let char of x.toString()) {
      if (!charCache[char]) {
        addToCharCache(char);
      }
      const characterMesh = new Mesh(charCache[char].geometry, charMaterial);
      characterMesh.scale.setScalar(scale);
      characterMesh.position.x =
        widthOfPreviousCharacters - charCache[char].offset.x * scale;
      if (char === "-") {
        characterMesh.position.y =
          (0.125 - charCache[char].offset.y - charCache[char].size.height) *
          scale;
      } else {
        characterMesh.position.y = -charCache[char].offset.y * scale;
      }
      characterMesh.renderOrder = 4; // rendert es später -> es ist vor dem Hintergrund
      coordMesh.add(characterMesh);
      widthOfPreviousCharacters += (charCache[char].size.width + 0.025) * scale;
    }
    const coordBoundingBox = new Box3();
    coordBoundingBox.setFromObject(coordMesh, true);

    const coordBoundingBoxWidth =
      coordBoundingBox.max.x - coordBoundingBox.min.x;
    const coordBoundingBoxHeight =
      coordBoundingBox.max.y - coordBoundingBox.min.y;

    const coordBackgroundGeometry = new PlaneGeometry(
      coordBoundingBoxWidth,
      coordBoundingBoxHeight
    );
    const coordBackground = new Mesh(
      coordBackgroundGeometry,
      coordBackgroundMaterial
    );
    coordBackground.renderOrder = 3;

    coordBackground.position.x =
      coordBoundingBox.min.x + coordBoundingBoxWidth / 2;
    coordBackground.position.y =
      coordBoundingBox.min.y + coordBoundingBoxHeight / 2;

    coordMesh.add(coordBackground);

    if (x === intersection.x) {
      coordMesh.position.x = x - (coordBoundingBoxWidth + 0.05 * scale);
    } else {
      coordMesh.position.x = x - coordBoundingBoxWidth / 2;
    }
    coordMesh.position.y -= coordBoundingBoxHeight + 0.05 * scale;

    coordBoundingBox.setFromObject(coordMesh, true);

    if (lastXCoordBoundingBox) {
      if (
        !(
          lastXCoordBoundingBox.max.x > coordBoundingBox.min.x ||
          lastXCoordBoundingBox.max.x > coordBoundingBox.max.x
        )
      ) {
        verticalCoordGroup.add(coordMesh);
      }
    }

    lastXCoordBoundingBox = coordBoundingBox;
  }
  verticalCoordGroup.position.y += intersection.y;

  for (
    let y = Math.floor((-visibleCoords.y + cameraPosition.y) / step) * step;
    y <= visibleCoords.y + cameraPosition.y;
    y += step / 2
  ) {
    if (y !== intersection.y) {
      const coordMesh = new Group();
      let widthOfPreviousCharacters = 0;

      for (let char of y.toString()) {
        if (!charCache[char]) {
          addToCharCache(char);
        }

        const characterMesh = new Mesh(charCache[char].geometry, charMaterial);
        characterMesh.scale.setScalar(scale);
        characterMesh.position.x =
          widthOfPreviousCharacters - charCache[char].offset.x * scale;
        if (char === "-") {
          characterMesh.position.y =
            (0.125 - charCache[char].offset.y - charCache[char].size.height) *
            scale;
        } else {
          characterMesh.position.y -= charCache[char].offset.y * scale;
        }
        characterMesh.renderOrder = 4; // rendert es später -> es ist vor dem Hintergrund
        coordMesh.add(characterMesh);
        widthOfPreviousCharacters +=
          (charCache[char].size.width + 0.025) * scale;
      }
      const coordBoundingBox = new Box3();
      coordBoundingBox.setFromObject(coordMesh, true);

      const coordBoundingBoxWidth =
        coordBoundingBox.max.x - coordBoundingBox.min.x;
      const coordBoundingBoxHeight =
        coordBoundingBox.max.y - coordBoundingBox.min.y;

      coordMesh.position.x -= coordBoundingBoxWidth + 0.05 * scale;
      coordMesh.position.y = y - coordBoundingBoxHeight / 2;

      const coordBackgroundGeometry = new PlaneGeometry(
        coordBoundingBoxWidth,
        coordBoundingBoxHeight
      );
      const coordBackground = new Mesh(
        coordBackgroundGeometry,
        coordBackgroundMaterial
      );
      coordBackground.renderOrder = 3;

      coordBackground.position.x =
        coordBoundingBox.min.x + coordBoundingBoxWidth / 2;
      coordBackground.position.y =
        coordBoundingBox.min.y + coordBoundingBoxHeight / 2;

      coordMesh.add(coordBackground);

      horizontalCoordGroup.add(coordMesh);
    }
  }
  horizontalCoordGroup.position.x += intersection.x;

  coordGroup.add(verticalCoordGroup);
  coordGroup.add(horizontalCoordGroup);
  return coordGroup;
}

function cartesian3D(intersection) {
  const coordGroup = new Group();

  const verticalCoordGroup = new Group();
  const horizontalCoordGroup = new Group();
  const lateralCoordGroup = new Group();

  const length = {
    x: 10,
    y: 10,
    z: 10,
  };

  for (let x = -length.x; x <= length.x; x += Math.round(length.x / 5)) {
    const coordMesh = new Group();

    let widthOfPreviousCharacters = 0;
    const charGroup = new Group();
    for (let char of x.toString()) {
      if (!charCache[char]) {
        addToCharCache(char);
      }

      const characterMesh = new Mesh(charCache[char].geometry, charMaterial);
      characterMesh.position.x =
        widthOfPreviousCharacters - charCache[char].offset.x;
      if (char === "-") {
        characterMesh.position.y =
          0.125 - charCache[char].offset.y - charCache[char].size.height;
      } else {
        characterMesh.position.y = -charCache[char].offset.y;
      }
      characterMesh.renderOrder = 4; // rendert es später -> es ist vor dem Hintergrund
      charGroup.add(characterMesh);
      widthOfPreviousCharacters += charCache[char].size.width + 0.025;
    }
    const coordBoundingBox = new Box3();
    coordBoundingBox.setFromObject(charGroup, true);

    const coordBoundingBoxWidth =
      coordBoundingBox.max.x - coordBoundingBox.min.x;
    const coordBoundingBoxHeight =
      coordBoundingBox.max.y - coordBoundingBox.min.y;

    charGroup.position.set(
      -coordBoundingBoxWidth / 2,
      -coordBoundingBoxHeight / 2,
      0
    );

    coordMesh.add(charGroup);

    const coordBackgroundGeometry = new PlaneGeometry(
      coordBoundingBoxWidth,
      coordBoundingBoxHeight
    );
    const coordBackground = new Mesh(
      coordBackgroundGeometry,
      coordBackgroundMaterial
    );
    coordBackground.renderOrder = 3;
    coordBackground.onBeforeRender = (
      renderer,
      scene,
      camera,
      geometry,
      material,
      group
    ) => {
      coordMesh.quaternion.copy(camera.quaternion);
    };

    coordMesh.add(coordBackground);

    coordMesh.position.x = x;

    coordBoundingBox.setFromObject(coordMesh, true);

    verticalCoordGroup.add(coordMesh);
  }
  verticalCoordGroup.position.y += intersection.y;

  for (let y = -length.y; y <= length.y; y += Math.round(length.y / 5)) {
    if (y !== intersection.y) {
      const coordMesh = new Group();

      let widthOfPreviousCharacters = 0;
      const charGroup = new Group();
      for (let char of y.toString()) {
        if (!charCache[char]) {
          addToCharCache(char);
        }

        const characterMesh = new Mesh(charCache[char].geometry, charMaterial);
        characterMesh.position.x =
          widthOfPreviousCharacters - charCache[char].offset.x;
        if (char === "-") {
          characterMesh.position.y =
            0.125 - charCache[char].offset.y - charCache[char].size.height;
        } else {
          characterMesh.position.y -= charCache[char].offset.y;
        }
        characterMesh.renderOrder = 4; // rendert es später -> es ist vor dem Hintergrund
        charGroup.add(characterMesh);
        widthOfPreviousCharacters += charCache[char].size.width + 0.025;
      }
      const coordBoundingBox = new Box3();
      coordBoundingBox.setFromObject(charGroup, true);

      const coordBoundingBoxWidth =
        coordBoundingBox.max.x - coordBoundingBox.min.x;
      const coordBoundingBoxHeight =
        coordBoundingBox.max.y - coordBoundingBox.min.y;

      charGroup.position.set(
        -coordBoundingBoxWidth / 2,
        -coordBoundingBoxHeight / 2,
        0
      );

      coordMesh.add(charGroup);

      const coordBackgroundGeometry = new PlaneGeometry(
        coordBoundingBoxWidth,
        coordBoundingBoxHeight
      );
      const coordBackground = new Mesh(
        coordBackgroundGeometry,
        coordBackgroundMaterial
      );
      coordBackground.renderOrder = 3;
      coordBackground.onBeforeRender = (
        renderer,
        scene,
        camera,
        geometry,
        material,
        group
      ) => {
        coordMesh.quaternion.copy(camera.quaternion);
      };

      coordMesh.add(coordBackground);

      coordMesh.position.y = y;

      horizontalCoordGroup.add(coordMesh);
    }
  }
  horizontalCoordGroup.position.x += intersection.x;

  for (let z = -length.z; z <= length.z; z += Math.round(length.z / 5)) {
    if (z !== intersection.z) {
      const coordMesh = new Group();

      let widthOfPreviousCharacters = 0;
      const charGroup = new Group();
      for (let char of z.toString()) {
        if (!charCache[char]) {
          addToCharCache(char);
        }

        const characterMesh = new Mesh(charCache[char].geometry, charMaterial);
        characterMesh.position.x =
          widthOfPreviousCharacters - charCache[char].offset.x;
        if (char === "-") {
          characterMesh.position.y =
            0.125 - charCache[char].offset.y - charCache[char].size.height;
        } else {
          characterMesh.position.y -= charCache[char].offset.y;
        }
        characterMesh.renderOrder = 4; // rendert es später -> es ist vor dem Hintergrund
        charGroup.add(characterMesh);
        widthOfPreviousCharacters += charCache[char].size.width + 0.025;
      }
      const coordBoundingBox = new Box3();
      coordBoundingBox.setFromObject(charGroup, true);

      const coordBoundingBoxWidth =
        coordBoundingBox.max.x - coordBoundingBox.min.x;
      const coordBoundingBoxHeight =
        coordBoundingBox.max.y - coordBoundingBox.min.y;

      charGroup.position.set(
        -coordBoundingBoxWidth / 2,
        -coordBoundingBoxHeight / 2,
        0
      );

      coordMesh.add(charGroup);

      const coordBackgroundGeometry = new PlaneGeometry(
        coordBoundingBoxWidth,
        coordBoundingBoxHeight
      );
      const coordBackground = new Mesh(
        coordBackgroundGeometry,
        coordBackgroundMaterial
      );
      coordBackground.renderOrder = 3;
      coordBackground.onBeforeRender = (
        renderer,
        scene,
        camera,
        geometry,
        material,
        group
      ) => {
        coordMesh.quaternion.copy(camera.quaternion);
      };

      coordMesh.add(coordBackground);

      coordMesh.position.z = z;

      horizontalCoordGroup.add(coordMesh);
    }
  }
  horizontalCoordGroup.position.x += intersection.x;

  coordGroup.add(verticalCoordGroup);
  coordGroup.add(horizontalCoordGroup);
  coordGroup.add(lateralCoordGroup);
  return coordGroup;
}
