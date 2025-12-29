import { useNavigate } from "react-router-dom";
import { Edit, Trash2, ChevronRight, User } from "lucide-react";
import type { CampaignWithMeta } from "../../core/entities";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import { MgTCard } from "./MgTCard";
import { MgTHeader } from "./MgTHeader";

interface CharacterListProps {
    campaign: CampaignWithMeta;
    onViewCampaign: (campaignId: string) => void;
    onDeleteCharacter: (
        characterId: string,
        characterName: string,
        campaignId: string
    ) => void;
}

export function CharacterList({
    campaign,
    onViewCampaign,
    onDeleteCharacter,
}: CharacterListProps) {
    const { characters } = useCampaignCharacters(campaign.id);
    const navigate = useNavigate();

    return (
        <MgTCard className="w-full">
            <MgTHeader
                title={campaign.name}
                subtitle="MANIFEST"
                rightContent={<span className="text-[8px] font-black">{characters.length} ACTIVE</span>}
            />

            {characters.length === 0 ? (
                <div className="py-12 px-4 border border-dashed border-border bg-surface-low rounded flex flex-col items-center justify-center text-center">
                    <User className="w-8 h-8 text-muted mb-2 opacity-50" />
                    <p className="text-muted text-[10px] font-black uppercase tracking-widest">
                        No active personnel records
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {characters.map((character) => (
                        <div
                            key={character.id}
                            className="flex items-center justify-between p-3 border border-border bg-surface-low hover:bg-surface-mid transition-colors group"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 99% 100%, 0% 100%)' }}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-1 h-8 bg-primary/20 group-hover:bg-primary transition-colors" />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-main">
                                        {character.characterName || character.displayName}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[8px] font-bold text-muted uppercase tracking-wider">
                                            {character.playerName}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => navigate(`/character/${character.id}`)}
                                    className="p-1.5 text-muted hover:text-primary transition-colors"
                                    title="Edit Personnel File"
                                >
                                    <Edit className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() =>
                                        onDeleteCharacter(
                                            character.id,
                                            character.characterName || "Unknown",
                                            campaign.id
                                        )
                                    }
                                    className="p-1.5 text-muted hover:text-accent transition-colors"
                                    title="Discharge Personnel"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-border flex justify-end">
                <button
                    onClick={() => onViewCampaign(campaign.id)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-light transition-colors"
                >
                    <span>Access Logs</span>
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </MgTCard>
    );
}
