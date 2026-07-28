// FILE: lib/passport/attachCameraStream.test.ts

import { describe, expect, it, vi } from "vitest";
import { attachCameraStream } from "./attachCameraStream";

describe("attachCameraStream", () => {
  it("assigns stream and starts playback", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const video = {
      srcObject: null as MediaStream | null,
      play,
    } as unknown as HTMLVideoElement;

    const stream = {} as MediaStream;
    await attachCameraStream(video, stream);

    expect(video.srcObject).toBe(stream);
    expect(play).toHaveBeenCalled();
  });
});
