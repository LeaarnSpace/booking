// Brand settings for email templates. Each app passes its own, so a separately branded booking app or
// marketplace reuses the same templates.

export interface Brand {
  /** "Learn Space" */
  name: string;
  /** Shown under the name in the header, e.g. "Bookings" */
  product: string;
  /** Footer line, e.g. "Learn Space Limited · Lagos, Nigeria" */
  footer: string;
  colors: { header: string; accent: string; accentTint: string };
}

export const learnSpaceBrand: Brand = {
  name: "Learn Space",
  product: "Bookings",
  footer: "Learn Space Limited · Lagos, Nigeria",
  colors: { header: "#0e1b34", accent: "#004bad", accentTint: "#eaf1fb" },
};

/** Escapes text for HTML email bodies */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
