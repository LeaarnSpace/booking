"use client";
// The top bar's frame: stays at the top while the page scrolls. On the landing page (`overlay`) it stays
// see-through over the hero photo and fades to white over the last FADE_DISTANCE pixels before the section marked
// `data-header-solid` reaches it (the top of the page if there's none). The fade is the CSS variable --fade
// (0 = see-through, 1 = white), which the links and icons inside blend their colours with (see on-photo.ts).
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const FADE_DISTANCE = 240;

export function HeaderBar({ overlay, children }: { overlay?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!overlay || !header) return;
    let frame = 0;
    // Where the bar must be fully white: when the marked section's top meets the bar's bottom
    let solidAt = FADE_DISTANCE;
    const measure = () => {
      const solid = document.querySelector("[data-header-solid]");
      solidAt = solid
        ? Math.max(FADE_DISTANCE, solid.getBoundingClientRect().top + window.scrollY - header.offsetHeight)
        : FADE_DISTANCE;
    };
    const update = () => {
      frame = 0;
      const t = Math.min(1, Math.max(0, (window.scrollY - (solidAt - FADE_DISTANCE)) / FADE_DISTANCE));
      // Ease in and out, so the change starts and ends softly
      const fade = t * t * (3 - 2 * t);
      header.style.setProperty("--fade", fade.toFixed(3));
      // Hover colours meant for the photo apply while the bar is still mostly see-through
      header.toggleAttribute("data-clear", fade < 0.5);
    };
    // At most one update per frame, however fast the scroll events come
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    // The hero is as tall as the window, so the point moves when the window is resized
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [overlay]);

  return (
    <header
      ref={ref}
      data-clear={overlay ? "" : undefined}
      style={overlay ? ({ "--fade": 0 } as React.CSSProperties) : undefined}
      className={cn(
        "group top-0 z-30 w-full",
        overlay
          ? "fixed inset-x-0 bg-[rgb(255_255_255/var(--fade))] shadow-[0_1px_2px_rgb(14_22_80/calc(var(--fade)*0.08))] backdrop-blur-[calc(var(--fade)*8px)]"
          : "sticky bg-sunk backdrop-blur-[5px] md:bg-white",
      )}
    >
      {children}
    </header>
  );
}
