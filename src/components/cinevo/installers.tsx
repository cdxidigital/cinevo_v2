import { Download, ListChecks } from "lucide-react";
import { INSTALLERS } from "@/lib/node-client";

export function InstallerCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {INSTALLERS.map((item) => (
        <article key={item.id} className="rounded-xl border border-cine-border bg-cine-surface p-4 transition hover:border-cine-cyan">
          <div className="flex items-start justify-between gap-3">
            <img src="/node-icon.png" alt="CINEVO Node" className="size-11 rounded-lg" />
            <span className="rounded-full border border-cine-border px-2 py-1 font-mono text-[10px] text-cine-faint">{item.fileType}</span>
          </div>
          <p className="mt-3 font-ui text-xs font-semibold uppercase tracking-[0.18em] text-cine-muted">{item.label}</p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">{item.arch}</h3>
          <p className="mt-2 text-sm text-cine-faint">{item.hint}</p>
          <div className="mt-4 border-t border-cine-border pt-3">
            <p className="flex items-center gap-2 font-ui text-xs font-semibold text-cine-muted"><ListChecks size={14} /> Setup</p>
            <ol className="mt-2 grid gap-1 text-xs text-cine-faint">
              {item.steps.map((step, index) => <li key={step}><span className="mr-2 font-mono text-cine-cyan">{index + 1}.</span>{step}</li>)}
            </ol>
          </div>
          <a href={item.href} download className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cine-cyan font-ui text-sm font-bold text-cine-bg">
            <Download size={16} /> Download {item.label}
          </a>
        </article>
      ))}
    </div>
  );
}
