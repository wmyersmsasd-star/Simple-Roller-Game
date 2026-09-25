/* =====================================================================
   game.js  --  THE RULES AND THE LOOP.

   The game is always in exactly ONE mode: "playing", "dead", or "won".
   Which mode it is in decides what happens each frame.

   The loop runs about 60 times a second, forever. Every time it runs it
   does the same two things: UPDATE (change the numbers) and DRAW (show
   the numbers).
   ===================================================================== */

var Game = {
  mode: "playing",   // "playing", "dead", or "won"
  levelNumber: 0,
  restartWasDown: false
};

Game.startLevel = function (levelNumber) {
  Game.levelNumber = levelNumber;
  Level.build(levelNumber);
  Enemies.reset();
  Enemies.loadFromLevel();
  Player.reset();
  Effects.reset();
  Game.mode = "playing";
  Game.showMessage("");
};

Game.showMessage = function (text) {
  document.getElementById("message").textContent = text;
};

// --- ONE FRAME --------------------------------------------------------
Game.update = function () {

  var restartPressed = Input.restart && !Game.restartWasDown;
  Game.restartWasDown = Input.restart;

  if (restartPressed) {
    if (Game.mode === "won") {
      var nextLevel = Game.levelNumber + 1;
      if (nextLevel < Level.levels.length) {
        Game.startLevel(nextLevel);
      } else {
        Game.startLevel(0);
      }
    } else {
      Game.startLevel(Game.levelNumber);
    }
    return;
  }

  // If we are not playing, nothing moves. We just wait for R.
  if (Game.mode !== "playing") { return; }

  Player.update();
  Enemies.update();
  Effects.update();
  Player.updateHud();

  if (Player.isDead()) {
    Game.mode = "dead";
    Game.showMessage("You hit something. Press R to try again.");
    return;
  }

  if (Player.hasWon() && Enemies.list.length === 0) {
    Game.mode = "won";
    if (Game.levelNumber < Level.levels.length - 1) {
      Game.showMessage("Level clear! Press R for the next level.");
    } else {
      Game.showMessage("All levels clear! Press R to play again.");
    }
    return;
  }
};

// --- THE LOOP ITSELF --------------------------------------------------
Game.loop = function () {
  Game.update();
  Draw.updateCamera();
  Draw.everything();
  window.requestAnimationFrame(Game.loop);
};
