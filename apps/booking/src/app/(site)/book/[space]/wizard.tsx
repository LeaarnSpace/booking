"use client";
// The booking form in three steps, as in the design: Add Details → Add-Ons → Review. Everything stays in this
// component until "Proceed to pay" (or "Confirm booking" for staff), so going back never loses what was typed.
// The step is kept in the URL (?step=), so the browser's back button moves between steps.
//
// Time is chosen as a run of hourly slots: click and drag across them, or tap a start and then an end. The
// duration buttons pick the same thing from the first slot. Whatever the Schedule page selected arrives here
// already chosen.
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  discountFor,
  priceBooking,
  type ClosedDate,
  type DayHours,
  type LengthDiscount,
} from "@learnspace/bookings/client";
import { Counter } from "@/components/booking/counter";
import { MonthPicker } from "@/components/booking/month-picker";
import { BackButton, Container } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatLongDay, formatShortDay, formatTimeRange, hoursLabel, naira } from "@/lib/format";
import { getAddOnsLeft, getDayAvailability, submitBooking, type DayAvailability } from "../actions";

interface Props {
  back: string;
  viewer: { name: string; email: string; phone: string; isStaff: boolean };
  space: {
    id: string;
    name: string;
    capacity: number;
    minHours: number;
    hourlyRate: number;
    discounts: LengthDiscount[];
    hours: DayHours[];
    closedDates: ClosedDate[];
    closedOnPublicHolidays: boolean;
    addOns: { id: string; name: string; description: string; price: number }[];
  };
  service: { id: string; name: string; hourlyRate: number } | null;
  initial: { date: string; availability: DayAvailability; start: string | null; hours: number };
}

type Step = "details" | "add-ons" | "review";
/** Slots chosen, as indexes into the day's slot list (end exclusive) */
type Range = { from: number; to: number } | null;

const DURATIONS = [1, 2, 3, 4, 5, 8];
const field =
  "w-full rounded-md border border-line bg-white p-4 text-base font-medium tracking-[0.014em] text-ink placeholder:text-placeholder";

function hourText(time: string) {
  const h = Number(time.slice(0, 2));
  return `${String(h % 12 || 12).padStart(2, "0")}:00${h < 12 ? "AM" : "PM"}`;
}

/** The run of free slots starting at `start` and lasting `hours`; just the first slot if the rest isn't free */
function rangeFor(availability: DayAvailability, start: string | null, hours: number): Range {
  const from = availability.slots.findIndex((s) => s.start === start && s.state === "free");
  if (from < 0) return null;
  const to = from + hours;
  if (to > availability.slots.length) return { from, to: from + 1 };
  for (let i = from; i < to; i++) if (availability.slots[i].state !== "free") return { from, to: from + 1 };
  return { from, to };
}

