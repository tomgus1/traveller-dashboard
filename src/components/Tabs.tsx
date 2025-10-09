export function TabsBar({ tabs, active, onChange }:{
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string)=>void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b mb-2">
      {tabs.map(t => (
        <button
          key={t.id}
          className={
            "px-3 py-2 rounded-t-xl " +
            (active===t.id ? "bg-zinc-100 dark:bg-zinc-900 border" : "border-transparent")
          }
          onClick={()=>onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}