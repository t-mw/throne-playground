import { hashCode } from "./utility";

import * as monaco from "monaco-editor";

// match beginning of phrase: (?:[.=]|^)
// match prefixes: (?:[#$!^?]|<<)?
// match atom: ([a-z][a-zA-Z\-_]*)
const atomRegex = /(?:[.=]|^)\s*(?:[#$!^?]|<<)?\s*([a-z][a-zA-Z\-_]*)/gm;

export function create(element, initialValue) {
  monaco.languages.register({ id: "throne" });
  monaco.languages.setMonarchTokensProvider("throne", {
    tokenizer: {
      root: [
        // identifiers
        [/[a-zA-Z][a-zA-Z0-9_\-\']*/, "identifier"],

        // whitespace
        { include: "@whitespace" },

        // delimiters and operators
        [/[{}()\[\]]/, "@brackets"],

        // numbers
        [/\d+/, "number"],

        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid" ],  // non-teminated string
        [/"/,  { token: "string.quote", bracket: "@open", next: "@string" } ],
      ],

      comment: [
        [/[^\/*]+/, "comment" ],
        [/\/\*/,    "comment", "@push" ],    // nested comment
        ["\\*/",    "comment", "@pop"  ],
        [/[\/*]/,   "comment" ]
      ],

      string: [
        [/[^\\"]+/,  "string"],
        [/\\./,      "string.escape.invalid"],
        [/"/,        { token: "string.quote", bracket: "@close", next: "@pop" } ]
      ],

      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\*/,       "comment", "@comment" ],
        [/\/\/.*$/,    "comment"],
      ],
    },
  });
  monaco.languages.setLanguageConfiguration("throne", {
    brackets: [
      ["{", "}"],
      ["(", ")"]
    ],
    comments: {
      blockComment: ["/*", "*/"],
      lineComment: "//"
    }
  });

  const monacoEditor = monaco.editor.create(element, {
    value: initialValue,
    language: "throne",
    minimap: {
      enabled: false
    },
    scrollBeyondLastLine: false
  });

  const editor = { monacoEditor, decorations: [] };
  updateDecorations(editor);

  return editor;
}

export function updateDecorations(editor) {
  const content = editor.monacoEditor.getValue();

  const atoms = [];
  const decorations = [];
  for (const match of content.matchAll(atomRegex)) {
    const atom = match[1];
    const charIdx = match.index + match[0].length - atom.length;
    atoms.push({ charIdx, atom });
  }

  let colNo = 1;
  let lineNo = 1;
  for (let i = 0, atomIdx = 0; i < content.length && atomIdx < atoms.length; i++) {
    const ch = content[i];
    if (ch === "\n") {
      colNo = 1;
      lineNo += 1;
      continue;
    }

    if (atoms[atomIdx].charIdx === i) {
      const atom = atoms[atomIdx].atom;
      const decorationIdx = 1 + (hashCode(atom) % 9);
      decorations.push({
        range: new monaco.Range(lineNo, colNo, lineNo, colNo + atom.length),
        options: { inlineClassName: "atom-" + decorationIdx.toString() }
      });
      atomIdx += 1;
    }
    colNo += 1;
  }

  editor.decorations = editor.monacoEditor.deltaDecorations(editor.decorations, decorations);
}

export function setError(e, editor) {
  if (e == null) {
    monaco.editor.setModelMarkers(editor.monacoEditor.getModel(), "", []);
  } else if ("throne_span" in e) {
    const { line_start, line_end, col_start, col_end } = e.throne_span;
    const markers = [{
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: line_start,
      startColumn: col_start,
      endLineNumber: line_end,
      endColumn: col_end,
      message: e.message
    }];
    monaco.editor.setModelMarkers(editor.monacoEditor.getModel(), "", markers);
  } else {
    throw e;
  }
}
