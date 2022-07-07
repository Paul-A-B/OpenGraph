/*
# utility
*/

let container, inputHandler;

function addIOField() {
  const ioField = document.createElement("div");
  ioField.className = "io-field";

  const input = document.createElement("input");
  input.className = "input";

  input.addEventListener("input", inputHandler);

  const output = document.createElement("div");
  output.className = "output";

  ioField.appendChild(input);
  ioField.appendChild(output);

  container.appendChild(ioField);
}

function removeIOField(ioField) {
  // used to remove the existing input associated with the ioField
  container.dispatchEvent(
    new CustomEvent("inputFieldRemoved", {
      detail: ioField.getElementsByClassName("input")[0],
    })
  );
  container.removeChild(ioField);
}

function updateIOFields() {
  const ioFields = document.getElementsByClassName("io-field");

  const newLength = count.value || count.placeholder;
  const oldLength = ioFields.length;
  const difference = newLength - oldLength;

  for (let i = 0; i < Math.abs(difference); i++) {
    if (difference > 0) {
      addIOField();
    } else {
      removeIOField(ioFields[ioFields.length - 1]);
    }
  }
}

/*
# export
*/

export function initInputFields(htmlParent, eventHandler) {
  container = htmlParent;
  inputHandler = eventHandler;

  const initialInputFields = document.getElementsByClassName("input");

  for (const inputField of initialInputFields) {
    inputField.addEventListener("input", eventHandler);
  }

  const count = document.getElementById("count");

  count.addEventListener("input", updateIOFields);
}
