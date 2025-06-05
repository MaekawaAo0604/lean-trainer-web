import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { initDetector } from './modules/detector.js';
import { judge } from './modules/hitJudge.js';
import { flashHit } from './modules/flash.js';
import { saveHit, saveSuccess } from './modules/storage.js';
import { initRecording, captureHitVideo, getVideoList, clearVideoList, downloadVideo, startRecording, stopRecording } from './modules/recording.js';
import { setMode, getCurrentMode, startWaitingPhase, isTrainingStarted, resetTraining, endRecordingSession, isRecordingSessionActive } from './modules/modes.js';

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
    
    // ローディング完了
    hideLoading();
    
    statusEl.textContent = 'READY';
    loop();
  } catch (e) {
    console.error('Initialization error:', e);
    statusEl.textContent = 'ERROR: ' + e.name + ' - ' + e.message;
    hideLoading();
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
  const modeSelect = document.getElementById('mode-select');
  modeSelect.addEventListener('change', (e) => {
    console.log('Mode changed to:', e.target.value);
    setMode(e.target.value);
    updateModeUI();
  });

  // 録画開始ボタン
  const startRecordingBtn = document.getElementById('start-recording');
  startRecordingBtn.addEventListener('click', () => {
    const waitTime = Number(document.getElementById('wait-time').value);
    resetTraining();
    if (startWaitingPhase(waitTime)) {
      updateRecordingUI();
    }
  });

  // 動画リスト管理
  const clearVideosBtn = document.getElementById('clear-videos');
  clearVideosBtn.addEventListener('click', async () => {
    await clearVideoList();
    await updateVideoList();
  });

  // 動画保存イベントをリッスン
  window.addEventListener('videoSaved', () => {
    updateVideoList();
  });

  // 動画ダウンロードボタンのイベント委譲
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('download-btn')) {
      const videoId = e.target.getAttribute('data-video-id');
      if (videoId) {
        e.target.disabled = true;
        e.target.textContent = 'DL中...';
        
        const success = await downloadVideo(videoId);
        
        setTimeout(() => {
          e.target.disabled = false;
          e.target.textContent = 'ダウンロード';
        }, 1000);
      }
    }
  });

  // トレーニング開始・停止イベントをリッスン（録画制御）
  window.addEventListener('trainingStarted', () => {
    if (getCurrentMode() === 'recording' && recordingSupported) {
      startRecording();
    }
  });

  window.addEventListener('trainingStopped', () => {
    if (getCurrentMode() === 'recording' && recordingSupported) {
      stopRecording();
    }
  });

  updateModeUI();
  updateVideoList();
}

function updateRecordingUI() {
  const startRecordingBtn = document.getElementById('start-recording');
  if (isRecordingSessionActive()) {
    startRecordingBtn.textContent = '録画中...';
    startRecordingBtn.disabled = true;
  } else {
    startRecordingBtn.textContent = '録画開始';
    startRecordingBtn.disabled = false;
  }
}

function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  const modeSelect = document.getElementById('mode-select');
  
  // ローディングオーバーレイを非表示
  loadingOverlay.style.display = 'none';
  
  // モード選択を有効化
  modeSelect.disabled = false;
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
    updateRecordingUI();
  } else {
    recordingSettings.style.display = 'none';
    videoList.style.display = 'none';
  }
}

async function updateVideoList() {
  const videos = await getVideoList();
  const videosContainer = document.getElementById('videos');
  
  videosContainer.innerHTML = '';
  
  videos.forEach((video) => {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `
      <span>${video.filename}</span>
      <span>${new Date(video.timestamp).toLocaleTimeString()}</span>
      <button class="download-btn" data-video-id="${video.id}">ダウンロード</button>
    `;
    videosContainer.appendChild(item);
  });
  
  // イベント委譲でダウンロードボタンのクリックを処理（重複防止）
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
      
      // 録画モードでは動画を保存してセッション終了
      if (currentMode === 'recording' && recordingSupported && isRecordingSessionActive()) {
        captureHitVideo();
        endRecordingSession();
        updateRecordingUI(); // UI更新
      }
      
      const hitType = result.isArmsOnly ? 'ARMS HIT!' : 'FULL HIT!';
      statusEl.textContent = hitType;
      setTimeout(() => {
        if (currentMode === 'recording' && !isRecordingSessionActive()) {
          statusEl.textContent = '録画完了 - 再録画するには録画開始ボタンを押してください';
        } else {
          statusEl.textContent = 'READY';
        }
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
