import * as examples from "./examples.js";

import "minireset.css";
import "../css/style.css";
import { create } from "./playground.js";

create(document.getElementById("playground"), {
  content: examples.blocks,
  enableUpdate: true,
  enableVisualView: true,
  enableClearOnUpdate: true
});
