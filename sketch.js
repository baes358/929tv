let video;
let started = false;

const GRID = 14;

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

  video.loadPixels();
  if (!video.pixels.length) return;

  const vw = video.width;
  const vh = video.height;
  if (!vw || !vh) return;

  const cols = floor(width / GRID);
  const rows = floor(height / GRID);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const vx = floor(map(i, 0, cols, 0, vw));
      const vy = floor(map(j, 0, rows, 0, vh));
      const idx = (vy * vw + vx) * 4;

      const r = video.pixels[idx];
      const g = video.pixels[idx + 1];
      const b = video.pixels[idx + 2];

      const ch = pickChar(r, g, b);
      if (!ch) continue;

      fill(r, g, b);
      textSize(GRID - 3);
      // subtle jitter reinforces the glitch/static feel
      text(ch, i * GRID + random(-1, 1), j * GRID + random(-0.5, 0.5));
    }
  }
}

function pickChar(r, g, b) {
  const lum = (r + g + b) / 3;
  if (lum < 22) return null; // pure black — nothing

  const tot = r + g + b || 1;
  const rn = r / tot;
  const gn = g / tot;
  const bn = b / tot;

  // Pink / magenta: r + b dominant, g suppressed
  if (rn > 0.38 && gn < 0.27 && bn > 0.21 && r > 85) return '929';

  // Cyan / blue: b dominant, r low
  if (bn > 0.44 && rn < 0.23 && b > 65) return '+';

  // Red / orange: r dominant
  if (rn > 0.54 && gn < 0.26 && r > 85) return '&';

  // White / near-white: all channels even and bright
  const spread = max(rn, gn, bn) - min(rn, gn, bn);
  if (lum > 155 && spread < 0.16) return '#';

  // Mid-tone catch-all
  if (lum > 48) return '@';

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
