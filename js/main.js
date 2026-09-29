/* =====================================================================
   main.js  --  THE STARTING LINE.

   This is the smallest file in the project and it runs last. All it
   does is: set up the screen, load the data files, build the first
   level, and start the loop.

   You will almost never need to change this file.
   ===================================================================== */

Draw.setup();
SkyBeam.setup();

document.getElementById("shop-button").addEventListener("click", function () {
  if (Game.mode === "shop") {
    Game.leaveShop();
  } else {
    Game.enterShop();
  }
});
document.getElementById("damage-upgrade").addEventListener("click", Game.buyDamageUpgrade);
document.getElementById("health-upgrade").addEventListener("click", Game.buyHealthUpgrade);
document.getElementById("leave-shop").addEventListener("click", Game.leaveShop);

Level.loadData(function () {
  Game.startLevel(CONFIG.START_LEVEL);
  Game.loop();
});
