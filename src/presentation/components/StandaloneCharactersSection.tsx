import { useNavigate } from "react-router-dom";
import { Edit, UserPlus, Trash2, User } from "lucide-react";
import { useStandaloneCharacters } from "../hooks/useStandaloneCharacters";
import type { CampaignWithMeta } from "../../core/entities";
import { useAuth } from "../hooks/useAuth";
import { MgTCard } from "./MgTCard";

interface StandaloneCharactersSectionProps {
    campaigns: CampaignWithMeta[];
    onShowAssignment: () => void;
}

export function StandaloneCharactersSection({
    campaigns,
    onShowAssignment,
}: StandaloneCharactersSectionProps) {
    const { characters, deleteCharacter } = useStandaloneCharacters();
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleDelete = async (id: string, name: string) => {
        if (!user) return;
        if (
            window.confirm(
                `Are you sure you want to delete personnel record: ${name}?`
            )
        ) {
            await deleteCharacter(id, user.id);
        }
    };

    if (characters.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="mgt-header-bar mb-6">
                <h3 className="text-xs font-black tracking-[0.3em]">Unassigned Personnel</h3>
                <span className="text-[8px] opacity-50 px-2 py-0.5 border border-white/20">RESERVE // POOL</span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => (
                    <MgTCard key={character.id} className="group hover:border-accent/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-surface-low border border-border flex items-center justify-center">
                                    <User className="w-4 h-4 text-muted" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-main">
                                        {character.characterName || "Waitlist Entry"}
                                    </h4>
                                    <span className="text-[8px] text-accent font-bold uppercase tracking-wider">
                                        UNASSIGNED
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mt-4">
                            <button
                                onClick={() => navigate(`/ character / ${character.id} `)}
                                className="w-full flex items-center justify-center gap-2 p-2 border border-border bg-surface-low hover:bg-surface-mid text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                                <Edit className="w-3 h-3" />
                                <span>Edit Profile</span>
                            </button>

                            <button
                                onClick={onShowAssignment}
                                className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-border hover:border-primary hover:text-primary text-[10px] font-black uppercase tracking-wider transition-all"
                                disabled={campaigns.length === 0}
                            >
                                <UserPlus className="w-3 h-3" />
                                <span>Assign to Campaign</span>
                            </button>

                            <button
                                onClick={() =>
                                    handleDelete(
                                        character.id,
                                        character.characterName || "Unnamed"
                                    )
                                }
                                className="w-full flex items-center justify-center gap-2 p-2 text-accent hover:bg-accent/10 text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete Record</span>
                            </button>
                        </div>
                    </MgTCard>
                ))}
            </div>
        </div>
    );
}
