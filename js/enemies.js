var Enemies = {
  list: [],
  projectiles: [],
  shockwaves: []
};

Enemies.damageForLevel = function (baseDamage) {
  var levelIndex = Level.campaignStage >= 0 ? 10 + Level.campaignStage : Math.max(0, Game.levelNumber);
  var stageIncrease = levelIndex * CONFIG.ENEMY_DAMAGE_PER_LEVEL;
  return Math.round((baseDamage + stageIncrease) * Math.sqrt(Level.difficultyMultiplier));
};

Enemies.speedMultiplier = function () {
  return CONFIG.ENEMY_SPEED_MULTIPLIER * (1 + Math.max(0, Game.levelNumber) * CONFIG.ENEMY_SPEED_PER_LEVEL);
};

Enemies.reset = function () {
  Enemies.list = [];
  Enemies.projectiles = [];
  Enemies.shockwaves = [];
};

Enemies.loadFromLevel = function () {
  for (var row = 0; row < Level.grid.length; row++) {
    for (var col = 0; col < Level.grid[row].length; col++) {
      var tile = Level.charAt(col, row);
      if (tile !== "R" && tile !== "M" && tile !== "B") { continue; }

      var enemy = {
        type: tile === "R" ? "ranged" : tile === "B" ? "boss" : "melee",
        x: col * CONFIG.TILE + CONFIG.TILE / 2,
        y: row * CONFIG.TILE + CONFIG.TILE / 2 + 8,
        dir: 1,
        cooldown: 40,
        dashDistanceLeft: 0,
        dashDirection: 1,
        dashHit: false,
        lastPlayerDash: 0,
        stunFrames: 0,
        vy: 0,
        onGround: true,
        jumpCooldown: 0,
        animationTime: 0,
        action: "idle",
        attackFrames: 0,
        attackAction: "attack",
        landFrames: 0,
        health: Math.round(CONFIG.ENEMY_MAX_HEALTH * Level.difficultyMultiplier * (tile === "B" ? 5 : 1)),
        size: tile === "B" ? 64 : 24,
        bossName: tile === "B" ? Level.bossName : "",
        shockwaveCooldown: 100,
        minX: col * CONFIG.TILE + 8,
        maxX: (col + 1) * CONFIG.TILE - 8,
        baseY: row * CONFIG.TILE + CONFIG.TILE / 2
      };

      if (enemy.type === "melee") {
        enemy.x = enemy.minX + 14;
        enemy.y = enemy.baseY + 8;
      } else if (enemy.type === "boss") {
        enemy.y = enemy.baseY - 12;
      }

      Enemies.list.push(enemy);
      Level.setTile(col, row, ".");
    }
  }
};

