// Copyright (C) 2026 remohexa
// SPDX-License-Identifier: GPL-3.0
// Github: https://github.com/remohexa/rematrix-gallery

const $ = (i) => document.getElementById(i);
const video = $("video");
const canvas = $("visualizer");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const centerBtn = $("center-btn");
const playIcon = centerBtn.querySelector("i");
const progressBar = $("progress-bar");
const timeline = $("timeline");
const currentTimeEl = $("current-time");
const totalTimeEl = $("total-time");
const loading = $("loading");
const muteBtn = $("mute-btn");
const player = $("player");
let audioContext, analyser, dataArray;
let isAudioOnly = false;
let isVideo = false;
let hideControlsTimeout;
let isPlaying = false;
let animationId = null;
let particles = [];
let glitchTime = 0;
let glitchIntensity = 0;
let isDragging = false;
const __showFps = false;

const params = new URLSearchParams(location.search);
const file = params.get("file");
const _typeParam = params.get("type");
const fullView = params.get("view");
if (String(_typeParam).startsWith("audio")) {
  isAudioOnly = true;
} else {
  isVideo = true;
}
if (file) video.src = file;
if (fullView) video.style.height = "auto";
let __particleCount = 300;
// FPS
let lastFrameTime = 0;
const fpsEl = $("fps-counter");
let lastTime = performance.now();
let frameCount = 0;
let fps = 0;
async function fpsCounter() {
  fpsEl.style.display = "block";
  const now = performance.now();
  frameCount++;

  if (now - lastTime >= 500) {
    // update twice per second
    fps = Math.round((frameCount * 1000) / (now - lastTime));
    frameCount = 0;
    lastTime = now;

    fpsEl.textContent = fps + " FPS";
  }
}
// FPS

function init() {
  resizeCanvas();

  window.addEventListener("resize", resizeCanvas);
  video.addEventListener("loadedmetadata", onVideoReady);
  video.addEventListener("timeupdate", updateTimeline);
  video.addEventListener("play", onPlay);
  video.addEventListener("pause", onPause);
  video.addEventListener("ended", onEnded);
  video.addEventListener("seeked", onSeeked);

  centerBtn.addEventListener("click", handlePlayClick);
  player.addEventListener("click", handlePlayerClick);
  muteBtn.addEventListener("click", toggleMute);

  centerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  timeline.addEventListener("click", handleTimelineClick);
  timeline.addEventListener("mousedown", (e) => {
    isDragging = true;
    handleTimelineClick(e);
    e.preventDefault();
  });

  player.addEventListener("mousemove", showControls);
  player.addEventListener("mouseleave", hideControls);
}

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    handleTimelineClick(e);
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  if (isAudioOnly) {
    initParticles();
  }
}
function onVideoReady() {
  video.style.display = "block";
  loading.style.display = "none";

  if (video.duration && isFinite(video.duration)) {
    totalTimeEl.textContent = formatTime(video.duration);
  } else {
    totalTimeEl.textContent = "0:00";
  }
  isAudioOnly = !video.videoWidth || video.videoWidth === 0;

  if (isAudioOnly) {
    player.classList.add("audio-mode");
    resizeCanvas();
    initAudioContext();
  } else {
    player.classList.remove("audio-mode");
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isVideo = true;
  }

  currentTimeEl.textContent = formatTime(video.currentTime);
}

function formatTime(seconds) {
  if (!isFinite(seconds) || isNaN(seconds) || seconds === Infinity)
    return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function handlePlayClick(e) {
  e.stopPropagation();
  togglePlayPause();
}

function handlePlayerClick(e) {
  if (
    e.target === timeline ||
    e.target.closest("#timeline-container") ||
    e.target === muteBtn ||
    e.target.closest(".control-btn") ||
    e.target === centerBtn ||
    e.target.closest("#center-btn")
  ) {
    return;
  }

  togglePlayPause();
}

function handleTimelineClick(e) {
  e.stopPropagation();

  const rect = timeline.getBoundingClientRect();
  let clientX;

  if (e.type === "click" || e.type === "mousedown") {
    clientX = e.clientX;
  } else if (e.type === "mousemove" && isDragging) {
    clientX = e.clientX;
  } else {
    return;
  }

  const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const percent = x / rect.width;

  if (video.duration && isFinite(video.duration)) {
    video.currentTime = percent * video.duration;
    updateTimeline();
  }
}

function togglePlayPause() {
  if (video.paused || video.ended) {
    playVideo();
  } else {
    pauseVideo();
  }
}

async function playVideo() {
  try {
    if (isAudioOnly && !audioContext) {
      initAudioContext();
    }

    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }

    await video.play();
  } catch (err) {
    console.error("Play error:", err);
  }
}

function pauseVideo() {
  video.pause();
}

function toggleMute() {
  video.muted = !video.muted;
  const icon = muteBtn.querySelector("i");
  icon.className = video.muted ? "" : "";
}

function initAudioContext() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaElementSource(video);

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  drawGlitchyBall();
}

