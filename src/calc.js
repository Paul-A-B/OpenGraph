const operators = ["-", "+", "*", "/"];

const inputArea = document.getElementById("input");
const outputArea = document.getElementById("output");

inputArea.addEventListener("input", takeInput);

function takeInput() {
  if (inputArea.value) {
    let input = inputArea.value;
    input = input.split(/([-+*/^().])/g).filter((el) => el != "");
    console.log(validOperation(input));
    try {
      output.textContent = `${input.join("")} = ${Function(
        `return ${input.join("")}`
      )()}`;
    } catch {
      output.textContent = `${input.join("")} (SYNTAX ERROR)`;
    }
  }
}

function validOperation(input) {
  if (!bracketsClose(input)) {
    return false;
  }

  if (!legalOperator(input)) {
    return false;
  }

  return true;
}

function bracketsClose(statement) {
  let match = false;
  let endIndices = [];
  for (let start = statement.length - 1; start >= 0; start--) {
    if (statement[start] === "(") {
      match = false;
      for (
        let end = endIndices[endIndices.length - 1] + 1 || 0;
        end < statement.length;
        end++
      ) {
        if (
          statement[end] === ")" &&
          !endIndices.some((index) => {
            return end == index;
          })
        ) {
          match = true;
          endIndices.push(end);
          break;
        }
      }
      if (!match) {
        return false;
      }
    }
  }
  return true;
}

function legalOperator(statement) {
  if (
    operators.some((operator) => {
      return statement[statement.length - 1].indexOf(operator) >= 0;
    })
  ) {
    return false;
  }
  for (let index = 0; index < statement.length - 1; index++) {
    if (
      operators.some((operator) => {
        return statement[index].indexOf(operator) >= 0;
      })
    ) {
      for (let i = index; i < statement.length; i++) {
        if (statement[i].match(/\d+/)) {
          break;
        }
        if (statement[i] === ")") {
          return false;
        }
      }
    }
  }
  return true;
}
