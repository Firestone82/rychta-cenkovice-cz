import images from '@content/images.json';

export interface BundledImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

const IMAGES: Record<string, { widths: number[]; height: number } | undefined> = images;

/** An image from public/img described in content/images.json, or null when the key is unknown. */
export function bundled(name: string): BundledImage | null {
  const image = IMAGES[name];
  if (!image) return null;
  const { widths, height } = image;
  return {
    src: `/img/${name}-${widths[0]}.webp`,
    srcset: widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', '),
    width: widths[0],
    height,
  };
}
