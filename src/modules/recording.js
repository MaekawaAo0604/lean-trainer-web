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
    mediaRecorder.start(); // 連続録画開始
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
  
  // Hit後も2秒間録画を続けてから停止
  if (mediaRecorder.state === 'recording') {
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        isRecording = false;
      }
    }, 2000); // Hit後2秒間録画継続
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
    
    console.log(`Hit video saved: ${filename}, size: ${blob.size} bytes, chunks: ${recordedChunks.length}, type: ${mimeType}`);
    
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
    const filename = `${video.filename}.${extension}`;
    
    console.log(`Starting download: ${filename}, size: ${video.blob.size} bytes, type: ${video.blob.type}`);
    
    // より確実なダウンロード方法
    if (navigator.userAgent.indexOf('Chrome') !== -1 || navigator.userAgent.indexOf('Safari') !== -1) {
      // Chrome/Safari用
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      
      // ユーザー操作として処理
      a.click();
      
      // クリーンアップ
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 1000);
    } else {
      // その他のブラウザ用フォールバック
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      
      // 強制的にクリック
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false
      });
      
      document.body.appendChild(link);
      link.dispatchEvent(clickEvent);
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    console.log(`Download initiated: ${filename}`);
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