import {
  create as createEditor,
  updateDecorations as updateEditorDecorations,
  setError as setEditorError
} from "./editor.js";
import { SettingsWindow } from "./settings";
import { colorFromSeed, debounce } from "./utility.js";
import playgroundTemplate from "../html/playground.html";
import "../css/playground.scss";

import * as jsondiffpatch from "jsondiffpatch";
import * as GraphemeSplitter from "grapheme-splitter";
import { EmojiButton } from "@joeattardi/emoji-button";

const DEFAULT_UPDATE_FREQUENCY = 4; // updates per second
const DEFAULT_GRID_SIZE = 20;

export function create(rootEl, options = {}) {
  let {
    script,
    enableUpdate,
    enableVisualMode,
    enableClearOnUpdate,
    updateFrequency,
    gridWidth,
    gridHeight
  } = options;

  if (typeof script !== "string") {
    script = "";
  }

  enableUpdate = !!enableUpdate;
  enableVisualMode = !!enableVisualMode;
  enableClearOnUpdate = !!enableClearOnUpdate;

  if (typeof updateFrequency !== "number") {
    updateFrequency = DEFAULT_UPDATE_FREQUENCY;
  }

  if (typeof gridWidth !== "number") {
    gridWidth = DEFAULT_GRID_SIZE;
  }

  if (typeof gridHeight !== "number") {
    gridHeight = DEFAULT_GRID_SIZE;
  }

  const playgroundEl = document.createElement("div");
  playgroundEl.innerHTML = playgroundTemplate;
  playgroundEl.classList.add("throne-playground");

  rootEl.appendChild(playgroundEl);

  const editorEl = rootEl.querySelector(".editor");
  const liveViewEl = rootEl.querySelector(".live-view");
  const visualCheckboxEl = rootEl.querySelector("[data-visual-checkbox]");
  const controlEls = {
    root: rootEl.querySelector("[data-control-state]"),
    play: rootEl.querySelector("[data-play-button]"),
    pause: rootEl.querySelector("[data-pause-button]"),
    reset: rootEl.querySelector("[data-reset-button]")
  };

  const editor = createEditor(editorEl, script);
  window.addEventListener("resize", debounce(() => editor.monacoEditor.layout(), 250));

  const settingsWindow = new SettingsWindow(playgroundEl, {
    enableUpdate,
    enableClearOnUpdate,
    updateFrequency,
    gridWidth,
    gridHeight
  });

  const settingsButtonEl = rootEl.querySelector("[data-settings-button]");
  settingsButtonEl.addEventListener("click", () => {
    settingsButtonEl.classList.add("active");
    settingsWindow.toggle(settingsButtonEl);
  });

  settingsWindow.on("hidden", () => {
    settingsButtonEl.classList.remove("active");
  });

  settingsWindow.on("change", () => {
    enableUpdate = settingsWindow.enableUpdate;
    enableClearOnUpdate = settingsWindow.enableClearOnUpdate;
    updateFrequency = settingsWindow.updateFrequency;
    gridWidth = settingsWindow.gridWidth;
    gridHeight = settingsWindow.gridHeight;

    updateLiveViewWithDiff(context, enableVisualMode);
  });

  const emojiPicker = new EmojiButton({
    position: "bottom-end",
    autoHide: false,
    showAnimation: false
  });
  const emojiButtonEl = rootEl.querySelector("[data-emoji-button]");

  emojiPicker.on("emoji", emojiSelection => {
    const selection = editor.monacoEditor.getSelection();
    const id = { major: 1, minor: 1 };
    const text = emojiSelection.emoji;
    const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
    editor.monacoEditor.executeEdits("emoji-picker", [op]);
  });

  emojiButtonEl.addEventListener("click", () => {
    emojiButtonEl.classList.add("active");
    emojiPicker.togglePicker(emojiButtonEl);
  });

  emojiPicker.on("hidden", () => {
    emojiButtonEl.classList.remove("active");
  });

  visualCheckboxEl.checked = enableVisualMode;
  visualCheckboxEl.addEventListener("change", e => {
    enableVisualMode = visualCheckboxEl.checked;
    updateLiveViewWithDiff(context, enableVisualMode);
  });

  window.addEventListener("resize", () => {
    if (enableVisualMode) {
      updateLiveViewWithDiff(context, enableVisualMode);
    }
  });

  let context = null;
  let previousState = [];

  let canvas = null;
  const inputState = {
    keysDown: {},
    keysPressed: {},
    isMouseDown: false,
    wasMousePressed: false,
    mouseGridPos: [-1, -1]
  };

  const updateLiveViewWithDiff = (context, enableVisualMode) => {
    if (context == null) {
      return;
    }

    const state = context.get_state();
    if (enableVisualMode) {
      liveViewEl.classList.add("visual");
      canvas = updateVisualLiveView(state, inputState, liveViewEl, gridWidth, gridHeight);
      return;
    } else {
      liveViewEl.classList.remove("visual");
    }

    const hashes = context.get_state_hashes();
    state.forEach((phrase, i) => {
      phrase.hash = hashes[i];
    });

    const compareTokensFn = (a, b) => {
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
          const result = compareTokensFn(a[i], b[i]);
          if (result != 0) {
            return result;
          }
        }

        // phrases share common prefix
        return a.length < b.length ? -1 : 1;
      }
    };

    state.sort(compareTokensFn);

    updateStateLiveView(state, previousState, liveViewEl);
    previousState = state;
  };

  import("../../throne-rs/pkg/index.js")
    .then(module => {
      module.init();

      let requestAnimationFrameId = null;
      const setContextFromEditor = () => {
        window.cancelAnimationFrame(requestAnimationFrameId);
        setEditorError(null, editor);
        setControlState("ready", controlEls);
        try {
          context = module.Context.from_text(editor.monacoEditor.getValue());
          window.context = context;
        } catch (e) {
          context = null;
          setEditorError(e, editor);
          setControlState("error", controlEls);
        }

        previousState = [];
        updateLiveViewWithDiff(context, enableVisualMode);
      };

      setContextFromEditor();

      const updateEditorDecorationsDebounced = debounce(updateEditorDecorations, 1000);
      editor.monacoEditor.onDidChangeModelContent(() => {
        updateEditorDecorationsDebounced(editor);
        setContextFromEditor();
      });

      controlEls.play.addEventListener("click", e => {
        if (context == null) {
          return;
        }

        if (canvas != null) {
          if (document.activeElement !== canvas) {
            canvas.focus();
          }
        }

        if (enableUpdate) {
          setControlState("playing", controlEls);

          let prevTimestamp = null;
          let frameTimer = 0;

          const step = (timestamp) => {
            if (prevTimestamp == null) {
              prevTimestamp = timestamp;
            }

            const dt = timestamp - prevTimestamp;
            prevTimestamp = timestamp;

            frameTimer -= dt;

            if (frameTimer < 0) {
              frameTimer += 1000 / updateFrequency;
              const options = { enableClearOnUpdate, appendUpdate: true };
              if (!updateContext(context, inputState, options, editor)) {
                return;
              }
              updateLiveViewWithDiff(context, enableVisualMode);
            }

            if (enableUpdate) {
              requestAnimationFrameId = window.requestAnimationFrame(step);
            } else {
              setControlState("finished", controlEls);
            }
          };

          requestAnimationFrameId = window.requestAnimationFrame(step);
        } else {
          const options = { enableClearOnUpdate: false, appendUpdate: false };
          if (!updateContext(context, inputState,  options, editor)) {
            return;
          }
          updateLiveViewWithDiff(context, enableVisualMode);
          setControlState("finished", controlEls);
        }
      });

      controlEls.pause.addEventListener("click", e => {
        window.cancelAnimationFrame(requestAnimationFrameId);
        setControlState("paused", controlEls);
      });

      controlEls.reset.addEventListener("click", e => {
        setContextFromEditor();
      });
    })
    .catch(console.error);

  return {
    get script() {
      return editor.monacoEditor.getValue();
    },
    set script(v) {
      editor.monacoEditor.setValue(v);
    }
  };
}

