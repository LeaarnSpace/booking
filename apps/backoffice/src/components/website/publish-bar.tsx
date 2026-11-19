// Whether the website shows the latest content, and the Publish button. Changes stay in the back office until
// someone publishes; the website then rebuilds in about a minute.
import { CircleCheck, CircleAlert } from "lucide-react";
import { getPublishState, hasUnpublishedChanges } from "@learnspace/website-content";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/bookings/format";
import { cn } from "@/lib/cn";
import { PublishButton } from "./publish-button";

/** "jane@…" → "jane", so the bar stays short */
const who = (email: string | null) => (email ? email.split("@")[0] : "someone");

export async function PublishBar({ canPublish }: { canPublish: boolean }) {
  const state = await getPublishState();
  const pending = hasUnpublishedChanges(state);
  const Icon = pending ? CircleAlert : CircleCheck;

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        pending && "border-pending/60 bg-pending-50",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={20}
          className={cn("mt-0.5 shrink-0", pending ? "text-pending-ink" : "text-confirmed-ink")}
          aria-hidden="true"
        />
        <div className="text-sm">
          <p className="font-semibold text-ink">
            {pending ? "Changes not on the website yet" : "The website is up to date"}
          </p>
          <p className="text-subtle">
            {pending &&
              state.changedAt &&
              `Last change ${formatDateTime(state.changedAt)} by ${who(state.changedBy)}. `}
            {state.publishedAt
              ? `Last published ${formatDateTime(state.publishedAt)} by ${who(state.publishedBy)}.`
              : "Not published from here yet."}
          </p>
          {state.publishError && <p className="mt-1 text-error-ink">Last try didn’t start: {state.publishError}</p>}
        </div>
      </div>
      {canPublish && <PublishButton highlight={pending} />}
    </Card>
  );
}
