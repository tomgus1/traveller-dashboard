export const fmtCr = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "XXX",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("XXX", "Cr");
export const todayISO = () => new Date().toISOString().slice(0, 10);
