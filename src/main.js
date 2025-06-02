// src/main.js
import { initDetector } from "./modules/detector.js";
import { judge } from "./modules/hitJudge.js";
import { flashHit } from "./modules/flash.js";
import { saveHit, saveSuccess, getStats } from "./modules/storage.js";

const video = document.getElementById("cam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const thresholdInput = document.getElementById("threshold");
let detector;
let stream;

// カメラ初期化とモデルロード
async function init() {
  try {
    try {
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream;
  await video.play();
  statusEl.textContent = 'READY';
} catch (e) {
  console.error('Camera initialization error:', e);
  statusEl.textContent = 'CAMERA ERROR: ' + e.message;
}
    detector = await initDetector();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    loop();
  } catch (e) {
    console.error("カメラ初期化エラー:", e);
    statusEl.textContent = "CAMERA ERROR";
  }

  // Service Worker登録
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/src/sw.js");
  }
}

function loop() {
  detector.estimatePoses(video).then((poses) => {
    const hit = judge(poses, ctx, Number(thresholdInput.value));

    if (hit) {
      flashHit(stream);
      saveHit();
      statusEl.textContent = "HIT!";
      setTimeout(() => {
        statusEl.textContent = "READY";
      }, 500);
    } else if (poses.length && poses[0].score > 0.3) {
      // ポーズ検出で露出なしなら成功
      saveSuccess();
    }

    requestAnimationFrame(loop);
  });
}

init();
