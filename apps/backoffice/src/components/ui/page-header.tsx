/** Title row at the top of every page */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-strong">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
