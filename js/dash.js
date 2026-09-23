var Dash = {
  state: "ready",
  direction: 1,
  distanceLeft: 0,
  dashWasDown: false,
  cooldown: 0
};

Dash.reset = function () {
  Dash.state = "ready";
  Dash.direction = 1;
  Dash.distanceLeft = 0;
  Dash.dashWasDown = false;
  Dash.cooldown = 0;
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
  var justPressed = Input.dash && !Dash.dashWasDown;
  Dash.dashWasDown = Input.dash;

  if (Dash.state === "ready" && justPressed && (Input.left || Input.right)) {
    if (Input.left) { Dash.direction = -1; }
    if (Input.right) { Dash.direction = 1; }
    Dash.distanceLeft = CONFIG.DASH_DISTANCE;
    Dash.state = "dashing";
  }

  if (Dash.state === "dashing") {
    var hit = Dash.move(Dash.direction * Math.min(CONFIG.DASH_SPEED, Dash.distanceLeft));
    Dash.distanceLeft = Dash.distanceLeft - CONFIG.DASH_SPEED;
    if (hit) {
      Dash.state = "cooldown";
      Dash.cooldown = CONFIG.DASH_COOLDOWN_FRAMES;
    } else if (Dash.distanceLeft <= 0) {
      Dash.state = "cooldown";
      Dash.cooldown = CONFIG.DASH_COOLDOWN_FRAMES;
    }
  } else if (Dash.state === "bouncing") {
    Dash.move(-Dash.direction * Math.min(CONFIG.BOUNCE_SPEED, Dash.distanceLeft));
    Dash.distanceLeft = Dash.distanceLeft - CONFIG.BOUNCE_SPEED;
    if (Dash.distanceLeft <= 0) {
      Dash.state = "cooldown";
      Dash.cooldown = CONFIG.DASH_COOLDOWN_FRAMES;
    }
  } else if (Dash.state === "cooldown") {
    Dash.cooldown = Dash.cooldown - 1;
    if (Dash.cooldown <= 0) { Dash.state = "ready"; }
  }
};

Dash.isMoving = function () {
  return Dash.state === "dashing" || Dash.state === "bouncing";
};