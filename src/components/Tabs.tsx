export function TabsBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === active);
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case "ArrowRight":
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const newTabId = tabs[newIndex].id;
    onChange(newTabId);
  };

  return (
    <div
      className="flex flex-wrap gap-2 border-b mb-2"
      role="tablist"
      aria-label="Main navigation tabs"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`px-3 py-2 rounded-t-xl transition-colors cursor-pointer focus-ring
            ${
              active === t.id
                ? "bg-zinc-100 dark:bg-zinc-900 border border-b-0"
                : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          onClick={() => onChange(t.id)}
          onKeyDown={handleKeyDown}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`tabpanel-${t.id}`}
          id={`tab-${t.id}`}
          type="button"
          tabIndex={active === t.id ? 0 : -1}
          data-testid={`tab-${t.id}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
