import { useState } from "react";
import SectionCard from "./SectionCard";
import FormField from "./FormField";
import { Button } from "./Button";
import { todayISO } from "../../shared/utils/number";
import { validateTransaction } from "../../shared/utils/finance";
import { useForm } from "../hooks/useForm";
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

    // Reset form (keeping date and category)
    resetForm(["Date", "Category"]);
  };

  return (
    <SectionCard title={`Add ${title} Transaction`}>
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <ul className="list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <FormField
          type="date"
          value={form.Date}
          onChange={createInputHandler("Date")}
        />
        <FormField
          placeholder="Description"
          value={form.Description}
          onChange={createInputHandler("Description")}
        />
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
          placeholder="Subcategory"
          value={form.Subcategory}
          onChange={createInputHandler("Subcategory")}
        />
        <FormField
          type="number"
          placeholder="Amount (Cr)"
          value={form.Amount}
          onChange={createInputHandler("Amount")}
        />
        <FormField
          placeholder="Notes"
          value={form.Notes}
          onChange={createInputHandler("Notes")}
        />
      </div>
      <Button
        className="mt-2"
        onClick={handleSubmit}
        type="button"
        data-testid="add-transaction-button"
        aria-label="Add new transaction to the financial record"
      >
        Add Transaction
      </Button>
    </SectionCard>
  );
}
