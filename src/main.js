import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { initDetector } from './modules/detector.js';
import { judge } from './modules/hitJudge.js';
import { flashHit } from './modules/flash.js';
import { saveHit, saveSuccess } from './modules/storage.js';
import { initRecording, captureHitVideo, getVideoList, clearVideoList } from './modules/recording.js';
import { setMode, getCurrentMode, startWaitingPhase, isTrainingStarted, resetTraining } from './modules/modes.js';

const video = document.getElementById('cam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const thresholdInput = document.getElementById('threshold');

let detector;
let stream;
let recordingSupported = false;

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

    // 録画機能初期化
    recordingSupported = initRecording(stream);
    if (!recordingSupported) {
      console.warn('Recording not supported');
    }

    // UI初期化
    initUI();
    
    // 初期状態を通常モードに設定
    setMode('normal');
    
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

function initUI() {
  // モード切り替え
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      console.log('Mode changed to:', e.target.value);
      setMode(e.target.value);
      updateModeUI();
    });
  });

  // 録画開始ボタン
  const startRecordingBtn = document.getElementById('start-recording');
  startRecordingBtn.addEventListener('click', () => {
    const waitTime = Number(document.getElementById('wait-time').value);
    resetTraining();
    startWaitingPhase(waitTime);
  });

  // 動画リスト管理
  const clearVideosBtn = document.getElementById('clear-videos');
  clearVideosBtn.addEventListener('click', () => {
    clearVideoList();
    updateVideoList();
  });

  updateModeUI();
  updateVideoList();
}

function updateModeUI() {
  const currentMode = getCurrentMode();
  const recordingSettings = document.getElementById('recording-settings');
  const videoList = document.getElementById('video-list');
  
  console.log('Updating UI for mode:', currentMode);
  
  if (currentMode === 'recording') {
    recordingSettings.style.display = 'block';
    if (recordingSupported) {
      videoList.style.display = 'block';
    }
  } else {
    recordingSettings.style.display = 'none';
    videoList.style.display = 'none';
  }
}

function updateVideoList() {
  const videos = getVideoList();
  const videosContainer = document.getElementById('videos');
  
  videosContainer.innerHTML = '';
  
  videos.forEach((video) => {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `
      <span>${video.filename}</span>
      <span>${new Date(video.timestamp).toLocaleTimeString()}</span>
    `;
    videosContainer.appendChild(item);
  });
}

function loop() {
  detector.estimatePoses(video).then(poses => {
    const currentMode = getCurrentMode();
    
    // 休憩モードの場合は判定を一切行わない
    if (currentMode === 'rest') {
      requestAnimationFrame(loop);
      return;
    }
    
    // 録画モードで待機中は判定しない
    if (!isTrainingStarted()) {
      requestAnimationFrame(loop);
      return;
    }

    const result = judge(poses, ctx, Number(thresholdInput.value));

    if (result.hit) {
      flashHit(stream);
      saveHit();
      
      // 録画モードでは動画を保存
      if (currentMode === 'recording' && recordingSupported) {
        captureHitVideo();
        updateVideoList();
      }
      
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
