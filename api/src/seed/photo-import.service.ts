import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import { MediaService } from '../photos/media.service.js';
import { PhotosService } from '../photos/photos.service.js';

export interface ImportOptions {
  /** Local folder mirroring the original website's `/userFiles`. Without it photos are downloaded. */
  dir?: string;
  /** Also re-imports photos that already have files. */
  replace?: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  /** Source paths that could not be read or processed. */
  failed: string[];
}

/** Fetches every photo of the seeded list and generates its gallery sizes. */
@Injectable()
export class PhotoImportService {
  private readonly logger = new Logger('Import');

  constructor(
    private readonly photos: PhotosService,
    private readonly media: MediaService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  async run(options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, failed: [] };
    for (const photo of await this.photos.all()) {
      if (!photo.sourcePath || (photo.file && !options.replace)) {
        result.skipped++;
        continue;
      }
      try {
        const processed = await this.media.process(await this.read(photo.sourcePath, options.dir));
        await this.photos.setFile(photo.id, processed);
        await this.media.remove(photo.file, photo.widths);
        result.imported++;
        if (result.imported % 20 === 0) this.logger.log(`${result.imported} photos imported`);
      } catch (error) {
        this.logger.warn(`${photo.sourcePath}: ${String(error)}`);
        result.failed.push(photo.sourcePath);
      }
    }
    return result;
  }

  private async read(sourcePath: string, dir?: string): Promise<Buffer> {
    // Normalising against the root keeps a path with ".." inside the folder.
    if (dir) return readFile(join(dir, normalize(`/${sourcePath}`)));
    const url = `${this.config.photoSourceUrl}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'rychta-photo-import/1.0' },
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}
