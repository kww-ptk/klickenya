interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-[24px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
          {title}
        </h1>
        <p className="text-[13px] text-text3 mt-1">{description}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
