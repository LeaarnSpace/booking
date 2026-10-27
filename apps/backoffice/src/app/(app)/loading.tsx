import { Card } from "@/components/ui/card";

// Shown at once while a page loads its data, so navigation responds straight away. The sidebar and top bar stay.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2 border-b border-line-soft pb-6">
        <div className="h-7 w-48 rounded-md bg-sunk" />
        <div className="h-4 w-80 max-w-full rounded-md bg-sunk" />
      </div>
      <Card className="flex flex-col divide-y divide-line-soft">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="size-9 shrink-0 rounded-full bg-sunk" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 rounded bg-sunk" />
              <div className="h-3 w-1/2 rounded bg-sunk" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
