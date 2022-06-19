export function initInputFields(container, eventHandler) {
  const initialInputFields = document.getElementsByClassName("input");

  for (const inputField of initialInputFields) {
    inputField.addEventListener("input", eventHandler);
  }

  const count = document.getElementById("count");

  count.addEventListener("input", updateIOFields);

  function updateIOFields() {
    const ioFields = document.getElementsByClassName("io-field");

    const newLength = count.value || count.placeholder;
    const oldLength = ioFields.length;
    const difference = newLength - oldLength;

    for (let i = 0; i < Math.abs(difference); i++) {
      if (difference > 0) {
        const ioField = document.createElement("div");
        ioField.className = "io-field";

        const input = document.createElement("input");
        input.className = "input";

        input.addEventListener("input", eventHandler);

        const output = document.createElement("div");
        output.className = "output";

        ioField.appendChild(input);
        ioField.appendChild(output);

        container.appendChild(ioField);
      } else {
        container.removeChild(ioFields[ioFields.length - 1 - i]);
      }
    }
  }
}
