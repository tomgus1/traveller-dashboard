import * as React from "react";

export default function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  const renderCellValue = (value: unknown): React.ReactNode => {
    if (React.isValidElement(value)) {
      return value;
    }
    return String(value ?? "");
  };

  return (
    <div className="overflow-auto glass rounded-2xl border transition-all duration-300">
      <table className="table w-full">
        <thead>
          <tr className="bg-zinc-50/50 dark:bg-zinc-900/50">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 text-xs font-bold tracking-wider text-muted uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="animate-in">
          {rows.length === 0 ? (
            <tr>
              <td className="text-zinc-500 p-8 text-center" colSpan={columns.length}>
                No data available in this section.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors duration-200"
              >
                {columns.map((c) => (
                  <td key={c} className="px-4 py-3 border-t">
                    {renderCellValue(r[c])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
