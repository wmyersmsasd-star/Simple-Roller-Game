var Effects = {
  numbers: [],
  bursts: [],
  flash: 0
};

Effects.reset = function () {
  Effects.numbers = [];
  Effects.bursts = [];
  Effects.flash = 0;
};

Effects.damageNumber = function (x, y, amount, color) {
  Effects.numbers.push({
    x: x,
    y: y,
    amount: amount,
    color: color,
    life: 36,
    maxLife: 36
  });
};

Effects.hitBurst = function (x, y, color) {
  Effects.bursts.push({
    x: x,
    y: y,
    color: color,
    life: 14,
    maxLife: 14,
    radius: 5
  });
};

Effects.update = function () {
  for (var i = 0; i < Effects.numbers.length; i++) {
    var number = Effects.numbers[i];
    number.y = number.y - 0.7;
    number.life = number.life - 1;
  }

  Effects.numbers = Effects.numbers.filter(function (number) {
    return number.life > 0;
  });

  for (var j = 0; j < Effects.bursts.length; j++) {
    var burst = Effects.bursts[j];
    burst.life = burst.life - 1;
    burst.radius = burst.radius + 1.8;
  }

  Effects.bursts = Effects.bursts.filter(function (burst) {
    return burst.life > 0;
  });

  if (Effects.flash > 0) { Effects.flash = Effects.flash - 1; }
};

Effects.draw = function () {
  var ctx = Draw.ctx;

  for (var i = 0; i < Effects.bursts.length; i++) {
    var burst = Effects.bursts[i];
    var burstAlpha = burst.life / burst.maxLife;
    ctx.strokeStyle = burst.color.replace(/[\d.]+\)$/, burstAlpha + ")");
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (var ray = 0; ray < 8; ray++) {
      var angle = ray * Math.PI / 4;
      var innerRadius = burst.radius * 0.45;
      var outerRadius = burst.radius;
      ctx.moveTo(burst.x + Math.cos(angle) * innerRadius, burst.y + Math.sin(angle) * innerRadius);
      ctx.lineTo(burst.x + Math.cos(angle) * outerRadius, burst.y + Math.sin(angle) * outerRadius);
    }
    ctx.stroke();
  }

  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (var j = 0; j < Effects.numbers.length; j++) {
    var number = Effects.numbers[j];
    var numberAlpha = number.life / number.maxLife;
    ctx.fillStyle = number.color.replace(/[\d.]+\)$/, numberAlpha + ")");
    ctx.fillText("-" + number.amount, number.x, number.y);
  }
};
