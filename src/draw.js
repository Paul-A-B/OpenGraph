/*
# utility
*/

let lastCameraZ;
let zoomRepaint = false;

/*
# export
*/

function Redraw(graph = [], grid = false, zoomRepaint = false) {
  this.graph = graph;
  this.grid = grid;
  this.zoomRepaint = zoomRepaint;
}

export function needsRedraw(
  mode,
  cameraViewArea,
  cameraPosition,
  activeGraphs,
  activeGrid
) {
  switch (mode) {
    case "2D":
      return cartesian2D(
        cameraViewArea,
        cameraPosition,
        activeGraphs,
        activeGrid
      );
    case "3D":
      return cartesian3D(activeGraphs, activeGrid);
  }
}

function cartesian2D(viewArea, cameraPosition, activeInputs, activeGrid) {
  const redraw = new Redraw();

  // z acts as zoom in 2D
  if (
    cameraPosition.z >= lastCameraZ * 1.2 ||
    cameraPosition.z <= lastCameraZ / 1.2 ||
    !lastCameraZ
  ) {
    zoomRepaint = true;
    lastCameraZ = cameraPosition.z;
  } else {
    zoomRepaint = false;
  }

  for (let i = 0; i < activeInputs.length; i++) {
    // geometry doesn't get redrawn
    if (
      activeInputs[i].statement.isPoint ||
      activeInputs[i].statement.isPolygon
    ) {
      redraw.graph.push(false);
      break;
    }

    /*
    when graph gets painted, it covers double the viewing area
    if the end is inside the view -> repaint
     */
    if (
      activeInputs[i].graph.boundingBox.max.x < viewArea.max.x ||
      activeInputs[i].graph.boundingBox.min.x > viewArea.min.x ||
      zoomRepaint
    ) {
      redraw.graph.push(true);
    } else {
      redraw.graph.push(false);
    }
  }

  /*
  when grid gets painted, it covers double the viewing area
  if the end is inside the view -> repaint
   */
  if (activeGrid) {
    if (
      activeGrid.boundingBox.max.x < viewArea.max.x ||
      activeGrid.boundingBox.max.y < viewArea.max.y ||
      activeGrid.boundingBox.min.x > viewArea.min.x ||
      activeGrid.boundingBox.min.y > viewArea.min.y ||
      zoomRepaint
    ) {
      redraw.grid = true;
    }
  } else {
    redraw.grid = true;
  }

  if (zoomRepaint) {
    redraw.zoomRepaint = true;
  }

  return redraw;
}

// 3D doesn't feature redrawing due to a static position
function cartesian3D(activeGraphs, activeGrid) {
  const redraw = new Redraw();

  for (let i = 0; i < activeGraphs.length; i++) {
    redraw.graph.push(false);
  }
  if (!activeGrid) {
    redraw.grid = true;
  }

  return redraw;
}
