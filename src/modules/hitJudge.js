// src/modules/hitJudge.js
let seenStart = null;

export function judge(poses, ctx, limitMs) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const hasValidPose = poses.length > 0 && poses[0].score > 0.3;
  const hasArms = hasValidPose && checkArmKeypoints(poses[0]);
  
  if (hasValidPose || hasArms) {
    if (!seenStart) seenStart = performance.now();
    const dur = performance.now() - seenStart;
    drawSkeleton(poses[0], ctx);
    if (dur > limitMs) {
      seenStart = null;
      return true;
    }
  } else {
    seenStart = null;
  }
  return false;
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
