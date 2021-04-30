import "minireset.css";
import * as jsondiffpatch from "jsondiffpatch";
import * as GraphemeSplitter from "grapheme-splitter";
import { EmojiButton } from "@joeattardi/emoji-button";
import "../css/style.css";

import { create as createEditor, setError as setEditorError } from "./editor.js";
import * as examples from "./examples.js";

const updateDuration = 500; // ms

const editorEl = document.getElementById("editor");
const liveViewEl = document.getElementById("live-view");
const playButtonEl = document.querySelector("[data-play-button]");
const pauseButtonEl = document.querySelector("[data-pause-button]");
const resetButtonEl = document.querySelector("[data-reset-button]");
const updateCheckboxEl = document.querySelector("[data-update-checkbox]");
const visualCheckboxEl = document.querySelector("[data-visual-checkbox]");
const controlsEl = document.querySelector("[data-control-state]");

const editor = createEditor(editorEl, examples.gameOfLife);
window.addEventListener("resize", () => editor.layout());

const emojiPicker = new EmojiButton({
  position: "bottom-end"
});
const emojiButtonEl = document.querySelector("[data-emoji-button]");

emojiPicker.on("emoji", emojiSelection => {
  const selection = editor.getSelection();
  const id = { major: 1, minor: 1 };
  const text = emojiSelection.emoji;
  const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
  editor.executeEdits("emoji-picker", [op]);
});

emojiButtonEl.addEventListener("click", () => {
  emojiButtonEl.classList.add("active");
  emojiPicker.togglePicker(emojiButtonEl);
});

emojiPicker.on("hidden", () => {
  emojiButtonEl.classList.remove("active");
});

import("../../throne-rs/pkg/index.js")
  .then(module => {
    module.init();

    let context = null;
    let previousState = [];
    const updateLiveViewWithDiff = (context, showVisualLiveView) => {
      if (context == null) {
        return;
      }

      const state = context.get_state();
      if (showVisualLiveView) {
        updateVisualLiveView(state);
        return;
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

      updateVisualLiveView(state);
      updateStateLiveView(state, previousState);
      previousState = state;
    };

    let showVisualLiveView = visualCheckboxEl.checked;
    visualCheckboxEl.addEventListener("change", e => {
      showVisualLiveView = visualCheckboxEl.checked;
      updateLiveViewWithDiff(context, showVisualLiveView);
    });

    window.addEventListener("resize", () => {
      if (showVisualLiveView) {
        updateLiveViewWithDiff(context, showVisualLiveView);
      }
    });

    const setContextFromEditor = () => {
      setEditorError(null, editor);
      setControlState("ready");
      try {
        context = module.Context.from_text(editor.getValue());
        window.context = context;
      } catch (e) {
        context = null;
        setEditorError(e, editor);
        setControlState("error");
      }

      previousState = [];
      updateLiveViewWithDiff(context, showVisualLiveView);
    };
    setContextFromEditor();

    editor.onDidChangeModelContent(() => {
      setContextFromEditor();
    });

    let requestAnimationFrameId = null;
    let updateContinuously = updateCheckboxEl.checked;
    updateCheckboxEl.addEventListener("change", e => {
      updateContinuously = updateCheckboxEl.checked;
    });

    playButtonEl.addEventListener("click", e => {
      if (context == null) {
        return;
      }

      if (updateContinuously) {
        setControlState("playing");

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
            frameTimer += updateDuration;
            context.append_state("#update")
            context.update();
            updateLiveViewWithDiff(context, showVisualLiveView);
          }

          if (updateContinuously) {
            requestAnimationFrameId = window.requestAnimationFrame(step);
          } else {
            setControlState("finished");
          }
        };

        requestAnimationFrameId = window.requestAnimationFrame(step);
      } else {
        context.update();
        updateLiveViewWithDiff(context, showVisualLiveView);
        setControlState("finished");
      }
    });

    pauseButtonEl.addEventListener("click", e => {
      window.cancelAnimationFrame(requestAnimationFrameId);
      setControlState("paused");
    });

    resetButtonEl.addEventListener("click", e => {
      window.cancelAnimationFrame(requestAnimationFrameId);
      setContextFromEditor();
    });
  })
  .catch(console.error);

function setControlState(state) {
  controlsEl.setAttribute("data-control-state", state);
}

const splitter = new GraphemeSplitter();
function updateVisualLiveView(state) {
  let canvas = liveViewEl.querySelector("canvas");
  if (canvas == null) {
    liveViewEl.innerHTML = "";
    canvas = document.createElement("canvas");
    liveViewEl.appendChild(canvas);
  }

  const liveViewSize = Math.min(liveViewEl.clientWidth, liveViewEl.clientHeight);
  const gridSize = 20;

  // constrain cell size to integers divisible by 2
  let gridCellSize = Math.floor(liveViewSize / gridSize);
  if (gridCellSize % 2 === 1) {
    gridCellSize = Math.max(gridCellSize - 1, 0);
  }

  const canvasSize = gridCellSize * gridSize;
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const pixelX = (gridX) => gridCellSize / 2 + gridX * gridCellSize;
  const pixelY = (gridY) => gridY * gridCellSize + Math.floor(gridCellSize * 28 / 32);

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgb(200,200,200)";
  context.setLineDash([5, 3]);
  context.lineWidth = 1;
  context.textAlign = "center";

  context.beginPath();
  for (let x = 0; x <= gridSize; x++) {
    context.moveTo(x * gridCellSize, 0);
    context.lineTo(x * gridCellSize, gridCellSize * gridSize);
  }
  context.stroke();

  context.beginPath();
  for (let y = 0; y <= gridSize; y++) {
    context.moveTo(0, y * gridCellSize);
    context.lineTo(gridCellSize * gridSize, y * gridCellSize);
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
}

// hash improves array diffing:
//   https://github.com/benjamine/jsondiffpatch/blob/master/docs/arrays.md
const diffpatcher = jsondiffpatch.create({
  objectHash: function(obj, index) {
    return obj.hash || "$$index:" + index;;
  }
});

function updateStateLiveView(state, previousState) {
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

function isAtom(phrase) {
  return typeof(phrase) === "string" || typeof(phrase) === "number";
}

function colorFromSeed(seed) {
  const color = Math.floor((Math.abs(Math.sin(seed) * 16777215)) % 16777215);

  let r = (color >> 16) & 0xff;
  let g = (color >> 8) & 0xff;
  let b = color & 0xff;

  // mix with white
  r = Math.floor((r + 0xff) / 2);
  g = Math.floor((g + 0xff) / 2);
  b = Math.floor((b + 0xff) / 2);

  return "rgb(" + r.toString() + "," + g.toString() + "," + b.toString() + ")";
}
