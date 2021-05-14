const EMBEDDED_OPTIONS_KEY = "throne-playground-script";

export function optionsFromShareFormat(options) {
  if (typeof options.script !== "string") {
    return options;
  }

  const firstLine = options.script.split("\n", 1)[0];

  if (firstLine.includes(EMBEDDED_OPTIONS_KEY)) {
    const optionsLine = firstLine.replace("//", "");
    const embeddedOptions = JSON.parse(optionsLine);

    // mix options, but input options take precedence over embedded options
    options = Object.assign(embeddedOptions, options);

    // strip first line
    options.script = options.script.substring(options.script.indexOf("\n") + 1).trimStart();
  }

  return options;
}

export function optionsToShareFormat(getOptions) {
  const embeddedOptions = getOptions();
  embeddedOptions[EMBEDDED_OPTIONS_KEY] = "0.1.0";

  const script = embeddedOptions.script;
  delete embeddedOptions.script;

  return "// " + JSON.stringify(embeddedOptions) + "\n\n" + script;
}
