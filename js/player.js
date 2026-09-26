/* =====================================================================
   player.js  --  THE ROLLING CIRCLE.

   This file owns everything about the player: where it is, how fast it
   is going, and what happens when it hits something.

   It does NOT draw anything. Drawing lives in js/draw.js.
   ===================================================================== */

var Player = {
  x: 0,            // position in pixels, left edge of the box
  y: 0,            // position in pixels, top edge of the box
  vx: 0,           // speed left and right
  vy: 0,           // speed up and down
  onGround: false, // is the player standing on something right now?
  jumpsUsed: 0,
  jumpWasDown: false,
  coyoteFrames: 0,
  angle: 0,        // how far the circle has rolled, for drawing the dot
  health: 100,     // current health; no regeneration
  invulnerable: false,
  blockFrames: 0,
  blockCooldownFrames: 0,
  blockWasDown: false
};

Player.takeDamage = function (amount, attacker) {
  if (Player.isBlocking()) {
    Enemies.stun(attacker);
    Effects.hitBurst(Player.x + CONFIG.PLAYER_SIZE / 2, Player.y + CONFIG.PLAYER_SIZE / 2, "rgba(141, 238, 255, 1)");
    return;
  }
  if (Player.invulnerable || Dash.isMoving()) { return; }

  Player.health = Math.max(0, Player.health - amount);
  if (Player.health <= 0) {
    Player.health = 0;
  }
  Effects.damageNumber(Player.x + CONFIG.PLAYER_SIZE / 2, Player.y, amount, "rgba(255, 91, 91, 1)");
  Effects.hitBurst(Player.x + CONFIG.PLAYER_SIZE / 2, Player.y + CONFIG.PLAYER_SIZE / 2, "rgba(255, 91, 91, 1)");
  Effects.flash = 5;
  Player.updateHud();
};

Player.isBlocking = function () {
  return Player.blockFrames > 0;
};

Player.updateBlock = function () {
  if (Player.blockFrames > 0) { Player.blockFrames = Player.blockFrames - 1; }
  if (Player.blockCooldownFrames > 0) { Player.blockCooldownFrames = Player.blockCooldownFrames - 1; }

  var blockPressed = Input.block && !Player.blockWasDown;
  Player.blockWasDown = Input.block;
  if (blockPressed && Player.blockCooldownFrames <= 0) {
    Player.blockFrames = CONFIG.BLOCK_DURATION_FRAMES;
    Player.blockCooldownFrames = CONFIG.BLOCK_COOLDOWN_FRAMES;
  }
};

Player.updateHud = function () {
  var hud = document.getElementById("hud");
  if (hud) {
    hud.textContent = "Health: " + Player.health + " / " + CONFIG.PLAYER_MAX_HEALTH;
  }
  var blockStatus = document.getElementById("block-status");
  if (blockStatus) {
    if (Player.isBlocking()) {
      blockStatus.textContent = "Block: active";
    } else if (Player.blockCooldownFrames > 0) {
      blockStatus.textContent = "Block: " + (Player.blockCooldownFrames / 60).toFixed(1) + "s cooldown";
    } else {
      blockStatus.textContent = "Block: ready (F)";
    }
  }
};

// Put the player back at the level's S square.
Player.reset = function () {
  Player.x = Level.startX;
  Player.y = Level.startY;
  Player.vx = 0;
  Player.vy = 0;
  Player.onGround = false;
  Player.jumpsUsed = 0;
  Player.jumpWasDown = false;
  Player.coyoteFrames = 0;
  Player.angle = 0;
  Player.health = CONFIG.PLAYER_MAX_HEALTH;
  Player.invulnerable = false;
  Player.blockFrames = 0;
  Player.blockCooldownFrames = 0;
  Player.blockWasDown = Input.block;
  Player.updateHud();
  Dash.reset();
};

// Run one frame of player movement.
Player.update = function () {
  var size = CONFIG.PLAYER_SIZE;
  Player.updateBlock();
  var jumpPressed = Input.jump && !Player.jumpWasDown;
  Player.jumpWasDown = Input.jump;

  if (Player.onGround) {
    Player.coyoteFrames = CONFIG.COYOTE_FRAMES;
  } else if (Player.coyoteFrames > 0) {
    Player.coyoteFrames = Player.coyoteFrames - 1;
  }

  Dash.update();

  // --- 1. decide how fast to go sideways ------------------------------
  Player.vx = 0;
  if (!Dash.isMoving()) {
    if (Input.left)  { Player.vx = -CONFIG.MOVE_SPEED; }
    if (Input.right) { Player.vx =  CONFIG.MOVE_SPEED; }
  }

  // --- 2. jump, but only if we are standing on something --------------
  if ((Input.jump && Player.onGround) ||
      (jumpPressed && (Player.coyoteFrames > 0 || Player.jumpsUsed < CONFIG.MAX_JUMPS))) {
    Player.vy = -CONFIG.JUMP_POWER;   // negative is UP
    Player.onGround = false;
    Player.coyoteFrames = 0;
    Player.jumpsUsed = Player.jumpsUsed + 1;
  }

  // --- 3. gravity pulls down every single frame -----------------------
  Player.vy = Player.vy + CONFIG.GRAVITY;
  if (Player.vy > CONFIG.MAX_FALL) { Player.vy = CONFIG.MAX_FALL; }

  // --- 4. move sideways, one pixel at a time, stopping at walls -------
  var stepX = 0;
  if (Player.vx > 0) { stepX = 1; }
  if (Player.vx < 0) { stepX = -1; }

  for (var i = 0; i < Math.abs(Player.vx); i++) {
    if (Collide.hitsSolid(Player.x + stepX, Player.y, size, size)) { break; }
    Player.x = Player.x + stepX;
    Player.angle = Player.angle + stepX / CONFIG.PLAYER_RADIUS; // roll it
  }

  // --- 5. move up or down, one pixel at a time ------------------------
  var stepY = 0;
  if (Player.vy > 0) { stepY = 1; }
  if (Player.vy < 0) { stepY = -1; }

  Player.onGround = false;

  for (var j = 0; j < Math.abs(Player.vy); j++) {
    if (Collide.hitsSolid(Player.x, Player.y + stepY, size, size)) {
      if (stepY > 0) {
        Player.onGround = true;
        Player.jumpsUsed = 0;
      }  // we landed on something
      Player.vy = 0;
      break;
    }
    Player.y = Player.y + stepY;
  }

  // --- 6. keep the player inside the left edge of the world -----------
  if (Player.x < 0) { Player.x = 0; }
};

// Did the player just touch something deadly?
Player.isDead = function () {
  var size = CONFIG.PLAYER_SIZE;
  if (Player.health <= 0) { return true; }
  if (Collide.hitsSpike(Player.x, Player.y, size, size)) { return true; }
  if (Enemies.hitsPlayer()) { return true; }
  if (Player.y > CONFIG.CANVAS_H + 200) { return true; }   // fell off the world
  return false;
};

// Did the player just reach the finish?
Player.hasWon = function () {
  var size = CONFIG.PLAYER_SIZE;
  return Collide.hitsFinish(Player.x, Player.y, size, size);
};
