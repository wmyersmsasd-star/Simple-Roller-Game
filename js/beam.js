var SkyBeam = {
  canvas: null,
  targeting: false,
  cooldownMs: 0,
  aimX: 0,
  beam: null,
  beamKeyWasDown: false,
  lastUpdateTime: 0
};

SkyBeam.now = function () {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
};

SkyBeam.reset = function () {
  SkyBeam.targeting = false;
  SkyBeam.cooldownMs = 0;
  SkyBeam.aimX = Player.x + CONFIG.PLAYER_SIZE / 2;
  SkyBeam.beam = null;
  SkyBeam.beamKeyWasDown = Input.beam;
  SkyBeam.lastUpdateTime = SkyBeam.now();
  SkyBeam.updateStatus();
};

SkyBeam.setup = function () {
  SkyBeam.canvas = document.getElementById("game");
  SkyBeam.canvas.addEventListener("mousemove", function (event) {
    SkyBeam.aimX = SkyBeam.worldXFromEvent(event);
  });
  SkyBeam.canvas.addEventListener("click", SkyBeam.handleClick);
};

SkyBeam.worldXFromEvent = function (event) {
  var rect = SkyBeam.canvas.getBoundingClientRect();
  var contentWidth = SkyBeam.canvas.clientWidth || SkyBeam.canvas.width;
  var canvasX = (event.clientX - rect.left - SkyBeam.canvas.clientLeft) *
    SkyBeam.canvas.width / contentWidth;
  var beamWidth = CONFIG.BEAM_WIDTH_BLOCKS * CONFIG.TILE;
  var halfWidth = beamWidth / 2;
  var maxX = Math.max(halfWidth, Level.pixelWidth() - halfWidth);
  var worldX = Draw.cameraX + canvasX;

  return Math.max(halfWidth, Math.min(maxX, worldX));
};

SkyBeam.handleClick = function (event) {
  if (!SkyBeam.targeting || Game.mode !== "playing") { return; }

  SkyBeam.aimX = SkyBeam.worldXFromEvent(event);
  SkyBeam.targeting = false;
  SkyBeam.cooldownMs = CONFIG.BEAM_COOLDOWN_MS;
  var beamWidth = CONFIG.BEAM_WIDTH_BLOCKS * CONFIG.TILE;
  SkyBeam.beam = {
    left: SkyBeam.aimX - beamWidth / 2,
    width: beamWidth,
    lifeMs: CONFIG.BEAM_EFFECT_MS,
    maxLifeMs: CONFIG.BEAM_EFFECT_MS
  };
  Enemies.damageFromBeam(SkyBeam.aimX, beamWidth, CONFIG.BEAM_DAMAGE);
  SkyBeam.updateStatus();
};

SkyBeam.update = function () {
  var now = SkyBeam.now();
  var deltaMs = SkyBeam.lastUpdateTime > 0 ? Math.max(0, now - SkyBeam.lastUpdateTime) : 0;
  SkyBeam.lastUpdateTime = now;
  SkyBeam.cooldownMs = Math.max(0, SkyBeam.cooldownMs - deltaMs);

  if (SkyBeam.beam) {
    SkyBeam.beam.lifeMs = SkyBeam.beam.lifeMs - deltaMs;
    if (SkyBeam.beam.lifeMs <= 0) { SkyBeam.beam = null; }
  }

  var justPressed = Input.beam && !SkyBeam.beamKeyWasDown;
  SkyBeam.beamKeyWasDown = Input.beam;

  if (justPressed) {
    if (SkyBeam.targeting) {
      SkyBeam.targeting = false;
    } else if (SkyBeam.cooldownMs <= 0) {
      SkyBeam.targeting = true;
    }
  }

  SkyBeam.updateStatus();
};

SkyBeam.updateStatus = function () {
  var status = document.getElementById("ability-status");
  if (!status) { return; }

  if (SkyBeam.targeting) {
    status.textContent = "Sky beam: click to fire (Z cancels)";
  } else if (SkyBeam.cooldownMs > 0) {
    var secondsLeft = Math.ceil(SkyBeam.cooldownMs / 100) / 10;
    status.textContent = "Sky beam: " + secondsLeft.toFixed(1) + "s cooldown";
  } else {
    status.textContent = "Sky beam: ready (Z)";
  }
};

SkyBeam.draw = function () {
  var ctx = Draw.ctx;
  var beamWidth = CONFIG.BEAM_WIDTH_BLOCKS * CONFIG.TILE;

  if (SkyBeam.targeting) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = Level.colors.finish;
    ctx.fillRect(SkyBeam.aimX - beamWidth / 2, 0, beamWidth, CONFIG.CANVAS_H);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = Level.colors.finish;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(SkyBeam.aimX - beamWidth / 2 + 1, 1, beamWidth - 2, CONFIG.CANVAS_H - 2);
    ctx.restore();
  }

  if (SkyBeam.beam) {
    var alpha = SkyBeam.beam.lifeMs / SkyBeam.beam.maxLifeMs;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "#8deeff";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(115, 232, 255, 0.55)";
    ctx.fillRect(SkyBeam.beam.left, 0, SkyBeam.beam.width, CONFIG.CANVAS_H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#efffff";
    ctx.fillRect(SkyBeam.beam.left + SkyBeam.beam.width / 2 - 5, 0, 10, CONFIG.CANVAS_H);
    ctx.restore();
  }
};