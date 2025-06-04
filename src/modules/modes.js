// src/modules/modes.js
let currentMode = 'normal';
let waitingPhase = false;
let waitStartTime = null;
let trainingStarted = false;

export function setMode(mode) {
  currentMode = mode;
  resetTraining();
  
  // 通常モードの場合は即座にトレーニング開始
  if (mode === 'normal') {
    trainingStarted = true;
  }
}

export function getCurrentMode() {
  return currentMode;
}

export function startWaitingPhase(waitTimeSeconds) {
  if (currentMode !== 'recording') return false;
  
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
  trainingStarted = false;
  waitStartTime = null;
}