import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { initDetector } from './modules/detector.js';
import { judge } from './modules/hitJudge.js';
import { flashHit } from './modules/flash.js';
import { saveHit, saveSuccess } from './modules/storage.js';

const video = document.getElementById('cam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const thresholdInput = document.getElementById('threshold');

let detector;
let stream;

async function init() {
  try {
    // TensorFlow backend 初期化
    await tf.setBackend('webgl');
    await tf.ready();

    // カメラ初期化
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();

    detector = await initDetector();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    statusEl.textContent = 'READY';
    loop();
  } catch (e) {
    console.error('Camera initialization error:', e);
    statusEl.textContent = 'CAMERA ERROR: ' + e.name + ' - ' + e.message;
  }

  // Service Worker登録（public/sw.js を指す）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => {
      console.log('Service Worker registered successfully.');
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}

}

function loop() {
  detector.estimatePoses(video).then(poses => {
    const result = judge(poses, ctx, Number(thresholdInput.value));

    if (result.hit) {
      flashHit(stream);
      saveHit();
      const hitType = result.isArmsOnly ? 'ARMS HIT!' : 'FULL HIT!';
      statusEl.textContent = hitType;
      setTimeout(() => {
        statusEl.textContent = 'READY';
      }, 500);
    } else if (result.cooling) {
      statusEl.textContent = 'COOLING...';
    } else if (poses.length && poses[0].score > 0.3) {
      saveSuccess();
      if (statusEl.textContent !== 'HIT!' && statusEl.textContent !== 'ARMS HIT!' && statusEl.textContent !== 'FULL HIT!') {
        statusEl.textContent = 'READY';
      }
    }

    requestAnimationFrame(loop);
  });
}

init();
