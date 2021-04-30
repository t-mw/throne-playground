import * as monaco from "monaco-editor";

export function create(element, initialValue) {
  monaco.languages.register({ id: "throne" });
  monaco.languages.setMonarchTokensProvider("throne", {
    defaultToken: "invalid",
    tokenizer: {
      root: [
        [/cell*/, "first-atom"]
      ],
      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
      ],
      comment: [
        [/[^\/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[\/*]/, "comment"]
      ]
    }
  });
  monaco.languages.setMonarchTokensProvider("throne", {
    tokenizer: {
      root: [
        // identifiers
        [/[a-zA-Z_\-$][\w$]*/, { cases: { "@default": "identifier" } }],

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
  monaco.editor.defineTheme("throne-theme", { base: "vs", inherit: true, rules: [] });

  const editor = monaco.editor.create(element, {
    value: initialValue,
    language: "throne",
    theme: "throne-theme",
    minimap: {
      enabled: false
    },
    scrollBeyondLastLine: false
  });

  return editor;
}

export function setError(e, editor) {
  if (e != null && "throne_span" in e) {
    const { line_start, line_end, col_start, col_end } = e.throne_span;
    const markers = [{
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: line_start,
      startColumn: col_start,
      endLineNumber: line_end,
      endColumn: col_end,
      message: e.message
    }];
    monaco.editor.setModelMarkers(editor.getModel(), "", markers);
  } else {
    monaco.editor.setModelMarkers(editor.getModel(), "", []);
  }
}
