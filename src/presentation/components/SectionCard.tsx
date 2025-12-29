export default function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-mgt space-y-4">
      <div className="mgt-header-bar -mx-6 -mt-6 mb-4">
        <span className="text-xs">{title}</span>
      </div>
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
