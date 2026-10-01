/* =====================================================================
   main.js  --  THE STARTING LINE.

   This is the smallest file in the project and it runs last. All it
   does is: set up the screen, load the data files, build the first
   level, and start the loop.

   You will almost never need to change this file.
   ===================================================================== */

Draw.setup();
SkyBeam.setup();

document.getElementById("damage-upgrade").addEventListener("click", Game.buyDamageUpgrade);
document.getElementById("health-upgrade").addEventListener("click", Game.buyHealthUpgrade);
document.getElementById("start-button").addEventListener("click", function () {
  if (Game.mode !== "title") { return; }
  Game.mode = "playing";
  document.body.classList.remove("home-active");
  document.getElementById("home-screen").setAttribute("aria-hidden", "true");
});

Level.loadData(function () {
  Game.startLevel(CONFIG.START_LEVEL);
  Game.mode = "title";
  document.getElementById("start-button").disabled = false;
  document.getElementById("start-button").textContent = "Start Game";
  document.getElementById("home-status").textContent = "Level ready";
  Game.loop();
});
