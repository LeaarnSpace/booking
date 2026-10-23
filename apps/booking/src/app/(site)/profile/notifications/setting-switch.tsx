"use client";
import { useOptimistic, useTransition } from "react";
import type { NotificationSetting } from "@learnspace/bookings/client";
import { cn } from "@/lib/cn";
import { toggleSetting } from "../actions";

export function SettingSwitch({ setting, label, on }: { setting: NotificationSetting; label: string; on: boolean }) {
  const [shown, setShown] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center justify-between py-5 text-base font-medium text-ink-strong">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={shown}
        onClick={() =>
          start(async () => {
            setShown(!shown);
            await toggleSetting(setting, !shown);
          })
        }
        className={cn("relative h-6 w-11 rounded-full transition-colors", shown ? "bg-green" : "bg-line")}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
            shown ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}
