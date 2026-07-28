// FILE: lib/passport/attachCameraStream.ts
// Bind a MediaStream to a video element (used by CameraCapture).

export async function attachCameraStream(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.srcObject = stream;
  await video.play();
}
