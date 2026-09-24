var Enemies = {
  list: [],
  projectiles: []
};

Enemies.reset = function () {
  Enemies.list = [];
  Enemies.projectiles = [];
};

Enemies.loadFromLevel = function () {
  for (var row = 0; row < Level.grid.length; row++) {
    for (var col = 0; col < Level.grid[row].length; col++) {
      var tile = Level.charAt(col, row);
      if (tile !== "R" && tile !== "M") { continue; }

      var enemy = {
        type: tile === "R" ? "ranged" : "melee",
        x: col * CONFIG.TILE + CONFIG.TILE / 2,
        y: row * CONFIG.TILE + CONFIG.TILE / 2,
        dir: 1,
        cooldown: 40,
        attackTimer: 0,
        health: CONFIG.ENEMY_MAX_HEALTH,
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

  for (var j = 0; j < Enemies.list.length; j++) {
    var enemy = Enemies.list[j];
    var dx = Player.x - enemy.x;
    var dy = Player.y - enemy.y;

    if (enemy.health <= 0) {
      continue;
    }

    if (enemy.type === "ranged") {
      enemy.cooldown = enemy.cooldown - 1;
      if (Math.abs(dx) > CONFIG.TILE * 5) {
        Enemies.followPlayer(enemy, dx);
      }
      if (Math.abs(dx) < 260 && Math.abs(dy) < 80 && enemy.cooldown <= 0) {
        enemy.cooldown = 90;
        var projectileSpeed = 4;
        var shotDx = Math.abs(dx) > 0 ? dx / Math.abs(dx) : 1;
        var shotDy = dy / Math.max(Math.abs(dx), 1);
        Enemies.projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: shotDx * projectileSpeed,
          vy: shotDy * projectileSpeed,
          radius: 5,
          life: 90,
          damage: 10
        });
      }
      continue;
    }

    enemy.cooldown = Math.max(0, enemy.cooldown - 1);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - 1);

    Enemies.followPlayer(enemy, dx);

    if (Math.abs(dx) < 72 && Math.abs(dy) < 28) {
      enemy.dir = dx >= 0 ? 1 : -1;
      if (enemy.cooldown <= 0) {
        enemy.cooldown = 45;
        enemy.attackTimer = 12;
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
  Enemies.list = Enemies.list.filter(function (enemy) {
    return enemy.health > 0;
  });
};

Enemies.followPlayer = function (enemy, dx) {
  if (Math.abs(dx) <= 8) { return; }

  enemy.dir = dx > 0 ? 1 : -1;
  var nextX = enemy.x + enemy.dir * 0.7;
  var enemySize = 24;
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
      Player.takeDamage(shot.damage || 10);
      Enemies.projectiles.splice(i, 1);
      i = i - 1;
    }
  }

  for (var j = 0; j < Enemies.list.length; j++) {
    var enemy = Enemies.list[j];
    if (enemy.type !== "melee") { continue; }

    var enemyLeft = enemy.x - 16;
    var enemyRight = enemy.x + 16;
    var enemyTop = enemy.y - 16;
    var enemyBottom = enemy.y + 16;

    if (enemy.attackTimer > 0 && enemyRight > playerLeft && enemyLeft < playerRight &&
        enemyBottom > playerTop && enemyTop < playerBottom) {
      Player.takeDamage(20);
      enemy.attackTimer = 0;
      enemy.cooldown = 30;
    }
  }
};

Enemies.damageFromDash = function () {
  for (var i = 0; i < Enemies.list.length; i++) {
    var enemy = Enemies.list[i];
    if (enemy.health <= 0) { continue; }

    var enemyLeft = enemy.x - 16;
    var enemyRight = enemy.x + 16;
    var enemyTop = enemy.y - 16;
    var enemyBottom = enemy.y + 16;

    if (Player.x + CONFIG.PLAYER_SIZE > enemyLeft && Player.x < enemyRight &&
        Player.y + CONFIG.PLAYER_SIZE > enemyTop && Player.y < enemyBottom) {
      enemy.health = enemy.health - 15;
      if (enemy.health <= 0) {
        enemy.health = 0;
      }
    }
  }
};

Enemies.hitsPlayer = function () {
  return false;
};

Enemies.draw = function () {
  var ctx = Draw.ctx;

  for (var i = 0; i < Enemies.projectiles.length; i++) {
    var shot = Enemies.projectiles[i];
    ctx.fillStyle = "#ff7a59";
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (var j = 0; j < Enemies.list.length; j++) {
    var enemy = Enemies.list[j];
    var centerX = enemy.x;
    var centerY = enemy.y;

    if (enemy.type === "ranged") {
      ctx.fillStyle = "#64d7ff";
      ctx.fillRect(centerX - 12, centerY - 12, 24, 24);
      ctx.fillStyle = "#0d1c2b";
      ctx.fillRect(centerX - 8, centerY - 4, 4, 4);
      ctx.fillRect(centerX + 4, centerY - 4, 4, 4);
      ctx.strokeStyle = "#e2edff";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 12, centerY - 12, 24, 24);
    } else {
      ctx.fillStyle = "#ff7b54";
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
  }
};
