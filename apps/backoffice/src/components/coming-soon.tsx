import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/** Placeholder for screens that are planned but not built yet */
export function ComingSoon({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} description={description} />
      <EmptyState icon={Hammer} title="Coming next">
        {children}
      </EmptyState>
    </div>
  );
}
