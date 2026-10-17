import type { ReactNode } from "react";

interface AnimeRowProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function AnimeRow({ title, subtitle, action, children }: AnimeRowProps) {
  return (
    <section className="px-6 md:px-10 mb-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          ) : null}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {children}
      </div>
    </section>
  );
}
