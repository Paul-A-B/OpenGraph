/*
# MathJax setup
*/

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

// formats math
function mj(expression) {
  return MathJax.tex2chtml(
    expression.toTex({ parenthesis: "keep", implicit: "hide" }),
    { display: false }
  );
}

/*
# exports
*/

export function outputText(math, globalScope, input, mathNode, outputArea) {
  if (input) {
    const undefinedVariables = mathNode.filter((node) => {
      /*
      evaluate checks if variable already exists in math.js,
      error is thrown if symbol is undefined
      */
      try {
        return node.isSymbolNode && !node.evaluate(globalScope);
      } catch (e) {
        return true;
      }
    });

    if (undefinedVariables.length || mathNode.isFunctionAssignmentNode) {
      outputArea.textContent = "";
      outputArea.appendChild(mj(mathNode));
    } else {
      outputArea.textContent = "";
      outputArea.appendChild(mj(mathNode));

      // also display answer if all values are known
      outputArea.appendChild(mj(new math.SymbolNode(" = ")));
      outputArea.appendChild(
        mj(new math.ConstantNode(mathNode.evaluate(globalScope)))
      );
    }
    // update display
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
