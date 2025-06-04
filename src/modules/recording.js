// src/modules/recording.js
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let recordingBuffer = [];
const BUFFER_DURATION = 3000; // 3秒間のバッファ

export function initRecording(stream) {
  if (!MediaRecorder.isTypeSupported('video/webm')) {
    console.warn('WebM not supported, trying mp4');
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      console.error('Video recording not supported');
      return false;
    }
  }

  const options = {
    mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
  };

  mediaRecorder = new MediaRecorder(stream, options);
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    if (recordedChunks.length > 0) {
      saveVideo();
    }
  };

  // 連続録画でバッファを維持
  startBufferRecording();
  return true;
}

function startBufferRecording() {
  if (mediaRecorder && mediaRecorder.state === 'inactive') {
    recordedChunks = [];
    mediaRecorder.start(100); // 100ms間隔でデータ取得
    
    // バッファサイズを制限
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        setTimeout(startBufferRecording, 10); // 短い間隔で再開
      }
    }, BUFFER_DURATION);
  }
}

export function captureHitVideo() {
  if (!mediaRecorder) return;
  
  // Hit時点での録画データを保存
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording = false;
  }
}

function saveVideo() {
  if (recordedChunks.length === 0) return;

  const blob = new Blob(recordedChunks, {
    type: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
  });

  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `hit-${timestamp}`;
  
  // ローカルストレージに動画情報を保存
  saveVideoInfo(filename, url, blob.size);
  
  // 自動ダウンロード
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${MediaRecorder.isTypeSupported('video/webm') ? 'webm' : 'mp4'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  console.log(`Hit video saved: ${filename}`);
}

function saveVideoInfo(filename, url, size) {
  const videos = JSON.parse(localStorage.getItem('hit-videos') || '[]');
  videos.push({
    filename,
    url,
    size,
    timestamp: new Date().toISOString(),
    downloaded: true
  });
  
  // 最新10件のみ保持
  if (videos.length > 10) {
    videos.splice(0, videos.length - 10);
  }
  
  localStorage.setItem('hit-videos', JSON.stringify(videos));
}

export function getVideoList() {
  return JSON.parse(localStorage.getItem('hit-videos') || '[]');
}

export function clearVideoList() {
  localStorage.removeItem('hit-videos');
}