Enemies.update = function () {
  for (var i = 0; i < Enemies.projectiles.length; i++) {
    var shot = Enemies.projectiles[i];
    shot.x = shot.x + shot.vx;
    shot.y = shot.y + shot.vy;
    shot.life = shot.life - 1;
  }

  Enemies.projectiles = Enemies.projectiles.filter(function (shot) {
    return shot.life > 0;
  });

  Enemies.updateShockwaves();

  for (var j = 0; j < Enemies.list.length; j++) {
    var enemy = Enemies.list[j];
    var dx = Player.x - enemy.x;
    var dy = Player.y - enemy.y;

    if (enemy.health <= 0) {
      continue;
    }
    if (enemy.stunFrames > 0) {
      enemy.stunFrames = enemy.stunFrames - 1;
      enemy.action = "stunned";
      continue;
    }

    enemy.previousX = enemy.x;
    enemy.animationTime = enemy.animationTime + (enemy.action === "move" ? 0.45 : 0.2);
    enemy.attackFrames = Math.max(0, enemy.attackFrames - 1);
    if (enemy.jumpCooldown > 0) { enemy.jumpCooldown = enemy.jumpCooldown - 1; }
    enemy.action = enemy.attackFrames > 0 ? enemy.attackAction : enemy.onGround ? "idle" : "jump";
    Enemies.updateEnemyVerticalMotion(enemy);
    if (!enemy.onGround) { enemy.action = "jump"; }

    var moveDirection = dx >= 0 ? 1 : -1;
    if (enemy.type === "ranged" && Math.abs(dx) < CONFIG.TILE * 3) {
      moveDirection = -moveDirection;
    }
    Enemies.tryJump(enemy, moveDirection);

    if (enemy.type === "boss") {
      enemy.shockwaveCooldown = enemy.shockwaveCooldown - 1;
      if (enemy.shockwaveCooldown <= 0) {
        enemy.shockwaveCooldown = Math.max(75, 150 - Level.realmStage * 4);
        Enemies.createShockwave(enemy);
      }
      Enemies.followPlayer(enemy, dx);
      continue;
    }

    if (enemy.type === "ranged") {
      enemy.cooldown = enemy.cooldown - 1;
      if (Math.abs(dx) > CONFIG.TILE * 5) {
        Enemies.followPlayer(enemy, dx);
      } else if (Math.abs(dx) < CONFIG.TILE * 3) {
        Enemies.moveHorizontally(enemy, moveDirection);
      }
      if (Math.abs(dx) < 260 && Math.abs(dy) < 80 && enemy.cooldown <= 0 && Enemies.hasClearShot(enemy)) {
        enemy.cooldown = CONFIG.RANGED_ATTACK_COOLDOWN;
        var projectileSpeed = 4 * Enemies.speedMultiplier();
        var shotDistance = Math.sqrt(dx * dx + dy * dy);
        var shotDx = shotDistance > 0 ? dx / shotDistance : enemy.dir;
        var shotDy = shotDistance > 0 ? dy / shotDistance : 0;
        Enemies.projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: shotDx * projectileSpeed,
          vy: shotDy * projectileSpeed,
          radius: 5,
          life: 90,
          damage: Enemies.damageForLevel(10),
          owner: enemy
        });
        enemy.attackFrames = 12;
        enemy.attackAction = "attack";
        enemy.action = "attack";
      }
      continue;
    }

    enemy.cooldown = Math.max(0, enemy.cooldown - 1);

    if (enemy.dashDistanceLeft > 0) {
      Enemies.updateMeleeDash(enemy);
      continue;
    }

    Enemies.followPlayer(enemy, dx);

    if (Math.abs(dx) < 72 && Math.abs(dy) < 28) {
      enemy.dir = dx >= 0 ? 1 : -1;
      if (enemy.cooldown <= 0) {
        enemy.cooldown = CONFIG.MELEE_ATTACK_COOLDOWN;
        enemy.dashDirection = enemy.dir;
        enemy.dashDistanceLeft = CONFIG.MELEE_DASH_DISTANCE;
        enemy.dashHit = false;
        enemy.attackFrames = 10;
        enemy.attackAction = "attack";
        enemy.action = "attack";
      }
    }

  }

  Enemies.projectiles = Enemies.projectiles.filter(function (shot) {
    if (shot.x < -50 || shot.x > Level.pixelWidth() + 50 || shot.y < -50 || shot.y > CONFIG.CANVAS_H + 50) {
      return false;
    }
    return true;
  });

  Enemies.applyPlayerDamage();
  Enemies.shockwaves = Enemies.shockwaves.filter(function (wave) {
    return wave.life > 0 && wave.owner.health > 0;
  });
  Enemies.list = Enemies.list.filter(function (enemy) {
    return enemy.health > 0;
  });
};

Enemies.createShockwave = function (boss) {
  var groundY = boss.baseY + CONFIG.TILE / 2;
  var speed = (5 + Level.difficultyMultiplier) * Enemies.speedMultiplier();
  Enemies.shockwaves.push({
    x: boss.x,
    y: groundY,
    radius: 0,
    speed: speed,
    life: 90,
    damage: Enemies.damageForLevel(14),
    owner: boss,
    hit: false
  });
  boss.attackFrames = 24;
  boss.attackAction = "attack";
  boss.action = "attack";
};

