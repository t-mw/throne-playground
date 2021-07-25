import { colorFromSeed } from "./utility";

import * as jsondiffpatch from "jsondiffpatch";
import * as GraphemeSplitter from "grapheme-splitter";

class LiveView {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.previousState = [];
    this.inputState = {
      keysDown: {},
      keysPressed: {},
      isMouseDown: false,
      wasMousePressed: false,
      mouseGridPos: [-1, -1]
    };
    this.canvas = null;
  }

  reset(context, options) {
    this.previousState = [];
    this.update(context, options);
  }

  update(context, options) {
    const { enableVisualMode, gridWidth, gridHeight } = options;

    if (context == null) {
      return;
    }

    const state = context.get_state();
    const hashes = context.get_state_hashes();
    state.forEach((phrase, i) => {
      phrase.hash = hashes[i];
    });
    state.sort(compareTokens);

    if (enableVisualMode) {
      this.rootEl.classList.add("visual");
      this.canvas = updateVisualLiveView(
        state,
        this.inputState,
        gridWidth,
        gridHeight,
        this.rootEl
      );
      return;
    } else {
      this.rootEl.classList.remove("visual");
    }

    updateStateLiveView(state, this.previousState, this.rootEl);
    this.previousState = state;
  }

  focus() {
    if (this.canvas != null) {
      if (document.activeElement !== this.canvas) {
        this.canvas.focus();
      }
    }
  }
}

function compareTokens(a, b) {
  if (a.hash != null && b.hash != null && a.hash === b.hash) {
    return 0;
  }

  if (isAtom(a) != isAtom(b)) {
    // sort atoms before phrases
    return isAtom(a) ? -1 : 1;
  } else if (isAtom(a)) {
    // both are atoms
    if (a === b) {
      return 0;
    } else {
      return a < b ? -1 : 1;
    }
  } else {
    // both are phrases
    for (let i = 0; i < a.length && i < b.length; i++) {
      const result = compareTokens(a[i], b[i]);
      if (result != 0) {
        return result;
      }
    }

    // phrases share common prefix
    return a.length < b.length ? -1 : 1;
  }
}

const splitter = new GraphemeSplitter();
function updateVisualLiveView(state, inputState, gridWidth, gridHeight, liveViewEl) {
  let gridCellSize = Math.min(
    Math.floor(liveViewEl.clientWidth / gridWidth),
    Math.floor(liveViewEl.clientHeight / gridHeight)
  );
  // constrain cell size to integers divisible by 2
  if (gridCellSize % 2 === 1) {
    gridCellSize = Math.max(gridCellSize - 1, 0);
  }

  let canvas = liveViewEl.querySelector("canvas");
  if (canvas == null) {
    liveViewEl.innerHTML = "";
    canvas = document.createElement("canvas");
    liveViewEl.appendChild(canvas);

    // make canvas focusable
    canvas.tabIndex = "0";

    canvas.addEventListener("keydown", function(e) {
      inputState.keysDown[e.keyCode] = true;
      inputState.keysPressed[e.keyCode] = true;
    });

    canvas.addEventListener("keyup", function(e) {
      inputState.keysDown[e.keyCode] = false;
    });

    canvas.addEventListener("mousedown", function(e) {
      if (document.activeElement !== canvas) {
        e.target.focus();
      }
      inputState.isMouseDown = true;
      inputState.wasMousePressed = true;
    });

    canvas.addEventListener("mouseup", function(e) {
      inputState.isMouseDown = false;
    });

    canvas.addEventListener("mousemove", function(e) {
      const rect = canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const gridX = Math.floor(pixelX / gridCellSize);
      const gridY = Math.floor(pixelY / gridCellSize);
      inputState.mouseGridPos = [gridX, gridY];
    });

    canvas.addEventListener("mouseleave", function(e) {
      inputState.mouseGridPos = [-1, -1];
    });
  }

  canvas.width = gridCellSize * gridWidth;
  canvas.height = gridCellSize * gridHeight;

  const pixelX = (gridX) => gridCellSize / 2 + gridX * gridCellSize;
  const pixelY = (gridY) => gridY * gridCellSize + Math.floor(gridCellSize * 28 / 32);

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgb(200,200,200)";
  context.setLineDash([5, 3]);
  context.lineWidth = 1;
  context.textAlign = "center";

  context.beginPath();
  for (let x = 0; x <= gridWidth; x++) {
    context.moveTo(x * gridCellSize, 0);
    context.lineTo(x * gridCellSize, gridCellSize * gridHeight);
  }
  context.stroke();

  context.beginPath();
  for (let y = 0; y <= gridHeight; y++) {
    context.moveTo(0, y * gridCellSize);
    context.lineTo(gridCellSize * gridWidth, y * gridCellSize);
  }
  context.stroke();

  context.font = gridCellSize.toString() + 'px "Droid Sans Mono", "monospace", monospace, "Droid Sans Fallback"';

  state.forEach(phrase => {
    if (isAtom(phrase[0]) && phrase[0] === "draw" && isAtom(phrase[1])) {
      const text = phrase[1].toString();
      const gridX = typeof(phrase[2]) === "number" ? phrase[2] : 0;
      const gridY = typeof(phrase[3]) === "number" ? phrase[3] : 0;

      splitter.splitGraphemes(text).forEach((c, i) => {
        context.fillText(c, pixelX(gridX + i), pixelY(gridY));
      });
    }
  });

  return canvas;
}

