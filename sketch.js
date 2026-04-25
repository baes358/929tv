let video;
let started = false;

const GRID = 18;

// sparse overlay: probability a cell renders a char when color matches
const DENSITY = 0.38;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  textAlign(LEFT, TOP);
  noStroke();

  video = createVideo('assets/929.mp4');
  video.hide();
  video.loop();
  video.volume(0);
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

  // sample video pixels for overlay placement
  video.loadPixels();
  if (!video.pixels.length) return;

  const cols = floor(width / GRID);
  const rows = floor(height / GRID);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * GRID + GRID * 0.5;
      const cy = j * GRID + GRID * 0.5;

      // map canvas cell center → video pixel
      const vx = floor(map(cx - drawX, 0, drawW, 0, vw));
      const vy = floor(map(cy - drawY, 0, drawH, 0, vh));
      if (vx < 0 || vx >= vw || vy < 0 || vy >= vh) continue;

      const idx = (vy * vw + vx) * 4;
      const r = video.pixels[idx];
      const g = video.pixels[idx + 1];
      const b = video.pixels[idx + 2];

      const ch = pickChar(r, g, b);
      if (!ch) continue;

      // edge factor: 0 at center, 1 at corner
      const maxDist = dist(0, 0, width / 2, height / 2);
      const edgeFactor = constrain(dist(cx, cy, width / 2, height / 2) / maxDist, 0, 1);

      // dark factor: 1 when near-black, 0 when bright
      const lum = (r + g + b) / 3;
      const darkFactor = 1 - constrain(lum / 100, 0, 1);

      // whichever pulls smaller wins
      const sz = lerp(12, 5, max(edgeFactor, darkFactor));

      // white overlay, slight jitter for glitch feel
      fill(255, 255, 255, 210);
      textSize(sz);
      text(ch, i * GRID + random(-1.5, 1.5), j * GRID + random(-1, 1));
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