Enemies.updateShockwaves = function () {
  var playerCenterX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var playerBottom = Player.y + CONFIG.PLAYER_SIZE;
  for (var i = 0; i < Enemies.shockwaves.length; i++) {
    var wave = Enemies.shockwaves[i];
    var previousRadius = wave.radius;
    wave.radius = wave.radius + wave.speed;
    wave.life = wave.life - 1;
    var distance = Math.abs(playerCenterX - wave.x);
    var wavePassedPlayer = distance >= previousRadius && distance <= wave.radius + 14;
    var playerAtGround = Math.abs(playerBottom - wave.y) < 38;

    if (!wave.hit && wavePassedPlayer && playerAtGround) {
      Player.takeDamage(wave.damage, wave.owner);
      wave.hit = true;
    }
  }
};

Enemies.tryJump = function (enemy, direction) {
  if (!enemy.onGround || enemy.jumpCooldown > 0) { return; }

  var halfSize = enemy.size / 2;
  var aheadCol = Math.floor((enemy.x + direction * (halfSize + 6)) / CONFIG.TILE);
  var bodyRow = Math.floor(enemy.y / CONFIG.TILE);
  var feetRow = Math.floor((enemy.y + halfSize + 1) / CONFIG.TILE);
  var obstacleAhead = Level.isSolid(aheadCol, bodyRow) || Level.isSolid(aheadCol, bodyRow - 1);
  var hazardAhead = Level.isSpike(aheadCol, bodyRow) || Level.isSpike(aheadCol, feetRow - 1);
  var gapAhead = !Level.isSolid(aheadCol, feetRow);
  var projectileThreat = false;

  for (var i = 0; i < Enemies.projectiles.length; i++) {
    var shot = Enemies.projectiles[i];
    var towardEnemy = (enemy.x - shot.x) * shot.vx > 0;
    if (shot.owner !== enemy && towardEnemy && Math.abs(shot.x - enemy.x) < 120 && Math.abs(shot.y - enemy.y) < 60) {
      projectileThreat = true;
      break;
    }
  }

  if (obstacleAhead || hazardAhead || gapAhead || projectileThreat) {
    enemy.vy = -CONFIG.ENEMY_JUMP_POWER;
    enemy.onGround = false;
    enemy.jumpCooldown = CONFIG.ENEMY_JUMP_COOLDOWN;
    enemy.action = "jump";
  }
};

Enemies.updateEnemyVerticalMotion = function (enemy) {
  var halfSize = enemy.size / 2;
  var bodyX = enemy.x - halfSize + 2;
  var bodyWidth = enemy.size - 4;
  var floorBelow = Collide.hitsSolid(bodyX, enemy.y + halfSize, bodyWidth, 2);

  if (enemy.onGround && floorBelow) {
    if (enemy.landFrames > 0) {
      enemy.landFrames = enemy.landFrames - 1;
      enemy.action = "land";
    }
    return;
  }
  if (enemy.onGround) {
    enemy.onGround = false;
    enemy.vy = 0;
  }

  enemy.vy = Math.min(enemy.vy + CONFIG.GRAVITY, CONFIG.MAX_FALL);
  var nextY = enemy.y + enemy.vy;
  var bodyTop = nextY - halfSize;

  if (Collide.hitsSolid(bodyX, bodyTop, bodyWidth, enemy.size)) {
    if (enemy.vy > 0) {
      var landingRow = Math.floor((nextY + halfSize) / CONFIG.TILE);
      enemy.y = landingRow * CONFIG.TILE - halfSize;
      enemy.onGround = true;
      enemy.landFrames = 5;
    }
    enemy.vy = 0;
  } else {
    enemy.y = nextY;
  }

  if (enemy.landFrames > 0) {
    enemy.landFrames = enemy.landFrames - 1;
    if (enemy.onGround) { enemy.action = "land"; }
  }
};

Enemies.moveHorizontally = function (enemy, direction) {
  if (direction === 0) { return; }
  enemy.dir = direction;
  var nextX = enemy.x + direction * CONFIG.ENEMY_MOVE_SPEED * Enemies.speedMultiplier();
  var enemySize = enemy.size || 24;
  var enemyLeft = nextX - enemySize / 2;
  var enemyTop = enemy.y - enemySize / 2;

  if (enemyLeft < 0 || enemyLeft + enemySize > Level.pixelWidth() ||
      Collide.hitsSolid(enemyLeft, enemyTop, enemySize, enemySize)) {
    return;
  }

  enemy.x = nextX;
  if (enemy.onGround) {
    enemy.action = enemy.landFrames > 0
      ? "land"
      : enemy.attackFrames > 0 ? enemy.attackAction : "move";
  }
};

