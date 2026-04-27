let video;
let started = false;

const GRID = 18;
const DENSITY = .7;
const UPDATE_INTERVAL = 3.5; // frames between ASCII grid refreshes

let charGrid   = [];
let sizeGrid   = [];
let alphaGrid  = [];
let lumGrid    = [];
let motionGrid = [];
let prevPixels = null;
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
  video.speed(.75);
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

  const cols  = floor(width / GRID);
  const rows  = floor(height / GRID);
  const maxDist = dist(0, 0, width / 2, height / 2);
  const PAD_Y = GRID * 8;
  const PAD_X = 0;

  // recompute grid every UPDATE_INTERVAL frames
  if (frameCount - lastUpdate >= UPDATE_INTERVAL) {
    video.loadPixels();
    charGrid   = [];
    sizeGrid   = [];
    alphaGrid  = [];
    lumGrid    = [];
    motionGrid = [];

    for (let j = 0; j < rows; j++) {
      charGrid[j]   = [];
      sizeGrid[j]   = [];
      alphaGrid[j]  = [];
      lumGrid[j]    = [];
      motionGrid[j] = [];
      for (let i = 0; i < cols; i++) {
        const cx = i * GRID + GRID * 0.5;
        const cy = j * GRID + GRID * 0.5;
        const vx = floor(map(cx - drawX, 0, drawW, 0, vw));
        const vy = floor(map(cy - drawY, 0, drawH, 0, vh));

        // skip cells outside or within padding of the video border
        const PAD_X = 0;
        if (vx < 0 || vx >= vw || vy < 0 || vy >= vh ||
            cx < drawX + PAD_X  || cx > drawX + drawW - PAD_X ||
            cy < drawY + PAD_Y  || cy > drawY + drawH - PAD_Y) {
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
          lumGrid[j][i] = lum;

          // motion = per-cell frame diff against previous frame
          let motion = 0;
          if (prevPixels && idx + 2 < prevPixels.length) {
            motion = (abs(r - prevPixels[idx]) +
                      abs(g - prevPixels[idx + 1]) +
                      abs(b - prevPixels[idx + 2])) / 3;
          }
          motionGrid[j][i] = motion;
          const darkFactor = 1 - constrain(lum / 100, 0, 1);
          sizeGrid[j][i] = lerp(12, 5, max(edgeFactor, darkFactor));

          // fade starts at 0 from the PAD boundary (not the raw video edge)
          const FADE_Y = GRID * 9;
          const FADE_X = GRID * 2;
          const fromTop    = (cy - drawY - PAD_Y) / FADE_Y;
          const fromLeft   = (cx - drawX - PAD_X) / FADE_X;
          const fromRight  = (drawX + drawW - cx - PAD_X) / FADE_X;
          const minEdgeFactor = min(fromTop, fromLeft, fromRight);
          alphaGrid[j][i] = floor(210 * constrain(minEdgeFactor, 0, 1));
        }
      }
    }
    prevPixels = video.pixels.slice();
    lastUpdate = frameCount;
  }

  // draw from cache every frame (no flicker between updates)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const ch = charGrid[j] && charGrid[j][i];
      if (!ch) continue;
      const a = alphaGrid[j] && alphaGrid[j][i];
      if (!a) continue;
      fill(255, 255, 255, a);

      // motion from video frame diff drives pulse and jitter
      const motion = motionGrid[j] && motionGrid[j][i] || 0;
      const t = millis() * 0.0006;

      // size pulses with video motion — still noise-shaped but motion-scaled
      const pulseAmp = map(motion, 0, 60, 0, 16, true);
      const pulse = (noise(i * 0.18, j * 0.18, t) - 0.5) * 2 * pulseAmp;
      const base = ch === '929' ? sizeGrid[j][i] * 0.75 : sizeGrid[j][i];

      // near the top perimeter, force size very small
      const cy = j * GRID + GRID * 0.5;
      const TOP_ZONE = GRID * 14;
      const topProx = 1 - constrain((cy - drawY - PAD_Y) / TOP_ZONE, 0, 1);
      const sz = lerp(max(3, base + pulse), 3.5, topProx);
      textSize(sz);

      // position jitter scales with video motion
      const jx = (noise(i * 0.25, j * 0.25, t * 1.3) - 0.5) * map(motion, 0, 60, 0, 10, true);
      const jy = (noise(i * 0.25 + 99, j * 0.25 + 99, t * 1.3) - 0.5) * map(motion, 0, 60, 0, 7, true);
      text(ch, i * GRID + jx, j * GRID + jy);
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
    if (random() >= DENSITY) return null;
    return random(['9', '2', '9']);
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
