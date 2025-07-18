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
  console.log(`Download requested for video ID: ${videoId}`);
  
  try {
    const video = await getVideo(videoId);
    
    if (!video) {
      console.error('Video not found for ID:', videoId);
      return false;
    }

    if (!video.blob) {
      console.error('Video blob is missing for ID:', videoId);
      return false;
    }

    // Blobの検証
    if (!(video.blob instanceof Blob)) {
      console.error('Video data is not a valid Blob for ID:', videoId, typeof video.blob);
      return false;
    }

    console.log(`Video blob validation passed: size=${video.blob.size}, type=${video.blob.type}`);

    // BlobからURLを作成
    let url;
    try {
      url = URL.createObjectURL(video.blob);
      console.log(`Blob URL created: ${url}`);
    } catch (urlError) {
      console.error('Failed to create blob URL:', urlError);
      return false;
    }

    const extension = video.mimeType.includes('webm') ? 'webm' : 'mp4';
    const filename = `${video.filename}.${extension}`;
    
    console.log(`Starting download: ${filename}, size: ${video.blob.size} bytes`);
    
    // 複数のダウンロード方法を試行
    let downloadSuccess = false;
    
    // 方法1: 標準的なダウンロード
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      
      // ユーザーインタラクションイベントを模擬
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      
      const dispatched = a.dispatchEvent(clickEvent);
      console.log(`Method 1 - Standard download dispatched: ${dispatched}`);
      
      // 少し待ってからクリーンアップ
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 100);
      
      downloadSuccess = true;
    } catch (error) {
      console.error('Method 1 failed:', error);
    }
    
    // 方法2: 直接クリック（フォールバック）
    if (!downloadSuccess) {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Method 2 - Direct click executed`);
        downloadSuccess = true;
      } catch (error) {
        console.error('Method 2 failed:', error);
      }
    }
    
    // 方法3: WindowオブジェクトのOpen（最終フォールバック）
    if (!downloadSuccess) {
      try {
        // 新しいウィンドウで開く（ダウンロードとして扱われることがある）
        const downloadWindow = window.open(url, '_blank');
        if (downloadWindow) {
          downloadWindow.document.title = filename;
          setTimeout(() => downloadWindow.close(), 1000);
        }
        console.log(`Method 3 - Window open executed`);
        downloadSuccess = true;
      } catch (error) {
        console.error('Method 3 failed:', error);
      }
    }
    
    // クリーンアップ
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
        console.log(`Cleanup completed for: ${filename}`);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }, 3000); // より長い時間に延長
    
    if (downloadSuccess) {
      console.log(`Download initiated successfully: ${filename}`);
    } else {
      console.error(`All download methods failed for: ${filename}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in downloadVideo:', error);
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