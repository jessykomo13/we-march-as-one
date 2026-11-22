// ============================================================================
// Sons synthétisés (Web Audio) : aucun fichier à télécharger
// ============================================================================
let ctx = null, master = null, noiseBuf = null;
let muted = localStorage.getItem('wmao_mute') === '1';
let lastClash = 0, lastArrow = 0;

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : .55; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
// iOS : le son ne démarre qu'après un geste
for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, init, { passive: true });

function tone(freq, dur, type = 'square', vol = .15, slide = 0, when = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol = .2, freq = 1200, q = 1, when = 0, type = 'bandpass') {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.playbackRate.value = .7 + Math.random() * .6;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}

export const sfx = {
  get muted() { return muted; },
  toggle() { muted = !muted; localStorage.setItem('wmao_mute', muted ? '1' : '0'); init(); if (master) master.gain.value = muted ? 0 : .55; return muted; },
  click() { tone(660, .05, 'square', .05); },
  paint() { const n = performance.now(); if (n - (this._p || 0) < 70) return; this._p = n; noise(.05, .04, 2400, 2); },
  buy() { tone(880, .08, 'square', .07); tone(1320, .12, 'square', .07, 0, .07); },
  error() { tone(180, .15, 'sawtooth', .07, .7); },
  // tambours de marche au début de la bataille
  march() { for (let i = 0; i < 4; i++) { noise(.18, .35, 120, .8, i * .32, 'lowpass'); tone(70, .2, 'sine', .3, .5, i * .32); } noise(.3, .12, 3000, .6, 1.28); },
  // mêlée : crépitement dont l'intensité suit le nombre de morts
  clash(deaths) {
    if (!ctx || muted || !deaths) return;
    const now = performance.now(); if (now - lastClash < 70) return; lastClash = now;
    const k = Math.min(1, deaths / 25);
    noise(.08, .05 + .2 * k, 1800 + Math.random() * 2500, 3);
    if (Math.random() < .5) tone(900 + Math.random() * 900, .04, 'triangle', .03 + .05 * k, .6);
  },
  arrows(n) {
    if (!ctx || muted || !n) return;
    const now = performance.now(); if (now - lastArrow < 140) return; lastArrow = now;
    noise(.18, Math.min(.12, .02 + n * .004), 4200, 1.5, 0, 'highpass');
  },
  volley() { for (let i = 0; i < 6; i++) noise(.35, .12, 3500, 1.2, i * .05, 'highpass'); },
  rally() { tone(392, .15, 'square', .08); tone(523, .15, 'square', .08, 0, .14); tone(659, .3, 'square', .09, 0, .28); },
  crown() { tone(523, .1, 'triangle', .1); tone(784, .1, 'triangle', .1, 0, .09); tone(1047, .35, 'triangle', .12, 0, .18); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, 'square', .08, 0, i * .13)); tone(1047, .7, 'triangle', .1, 0, .55); },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, .35, 'sawtooth', .06, 0, i * .2)); },
  kingDown() { noise(.6, .3, 200, .7, 0, 'lowpass'); tone(110, .6, 'sawtooth', .12, .4); },
};
