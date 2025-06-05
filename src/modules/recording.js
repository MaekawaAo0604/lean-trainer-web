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

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `hit-${timestamp}`;
  
  // Convert blob to base64 for storage
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64data = reader.result;
    
    // ローカルストレージに動画情報を保存
    saveVideoInfo(filename, base64data, blob.size);
    
    // 自動ダウンロード
    const a = document.createElement('a');
    a.href = base64data;
    a.download = `${filename}.${MediaRecorder.isTypeSupported('video/webm') ? 'webm' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log(`Hit video saved: ${filename}`);
  };
  reader.readAsDataURL(blob);
}

function saveVideoInfo(filename, url, size) {
  const videos = JSON.parse(localStorage.getItem('hit-videos') || '[]');
  videos.push({
    id: Date.now().toString(),
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

export function downloadVideo(videoId) {
  const videos = getVideoList();
  const video = videos.find(v => v.id === videoId);
  
  if (!video) {
    console.error('Video not found:', videoId);
    return false;
  }

  // 再ダウンロード用のリンクを作成
  const a = document.createElement('a');
  a.href = video.url;
  a.download = `${video.filename}.${video.url.includes('webm') ? 'webm' : 'mp4'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  return true;
}

export function deleteVideo(videoId) {
  const videos = getVideoList();
  const updatedVideos = videos.filter(v => v.id !== videoId);
  localStorage.setItem('hit-videos', JSON.stringify(updatedVideos));
  return true;
}

export function clearVideoList() {
  localStorage.removeItem('hit-videos');
}