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
    <div className="overflow-auto glass border border-border transition-all duration-300">
      <table className="table w-full">
        <thead>
          <tr className="bg-white/5">
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
              <td className="text-muted p-8 text-center text-sm font-medium" colSpan={columns.length}>
                No data available in this section.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                className="hover:bg-white/5 transition-colors duration-200"
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