Enemies.hasClearShot = function (enemy) {
  var targetX = Player.x + CONFIG.PLAYER_SIZE / 2;
  var targetY = Player.y + CONFIG.PLAYER_SIZE / 2;
  var dx = targetX - enemy.x;
  var dy = targetY - enemy.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  var steps = Math.ceil(distance / (CONFIG.TILE / 2));

  for (var i = 1; i < steps; i++) {
    var progress = i / steps;
    var col = Math.floor((enemy.x + dx * progress) / CONFIG.TILE);
    var row = Math.floor((enemy.y + dy * progress) / CONFIG.TILE);
    if (Level.isSolid(col, row)) { return false; }
  }
  return true;
};

Enemies.updateMeleeDash = function (enemy) {
  enemy.action = "dash";
  var dashStartX = enemy.x;
  var dashStep = Math.min(CONFIG.MELEE_DASH_SPEED * Enemies.speedMultiplier(), enemy.dashDistanceLeft);
  var nextX = enemy.x + enemy.dashDirection * dashStep;
  var enemySize = 24;
  var enemyLeft = nextX - enemySize / 2;
  var enemyTop = enemy.y - enemySize / 2;

  if (enemyLeft < 0 || enemyLeft + enemySize > Level.pixelWidth() ||
      Collide.hitsSolid(enemyLeft, enemyTop, enemySize, enemySize)) {
    enemy.dashDistanceLeft = 0;
    return;
  }

  enemy.x = nextX;
  enemy.dashDistanceLeft = enemy.dashDistanceLeft - dashStep;
  Enemies.damagePlayerFromDash(enemy, dashStartX, enemy.x);
};

Enemies.followPlayer = function (enemy, dx) {
  if (Math.abs(dx) <= 8) { return; }
  Enemies.moveHorizontally(enemy, dx > 0 ? 1 : -1);
};

Enemies.applyPlayerDamage = function () {
  var playerLeft = Player.x;
  var playerTop = Player.y;
  var playerRight = Player.x + CONFIG.PLAYER_SIZE;
  var playerBottom = Player.y + CONFIG.PLAYER_SIZE;

  for (var i = 0; i < Enemies.projectiles.length; i++) {
    var shot = Enemies.projectiles[i];
    var shotLeft = shot.x - shot.radius;
    var shotRight = shot.x + shot.radius;
    var shotTop = shot.y - shot.radius;
    var shotBottom = shot.y + shot.radius;

    if (shotRight > playerLeft && shotLeft < playerRight &&
        shotBottom > playerTop && shotTop < playerBottom) {
      Player.takeDamage(shot.damage || 10, shot.owner);
      Enemies.projectiles.splice(i, 1);
      i = i - 1;
    }
  }

};

Enemies.damagePlayerFromDash = function (enemy, dashStartX, dashEndX) {
  if (enemy.dashHit) { return; }

  var dashLeft = Math.min(dashStartX, dashEndX) - 16;
  var dashRight = Math.max(dashStartX, dashEndX) + 16;
  var playerLeft = Player.x;
  var playerRight = Player.x + CONFIG.PLAYER_SIZE;
  var playerTop = Player.y;
  var playerBottom = Player.y + CONFIG.PLAYER_SIZE;

  if (dashRight > playerLeft && dashLeft < playerRight &&
      enemy.y + 16 > playerTop && enemy.y - 16 < playerBottom) {
    Player.takeDamage(Enemies.damageForLevel(20), enemy);
    enemy.dashHit = true;
  }
};

Enemies.stun = function (enemy) {
  if (!enemy || enemy.health <= 0) { return; }
  enemy.stunFrames = CONFIG.ENEMY_STUN_FRAMES;
  enemy.dashDistanceLeft = 0;
  if (enemy.type === "boss") {
    enemy.shockwaveCooldown = Math.max(enemy.shockwaveCooldown, 120);
  }
  enemy.cooldown = Math.max(enemy.cooldown, CONFIG.MELEE_ATTACK_COOLDOWN);
};

