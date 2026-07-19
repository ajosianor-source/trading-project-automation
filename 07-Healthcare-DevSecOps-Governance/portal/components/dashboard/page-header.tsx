import { type ReactNode } from "react";
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="mb-6 flex min-w-0 flex-col justify-between gap-4 xl:flex-row xl:items-end"><div className="min-w-0"><p className="eyebrow">{eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/48">{description}</p></div>{actions && <div className="flex max-w-full flex-wrap gap-2 xl:shrink-0 xl:justify-end">{actions}</div>}</div>;
}
