window.MathJax = {
  options: {
    enableMenu: false,
  },
  chtml: {
    scale: 1.5,
  },
};

(function () {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
  script.async = true;
  document.head.appendChild(script);
})();

function mj(expression) {
  return MathJax.tex2chtml(
    expression.toTex({ parenthesis: "keep", implicit: "hide" }),
    { display: false }
  );
}

export function outputText(math, input, mathNode, outputArea) {
  if (input) {
    const symbols = mathNode.filter((node) => {
      return node.isSymbolNode;
    });
    if (symbols.length || mathNode.isFunctionAssignmentNode) {
      outputArea.textContent = "";
      outputArea.appendChild(mj(mathNode));
    } else {
      outputArea.textContent = "";
      outputArea.appendChild(mj(mathNode));
      outputArea.appendChild(mj(new math.SymbolNode(" = ")));
      outputArea.appendChild(mj(new math.ConstantNode(mathNode.evaluate())));
    }
    MathJax.startup.document.clear();
    MathJax.startup.document.updateDocument();
  } else {
    outputArea.textContent = "";
  }
}

export function outputError(input, error, outputArea) {
  if (input) {
    outputArea.textContent = `${input} (${error.message})`;
  } else {
    outputArea.textContent = `${error.message}`;
  }
}
