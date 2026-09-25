var Dash = {
  state: "ready",
  direction: 1,
  distanceLeft: 0,
  dashWasDown: false,
  cooldown: 0,
  sequence: 0,
  trail: [],
  line: null,
  maxStacks: 6,
  stacks: 6,
  dashCooldownMs: 0,
  regenMs: 0,
  durationMs: 0,
  lastFrameTime: 0
};

Dash.now = function () {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
};

Dash.reset = function () {
  Dash.state = "ready";
  Dash.direction = 1;
  Dash.distanceLeft = 0;
  Dash.dashWasDown = false;
  Dash.cooldown = 0;
  Dash.sequence = 0;
  Dash.trail = [];
  Dash.line = null;
  Dash.maxStacks = 6;
  Dash.stacks = 6;
  Dash.dashCooldownMs = 0;
  Dash.regenMs = 0;
  Dash.durationMs = 0;
  Dash.lastFrameTime = Dash.now();
};

Dash.canDash = function () {
  return Dash.state === "ready" && Dash.cooldown <= 0 && Dash.dashCooldownMs <= 0 && Dash.durationMs <= 0 && Dash.stacks > 0 && (Input.left || Input.right);
};

Dash.spawnTrail = function (trailX, trailY) {
  var size = CONFIG.PLAYER_SIZE;
  var centerX = trailX === undefined ? Player.x + size / 2 : trailX + size / 2;
  var centerY = trailY === undefined ? Player.y + size / 2 : trailY + size / 2;
  var isPlacedTrail = trailX !== undefined;

  Dash.trail.push({
    x: isPlacedTrail ? centerX : centerX + (Math.random() - 0.5) * 12,
    y: isPlacedTrail ? centerY : centerY + (Math.random() - 0.5) * 12,
    vx: isPlacedTrail ? 0 : -Dash.direction * (2 + Math.random() * 3),
    vy: isPlacedTrail ? 0 : (Math.random() - 0.5) * 2,
    radius: 4 + Math.random() * 7,
    life: 10 + Math.random() * 12,
    maxLife: 10 + Math.random() * 12
  });

  if (Dash.trail.length > 18) { Dash.trail.shift(); }
};

Dash.updateTrail = function () {
  for (var i = 0; i < Dash.trail.length; i++) {
    var particle = Dash.trail[i];
    particle.x = particle.x + particle.vx;
    particle.y = particle.y + particle.vy;
    particle.life = particle.life - 1;
  }

  Dash.trail = Dash.trail.filter(function (particle) {
    return particle.life > 0;
  });

  if (Dash.line) {
    Dash.line.life = Dash.line.life - 1;
    if (Dash.line.life <= 0) { Dash.line = null; }
  }
};

Dash.move = function (distance) {
  var step = distance > 0 ? 1 : -1;
  var size = CONFIG.PLAYER_SIZE;

  for (var i = 0; i < Math.abs(distance); i++) {
    if (Collide.hitsSolid(Player.x + step, Player.y, size, size)) {
      return true;
    }
    Player.x = Player.x + step;
    Player.angle = Player.angle + step / CONFIG.PLAYER_RADIUS;
  }
  return false;
};

Dash.update = function () {
  Player.invulnerable = false;
  var now = Dash.now();
  var deltaMs = 0;

  if (Dash.lastFrameTime > 0) {
    deltaMs = Math.max(0, now - Dash.lastFrameTime);
  }
  Dash.lastFrameTime = now;

  if (Dash.dashCooldownMs > 0) {
    Dash.dashCooldownMs = Math.max(0, Dash.dashCooldownMs - deltaMs);
  }

  if (Dash.durationMs > 0) {
    Dash.durationMs = Math.max(0, Dash.durationMs - deltaMs);
    if (Dash.durationMs === 0) {
      Dash.state = "ready";
    }
  }

  if (Dash.regenMs > 0) {
    Dash.regenMs = Math.max(0, Dash.regenMs - deltaMs);
    if (Dash.regenMs === 0) {
      Dash.stacks = Dash.maxStacks;
    }
  }

  var justPressed = Input.dash && !Dash.dashWasDown;
  Dash.dashWasDown = Input.dash;
  Dash.updateTrail();

  if (Dash.state === "cooldown") {
    Dash.cooldown = Dash.cooldown - 1;
    if (Dash.cooldown <= 0) { Dash.state = "ready"; }
  }

  if (Dash.state === "ready" && justPressed && Dash.canDash()) {
    if (Input.left) { Dash.direction = -1; }
    if (Input.right) { Dash.direction = 1; }
    Dash.distanceLeft = CONFIG.DASH_DISTANCE;
    Dash.sequence = Dash.sequence + 1;
    Dash.stacks = Dash.stacks - 1;
    if (Dash.stacks <= 0) {
      Dash.stacks = 0;
      Dash.regenMs = 1000;
    }
    Dash.dashCooldownMs = CONFIG.DASH_DURATION_MS;
    Dash.durationMs = CONFIG.DASH_DURATION_MS;
    Dash.state = "dashing";
    Player.invulnerable = true;
    var dashStartX = Player.x;
    var hit = Dash.move(Dash.direction * Dash.distanceLeft);
    var dashEndX = Player.x;
    Dash.line = {
      startX: dashStartX + CONFIG.PLAYER_SIZE / 2,
      endX: dashEndX + CONFIG.PLAYER_SIZE / 2,
      y: Player.y + CONFIG.PLAYER_SIZE / 2,
      life: 18,
      maxLife: 18
    };
    Dash.spawnTrail();
    Enemies.damageFromDash(dashStartX, dashEndX);
    Dash.distanceLeft = 0;
    Dash.state = "ready";
    Dash.cooldown = 0;
    if (hit) {
      Dash.state = "ready";
    }
  }

  if (Dash.state === "dashing") {
    Player.invulnerable = true;
    var dashStartX = Player.x;
    var dashStep = Math.min(CONFIG.DASH_SPEED, Dash.distanceLeft);
    var hit = Dash.move(Dash.direction * dashStep);
    var dashEndX = Player.x;
    Dash.line = {
      startX: dashStartX + CONFIG.PLAYER_SIZE / 2,
      endX: dashEndX + CONFIG.PLAYER_SIZE / 2,
      y: Player.y + CONFIG.PLAYER_SIZE / 2,
      life: 18,
      maxLife: 18
    };
    Dash.spawnTrail();
    Enemies.damageFromDash(dashStartX, dashEndX);
    Dash.distanceLeft = Dash.distanceLeft - dashStep;
    if (hit || Dash.distanceLeft <= 0) {
      Dash.state = "cooldown";
      Dash.cooldown = CONFIG.DASH_COOLDOWN_FRAMES;
    }
  } else if (Dash.state === "bouncing") {
    Dash.spawnTrail();
    Dash.move(-Dash.direction * Math.min(CONFIG.BOUNCE_SPEED, Dash.distanceLeft));
    Dash.distanceLeft = Dash.distanceLeft - CONFIG.BOUNCE_SPEED;
    if (Dash.distanceLeft <= 0) {
      Dash.state = "cooldown";
      Dash.cooldown = CONFIG.DASH_COOLDOWN_FRAMES;
    }
  }
};

Dash.isMoving = function () {
  return Dash.state === "dashing" || Dash.state === "bouncing";
};