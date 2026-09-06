/** Source content captured from https://www.reliefhotelsandsuites.com/ */

export const site = {
  name: "Relief Hotels & Suites",
  shortName: "RELIEF",
  tagline: "Hotels & Suites",
  location: "Calabar, Cross River, Nigeria",
  address: {
    line1: "2 CICC Road, Ikot Mbo,",
    line2: "Calabar, Cross River, Nigeria",
    full: "2 CICC Road, Ikot Mbo, Calabar, Cross River, Nigeria",
  },
  mapsUrl:
    "https://www.google.com/maps/place/Orion+Terence+Hotel+%26+Suite/@5.0304148,8.3144,15z/data=!3m1!4b1!4m6!3m5!1s0x105d7d15a5878d7b:0xe167472c61e3359c!8m2!3d5.0304151!4d8.3328541!16s%2Fg%2F11fct342vc?entry=ttu",
  logoSrc: "/relief-logo.png",
  faviconSrc: "/favicon.ico",
  iconSrc: "/icon-32.png",
  appleIconSrc: "/apple-touch-icon.png",
  phone: "+234 810 065 3664",
  phoneHref: "tel:+2348100653664",
  /** wa.me link — digits only, no + or spaces */
  whatsappHref:
    "https://wa.me/2348100653664?text=" +
    encodeURIComponent(
      "Hello Relief Hotels & Suites — I’d like help with a stay.",
    ),
  email: "reservations@reliefhotelsandsuites.com",
  themeStorageKey: "relief-theme",
} as const;

export const media = {
  heroVideo:
    "https://videos.pexels.com/video-files/29218201/12612858_1920_1080_30fps.mp4",
  ctaVideo:
    "https://videos.pexels.com/video-files/7233782/7233782-hd_1920_1080_25fps.mp4",
  emblem: "https://images.shadcnspace.com/assets/svgs/primary-leaf.svg",
  images: {
    presidentialSuite:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    rooftopDining:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    spa: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80",
    grandLounge:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    suitesShowcase:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    calabar:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    roomDeluxe:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
    roomExecutive:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    roomBathroom:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    roomBedAlt:
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
    tourCulture:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
    /**
     * Real Relief Hotels & Suites (Calabar) photography, added 2026-09-05 from the property's
     * own photo set. Used wherever a caption makes a specific claim these photos can back up (a
     * real room, the real lobby, the real dining room, the real facade). Slots whose copy
     * promises something these photos don't show — skyline/panoramic views, a wellness terrace,
     * a bar, a boardroom — intentionally keep the stock placeholder above until that shot
     * exists; see gallery.ts for the running list of what's still pending.
     */
    photos: {
      exterior: "/images/hotel/exterior.jpg",
      reception: "/images/hotel/reception.jpg",
      restaurant: "/images/hotel/restaurant.jpg",
      guestRoom: "/images/hotel/guest-room.jpg",
      executiveRoom: "/images/hotel/executive-room.jpg",
      suiteBedroom: "/images/hotel/suite-bedroom.jpg",
      suiteParlour: "/images/hotel/suite-parlour.jpg",
    },
  },
} as const;

export const stats = [
  { value: 24, labelKey: "stats.suites" },
  { value: 150, labelKey: "stats.seating" },
  { value: 3, labelKey: "stats.venues" },
] as const;

export const hotelAmenities = [
  "outdoorBar",
  "nonSmokingRooms",
  "digitalKey",
  "concierge",
  "privateLounge",
  "onSiteRestaurant",
  "guestGym",
  "wifi",
  "roomService",
  "barbecueGrill",
  "meetingRooms",
  "barbingSalon",
] as const;

