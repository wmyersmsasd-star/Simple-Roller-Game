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
  return 1 + Math.max(0, Game.levelNumber) * CONFIG.ENEMY_SPEED_PER_LEVEL;
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
        y: row * CONFIG.TILE + CONFIG.TILE / 2,
        dir: 1,
        cooldown: 40,
        dashDistanceLeft: 0,
        dashDirection: 1,
        dashHit: false,
        lastPlayerDash: 0,
        stunFrames: 0,
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
        enemy.y = enemy.baseY - 2;
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
      continue;
    }

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
      }
      if (Math.abs(dx) < 260 && Math.abs(dy) < 80 && enemy.cooldown <= 0) {
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
  var speed = 5 + Level.difficultyMultiplier;
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

Enemies.updateMeleeDash = function (enemy) {
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

  enemy.dir = dx > 0 ? 1 : -1;
  var nextX = enemy.x + enemy.dir * CONFIG.ENEMY_MOVE_SPEED * Enemies.speedMultiplier();
  var enemySize = enemy.size || 24;
  var enemyLeft = nextX - enemySize / 2;
  var enemyTop = enemy.y - enemySize / 2;

  if (enemyLeft < 0 || enemyLeft + enemySize > Level.pixelWidth() ||
      Collide.hitsSolid(enemyLeft, enemyTop, enemySize, enemySize)) {
    return;
  }

  enemy.x = nextX;
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

    if (enemy.type === "boss") {
      ctx.fillStyle = Level.colors.melee;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 31, 29, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = Level.colors.outline;
      ctx.beginPath();
      ctx.moveTo(centerX - 22, centerY - 18);
      ctx.lineTo(centerX - 34, centerY - 38);
      ctx.lineTo(centerX - 8, centerY - 25);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(centerX + 22, centerY - 18);
      ctx.lineTo(centerX + 34, centerY - 38);
      ctx.lineTo(centerX + 8, centerY - 25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff1c2";
      ctx.fillRect(centerX - 15, centerY - 8, 8, 6);
      ctx.fillRect(centerX + 7, centerY - 8, 8, 6);
      ctx.strokeStyle = "#fff0c2";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 31, 29, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff1c2";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(enemy.bossName, centerX, centerY - 49);
    } else if (enemy.type === "ranged") {
      ctx.fillStyle = Level.colors.ranged;
      ctx.fillRect(centerX - 12, centerY - 12, 24, 24);
      ctx.fillStyle = "#0d1c2b";
      ctx.fillRect(centerX - 8, centerY - 4, 4, 4);
      ctx.fillRect(centerX + 4, centerY - 4, 4, 4);
      ctx.strokeStyle = "#e2edff";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 12, centerY - 12, 24, 24);
    } else {
      ctx.fillStyle = Level.colors.melee;
      ctx.fillRect(centerX - 12, centerY - 12, 24, 24);
      ctx.fillStyle = "#fff5ef";
      ctx.fillRect(centerX + 10, centerY - 4, 14, 4);
      if (enemy.attackTimer > 0) {
        ctx.fillStyle = "#ffd5bf";
        ctx.fillRect(centerX + 20, centerY - 6, 12, 8);
      }
      ctx.strokeStyle = "#ffc9b0";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 12, centerY - 12, 24, 24);
    }
    if (enemy.stunFrames > 0) {
      ctx.strokeStyle = "#8deeff";
      ctx.lineWidth = 3;
      ctx.strokeRect(centerX - 15, centerY - 15, 30, 30);
    }

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
