from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITE_PATH = ROOT / "src" / "assets" / "octopus-chef-sprite-v1.png"
LOOP_PATH = ROOT / "src" / "assets" / "octopus-chef-loop-v1.webp"
IDLE_PATH = ROOT / "src" / "assets" / "octopus-chef-idle-v1.png"

FPS = 24
DURATION_SECONDS = 3.2
FRAME_COUNT = round(FPS * DURATION_SECONDS)
OUTPUT_SIZE = 128


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def pulse(time: float, start: float, peak: float, end: float) -> float:
    if time <= start or time >= end:
        return 0.0
    if time <= peak:
        return ease((time - start) / (peak - start))
    return ease((end - time) / (end - peak))


def normalized_pose(cell: Image.Image, crop_box: tuple[int, int, int, int]) -> Image.Image:
    cropped = cell.crop(crop_box)
    ratio = min((OUTPUT_SIZE - 4) / cropped.width, (OUTPUT_SIZE - 4) / cropped.height)
    resized = cropped.resize(
        (round(cropped.width * ratio), round(cropped.height * ratio)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    left = (OUTPUT_SIZE - resized.width) // 2
    top = OUTPUT_SIZE - resized.height - 2
    canvas.alpha_composite(resized, (left, top))
    return canvas


def main() -> None:
    sprite = Image.open(SPRITE_PATH).convert("RGBA")
    cell_width = sprite.width // 3
    cell_height = sprite.height // 2

    raw_poses = [
        sprite.crop((0, 0, cell_width, cell_height)),
        sprite.crop((cell_width, 0, cell_width * 2, cell_height)),
        sprite.crop((cell_width * 2, 0, cell_width * 3, cell_height)),
    ]

    union = Image.new("L", (cell_width, cell_height), 0)
    for pose in raw_poses:
        union = Image.frombytes("L", union.size, bytes(max(a, b) for a, b in zip(union.tobytes(), pose.getchannel("A").tobytes())))
    bbox = union.getbbox() or (0, 0, cell_width, cell_height)
    padding = 8
    crop_box = (
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(cell_width, bbox[2] + padding),
        min(cell_height, bbox[3] + padding),
    )

    idle, blink, wave = [normalized_pose(pose, crop_box) for pose in raw_poses]
    idle.save(IDLE_PATH, optimize=True, compress_level=9)

    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        time = index / FPS
        blink_weight = pulse(time, 0.70, 0.80, 0.90)
        wave_weight = pulse(time, 1.55, 2.08, 2.78)

        frame = Image.blend(idle, blink, blink_weight)
        frame = Image.blend(frame, wave, wave_weight)

        breathing = 1.0 + 0.012 * (0.5 - 0.5 * math.cos(2 * math.pi * time / DURATION_SECONDS))
        next_size = round(OUTPUT_SIZE * breathing)
        scaled = frame.resize((next_size, next_size), Image.Resampling.LANCZOS)
        composed = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
        composed.alpha_composite(scaled, ((OUTPUT_SIZE - next_size) // 2, OUTPUT_SIZE - next_size))
        frames.append(composed)

    frames[0].save(
        LOOP_PATH,
        save_all=True,
        append_images=frames[1:],
        duration=round(1000 / FPS),
        loop=0,
        quality=84,
        method=6,
        minimize_size=True,
    )

    print(f"Created {LOOP_PATH.relative_to(ROOT)} with {FRAME_COUNT} frames")
    print(f"Created {IDLE_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
