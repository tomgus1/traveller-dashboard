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
      className="flex flex-wrap p-1.5 gap-2 hud-glass w-fit mb-8 shadow-inner border border-border"
      role="tablist"
      aria-label="Campaign navigation"
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            onKeyDown={handleKeyDown}
            className={`relative px-6 py-2.5 transition-all duration-300 group ${isActive
              ? 'bg-primary text-white shadow-lg shadow-primary-glow scale-[1.02]'
              : 'text-muted hover:text-text-main hover:bg-surface-low'
              }`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${t.id}`}
            id={`tab-${t.id}`}
            type="button"
            tabIndex={isActive ? 0 : -1}
          >
            <span className="relative z-10 font-black text-[11px] uppercase tracking-[0.15em]">
              {t.label}
            </span>

            {/* Active Indicator Decoration */}
            {isActive && (
              <div className="absolute inset-0 border-2 border-white/30" />
            )}

            {!isActive && (
              <div className="absolute bottom-0 left-1.5 right-1.5 h-[2px] bg-primary/0 group-hover:bg-primary transition-all" />
            )}
          </button>
        );
      })}
    </div>
  );
}
