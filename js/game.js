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
  creatorEnabled: false,
  creatorBrush: "#",
  creatorHover: null
};

Game.startLevel = function (levelNumber) {
  Game.levelNumber = levelNumber;
  Level.build(levelNumber);
  Enemies.reset();
  Enemies.loadFromLevel();
  Player.reset();
  Game.mode = "playing";
  Game.creatorEnabled = false;
  Game.creatorHover = null;
  Game.showMessage("");
};

Game.showMessage = function (text) {
  document.getElementById("message").textContent = text;
};

Game.bindCreatorUI = function () {
  var brushButtons = document.querySelectorAll(".creator-brush");

  brushButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      Game.creatorBrush = button.dataset.brush;
      brushButtons.forEach(function (otherButton) {
        otherButton.classList.toggle("active", otherButton === button);
      });
    });
  });

  var canvas = document.getElementById("game");
  if (canvas) {
    canvas.addEventListener("mousemove", function (event) {
      if (!Game.creatorEnabled) { return; }
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var col = Math.floor((x + Draw.cameraX) / CONFIG.TILE);
      var row = Math.floor(y / CONFIG.TILE);
      Game.creatorHover = { col: col, row: row };
    });

    canvas.addEventListener("mouseleave", function () {
      Game.creatorHover = null;
    });

    canvas.addEventListener("click", function (event) {
      if (!Game.creatorEnabled) { return; }
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var col = Math.floor((x + Draw.cameraX) / CONFIG.TILE);
      var row = Math.floor(y / CONFIG.TILE);

      if (row < 0 || row >= CONFIG.ROWS || col < 0 || col >= Level.cols) { return; }
      if (Level.charAt(col, row) === "S") { return; }

      if (Game.creatorBrush === ".") {
        Level.setTile(col, row, ".");
      } else {
        Level.setTile(col, row, Game.creatorBrush);
      }
    });
  }
};

// --- ONE FRAME --------------------------------------------------------
Game.update = function () {

  if (Input.creatorToggle && !Game.creatorEnabled) {
    Game.creatorEnabled = true;
    Game.showMessage("Creator mode: click to paint. Press K to exit.");
  } else if (!Input.creatorToggle && Game.creatorEnabled) {
    Game.creatorEnabled = false;
    Game.showMessage("");
    Game.creatorHover = null;
  }

  // R always restarts, no matter what mode we are in.
  if (Input.restart) {
    Game.startLevel(Game.levelNumber);
    return;
  }

  if (Game.creatorEnabled) {
    return;
  }

  // If we are not playing, nothing moves. We just wait for R.
  if (Game.mode !== "playing") { return; }

  Player.update();
  Enemies.update();

  if (Player.isDead()) {
    Game.mode = "dead";
    Game.showMessage("You hit something. Press R to try again.");
    return;
  }

  if (Player.hasWon()) {
    Game.mode = "won";
    Game.showMessage("You made it. Press R to play again.");
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
