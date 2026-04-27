interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-abraxas-subtle mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display font-bold text-2xl md:text-3xl text-abraxas-text mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-abraxas-muted leading-relaxed max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