/** Homepage room-category showcase — links to rooms catalog tabs. */
export const experienceCards = [
  {
    id: "guestRoom",
    titleKey: "roomTypes.guestRoom.title",
    subtitleKey: "experiences.guestRoom.subtitle",
    image: media.images.photos.guestRoom,
    href: "/rooms?category=guestRoom",
    large: true,
  },
  {
    id: "executive",
    titleKey: "roomTypes.executive.title",
    subtitleKey: "experiences.executive.subtitle",
    image: media.images.photos.executiveRoom,
    href: "/rooms?category=executive",
  },
  {
    id: "suites",
    titleKey: "roomTypes.suites.title",
    subtitleKey: "experiences.suites.subtitle",
    image: media.images.photos.suiteBedroom,
    href: "/rooms?category=suites",
  },
  {
    id: "penthouse",
    titleKey: "roomTypes.penthouse.title",
    subtitleKey: "experiences.penthouse.subtitle",
    image: media.images.photos.suiteParlour,
    href: "/rooms?category=penthouse",
  },
] as const;

export const marqueeItems = [
  "marquee.guestRoom",
  "marquee.executive",
  "marquee.suites",
  "marquee.penthouse",
] as const;

export const roomHighlights = [
  {
    id: "guestRoom",
    titleKey: "roomTypes.guestRoom.title",
    descriptionKey: "roomTypes.guestRoom.description",
    image: media.images.photos.guestRoom,
  },
  {
    id: "executive",
    titleKey: "roomTypes.executive.title",
    descriptionKey: "roomTypes.executive.description",
    image: media.images.photos.executiveRoom,
  },
  {
    id: "suites",
    titleKey: "roomTypes.suites.title",
    descriptionKey: "roomTypes.suites.description",
    image: media.images.photos.suiteBedroom,
  },
  {
    id: "penthouse",
    titleKey: "roomTypes.penthouse.title",
    descriptionKey: "roomTypes.penthouse.description",
    image: media.images.photos.suiteParlour,
  },
] as const;

/** In-hotel room categories (same data as homepage highlights). */
export const hotelServices = roomHighlights;

export const stayPreferences = [
  { value: "guest-room", labelKey: "form.stay.guestRoom" },
  { value: "executive-room", labelKey: "form.stay.executive" },
  { value: "signature-suite", labelKey: "form.stay.suites" },
  { value: "presidential-suite", labelKey: "form.stay.penthouse" },
] as const;

export const roomCategories = [
  "guestRoom",
  "executive",
  "suites",
  "penthouse",
] as const;

export type RoomCategory = (typeof roomCategories)[number];

export const roomsCatalogTabs = ["all", ...roomCategories] as const;

export type RoomsCatalogTab = (typeof roomsCatalogTabs)[number];

export const roomsPageStayIncludes = [
  "nonSmokingRooms",
  "onSiteRestaurant",
  "outdoorBar",
  "fitnessCenter",
  "vipBar",
] as const;

/** Fields shown in the room detail modal (Hilton-style highlights). */
export const roomDetailHighlightFields = [
  "guests",
  "views",
  "layout",
  "bathroom",
  "dining",
  "location",
] as const;

export type RoomDetailHighlightField = (typeof roomDetailHighlightFields)[number];

