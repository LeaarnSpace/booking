"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Live "hh:mm:ss" until `until`. Refreshes the page once when it reaches zero, so the status updates. */
export function Countdown({ until }: { until: string }) {
  const end = new Date(until).getTime();
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = Math.max(0, end - now);
  useEffect(() => {
    if (left === 0 && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [left, router]);

  const seconds = Math.floor(left / 1000);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  // Server and browser clocks differ by a second or two, so the first render may not match
  return (
    <time dateTime={until} suppressHydrationWarning className="tabular-nums">
      {hh}:{mm}:{ss}
    </time>
  );
}
