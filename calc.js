let graph = document.getElementById("graph");
let ctx = graph.getContext("2d");

let inputArea = document.getElementById("input");

window.addEventListener("load", reset);
window.addEventListener("resize", reset);

function reset() {
    graph.width = document.body.clientWidth;
	graph.height = document.body.clientHeight;
}

inputArea.addEventListener("input", takeInput);
let input;

function takeInput() {
	input = inputArea.value;
}