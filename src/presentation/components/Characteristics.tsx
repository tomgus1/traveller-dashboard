import { Activity } from "lucide-react";

interface CharacteristicsProps {
    stats?: {
        STR: number;
        DEX: number;
        END: number;
        INT: number;
        EDU: number;
        SOC: number;
    };
}

const STAT_LABELS: Record<string, string> = {
    STR: "Strength",
    DEX: "Dexterity",
    END: "Endurance",
    INT: "Intelligence",
    EDU: "Education",
    SOC: "Social Standing",
};

const getMod = (val: number) => {
    if (val <= 0) return -3;
    if (val <= 2) return -2;
    if (val <= 5) return -1;
    if (val <= 8) return 0;
    if (val <= 11) return 1;
    if (val <= 14) return 2;
    return 3;
};

export default function Characteristics({ stats }: CharacteristicsProps) {
    // Provide default mock stats if none exist
    const displayStats = stats || {
        STR: 7,
        DEX: 7,
        END: 7,
        INT: 7,
        EDU: 7,
        SOC: 7,
    };

    return (
        <div className="hud-glass p-6">
            <div className="flex items-center gap-3 mb-8">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
                    Biometric <span className="text-primary">Profile</span>
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {Object.entries(displayStats).map(([key, value]) => {
                    const mod = getMod(value);
                    const percentage = (value / 15) * 100;

                    return (
                        <div key={key} className="group">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">
                                        {STAT_LABELS[key] || key}
                                    </span>
                                    <div className="text-xl font-black text-main">
                                        {value.toString().padStart(2, '0')}
                                        <span className="ml-2 text-[10px] text-primary/60 font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                            MOD {mod >= 0 ? '+' : ''}{mod}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-muted uppercase tracking-tighter">
                                    Level {value} / 15
                                </div>
                            </div>

                            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                {/* Progress Bar */}
                                <div
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] transition-all duration-1000 ease-out relative"
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                >
                                    {/* Subtle Grain Overlay on Bar */}
                                    <div className="absolute inset-0 opacity-20 bg-grain pointer-events-none" />
                                </div>

                                {/* Marker Lines */}
                                <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-[1px] h-full bg-white" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Core Criticality: Stable</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Operative Status: Prime</span>
                    </div>
                </div>
                <span className="text-[8px] font-mono text-muted uppercase">Data Hash: 0X7F2A9B...</span>
            </div>
        </div>
    );
}
