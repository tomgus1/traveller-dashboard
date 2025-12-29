import { useState } from "react";
import { Activity, Edit2, Save, X, Plus, Minus } from "lucide-react";

interface CharacteristicValue {
    value: number;
    xp: number;
}

interface CharacteristicsData {
    STR: CharacteristicValue;
    DEX: CharacteristicValue;
    END: CharacteristicValue;
    INT: CharacteristicValue;
    EDU: CharacteristicValue;
    SOC: CharacteristicValue;
}

interface CharacteristicsProps {
    stats?: CharacteristicsData;
    onUpdate?: (newStats: CharacteristicsData) => void;
    readonly?: boolean;
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

// Helper component for individual characteristic rows
interface CharacteristicRowProps {
    statKey: string;
    label: string;
    value: CharacteristicValue;
    isEditing: boolean;
    readonly: boolean;
    onValueChange: (key: string, value: string) => void;
    onXPChange?: (key: string, amount: number) => void;
}

const CharacteristicRow = ({
    statKey,
    label,
    value,
    isEditing,
    readonly,
    onValueChange,
    onXPChange
}: CharacteristicRowProps) => {
    const mod = getMod(value.value);
    const costToLevel = value.value + 1;
    const xpPercentage = (value.xp / costToLevel) * 100;

    const getModColor = (mod: number) => {
        if (mod > 0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        if (mod < 0) return 'text-red-400 bg-red-500/10 border-red-500/30';
        return 'text-muted bg-white/5 border-white/10';
    };

    return (
        <div className="group">
            {/* Header Row */}
            <div className="flex justify-between items-end mb-2">
                <div className="flex-grow">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">
                        {label}
                    </span>
                    <div className="flex items-center gap-4">
                        {isEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    value={value.value}
                                    onChange={(e) => onValueChange(statKey, e.target.value)}
                                    className="w-16 bg-surface-low border border-primary text-xl font-black text-primary p-1 text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                    min="0"
                                    max="30"
                                />
                            </div>
                        ) : (
                            <div className="text-xl font-black text-text-main">
                                {value.value.toString().padStart(2, '0')}
                            </div>
                        )}

                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 border ${getModColor(mod)}`}>
                            MOD {mod >= 0 ? '+' : ''}{mod}
                        </span>
                    </div>
                </div>

                {/* XP Controls */}
                {!isEditing && !readonly && onXPChange && (
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onXPChange(statKey, -1)}
                                className="w-4 h-4 flex items-center justify-center border border-border bg-surface-low text-muted hover:text-primary hover:border-primary transition-colors"
                                disabled={value.xp <= 0}
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-mono w-8 text-center text-primary">
                                {value.xp} / {costToLevel}
                            </span>
                            <button
                                onClick={() => onXPChange(statKey, 1)}
                                className="w-4 h-4 flex items-center justify-center border border-border bg-surface-low text-muted hover:text-primary hover:border-primary transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="text-[8px] uppercase tracking-wider text-muted/50">
                            Training XP
                        </div>
                    </div>
                )}
            </div>

            {/* Stat Bar */}
            <div className="h-1 bg-surface-low overflow-hidden border-b border-border relative mb-1">
                <div
                    className="h-full bg-primary opacity-30"
                    style={{ width: `${Math.min((value.value / 15) * 100, 100)}%` }}
                />
            </div>

            {/* XP Bar */}
            {!isEditing && (
                <div className="h-1 w-full bg-surface-low relative">
                    <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${Math.min(xpPercentage, 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default function Characteristics({ stats, onUpdate, readonly = false }: CharacteristicsProps) {
    // Default mock stats if none exist
    const defaultVal: CharacteristicValue = { value: 0, xp: 0 };
    const displayStats = stats || {
        STR: { ...defaultVal },
        DEX: { ...defaultVal },
        END: { ...defaultVal },
        INT: { ...defaultVal },
        EDU: { ...defaultVal },
        SOC: { ...defaultVal },
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState<CharacteristicsData>(displayStats);

    const handleSave = () => {
        if (onUpdate) {
            onUpdate(editValues);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValues(displayStats);
    };

    const handleEditClick = () => {
        setEditValues(JSON.parse(JSON.stringify(displayStats))); // Deep copy
        setIsEditing(true);
    };

    const handleChangeValue = (key: string, newValueStr: string) => {
        const numValue = parseInt(newValueStr) || 0;
        const clampedValue = Math.max(0, Math.min(30, numValue));

        setEditValues(prev => ({
            ...prev,
            [key]: { ...prev[key as keyof CharacteristicsData], value: clampedValue }
        }));
    };

    const updateXP = (key: string, amount: number) => {
        if (readonly || !onUpdate) return;

        const currentStat = displayStats[key as keyof typeof displayStats];
        const newXP = Math.max(0, currentStat.xp + amount);
        const costToLevel = currentStat.value + 1;

        let newValue = currentStat.value;
        let finalXP = newXP;

        if (finalXP >= costToLevel) {
            finalXP -= costToLevel;
            newValue += 1;
        }

        const newStats = {
            ...displayStats,
            [key]: { value: newValue, xp: finalXP }
        };
        onUpdate(newStats);
    };

    return (
        <div className="hud-glass p-6 relative">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
                        Biometric <span className="text-primary">Profile</span>
                    </h3>
                </div>

                {!readonly && onUpdate && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 transition-colors text-xs font-bold uppercase tracking-wider"
                                >
                                    <Save className="w-3 h-3" /> Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors text-xs font-bold uppercase tracking-wider"
                                >
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleEditClick}
                                className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                <Edit2 className="w-3 h-3" /> Edit Profile
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {Object.entries(isEditing ? editValues : displayStats).map(([key, stat]) => (
                    <CharacteristicRow
                        key={key}
                        statKey={key}
                        label={STAT_LABELS[key] || key}
                        value={stat}
                        isEditing={isEditing}
                        readonly={readonly}
                        onValueChange={handleChangeValue}
                        onXPChange={onUpdate ? updateXP : undefined}
                    />
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${isEditing ? 'bg-accent animate-ping' : 'bg-primary animate-pulse'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                            {isEditing ? 'BIO-METRICS: UNLOCKED' : 'Core Criticality: Stable'}
                        </span>
                    </div>
                </div>
                <span className="text-[8px] font-mono text-muted uppercase">Data Hash: 0X7F2A9B...</span>
            </div>
        </div>
    );
}
