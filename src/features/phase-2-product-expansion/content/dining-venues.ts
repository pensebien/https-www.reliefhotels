import { media } from "@/content/site";

export const diningVenues = [
  {
    id: "private-bar",
    nameKey: "venues.privateBar.name",
    descriptionKey: "venues.privateBar.description",
    cuisineKey: "venues.privateBar.cuisine",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "vip-bar",
    nameKey: "venues.vipBar.name",
    descriptionKey: "venues.vipBar.description",
    cuisineKey: "venues.vipBar.cuisine",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "indoor-restaurant",
    nameKey: "venues.indoorRestaurant.name",
    descriptionKey: "venues.indoorRestaurant.description",
    cuisineKey: "venues.indoorRestaurant.cuisine",
    image: media.images.photos.restaurant,
  },
] as const;

export const menuHighlights = [
  "menu.seafood",
  "menu.grill",
  "menu.vegan",
  "menu.pastry",
] as const;
