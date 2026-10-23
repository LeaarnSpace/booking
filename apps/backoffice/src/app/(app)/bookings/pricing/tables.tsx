"use client";
// The pricing tables. Each row is its own small form, saved on its own, so staff can change one price without
// touching the rest. On phones the rows stack into cards with their labels shown.
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { cn } from "@/lib/cn";
import { deleteDiscount, saveAddOn, saveDiscount, saveService, saveSpaceRate } from "./actions";

const input =
  "h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink disabled:border-transparent disabled:bg-transparent disabled:px-0";

type Space = { id: string; name: string };

function Cell({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-semibold text-subtle md:block", className)}>
      <span className="md:sr-only">{label}</span>
      {children}
    </label>
  );
}

function Header({ columns, grid }: { columns: string[]; grid: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "hidden border-b border-line-soft px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-subtle md:grid",
        grid,
      )}
    >
      {columns.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}

const row = "grid grid-cols-2 items-end gap-3 border-b border-line-soft px-4 py-3 last:border-0 md:items-center";

function SpaceSelect({
  spaces,
  defaultValue,
  disabled,
}: {
  spaces: Space[];
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <select name="spaceId" defaultValue={defaultValue} disabled={disabled} className={input} required>
      {spaces.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

/* ---------- Hourly rates ---------- */

const RATE_GRID = "md:grid-cols-[1.1fr_1.4fr_150px_90px_80px]";

export function RatesTable({
  spaces,
  spaceRates,
  services,
  canEdit,
}: {
  spaces: Space[];
  spaceRates: { id: string; name: string; hourlyRate: number }[];
  services: { id: string; spaceId: string; spaceName: string; name: string; hourlyRate: number; active: boolean }[];
  canEdit: boolean;
}) {
  return (
    <div>
      <Header columns={["Space", "Service", "Rate per hour (₦)", "On sale", ""]} grid={RATE_GRID} />
      {spaceRates.map((s) => (
        <ActionForm
          key={s.id}
          action={saveSpaceRate.bind(null, s.id)}
          savedLabel="Saved"
          className={cn(row, RATE_GRID)}
        >
          <span className="col-span-2 text-sm font-semibold text-ink md:col-span-1">{s.name}</span>
          <span className="hidden text-sm text-subtle md:block">Whole space (no services)</span>
          <Cell label="Rate per hour (₦)">
            <input
              name="hourlyRate"
              type="number"
              min={0}
              step={500}
              required
              defaultValue={s.hourlyRate}
              disabled={!canEdit}
              className={input}
            />
          </Cell>
          <span className="hidden md:block" />
          {canEdit && (
            <SubmitButton size="sm" variant="secondary" pendingLabel="…">
              Save
            </SubmitButton>
          )}
        </ActionForm>
      ))}
      {services.map((s) => (
        <ActionForm key={s.id} action={saveService.bind(null, s.id)} savedLabel="Saved" className={cn(row, RATE_GRID)}>
          <input type="hidden" name="spaceId" value={s.spaceId} />
          <span className="text-sm text-subtle md:text-ink">{s.spaceName}</span>
          <Cell label="Service">
            <input name="name" required maxLength={60} defaultValue={s.name} disabled={!canEdit} className={input} />
          </Cell>
          <Cell label="Rate per hour (₦)">
            <input
              name="hourlyRate"
              type="number"
              min={0}
              step={500}
              required
              defaultValue={s.hourlyRate}
              disabled={!canEdit}
              className={input}
            />
          </Cell>
          <Cell label="On sale">
            <input
              name="active"
              type="checkbox"
              defaultChecked={s.active}
              disabled={!canEdit}
              className="size-4 accent-cobalt-600"
            />
          </Cell>
          {canEdit && (
            <SubmitButton size="sm" variant="secondary" pendingLabel="…">
              Save
            </SubmitButton>
          )}
        </ActionForm>
      ))}
      {canEdit && (
        <ActionForm action={saveService.bind(null, null)} resetOnSuccess className={cn(row, RATE_GRID, "bg-sunk/60")}>
          <Cell label="Space">
            <SpaceSelect spaces={spaces} />
          </Cell>
          <Cell label="New service">
            <input name="name" required maxLength={60} placeholder="New service, e.g. Livestream" className={input} />
          </Cell>
          <Cell label="Rate per hour (₦)">
            <input name="hourlyRate" type="number" min={0} step={500} required placeholder="20000" className={input} />
          </Cell>
          <span className="hidden md:block" />
          <SubmitButton size="sm" pendingLabel="…">
            Add
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

/* ---------- Add-ons ---------- */

const ADDON_GRID = "md:grid-cols-[1fr_1.2fr_1.4fr_130px_80px_70px_80px]";

export function AddOnsTable({
  spaces,
  addOns,
  canEdit,
}: {
  spaces: Space[];
  addOns: {
    id: string;
    spaceId: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    active: boolean;
  }[];
  canEdit: boolean;
}) {
  const fields = (a?: (typeof addOns)[number]) => (
    <>
      <Cell label="Space">
        <SpaceSelect spaces={spaces} defaultValue={a?.spaceId} disabled={!canEdit} />
      </Cell>
      <Cell label="Add-on">
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={a?.name}
          placeholder={a ? undefined : "New add-on"}
          disabled={!canEdit}
          className={input}
        />
      </Cell>
      <Cell label="Description" className="col-span-2 md:col-span-1">
        <input
          name="description"
          maxLength={80}
          defaultValue={a?.description}
          placeholder={a ? undefined : "Short description"}
          disabled={!canEdit}
          className={input}
        />
      </Cell>
      <Cell label="Price per item (₦)">
        <input
          name="price"
          type="number"
          min={0}
          step={500}
          required
          defaultValue={a?.price}
          placeholder={a ? undefined : "5000"}
          disabled={!canEdit}
          className={input}
        />
      </Cell>
      <Cell label="In stock">
        <input
          name="stock"
          type="number"
          min={0}
          max={100}
          required
          defaultValue={a?.stock ?? 1}
          disabled={!canEdit}
          className={input}
        />
      </Cell>
    </>
  );
  return (
    <div>
      <Header
        columns={["Space", "Add-on", "Description", "Price per item (₦)", "Stock", "On sale", ""]}
        grid={ADDON_GRID}
      />
      {addOns.length === 0 && <p className="px-4 py-3 text-sm text-subtle">No add-ons yet.</p>}
      {addOns.map((a) => (
        <ActionForm key={a.id} action={saveAddOn.bind(null, a.id)} savedLabel="Saved" className={cn(row, ADDON_GRID)}>
          {fields(a)}
          <Cell label="On sale">
            <input
              name="active"
              type="checkbox"
              defaultChecked={a.active}
              disabled={!canEdit}
              className="size-4 accent-cobalt-600"
            />
          </Cell>
          {canEdit && (
            <SubmitButton size="sm" variant="secondary" pendingLabel="…">
              Save
            </SubmitButton>
          )}
        </ActionForm>
      ))}
      {canEdit && (
        <ActionForm action={saveAddOn.bind(null, null)} resetOnSuccess className={cn(row, ADDON_GRID, "bg-sunk/60")}>
          {fields()}
          <span className="hidden md:block" />
          <SubmitButton size="sm" pendingLabel="…">
            Add
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

/* ---------- Length discounts ---------- */

const DISCOUNT_GRID = "md:grid-cols-[1.2fr_130px_110px_1.6fr_80px_44px]";

export function DiscountsTable({
  spaces,
  discounts,
  canEdit,
}: {
  spaces: Space[];
  discounts: { id: number; spaceId: string; hours: number; percent: number; example: string }[];
  canEdit: boolean;
}) {
  return (
    <div>
      <Header columns={["Space", "From (hours)", "% off", "Example", "", ""]} grid={DISCOUNT_GRID} />
      {discounts.length === 0 && (
        <p className="px-4 py-3 text-sm text-subtle">No discounts. Every hour costs the same.</p>
      )}
      {discounts.map((d) => (
        <div key={d.id} className="relative">
          <ActionForm action={saveDiscount.bind(null, d.id)} savedLabel="Saved" className={cn(row, DISCOUNT_GRID)}>
            <Cell label="Space">
              <SpaceSelect spaces={spaces} defaultValue={d.spaceId} disabled={!canEdit} />
            </Cell>
            <Cell label="From (hours)">
              <input
                name="hours"
                type="number"
                min={2}
                max={24}
                required
                defaultValue={d.hours}
                disabled={!canEdit}
                className={input}
              />
            </Cell>
            <Cell label="% off">
              <input
                name="percent"
                type="number"
                min={1}
                max={90}
                required
                defaultValue={d.percent}
                disabled={!canEdit}
                className={input}
              />
            </Cell>
            <span className="col-span-2 text-sm text-subtle md:col-span-1">{d.example}</span>
            {canEdit && (
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                Save
              </SubmitButton>
            )}
          </ActionForm>
          {canEdit && (
            <ActionForm
              action={deleteDiscount.bind(null, d.id)}
              className="absolute bottom-3 right-4 md:bottom-auto md:top-3"
            >
              <SubmitButton
                size="sm"
                variant="ghost"
                aria-label={`Remove the ${d.hours}-hour discount`}
                confirmMessage="Remove this discount?"
                className="text-error-ink"
              >
                <Trash2 size={15} />
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      ))}
      {canEdit && (
        <ActionForm
          action={saveDiscount.bind(null, null)}
          resetOnSuccess
          className={cn(row, DISCOUNT_GRID, "bg-sunk/60")}
        >
          <Cell label="Space">
            <SpaceSelect spaces={spaces} />
          </Cell>
          <Cell label="From (hours)">
            <input name="hours" type="number" min={2} max={24} required placeholder="3" className={input} />
          </Cell>
          <Cell label="% off">
            <input name="percent" type="number" min={1} max={90} required placeholder="5" className={input} />
          </Cell>
          <span className="hidden md:block" />
          <SubmitButton size="sm" pendingLabel="…">
            Add
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
