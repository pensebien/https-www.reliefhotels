/**
 * Photo gallery. Executive, Suites, and Penthouse now use real Relief Hotels & Suites
 * (Calabar) photography via media.images.photos — see site.ts. Events & Meetings, Outdoor
 * Bar, VIP Bar, Amenities (spa/wellness/gym), and two of the three Dining slots are still
 * stock and need real photography before launch: none of the current photos show a bar,
 * a boardroom, a garden pavilion, a gym, or a spa/wellness space.
 */

import { media } from "@/content/site";

export type GalleryCategory =
  | "executive"
  | "suites"
  | "penthouse"
  | "eventsMeetings"
  | "dining"
  | "outdoorBar"
  | "vipBar"
  | "amenities";

export type GalleryItem = {
  id: string;
  src: string;
  category: GalleryCategory;
  titleKey: string;
  featured?: boolean;
  /** Secondary labels for amenities grouping (spa, gym, penthouse terrace, etc.) */
  tags?: readonly string[];
};

/** Tab order on /gallery (excludes "all"). */
export const galleryCategories: GalleryCategory[] = [
  "executive",
  "suites",
  "penthouse",
  "eventsMeetings",
  "dining",
  "outdoorBar",
  "vipBar",
  "amenities",
];

export const galleryItems: GalleryItem[] = [
  // Executive
  {
    id: "executive-01",
    src: media.images.photos.executiveRoom,
    category: "executive",
    titleKey: "items.executive01",
    featured: true,
  },
  {
    id: "executive-02",
    src: media.images.roomBedAlt,
    category: "executive",
    titleKey: "items.executive02",
  },
  {
    id: "executive-03",
    src: media.images.photos.reception,
    category: "executive",
    titleKey: "items.executive03",
  },
  // Suites
  {
    id: "suites-01",
    src: media.images.photos.suiteBedroom,
    category: "suites",
    titleKey: "items.suites01",
    featured: true,
  },
  {
    id: "suites-02",
    src: media.images.suitesShowcase,
    category: "suites",
    titleKey: "items.suites02",
  },
  {
    id: "suites-03",
    src: media.images.roomBathroom,
    category: "suites",
    titleKey: "items.suites03",
  },
  // Penthouse
  {
    id: "penthouse-01",
    src: media.images.photos.suiteParlour,
    category: "penthouse",
    titleKey: "items.penthouse01",
    featured: true,
  },
  {
    id: "penthouse-02",
    src: media.images.suitesShowcase,
    category: "penthouse",
    titleKey: "items.penthouse02",
  },
  // Events & Meetings
  {
    id: "events-01",
    src: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
    category: "eventsMeetings",
    titleKey: "items.events01",
    featured: true,
  },
  {
    id: "events-02",
    src: media.images.grandLounge,
    category: "eventsMeetings",
    titleKey: "items.events02",
  },
  {
    id: "events-03",
    src: "https://images.unsplash.com/photo-1519167758481-83f550bb49b0?auto=format&fit=crop&w=1400&q=80",
    category: "eventsMeetings",
    titleKey: "items.events03",
  },
  // Dining
  {
    id: "dining-01",
    src: media.images.photos.restaurant,
    category: "dining",
    titleKey: "items.dining01",
    featured: true,
  },
  {
    id: "dining-02",
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80",
    category: "dining",
    titleKey: "items.dining02",
  },
  {
    id: "dining-03",
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    category: "dining",
    titleKey: "items.dining03",
  },
  // Outdoor bar
  {
    id: "outdoor-01",
    src: "https://images.unsplash.com/photo-1470337458703-46ad2256b196?auto=format&fit=crop&w=1400&q=80",
    category: "outdoorBar",
    titleKey: "items.outdoor01",
    featured: true,
  },
  {
    id: "outdoor-02",
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=80",
    category: "outdoorBar",
    titleKey: "items.outdoor02",
  },
  // VIP bar
  {
    id: "vip-01",
    src: media.images.grandLounge,
    category: "vipBar",
    titleKey: "items.vip01",
    featured: true,
  },
  {
    id: "vip-02",
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    category: "vipBar",
    titleKey: "items.vip02",
  },
  // Amenities — wellness, spa, gym, penthouse terrace
  {
    id: "amenities-spa-01",
    src: media.images.spa,
    category: "amenities",
    titleKey: "items.amenitiesSpa01",
    tags: ["spa", "wellness"],
    featured: true,
  },
  {
    id: "amenities-wellness-01",
    src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80",
    category: "amenities",
    titleKey: "items.amenitiesWellness01",
    tags: ["wellness", "spa"],
  },
  {
    id: "amenities-gym-01",
    src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
    category: "amenities",
    titleKey: "items.amenitiesGym01",
    tags: ["gym"],
  },
  {
    id: "amenities-penthouse-01",
    src: media.images.presidentialSuite,
    category: "amenities",
    titleKey: "items.amenitiesPenthouse01",
    tags: ["penthouse", "wellness"],
  },
];
