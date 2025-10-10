import { useState } from "react";
import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import type { CargoRow } from "../../types";

export default function Cargo({
  rows,
  onAdd,
}: {
  rows: CargoRow[];
  onAdd: (r: CargoRow) => void;
}) {
  const [form, setForm] = useState({
    Route: "",
    Item: "",
    Tons: "",
    BuyWorld: "",
    BuyPP: "",
    SellWorld: "",
    SellPP: "",
    DM: "",
    Fees: "",
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Record Cargo Leg">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="Route (Vland → Regina)"
            value={form.Route}
            onChange={(e) => setForm({ ...form, Route: e.target.value })}
          />
          <input
            className="input"
            placeholder="Item"
            value={form.Item}
            onChange={(e) => setForm({ ...form, Item: e.target.value })}
          />
          <input
            className="input"
            placeholder="Tons"
            type="number"
            value={form.Tons}
            onChange={(e) => setForm({ ...form, Tons: e.target.value })}
          />
          <input
            className="input"
            placeholder="Purchase World"
            value={form.BuyWorld}
            onChange={(e) => setForm({ ...form, BuyWorld: e.target.value })}
          />
          <input
            className="input"
            placeholder="Purchase Price (Cr/ton)"
            type="number"
            value={form.BuyPP}
            onChange={(e) => setForm({ ...form, BuyPP: e.target.value })}
          />
          <input
            className="input"
            placeholder="Sale World (optional)"
            value={form.SellWorld}
            onChange={(e) => setForm({ ...form, SellWorld: e.target.value })}
          />
          <input
            className="input"
            placeholder="Sale Price (Cr/ton)"
            type="number"
            value={form.SellPP}
            onChange={(e) => setForm({ ...form, SellPP: e.target.value })}
          />
          <input
            className="input"
            placeholder="Broker DM"
            value={form.DM}
            onChange={(e) => setForm({ ...form, DM: e.target.value })}
          />
          <input
            className="input"
            placeholder="Fees/Taxes (Cr)"
            type="number"
            value={form.Fees}
            onChange={(e) => setForm({ ...form, Fees: e.target.value })}
          />
        </div>
        <button
          className="btn mt-2"
          onClick={() => {
            if (
              !form.Route ||
              !form.Item ||
              !form.Tons ||
              !form.BuyWorld ||
              !form.BuyPP
            )
              return;
            const tons = Number(form.Tons);
            const buy = Number(form.BuyPP);
            const sell = form.SellPP === "" ? null : Number(form.SellPP);
            const fees = form.Fees === "" ? 0 : Number(form.Fees);
            const profit = sell === null ? null : (sell - buy) * tons - fees;
            onAdd({
              "Leg/Route": form.Route,
              Item: form.Item,
              Tons: tons,
              "Purchase World": form.BuyWorld,
              "Purchase Price (Cr/ton)": buy,
              "Sale World": form.SellWorld,
              "Sale Price (Cr/ton)": sell,
              "Broker (±DM)": form.DM,
              "Fees/Taxes (Cr)": fees,
              "Profit (Cr)": profit,
            });
            setForm({
              Route: "",
              Item: "",
              Tons: "",
              BuyWorld: "",
              BuyPP: "",
              SellWorld: "",
              SellPP: "",
              DM: "",
              Fees: "",
            });
          }}
        >
          Add
        </button>
      </SectionCard>

      <Table
        columns={[
          "Leg/Route",
          "Item",
          "Tons",
          "Purchase World",
          "Purchase Price (Cr/ton)",
          "Sale World",
          "Sale Price (Cr/ton)",
          "Broker (±DM)",
          "Fees/Taxes (Cr)",
          "Profit (Cr)",
        ]}
        rows={rows}
      />
    </div>
  );
}