function initParticles() {
  particles = [];
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;

  const particleCount = __particleCount;

  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const x = Math.cos(theta) * Math.sin(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(phi);
    const screenX = centerX + x * radius;
    const screenY = centerY + y * radius;

    particles.push({
      baseX: x,
      baseY: y,
      baseZ: z,
      x: screenX,
      y: screenY,
      targetX: screenX,
      targetY: screenY,
      size: width / 2 / particleCount,
      speed: 0.02 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      brightness: 0.3 + Math.random() * 0.7,
      glitchActive: false,
      glitchTimer: 0,
      glitchX: 0,
      glitchY: 0,
      visible: true,
      visibilityTimer: Math.random() * 100,
      fade: 1,
    });
  }
}

function drawGlitchyBall(__now = performance.now()) {
  if (!isAudioOnly) {
    cancelAnimationFrame(animationId);
    animationId = null;

    return;
  }

  //Frame cap:
  let targetFPS;

  if (!isPlaying) {
    targetFPS = 20;
  } else {
    targetFPS = 600;
  }

  const frameInterval = 1000 / targetFPS;

  if (__now - lastFrameTime < frameInterval) {
    animationId = requestAnimationFrame(drawGlitchyBall);
    return;
  }

  lastFrameTime = __now;
  //

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(0, 0, width, height);

  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  let total = 0;
  for (let i = 0; i < dataArray.length; i++) {
    total += dataArray[i];
  }
  const audioIntensity = total / dataArray.length / 255;

  glitchTime += 0.016;

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.28;

  let pulseRadius;
  if (audioIntensity < 0.1) {
    pulseRadius = baseRadius * (1 + audioIntensity * 0.4);
  } else if (audioIntensity < 0.35) {
    pulseRadius = baseRadius * (1 + audioIntensity * 0.6);
  } else if (audioIntensity < 0.5) {
    pulseRadius = baseRadius * (1 + audioIntensity * 0.8);
  } else if (audioIntensity < 0.6) {
    pulseRadius = baseRadius * (1 + audioIntensity * 1.0);
  } else if (audioIntensity < 0.75) {
    pulseRadius = baseRadius * (1 + audioIntensity * 1.1);
  } else {
    pulseRadius = baseRadius * (1 + audioIntensity * 1.4);
  }
  const time = glitchTime;
  const sinTime = Math.sin(time);
  const cosTime = Math.cos(time);
  particles.forEach((particle, index) => {
    const freqIndex = Math.floor((index / particles.length) * dataArray.length);
    const frequency = dataArray[freqIndex] / 255;

    particle.visibilityTimer--;
    if (particle.visibilityTimer <= 0) {
      if (particle.visible) {
        particle.fade -= 0.1;
        if (particle.fade <= 0) {
          particle.visible = false;
          particle.fade = 0;
          particle.visibilityTimer = 20 + Math.random() * 60;
        }
      } else {
        particle.visible = false;
        particle.visibilityTimer--;
        if (particle.visibilityTimer <= 0) {
          particle.visible = true;
          particle.fade = 0;
          particle.visibilityTimer = 40 + Math.random() * 100;
        }
      }
    } else if (particle.visible && particle.fade < 1) {
      particle.fade = Math.min(1, particle.fade + 0.05);
    }

    const moveAmount = frequency * 1;

    const normalX =
      centerX + particle.baseX * (pulseRadius + sinTime * moveAmount);
    const normalY =
      centerY + particle.baseY * (pulseRadius + cosTime * moveAmount);

    if (Math.random() < audioIntensity * 0.05) {
      particle.glitchActive = true;
      particle.glitchTimer = 2 + Math.random() * 5;
      particle.glitchX = (Math.random() - 0.5) * 50 * audioIntensity;
      particle.glitchY = (Math.random() - 0.5) * 50 * audioIntensity;
    }

    if (particle.glitchActive) {
      particle.glitchTimer--;
      if (particle.glitchTimer <= 0) {
        particle.glitchActive = false;
      }
    }

    if (particle.glitchActive) {
      particle.targetX = normalX + particle.glitchX;
      particle.targetY = normalY + particle.glitchY;
    } else {
      particle.targetX = normalX;
      particle.targetY = normalY;
    }

    particle.x += (particle.targetX - particle.x) * 0.2;
    particle.y += (particle.targetY - particle.y) * 0.2;

    if (particle.visible && particle.fade > 0) {
      const sizeMultiplier = 1 + frequency * 2;
      const particleSize = particle.size * sizeMultiplier;

      let r, g, b;

      if (particle.glitchActive) {
        r = 105 + frequency * 100;
        g = 105;
        b = 200;
      } else {
        r = Math.min(0, 0 + frequency * 100);
        g = Math.min(0, 200 + frequency * 55);
        b = Math.min(200, 100 + frequency * 155);
      }

      const opacity =
        particle.brightness * particle.fade * (0.5 + frequency * 0.5);

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particleSize, 0, Math.PI * 2);

      ctx.fillStyle = particle.glitchActive
        ? `rgba(${r}, ${g}, ${b}, ${opacity})`
        : `rgba(0,255,136,${opacity})`;
      ctx.fill();
    }
  });

  ctx.lineWidth = 0.5;

  for (let i = 0; i < particles.length; i += 2) {
    const p1 = particles[i];

    if (!p1.visible || p1.fade < 0.5) continue;

    for (let j = i + 1; j < Math.min(i + 10, particles.length); j++) {
      const p2 = particles[j];

      if (!p2.visible || p2.fade < 0.5) continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < pulseRadius * 0.5) {
        const opacity =
          Math.min(p1.fade, p2.fade) *
          0.3 *
          (1 - distance / (pulseRadius * 0.5));

        if (p1.glitchActive || p2.glitchActive) {
          ctx.strokeStyle = `rgba(255, 100, 255, ${opacity})`;
        } else {
          ctx.strokeStyle = `rgba(0, 255, 136, ${opacity})`;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  if (isPlaying && Math.random() < audioIntensity * 0.75) {
    applyCanvasGlitch(width * 3, height * 3, audioIntensity);
  }

  animationId = requestAnimationFrame(drawGlitchyBall);
  if (__showFps) {
    fpsCounter();
  }
}

function applyCanvasGlitch(width, height, intensity) {
  const glitchAmount = Math.floor(intensity * 15);
  for (let i = 0; i < glitchAmount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const glitchWidth = 2 + Math.random() * 40;
    const glitchHeight = 1 + Math.random() * 6;

    const imageData = ctx.getImageData(x, y, glitchWidth, glitchHeight);

    const shift = Math.floor(Math.random() * 20) + 5;
    for (let j = 0; j < imageData.data.length; j += 4) {
      imageData.data[j] =
        imageData.data[(j + shift * 4) % imageData.data.length] || 0;
      imageData.data[j + 1] =
        imageData.data[(j + 1 + shift * 4) % imageData.data.length] || 150;
      imageData.data[j + 2] =
        imageData.data[(j + 2 + shift * 4) % imageData.data.length] || 150;
    }

    ctx.putImageData(imageData, x, y);
  }
}
function drawFrequencyRipples(width, height, intensity, frequencyData) {
  return;
}

function updateTimeline() {
  if (!video.duration || !isFinite(video.duration)) return;

  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(video.currentTime);
}

function onSeeked() {
  updateTimeline();
}
function changeSvg(i) {
  const lis = ["playSvg", "replaySvg", "pauseSvg"];
  lis.forEach((item) => {
    if (item == i) {
      $(item).style.display = "block";
    } else {
      $(item).style.display = "none";
    }
  });
}
function onPlay() {
  isPlaying = true;
  changeSvg("pauseSvg");

  if (isAudioOnly) {
    player.classList.add("audio-playing");
  } else {
    player.classList.add("video-playing");
  }

  showControls();
}

function onPause() {
  isPlaying = false;
  changeSvg("playSvg");

  if (isAudioOnly) {
    player.classList.remove("audio-playing");
  } else {
    player.classList.remove("video-playing");
  }

  showControls();
}

function onEnded() {
  isPlaying = false;
  changeSvg("replaySvg");

  if (isAudioOnly) {
    player.classList.remove("audio-playing");
  } else {
    player.classList.remove("video-playing");
  }

  showControls();
}

function showControls() {
  clearTimeout(hideControlsTimeout);

  if (video.paused || video.ended) return;

  hideControlsTimeout = setTimeout(() => {
    if (!video.paused && !video.ended) {
      muteBtn.style.opacity = "0";
    }
  }, 2000);

  muteBtn.style.opacity = "1";
}

function hideControls() {
  if (!video.paused && !video.ended) {
    muteBtn.style.opacity = "0";
  }
}

document.addEventListener("keydown", (e) => {
  if (e.target === document.body) {
    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlayPause();
        break;
      case "m":
        toggleMute();
        break;
      case "arrowleft":
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case "arrowright":
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        break;
      case "f":
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        break;
    }
  }
});

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

init();

const hideProggress = params.get("hide");
if (String(hideProggress) === "true") {
  $("timeline-container").style.display = "none";
  document.getElementsByClassName("play-icon")[0].style.width = "40px";
  document.getElementsByClassName("play-icon")[0].style.height = "40px";
  if (file.endsWith("mp4")) {
    $("player").style.flex = "unset";
    $("video").style.height = "unset";
  }
}

const LLvideo = $("video");
let last_height = 0;

const report = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const ratio = LLvideo.videoHeight / LLvideo.videoWidth;
      const width = LLvideo.getBoundingClientRect().width;

      const h = Math.ceil(width * ratio);

      if (h > 0) {
        if (Math.abs(h - last_height) > 1) {
          last_height = h;

          parent.postMessage({ type: "IFRAME_RESIZE", file, height: h }, "*");
        }
      }
    });
  });
};

window.addEventListener("load", report);
window.addEventListener("resize", report);
window.addEventListener("orientationchange", () => setTimeout(report, 50));
document.addEventListener(
  "visibilitychange",
  () => !document.hidden && report()
);
LLvideo.addEventListener("loadedmetadata", report);
LLvideo.addEventListener("canplay", report);