Enemies.damageFromDash = function (dashStartX, dashEndX) {
  var dashLeft = Math.min(dashStartX, dashEndX);
  var dashRight = Math.max(dashStartX, dashEndX) + CONFIG.PLAYER_SIZE;
  var playerTop = Player.y;
  var playerBottom = Player.y + CONFIG.PLAYER_SIZE;

  for (var i = 0; i < Enemies.list.length; i++) {
    var enemy = Enemies.list[i];
    if (enemy.health <= 0 || enemy.lastPlayerDash === Dash.sequence) { continue; }

    var enemyHalfSize = (enemy.size || 24) / 2;
    var enemyLeft = enemy.x - enemyHalfSize;
    var enemyRight = enemy.x + enemyHalfSize;
    var enemyTop = enemy.y - enemyHalfSize;
    var enemyBottom = enemy.y + enemyHalfSize;

    if (dashRight > enemyLeft && dashLeft < enemyRight &&
      playerBottom > enemyTop && playerTop < enemyBottom) {
      var dashDamage = Player.getDamageAmount(50);
      enemy.health = enemy.health - dashDamage;
      enemy.lastPlayerDash = Dash.sequence;
      Effects.damageNumber(enemy.x, enemy.y - 18, dashDamage, "rgba(122, 240, 255, 1)");
      Effects.hitBurst(enemy.x, enemy.y, "rgba(122, 240, 255, 1)");
      if (enemy.health <= 0) {
        enemy.health = 0;
        Game.addCoins(Game.getCoinReward());
      }
    }
  }
};

Enemies.damageFromBeam = function (centerX, width, damage) {
  var beamLeft = centerX - width / 2;
  var beamRight = centerX + width / 2;

  for (var i = 0; i < Enemies.list.length; i++) {
    var enemy = Enemies.list[i];
    var enemyHalfSize = (enemy.size || 24) / 2;
    var enemyLeft = enemy.x - enemyHalfSize;
    var enemyRight = enemy.x + enemyHalfSize;

    if (enemy.health <= 0 || beamRight <= enemyLeft || beamLeft >= enemyRight) { continue; }

    enemy.health = Math.max(0, enemy.health - damage);
    Effects.damageNumber(enemy.x, enemy.y - 18, damage, "rgba(122, 240, 255, 1)");
    Effects.hitBurst(enemy.x, enemy.y, "rgba(122, 240, 255, 1)");
    if (enemy.health <= 0) {
      Game.addCoins(Game.getCoinReward());
    }
  }
};

Enemies.hitsPlayer = function () {
  return false;
};

Enemies.draw = function () {
  var ctx = Draw.ctx;

  for (var waveIndex = 0; waveIndex < Enemies.shockwaves.length; waveIndex++) {
    var wave = Enemies.shockwaves[waveIndex];
    ctx.strokeStyle = "rgba(255, 211, 91, " + Math.min(0.9, wave.life / 45) + ")";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (var i = 0; i < Enemies.projectiles.length; i++) {
    var shot = Enemies.projectiles[i];
    ctx.fillStyle = Level.colors.projectile;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (var j = 0; j < Enemies.list.length; j++) {
    var enemy = Enemies.list[j];
    var centerX = enemy.x;
    var centerY = enemy.y;
    Enemies.drawEnemy(enemy);

    var healthRatio = Math.max(0, Math.min(1, enemy.health / (CONFIG.ENEMY_MAX_HEALTH * Level.difficultyMultiplier * (enemy.type === "boss" ? 5 : 1))));
    var healthBarWidth = enemy.type === "boss" ? 68 : 34;
    var healthBarX = centerX - healthBarWidth / 2;
    var healthBarY = centerY - (enemy.type === "boss" ? 43 : 22);
    ctx.fillStyle = "#101820";
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, 6);
    ctx.fillStyle = healthRatio > 0.5 ? "#58d68d" : healthRatio > 0.25 ? "#f4c95d" : "#ff5b68";
    ctx.fillRect(healthBarX + 1, healthBarY + 1, (healthBarWidth - 2) * healthRatio, 4);
    ctx.strokeStyle = "#eafcff";
    ctx.lineWidth = 1;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, 6);
  }
};

