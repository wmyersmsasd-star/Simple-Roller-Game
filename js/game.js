/* =====================================================================
   game.js  --  THE RULES AND THE LOOP.

   The game is always in exactly ONE mode: "playing", "dead", or "won".
   Which mode it is in decides what happens each frame.

   The loop runs about 60 times a second, forever. Every time it runs it
   does the same two things: UPDATE (change the numbers) and DRAW (show
   the numbers).
   ===================================================================== */

var Game = {
  mode: "playing",   // "playing", "dead", or "won"
  levelNumber: 0,
  restartWasDown: false,
  coins: 0
};

Game.startLevel = function (levelNumber) {
  Game.levelNumber = levelNumber;
  Level.build(levelNumber);
  Enemies.reset();
  Enemies.loadFromLevel();
  Player.reset();
  Effects.reset();
  SkyBeam.reset();
  Game.mode = "playing";
  Game.showMessage("");
  Game.updateShopUi();
};

Game.getCoinReward = function () {
  return Math.round(10 * Math.pow(1.5, Math.max(0, Game.levelNumber)));
};

Game.addCoins = function (amount) {
  Game.coins = Game.coins + Math.max(0, amount);
  Player.updateHud();
};

Game.getDamageUpgradeCost = function () {
  return Math.round(CONFIG.SHOP_INITIAL_COST * Math.pow(CONFIG.SHOP_COST_GROWTH, Player.damageUpgradeLevel));
};

Game.getHealthUpgradeCost = function () {
  return Math.round(CONFIG.SHOP_INITIAL_COST * Math.pow(CONFIG.SHOP_COST_GROWTH, Player.healthUpgradeLevel));
};

Game.trySpendCoins = function (amount) {
  if (Game.coins < amount) { return false; }
  Game.coins = Game.coins - amount;
  Player.updateHud();
  return true;
};

Game.updateShopUi = function () {
  var damageBtn = document.getElementById("damage-upgrade");
  var healthBtn = document.getElementById("health-upgrade");

  if (damageBtn) {
    damageBtn.textContent = "Upgrade Damage (" + Game.getDamageUpgradeCost() + " coins)";
    damageBtn.disabled = Game.coins < Game.getDamageUpgradeCost();
  }
  if (healthBtn) {
    healthBtn.textContent = "Upgrade Health (" + Game.getHealthUpgradeCost() + " coins)";
    healthBtn.disabled = Game.coins < Game.getHealthUpgradeCost();
  }
};

Game.buyDamageUpgrade = function () {
  var cost = Game.getDamageUpgradeCost();
  if (!Game.trySpendCoins(cost)) {
    Game.showMessage("Not enough coins for Damage upgrade.");
    return;
  }
  Player.damageUpgradeLevel = Player.damageUpgradeLevel + 1;
  Game.showMessage("Damage upgraded!");
  Game.updateShopUi();
};

Game.buyHealthUpgrade = function () {
  var cost = Game.getHealthUpgradeCost();
  if (!Game.trySpendCoins(cost)) {
    Game.showMessage("Not enough coins for Health upgrade.");
    return;
  }
  Player.healthUpgradeLevel = Player.healthUpgradeLevel + 1;
  Player.maxHealth = Player.getMaxHealth();
  Player.health = Player.maxHealth;
  Player.updateHud();
  Game.showMessage("Health upgraded!");
  Game.updateShopUi();
};

Game.showMessage = function (text) {
  document.getElementById("message").textContent = text;
};

// --- ONE FRAME --------------------------------------------------------
Game.update = function () {

  var restartPressed = Input.restart && !Game.restartWasDown;
  Game.restartWasDown = Input.restart;

  if (restartPressed) {
    if (Game.mode === "won") {
      var nextLevel = Game.levelNumber + 1;
      if (nextLevel < Level.levels.length) {
        Game.startLevel(nextLevel);
      } else {
        Game.startLevel(0);
      }
    } else {
      Game.startLevel(Game.levelNumber);
    }
    return;
  }

  // If we are not playing, nothing moves. We just wait for R.
  if (Game.mode !== "playing") { return; }

  SkyBeam.update();
  Player.update();
  Enemies.update();
  Effects.update();
  Player.updateHud();

  if (Player.isDead()) {
    Game.mode = "dead";
    Game.showMessage("You hit something. Press R to try again.");
    return;
  }

  if (Player.hasWon() && Enemies.list.length === 0) {
    Game.mode = "won";
    if (Game.levelNumber < Level.levels.length - 1) {
      Game.showMessage("Level clear! Press R for the next level.");
    } else {
      Game.showMessage("All levels clear! Press R to play again.");
    }
    return;
  }
};

// --- THE LOOP ITSELF --------------------------------------------------
Game.loop = function () {
  Game.update();
  Draw.updateCamera();
  Draw.everything();
  window.requestAnimationFrame(Game.loop);
};
