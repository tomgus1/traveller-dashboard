import { type ReactNode } from "react";

interface MgTHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    rightContent?: ReactNode;
    className?: string;
}

export function MgTHeader({ title, subtitle, rightContent, className = "" }: MgTHeaderProps) {
    return (
        <div className={`mgt-header-bar -mx-6 -mt-6 mb-4 ${className}`}>
            {typeof title === 'string' ? (
                <span className="text-[10px] uppercase font-black tracking-widest">{title}</span>
            ) : (
                title
            )}

            {(subtitle || rightContent) && (
                <div className="flex items-center gap-2">
                    {subtitle && (
                        <span className="text-[8px] opacity-60 px-1 border border-white/20 uppercase tracking-wider">{subtitle}</span>
                    )}
                    {rightContent}
                </div>
            )}
        </div>
    );
}