Enemies.drawEnemy = function (enemy) {
  var ctx = Draw.ctx;
  var halfSize = enemy.size / 2;
  var moving = enemy.action === "move" || enemy.action === "dash";
  var phase = enemy.animationTime;
  var bob = moving ? Math.abs(Math.sin(phase * 2)) * 3 : Math.sin(phase) * 1.5;
  var scaleX = 1;
  var scaleY = 1;
  var tilt = moving ? Math.cos(phase * 2) * 0.08 : 0;

  if (enemy.action === "jump") {
    scaleX = 0.88;
    scaleY = 1.14;
  } else if (enemy.action === "land") {
    scaleX = 1.14;
    scaleY = 0.88;
  } else if (enemy.action === "attack") {
    scaleX = 1.12;
    scaleY = 0.92;
    tilt = -enemy.dir * 0.12;
  } else if (enemy.action === "dash") {
    scaleX = 1.18;
    scaleY = 0.86;
    tilt = enemy.dir * 0.1;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + halfSize + 4, halfSize * (enemy.onGround ? 0.8 : 0.58), 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(enemy.x, enemy.y - bob);
  ctx.rotate(tilt);
  ctx.scale(scaleX * enemy.dir, scaleY);

  if (enemy.type === "boss") {
    ctx.fillStyle = Level.colors.outline;
    ctx.beginPath();
    ctx.moveTo(-22, -16);
    ctx.lineTo(-34, -39);
    ctx.lineTo(-8, -26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(22, -16);
    ctx.lineTo(34, -39);
    ctx.lineTo(8, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = Level.colors.melee;
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.action === "attack" ? "#fff3a6" : "#fff1c2";
    ctx.fillRect(-15, -8, 8, 6);
    ctx.fillRect(7, -8, 8, 6);
    ctx.strokeStyle = "#fff0c2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 29, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    var legSwing = moving ? Math.sin(phase * 2) * 5 : 0;
    ctx.strokeStyle = enemy.type === "ranged" ? Level.colors.ranged : Level.colors.melee;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-7 + legSwing, 14);
    ctx.moveTo(6, 8);
    ctx.lineTo(7 - legSwing, 14);
    ctx.stroke();
    ctx.fillStyle = enemy.type === "ranged" ? Level.colors.ranged : Level.colors.melee;
    ctx.fillRect(-12, -12, 24, 22);
    ctx.fillStyle = enemy.action === "attack" ? "#fff3a6" : "#fff1c2";
    ctx.fillRect(3, -5, 4, 4);
    ctx.fillStyle = "#10202a";
    ctx.fillRect(4, -4, 2, 2);

    if (enemy.type === "ranged") {
      ctx.strokeStyle = "#e2edff";
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.strokeStyle = Level.colors.outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-9, -14);
      ctx.lineTo(-5, -20);
      ctx.lineTo(0, -14);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fff5ef";
      ctx.fillRect(9, -3, 11, 4);
      ctx.strokeStyle = "#ffc9b0";
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
    }
  }
  ctx.restore();

  if (enemy.action === "attack" && enemy.type !== "boss") {
    ctx.strokeStyle = "rgba(255, 241, 194, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.dir * 18, enemy.y - 2, 13, -1.1, 1.1);
    ctx.stroke();
  }
  if (enemy.action === "dash") {
    ctx.strokeStyle = "rgba(255, 225, 185, 0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.dir * 10, enemy.y);
    ctx.lineTo(enemy.x - enemy.dir * 30, enemy.y);
    ctx.stroke();
  }
  if (enemy.stunFrames > 0) {
    ctx.strokeStyle = "#8deeff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, halfSize + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (enemy.type === "boss") {
    ctx.fillStyle = "#fff1c2";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(enemy.bossName, enemy.x, enemy.y - 49 - bob);
  }
};
