import {
  create as createEditor,
  updateDecorations as updateEditorDecorations,
  setError as setEditorError
} from "./editor";
import { LiveView } from "./live-view";
import { SettingsWindow } from "./settings";
import { optionsFromShareFormat, optionsToShareFormat } from "./share";
import { debounce } from "./utility";
import playgroundTemplate from "../html/playground.html";
import "../css/playground.scss";

import { EmojiButton } from "@joeattardi/emoji-button";

const DEFAULT_UPDATE_FREQUENCY = 4; // updates per second
const DEFAULT_GRID_SIZE = 20;

export function create(rootEl, options = {}) {
  let script = "";
  let enableUpdate = false;
  let enableVisualMode = false;
  let enableClearOnUpdate = false;
  let updateFrequency = DEFAULT_UPDATE_FREQUENCY;
  let gridWidth = DEFAULT_GRID_SIZE;
  let gridHeight = DEFAULT_GRID_SIZE;

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

  let editor = null;
  let context = null;
  const liveView = new LiveView(liveViewEl);

  const getOptions = () => ({
    script,
    enableUpdate,
    enableVisualMode,
    enableClearOnUpdate,
    updateFrequency,
    gridWidth,
    gridHeight
  });

  const setOptions = options => {
    options = optionsFromShareFormat(options);
    if (typeof options.script === "string") {
      script = options.script;
    }
    if (options.enableUpdate != null) {
      enableUpdate = !!options.enableUpdate;
    }
    if (options.enableVisualMode != null) {
      enableVisualMode = !!options.enableVisualMode;
    }
    if (options.enableClearOnUpdate != null) {
      enableClearOnUpdate = !!options.enableClearOnUpdate;
    }
    if (typeof options.updateFrequency === "number") {
      updateFrequency = options.updateFrequency;
    }
    if (typeof options.gridWidth === "number") {
      gridWidth = options.gridWidth;
    }
    if (typeof options.gridHeight === "number") {
      gridHeight = options.gridHeight;
    }
    if (editor != null) {
      // setting editor value will trigger live view update
      editor.monacoEditor.setValue(script);
    }
  };

  setOptions(options);

  editor = createEditor(editorEl, script);
  window.addEventListener("resize", debounce(() => editor.monacoEditor.layout(), 250));

  const settingsWindow = new SettingsWindow(playgroundEl, {
    enableUpdate,
    enableClearOnUpdate,
    updateFrequency,
    gridWidth,
    gridHeight,
    shareContent: () => optionsToShareFormat(getOptions)
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
    setOptions({
      enableUpdate: settingsWindow.enableUpdate,
      enableClearOnUpdate: settingsWindow.enableClearOnUpdate,
      updateFrequency: settingsWindow.updateFrequency,
      gridWidth: settingsWindow.gridWidth,
      gridHeight: settingsWindow.gridHeight,
    });
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
    if (enableVisualMode) {
      setTimeout(() => liveView.focus());
    }
    liveView.update(context, getOptions());
  });

  window.addEventListener("resize", () => {
    if (enableVisualMode) {
      liveView.update(context, getOptions());
    }
  });

  import("../../throne-rs/pkg/index.js").then(module => {
    module.init();

    let requestAnimationFrameId = null;
    const reloadContext = () => {
      window.cancelAnimationFrame(requestAnimationFrameId);
      setEditorError(null, editor);
      setControlState("ready", controlEls);
      try {
        context = module.Context.from_text(script);
      } catch (e) {
        context = null;
        setEditorError(e, editor);
        setControlState("error", controlEls);
      }
      liveView.reset(context, getOptions());
    };

    reloadContext();

    const updateEditorDecorationsDebounced = debounce(updateEditorDecorations, 1000);
    editor.monacoEditor.onDidChangeModelContent(() => {
      script = editor.monacoEditor.getValue();
      updateEditorDecorationsDebounced(editor);
      reloadContext();
    });

    controlEls.play.addEventListener("click", e => {
      if (context == null) {
        return;
      }

      liveView.focus();

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
            if (!updateContext(context, liveView.inputState, options, editor)) {
              return;
            }
            liveView.update(context, getOptions());
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
        if (!updateContext(context, liveView.inputState,  options, editor)) {
          return;
        }
        liveView.update(context, getOptions());
        setControlState("finished", controlEls);
      }
    });

    controlEls.pause.addEventListener("click", e => {
      window.cancelAnimationFrame(requestAnimationFrameId);
      setControlState("paused", controlEls);
    });

    controlEls.reset.addEventListener("click", e => {
      reloadContext();
    });
  }).catch(console.error);

  return {
    get options() {
      return getOptions();
    },
    set options(v) {
      setOptions(v);
    },
    get script() {
      return getOptions().script;
    },
    set script(v) {
      setOptions({ script: v });
    },
    get context() {
      return context;
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
