const resultDisplay = document.querySelector("#result");
const expressionDisplay = document.querySelector("#expression");
const memoryIndicator = document.querySelector("#memoryIndicator");
const keypad = document.querySelector("#keypad");

let currentInput = "0";
let storedValue = null;
let pendingOperator = null;
let shouldStartNewInput = false;
let lastExpression = "";
let memoryValue = null;

const operatorFunctions = {
  "+": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => b === 0 ? null : a / b,
};

function formatNumber(value) {
  if (!Number.isFinite(value)) return "Error";
  // Avoid floating-point tails while preserving useful precision.
  const rounded = Number.parseFloat(value.toPrecision(11));
  return rounded.toLocaleString("en-US", {
    useGrouping: true,
    maximumFractionDigits: 10,
  });
}

function rawNumber() {
  return Number(currentInput.replaceAll(",", ""));
}

function render() {
  resultDisplay.textContent = currentInput;
  expressionDisplay.textContent = lastExpression || (pendingOperator ? `${formatNumber(storedValue)} ${pendingOperator}` : "Ready when you are");
  memoryIndicator.textContent = memoryValue === null ? "" : "M";
  keypad.querySelectorAll("[data-operator]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.operator === pendingOperator);
  });
}

function enterDigit(digit) {
  if (currentInput === "Error" || shouldStartNewInput) {
    currentInput = digit;
    shouldStartNewInput = false;
  } else if (currentInput.replaceAll(",", "").replace("-", "").replace(".", "").length < 13) {
    currentInput = currentInput === "0" ? digit : currentInput.replaceAll(",", "") + digit;
  }
  currentInput = formatInput(currentInput);
  lastExpression = "";
  render();
}

function formatInput(value) {
  if (value === "Error" || value === "-" || value.endsWith(".")) {
    const parts = value.split(".");
    if (parts[0] === "" || parts[0] === "-") return value;
    const sign = parts[0].startsWith("-") ? "-" : "";
    const integerPart = parts[0].replace("-", "");
    return sign + Number(integerPart || 0).toLocaleString("en-US") + (parts.length > 1 ? "." + parts[1] : "");
  }
  const numeric = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(numeric)) return "Error";
  const [whole, decimal] = value.replaceAll(",", "").split(".");
  const formattedWhole = Number(whole || 0).toLocaleString("en-US");
  return decimal !== undefined ? `${formattedWhole}.${decimal}` : formattedWhole;
}

function chooseOperator(operator) {
  if (currentInput === "Error") return clearAll();
  const value = rawNumber();

  if (pendingOperator && !shouldStartNewInput) {
    const next = calculate(storedValue, value, pendingOperator);
    if (next === null) return showError("Cannot divide by zero");
    storedValue = next;
    currentInput = formatNumber(next);
  } else {
    storedValue = value;
  }

  pendingOperator = operator;
  shouldStartNewInput = true;
  lastExpression = "";
  render();
}

function calculate(a, b, operator) {
  const fn = operatorFunctions[operator];
  if (!fn) return b;
  const value = fn(a, b);
  if (value === null || !Number.isFinite(value)) return null;
  return Number.parseFloat(value.toPrecision(11));
}

function equals() {
  if (!pendingOperator || storedValue === null || currentInput === "Error") return;
  const rightValue = rawNumber();
  const expression = `${formatNumber(storedValue)} ${pendingOperator} ${formatNumber(rightValue)} =`;
  const answer = calculate(storedValue, rightValue, pendingOperator);
  if (answer === null) return showError("Cannot divide by zero");

  currentInput = formatNumber(answer);
  lastExpression = expression;
  storedValue = null;
  pendingOperator = null;
  shouldStartNewInput = true;
  render();
}

function clearAll() {
  currentInput = "0";
  storedValue = null;
  pendingOperator = null;
  shouldStartNewInput = false;
  lastExpression = "";
  render();
}

function toggleSign() {
  if (currentInput === "Error" || rawNumber() === 0) return;
  currentInput = formatInput(String(-rawNumber()));
  lastExpression = "";
  render();
}

function percent() {
  if (currentInput === "Error") return;
  currentInput = formatNumber(rawNumber() / 100);
  shouldStartNewInput = true;
  lastExpression = "";
  render();
}

function decimal() {
  if (currentInput === "Error" || shouldStartNewInput) {
    currentInput = "0.";
    shouldStartNewInput = false;
  } else if (!currentInput.includes(".")) {
    currentInput += ".";
  }
  lastExpression = "";
  render();
}

function showError(message) {
  currentInput = "Error";
  lastExpression = message;
  storedValue = null;
  pendingOperator = null;
  shouldStartNewInput = true;
  render();
}

function handleAction(action) {
  switch (action) {
    case "clear": clearAll(); break;
    case "sign": toggleSign(); break;
    case "percent": percent(); break;
    case "decimal": decimal(); break;
    case "equals": equals(); break;
    case "memory-clear":
      memoryValue = null;
      render();
      break;
  }
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.digit !== undefined) enterDigit(button.dataset.digit);
  else if (button.dataset.operator) chooseOperator(button.dataset.operator);
  else if (button.dataset.action) handleAction(button.dataset.action);
});

document.addEventListener("keydown", (event) => {
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    enterDigit(event.key);
  } else if (event.key === ".") {
    event.preventDefault();
    decimal();
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    equals();
  } else if (event.key === "Escape" || event.key === "Delete") {
    clearAll();
  } else if (event.key === "Backspace") {
    if (currentInput !== "Error" && !shouldStartNewInput) {
      const unformatted = currentInput.replaceAll(",", "");
      currentInput = unformatted.length <= 1 || (unformatted.length === 2 && unformatted.startsWith("-"))
        ? "0"
        : formatInput(unformatted.slice(0, -1));
      render();
    }
  } else if (["+", "-", "*", "/"].includes(event.key)) {
    event.preventDefault();
    const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
    chooseOperator(symbols[event.key]);
  } else if (event.key === "%") {
    percent();
  }
});

render();
