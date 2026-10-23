"use client";
// The Schedule page: everyone's bookings for the week (yours in green, others greyed with only what's booked), and
// free hours you can select by clicking and dragging across them, or tapping a start and then an end. The
// selection goes to Add Details with the date, time, length and service filled in.
//
// Free/taken is worked out here from each space's opening rules and bookings (the same functions the server uses
// to check the booking), so dragging needs no round trips. The server checks again when the booking is made.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ScheduleEntry } from "@learnspace/bookings";
import {
  addDays,
  closedReason,
  daySlots,
  lagosIsoDate,
  lagosTime,
  type OpeningRules,
} from "@learnspace/bookings/client";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatLongDay, formatMonth, formatTimeRange, hoursLabel } from "@/lib/format";
import { SchedulePill } from "./pill";

export interface PlannerSpace extends OpeningRules {
  id: string;
  name: string;
  minHours: number;
  services: { id: string; name: string }[];
}

/** One bookable thing: a service, or a space without services */
interface Option {
  value: string;
  label: string;
  spaceId: string;
  serviceId: string | null;
}

type Selection = { date: string; from: number; to: number } | null;

const HOUR = 60 * 60_000;
/** Hours that have gone: grey stripes, as the design shows past slots, so they never look free */
const PAST = "bg-[repeating-linear-gradient(130deg,#fff_0_5px,#e1e3ee_5px_8px)]";
const hourLabel = (h: number) => `${String(h % 12 || 12).padStart(2, "0")}:00 ${h < 12 ? "AM" : "PM"}`;
const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

