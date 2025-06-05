// src/modules/recording.js
import { initDB, saveVideoToDB, getAllVideos, getVideo, deleteVideoFromDB, clearAllVideos, cleanupOldVideos } from './videoStorage.js';

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let recordingBuffer = [];
let shouldRecord = false; // 録画すべきかどうかのフラグ
const BUFFER_DURATION = 3000; // 3秒間のバッファ

// 初期化時にIndexedDBも初期化
initDB().catch(console.error);

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

  // 録画の準備完了（手動で開始する）
  return true;
}

function startBufferRecording() {
  if (mediaRecorder && mediaRecorder.state === 'inactive' && shouldRecord) {
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

// 録画開始
export function startRecording() {
  shouldRecord = true;
  if (mediaRecorder && mediaRecorder.state === 'inactive') {
    startBufferRecording();
  }
}

// 録画停止
export function stopRecording() {
  shouldRecord = false;
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording = false;
  }
}

export function captureHitVideo() {
  if (!mediaRecorder || !shouldRecord) return;
  
  // Hit時点での録画データを保存
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording = false;
    // 録画を再開（次のHitに備える）
    setTimeout(() => {
      if (shouldRecord) {
        startBufferRecording();
      }
    }, 100);
  }
}

async function saveVideo() {
  if (recordedChunks.length === 0) return;

  const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
  const blob = new Blob(recordedChunks, { type: mimeType });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `hit-${timestamp}`;
  const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
  
  // BlobをIndexedDBに保存
  const videoData = {
    id: Date.now().toString(),
    filename,
    blob,
    mimeType,
    size: blob.size,
    timestamp: new Date().toISOString()
  };
  
  try {
    await saveVideoToDB(videoData);
    await cleanupOldVideos(); // 古い動画を削除
    
    console.log(`Hit video saved: ${filename}`);
    
    // 動画保存完了を通知
    window.dispatchEvent(new CustomEvent('videoSaved', { detail: videoData }));
  } catch (error) {
    console.error('Error saving video:', error);
  }
}

export async function getVideoList() {
  try {
    return await getAllVideos();
  } catch (error) {
    console.error('Error getting video list:', error);
    return [];
  }
}

export async function downloadVideo(videoId) {
  try {
    const video = await getVideo(videoId);
    
    if (!video) {
      console.error('Video not found:', videoId);
      return false;
    }

    // BlobからURLを作成
    const url = URL.createObjectURL(video.blob);
    const extension = video.mimeType.includes('webm') ? 'webm' : 'mp4';
    
    // ダウンロード用のリンクを作成
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.filename}.${extension}`;
    a.style.display = 'none';
    
    // ブラウザ互換性の向上
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    
    document.body.appendChild(a);
    
    // クリックイベントを確実に発火
    if (a.click) {
      a.click();
    } else if (document.createEvent) {
      const evt = document.createEvent('MouseEvents');
      evt.initEvent('click', true, true);
      a.dispatchEvent(evt);
    }
    
    // URLを少し遅れて解放
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 500);
    
    console.log(`Downloading video: ${video.filename}.${extension}`);
    
    return true;
  } catch (error) {
    console.error('Error downloading video:', error);
    return false;
  }
}

export async function deleteVideo(videoId) {
  try {
    await deleteVideoFromDB(videoId);
    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    return false;
  }
}

export async function clearVideoList() {
  try {
    await clearAllVideos();
    return true;
  } catch (error) {
    console.error('Error clearing video list:', error);
    return false;
  }
}