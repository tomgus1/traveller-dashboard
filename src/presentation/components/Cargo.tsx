import Table from "./Table";
import FormField from "./FormField";
import { useForm } from "../hooks/useForm";
import { Package, Plus, TrendingUp, TrendingDown } from "lucide-react";
import type { CargoRow } from "../../types";

type CargoFormData = Record<string, string> & {
  Route: string;
  Item: string;
  Tons: string;
  BuyWorld: string;
  BuyPP: string;
  SellWorld: string;
  SellPP: string;
  DM: string;
  Fees: string;
};

const INITIAL_FORM: CargoFormData = {
  Route: "",
  Item: "",
  Tons: "",
  BuyWorld: "",
  BuyPP: "",
  SellWorld: "",
  SellPP: "",
  DM: "",
  Fees: "",
};

export default function Cargo({
  rows,
  onAdd,
}: {
  rows: CargoRow[];
  onAdd: (r: CargoRow) => void;
}) {
  const { form, createInputHandler, resetForm } = useForm(INITIAL_FORM);

  const handleSubmit = () => {
    if (
      !form.Route ||
      !form.Item ||
      !form.Tons ||
      !form.BuyWorld ||
      !form.BuyPP
    ) {
      return;
    }

    const tons = Number(form.Tons);
    const buyPrice = Number(form.BuyPP);
    const sellPrice = form.SellPP === "" ? null : Number(form.SellPP);
    const fees = form.Fees === "" ? 0 : Number(form.Fees);
    const profit =
      sellPrice === null ? null : (sellPrice - buyPrice) * tons - fees;

    onAdd({
      "Leg/Route": form.Route as string,
      Item: form.Item as string,
      Tons: tons,
      "Purchase World": form.BuyWorld as string,
      "Purchase Price (Cr/ton)": buyPrice,
      "Sale World": form.SellWorld as string,
      "Sale Price (Cr/ton)": sellPrice,
      "Broker (±DM)": form.DM as string,
      "Fees/Taxes (Cr)": fees,
      "Profit (Cr)": profit,
    });

    resetForm();
  };

  const totalTonnage = rows.reduce((acc, row) => acc + (row.Tons || 0), 0);
  const totalProfit = rows.reduce((acc, row) => acc + (row["Profit (Cr)"] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="hud-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
              Trade <span className="text-primary">Manifest</span>
            </h3>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Hold Usage</p>
              <p className="text-xs font-bold">{totalTonnage.toFixed(1)} <span className="text-[10px] text-muted font-black">TONS</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Net Outcome</p>
              <div className="flex items-center gap-1.5 justify-end">
                {totalProfit >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                <p className={`text-xs font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {totalProfit.toLocaleString()} <span className="text-[10px] opacity-70 font-black">CR</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <FormField
            label="Route Origin/Destination"
            placeholder="Vland → Regina"
            value={form.Route}
            onChange={createInputHandler("Route")}
          />
          <FormField
            label="Commodity Designation"
            placeholder="Petrochemicals / Luxury Goods"
            value={form.Item}
            onChange={createInputHandler("Item")}
          />
          <FormField
            type="number"
            label="Bulk Tonnage"
            placeholder="10.0"
            value={form.Tons}
            onChange={createInputHandler("Tons")}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-white/5">
          <div className="lg:col-span-2">
            <FormField
              placeholder="Origin World"
              value={form.BuyWorld}
              onChange={createInputHandler("BuyWorld")}
            />
          </div>
          <FormField
            type="number"
            placeholder="Buy (Cr/ton)"
            value={form.BuyPP}
            onChange={createInputHandler("BuyPP")}
          />
          <FormField
            type="number"
            placeholder="Sell (Cr/ton)"
            value={form.SellPP}
            onChange={createInputHandler("SellPP")}
          />
          <FormField
            type="number"
            placeholder="Fees (Cr)"
            value={form.Fees}
            onChange={createInputHandler("Fees")}
          />
          <button
            onClick={handleSubmit}
            className="btn-hud py-2.5 flex items-center justify-center gap-2 group"
            type="button"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Manifest</span>
          </button>
        </div>
      </div>

      <div className="hud-glass p-0 overflow-hidden">
        <Table
          columns={[
            "Leg/Route",
            "Item",
            "Tons",
            "Purchase",
            "Sale",
            "Profit (Cr)",
          ]}
          rows={rows.map(row => ({
            ...row,
            "Leg/Route": <span className="font-bold text-[11px] uppercase tracking-wide flex items-center gap-2">{row["Leg/Route"]}</span>,
            Item: <span className="font-black text-primary uppercase tracking-tight">{row.Item}</span>,
            Purchase: <div className="text-[10px]"><p className="text-muted uppercase font-black">From {row["Purchase World"]}</p><p className="font-mono">{row["Purchase Price (Cr/ton)"].toLocaleString()} Cr</p></div>,
            Sale: row["Sale Price (Cr/ton)"] ? <div className="text-[10px]"><p className="text-muted uppercase font-black">To {row["Sale World"]}</p><p className="font-mono">{row["Sale Price (Cr/ton)"].toLocaleString()} Cr</p></div> : <span className="text-muted italic">In Transit</span>,
            "Profit (Cr)": row["Profit (Cr)"] !== undefined && row["Profit (Cr)"] !== null ? (
              <span className={`font-black tracking-tight ${row["Profit (Cr)"] >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {row["Profit (Cr)"] > 0 ? '+' : ''}{row["Profit (Cr)"].toLocaleString()}
              </span>
            ) : <span className="text-muted">Calculating...</span>
          }))}
        />
      </div>
    </div>
  );
}
