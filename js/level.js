/* =====================================================================
   level.js  --  BUILDING THE WORLD OUT OF PIECES.

   A level is a list of piece names. A piece is a little 8-wide,
   10-tall picture. This file glues the pictures together, left to
   right, into one big grid.

   The pictures live in data/pieces.json.
   The lists of names live in data/levels.json.
   ===================================================================== */

var Level = {
  pieces: null,     // every piece picture, loaded from pieces.json
  levels: null,     // every level list, loaded from levels.json
  grid: [],         // the finished world. grid[row][col] is one character
  cols: 0,          // how many columns wide the finished world is
  name: "",
  colors: null,
  startX: 0,        // where the player begins, in pixels
  startY: 0
};

// --- STEP 1: read the two data files ----------------------------------
Level.loadData = function (whenDone) {
  fetch("data/pieces.json")
    .then(function (r) { return r.json(); })
    .then(function (piecesFile) {
      Level.pieces = piecesFile;
      return fetch("data/levels.json");
    })
    .then(function (r) { return r.json(); })
    .then(function (levelsFile) {
      Level.levels = levelsFile.levels;
      whenDone();
    })
    .catch(function (error) {
      document.getElementById("message").textContent =
        "Could not load the level files. Check data/pieces.json and data/levels.json.";
      console.error(error);
    });
};

// --- STEP 2: glue the pieces together ---------------------------------
Level.build = function (levelNumber) {
  var level = Level.levels[levelNumber];
  Level.name = level.name;
  Level.colors = level.colors || {
    background: "#090d18",
    block: "#0b1220",
    outline: "#ff4fd8",
    hazard: "#ff5a36",
    finish: "#4ae6ff",
    player: "#24163d",
    playerOutline: "#7af0ff",
    ranged: "#64d7ff",
    melee: "#ff7b54",
    projectile: "#ff7a59"
  };
  Level.grid = [];
  Level.cols = level.pieces.length * CONFIG.PIECE_COLS;

  // start with 10 empty rows
  for (var row = 0; row < CONFIG.ROWS; row++) {
    Level.grid.push("");
  }

  // add each piece onto the end of every row
  for (var p = 0; p < level.pieces.length; p++) {
    var pieceName = level.pieces[p];
    var piece = Level.pieces[pieceName];

    if (!piece) {
      console.error("No piece named '" + pieceName + "' in data/pieces.json");
      piece = Level.pieces["flat"];
    }

    for (var row = 0; row < CONFIG.ROWS; row++) {
      Level.grid[row] = Level.grid[row] + piece[row];
    }
  }

  Level.findStart();
};

// --- STEP 3: find the S and remember where it is ----------------------
Level.findStart = function () {
  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = 0; col < Level.cols; col++) {
      if (Level.charAt(col, row) === "S") {
        Level.startX = col * CONFIG.TILE;
        Level.startY = row * CONFIG.TILE;
        return;
      }
    }
  }
  // no S found anywhere, so just start at the top left
  Level.startX = 0;
  Level.startY = 0;
};

// --- ASKING THE WORLD QUESTIONS ---------------------------------------
// What character is at this grid square?
Level.charAt = function (col, row) {
  if (row < 0 || row >= CONFIG.ROWS) { return "."; }
  if (col < 0 || col >= Level.cols)  { return "."; }
  return Level.grid[row].charAt(col);
};

Level.setTile = function (col, row, character) {
  if (row < 0 || row >= CONFIG.ROWS) { return; }
  if (col < 0 || col >= Level.cols) { return; }
  if (character === "S") { return; }

  var line = Level.grid[row];
  Level.grid[row] = line.substring(0, col) + character + line.substring(col + 1);
};

Level.isSolid  = function (col, row) { return Level.charAt(col, row) === "#"; };
Level.isSpike  = function (col, row) { return Level.charAt(col, row) === "^"; };
Level.isFinish = function (col, row) { return Level.charAt(col, row) === "F"; };

// How wide is the whole world, in pixels?
Level.pixelWidth = function () { return Level.cols * CONFIG.TILE; };
