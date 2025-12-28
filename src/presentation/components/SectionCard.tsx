export default function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-modern space-y-4">
      <div className="font-bold text-lg tracking-tight">{title}</div>
      {children}
    </div>
  );
}
