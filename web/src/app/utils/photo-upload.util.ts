import type { PhotoCategory } from '@models/photo-category.model';
import type { AdminApiService } from '@services/admin-api.service';

/** Where uploaded photos belong: a gallery category, for `apartment` with the apartment's id. */
export interface PhotoTarget {
  category: PhotoCategory;
  apartmentId: number | null;
}

/**
 * Uploads the files one after another, reporting the position before each one.
 * Returns the names of the files the server refused.
 */
export async function uploadPhotos(
  api: AdminApiService,
  files: File[],
  target: PhotoTarget,
  progress: (n: number, total: number) => void,
): Promise<string[]> {
  const refused: string[] = [];
  for (const [i, file] of files.entries()) {
    progress(i + 1, files.length);
    try {
      await api.uploadPhoto(file, target.category, target.apartmentId);
    } catch {
      refused.push(file.name);
    }
  }
  return refused;
}
