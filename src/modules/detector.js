import * as poseDetection from '@tensorflow-models/pose-detection';

export async function initDetector() {
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING, // ✅ 修正
    enableSmoothing: true
  };

  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  return detector;
}
