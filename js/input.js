/* =====================================================================
   input.js  --  READING THE KEYBOARD.

   Nothing in here decides what happens. It only records which keys are
   being held down right now. js/player.js is what reads these values
   and decides to move.
   ===================================================================== */

var Input = {
  left: false,
  right: false,
  jump: false,
  restart: false
};

// Called whenever a key goes DOWN.
window.addEventListener("keydown", function (event) {
  setKey(event.key, true);
  // stop the arrow keys and space from scrolling the page
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].indexOf(event.key) >= 0) {
    event.preventDefault();
  }
});

// Called whenever a key comes back UP.
window.addEventListener("keyup", function (event) {
  setKey(event.key, false);
});

// One place that decides which key means what.
// WANT TO ADD A KEY? Add a line here.
function setKey(key, isDown) {
  if (key === "ArrowLeft"  || key === "a" || key === "A") { Input.left  = isDown; }
  if (key === "ArrowRight" || key === "d" || key === "D") { Input.right = isDown; }
  if (key === "ArrowUp"    || key === " " || key === "w" || key === "W") { Input.jump = isDown; }
  if (key === "r" || key === "R") { Input.restart = isDown; }

   // =====================================================================  
// dash.js -- dash with X to smash through blocks, then bounce back  
// =====================================================================  
  
var Dash = {  
  state: "ready", // "ready", "dashing", "bouncing", "cooldown"  
  timer: 0,  
  direction: 1,  
  dashWasDown: false  
};  
  
// clear everything when the level restarts  
Dash.reset = function () {  
  Dash.state = "ready";  
  Dash.timer = 0;  
  Dash.direction = 1;  
  Dash.dashWasDown = false;  
};  
  
// Level.grid holds strings, which cannot be changed in place,  
// so we rebuild the whole row with one character swapped  
Dash.setTile = function (col, row, character) {  
  var line = Level.grid[row];  
  Level.grid[row] = line.substring(0, col) + character + line.substring(col + 1);  
};  
  
// find the solid tile at our leading edge and break it  
Dash.breakBlockInFront = function () {  
  var size = CONFIG.PLAYER_SIZE;  
  var frontX = Dash.direction === 1 ? Player.x + size : Player.x - 1;  
  var col = Math.floor(frontX / CONFIG.TILE);  
  var rowTop = Math.floor(Player.y / CONFIG.TILE);  
  var rowBottom = Math.floor((Player.y + size - 1) / CONFIG.TILE);  
  for (var row = rowTop; row <= rowBottom; row++) {  
    if (Level.charAt(col, row) === "#") {  
      Dash.setTile(col, row, ".");  
      return true;  
    }  
  }  
  return false;  
};  
  
// move a few pixels at a time; return true if we bumped into something solid  
Dash.movePlayer = function (pixels) {  
  var size = CONFIG.PLAYER_SIZE;  
  var step = pixels > 0 ? 1 : -1;  
  for (var i = 0; i < Math.abs(pixels); i++) {  
    var nextX = Player.x + step;  
    if (Collide.hitsSolid(nextX, Player.y, size, size)) {  
      return true;  
    }  
    Player.x = nextX;  
    Player.angle = Player.angle + step * 0.05; // keep the roll dot spinning  
  }  
  return false;  
};  
  
Dash.update = function () {  
  // Input.dash is held, not pressed -- act only on the change from false to true  
  var dashJustPressed = Input.dash && !Dash.dashWasDown;  
  Dash.dashWasDown = Input.dash;  
  
  if (Dash.state === "ready") {  
    if (dashJustPressed) {  
      if (Input.right) { Dash.direction = 1; }  
      else if (Input.left) { Dash.direction = -1; }  
      Dash.state = "dashing";  
      Dash.timer = CONFIG.DASH_FRAMES;  
    }  
  } else if (Dash.state === "dashing") {  
    var hit = Dash.movePlayer(Dash.direction * CONFIG.DASH_SPEED);  
    Dash.timer = Dash.timer - 1;  
    if (hit && Dash.breakBlockInFront()) {  
      // smash! bounce back off the block we broke  
      Dash.state = "bouncing";  
      Dash.timer = CONFIG.BOUNCE_FRAMES;  
      Player.vy = -CONFIG.BOUNCE_UP;  
    } else if (hit || Dash.timer <= 0) {  
      Dash.state = "cooldown";  
      Dash.timer = CONFIG.DASH_COOLDOWN_FRAMES;  
    }  
  } else if (Dash.state === "bouncing") {  
    Dash.movePlayer(-Dash.direction * CONFIG.BOUNCE_SPEED);  
    Dash.timer = Dash.timer - 1;  
    if (Dash.timer <= 0) {  
      Dash.state = "cooldown";  
      Dash.timer = CONFIG.DASH_COOLDOWN_FRAMES;  
    }  
  } else if (Dash.state === "cooldown") {  
    Dash.timer = Dash.timer - 1;  
    if (Dash.timer <= 0) {  
      Dash.state = "ready";  
    }  
  }  
};  

}
