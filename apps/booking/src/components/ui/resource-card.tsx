/* eslint-disable @next/next/no-img-element -- photos come from object storage, which may be another host */
import Link from "next/link";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";

/**
 * A space or service on a photo: name, one line about it, the starting price and a button. The whole card is
 * the link; the "button" is just its label.
 */
export function ResourceCard({
  href,
  title,
  text,
  fromRate,
  photo,
  action = "Learn more",
  className,
}: {
  href: string;
  title: string;
  text: string;
  fromRate: number;
  photo: string | null;
  action?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group relative flex min-h-[201px] flex-col justify-end overflow-hidden bg-ink pt-8", className)}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      )}
      <span className="absolute inset-0 bg-black/50" />
      <span className="relative flex flex-col gap-8 px-3 py-6">
        <span className="flex flex-col gap-2">
          <span className="text-xl font-bold tracking-[0.012em] text-white">{title}</span>
          <span className="line-clamp-3 text-base font-semibold tracking-[0.014em] text-white">{text}</span>
        </span>
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm tracking-[0.014em] text-white">
            Starting from: <b>{naira(fromRate)}/hr</b>
          </span>
          <span className="flex min-w-[130px] items-center justify-center rounded-md border border-line bg-white px-[18px] py-2 text-sm text-ink group-hover:bg-sunk">
            {action}
          </span>
        </span>
      </span>
    </Link>
  );
}
