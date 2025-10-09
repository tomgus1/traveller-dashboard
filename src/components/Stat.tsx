import { ReactNode } from "react";
export default function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">{icon}</div>
      <div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
