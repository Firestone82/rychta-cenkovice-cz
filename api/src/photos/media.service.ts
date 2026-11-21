import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { type AppConfig, InjectConfig } from '../config/app.config.js';

/** Responsive sizes generated for each photo. */
export const PHOTO_WIDTHS = [480, 960, 1600];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const MAX_PIXELS = 80_000_000;
const MIN_SIDE = 16;
const FILE_BASE = /^[a-f0-9]{16}$/;
const MEDIA_NAME = /^[a-f0-9]{16}-\d{2,4}\.jpg$/;

export interface ProcessedPhoto {
  /** Base name; the files on disk are `<file>-<width>.jpg`. */
  file: string;
  /** Size of the largest generated file. */
  width: number;
  height: number;
  widths: number[];
  /** Average colour, `#rrggbb`. */
  color: string;
  /** Data URI of a 24 px wide blurred JPEG. */
  placeholder: string;
}

/** Thrown when the upload is not an image this server can read. */
export class NotAnImageError extends Error {}

/**
 * Turns an uploaded or imported photo into the files the gallery needs: responsive JPEG sizes,
 * a tiny blurred placeholder and the average colour shown while the real image loads.
 */
@Injectable()
export class MediaService {
  constructor(@InjectConfig() private readonly config: AppConfig) {}

  /** True for a file name this service generated. */
  static isMediaName(name: string): boolean {
    return MEDIA_NAME.test(name);
  }

  async process(input: Buffer): Promise<ProcessedPhoto> {
    // rotate() without an angle applies the EXIF orientation; white backs transparent PNGs.
    const open = () =>
      sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
        .rotate()
        .flatten({ background: '#ffffff' });

    let original: { width: number; height: number };
    try {
      const { info } = await open().raw().toBuffer({ resolveWithObject: true });
      original = info;
    } catch (error) {
      throw new NotAnImageError('cannot read image', { cause: error });
    }
    if (original.width < MIN_SIDE || original.height < MIN_SIDE) {
      throw new NotAnImageError(`image is too small (${original.width}x${original.height})`);
    }

    const widths = PHOTO_WIDTHS.filter((width) => width < original.width);
    // The original is smaller than the next size: keep it at its own width.
    if (widths.length < PHOTO_WIDTHS.length) widths.push(original.width);

    await mkdir(this.config.mediaDir, { recursive: true });
    const file = randomBytes(8).toString('hex');
    let largest = { width: 0, height: 0 };
    for (const width of widths) {
      largest = await open()
        .resize({ width, kernel: 'lanczos3' })
        .jpeg({ quality: width <= 480 ? 78 : 82 })
        .toFile(this.path(file, width));
    }

    const tiny = await open().resize({ width: 24 }).blur(0.8).jpeg({ quality: 55 }).toBuffer();
    const { channels } = await open().stats();
    const [r, g = r, b = r] = channels.map((channel) => Math.round(channel.mean));
    const hex = (value: number) => value.toString(16).padStart(2, '0');

    return {
      file,
      width: largest.width,
      height: largest.height,
      widths,
      color: `#${hex(r)}${hex(g)}${hex(b)}`,
      placeholder: `data:image/jpeg;base64,${tiny.toString('base64')}`,
    };
  }

  /** Deletes all generated sizes of a photo. */
  async remove(file: string, widths: number[]): Promise<void> {
    if (!FILE_BASE.test(file)) return;
    await Promise.all(widths.map((width) => rm(this.path(file, width), { force: true })));
  }

  private path(file: string, width: number): string {
    return join(this.config.mediaDir, `${file}-${width}.jpg`);
  }
}
