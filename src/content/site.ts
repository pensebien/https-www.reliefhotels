/** Source content captured from https://www.reliefhotelsandsuites.com/ */

export const site = {
  name: "Relief Hotels & Suites",
  shortName: "RELIEF",
  tagline: "Hotels & Suites",
  location: "Calabar, Cross River, Nigeria",
  phone: "+234 803 326 2719",
  phoneHref: "tel:+2348033262719",
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
    signatureService:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    calabar:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    roomDeluxe:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
    roomExecutive:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    tourCulture:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
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

export const experienceCards = [
  {
    id: "presidential",
    titleKey: "experiences.presidential.title",
    subtitleKey: "experiences.presidential.subtitle",
    image: media.images.presidentialSuite,
    large: true,
  },
  {
    id: "dining",
    titleKey: "experiences.dining.title",
    subtitleKey: "experiences.dining.subtitle",
    image: media.images.rooftopDining,
  },
  {
    id: "spa",
    titleKey: "experiences.spa.title",
    subtitleKey: "experiences.spa.subtitle",
    image: media.images.spa,
  },
  {
    id: "lounge",
    titleKey: "experiences.lounge.title",
    subtitleKey: "experiences.lounge.subtitle",
    image: media.images.grandLounge,
  },
] as const;

export const marqueeItems = [
  "marquee.transfer",
  "marquee.suites",
  "marquee.dining",
  "marquee.concierge",
] as const;

export const hotelServices = [
  {
    id: "suites",
    titleKey: "services.suites.title",
    descriptionKey: "services.suites.description",
    image: media.images.signatureService,
  },
  {
    id: "dining",
    titleKey: "services.dining.title",
    descriptionKey: "services.dining.description",
    image: media.images.rooftopDining,
  },
  {
    id: "wellness",
    titleKey: "services.wellness.title",
    descriptionKey: "services.wellness.description",
    image: media.images.spa,
  },
  {
    id: "concierge",
    titleKey: "services.concierge.title",
    descriptionKey: "services.concierge.description",
    image: media.images.grandLounge,
  },
] as const;

export const stayPreferences = [
  { value: "signature-suite", labelKey: "form.stay.signature" },
  { value: "presidential-suite", labelKey: "form.stay.presidential" },
  { value: "executive-room", labelKey: "form.stay.executive" },
  { value: "romantic-escape", labelKey: "form.stay.romantic" },
  { value: "wellness-retreat", labelKey: "form.stay.wellness" },
  { value: "extended-stay", labelKey: "form.stay.extended" },
] as const;

export const rooms = [
  {
    id: "signature-suite",
    slug: "signature-suite",
    nameKey: "rooms.signature.name",
    descriptionKey: "rooms.signature.description",
    priceFrom: 185000,
    currency: "NGN",
    image: media.images.roomDeluxe,
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
    nameKey: "rooms.presidential.name",
    descriptionKey: "rooms.presidential.description",
    priceFrom: 420000,
    currency: "NGN",
    image: media.images.presidentialSuite,
    amenitiesKeys: [
      "rooms.amenities.panoramic",
      "rooms.amenities.livingRoom",
      "rooms.amenities.butler",
      "rooms.amenities.airportTransfer",
    ],
    featured: true,
  },
  {
    id: "executive-room",
    slug: "executive-room",
    nameKey: "rooms.executive.name",
    descriptionKey: "rooms.executive.description",
    priceFrom: 125000,
    currency: "NGN",
    image: media.images.roomExecutive,
    amenitiesKeys: [
      "rooms.amenities.workDesk",
      "rooms.amenities.rainShower",
      "rooms.amenities.loungeAccess",
    ],
    featured: false,
  },
  {
    id: "wellness-retreat",
    slug: "wellness-retreat",
    nameKey: "rooms.wellness.name",
    descriptionKey: "rooms.wellness.description",
    priceFrom: 210000,
    currency: "NGN",
    image: media.images.spa,
    amenitiesKeys: [
      "rooms.amenities.spaCredit",
      "rooms.amenities.healthyMenu",
      "rooms.amenities.yoga",
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
    "Luxury hotel in Calabar offering signature suites, private dining, wellness experiences, and personalized concierge hospitality.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Calabar",
    addressRegion: "Cross River",
    addressCountry: "NG",
  },
  telephone: site.phone,
  email: site.email,
  priceRange: "₦₦₦₦",
} as const;
