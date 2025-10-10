export const fmtCr = (n: number) =>
  `${new Intl.NumberFormat(undefined, {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n)} Cr`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
