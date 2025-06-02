// src/modules/hitJudge.js
let seenStart = null;

export function judge(poses, ctx, limitMs) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const hasPerson = poses.length > 0 && poses[0].score > 0.3;
  if (hasPerson) {
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
