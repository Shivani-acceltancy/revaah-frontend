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

export const GALLERY_CARDS: GalleryCard[] = [
  {
    span: "span-7",
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80",
    city: "Ranthambore · Aman-i-Khás",
    name: "Of Tigers & Twilight",
    sub: "Wedding · Forest Royal · Dec 2025",
    palette: ["#5C1A2B", "#B8893A", "#3E4A2B", "#E8C8B8", "#2A2017"],
  },
  {
    span: "span-5",
    image:
      "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1000&q=80",
    city: "Jaipur · Rambagh Palace",
    name: "Marigold Manuscript",
    sub: "Mehendi · Heritage · Nov 2025",
    palette: ["#E8A93C", "#C97B5A", "#F4EDE2", "#5C1A2B"],
  },
  {
    span: "span-4",
    image:
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=900&q=80",
    city: "Udaipur · Taj Lake Palace",
    name: "Lotus on Water",
    sub: "Wedding · Mughal · Feb 2026",
    palette: ["#F4EDE2", "#E8C8B8", "#B8893A", "#5C1A2B"],
  },
  {
    span: "span-4",
    image:
      "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=900&q=80",
    city: "Goa · Taj Exotica",
    name: "Salt & Saffron",
    sub: "Reception · Coastal · Jan 2026",
    palette: ["#FAF6F0", "#D6B97A", "#3E4A5C", "#C97B5A"],
  },
  {
    span: "span-4",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=80",
    city: "Jaisalmer · Suryagarh",
    name: "Desert in Bloom",
    sub: "Sangeet · Folk · Mar 2026",
    palette: ["#E8A93C", "#5C1A2B", "#3E4A2B", "#FAF6F0"],
  },
  {
    span: "span-8",
    image:
      "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1400&q=80",
    city: "Mumbai · Taj Mahal Palace",
    name: "A City in Champagne",
    sub: "Reception · Modern Luxe · Apr 2026",
    palette: ["#F4EDE2", "#D6B97A", "#2A2017", "#5C1A2B"],
  },
  {
    span: "span-4",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80",
    city: "Jodhpur · Umaid Bhawan",
    name: "Stone & Cinnabar",
    sub: "Wedding · Maharaja · Dec 2025",
    palette: ["#C97B5A", "#B8893A", "#5C1A2B", "#2A2017"],
  },
];

export const COLLECTIONS = [
  {
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80",
    label: "Collection 01",
    title: "Rajasthan Royal",
    count: "28 projects · 6 cities",
  },
  {
    image:
      "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=1000&q=80",
    label: "Collection 02",
    title: "Coastal & Light",
    count: "19 projects · Goa, Alibaug, Pondicherry",
  },
  {
    image:
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1000&q=80",
    label: "Collection 03",
    title: "Garden of Marigolds",
    count: "42 projects · all events",
  },
];
