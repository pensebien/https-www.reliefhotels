export const meetingsEventsHighlights = [
  {
    id: "grand-ballroom",
    capacityKey: "spaces.ballroom.capacity",
    titleKey: "spaces.ballroom.title",
    descriptionKey: "spaces.ballroom.description",
  },
  {
    id: "executive-boardroom",
    capacityKey: "spaces.boardroom.capacity",
    titleKey: "spaces.boardroom.title",
    descriptionKey: "spaces.boardroom.description",
  },
  {
    id: "garden-pavilion",
    capacityKey: "spaces.pavilion.capacity",
    titleKey: "spaces.pavilion.title",
    descriptionKey: "spaces.pavilion.description",
  },
] as const;

export const meetingsEventTypes = [
  "types.corporate",
  "types.wedding",
  "types.gala",
  "types.diplomatic",
] as const;
