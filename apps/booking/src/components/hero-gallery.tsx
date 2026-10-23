"use client";
/* eslint-disable @next/next/no-img-element -- photos may come from object storage on another host */
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Photos that fade from one to the next, with the design's 30% shade and dots. Respects reduced motion. */
export function HeroGallery({ photos, className }: { photos: { url: string; alt: string }[]; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), 6000);
    return () => clearInterval(timer);
  }, [photos.length]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)}>
      {photos.map((p, i) => (
        <img
          key={p.url}
          src={p.url}
          alt={i === index ? p.alt : ""}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-1000",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-black/30" />
      {photos.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {photos.map((p, i) => (
            <button
              key={p.url}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn("size-2 rounded-full border border-green", i === index ? "bg-green" : "bg-transparent")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
