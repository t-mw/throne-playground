import * as examples from "./examples.js";

import "minireset.css";
import "../css/style.css";
import { create } from "./playground.js";

const playgroundEl = document.getElementById("playground");

const url = new URL(window.location.href);
const gist = url.searchParams.get("gist");
const example = url.searchParams.get("example");

if (gist) {
  const playground = create(playgroundEl);
  fetch("https://api.github.com/gists/" + gist)
    .then(response => response.json())
    .then(json => {
      const files = json.files;
      for (const [_, file] of Object.entries(files)) {
        playground.script = file.content;
        break;
      }
    })
} else if (example) {
  create(playgroundEl, examples[example]);
} else {
  create(playgroundEl);
}
