# throne-playground

A web-based editor for the [throne](https://www.github.com/t-mw/throne) programming language, hosted at https://t-mw.github.io/throne-playground/.

## Examples

- [Family](https://t-mw.github.io/throne-playground/?gist=t-mw/a4af79a60704910e44a5ab15476e082e)
- [Guessing game](https://t-mw.github.io/throne-playground/?gist=t-mw/c8018c20af9dee55a8de76338ff97467)
- [Draw](https://t-mw.github.io/throne-playground/?gist=t-mw/d829ba2ec22538191418674b301f19bd)
- [Game of Life](https://t-mw.github.io/throne-playground/?gist=t-mw/aa714f7f160ac92d346edbc2f0230045)
- [Blocks](https://t-mw.github.io/throne-playground/?gist=t-mw/81320c91f5fd128e397b247d1296700e)

## Debugging

Although script errors are marked in the editor when they occur, the throne context for your script can also be inspected in more detail through `window.playground.context`.
For example, to print a log of the current state and compiled rules execute `playground.context.print()` in the browser console.

## Building

1. Clone [throne](https://www.github.com/t-mw/throne) to a directory.
1. Follow the steps to [build throne for Wasm](https://github.com/t-mw/throne#build-for-wasm).
1. Clone this repository (`throne-playground`) to the same directory as `throne`.
1. Run `npm install && npm run build` in the `throne-playground` directory.
   - Alternatively run `npm install && npm run start` to launch a local web server for testing.
1. The build output will appear in `throne-playground/dist`.
