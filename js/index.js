import * as examples from "./examples.js";

import "minireset.css";
import "../css/style.css";
import { create } from "./playground.js";

const playgroundEl = document.getElementById("playground");

const url = new URL(window.location.href);
const gist = url.searchParams.get("gist");
const example = url.searchParams.get("example");

if (gist) {
  window.playground = create(playgroundEl);
  const gistSplit = gist.split("/");
  fetch("https://api.github.com/gists/" + gistSplit[gistSplit.length - 1])
    .then(response => response.json())
    .then(json => {
      const files = json.files;
      for (const [_, file] of Object.entries(files)) {
        window.playground.script = file.content;
        break;
      }
    })
} else if (example) {
  window.playground = create(playgroundEl, examples[example]);
} else {
  window.playground = create(playgroundEl);
}
