import { useState } from "react";
import FormField from "./FormField";
import { todayISO } from "../../shared/utils/number";
import { validateTransaction } from "../../shared/utils/finance";
import { useForm } from "../hooks/useForm";
import { Plus } from "lucide-react";
import type { FinanceRow } from "../../types";

interface TransactionFormProps {
  title: string;
  fundName: string;
  onSubmit: (transaction: FinanceRow) => void;
}

type TransactionFormData = Record<string, string> & {
  Date: string;
  Description: string;
  Category: string;
  Subcategory: string;
  Amount: string;
  Notes: string;
};

export default function TransactionForm({
  title,
  fundName,
  onSubmit,
}: TransactionFormProps) {
  const initialForm: TransactionFormData = {
    Date: todayISO(),
    Description: "",
    Category: "Expense",
    Subcategory: "",
    Amount: "",
    Notes: "",
  };

  const { form, createInputHandler, resetForm } = useForm(initialForm);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    setErrors([]);

    const newTransaction: FinanceRow = {
      Date: form.Date as string,
      Description: form.Description as string,
      Category: form.Category as "Income" | "Expense" | "Transfer",
      Subcategory: form.Subcategory as string,
      "Amount (Cr)": Number(form.Amount),
      "Paid By": fundName,
      "Paid From (Fund)": fundName,
      Notes: form.Notes as string,
    };

    const validation = validateTransaction(newTransaction);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit(newTransaction);
    resetForm(["Date", "Category"]);
  };

  return (
    <div className="hud-glass p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
          Log <span className="text-primary">{title}</span> Transaction
        </h3>
        {errors.length > 0 && (
          <span className="text-[10px] font-bold text-red-500 uppercase animate-pulse">
            Validation Error
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <FormField
          type="date"
          value={form.Date}
          onChange={createInputHandler("Date")}
        />
        <div className="lg:col-span-2">
          <FormField
            placeholder="Description / Reason"
            value={form.Description}
            onChange={createInputHandler("Description")}
          />
        </div>
        <FormField
          type="select"
          value={form.Category}
          onChange={createInputHandler("Category")}
        >
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
          <option value="Transfer">Transfer</option>
        </FormField>
        <FormField
          type="number"
          placeholder="Amount (Cr)"
          value={form.Amount}
          onChange={createInputHandler("Amount")}
        />
        <button
          onClick={handleSubmit}
          className="btn-hud py-2.5 flex items-center justify-center gap-2 group"
          type="button"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Execute</span>
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent ">
          <ul className="text-[10px] space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-1 bg-accent" />
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
