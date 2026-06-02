export const diningVenues = [
  {
    id: "rooftop",
    nameKey: "venues.rooftop.name",
    descriptionKey: "venues.rooftop.description",
    cuisineKey: "venues.rooftop.cuisine",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "grand-lounge",
    nameKey: "venues.lounge.name",
    descriptionKey: "venues.lounge.description",
    cuisineKey: "venues.lounge.cuisine",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "private-salon",
    nameKey: "venues.salon.name",
    descriptionKey: "venues.salon.description",
    cuisineKey: "venues.salon.cuisine",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

export const menuHighlights = [
  "menu.seafood",
  "menu.grill",
  "menu.vegan",
  "menu.pastry",
] as const;
