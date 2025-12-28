import Table from "./Table";
import FormField from "./FormField";
import { useForm } from "../hooks/useForm";
import { useTravellerArmour } from "../../hooks/useTravellerArmour";
import type { ArmourRow } from "../../types";
import { useState } from "react";
import { Shield, Plus, Lock } from "lucide-react";
import type { ArmourSource } from "../../data/traveller-armour.types";

type ArmourFormData = Record<string, string> & {
  Armour: string;
  Type: string;
  Protection: string;
  Mass: string;
  Cost: string;
  Notes: string;
};

const INITIAL_FORM: ArmourFormData = {
  Armour: "",
  Type: "",
  Protection: "",
  Mass: "",
  Cost: "",
  Notes: "",
};

export default function Armour({
  rows,
  onAdd,
}: {
  rows: ArmourRow[];
  onAdd: (r: ArmourRow) => void;
}) {
  const { form, createInputHandler, resetForm, setForm } =
    useForm(INITIAL_FORM);
  const { getAllArmour, getArmourTypes, getArmourByName } =
    useTravellerArmour();
  const [sourceFilter, setSourceFilter] = useState<ArmourSource | "All">("All");

  const handleArmourSelect = (armourName: string) => {
    if (!armourName || armourName === "") {
      resetForm();
      return;
    }

    if (armourName === "custom") {
      setForm({ ...INITIAL_FORM, Armour: "custom" });
      return;
    }

    const armour = getArmourByName(armourName);
    if (armour) {
      const protectionDisplay = armour.protectionType
        ? `${armour.protection} (${armour.protectionType})`
        : armour.protection.toString();

      setForm({
        Armour: armour.name,
        Type: armour.type,
        Protection: protectionDisplay,
        Mass: armour.mass.toString(),
        Cost: armour.cost.toString(),
        Notes: armour.notes,
      });
    }
  };

  const handleSubmit = () => {
    if (!form.Armour) return;

    onAdd({
      Armour: form.Armour as string,
      Type: form.Type as string,
      Protection: form.Protection
        ? Number(form.Protection)
        : (form.Protection as string),
      Mass: form.Mass ? Number(form.Mass) : (form.Mass as string),
      Cost: form.Cost ? Number(form.Cost) : undefined,
      Notes: form.Notes as string,
    });

    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="hud-glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
            Protection <span className="text-blue-400">Suites</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            type="select"
            label="Database Source"
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as ArmourSource | "All")
            }
          >
            <option value="All">All Protection Manuals</option>
            <option value="Core Rulebook">Core Rulebook</option>
            <option value="High Guard">High Guard</option>
            <option value="Central Supply Catalogue">Central Supply Catalogue</option>
            <option value="Mercenary">Mercenary</option>
            <option value="Other">Other</option>
          </FormField>

          <FormField
            type="select"
            label="Registry"
            value={form.Armour === "custom" ? "custom" : form.Armour}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setForm({ ...INITIAL_FORM, Armour: "custom" });
              } else {
                createInputHandler("Armour")(e);
                handleArmourSelect(e.target.value);
              }
            }}
          >
            <option value="">Select Armour...</option>
            <optgroup label="Certified Suites">
              {getAllArmour()
                .filter(
                  (armour) =>
                    sourceFilter === "All" || armour.source === sourceFilter
                )
                .map((armour) => (
                  <option key={armour.name} value={armour.name}>
                    {armour.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Custom Fabrication">
              <option value="custom">Register Custom Suite</option>
            </optgroup>
          </FormField>
        </div>

        {form.Armour === "custom" && (
          <div className="mb-4 animate-in">
            <FormField
              label="Custom Designation"
              placeholder="Enter Custom Armour Name..."
              value=""
              onChange={(e) => {
                setForm({ ...form, Armour: e.target.value });
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-white/5">
          <FormField
            type="select"
            value={form.Type}
            onChange={createInputHandler("Type")}
          >
            <option value="">Class</option>
            {getArmourTypes().map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </FormField>
          <FormField
            placeholder="PROT"
            value={form.Protection}
            onChange={createInputHandler("Protection")}
          />
          <FormField
            placeholder="WT (kg)"
            value={form.Mass}
            onChange={createInputHandler("Mass")}
          />
          <FormField
            type="number"
            placeholder="CR"
            value={form.Cost}
            onChange={createInputHandler("Cost")}
          />
          <button
            onClick={handleSubmit}
            className="btn-hud py-2.5 flex items-center justify-center gap-2 group"
            type="button"
            data-testid="add-armour-button"
            aria-label="Add new armour entry to character equipment"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Assign</span>
          </button>
        </div>
      </div>

      <div className="hud-glass p-0 overflow-hidden">
        <Table
          columns={["Armour", "Type", "Protection", "Mass", "Cost", "Notes"]}
          rows={rows.map((row) => ({
            ...row,
            Armour: <span className="font-black text-blue-400 uppercase tracking-tight">{row.Armour}</span>,
            Protection: <span className="font-bold flex items-center gap-2"><Lock className="w-3 h-3 text-blue-400" /> {row.Protection}</span>,
            Mass: row.Mass ? `${row.Mass} kg` : "0 kg",
          }))}
        />
      </div>
    </div>
  );
}