export function WeekPlanner({
  spaces,
  entries,
  monday,
  date,
  view,
  signedIn,
}: {
  spaces: PlannerSpace[];
  entries: ScheduleEntry[];
  monday: string;
  /** The day shown on phones */
  date: string;
  /** "all", a space id, or "space:service" */
  view: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  // When the page was opened: what counts as past
  const [now] = useState(() => Date.now());
  const today = lagosIsoDate(new Date(now));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const options = spaces.flatMap<Option>((s) =>
    s.services.length
      ? s.services.map((v) => ({
          value: `${s.id}:${v.id}`,
          label: `${s.name} · ${v.name}`,
          spaceId: s.id,
          serviceId: v.id,
        }))
      : [{ value: s.id, label: s.name, spaceId: s.id, serviceId: null }],
  );
  const chosen =
    view === "all" ? null : (options.find((o) => o.value === view) ?? options.find((o) => o.spaceId === view) ?? null);
  // Spaces the calendar is about: one when filtered, all otherwise
  const shown = chosen ? spaces.filter((s) => s.id === chosen.spaceId) : spaces;

  // Free hours per space and day, as a set of start hours
  const free = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const s of spaces) {
      const busy = entries.filter((e) => e.spaceId === s.id);
      for (const d of days) {
        const hours = daySlots(s, d, busy, new Date(now))
          .filter((slot) => slot.state === "free")
          .map((slot) => Number(slot.time.slice(0, 2)));
        map.set(`${s.id}|${d}`, new Set(hours));
      }
    }
    return map;
    // days come from monday
  }, [spaces, entries, monday, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const freeIn = (spaceId: string, d: string, h: number) => free.get(`${spaceId}|${d}`)?.has(h) ?? false;
  const freeAny = (d: string, h: number) => shown.some((s) => freeIn(s.id, d, h));
  const rangeFree = (spaceId: string, sel: NonNullable<Selection>) => {
    for (let h = sel.from; h < sel.to; h++) if (!freeIn(spaceId, sel.date, h)) return false;
    return true;
  };

  // Rows: every hour any shown space is open this week
  const hours = useMemo(() => {
    const set = new Set<number>();
    for (const s of shown) {
      for (const d of days) {
        for (const slot of daySlots(s, d, [], new Date(0))) set.add(Number(slot.time.slice(0, 2)));
      }
    }
    return [...set].sort((a, b) => a - b);
  }, [shown, monday]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selection, setSelection] = useState<Selection>(null);
  const [dragging, setDragging] = useState(false);
  const [pick, setPick] = useState<string>("");

  /** Start a new selection at this hour, or extend the current one to it (only across free hours) */
  function selectHour(d: string, h: number, extend: boolean) {
    if (!freeAny(d, h)) return;
    if (extend && selection && selection.date === d) {
      const from = Math.min(selection.from, h);
      const to = Math.max(selection.to, h + 1);
      for (let x = from; x < to; x++) if (!freeAny(d, x)) return;
      setSelection({ date: d, from, to });
    } else if (selection && selection.date === d && selection.from === h && selection.to === h + 1 && !extend) {
      setSelection(null);
    } else {
      setSelection({ date: d, from: h, to: h + 1 });
    }
  }

  const candidates = selection
    ? options.filter((o) => (!chosen || o.value === chosen.value) && rangeFree(o.spaceId, selection))
    : [];
  const target =
    chosen && candidates.includes(chosen)
      ? chosen
      : (candidates.find((o) => o.value === pick) ?? (candidates.length === 1 ? candidates[0] : null));
  const continueHref =
    selection && target
      ? `/book/${target.spaceId}?${new URLSearchParams({
          ...(target.serviceId ? { service: target.serviceId } : {}),
          start: lagosTime(selection.date, `${String(selection.from).padStart(2, "0")}:00`).toISOString(),
          hours: String(selection.to - selection.from),
        })}`
      : null;

  const go = (params: Record<string, string>) => {
    const q = new URLSearchParams({ view, date, ...params });
    router.push(`/schedule?${q}`);
  };
  const weekLink = (offset: number) => {
    const next = addDays(monday, offset * 7);
    return next < addDays(today, -6) ? null : { date: next < today ? today : next };
  };
  const prev = weekLink(-1);

  const isSelected = (d: string, h: number) => selection?.date === d && h >= selection.from && h < selection.to;

  function cellState(d: string, h: number): "free" | "unavailable" | "past" | "taken" {
    const open = shown.some((s) => daySlots(s, d, [], new Date(0)).some((slot) => Number(slot.time.slice(0, 2)) === h));
    if (!open) return "unavailable";
    if (freeAny(d, h)) return "free";
    return lagosTime(d, `${String(h).padStart(2, "0")}:00`).getTime() + HOUR <= now || d < today ? "past" : "taken";
  }

  const entriesAt = (d: string, h: number) =>
    entries.filter(
      (e) =>
        shown.some((s) => s.id === e.spaceId) &&
        lagosIsoDate(e.start) === d &&
        e.start.getTime() >= lagosTime(d, `${String(h).padStart(2, "0")}:00`).getTime() &&
        e.start.getTime() < lagosTime(d, `${String(h).padStart(2, "0")}:00`).getTime() + HOUR,
    );

  const cellProps = (d: string, h: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (e.pointerType === "mouse") {
        setDragging(true);
        selectHour(d, h, e.shiftKey);
      } else {
        // Touch: tap a start, then tap an end on the same day
        selectHour(d, h, Boolean(selection && selection.date === d && h !== selection.from));
      }
    },
    onPointerEnter: () => dragging && selectHour(d, h, true),
  });

  const filter = (
    <label className="relative">
      <span className="sr-only">Show</span>
      <select
        value={chosen?.value ?? "all"}
        onChange={(e) => {
          setSelection(null);
          go({ view: e.target.value });
        }}
        className="h-11 min-w-[180px] appearance-none rounded-md border border-line bg-white pl-4 pr-10 text-base text-ink hover:border-primary"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2"
        fill="none"
        stroke="#33363F"
        strokeWidth={2}
        strokeLinecap="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );

  const legend = (
    <div className="flex items-center gap-4 text-base tracking-[0.014em] text-ink">
      <span className="flex items-center gap-1.5">
        <span className="size-[13px] rounded-full border border-muted bg-line" /> Booked by others
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[13px] rounded-full bg-green" /> You
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn("size-[13px] rounded-full border border-line", PAST)} /> Past
      </span>
    </div>
  );

  return (
    <div
      className="flex flex-col gap-5 pb-32 md:pb-24"
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {prev ? (
            <Link href={`/schedule?${new URLSearchParams({ view, date: prev.date })}`} aria-label="Previous week">
              <Icon name="caret-left" size={30} />
            </Link>
          ) : (
            <span className="w-[30px]" />
          )}
          <h1 className="whitespace-nowrap text-xl font-bold tracking-[0.012em] text-ink md:text-[28px]">
            {formatMonth(lagosTime(date, "12:00"))}
          </h1>
          <Link href={`/schedule?${new URLSearchParams({ view, date: addDays(monday, 7) })}`} aria-label="Next week">
            <Icon name="caret-right" size={30} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="hidden md:block">{legend}</span>
          {filter}
        </div>
      </div>
      <span className="md:hidden">{legend}</span>
      <p className="text-sm text-muted">
        {signedIn
          ? "Click and drag across free hours (or tap a start and an end) to book them."
          : "Sign up or log in to book free hours."}
      </p>

      {/* Phones: one day at a time */}
      <section className="flex flex-col gap-4 md:hidden">
        <div className="flex gap-[7px] overflow-x-auto [scrollbar-width:none]">
          {days.map((d) => {
            const selected = d === date;
            const past = d < today;
            return (
              <button
                key={d}
                type="button"
                disabled={past}
                aria-pressed={selected}
                onClick={() => go({ date: d })}
                className={cn(
                  "flex h-[70px] w-[47px] shrink-0 flex-col items-center justify-end gap-[7px] rounded-[12px] border border-line px-2.5 py-[5px] text-ink-strong disabled:opacity-40",
                  selected && "justify-between bg-green py-[7px] text-white",
                )}
              >
                {selected && <span className="size-[7px] rounded-full bg-white" />}
                <span className="text-sm">{dayName(d)}</span>
                <span className="text-base font-bold">{Number(d.slice(8))}</span>
              </button>
            );
          })}
        </div>
        <p className="text-base text-ink-strong">
          Showing <b>{formatLongDay(lagosTime(date, "12:00"))}</b>
        </p>
        {hours.every((h) => cellState(date, h) === "unavailable") ? (
          <p className="rounded-md bg-sunk px-4 py-10 text-center text-base text-muted">
            {shown.length === 1 ? (closedReason(shown[0], date) ?? "Closed") : "Everything is closed"} on this day. Pick
            another day.
          </p>
        ) : (
          <div className="flex flex-col gap-2 select-none">
            {hours.map((h) => {
              const state = cellState(date, h);
              const here = entriesAt(date, h);
              return (
                <div key={h} className="flex min-h-[72px] gap-2">
                  <span className="w-[88px] shrink-0 border-b border-r border-line px-2.5 pb-5 pt-1.5 text-right text-sm text-ink">
                    {hourLabel(h)}
                  </span>
                  <div
                    {...(state === "free" && signedIn ? cellProps(date, h) : {})}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col gap-1.5 border-b border-line p-[5px]",
                      state === "free" && signedIn && "cursor-pointer hover:bg-green-50/60",
                      isSelected(date, h) && "bg-green-50 outline outline-2 -outline-offset-2 outline-green",
                      state === "unavailable" && "bg-sunk/70",
                      state === "past" && PAST,
                    )}
                  >
                    {here.map((e) => (
                      <SchedulePill key={`${e.start.toISOString()}-${e.label}`} entry={e} />
                    ))}
                    {state === "unavailable" && here.length === 0 && (
                      <span className="m-auto text-sm text-subtle">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Wider screens: the week */}
      <section className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] table-fixed select-none border-collapse">
          <thead>
            <tr>
              <th className="w-28" />
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={cn(
                    "h-16 font-normal",
                    d === today ? "bg-primary text-white" : "text-ink",
                    d < today && "opacity-40",
                  )}
                >
                  <span className="block text-xs uppercase">{dayName(d)}</span>
                  <span className="text-lg font-bold">{Number(d.slice(8))}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h} className="border-t border-line">
                <th scope="row" className="py-1.5 pr-3 text-right align-top text-sm font-normal text-ink">
                  {hourLabel(h)}
                </th>
                {days.map((d) => {
                  const state = cellState(d, h);
                  const here = entriesAt(d, h);
                  return (
                    <td
                      key={d}
                      {...(state === "free" && signedIn ? cellProps(d, h) : {})}
                      className={cn(
                        "h-[110px] border-l border-line p-1.5 align-top",
                        state === "free" && signedIn && "cursor-pointer hover:bg-green-50/60",
                        isSelected(d, h) && "bg-green-50 outline outline-2 -outline-offset-2 outline-green",
                        state === "unavailable" && "border border-dashed border-line bg-sunk/70",
                        state === "past" && PAST,
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        {here.map((e) => (
                          <SchedulePill key={`${e.start.toISOString()}-${e.label}`} entry={e} />
                        ))}
                        {state === "unavailable" && here.length === 0 && (
                          <span className="flex h-[96px] items-center justify-center text-sm text-subtle">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* What's selected, and where it goes */}
      {selection && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-line bg-white shadow-pop md:bottom-0">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3 md:px-20">
            <p className="text-base text-ink-strong">
              <b>{formatLongDay(lagosTime(selection.date, "12:00"))}</b>
              <span className="text-muted">
                {" "}
                ·{" "}
                {formatTimeRange(
                  lagosTime(selection.date, `${String(selection.from).padStart(2, "0")}:00`),
                  lagosTime(selection.date, `${String(selection.to).padStart(2, "0")}:00`),
                )}{" "}
                · {hoursLabel(selection.to - selection.from)}
              </span>
            </p>
            {!chosen || candidates.length > 1 ? (
              candidates.length ? (
                <select
                  aria-label="What would you like to book?"
                  value={target?.value ?? ""}
                  onChange={(e) => setPick(e.target.value)}
                  className="h-11 rounded-md border border-line bg-white px-3 text-base text-ink"
                >
                  <option value="" disabled>
                    What would you like to book?
                  </option>
                  {candidates.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-error-ink">
                  No single space is free for all of these hours. Try fewer hours.
                </p>
              )
            ) : null}
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="h-11 rounded-md px-4 text-base text-muted hover:bg-sunk"
              >
                Clear
              </button>
              {continueHref ? (
                <ButtonLink href={continueHref} className="min-w-40">
                  Continue
                </ButtonLink>
              ) : (
                <span className="flex h-11 min-w-40 items-center justify-center rounded-md bg-primary/40 px-6 text-base text-white">
                  Continue
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
