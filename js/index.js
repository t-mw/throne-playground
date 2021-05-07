import * as examples from "./examples.js";

import "minireset.css";
import "../css/style.css";
import { create } from "./playground.js";

create(document.getElementById("playground"), {
  content: examples.blocks,
  enableUpdate: true,
  enableVisualMode: true,
  enableClearOnUpdate: true,
  gridWidth: 10,
  gridHeight: 20
});
