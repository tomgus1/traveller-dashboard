import { useState } from "react";
import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import type { AmmoRow } from "../../types";

export default function Ammo({
  rows,
  onAdd,
}: {
  rows: AmmoRow[];
  onAdd: (r: AmmoRow) => void;
}) {
  const [form, setForm] = useState({
    Weapon: "",
    "Ammo Type": "",
    "Magazine Size": "",
    "Rounds Loaded": "",
    "Spare Magazines": "",
    "Loose Rounds": "",
    Notes: "",
  });

  const add = () => {
    if (!form.Weapon) return;
    const mag = Number(form["Magazine Size"] || 0);
    const load = Number(form["Rounds Loaded"] || 0);
    const spm = Number(form["Spare Magazines"] || 0);
    const loose = Number(form["Loose Rounds"] || 0);
    const total = mag * spm + load + loose;
    onAdd({
      Weapon: form.Weapon,
      "Ammo Type": form["Ammo Type"],
      "Magazine Size": mag,
      "Rounds Loaded": load,
      "Spare Magazines": spm,
      "Loose Rounds": loose,
      "Total Rounds": total,
      Notes: form.Notes,
    });
    setForm({
      Weapon: "",
      "Ammo Type": "",
      "Magazine Size": "",
      "Rounds Loaded": "",
      "Spare Magazines": "",
      "Loose Rounds": "",
      Notes: "",
    });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Add Ammunition Entry">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="Weapon"
            value={form.Weapon}
            onChange={(e) => setForm({ ...form, Weapon: e.target.value })}
          />
          <input
            className="input"
            placeholder="Ammo Type"
            value={form["Ammo Type"]}
            onChange={(e) => setForm({ ...form, "Ammo Type": e.target.value })}
          />
          <input
            className="input"
            placeholder="Magazine Size"
            type="number"
            value={form["Magazine Size"]}
            onChange={(e) =>
              setForm({ ...form, "Magazine Size": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Rounds Loaded"
            type="number"
            value={form["Rounds Loaded"]}
            onChange={(e) =>
              setForm({ ...form, "Rounds Loaded": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Spare Magazines"
            type="number"
            value={form["Spare Magazines"]}
            onChange={(e) =>
              setForm({ ...form, "Spare Magazines": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Loose Rounds"
            type="number"
            value={form["Loose Rounds"]}
            onChange={(e) =>
              setForm({ ...form, "Loose Rounds": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.Notes}
            onChange={(e) => setForm({ ...form, Notes: e.target.value })}
          />
        </div>
        <button className="btn mt-2" onClick={add}>
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
