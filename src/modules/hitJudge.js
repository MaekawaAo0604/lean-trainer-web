// src/modules/hitJudge.js
let seenStart = null;
let hitCooldown = null;

export function judge(poses, ctx, limitMs) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Hit後のクールダウン中は判定しない
  if (hitCooldown && performance.now() - hitCooldown < 2000) {
    return { hit: false, cooling: true };
  }

  const hasValidPose = poses.length > 0 && poses[0].score > 0.3;
  if (!hasValidPose) {
    seenStart = null;
    return { hit: false, cooling: false };
  }

  const hasFullBody = checkFullBodyKeypoints(poses[0]);
  const hasArmsOnly = !hasFullBody && checkArmKeypoints(poses[0]);
  
  if (hasFullBody || hasArmsOnly) {
    if (!seenStart) seenStart = performance.now();
    const dur = performance.now() - seenStart;
    drawSkeleton(poses[0], ctx);
    
    // 胴体検出時と腕のみ検出時で異なる判定時間
    const currentLimitMs = hasArmsOnly ? limitMs * 2 : limitMs;
    
    if (dur > currentLimitMs) {
      seenStart = null;
      hitCooldown = performance.now();
      return { hit: true, cooling: false, isArmsOnly: hasArmsOnly };
    }
  } else {
    seenStart = null;
  }
  return { hit: false, cooling: false };
}

function checkFullBodyKeypoints(pose) {
  // 胴体や腰部のキーポイントをチェック
  const bodyKeypoints = [
    'left_hip', 'right_hip', 'left_knee', 'right_knee'
  ];
  
  let validBodyPoints = 0;
  
  pose.keypoints.forEach((keypoint, index) => {
    const keypointName = getKeypointName(index);
    if (bodyKeypoints.includes(keypointName) && keypoint.score > 0.3) {
      validBodyPoints++;
    }
  });
  
  // 少なくとも2つの胴体関連のキーポイントが検出されていれば全身と判定
  return validBodyPoints >= 2;
}

function checkArmKeypoints(pose) {
  // 腕に関連するキーポイントをチェック
  const armKeypoints = [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow', 
    'left_wrist', 'right_wrist'
  ];
  
  let validArmPoints = 0;
  
  pose.keypoints.forEach((keypoint, index) => {
    const keypointName = getKeypointName(index);
    if (armKeypoints.includes(keypointName) && keypoint.score > 0.3) {
      validArmPoints++;
    }
  });
  
  // 少なくとも3つの腕関連のキーポイントが検出されていればOK
  return validArmPoints >= 3;
}

function getKeypointName(index) {
  const keypointNames = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];
  return keypointNames[index] || 'unknown';
}

function drawSkeleton(pose, ctx) {
  ctx.fillStyle = "#00FF00";
  pose.keypoints.forEach((p) => {
    if (p.score > 0.3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}
