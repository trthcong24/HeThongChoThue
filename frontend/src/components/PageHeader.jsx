const PageHeader = ({ eyebrow, title, description, className = "" }) => {
  return (
    <div className={className}>
      {eyebrow && <p className="text-sm uppercase tracking-[0.3em] text-orange-600">{eyebrow}</p>}
      <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-slate-600">{description}</p>}
    </div>
  );
};

export default PageHeader;