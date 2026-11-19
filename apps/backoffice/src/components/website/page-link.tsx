"use client";
// A story's or post's page on the website, to copy or open.
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";

export function PageLink({ url, live }: { url: string; live: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2">
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
      </div>
      {!live && <p className="text-sm text-subtle">It’s a draft, so this page isn’t on the website.</p>}
    </div>
  );
}
