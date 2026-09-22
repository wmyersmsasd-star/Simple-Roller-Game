/* =====================================================================
   config.js  --  ALL THE NUMBERS.

   This is the first file to open if you want to change how the game
   FEELS. Every number here is safe to change. Change one at a time and
   play the game after each change.
   ===================================================================== */

var CONFIG = {

  // --- the world grid -------------------------------------------------
  TILE: 40,           // how many pixels wide and tall one grid square is
  ROWS: 10,           // how many rows tall every level piece is
  PIECE_COLS: 8,      // how many columns wide every level piece is

  // --- the screen -----------------------------------------------------
  CANVAS_W: 800,
  CANVAS_H: 400,

  // --- how the player moves -------------------------------------------
  MOVE_SPEED: 4,      // pixels per frame left and right
  JUMP_POWER: 15,     // how hard the jump pushes UP. bigger = higher
  GRAVITY: 0.8,       // how hard the world pulls DOWN. bigger = heavier
  MAX_FALL: 16,       // fastest the player is allowed to fall

  // --- the player's size ----------------------------------------------
  PLAYER_SIZE: 32,    // the player collides as a 32x32 box
  PLAYER_RADIUS: 16,  // ...but is DRAWN as a circle this big

  // --- drawing --------------------------------------------------------
  LINE_WIDTH: 3,      // thickness of every black outline
  DOT_DISTANCE: 0.55, // how far the off-center dot sits from the middle
                      // 0 = dead center, 1 = right on the edge

  // --- rules ----------------------------------------------------------
  START_LEVEL: 0      // which level in data/levels.json to load first
     DASH_SPEED: 8,           // pixels per frame while dashing  
  DASH_FRAMES: 10,         // how long a dash lasts  
  DASH_COOLDOWN_FRAMES: 120, // 120 frames = 2 seconds before you can dash again  
  BOUNCE_FRAMES: 10,       // how long the bounce-back lasts  
  BOUNCE_SPEED: 3,         // pixels per frame of bounce-back  
  BOUNCE_UP: 8             // upward kick when you smash a block  

};
