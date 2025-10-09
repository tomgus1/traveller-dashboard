export const toNumber = (v: any) =>
  Number.isFinite(Number(v)) ? Number(v) : 0;
export const sumColumn = <T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
) => rows.reduce((a, r) => a + toNumber(r[key]), 0);
export const fmtCr = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "XXX",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("XXX", "Cr");
export const todayISO = () => new Date().toISOString().slice(0, 10);
