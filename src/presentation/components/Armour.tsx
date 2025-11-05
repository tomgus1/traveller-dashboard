import SectionCard from "./SectionCard";
import Table from "./Table";
import FormField from "./FormField";
import { Button } from "./Button";
import { useForm } from "../hooks/useForm";
import { useTravellerArmour } from "../../hooks/useTravellerArmour";
import type { ArmourRow } from "../../types";
import { useState } from "react";
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
    <div className="space-y-4">
      <SectionCard title="Add Armour Entry">
        <div className="space-y-3">
          <FormField
            type="select"
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as ArmourSource | "All")
            }
          >
            <option value="All">All Rulebooks</option>
            <option value="Core Rulebook">Core Rulebook</option>
            <option value="High Guard">High Guard</option>
            <option value="Central Supply Catalogue">
              Central Supply Catalogue
            </option>
            <option value="Mercenary">Mercenary</option>
            <option value="Other">Other</option>
          </FormField>

          <FormField
            type="select"
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
            <option value="">Select from Database or Enter Custom</option>
            <optgroup label="Traveller Armour Database">
              {getAllArmour()
                .filter(
                  (armour) =>
                    sourceFilter === "All" || armour.source === sourceFilter
                )
                .map((armour) => (
                  <option key={armour.name} value={armour.name}>
                    {armour.name} ({armour.type}) - Protection:{" "}
                    {armour.protection} - {armour.cost} Cr
                  </option>
                ))}
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">Enter Custom Armour</option>
            </optgroup>
          </FormField>

          {form.Armour === "custom" && (
            <FormField
              placeholder="Custom Armour Name"
              value=""
              onChange={(e) => {
                setForm({ ...form, Armour: e.target.value });
              }}
            />
          )}

          <div className="grid md:grid-cols-3 gap-3">
            <FormField
              type="select"
              value={form.Type}
              onChange={createInputHandler("Type")}
            >
              <option value="">Select Type</option>
              {getArmourTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </FormField>
            <FormField
              placeholder="Protection (e.g., +5, 1d6+2)"
              value={form.Protection}
              onChange={createInputHandler("Protection")}
            />
            <FormField
              placeholder="Mass (kg)"
              value={form.Mass}
              onChange={createInputHandler("Mass")}
            />
            <FormField
              type="number"
              placeholder="Cost (Cr)"
              value={form.Cost}
              onChange={createInputHandler("Cost")}
            />
            <FormField
              placeholder="Notes"
              value={form.Notes}
              onChange={createInputHandler("Notes")}
            />
          </div>
        </div>
        <Button
          className="mt-2"
          onClick={handleSubmit}
          type="button"
          data-testid="add-armour-button"
          aria-label="Add new armour entry to character equipment"
        >
          Add Armour
        </Button>
      </SectionCard>

      <Table
        columns={["Armour", "Type", "Protection", "Mass", "Cost", "Notes"]}
        rows={rows.map((row) => ({
          ...row,
          Mass: row.Mass ? `${row.Mass} kg` : "",
        }))}
      />
    </div>
  );
}