export function BookingWizard({ back, viewer, space, service, initial }: Props) {
  const params = useSearchParams();
  const step = (params.get("step") as Step | null) ?? "details";
  const go = (next: Step) => {
    const q = new URLSearchParams(params);
    if (next === "details") q.delete("step");
    else q.set("step", next);
    window.history.pushState(null, "", `?${q}`);
    window.scrollTo({ top: 0 });
  };

  const [attendees, setAttendees] = useState<string[]>([viewer.name]);
  const [phone, setPhone] = useState(viewer.phone);
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState(initial.date);
  const [availability, setAvailability] = useState(initial.availability);
  const [range, setRange] = useState<Range>(() => rangeFor(initial.availability, initial.start, initial.hours));
  const [dragging, setDragging] = useState(false);
  const [otherHours, setOtherHours] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [left, setLeft] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingDay, startLoadingDay] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const slots = availability.slots;
  const start = range ? slots[range.from].start : null;
  const hours = range ? range.to - range.from : 0;
  const end = start ? new Date(Date.parse(start) + hours * 60 * 60_000) : null;
  /** How long a booking could be from the first chosen slot */
  const maxHours = range ? slots[range.from].maxHours : 0;
  const rate = service?.hourlyRate ?? space.hourlyRate;
  const chosenAddOns = space.addOns.filter((a) => (quantities[a.id] ?? 0) > 0);
  const price = priceBooking({
    hourlyRate: rate,
    hours: Math.max(hours, 1),
    discounts: space.discounts,
    addOns: chosenAddOns.map((a) => ({ addOn: a, quantity: quantities[a.id] })),
    free: viewer.isStaff,
  });
  // The next discount tier within reach, for "Add 1 more hour to save 10%"
  const nextTier = space.discounts
    .filter((d) => d.hours > hours && d.hours <= maxHours && d.percent > price.discountPercent)
    .sort((a, b) => a.hours - b.hours)[0];
  const moreHours = nextTier ? nextTier.hours - hours : 0;

  // Add-on stock depends on the time chosen
  useEffect(() => {
    if (!start || !hours || !space.addOns.length) return;
    let current = true;
    getAddOnsLeft(space.id, start, hours).then((l) => current && setLeft(l));
    return () => {
      current = false;
    };
  }, [space.id, space.addOns.length, start, hours]);

  function pickDate(next: string) {
    setDate(next);
    setRange(null);
    startLoadingDay(async () => setAvailability(await getDayAvailability(space.id, next)));
  }

  /** Start a new run at slot i, or extend the current run to it when every slot between is free */
  function selectSlot(i: number, extend: boolean) {
    if (slots[i]?.state !== "free") return;
    setOtherHours(false);
    if (extend && range) {
      const from = Math.min(range.from, i);
      const to = Math.max(range.to, i + 1);
      for (let x = from; x < to; x++) if (slots[x].state !== "free") return;
      setRange({ from, to });
    } else if (range && range.from === i && range.to === i + 1) {
      setRange(null);
    } else {
      setRange({ from: i, to: i + 1 });
    }
  }

  function setLength(h: number) {
    if (!range) return;
    const fits = rangeFor(availability, slots[range.from].start, h);
    if (fits && fits.to - fits.from === h) setRange(fits);
  }

  function validateDetails() {
    if (!attendees[0]?.trim()) return "Add at least one attendee's name";
    if (purpose.trim().length < 3) return "Tell us what the booking is for";
    if (!range) return "Pick a time slot";
    if (hours < space.minHours) return `Book at least ${hoursLabel(space.minHours)}`;
    return null;
  }

  function continueFromDetails() {
    const problem = validateDetails();
    setError(problem);
    if (!problem) go("add-ons");
  }

  function submit() {
    setError(null);
    startSubmit(async () => {
      const result = await submitBooking({
        spaceId: space.id,
        serviceId: service?.id ?? null,
        start: start!,
        hours,
        attendeeNames: attendees.map((a) => a.trim()),
        phone,
        purpose,
        addOns: chosenAddOns.map((a) => ({ id: a.id, quantity: quantities[a.id] })),
      });
      // Success redirects; anything that comes back is an error
      setError(result.error);
    });
  }

  // Arriving at a later step without the details (e.g. a reload) starts again from the details
  const ready = !validateDetails();
  const shown: Step = step !== "details" && !ready ? "details" : step;
  const title = { details: "Add Details", "add-ons": "Add-Ons", review: "Review" }[shown];
  const prev: Step = shown === "review" ? "add-ons" : "details";
  const what = service?.name ?? space.name;

  return (
    <main className="pb-48 md:pb-16" onPointerUp={() => setDragging(false)}>
      <Container className="flex flex-col gap-2 pb-2 pt-2 md:gap-4 md:pt-10">
        <div className="flex items-center gap-2">
          {shown === "details" ? (
            <BackButton href={back} />
          ) : (
            <button
              type="button"
              aria-label="Back"
              onClick={() => go(prev)}
              className="flex size-10 items-center justify-center rounded-full bg-white drop-shadow-[0_1px_1px_rgba(14,22,80,0.06)] hover:bg-sunk"
            >
              <Icon name="arrow-left" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-[0.012em] text-ink md:hidden">{title}</h1>
        </div>
        <div className="hidden text-center md:block">
          <h1 className="text-[28px] font-bold text-ink-strong">{title}</h1>
          <p className="mt-1 text-sm text-subtle">{service ? `${service.name} · ${space.name}` : space.name}</p>
        </div>
      </Container>

      <Container className="pt-4">
        {shown === "details" && (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
            <div className="flex flex-col gap-6">
              <Panel title="Who’s coming" hint={`Up to ${space.capacity} guests are allowed`}>
                <p className="text-base font-medium tracking-[0.014em] text-ink">
                  How many attendees should we expect?
                </p>
                <div className="max-w-[314px]">
                  <Counter
                    large
                    label="Attendees"
                    value={attendees.length}
                    min={1}
                    max={space.capacity}
                    onChange={(n) => setAttendees(n > attendees.length ? [...attendees, ""] : attendees.slice(0, n))}
                  />
                </div>
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <label
                      htmlFor={`attendee-${i}`}
                      className="w-[100px] shrink-0 text-base font-medium tracking-[0.014em] text-ink"
                    >
                      Attendee {i + 1}
                    </label>
                    <input
                      id={`attendee-${i}`}
                      value={a}
                      maxLength={80}
                      placeholder="Full name"
                      onChange={(e) => setAttendees(attendees.map((x, j) => (j === i ? e.target.value : x)))}
                      className="h-[52px] min-w-0 max-w-[230px] flex-1 rounded-sm border border-line bg-white px-4 text-base tracking-[0.014em] text-ink placeholder:text-placeholder"
                    />
                    {attendees.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove attendee ${i + 1}`}
                        onClick={() => setAttendees(attendees.filter((_, j) => j !== i))}
                        className="flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-line bg-white hover:bg-sunk"
                      >
                        <Icon name="cancel" size={22} />
                      </button>
                    )}
                  </div>
                ))}
              </Panel>

              <Panel title="Contact" hint="Confirmation and reminders go here">
                <input aria-label="Email" value={viewer.email} readOnly className={cn(field, "bg-sunk text-subtle")} />
                <input
                  aria-label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number, e.g. +234 812 345 6789"
                  maxLength={30}
                  className={field}
                />
              </Panel>

              <Panel title="What is the purpose for booking?">
                <textarea
                  aria-label="Purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="e.g. I'd like to book the studio for a video podcast recording with two camera angles."
                  className={cn(field, "resize-y")}
                />
              </Panel>
            </div>

            <div className="flex flex-col gap-6">
              <Panel
                title="Date & Time"
                hint={
                  start && end
                    ? `Currently set for ${formatLongDay(new Date(start))}, ${formatTimeRange(new Date(start), end)}. Change below if needed`
                    : "Pick a day, then drag across the hours you need (or tap a start and an end)"
                }
              >
                <MonthPicker value={date} rules={space} onChange={pickDate} />
                <h3 className="pt-2 text-base font-semibold text-ink">Slot</h3>
                {availability.closed ? (
                  <p className="text-sm text-muted">{availability.closed}. Pick another day.</p>
                ) : (
                  <div className={cn("flex select-none flex-wrap gap-3", loadingDay && "opacity-50")}>
                    {slots.map((s, i) => {
                      const selected = Boolean(range && i >= range.from && i < range.to);
                      return (
                        <button
                          key={s.start}
                          type="button"
                          disabled={s.state !== "free"}
                          aria-pressed={selected}
                          onPointerDown={(e) => {
                            if (e.pointerType !== "mouse" || e.button !== 0) return;
                            setDragging(true);
                            selectSlot(i, e.shiftKey);
                          }}
                          onPointerEnter={() => dragging && selectSlot(i, true)}
                          onClick={(e) => {
                            // Mouse presses are handled on pointer down (so dragging works); this is for taps and keys
                            if ((e.nativeEvent as PointerEvent).pointerType === "mouse") return;
                            selectSlot(i, Boolean(range && i !== range.from && range.to - range.from === 1));
                          }}
                          className={cn(
                            "relative h-[38px] w-[90px] overflow-hidden rounded-sm border border-line bg-white text-base font-bold tracking-[0.014em] text-black",
                            selected && "border-green bg-green-50",
                            s.state === "taken" && "bg-sunk text-placeholder line-through",
                            s.state === "past" &&
                              "bg-[repeating-linear-gradient(130deg,#fff_0_5px,#ececec_5px_8px)] text-placeholder",
                          )}
                        >
                          {hourText(s.time)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <h3 className="pt-2 text-base font-semibold text-ink">Duration</h3>
                <div className="flex flex-wrap gap-3">
                  {DURATIONS.filter((h) => h >= space.minHours).map((h) => {
                    const off = discountFor(h, space.discounts);
                    const fits = Boolean(range) && h <= maxHours;
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={!fits}
                        aria-pressed={!otherHours && hours === h}
                        onClick={() => {
                          setOtherHours(false);
                          setLength(h);
                        }}
                        className={cn(
                          "h-[38px] min-w-[90px] rounded-sm border border-line bg-white px-3 text-base font-bold tracking-[0.014em] text-black disabled:text-placeholder",
                          range && !fits && "line-through",
                          !otherHours && hours === h && "border-green bg-green-50",
                        )}
                      >
                        {hoursLabel(h)}
                        {off > 0 && ` · ${off}% off`}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={!range}
                    aria-pressed={otherHours || (hours > 0 && !DURATIONS.includes(hours))}
                    onClick={() => setOtherHours(true)}
                    className={cn(
                      "h-[38px] w-[90px] rounded-sm border border-line bg-white text-base font-semibold tracking-[0.014em] text-black disabled:text-placeholder",
                      (otherHours || (hours > 0 && !DURATIONS.includes(hours))) && "border-green bg-green-50",
                    )}
                  >
                    Other
                  </button>
                </div>
                {otherHours && range && (
                  <label className="flex items-center gap-3 text-base font-medium text-ink">
                    Hours
                    <select
                      value={hours}
                      onChange={(e) => setLength(Number(e.target.value))}
                      className="h-[38px] rounded-sm border border-line bg-white px-3"
                    >
                      {Array.from({ length: maxHours }, (_, i) => i + 1)
                        .filter((h) => h >= space.minHours)
                        .map((h) => (
                          <option key={h} value={h}>
                            {hoursLabel(h)}
                            {discountFor(h, space.discounts) > 0 && ` · ${discountFor(h, space.discounts)}% off`}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </Panel>

              <Panel title="Price summary" hint="Updates as you change the duration">
                {range ? (
                  <dl className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between gap-4 text-muted">
                      <dt>
                        {what} · {hoursLabel(hours)} × {viewer.isStaff ? "free" : naira(rate)}
                      </dt>
                      <dd className="font-bold text-ink-strong">{viewer.isStaff ? "Free" : naira(price.base)}</dd>
                    </div>
                    {price.discount > 0 && (
                      <div className="flex justify-between gap-4 text-green-ink">
                        <dt>Multi-hour discount ({price.discountPercent}%)</dt>
                        <dd className="font-bold">−{naira(price.discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold text-ink-strong">
                      <dt>Service subtotal</dt>
                      <dd className="font-bold">{viewer.isStaff ? "Free" : naira(price.base - price.discount)}</dd>
                    </div>
                    {!viewer.isStaff && nextTier && (
                      <p className="rounded-md border border-green bg-green-50 px-3 py-2 text-sm text-green-ink">
                        Add {moreHours} more hour{moreHours === 1 ? "" : "s"} to save {nextTier.percent}% on service
                        hours.
                      </p>
                    )}
                    <p className="text-xs text-subtle">
                      {viewer.isStaff
                        ? "Staff bookings are free and confirmed straight away."
                        : "Discounts apply to service hours only. Add-ons are priced separately."}
                    </p>
                  </dl>
                ) : (
                  <p className="text-sm text-subtle">Choose a slot to see the price.</p>
                )}
              </Panel>
            </div>
          </div>
        )}

        {shown === "add-ons" && (
          <div className="mx-auto max-w-[760px]">
            {space.addOns.length === 0 ? (
              <p className="rounded-md border border-line bg-sunk px-4 py-3 text-center text-base text-muted">
                No Add-ons are being offered for this service at the moment - You’re all set to continue
              </p>
            ) : (
              <ul className="flex flex-col gap-2 py-6">
                {space.addOns.map((a) => {
                  const q = quantities[a.id] ?? 0;
                  const max = left[a.id] ?? 0;
                  const set = (n: number) => setQuantities({ ...quantities, [a.id]: Math.max(0, Math.min(n, max)) });
                  return (
                    <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={q > 0}
                          disabled={max === 0}
                          onChange={(e) => set(e.target.checked ? 1 : 0)}
                          className="size-[25px] rounded-sm border border-line accent-primary"
                        />
                        <span className="flex flex-col gap-1">
                          <span className="text-base font-medium tracking-[0.014em] text-ink">{a.name}</span>
                          <span className="text-sm text-subtle">{a.description}</span>
                        </span>
                        <span className="p-1 text-base tracking-[0.014em] text-muted">({max} left)</span>
                      </label>
                      <div className="flex max-w-[250px] flex-wrap items-center justify-end gap-3">
                        <Counter label={a.name} value={q} max={max} onChange={set} />
                        <span className="text-base tracking-[0.014em] text-primary">{naira(a.price)}/Item</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {shown === "review" && start && end && (
          <div className="mx-auto flex max-w-[760px] flex-col gap-6">
            <dl className="grid grid-cols-3 gap-x-4 gap-y-5 border-b border-line pb-6 text-base text-ink-strong">
              <Fact label="Date">{formatShortDay(new Date(start))}</Fact>
              <Fact label="Time">{formatTimeRange(new Date(start), end)}</Fact>
              <Fact label="Location">{space.name}</Fact>
              <Fact label="Email">
                <span className="break-all">{viewer.email}</span>
              </Fact>
              <Fact label="Phone number">{phone || "—"}</Fact>
            </dl>
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-medium text-ink-strong">Service</h2>
              <Line label={`${what} (${hoursLabel(hours)})`} value={viewer.isStaff ? "Free" : naira(price.base)} />
              {price.discount > 0 && (
                <Line
                  label={`${price.discountPercent}% off for ${hoursLabel(hours)}`}
                  value={`−${naira(price.discount)}`}
                />
              )}
            </section>
            {price.addOns.length > 0 && (
              <section className="flex flex-col gap-2 rounded-md border border-line bg-sunk px-3 py-3">
                <h2 className="text-lg font-medium text-ink-strong">Add-Ons</h2>
                {price.addOns.map((a) => (
                  <Line
                    key={a.addOnId}
                    label={`${a.name} (${a.quantity})`}
                    value={viewer.isStaff ? "Free" : naira(a.total)}
                  />
                ))}
              </section>
            )}
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-medium text-ink-strong">Attendees</h2>
              <ul>
                {attendees.map((a, i) => (
                  <li key={i} className="border-b border-line px-4 py-4 text-base text-subtle">
                    {a.trim() || `Guest ${i + 1}`}
                  </li>
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-medium text-ink-strong">Purpose</h2>
              <p className="whitespace-pre-line rounded-md border border-line bg-sunk p-4 text-base text-subtle">
                {purpose}
              </p>
            </section>
            {!viewer.isStaff && (
              <p className="text-sm text-muted">
                After you continue we’ll hold this slot for you while you pay by bank transfer and upload your receipt.
              </p>
            )}
          </div>
        )}
      </Container>

      {/* Action bar: fixed above the bottom navigation on phones */}
      <div className="fixed inset-x-0 bottom-[72px] z-20 border-t border-line bg-white md:static md:mt-8 md:border-0">
        <Container className="mx-auto flex max-w-[792px] flex-col items-stretch gap-3 py-4 md:items-center md:py-0">
          {error && (
            <p role="alert" className="text-sm text-error-ink">
              {error}
            </p>
          )}
          {shown === "review" && (
            <p className="flex w-full items-center justify-between text-base font-medium text-ink-strong">
              Total:
              <span className="text-xl font-bold">{viewer.isStaff ? "Free" : naira(price.total)}</span>
            </p>
          )}
          {shown === "details" && (
            <Button onClick={continueFromDetails} className="md:w-[226px]">
              Continue
            </Button>
          )}
          {shown === "add-ons" && (
            <Button onClick={() => go("review")} className="md:w-[226px]">
              Continue
            </Button>
          )}
          {shown === "review" && (
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? "Booking…" : viewer.isStaff ? "Confirm booking" : "Proceed to pay"}
            </Button>
          )}
        </Container>
      </div>
    </main>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-line bg-white p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold tracking-[0.012em] text-ink">{title}</h2>
        {hint && <p className="text-xs font-medium tracking-[0.014em] text-subtle">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-subtle">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center gap-3 text-base text-ink-strong">
      <span className="shrink-0">{label}</span>
      <span className="h-px flex-1 border-t border-dashed border-muted" />
      <span className="shrink-0 font-bold">{value}</span>
    </p>
  );
}
