export const ATELIER_PASS = "marigold-twilight-2026";
export const STORAGE_KEY = "atelier_unlocked";
export const WATERMARK_TEXT = "ANANYA MEHTA · revaah · 21.05.2026 · view only";

export type AtelierView =
  | "login"
  | "library"
  | "project"
  | "upload"
  | "team"
  | "client";

export type GalleryCard = {
  span: "span-4" | "span-5" | "span-6" | "span-7" | "span-8";
  image: string;
  city: string;
  name: string;
  sub: string;
  palette: string[];
};
