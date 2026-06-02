export const eventSpaces = [
  {
    id: "grand-ballroom",
    nameKey: "spaces.ballroom.name",
    descriptionKey: "spaces.ballroom.description",
    capacity: 450,
    styleKey: "spaces.ballroom.style",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "executive-salon",
    nameKey: "spaces.salon.name",
    descriptionKey: "spaces.salon.description",
    capacity: 120,
    styleKey: "spaces.salon.style",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "garden-pavilion",
    nameKey: "spaces.pavilion.name",
    descriptionKey: "spaces.pavilion.description",
    capacity: 220,
    styleKey: "spaces.pavilion.style",
    image:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

export const eventTypes = [
  "corporate",
  "wedding",
  "gala",
  "conference",
  "private",
] as const;
