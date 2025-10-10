import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import FormField from "../../components/FormField";
import { useForm } from "../../hooks/useForm";
import type { AmmoRow } from "../../types";

type AmmoFormData = Record<string, string> & {
  Weapon: string;
  "Ammo Type": string;
  "Magazine Size": string;
  "Rounds Loaded": string;
  "Spare Magazines": string;
  "Loose Rounds": string;
  Notes: string;
};

const INITIAL_FORM: AmmoFormData = {
  Weapon: "",
  "Ammo Type": "",
  "Magazine Size": "",
  "Rounds Loaded": "",
  "Spare Magazines": "",
  "Loose Rounds": "",
  Notes: "",
};

export default function Ammo({
  rows,
  onAdd,
}: {
  rows: AmmoRow[];
  onAdd: (r: AmmoRow) => void;
}) {
  const { form, createInputHandler, resetForm } = useForm(INITIAL_FORM);

  const handleSubmit = () => {
    if (!form.Weapon) return;

    const magazineSize = Number(form["Magazine Size"] || 0);
    const roundsLoaded = Number(form["Rounds Loaded"] || 0);
    const spareMagazines = Number(form["Spare Magazines"] || 0);
    const looseRounds = Number(form["Loose Rounds"] || 0);
    const totalRounds =
      magazineSize * spareMagazines + roundsLoaded + looseRounds;

    onAdd({
      Weapon: form.Weapon as string,
      "Ammo Type": form["Ammo Type"] as string,
      "Magazine Size": magazineSize,
      "Rounds Loaded": roundsLoaded,
      "Spare Magazines": spareMagazines,
      "Loose Rounds": looseRounds,
      "Total Rounds": totalRounds,
      Notes: form.Notes as string,
    });

    resetForm();
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Add Ammunition Entry">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField
            placeholder="Weapon"
            value={form.Weapon}
            onChange={createInputHandler("Weapon")}
          />
          <FormField
            placeholder="Ammo Type"
            value={form["Ammo Type"]}
            onChange={createInputHandler("Ammo Type")}
          />
          <FormField
            type="number"
            placeholder="Magazine Size"
            value={form["Magazine Size"]}
            onChange={createInputHandler("Magazine Size")}
          />
          <FormField
            type="number"
            placeholder="Rounds Loaded"
            value={form["Rounds Loaded"]}
            onChange={createInputHandler("Rounds Loaded")}
          />
          <FormField
            type="number"
            placeholder="Spare Magazines"
            value={form["Spare Magazines"]}
            onChange={createInputHandler("Spare Magazines")}
          />
          <FormField
            type="number"
            placeholder="Loose Rounds"
            value={form["Loose Rounds"]}
            onChange={createInputHandler("Loose Rounds")}
          />
          <FormField
            placeholder="Notes"
            value={form.Notes}
            onChange={createInputHandler("Notes")}
          />
        </div>
        <button
          className="btn mt-2"
          onClick={handleSubmit}
          type="button"
          data-testid="add-ammo-button"
          aria-label="Add new ammunition entry to character equipment"
        >
          Add
        </button>
      </SectionCard>

      <Table
        columns={[
          "Weapon",
          "Ammo Type",
          "Magazine Size",
          "Rounds Loaded",
          "Spare Magazines",
          "Loose Rounds",
          "Total Rounds",
          "Notes",
        ]}
        rows={rows}
      />
    </div>
  );
}