export const rooms = [
  {
    id: "guest-room",
    slug: "guest-room",
    category: "guestRoom" as const,
    nameKey: "rooms.guest.name",
    descriptionKey: "rooms.guest.description",
    priceFrom: 95000,
    currency: "NGN",
    image: media.images.photos.guestRoom,
    gallery: [
      media.images.photos.guestRoom,
      media.images.photos.reception,
      media.images.photos.restaurant,
      media.images.roomBathroom,
    ],
    amenitiesKeys: [
      "rooms.amenities.kingBed",
      "rooms.amenities.rainShower",
      "rooms.amenities.cityView",
    ],
    featured: false,
  },
  {
    id: "executive-room",
    slug: "executive-room",
    category: "executive" as const,
    nameKey: "rooms.executive.name",
    descriptionKey: "rooms.executive.description",
    priceFrom: 125000,
    currency: "NGN",
    image: media.images.photos.executiveRoom,
    gallery: [
      media.images.photos.executiveRoom,
      media.images.photos.reception,
      media.images.roomBathroom,
      media.images.photos.restaurant,
    ],
    amenitiesKeys: [
      "rooms.amenities.workDesk",
      "rooms.amenities.rainShower",
      "rooms.amenities.loungeAccess",
    ],
    featured: false,
  },
  {
    id: "signature-suite",
    slug: "signature-suite",
    category: "suites" as const,
    nameKey: "rooms.suites.name",
    descriptionKey: "rooms.suites.description",
    priceFrom: 185000,
    currency: "NGN",
    image: media.images.photos.suiteBedroom,
    gallery: [
      media.images.photos.suiteBedroom,
      media.images.photos.suiteParlour,
      media.images.photos.reception,
      media.images.spa,
    ],
    amenitiesKeys: [
      "rooms.amenities.kingBed",
      "rooms.amenities.marbleBath",
      "rooms.amenities.cityView",
      "rooms.amenities.butler",
    ],
    featured: true,
  },
  {
    id: "presidential-suite",
    slug: "presidential-suite",
    category: "penthouse" as const,
    nameKey: "rooms.presidential.name",
    descriptionKey: "rooms.presidential.description",
    priceFrom: 420000,
    currency: "NGN",
    image: media.images.photos.suiteParlour,
    gallery: [
      media.images.photos.suiteParlour,
      media.images.photos.suiteBedroom,
      media.images.photos.exterior,
      media.images.spa,
    ],
    amenitiesKeys: [
      "rooms.amenities.panoramic",
      "rooms.amenities.livingRoom",
      "rooms.amenities.butler",
      "rooms.amenities.airportTransfer",
    ],
    featured: true,
  },
  {
    id: "executive-spa",
    slug: "executive-spa",
    category: "executive" as const,
    nameKey: "rooms.executiveSpa.name",
    descriptionKey: "rooms.executiveSpa.description",
    priceFrom: 210000,
    currency: "NGN",
    image: media.images.photos.executiveRoom,
    gallery: [
      media.images.photos.executiveRoom,
      media.images.spa,
      media.images.roomBathroom,
      media.images.photos.reception,
    ],
    amenitiesKeys: [
      "rooms.amenities.workDesk",
      "rooms.amenities.loungeAccess",
      "rooms.amenities.spaCredit",
      "rooms.amenities.healthyMenu",
    ],
    featured: false,
  },
] as const;

export const tours = [
  {
    id: "calabar-heritage",
    slug: "calabar-heritage",
    nameKey: "tours.heritage.name",
    descriptionKey: "tours.heritage.description",
    durationKey: "tours.heritage.duration",
    priceFrom: 35000,
    image: media.images.tourCulture,
    guideIncluded: true,
  },
  {
    id: "marina-tinapa",
    slug: "marina-tinapa",
    nameKey: "tours.marina.name",
    descriptionKey: "tours.marina.description",
    durationKey: "tours.marina.duration",
    priceFrom: 28000,
    image: media.images.calabar,
    guideIncluded: true,
  },
  {
    id: "obudu-day-trip",
    slug: "obudu-day-trip",
    nameKey: "tours.obudu.name",
    descriptionKey: "tours.obudu.description",
    durationKey: "tours.obudu.duration",
    priceFrom: 95000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
    guideIncluded: true,
  },
  {
    id: "culinary-calabar",
    slug: "culinary-calabar",
    nameKey: "tours.culinary.name",
    descriptionKey: "tours.culinary.description",
    durationKey: "tours.culinary.duration",
    priceFrom: 42000,
    image: media.images.rooftopDining,
    guideIncluded: true,
  },
] as const;

export const cityExperiences = [
  {
    id: "carnival",
    nameKey: "city.carnival.name",
    descriptionKey: "city.carnival.description",
  },
  {
    id: "river-cruise",
    nameKey: "city.river.name",
    descriptionKey: "city.river.description",
  },
  {
    id: "executive-hosting",
    nameKey: "city.executive.name",
    descriptionKey: "city.executive.description",
  },
] as const;

export const structuredData = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: site.name,
  description:
    "Luxury hotel in Calabar offering Guest Rooms, Executive rooms, Suites, and Penthouse accommodations.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "2 CICC Road, Ikot Mbo",
    addressLocality: "Calabar",
    addressRegion: "Cross River",
    addressCountry: "NG",
  },
  telephone: site.phone,
  email: site.email,
  priceRange: "₦₦₦₦",
} as const;
