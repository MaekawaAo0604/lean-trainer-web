// src/modules/flash.js
export function flashHit(mediaStream) {
  // 画面フラッシュ
  flashScreen();
  // 音声再生
  playBeep();
  // LED トーチ（対応端末のみ）
  triggerTorch(mediaStream);
}

export function flashScreen() {
  const div = document.getElementById("flash");
  div.style.opacity = "1";
  setTimeout(() => {
    div.style.opacity = "0";
  }, 150);
}

export function playBeep() {
  const beep = document.getElementById("beep");
  if (beep) {
    beep.currentTime = 0;
    beep.play().catch((err) => {
      console.warn("Beep 再生エラー:", err);
    });
  }
}

async function triggerTorch(mediaStream) {
  try {
    const [track] = mediaStream.getVideoTracks();
    const capabilities = track.getCapabilities();
    if (capabilities.torch) {
      await track.applyConstraints({ advanced: [{ torch: true }] });
      setTimeout(async () => {
        await track.applyConstraints({ advanced: [{ torch: false }] });
      }, 150);
    }
  } catch (e) {
    // torch が未対応の場合は何もしない
  }
}
