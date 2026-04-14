const EmptyState = ({ message }) => {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
      {message}
    </div>
  );
};

export default EmptyState;