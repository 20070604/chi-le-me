from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


FRAME_SIZE = 256
FRAME_RATE = 30
BLACK_EDGE_LIMIT = 58
TRANSPARENT_LIMIT = 4


def connected_black_alpha(rgb_bytes: bytes) -> bytes:
    rgb = np.frombuffer(rgb_bytes, dtype=np.uint8).reshape((FRAME_SIZE, FRAME_SIZE, 3))
    brightness = rgb.max(axis=2)

    dark_candidate = np.where(brightness <= BLACK_EDGE_LIMIT, 255, 0).astype(np.uint8)
    flood_source = Image.fromarray(dark_candidate, mode="L").copy()
    ImageDraw.floodfill(flood_source, (0, 0), 128, thresh=0)
    flooded = np.asarray(flood_source)
    connected_background = flooded == 128

    edge = np.clip(
        (brightness.astype(np.float32) - TRANSPARENT_LIMIT)
        / (BLACK_EDGE_LIMIT - TRANSPARENT_LIMIT),
        0,
        1,
    )
    edge = edge * edge * (3 - 2 * edge)
    alpha = np.full((FRAME_SIZE, FRAME_SIZE), 255, dtype=np.uint8)
    alpha[connected_background] = np.round(edge[connected_background] * 255).astype(np.uint8)

    rgba = np.dstack((rgb, alpha))
    return rgba.tobytes()


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove a connected black video background and encode VP9 alpha.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--ffmpeg", required=True, type=Path)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame_bytes = FRAME_SIZE * FRAME_SIZE * 3

    decoder = subprocess.Popen(
        [
            str(args.ffmpeg),
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(args.input),
            "-an",
            "-vf",
            f"crop=800:800:240:220,scale={FRAME_SIZE}:{FRAME_SIZE}:flags=lanczos,fps={FRAME_RATE}",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "pipe:1",
        ],
        stdout=subprocess.PIPE,
    )

    encoder = subprocess.Popen(
        [
            str(args.ffmpeg),
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-s",
            f"{FRAME_SIZE}x{FRAME_SIZE}",
            "-r",
            str(FRAME_RATE),
            "-i",
            "pipe:0",
            "-an",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-auto-alt-ref",
            "0",
            "-b:v",
            "0",
            "-crf",
            "34",
            "-deadline",
            "good",
            "-cpu-used",
            "3",
            str(args.output),
        ],
        stdin=subprocess.PIPE,
    )

    if decoder.stdout is None or encoder.stdin is None:
        raise RuntimeError("Could not open the FFmpeg frame pipes.")

    frame_count = 0
    while True:
        frame = decoder.stdout.read(frame_bytes)
        if not frame:
            break
        if len(frame) != frame_bytes:
            raise RuntimeError("The source video ended with an incomplete frame.")
        encoder.stdin.write(connected_black_alpha(frame))
        frame_count += 1

    decoder.stdout.close()
    encoder.stdin.close()
    decoder_status = decoder.wait()
    encoder_status = encoder.wait()
    if decoder_status or encoder_status:
        raise RuntimeError(f"FFmpeg failed: decoder={decoder_status}, encoder={encoder_status}")

    print(f"Created {args.output} ({frame_count} frames at {FRAME_RATE} fps)")


if __name__ == "__main__":
    main()