function updateContext(context, inputState, options, editor) {
  const { enableClearOnUpdate, appendUpdate } = options;
  setEditorError(null, editor);
  if (enableClearOnUpdate) {
    context.remove_state_by_first_atom("draw");
    context.remove_state_by_first_atom("#update");
  }
  if (appendUpdate) {
    context.append_state("#update")
  }
  try {
    const keyToCode = (key) => {
      switch (key) {
      case "left": return 37;
      case "up": return 38;
      case "right": return 39;
      case "down": return 40;
      default: return key;
      }
    };

    context.update(side => {
      switch (side[0]) {
      case "key-down": return inputState.keysDown[keyToCode(side[1])] === true ? side : null;
      case "key-up": return inputState.keysDown[keyToCode(side[1])] === true ? null : side;
      case "key-pressed": return inputState.keysPressed[keyToCode(side[1])] === true ? side : null;
      case "mouse-down": return inputState.isMouseDown;
      case "mouse-up": return !inputState.isMouseDown;
      case "mouse-pressed": return inputState.wasMousePressed;
      case "mouse-position": {
        const gridX = inputState.mouseGridPos[0];
        const gridY = inputState.mouseGridPos[1];
        if (gridX === -1 || gridY === -1) {
          return null;
        }
        if (side.length != 3) {
          return null;
        }
        side[1] = gridX;
        side[2] = gridY;
        return side;
      }
      }
    });

    inputState.keysPressed = {};
    inputState.wasMousePressed = false;

    return true;
  } catch (e) {
    setEditorError(e, editor);
    setControlState("error", controlEls);
    return false;
  }
}

function setControlState(state, controlEls) {
  const disablePlayback = state === "error";
  controlEls.play.disabled = disablePlayback;
  controlEls.pause.disabled = disablePlayback;
  controlEls.reset.disabled = disablePlayback;
  controlEls.root.setAttribute("data-control-state", state);
}

const splitter = new GraphemeSplitter();
function updateVisualLiveView(state, inputState, liveViewEl, gridWidth, gridHeight) {
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

  context.font = gridCellSize.toString() + "px Droid Sans Mono";

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
