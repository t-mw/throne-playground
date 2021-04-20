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
