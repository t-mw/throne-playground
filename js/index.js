import * as examples from "./examples.js";

import "minireset.css";
import "../css/style.css";
import { create } from "./playground.js";

create(document.getElementById("playground"), examples.blocks);
