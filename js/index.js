import "minireset.css";
import * as monaco from "monaco-editor";
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

    let context = module.Context.from_text(text);
    updateLiveView(context);

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
            updateLiveView(context);
          }

          if (updateContinuously) {
            requestAnimationFrameId = window.requestAnimationFrame(step);
          }
        };

        requestAnimationFrameId = window.requestAnimationFrame(step);
      } else {
        context.update();
        updateLiveView(context);
      }
    });

    resetButtonEl.addEventListener("click", e => {
      window.cancelAnimationFrame(requestAnimationFrameId);
      context = module.Context.from_text(text);
      updateLiveView(context);
    });
  })
  .catch(console.error);

function updateLiveView(context) {
  const liveViewEl = document.getElementById("live-view");
  liveViewEl.innerHTML = "";
  context.get_state().forEach(phrase => {
    liveViewEl.appendChild(phraseToElement(phrase));
  });
}

function phraseToElement(phrase, depth = 0) {
  const el = document.createElement("div");
  el.setAttribute("data-depth", depth);
  el.className = "phrase";
  el.style.backgroundColor = "#" + colorFromSeed(depth + 1);

  if (typeof(phrase) == "string" || typeof(phrase) == "number") {
    el.appendChild(document.createTextNode(phrase));
  } else {
    phrase.forEach(subPhrase => {
      el.appendChild(phraseToElement(subPhrase, depth + 1));
    })
  }

  return el;
}

function colorFromSeed(seed) {
  return Math.floor((Math.abs(Math.sin(seed) * 16777215)) % 16777215).toString(16);
}
