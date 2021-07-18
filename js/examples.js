import helloWorldScript from "../examples/hello-world.throne";
import familyScript from "../examples/family.throne";
import guessingGameScript from "../examples/guessing-game.throne";
import drawScript from "../examples/draw.throne";
import gameOfLifeScript from "../examples/game-of-life.throne";
import blocksScript from "../examples/blocks.throne";

const helloWorld = {
  script: helloWorldScript,
  enableVisualMode: true
};
const family = { script: familyScript };
const guessingGame = { script: guessingGameScript };
const draw = {
  script: drawScript,
  enableUpdate: true,
  enableVisualMode: true
};
const gameOfLife = {
  script: gameOfLifeScript,
  enableUpdate: true,
  enableVisualMode: true,
  enableClearOnUpdate: true
};
const blocks = {
  script: blocksScript,
  enableUpdate: true,
  enableVisualMode: true,
  enableClearOnUpdate: true,
  updateFrequency: 10,
  gridWidth: 10,
  gridHeight: 20
};

export {
  helloWorld,
  family,
  guessingGame,
  draw,
  gameOfLife,
  blocks
};
