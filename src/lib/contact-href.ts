/** Home contact section links — query must come before the hash. */

export function contactSectionHref(opts?: {
  room?: string;
  tour?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.room) params.set("room", opts.room);
  if (opts?.tour) params.set("tour", opts.tour);
  const qs = params.toString();
  return qs ? `/?${qs}#contact` : "/#contact";
}
