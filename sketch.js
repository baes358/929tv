let video;
let started = false;

const GRID = 18;
const DENSITY = 0.38;
const UPDATE_INTERVAL = 3; // frames between ASCII grid refreshes

let charGrid = [];
let sizeGrid = [];
let lastUpdate = -UPDATE_INTERVAL;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  textAlign(LEFT, TOP);
  noStroke();

  video = createVideo('assets/929.mp4');
  video.hide();
  video.loop();
  video.volume(0);
  video.speed(1);
}

function draw() {
  background(0);

  if (!started) {
    fill(255);
    textSize(13);
    textAlign(CENTER, CENTER);
    text('click to play', width / 2, height / 2);
    textAlign(LEFT, TOP);
    return;
  }

  const vw = video.width;
  const vh = video.height;
  if (!vw || !vh) return;

  // contain: show full video centered, black bars if needed
  const scale = min(width / vw, height / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;

  // video as background
  image(video, drawX, drawY, drawW, drawH);

  const cols = floor(width / GRID);
  const rows = floor(height / GRID);
  const maxDist = dist(0, 0, width / 2, height / 2);

  // recompute grid every UPDATE_INTERVAL frames
  if (frameCount - lastUpdate >= UPDATE_INTERVAL) {
    video.loadPixels();
    charGrid = [];
    sizeGrid = [];

    for (let j = 0; j < rows; j++) {
      charGrid[j] = [];
      sizeGrid[j] = [];
      for (let i = 0; i < cols; i++) {
        const cx = i * GRID + GRID * 0.5;
        const cy = j * GRID + GRID * 0.5;
        const vx = floor(map(cx - drawX, 0, drawW, 0, vw));
        const vy = floor(map(cy - drawY, 0, drawH, 0, vh));

        // skip cells outside or within padding of the video border
        const PAD_Y = GRID * 5;
        const PAD_X = 0;
        if (vx < 0 || vx >= vw || vy < 0 || vy >= vh ||
            cx < drawX + PAD_X || cx > drawX + drawW - PAD_X ||
            cy < drawY + PAD_Y || cy > drawY + drawH - PAD_Y) {
          charGrid[j][i] = null;
          continue;
        }

        const idx = (vy * vw + vx) * 4;
        const r = video.pixels[idx];
        const g = video.pixels[idx + 1];
        const b = video.pixels[idx + 2];

        const ch = pickChar(r, g, b);
        charGrid[j][i] = ch;

        if (ch) {
          const edgeFactor = constrain(dist(cx, cy, width / 2, height / 2) / maxDist, 0, 1);
          const lum = (r + g + b) / 3;
          const darkFactor = 1 - constrain(lum / 100, 0, 1);
          sizeGrid[j][i] = lerp(12, 5, max(edgeFactor, darkFactor));
        }
      }
    }
    lastUpdate = frameCount;
  }

  // draw from cache every frame (no flicker between updates)
  fill(255, 255, 255, 210);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const ch = charGrid[j] && charGrid[j][i];
      if (!ch) continue;
      textSize(sizeGrid[j][i]);
      text(ch, i * GRID, j * GRID);
    }
  }
}

function pickChar(r, g, b) {
  const lum = (r + g + b) / 3;
  if (lum < 20) return null; // pure black — skip

  const tot = r + g + b || 1;
  const rn = r / tot;
  const gn = g / tot;
  const bn = b / tot;

  // Pink / magenta: r+b dominant, g suppressed
  if (rn > 0.38 && gn < 0.27 && bn > 0.21 && r > 85) {
    return random() < DENSITY ? '929' : null;
  }

  // Cyan / blue: b dominant, r low
  if (bn > 0.44 && rn < 0.23 && b > 65) {
    return random() < DENSITY ? '+' : null;
  }

  // Red / orange: r dominant
  if (rn > 0.54 && gn < 0.26 && r > 85) {
    return random() < DENSITY ? '&' : null;
  }

  // White / bright highlights
  const spread = max(rn, gn, bn) - min(rn, gn, bn);
  if (lum > 155 && spread < 0.16) {
    return random() < DENSITY ? '#' : null;
  }

  // Mid-tone: lower probability so it stays sparse
  if (lum > 55) {
    return random() < DENSITY * 0.55 ? '@' : null;
  }

  return null;
}

function mousePressed() {
  if (!started) {
    video.play();
    started = true;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
