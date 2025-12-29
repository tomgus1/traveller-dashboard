import { useState } from "react";
import { BookOpen, Plus, Trash2, GraduationCap, CheckSquare, Square } from "lucide-react";
import { STANDARD_SKILLS } from "../../shared/constants/skills";

interface Skill {
    name: string;
    level: number;
    xp?: number;
}

interface SkillsCardProps {
    skills?: Skill[];
    onUpdate?: (newSkills: Skill[]) => void;
    readonly?: boolean;
}

export default function SkillsCard({ skills = [], onUpdate, readonly = false }: SkillsCardProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newSkillName, setNewSkillName] = useState("");
    const [newSkillLevel, setNewSkillLevel] = useState(1);

    // Filter skills for the "Trained" view (Level >= 1 OR non-standard skills)
    const trainedSkills = skills.filter(s => s.level > 0 || !STANDARD_SKILLS.includes(s.name));

    // Helper to check if a standard skill exists at exactly level 0
    const hasBasicTraining = (skillName: string) => {
        return skills.some(s => s.name === skillName && s.level === 0);
    };

    const toggleBasicTraining = (skillName: string) => {
        if (!onUpdate) return;

        const exists = hasBasicTraining(skillName);
        let updatedSkills = [...skills];

        if (exists) {
            updatedSkills = updatedSkills.filter(s => !(s.name === skillName && s.level === 0));
        } else {
            updatedSkills.push({ name: skillName, level: 0, xp: 0 });
        }
        onUpdate(updatedSkills);
    };

    const handleAddTrained = () => {
        if (!newSkillName.trim()) return;

        if (onUpdate) {
            onUpdate([...skills, { name: newSkillName, level: newSkillLevel, xp: 0 }]);
        }
        setNewSkillName("");
        setNewSkillLevel(1);
        setIsAdding(false);
    };

    const handleDelete = (originalIndex: number) => {
        if (onUpdate) {
            const updated = [...skills];
            updated.splice(originalIndex, 1);
            onUpdate(updated);
        }
    };

    // XP Logic
    // Cost to reach NEXT level = Current Level + 1
    // e.g. Lv 0 -> Lv 1 costs 1 XP
    // e.g. Lv 1 -> Lv 2 costs 2 XP
    const getXPCost = (currentLevel: number) => {
        return Math.max(1, currentLevel + 1);
    };

    const addXP = (originalIndex: number) => {
        if (!onUpdate) return;
        const skill = skills[originalIndex];
        const currentXP = skill.xp || 0;
        const targetXP = getXPCost(skill.level);

        let newXP = currentXP + 1;
        let newLevel = skill.level;

        // Level Up Check
        if (newXP >= targetXP) {
            newLevel += 1;
            newXP = 0; // Reset XP after level up
        }

        const updated = [...skills];
        updated[originalIndex] = { ...skill, level: newLevel, xp: newXP };
        onUpdate(updated);
    };

    const removeXP = (originalIndex: number) => {
        if (!onUpdate) return;
        const skill = skills[originalIndex];
        const currentXP = skill.xp || 0;
        if (currentXP > 0) {
            const updated = [...skills];
            updated[originalIndex] = { ...skill, xp: currentXP - 1 };
            onUpdate(updated);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* TRAINED SKILLS TABLE */}
            <div className="hud-glass p-0 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface-low/50">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
                            Skill <span className="text-primary">Registry</span>
                        </h3>
                    </div>

                    {!readonly && onUpdate && !isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-xs font-bold uppercase tracking-wider"
                        >
                            <Plus className="w-3 h-3" /> Add Skill
                        </button>
                    )}
                </div>

                {isAdding && (
                    <div className="bg-surface-low border-b border-dashed border-primary/50 p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest mb-1 block">Skill Designation</label>
                                <input
                                    type="text"
                                    value={newSkillName}
                                    onChange={(e) => setNewSkillName(e.target.value)}
                                    className="w-full bg-surface-high border border-border px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary placeholder:text-muted/50"
                                    placeholder="e.g. Pilot (Small Craft)"
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-end gap-4">
                                <div className="w-24">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-widest mb-1 block">Level</label>
                                    <input
                                        type="number"
                                        value={newSkillLevel}
                                        onChange={(e) => setNewSkillLevel(parseInt(e.target.value) || 0)}
                                        className="w-full bg-surface-high border border-border px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary"
                                        min="0"
                                    />
                                </div>
                                <div className="flex gap-2 pb-0.5">
                                    <button
                                        onClick={handleAddTrained}
                                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 text-xs font-bold uppercase"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 text-xs font-bold uppercase"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-low text-[10px] uppercase tracking-widest text-muted font-bold border-b border-border">
                            <th className="p-4 w-1/3">Skill</th>
                            <th className="p-4 w-20 text-center">Level</th>
                            <th className="p-4 text-center">Study Progress</th>
                            {!readonly && onUpdate && <th className="p-4 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {trainedSkills.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted text-xs italic">
                                    No specialist training recorded.
                                </td>
                            </tr>
                        ) : (
                            trainedSkills.map((skill, index) => {
                                // Find real index in main array
                                const realIndex = skills.indexOf(skill);
                                const currentXP = skill.xp || 0;
                                const targetXP = getXPCost(skill.level);

                                return (
                                    <tr key={`${skill.name}-${index}`} className="group hover:bg-surface-low/30 transition-colors">
                                        <td className="p-4">
                                            <span className="text-sm font-bold text-text-main">{skill.name}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-lg font-black ${skill.level > 0 ? 'text-primary' : 'text-muted'}`}>
                                                {skill.level}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-3">
                                                {!readonly && onUpdate && (
                                                    <button
                                                        onClick={() => removeXP(realIndex)}
                                                        disabled={currentXP === 0}
                                                        className="w-6 h-6 flex items-center justify-center border border-border text-muted hover:border-primary/50 hover:text-text-main disabled:opacity-30 transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                )}

                                                <div className="flex gap-1">
                                                    {Array.from({ length: targetXP }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-3 h-3 border ${i < currentXP
                                                                ? "bg-primary border-primary"
                                                                : "bg-transparent border-white/20"
                                                                }`}
                                                        />
                                                    ))}
                                                </div>

                                                {!readonly && onUpdate && (
                                                    <button
                                                        onClick={() => addXP(realIndex)}
                                                        className="w-6 h-6 flex items-center justify-center border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-center mt-1">
                                                <span className="text-[9px] uppercase text-muted tracking-wider">
                                                    {currentXP} / {targetXP} XP
                                                </span>
                                            </div>
                                        </td>
                                        {!readonly && onUpdate && (
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(realIndex)}
                                                    className="text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* BASIC TRAINING */}
            <div className="hud-glass p-6">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-5 h-5 text-muted" />
                    <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted">
                        Unskilled / Basic Training (Level 0)
                    </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-2">
                    {STANDARD_SKILLS.map((skill) => {
                        const isChecked = hasBasicTraining(skill);
                        const isTrained = skills.some(s => s.name === skill && s.level > 0);

                        // Determine styles to avoid nested ternaries
                        let buttonClass = "flex items-center gap-2 px-2 py-1 text-left transition-colors ";
                        if (isTrained) buttonClass += "opacity-30 cursor-not-allowed";
                        else if (isChecked) buttonClass += "text-text-main";
                        else buttonClass += "text-muted hover:text-text-main";

                        return (
                            <button
                                key={skill}
                                onClick={() => !readonly && !isTrained && toggleBasicTraining(skill)}
                                disabled={readonly || !onUpdate || isTrained}
                                className={buttonClass}
                            >
                                {isTrained || isChecked ? (
                                    <CheckSquare className="w-3 h-3 text-primary shrink-0" />
                                ) : (
                                    <Square className="w-3 h-3 text-muted/30 shrink-0" />
                                )}
                                <span className={`text-[10px] font-bold uppercase ${isChecked || isTrained ? "text-primary" : ""}`}>
                                    {skill} {isTrained && `(Lv ${skills.find(s => s.name === skill)?.level})`}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