// hash improves array diffing:
//   https://github.com/benjamine/jsondiffpatch/blob/master/docs/arrays.md
const diffpatcher = jsondiffpatch.create({
  objectHash: function(obj, index) {
    return obj.hash || "$$index:" + index;;
  }
});

function updateStateLiveView(state, previousState, liveViewEl) {
  // see https://github.com/benjamine/jsondiffpatch/blob/master/docs/deltas.md
  const deltas = diffpatcher.diff(previousState, state) || {};

  liveViewEl.innerHTML = "";
  state.forEach((phrase, i) => {
    const el = phraseToElement(phrase);
    liveViewEl.appendChild(el);
    if (deltas[i]) {
      el.classList.add("added");
    }

    const underscoreDelta = deltas["_" + i];
    const isMove = underscoreDelta && underscoreDelta[2] === 3;
    if (underscoreDelta && !isMove) {
      const el = phraseToElement(previousState[i]);
      liveViewEl.appendChild(el);
      el.classList.add("removed");
    }
  });

  // show remainder of previous state, if previous state was longer than current state
  for (let i = state.length; i < previousState.length; i++) {
    const underscoreDelta = deltas["_" + i];
    const isMove = underscoreDelta && underscoreDelta[2] === 3;
    if (underscoreDelta && !isMove) {
      const el = phraseToElement(previousState[i]);
      liveViewEl.appendChild(el);
      el.classList.add("removed");
    }
  }
}

function phraseToElement(phraseTokens, depth = 0) {
  const el = document.createElement("div");
  el.setAttribute("data-depth", depth);
  el.className = "phrase";
  el.style.backgroundColor = colorFromSeed(depth + 1);

  if (isAtom(phraseTokens)) {
    el.appendChild(document.createTextNode(phraseTokens));
  } else {
    phraseTokens.forEach(subPhraseTokens => {
      el.appendChild(phraseToElement(subPhraseTokens, depth + 1));
    })
  }

  return el;
}

function isAtom(token) {
  return typeof(token) === "string" || typeof(token) === "number";
}

function isVariable(token) {
  if (typeof(token) !== "string") {
    return false;
  }
  for (let i = 0; i < token.length; i++) {
    const ch = token.charAt(i);
    if (!((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_' || ch === '\'')) {
      return false;
    }
  }
  return true;
}

export { LiveView };
