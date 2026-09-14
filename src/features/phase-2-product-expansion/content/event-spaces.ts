export const eventSpaces = [
  {
    id: "grand-ballroom",
    nameKey: "spaces.ballroom.name",
    descriptionKey: "spaces.ballroom.description",
    capacity: 450,
    styleKey: "spaces.ballroom.style",
    image:
      "https://images.unsplash.com/photo-1748802633639-22f99d0b3a0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "garden-pavilion",
    nameKey: "spaces.pavilion.name",
    descriptionKey: "spaces.pavilion.description",
    capacity: 120,
    styleKey: "spaces.pavilion.style",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

export const eventTypes = [
  "corporate",
  "wedding",
  "gala",
  "conference",
  "private",
] as const;
