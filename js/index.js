import "minireset.css";
import * as monaco from "monaco-editor";
import * as jsondiffpatch from "jsondiffpatch";
import "../css/style.css";

const text = `\
at 0 0 wood . at 0 1 wood . at 1 1 wood . at 0 1 fire . #update
#update: {
  at X Y wood . at X Y fire = at X Y fire
  () = #spread
}
#spread . $at X Y fire . + X 1 X' . + Y' 1 Y = at X' Y fire . at X Y' fire
`;

const updateFreq = 500; // ms

const editorEl = document.getElementById("editor");
const playButtonEl = document.querySelector("[data-play-button]");
const resetButtonEl = document.querySelector("[data-reset-button]");
const updateCheckboxEl = document.querySelector("[data-update-checkbox]");

monaco.languages.register({ id: "throne" });
const editor = monaco.editor.create(editorEl, {
  value: text,
  language: "throne",
  minimap: {
    enabled: false
  },
  scrollBeyondLastLine: false
});

window.addEventListener("resize", () => editor.layout());

import("../../throne-rs/pkg/index.js")
  .then(module => {
    module.init();

    let context = null;
    let previousState = [];
    const updateLiveViewWithDiff = (context) => {
      if (context == null) {
        return;
      }

      const state = context.get_state();
      const hashes = context.get_state_hashes();
      state.forEach((phrase, i) => {
        phrase.hash = hashes[i];
      });

      const compareTokensFn = (a, b) => {
        if (a.hash == b.hash) {
          return 0;
        }

        if (isAtom(a) != isAtom(b)) {
          // sort atoms before phrases
          return isAtom(a) ? -1 : 1;
        } else if (isAtom(a)) {
          // both are atoms
          if (a == b) {
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
          return a.length - b.length;
        }
      };

      state.sort((a, b) => {
        compareTokensFn(a, b);
      });

      updateLiveView(state, previousState);
      previousState = state;
    };

    const setContextFromEditor = () => {
      context = module.Context.from_text(editor.getValue());
      updateLiveViewWithDiff(context);
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
      if (updateContinuously) {
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
            frameTimer += updateFreq;
            context.update();
            updateLiveViewWithDiff(context);
          }

          if (updateContinuously) {
            requestAnimationFrameId = window.requestAnimationFrame(step);
          }
        };

        requestAnimationFrameId = window.requestAnimationFrame(step);
      } else {
        context.update();
        updateLiveViewWithDiff(context);
      }
    });

    resetButtonEl.addEventListener("click", e => {
      window.cancelAnimationFrame(requestAnimationFrameId);
      setContextFromEditor();
    });
  })
  .catch(console.error);

// hash improves array diffing:
//   https://github.com/benjamine/jsondiffpatch/blob/master/docs/arrays.md
var diffpatcher = jsondiffpatch.create({
  objectHash: function(obj, index) {
    return obj.hash || '$$index:' + index;;
  }
});

function updateLiveView(state, previousState) {
  // see https://github.com/benjamine/jsondiffpatch/blob/master/docs/deltas.md
  const deltas = diffpatcher.diff(previousState, state) || {};

  const liveViewEl = document.getElementById("live-view");
  liveViewEl.innerHTML = "";
  state.forEach((phrase, i) => {
    const el = phraseToElement(phrase);
    liveViewEl.appendChild(el);
    if (deltas[i]) {
      el.classList.add("added");
    }

    const underscoreDelta = deltas["_" + i];
    const isMove = underscoreDelta && underscoreDelta[2] == 3;
    if (underscoreDelta && !isMove) {
      const el = phraseToElement(previousState[i]);
      liveViewEl.appendChild(el);
      el.classList.add("removed");
      setTimeout(() => {
        liveViewEl.removeChild(el);
      }, 1000);
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
  return typeof(phrase) == "string" || typeof(phrase) == "number";
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
