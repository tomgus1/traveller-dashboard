export default function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: any;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="input"
      type="number"
      step="1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Cr"}
    />
  );
}
