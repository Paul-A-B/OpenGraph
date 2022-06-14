import { Group, Mesh, Box3, PlaneGeometry, MeshBasicMaterial } from "three";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

let font;
new FontLoader().load("fonts/IBM Plex Mono_Regular.json", (response) => {
  font = response;
});

function PrecalculatedTextGeometry(geometry, size, offset) {
  this.geometry = geometry;
  this.size = size;
  this.offset = offset;
}

export class Coordinates {
  charCache = {};
  constructor() {
    for (let char of "1234567890.-") {
      const characterGeometry = new TextGeometry(`${char}`, {
        font: font,
        size: 0.25,
        height: 0,
      });
      characterGeometry.computeBoundingBox();

      this.charCache[char] = new PrecalculatedTextGeometry(
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
  }
  generate = generateCoordinates;
}

function generateCoordinates(
  visibleCoords,
  step,
  cameraPosition,
  axesMaterial,
  intersection
) {
  const coordGroup = new Group();

  const verticalCoordGroup = new Group();
  const horizontalCoordGroup = new Group();

  let lastXCoordBoundingBox;

  let scale = step / 4;

  for (
    let x = Math.round((-visibleCoords.x + cameraPosition.x) / step) * step;
    x <= visibleCoords.x + cameraPosition.x;
    x += step / 2
  ) {
    const coordMesh = new Group();
    let widthOfPreviousCharacters = 0;

    for (let char of x.toString()) {
      if (!this.charCache[char]) {
        const characterGeometry = new TextGeometry(`${char}`, {
          font: font,
          size: 0.25,
          height: 0,
        });
        characterGeometry.computeBoundingBox();

        this.charCache[char] = new PrecalculatedTextGeometry(
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
      const characterMesh = new Mesh(
        this.charCache[char].geometry,
        axesMaterial
      );
      characterMesh.scale.setScalar(scale);
      characterMesh.position.x =
        widthOfPreviousCharacters - this.charCache[char].offset.x * scale;
      if (char === "-") {
        characterMesh.position.y =
          (0.125 -
            this.charCache[char].offset.y -
            this.charCache[char].size.height) *
          scale;
      } else {
        characterMesh.position.y = -this.charCache[char].offset.y * scale;
      }
      characterMesh.renderOrder = 1; // rendert es später -> es ist vor dem Hintergrund
      coordMesh.add(characterMesh);
      widthOfPreviousCharacters +=
        (this.charCache[char].size.width + 0.025) * scale;
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
    const coordBackgroundMaterial = new MeshBasicMaterial({
      color: 0xffffff,
    });
    const coordBackground = new Mesh(
      coordBackgroundGeometry,
      coordBackgroundMaterial
    );
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
        const characterMesh = new Mesh(
          this.charCache[char].geometry,
          axesMaterial
        );
        characterMesh.scale.setScalar(scale);
        characterMesh.position.x =
          widthOfPreviousCharacters - this.charCache[char].offset.x * scale;
        if (char === "-") {
          characterMesh.position.y =
            (0.125 -
              this.charCache[char].offset.y -
              this.charCache[char].size.height) *
            scale;
        } else {
          characterMesh.position.y -= this.charCache[char].offset.y * scale;
        }
        characterMesh.renderOrder = 1; // rendert es später -> es ist vor dem Hintergrund
        coordMesh.add(characterMesh);
        widthOfPreviousCharacters +=
          (this.charCache[char].size.width + 0.025) * scale;
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
      const coordBackgroundMaterial = new MeshBasicMaterial({
        color: 0xffffff,
      });
      const coordBackground = new Mesh(
        coordBackgroundGeometry,
        coordBackgroundMaterial
      );
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
