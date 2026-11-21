/** One picture of the lightbox, whatever it comes from. */
export interface Slide {
  /** The largest file. */
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  /** Tiny inline preview shown until the picture arrives. */
  placeholder?: string;
}
