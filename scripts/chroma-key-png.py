#!/usr/bin/env python3
import binascii
import math
import struct
import sys
import zlib
from pathlib import Path


def read_png(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a png")
    offset = 8
    width = height = color_type = None
    compressed = bytearray()
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk = data[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk)
            if bit_depth != 8 or color_type not in (2, 6):
                raise ValueError("expected 8-bit RGB/RGBA png")
        elif chunk_type == b"IDAT":
            compressed.extend(chunk)
        elif chunk_type == b"IEND":
            break
    raw = zlib.decompress(bytes(compressed))
    source_bpp = 4 if color_type == 6 else 3
    source_stride = width * source_bpp
    stride = width * 4
    pixels = bytearray(width * height * 4)
    source = 0
    previous = bytearray(source_stride)
    for y in range(height):
        filter_type = raw[source]
        source += 1
        scanline = bytearray(raw[source : source + source_stride])
        source += source_stride
        recon = bytearray(source_stride)
        for x in range(source_stride):
            left = recon[x - source_bpp] if x >= source_bpp else 0
            up = previous[x]
            up_left = previous[x - source_bpp] if x >= source_bpp else 0
            if filter_type == 0:
                value = scanline[x]
            elif filter_type == 1:
                value = scanline[x] + left
            elif filter_type == 2:
                value = scanline[x] + up
            elif filter_type == 3:
                value = scanline[x] + ((left + up) // 2)
            elif filter_type == 4:
                value = scanline[x] + paeth(left, up, up_left)
            else:
                raise ValueError(f"bad filter {filter_type}")
            recon[x] = value & 255
        for x in range(width):
            src_i = x * source_bpp
            dst_i = y * stride + x * 4
            pixels[dst_i : dst_i + 3] = recon[src_i : src_i + 3]
            pixels[dst_i + 3] = recon[src_i + 3] if color_type == 6 else 255
        previous = recon
    return width, height, pixels


def write_png(path, width, height, pixels):
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride : (y + 1) * stride])
    chunks = [
        (b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
        (b"IDAT", zlib.compress(bytes(raw), 9)),
        (b"IEND", b""),
    ]
    output = bytearray(b"\x89PNG\r\n\x1a\n")
    for chunk_type, chunk in chunks:
        output.extend(struct.pack(">I", len(chunk)))
        output.extend(chunk_type)
        output.extend(chunk)
        output.extend(struct.pack(">I", binascii.crc32(chunk_type + chunk) & 0xFFFFFFFF))
    Path(path).write_bytes(output)


def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def main():
    src, dst = sys.argv[1], sys.argv[2]
    width, height, pixels = read_png(src)
    key = sample_key(width, height, pixels)
    for i in range(0, len(pixels), 4):
        r, g, b = pixels[i], pixels[i + 1], pixels[i + 2]
        dist = math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
        if dist < 54:
            pixels[i + 3] = 0
        elif dist < 112:
            keep = (dist - 54) / 58
            pixels[i + 3] = round(pixels[i + 3] * keep)
            pixels[i] = clamp((r - key[0] * (1 - keep)) / max(keep, 0.2))
            pixels[i + 1] = clamp((g - key[1] * (1 - keep)) / max(keep, 0.2))
            pixels[i + 2] = clamp((b - key[2] * (1 - keep)) / max(keep, 0.2))
    write_png(dst, width, height, pixels)


def sample_key(width, height, pixels):
    points = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    colors = []
    for x, y in points:
        i = (y * width + x) * 4
        colors.append((pixels[i], pixels[i + 1], pixels[i + 2]))
    return tuple(round(sum(c[i] for c in colors) / len(colors)) for i in range(3))


def clamp(value):
    return max(0, min(255, round(value)))


if __name__ == "__main__":
    main()
