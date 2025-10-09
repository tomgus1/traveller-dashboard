export default function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-3">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  );
}
