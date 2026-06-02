/** Photo gallery — demo imagery (replace with hotel photography before launch) */

export type GalleryCategory =
  | "suites"
  | "dining"
  | "wellness"
  | "lobby"
  | "calabar";

export type GalleryItem = {
  id: string;
  src: string;
  category: GalleryCategory;
  titleKey: string;
  featured?: boolean;
};

export const galleryCategories: GalleryCategory[] = [
  "suites",
  "dining",
  "wellness",
  "lobby",
  "calabar",
];

export const galleryItems: GalleryItem[] = [
  {
    id: "suite-01",
    src: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
    category: "suites",
    titleKey: "gallery.items.suite01",
    featured: true,
  },
  {
    id: "suite-02",
    src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
    category: "suites",
    titleKey: "gallery.items.suite02",
    featured: true,
  },
  {
    id: "suite-03",
    src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
    category: "suites",
    titleKey: "gallery.items.suite03",
  },
  {
    id: "suite-04",
    src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80",
    category: "suites",
    titleKey: "gallery.items.suite04",
  },
  {
    id: "dining-01",
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80",
    category: "dining",
    titleKey: "gallery.items.dining01",
    featured: true,
  },
  {
    id: "dining-02",
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80",
    category: "dining",
    titleKey: "gallery.items.dining02",
  },
  {
    id: "dining-03",
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    category: "dining",
    titleKey: "gallery.items.dining03",
  },
  {
    id: "wellness-01",
    src: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1400&q=80",
    category: "wellness",
    titleKey: "gallery.items.wellness01",
    featured: true,
  },
  {
    id: "wellness-02",
    src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80",
    category: "wellness",
    titleKey: "gallery.items.wellness02",
  },
  {
    id: "lobby-01",
    src: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
    category: "lobby",
    titleKey: "gallery.items.lobby01",
  },
  {
    id: "lobby-02",
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    category: "lobby",
    titleKey: "gallery.items.lobby02",
  },
  {
    id: "calabar-01",
    src: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80",
    category: "calabar",
    titleKey: "gallery.items.calabar01",
  },
  {
    id: "calabar-02",
    src: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80",
    category: "calabar",
    titleKey: "gallery.items.calabar02",
  },
  {
    id: "calabar-03",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80",
    category: "calabar",
    titleKey: "gallery.items.calabar03",
  },
];
