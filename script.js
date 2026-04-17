const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const speedEl = document.getElementById('speed');
const lapEl = document.getElementById('lap');
const timerEl = document.getElementById('timer');
const engineSound = document.getElementById('engineSound');
const crashSound = document.getElementById('crashSound');
const backgroundMusic = document.getElementById('backgroundMusic');

const TRACK_WIDTH = 100;
const TRACK_CENTER = { x: 480, y: 320 };
const TRACK_RADIUS = 230;
const TRACK_PATH = new Path2D();
TRACK_PATH.moveTo(160, 460);
TRACK_PATH.bezierCurveTo(120, 260, 250, 140, 470, 170);
TRACK_PATH.bezierCurveTo(640, 200, 760, 360, 700, 520);
TRACK_PATH.bezierCurveTo(620, 620, 320, 600, 160, 460);
TRACK_PATH.closePath();
const TRACK_CENTERLINE = new Path2D(TRACK_PATH);
const FINISH_LINE = { x: 160, y: 430, height: 80 };
let keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let lap = 0;
let startTime = null;
let finished = false;
let bestTime = null;
let hasStarted = false;
let passedFinish = false;
let lastLapTime = 0;
let animationTime = 0;

const car = {
  x: 320,
  y: 600,
  angle: -Math.PI / 2,
  speed: 0,
  maxSpeed: 6.5,
  turnSpeed: 0.045,
  acceleration: 0.18,
  friction: 0.06,
  width: 80,
  height: 40,
};

const trackMask = document.createElement('canvas');
trackMask.width = canvas.width;
trackMask.height = canvas.height;
const maskCtx = trackMask.getContext('2d');

function drawTrack(ctx, withMask = false) {
  ctx.save();
  // Background grass
  ctx.fillStyle = '#4ca64c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sky and distant hills
  ctx.fillStyle = '#aadaff';
  ctx.fillRect(0, 0, canvas.width, 120);
  ctx.fillStyle = '#2a6f5b';
  ctx.beginPath();
  ctx.moveTo(0, 140);
  ctx.quadraticCurveTo(220, 80, 450, 120);
  ctx.quadraticCurveTo(620, 160, 960, 120);
  ctx.lineTo(960, 0);
  ctx.lineTo(0, 0);
  ctx.fill();

  // Draw crowd
  drawCrowd(ctx);
  drawAnimals(ctx);
  drawPitStop(ctx);
  drawAds(ctx);

  // Track fill
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#7b7b7b';
  ctx.lineWidth = TRACK_WIDTH;
  ctx.stroke(TRACK_PATH);

  ctx.strokeStyle = '#4f4f4f';
  ctx.lineWidth = TRACK_WIDTH - 24;
  ctx.stroke(TRACK_PATH);

  // Track decorations
  drawMushroomSign(ctx, 120, 320);
  drawBrickWall(ctx, 840, 280);
  drawQuestionBlock(ctx, 200, 120);
  drawQuestionBlock(ctx, 600, 100);
  drawFinishLine(ctx);
  drawRoadMarkings(ctx);
  drawAnimals(ctx);

  if (withMask) {
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = TRACK_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(TRACK_PATH);
    ctx.restore();
  }

  ctx.restore();
}

