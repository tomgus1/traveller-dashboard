import { type ReactNode } from "react";

interface MgTCardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export function MgTCard({ children, className = "", onClick, style }: MgTCardProps) {
    return (
        <div
            className={`card-mgt hud-frame ${className}`}
            onClick={onClick}
            style={style}
        >
            {children}
        </div>
    );
}
