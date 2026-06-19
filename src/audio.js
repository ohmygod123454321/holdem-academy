// Synthesized audio engine (Web Audio API). No external files — all sound is
// generated in the browser, so it works offline and carries no licensing.
// Exposes window.Sound: background music (3 selectable styles) + bet SFX.
const Sound = (function () {
  const PREFS = "hp-audio-v1";
  function load() { try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch { return {}; } }
  function persist() { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch {} }
  const prefs = Object.assign(
    { musicOn: false, sfxOn: true, track: "lounge", musicVol: 0.45, sfxVol: 0.7 },
    load()
  );

  let ctx = null, musicGain = null, sfxGain = null;
  let schedTimer = null, nextTime = 0, bar = 0, playing = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    musicGain = ctx.createGain(); musicGain.gain.value = prefs.musicVol; musicGain.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = prefs.sfxVol; sfxGain.connect(ctx.destination);
    return ctx;
  }
  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  function noise(dur) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function blip(freq, t, dur, type, gain, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // ---------------- SFX ----------------
  function chip() {
    if (!prefs.sfxOn || !ensure()) return; resume();
    const t = ctx.currentTime;
    // a couple of clicks (chips clinking)
    for (let i = 0; i < 3; i++) {
      blip(1700 + Math.random() * 700 - i * 250, t + i * 0.035, 0.07, "square", 0.18);
    }
    // filtered noise "slide"
    const src = ctx.createBufferSource(); src.buffer = noise(0.13);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    src.connect(bp); bp.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + 0.14);
  }
  function tap() {
    if (!prefs.sfxOn || !ensure()) return; resume();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise(0.05);
    const bp = ctx.createBiquadFilter(); bp.type = "highpass"; bp.frequency.value = 1200;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp); bp.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + 0.06);
  }
  function swish() {
    if (!prefs.sfxOn || !ensure()) return; resume();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise(0.18);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.18); bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp); bp.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + 0.19);
  }
  function win() {
    if (!prefs.sfxOn || !ensure()) return; resume();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, t + i * 0.09, 0.28, "triangle", 0.16));
  }
  function act(action) {
    const t = action && action.type;
    if (t === "raise" || t === "call") chip();
    else if (t === "check") tap();
    else if (t === "fold") swish();
  }

  // ---------------- Music ----------------
  const C4 = 261.63, E4 = 329.63, G4 = 392.0, B4 = 493.88, A3 = 220.0, F3 = 174.61,
    D3 = 146.83, Fs = 174.61, G3 = 196.0, B3 = 246.94, D4 = 293.66, F4 = 349.23, A4 = 440.0;
  const CHORDS = {
    Cmaj7: [C4, E4, G4, B4], Am7: [A3, C4, E4, G4], Fmaj7: [F3, A3, C4, E4],
    G7: [G3, B3, D4, F4], Dm7: [D3, Fs, A3, C4], Em7: [164.81, G3, B3, D4],
  };
  const TRACKS = {
    lounge: { name: "爵士酒廊 Lounge", desc: "慵懶 ii–V–I，溫暖三角波", tempo: 2.4, wave: "triangle", cutoff: 1500, pad: 0.05, arp: true, seq: ["Dm7", "G7", "Cmaj7", "Am7"] },
    casino: { name: "賭場氛圍 Casino", desc: "緩慢飄渺，正弦長音與高鈴", tempo: 3.2, wave: "sine", cutoff: 2000, pad: 0.045, arp: true, seq: ["Cmaj7", "Am7", "Fmaj7", "G7"] },
    lofi:   { name: "放鬆 Lo-fi", desc: "規律和弦＋柔和低頻脈動", tempo: 1.9, wave: "sawtooth", cutoff: 850, pad: 0.045, arp: false, pulse: true, seq: ["Am7", "Fmaj7", "Cmaj7", "G7"] },
  };

  function playPad(tr, freqs, t) {
    const dur = tr.tempo;
    freqs.forEach(f => {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = tr.cutoff;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(tr.pad, t + 0.5);
      g.gain.setValueAtTime(tr.pad, t + dur - 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      [f, f * 1.004].forEach(ff => {
        const o = ctx.createOscillator(); o.type = tr.wave; o.frequency.value = ff;
        o.connect(g); o.start(t); o.stop(t + dur + 0.05);
      });
      g.connect(lp); lp.connect(musicGain);
    });
    if (tr.pulse) blip(freqs[0] / 2, t, 0.4, "sine", 0.05, musicGain);
    if (tr.arp) {
      const hi = freqs.slice(1).map(x => x * 2);
      [0.25, 0.55, 0.8].forEach((off, i) => {
        const f = hi[i % hi.length];
        blip(f, t + tr.tempo * off, 0.5, "sine", 0.035, musicGain);
      });
    }
  }
  function scheduler() {
    if (!playing || !ctx) return;
    const tr = TRACKS[prefs.track] || TRACKS.lounge;
    while (nextTime < ctx.currentTime + 0.7) {
      playPad(tr, CHORDS[tr.seq[bar % tr.seq.length]], nextTime);
      nextTime += tr.tempo; bar++;
    }
  }
  function startMusic() {
    if (!ensure()) return; resume();
    playing = true; prefs.musicOn = true; persist();
    nextTime = ctx.currentTime + 0.15; bar = 0;
    if (schedTimer) clearInterval(schedTimer);
    schedTimer = setInterval(scheduler, 90); scheduler();
  }
  function stopMusic() {
    playing = false; prefs.musicOn = false; persist();
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
  }

  // Browsers only allow audio after a user gesture. Prime the AudioContext on
  // the first interaction anywhere, so SFX (including timer-driven AI bets on
  // the practice table) play without needing to open the audio panel first.
  function unlock() {
    ensure(); resume();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
  }

  return {
    tracks: Object.keys(TRACKS).map(id => ({ id, name: TRACKS[id].name, desc: TRACKS[id].desc })),
    chip, tap, swish, win, act,
    playMusic: startMusic, stopMusic,
    isPlaying: () => playing,
    selectTrack(id) { if (TRACKS[id]) { prefs.track = id; persist(); if (playing) { bar = 0; } } },
    setMusicVol(v) { prefs.musicVol = v; persist(); if (musicGain) musicGain.gain.value = v; },
    setSfxVol(v) { prefs.sfxVol = v; persist(); if (sfxGain) sfxGain.gain.value = v; },
    setSfxOn(on) { prefs.sfxOn = on; persist(); },
    getState() { return { ...prefs, playing }; },
  };
})();
if (typeof window !== "undefined") window.Sound = Sound;
