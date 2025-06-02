// src/modules/detector.js
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";

export async function initDetector() {
  await poseDetection.createDetector; // Backendセットアップ待ち
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: "Lightning",
      enableSmoothing: true,
    }
  );
  return detector;
}
