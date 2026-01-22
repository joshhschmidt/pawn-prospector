import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

/**
 * A consistent card wrapper for dashboard sections.
 * Use it to keep spacing/typography uniform across pages.
 */
export const SectionCard = ({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
  contentClassName,
}: SectionCardProps) => {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {hasHeader && (
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-5 pb-4 border-b border-border/50",
            headerClassName,
          )}
        >
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      <div className={cn(hasHeader ? "p-5 pt-4" : "p-5", contentClassName)}>{children}</div>
    </section>
  );
};
