// Colours for the top bar's contents that blend from white (over the landing page's photo) to their normal colour
// as the bar fades to white. --fade is set by HeaderBar on the landing page only; elsewhere it falls back to 1,
// so these are just the normal colours. Written out in full so Tailwind finds them.
export const onPhoto = {
  subtle: "text-[color:color-mix(in_srgb,var(--color-subtle)_calc(var(--fade,1)*100%),white)]",
  primary: "text-[color:color-mix(in_srgb,var(--color-primary)_calc(var(--fade,1)*100%),white)]",
  divider: "bg-[color:color-mix(in_srgb,var(--color-line)_calc(var(--fade,1)*100%),rgb(255_255_255/0.4))]",
  /** For the icons, which are images: white at first, their own colours once the bar is white */
  icon: "[filter:brightness(var(--fade,1))_invert(calc(1_-_var(--fade,1)))]",
};
