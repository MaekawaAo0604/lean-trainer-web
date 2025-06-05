// IndexedDBを使用した動画ストレージ
const DB_NAME = 'HitVideoDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

let db = null;

// データベースの初期化
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Database failed to open');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('Database opened successfully');
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // オブジェクトストアが存在しない場合は作成
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// 動画を保存
export async function saveVideoToDB(videoData) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(videoData);
    
    request.onsuccess = () => {
      console.log('Video saved to IndexedDB');
      resolve();
    };
    
    request.onerror = () => {
      console.error('Error saving video:', request.error);
      reject(request.error);
    };
  });
}

// 全動画を取得
export async function getAllVideos() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
      const videos = request.result;
      // 最新順にソート
      videos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      // 最新10件のみ返す
      resolve(videos.slice(0, 10));
    };
    
    request.onerror = () => {
      console.error('Error getting videos:', request.error);
      reject(request.error);
    };
  });
}

// 特定の動画を取得
export async function getVideo(videoId) {
  if (!db) await initDB();
  
  console.log(`Getting video with ID: ${videoId}`);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(videoId);
    
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        console.log(`Video found: ${result.filename}, blob size: ${result.blob?.size || 'undefined'}, blob type: ${result.blob?.type || 'undefined'}`);
        
        // Blobが正しく保存されているかチェック
        if (!result.blob || !(result.blob instanceof Blob)) {
          console.error('Invalid blob data for video:', videoId, result);
          reject(new Error('Invalid blob data'));
          return;
        }
      } else {
        console.error('Video not found:', videoId);
      }
      resolve(result);
    };
    
    request.onerror = () => {
      console.error('Error getting video:', request.error);
      reject(request.error);
    };
  });
}

// 動画を削除
export async function deleteVideoFromDB(videoId) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(videoId);
    
    request.onsuccess = () => {
      console.log('Video deleted from IndexedDB');
      resolve();
    };
    
    request.onerror = () => {
      console.error('Error deleting video:', request.error);
      reject(request.error);
    };
  });
}

// 全動画を削除
export async function clearAllVideos() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();
    
    request.onsuccess = () => {
      console.log('All videos cleared from IndexedDB');
      resolve();
    };
    
    request.onerror = () => {
      console.error('Error clearing videos:', request.error);
      reject(request.error);
    };
  });
}

// 古い動画を削除（10件を超えた場合）
export async function cleanupOldVideos() {
  if (!db) await initDB();
  
  const videos = await getAllVideos();
  if (videos.length > 10) {
    // 古い動画を削除
    const videosToDelete = videos.slice(10);
    for (const video of videosToDelete) {
      await deleteVideoFromDB(video.id);
    }
  }
}