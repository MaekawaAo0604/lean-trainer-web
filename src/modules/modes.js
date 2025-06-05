// src/modules/modes.js
let currentMode = 'normal';
let waitingPhase = false;
let waitStartTime = null;
let trainingStarted = false;
let recordingSession = false; // 録画セッションの状態

export function setMode(mode) {
  currentMode = mode;
  resetTraining();
  
  // 通常モードの場合は即座にトレーニング開始
  if (mode === 'normal') {
    trainingStarted = true;
    updateStatus('READY');
  }
  // 録画モードの場合は録画開始まで待機
  else if (mode === 'recording') {
    trainingStarted = false;
    updateStatus('録画開始ボタンを押してください');
  }
  // 休憩モードの場合は判定を完全に停止
  else if (mode === 'rest') {
    trainingStarted = false;
    updateStatus('休憩中 - Hit判定停止');
  }
}

export function getCurrentMode() {
  return currentMode;
}

export function startWaitingPhase(waitTimeSeconds) {
  if (currentMode !== 'recording' || recordingSession) return false;
  
  recordingSession = true; // 録画セッション開始
  waitingPhase = true;
  trainingStarted = false;
  waitStartTime = performance.now();
  
  // カウントダウン表示
  const countdownInterval = setInterval(() => {
    const elapsed = (performance.now() - waitStartTime) / 1000;
    const remaining = Math.ceil(waitTimeSeconds - elapsed);
    
    if (remaining > 0) {
      updateStatus(`開始まで ${remaining}秒...`);
    } else {
      clearInterval(countdownInterval);
      endWaitingPhase();
    }
  }, 1000);
  
  return true;
}

function endWaitingPhase() {
  waitingPhase = false;
  trainingStarted = true;
  
  // 開始合図
  updateStatus('開始！');
  playStartSignal();
  
  // 録画開始を通知
  window.dispatchEvent(new CustomEvent('trainingStarted'));
  
  setTimeout(() => {
    updateStatus('READY');
  }, 1000);
}

function updateStatus(text) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function playStartSignal() {
  // 開始音を3回鳴らす
  const beep = document.getElementById('beep');
  if (beep) {
    let count = 0;
    const playBeep = () => {
      beep.currentTime = 0;
      beep.play().catch(() => {});
      count++;
      if (count < 3) {
        setTimeout(playBeep, 200);
      }
    };
    playBeep();
  }
}

export function isWaiting() {
  return waitingPhase;
}

export function isTrainingStarted() {
  return trainingStarted;
}

export function resetTraining() {
  waitingPhase = false;
  if (trainingStarted) {
    // 録画停止を通知
    window.dispatchEvent(new CustomEvent('trainingStopped'));
  }
  trainingStarted = false;
  waitStartTime = null;
  // 録画セッションはリセットしない（手動でのみリセット）
}

export function endRecordingSession() {
  recordingSession = false;
  trainingStarted = false;
  waitingPhase = false;
  // 録画停止を通知
  window.dispatchEvent(new CustomEvent('trainingStopped'));
}

export function isRecordingSessionActive() {
  return recordingSession;
}