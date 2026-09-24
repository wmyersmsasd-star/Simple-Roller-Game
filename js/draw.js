/* =====================================================================
   draw.js  --  EVERYTHING YOU CAN SEE.

   Nothing in this file changes the game. It only puts pixels on screen.
   If you want to change how the game LOOKS, this is the only file you
   need. If you want to change how it BEHAVES, this is the wrong file.

   The whole game is black and white on purpose. That is your room to
   work in.
   ===================================================================== */

var Draw = {
  canvas: null,
  ctx: null,
  cameraX: 0     // how far the view has scrolled to the right
};

Draw.setup = function () {
  Draw.canvas = document.getElementById("game");
  Draw.ctx = Draw.canvas.getContext("2d");
};

// Follow the player, but never scroll past the ends of the level.
Draw.updateCamera = function () {
  Draw.cameraX = Player.x - CONFIG.CANVAS_W / 2;
  if (Draw.cameraX < 0) { Draw.cameraX = 0; }

  var furthest = Level.pixelWidth() - CONFIG.CANVAS_W;
  if (furthest < 0) { furthest = 0; }   // level narrower than the screen
  if (Draw.cameraX > furthest) { Draw.cameraX = furthest; }
};

// Draw one whole frame.
Draw.everything = function () {
  var ctx = Draw.ctx;

  // 1. wipe the screen with a darker, richer backdrop
  ctx.fillStyle = "#090d18";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

  // 2. shift everything left so the camera looks like it moved right
  ctx.save();
  ctx.translate(-Draw.cameraX, 0);

  Draw.world();
  Enemies.draw();
  Draw.dashParticles();
  Draw.creatorPreview();
  Draw.player();

  ctx.restore();
};

Draw.creatorPreview = function () {
  if (!Game.creatorEnabled || !Game.creatorHover) { return; }

  var ctx = Draw.ctx;
  var x = Game.creatorHover.col * CONFIG.TILE;
  var y = Game.creatorHover.row * CONFIG.TILE;
  var hoverChar = Game.creatorBrush;

  ctx.strokeStyle = "rgba(122, 240, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, CONFIG.TILE - 2, CONFIG.TILE - 2);

  if (hoverChar === "#") {
    ctx.fillStyle = "rgba(122, 240, 255, 0.28)";
    ctx.fillRect(x, y, CONFIG.TILE, CONFIG.TILE);
  }
  if (hoverChar === "^") {
    ctx.fillStyle = "rgba(255, 106, 72, 0.28)";
    ctx.beginPath();
    ctx.moveTo(x, y + CONFIG.TILE);
    ctx.lineTo(x + CONFIG.TILE / 2, y);
    ctx.lineTo(x + CONFIG.TILE, y + CONFIG.TILE);
    ctx.closePath();
    ctx.fill();
  }
  if (hoverChar === "F") {
    ctx.fillStyle = "rgba(74, 241, 255, 0.28)";
    ctx.fillRect(x + CONFIG.TILE / 2 - 2, y, 4, CONFIG.TILE);
    ctx.beginPath();
    ctx.moveTo(x + CONFIG.TILE / 2 + 2, y + 4);
    ctx.lineTo(x + CONFIG.TILE - 4, y + 12);
    ctx.lineTo(x + CONFIG.TILE / 2 + 2, y + 20);
    ctx.closePath();
    ctx.fill();
  }
  if (hoverChar === "R" || hoverChar === "M") {
    ctx.fillStyle = hoverChar === "R" ? "rgba(100, 215, 255, 0.28)" : "rgba(255, 123, 84, 0.28)";
    ctx.fillRect(x + 4, y + 4, CONFIG.TILE - 8, CONFIG.TILE - 8);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeRect(x + 5, y + 5, CONFIG.TILE - 10, CONFIG.TILE - 10);
  }
};

Draw.dashParticles = function () {
  var ctx = Draw.ctx;
  if (!Dash.line) { return; }

  var alpha = Dash.line.life / Dash.line.maxLife;
  ctx.strokeStyle = "rgba(94, 225, 255, " + alpha + ")";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(Dash.line.startX, Dash.line.y);
  ctx.lineTo(Dash.line.endX, Dash.line.y);
  ctx.stroke();
};

// Draw every grid square that is currently on screen.
Draw.world = function () {
  var ctx = Draw.ctx;
  var size = CONFIG.TILE;

  // only look at the columns that are actually visible. much faster.
  var firstCol = Math.floor(Draw.cameraX / size) - 1;
  var lastCol  = firstCol + Math.ceil(CONFIG.CANVAS_W / size) + 2;

  for (var row = 0; row < CONFIG.ROWS; row++) {
    for (var col = firstCol; col <= lastCol; col++) {
      var here = Level.charAt(col, row);
      var x = col * size;
      var y = row * size;

      if (here === "#") { Draw.block(x, y, size); }
      if (here === "^") { Draw.spike(x, y, size); }
      if (here === "F") { Draw.finish(x, y, size); }
    }
  }
};

// A solid block: white inside, black outline.
Draw.block = function (x, y, size) {
  var ctx = Draw.ctx;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "#ff4fd8";
  ctx.lineWidth = CONFIG.LINE_WIDTH;
  ctx.strokeRect(x + CONFIG.LINE_WIDTH / 2,
                 y + CONFIG.LINE_WIDTH / 2,
                 size - CONFIG.LINE_WIDTH,
                 size - CONFIG.LINE_WIDTH);
};

// A spike: a solid black triangle pointing up.
Draw.spike = function (x, y, size) {
  var ctx = Draw.ctx;
  ctx.fillStyle = "#ff5a36";
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size / 2, y);
  ctx.lineTo(x + size, y + size);
  ctx.closePath();
  ctx.fill();
};

// The finish: a black pole with a flag on it.
Draw.finish = function (x, y, size) {
  var ctx = Draw.ctx;
  ctx.fillStyle = "#4ae6ff";
  ctx.fillRect(x + size / 2 - 2, y, 4, size);
  ctx.beginPath();
  ctx.moveTo(x + size / 2 + 2, y + 4);
  ctx.lineTo(x + size - 4,     y + 12);
  ctx.lineTo(x + size / 2 + 2, y + 20);
  ctx.closePath();
  ctx.fill();
};

// The player: a white circle with a black outline and one off-center
// black dot, so you can see it roll.
Draw.player = function () {
  var ctx = Draw.ctx;
  var r = CONFIG.PLAYER_RADIUS;
  var centerX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var centerY = Player.y + CONFIG.PLAYER_SIZE / 2;

  // the circle
  ctx.fillStyle = "#24163d";
  ctx.strokeStyle = "#7af0ff";
  ctx.lineWidth = CONFIG.LINE_WIDTH;
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // the off-center dot. its position depends on how far we have rolled.
  var dotX = centerX + Math.cos(Player.angle) * r * CONFIG.DOT_DISTANCE;
  var dotY = centerY + Math.sin(Player.angle) * r * CONFIG.DOT_DISTANCE;

  ctx.fillStyle = "#f2fbff";
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
  ctx.fill();
};
