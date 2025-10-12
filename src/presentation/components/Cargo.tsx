import SectionCard from "./SectionCard";
import Table from "./Table";
import FormField from "./FormField";
import { Button } from "./Button";
import { useForm } from "../hooks/useForm";
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

  return (
    <div className="space-y-4">
      <SectionCard title="Record Cargo Leg">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField
            placeholder="Route (Vland → Regina)"
            value={form.Route}
            onChange={createInputHandler("Route")}
          />
          <FormField
            placeholder="Item"
            value={form.Item}
            onChange={createInputHandler("Item")}
          />
          <FormField
            type="number"
            placeholder="Tons"
            value={form.Tons}
            onChange={createInputHandler("Tons")}
          />
          <FormField
            placeholder="Purchase World"
            value={form.BuyWorld}
            onChange={createInputHandler("BuyWorld")}
          />
          <FormField
            type="number"
            placeholder="Purchase Price (Cr/ton)"
            value={form.BuyPP}
            onChange={createInputHandler("BuyPP")}
          />
          <FormField
            placeholder="Sale World (optional)"
            value={form.SellWorld}
            onChange={createInputHandler("SellWorld")}
          />
          <FormField
            type="number"
            placeholder="Sale Price (Cr/ton)"
            value={form.SellPP}
            onChange={createInputHandler("SellPP")}
          />
          <FormField
            placeholder="Broker DM"
            value={form.DM}
            onChange={createInputHandler("DM")}
          />
          <FormField
            type="number"
            placeholder="Fees/Taxes (Cr)"
            value={form.Fees}
            onChange={createInputHandler("Fees")}
          />
        </div>
        <Button
          className="mt-2"
          onClick={handleSubmit}
          type="button"
          data-testid="add-cargo-button"
          aria-label="Add new cargo item to ship manifest"
        >
          Add Cargo
        </Button>
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
