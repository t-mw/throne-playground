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

monaco.languages.register({ id: "throne" });
const editor = monaco.editor.create(document.getElementById("editor"), {
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
    const context = module.Context.from_text(text);
    context.update();
    context.print();

    console.log(context.get_state());
  })
  .catch(console.error);