function drawRoadMarkings(ctx) {
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 20]);
  ctx.lineCap = 'round';
  ctx.stroke(TRACK_CENTERLINE);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCrowd(ctx) {
  ctx.save();
  // Draw fans around the track - even more fans including special ones
  const fans = [
    { x: 20, y: 200, color: '#ff6b6b' },
    { x: 60, y: 180, color: '#4ecdc4' },
    { x: 100, y: 160, color: '#45b7d1' },
    { x: 140, y: 140, color: '#f9ca24' },
    { x: 180, y: 120, color: '#f0932b' },
    { x: 220, y: 100, color: '#eb4d4b' },
    { x: 260, y: 80, color: '#6c5ce7' },
    { x: 300, y: 60, color: '#a29bfe' },
    { x: 20, y: 400, color: '#fd79a8' },
    { x: 60, y: 420, color: '#00b894' },
    { x: 100, y: 440, color: '#00cec9' },
    { x: 140, y: 460, color: '#ffeaa7' },
    { x: 180, y: 480, color: '#fdcb6e' },
    { x: 220, y: 500, color: '#e17055' },
    { x: 260, y: 520, color: '#d63031' },
    { x: 300, y: 540, color: '#0984e3' },
    { x: 700, y: 200, color: '#00b894' },
    { x: 740, y: 180, color: '#00cec9' },
    { x: 780, y: 160, color: '#ffeaa7' },
    { x: 820, y: 140, color: '#fdcb6e' },
    { x: 860, y: 120, color: '#e17055' },
    { x: 900, y: 100, color: '#d63031' },
    { x: 940, y: 80, color: '#0984e3' },
    { x: 700, y: 400, color: '#6c5ce7' },
    { x: 740, y: 420, color: '#a29bfe' },
    { x: 780, y: 440, color: '#fd79a8' },
    { x: 820, y: 460, color: '#00b894' },
    { x: 860, y: 480, color: '#00cec9' },
    { x: 900, y: 500, color: '#ffeaa7' },
    { x: 940, y: 520, color: '#fdcb6e' },
    // More fans
    { x: 50, y: 300, color: '#ff7675' },
    { x: 90, y: 280, color: '#74b9ff' },
    { x: 130, y: 260, color: '#a29bfe' },
    { x: 170, y: 240, color: '#fd79a8' },
    { x: 210, y: 220, color: '#e17055' },
    { x: 250, y: 200, color: '#0984e3' },
    { x: 290, y: 180, color: '#00b894' },
    { x: 330, y: 160, color: '#ffeaa7' },
    { x: 370, y: 140, color: '#fdcb6e' },
    { x: 410, y: 120, color: '#e84393' },
    { x: 450, y: 100, color: '#6c5ce7' },
    { x: 490, y: 80, color: '#a29bfe' },
    { x: 530, y: 60, color: '#fd79a8' },
    { x: 570, y: 40, color: '#00b894' },
    { x: 50, y: 500, color: '#ffeaa7' },
    { x: 90, y: 520, color: '#fdcb6e' },
    { x: 130, y: 540, color: '#e17055' },
    { x: 170, y: 560, color: '#d63031' },
    { x: 210, y: 580, color: '#0984e3' },
    { x: 250, y: 600, color: '#00b894' },
    { x: 290, y: 620, color: '#00cec9' },
    { x: 330, y: 640, color: '#ffeaa7' },
    { x: 370, y: 660, color: '#fdcb6e' },
    { x: 410, y: 680, color: '#e17055' },
    { x: 450, y: 700, color: '#d63031' },
    { x: 490, y: 720, color: '#0984e3' },
    { x: 530, y: 740, color: '#00b894' },
    // Special fan: Manatee in Ferrari clothes
    { x: 150, y: 350, type: 'manatee' },
  ];

  fans.forEach((fan, index) => {
    if (fan.type === 'manatee') {
      // Special manatee fan in Ferrari clothes
      const wave = Math.sin(animationTime * 2 + index * 0.5) * 2;
      // Body - round like manatee
      ctx.fillStyle = '#808080'; // Gray like manatee
      ctx.beginPath();
      ctx.ellipse(fan.x, fan.y - 5, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ferrari red clothes
      ctx.fillStyle = '#D40000';
      ctx.fillRect(fan.x - 6, fan.y - 2, 12, 10);
      // Arms waving - short flippers
      ctx.fillRect(fan.x - 10, fan.y + wave, 4, 6);
      ctx.fillRect(fan.x + 6, fan.y - wave, 4, 6);
      // Head - round
      ctx.fillStyle = '#A0A0A0';
      ctx.beginPath();
      ctx.arc(fan.x, fan.y - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(fan.x - 2, fan.y - 13, 1, 0, Math.PI * 2);
      ctx.arc(fan.x + 2, fan.y - 13, 1, 0, Math.PI * 2);
      ctx.fill();
      // Ferrari logo on chest
      ctx.fillStyle = '#FFD700';
      ctx.font = '4px Arial';
      ctx.fillText('F', fan.x - 2, fan.y + 2);
    } else {
      const wave = Math.sin(animationTime * 2 + index * 0.5) * 2;
      // Body
      ctx.fillStyle = fan.color;
      ctx.fillRect(fan.x - 5, fan.y - 10, 10, 15);
      // Arms waving
      ctx.fillRect(fan.x - 8, fan.y - 5 + wave, 3, 8);
      ctx.fillRect(fan.x + 5, fan.y - 5 - wave, 3, 8);
      // Head
      ctx.fillStyle = '#fdbcb4';
      ctx.beginPath();
      ctx.arc(fan.x, fan.y - 15, 5, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(fan.x - 2, fan.y - 16, 1, 0, Math.PI * 2);
      ctx.arc(fan.x + 2, fan.y - 16, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawAnimals(ctx) {
  ctx.save();
  // Draw animals on the track
  const animals = [
    { x: 300, y: 400, type: 'turtle' },
    { x: 600, y: 300, type: 'goomba' },
    { x: 800, y: 450, type: 'koopa' },
    { x: 400, y: 550, type: 'turtle' },
  ];

  animals.forEach(animal => {
    if (animal.type === 'turtle') {
      // Simple turtle: shell
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(animal.x, animal.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(animal.x, animal.y, 10, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = '#8B4513';
      [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(animal.x + dx, animal.y + dy, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (animal.type === 'goomba') {
      // Goomba: brown mushroom head
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(animal.x - 10, animal.y - 15, 20, 15);
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(animal.x - 5, animal.y - 10, 2, 0, Math.PI * 2);
      ctx.arc(animal.x + 5, animal.y - 10, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(animal.x - 3, animal.y - 8, 1, 0, Math.PI * 2);
      ctx.arc(animal.x + 3, animal.y - 8, 1, 0, Math.PI * 2);
      ctx.fill();
      // Feet
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(animal.x - 12, animal.y, 6, 8);
      ctx.fillRect(animal.x + 6, animal.y, 6, 8);
    } else if (animal.type === 'koopa') {
      // Koopa: shell
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(animal.x, animal.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#32CD32';
      ctx.beginPath();
      ctx.arc(animal.x, animal.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(animal.x, animal.y - 15, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawPitStop(ctx) {
  ctx.save();
  // Draw pit stop area - connected to track
  const pitX = 450;
  const pitY = 250;
  
  // Pit road leading from track - connecting to track
  ctx.fillStyle = '#555';
  ctx.fillRect(350, 350, 150, 40); // Road from track to pit
  ctx.fillRect(pitX - 50, pitY + 100, 200, 40); // Pit road surface
  ctx.fillStyle = '#FFF';
  ctx.fillRect(360, 365, 130, 2); // Center line
  ctx.fillRect(360, 373, 130, 2); // Center line
  ctx.fillRect(pitX - 40, pitY + 115, 180, 2); // Center line
  ctx.fillRect(pitX - 40, pitY + 123, 180, 2); // Center line
  
  // Pit area background - concrete
  ctx.fillStyle = '#888';
  ctx.fillRect(pitX, pitY, 150, 120);
  
  // Pit stalls - marked areas
  ctx.fillStyle = '#666';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(pitX + 10 + i * 35, pitY + 10, 30, 100);
    // White lines marking stalls
    ctx.fillStyle = '#FFF';
    ctx.fillRect(pitX + 8 + i * 35, pitY + 10, 2, 100);
    ctx.fillRect(pitX + 40 + i * 35, pitY + 10, 2, 100);
    ctx.fillStyle = '#666';
  }
  
  // Pit building
  ctx.fillStyle = '#999';
  ctx.fillRect(pitX + 160, pitY, 80, 60);
  ctx.fillStyle = '#BBB';
  ctx.fillRect(pitX + 170, pitY + 10, 60, 40);
  
  // Roof
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(pitX + 155, pitY);
  ctx.lineTo(pitX + 200, pitY - 15);
  ctx.lineTo(pitX + 245, pitY);
  ctx.closePath();
  ctx.fill();
  
  // Door
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(pitX + 190, pitY + 20, 20, 30);
  
  // Windows
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(pitX + 175, pitY + 15, 12, 8);
  ctx.fillRect(pitX + 215, pitY + 15, 12, 8);
  
  // Fuel station
  ctx.fillStyle = '#FF4444';
  ctx.fillRect(pitX + 250, pitY + 20, 40, 30);
  ctx.fillStyle = '#FFF';
  ctx.font = '10px Arial';
  ctx.fillText('FUEL', pitX + 255, pitY + 35);
  
  // Parked cars in stalls
  // Car 1 - in pit
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(pitX + 15, pitY + 20, 25, 12);
  ctx.fillStyle = '#000';
  ctx.fillRect(pitX + 18, pitY + 32, 4, 6);
  ctx.fillRect(pitX + 28, pitY + 32, 4, 6);
  
  // Car 2
  ctx.fillStyle = '#0000FF';
  ctx.fillRect(pitX + 50, pitY + 20, 25, 12);
  ctx.fillStyle = '#000';
  ctx.fillRect(pitX + 53, pitY + 32, 4, 6);
  ctx.fillRect(pitX + 63, pitY + 32, 4, 6);
  
  // Car 3
  ctx.fillStyle = '#FFFF00';
  ctx.fillRect(pitX + 85, pitY + 20, 25, 12);
  ctx.fillStyle = '#000';
  ctx.fillRect(pitX + 88, pitY + 32, 4, 6);
  ctx.fillRect(pitX + 98, pitY + 32, 4, 6);
  
  // Car 4
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(pitX + 120, pitY + 20, 25, 12);
  ctx.fillStyle = '#000';
  ctx.fillRect(pitX + 123, pitY + 32, 4, 6);
  ctx.fillRect(pitX + 133, pitY + 32, 4, 6);
  
  // Mechanics/tools area
  ctx.fillStyle = '#444';
  ctx.fillRect(pitX + 160, pitY + 70, 80, 40);
  ctx.fillStyle = '#FFF';
  ctx.font = '8px Arial';
  ctx.fillText('TOOLS', pitX + 175, pitY + 90);
  
  // Warning lights
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.arc(pitX + 10, pitY + 5, 3, 0, Math.PI * 2);
  ctx.arc(pitX + 140, pitY + 5, 3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawAds(ctx) {
  ctx.save();
  // Draw advertisements around the track
  
  // Rolex ad - large billboard
  ctx.fillStyle = '#000';
  ctx.fillRect(50, 150, 80, 40);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('ROLEX', 60, 170);
  ctx.font = '8px Arial';
  ctx.fillText('Precision Time', 55, 185);
  
  // Qatar Airways ad
  ctx.fillStyle = '#8B0000';
  ctx.fillRect(800, 200, 100, 30);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('QATAR AIRWAYS', 805, 215);
  ctx.font = '6px Arial';
  ctx.fillText('Fly with the best', 810, 225);
  
  // Other ads
  ctx.fillStyle = '#FF4500';
  ctx.fillRect(200, 50, 60, 25);
  ctx.fillStyle = '#FFF';
  ctx.font = '8px Arial';
  ctx.fillText('ENERGY DRINK', 205, 65);
  
  ctx.fillStyle = '#000080';
  ctx.fillRect(600, 500, 70, 30);
  ctx.fillStyle = '#FFF';
  ctx.font = '9px Arial';
  ctx.fillText('FAST CARS', 610, 515);
  ctx.font = '6px Arial';
  ctx.fillText('Drive faster', 615, 525);
  
  ctx.restore();
}

function drawMushroomSign(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#ffcf5f';
  ctx.beginPath();
  ctx.rect(x - 20, y - 20, 40, 40);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y - 2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7002c';
  ctx.beginPath();
  ctx.arc(x - 5, y - 7, 4, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrickWall(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#b85a12';
  ctx.fillRect(x - 44, y - 40, 90, 65);
  ctx.strokeStyle = '#813f08';
  ctx.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.strokeRect(x - 44 + 18 * col, y - 40 + 16 * row, 18, 16);
    }
  }
  ctx.restore();
}

function drawQuestionBlock(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(x - 24, y - 24, 48, 48);
  ctx.strokeStyle = '#d49700';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 24, y - 24, 48, 48);
  ctx.fillStyle = '#6b3e00';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y);
  ctx.restore();
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFinishLine(ctx) {
  ctx.save();
  ctx.translate(FINISH_LINE.x, FINISH_LINE.y);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-4, 0, 8, FINISH_LINE.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(-4, 20, 8, 10);
  ctx.fillRect(-4, 50, 8, 10);
  ctx.restore();
}

function drawCar() {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // Main body - ultra aerodynamic F1 style, very low and very long
  ctx.fillStyle = '#ee2c2c'; // Ferrari red
  ctx.strokeStyle = '#991111';
  ctx.lineWidth = 1;
  
  // Car chassis - extremely low, long and narrow like real F1
  ctx.beginPath();
  ctx.moveTo(-car.width / 2, -car.height / 2 + 15); // Nose
  ctx.lineTo(-car.width / 2 + 25, -car.height / 2 + 3); // Front slope
  ctx.lineTo(car.width / 2 - 25, -car.height / 2 + 3); // Front slope
  ctx.lineTo(car.width / 2, -car.height / 2 + 15); // Nose
  ctx.lineTo(car.width / 2, car.height / 2 - 8); // Side
  ctx.lineTo(car.width / 2 - 20, car.height / 2 - 2); // Rear slope
  ctx.lineTo(-car.width / 2 + 20, car.height / 2 - 2); // Rear slope
  ctx.lineTo(-car.width / 2, car.height / 2 - 8); // Side
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sidepods - cooling for brakes and engine
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(-car.width / 2 + 15, -car.height / 2 + 8, 15, car.height - 10);
  ctx.fillRect(car.width / 2 - 30, -car.height / 2 + 8, 15, car.height - 10);

  // Engine cover - black with air intakes
  ctx.fillStyle = '#000';
  ctx.fillRect(-car.width / 2 + 20, car.height / 2 - 15, car.width - 40, 13);
  
  // Air intake slots on engine cover
  ctx.fillStyle = '#333';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-car.width / 2 + 25 + i * 6, car.height / 2 - 12, 4, 8);
  }

  // Cockpit - tiny and aerodynamic
  ctx.fillStyle = '#96d6ff';
  ctx.beginPath();
  ctx.ellipse(0, -car.height / 2 + 12, car.width / 2 - 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Driver helmet - barely visible
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.ellipse(0, -car.height / 2 + 10, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front wing - complex multi-element F1 style
  ctx.fillStyle = '#CCC';
  ctx.fillRect(-car.width / 2 - 10, -car.height / 2 + 12, car.width + 20, 2);
  ctx.fillRect(-car.width / 2 - 8, -car.height / 2 + 8, car.width + 16, 2);
  ctx.fillRect(-car.width / 2 - 6, -car.height / 2 + 4, car.width + 12, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(-car.width / 2 - 4, -car.height / 2 + 1, car.width + 8, 1);

  // Bargeboards - aerodynamic elements
  ctx.fillStyle = '#666';
  ctx.fillRect(-car.width / 2 + 10, -car.height / 2 + 6, 8, car.height - 8);
  ctx.fillRect(car.width / 2 - 18, -car.height / 2 + 6, 8, car.height - 8);

  // Rear wing - massive DRS adjustable F1 style
  ctx.fillStyle = '#CCC';
  ctx.fillRect(-car.width / 2 + 15, car.height / 2 - 20, car.width - 30, 10);
  ctx.fillRect(-car.width / 2 + 18, car.height / 2 - 18, car.width - 36, 6);
  ctx.fillStyle = '#000';
  ctx.fillRect(-car.width / 2 + 20, car.height / 2 - 16, car.width - 40, 2);

  // Wheels - enormous F1 tires (even larger now)
  ctx.fillStyle = '#222';
  const wheelPositions = [
    [-car.width / 2 + 12, -car.height / 2 + 20], // Front left
    [car.width / 2 - 28, -car.height / 2 + 20], // Front right
    [-car.width / 2 + 12, car.height / 2 - 18], // Rear left
    [car.width / 2 - 28, car.height / 2 - 18]  // Rear right
  ];
  
  wheelPositions.forEach(([wx, wy]) => {
    // Tire - massive
    ctx.beginPath();
    ctx.ellipse(wx + 10, wy + 20, 12, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rim - gold for Ferrari
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(wx + 10, wy + 20, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brake disc visible
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.ellipse(wx + 10, wy + 20, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
  });

  // Exhaust pipes - glowing hot
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(car.width / 2 - 10, car.height / 2 - 10, 5, 10);
  ctx.fillRect(car.width / 2 - 18, car.height / 2 - 10, 5, 10);

  // Ferrari logo on side
  ctx.fillStyle = '#FFD700';
  ctx.font = '6px Arial';
  ctx.fillText('FERRARI', -car.width / 2 + 10, car.height / 2 - 5);

  // Halo safety device
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -car.height / 2 + 10, car.width / 2 - 8, 0, Math.PI);
  ctx.stroke();

  // Mirror
  ctx.fillStyle = '#000';
  ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 8, 3, 6);

  ctx.restore();
}

function update(dt) {
  if (!startTime) startTime = performance.now();
  const target = car.maxSpeed * 60 / 6; // km/h style scaling
  if (keys.ArrowUp) car.speed = Math.min(car.maxSpeed, car.speed + car.acceleration);
  if (keys.ArrowDown) car.speed = Math.max(-2.4, car.speed - car.acceleration * 0.75);
  if (!keys.ArrowUp && !keys.ArrowDown) {
    car.speed *= 1 - car.friction;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  if (keys.ArrowLeft) car.angle -= car.turnSpeed * (1 + Math.abs(car.speed) / 10);
  if (keys.ArrowRight) car.angle += car.turnSpeed * (1 + Math.abs(car.speed) / 10);

  if (Math.abs(car.speed) > 0.7) hasStarted = true;

  car.x += Math.sin(car.angle) * car.speed * 2;
  car.y -= Math.cos(car.angle) * car.speed * 2;

  const onTrack = checkTrackMask(car.x, car.y);
  if (!onTrack) {
    car.speed *= 0.92;
    if (!crashSound.playing) {
      crashSound.currentTime = 0;
      crashSound.play().catch(() => {});
    }
  } else {
    crashSound.pause();
  }

  if (Math.abs(car.speed) > 0.1) {
    if (engineSound.paused) {
      engineSound.play().catch(() => {});
    }
  } else {
    engineSound.pause();
  }
}

function updateLap() {
  const passedLine = Math.abs(car.x - FINISH_LINE.x) < 24 && car.y > FINISH_LINE.y && car.y < FINISH_LINE.y + FINISH_LINE.height;
  if (passedLine && hasStarted && !passedFinish && Math.abs(car.angle + Math.PI / 2) < 1.7) {
    lap += 1;
    lastLapTime = ((performance.now() - startTime) / 1000).toFixed(2);
    passedFinish = true;
  }
  if (!passedLine) {
    passedFinish = false;
  }
}

function checkTrackMask(x, y) {
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
  const pixel = maskCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Camera follow
  ctx.save();
  ctx.translate(canvas.width / 2 - car.x, canvas.height / 2 - car.y);

  drawTrack(ctx, false);
  drawCar();
  drawTrackBorder();

  ctx.restore();

  if (lastLapTime > 0) drawFinishText();
}

function drawDashboard() {
  // Speedometer
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(150, canvas.height - 80, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Speed needle
  const speedAngle = (Math.abs(car.speed) * 12 / 300) * Math.PI; // Max 300 km/h
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(150, canvas.height - 80);
  ctx.lineTo(150 + Math.sin(speedAngle) * 30, canvas.height - 80 - Math.cos(speedAngle) * 30);
  ctx.stroke();
  
  // Speed text
  ctx.fillStyle = '#FFF';
  ctx.font = '12px Arial';
  ctx.fillText(Math.round(Math.abs(car.speed) * 12) + ' km/h', 130, canvas.height - 40);
  
  // RPM gauge
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(canvas.width - 150, canvas.height - 80, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // RPM needle (simulated)
  const rpmAngle = (Math.abs(car.speed) / car.maxSpeed) * Math.PI;
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width - 150, canvas.height - 80);
  ctx.lineTo(canvas.width - 150 + Math.sin(rpmAngle) * 30, canvas.height - 80 - Math.cos(rpmAngle) * 30);
  ctx.stroke();
  
  // RPM text
  ctx.fillStyle = '#FFF';
  ctx.font = '12px Arial';
  ctx.fillText('RPM', canvas.width - 165, canvas.height - 40);
  
  // Lap counter
  ctx.fillStyle = '#000';
  ctx.fillRect(canvas.width / 2 - 30, canvas.height - 40, 60, 25);
  ctx.fillStyle = '#FFF';
  ctx.font = '16px Arial';
  ctx.fillText('LAP ' + lap, canvas.width / 2 - 25, canvas.height - 20);
  
  // Steering wheel
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height - 60, 25, 0, Math.PI * 2);
  ctx.stroke();
  
  // Steering wheel spokes
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, canvas.height - 85);
  ctx.lineTo(canvas.width / 2, canvas.height - 35);
  ctx.moveTo(canvas.width / 2 - 17, canvas.height - 60);
  ctx.lineTo(canvas.width / 2 + 17, canvas.height - 60);
  ctx.stroke();
}
}

function drawTrackBorder() {
  ctx.save();
  ctx.strokeStyle = '#00000088';
  ctx.lineWidth = TRACK_WIDTH + 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(TRACK_PATH);
  ctx.restore();
}

function drawFinishText() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText(`Kierros ${lap} suoritettu!`, canvas.width / 2, 150);
  ctx.font = '28px sans-serif';
  ctx.fillText(`Viimeisin aika: ${lastLapTime} s`, canvas.width / 2, 200);
  ctx.restore();
}

function loop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  animationTime += dt;
  update(dt);
  render();
  updateUI();
  requestAnimationFrame(loop);
}

function updateUI() {
  speedEl.textContent = Math.round(Math.abs(car.speed) * 12);
  lapEl.textContent = `${lap}`;
  if (startTime) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    timerEl.textContent = elapsed;
  }
}

function resetMask() {
  maskCtx.clearRect(0, 0, canvas.width, canvas.height);
  drawTrack(maskCtx, true);
}

function resizeCanvas() {
  canvas.width = 960;
  canvas.height = 640;
  trackMask.width = canvas.width;
  trackMask.height = canvas.height;
  resetMask();
}

let lastTimestamp = null;

document.addEventListener('keydown', (event) => {
  if (event.key in keys) {
    keys[event.key] = true;
    event.preventDefault();
  }
});
document.addEventListener('keyup', (event) => {
  if (event.key in keys) {
    keys[event.key] = false;
    event.preventDefault();
  }
});

resizeCanvas();
backgroundMusic.play().catch(() => {});
requestAnimationFrame(loop);
