# throne-playground

A web-based editor for the [Throne](https://www.github.com/t-mw/throne) programming language, hosted at https://t-mw.github.io/throne-playground/.

## Usage

1. Press the play button in the bottom right of the page to begin executing a script.
1. Hover over any button to view a tooltip describing what the button does.
1. To learn how to read and write the language, read the [Throne](https://www.github.com/t-mw/throne#readme) documentation and view the examples below.

## Examples

- [Hello World](https://t-mw.github.io/throne-playground/?gist=t-mw/82fc3037ac96890181162f558074ae6d)
- [Family](https://t-mw.github.io/throne-playground/?gist=t-mw/a4af79a60704910e44a5ab15476e082e) - demonstrates how variables are matched.
- [Guessing game](https://t-mw.github.io/throne-playground/?gist=t-mw/c8018c20af9dee55a8de76338ff97467) - introduces [predicates](https://github.com/t-mw/throne#predicates) and the brace [construct](https://github.com/t-mw/throne#constructs).
- [Draw](https://t-mw.github.io/throne-playground/?gist=t-mw/d829ba2ec22538191418674b301f19bd) - demonstrates the drawing and update loop features of the playground.
- [Game of Life](https://t-mw.github.io/throne-playground/?gist=t-mw/aa714f7f160ac92d346edbc2f0230045) - an implementation of Conway's Game of Life.
- [Blocks](https://t-mw.github.io/throne-playground/?gist=t-mw/81320c91f5fd128e397b247d1296700e) - a simple tile matching game.

## Debugging

Although script errors are marked in the editor when they occur, the context for your script can also be inspected in more detail through `window.playground.context`.
For example, to print a log of the current state and compiled rules execute `playground.context.print()` in the browser console.

## Building

1. Clone [Throne](https://www.github.com/t-mw/throne) to a directory.
1. Follow the steps to [build Throne for WebAssembly](https://github.com/t-mw/throne#build-for-webassembly).
1. Clone this repository (`throne-playground`) to the same directory as `throne`.
1. Run `npm install && npm run build` in the `throne-playground` directory.
   - Alternatively run `npm install && npm run start` to launch a local web server for testing.
1. The build output will appear in `throne-playground/dist`.
