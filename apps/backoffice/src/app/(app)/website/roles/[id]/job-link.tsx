"use client";
// The role's page on the website: copy or open it, or replace its address so an old link stops working.
import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { newRoleLink } from "../../actions";

export function JobLink({ id, url, live }: { id: string; url: string; live: boolean }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="flex flex-col gap-3 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-ink-strong">Job page</h2>
        <p className="text-sm text-subtle">
          {live
            ? "Live on the website once published. The address is random, so link-only roles can’t be guessed."
            : "Hidden roles have no page. Choose Listed or Link only below to give it one."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-sunk px-3 py-2 text-sm text-ink">{url}</code>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {live && (
          <a href={url} target="_blank" rel="noopener" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <ExternalLink size={14} aria-hidden="true" /> Open
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            confirm("Give this role a new address? The current link stops working at the next publish.") &&
            start(async () => {
              const result = await newRoleLink(id);
              setError(result.ok ? null : result.error);
            })
          }
        >
          <RefreshCw size={14} aria-hidden="true" /> {pending ? "Changing…" : "New link"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error-ink">
          {error}
        </p>
      )}
    </Card>
  );
}
