import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
    LayoutDashboard,
    Users,
    User,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Rocket,
    Settings
} from "lucide-react";

interface SidebarProps {
    onCollapse: (collapsed: boolean) => void;
    onOpenSettings: () => void;
}

export function Sidebar({ onCollapse, onOpenSettings }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();

    const toggleCollapse = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        onCollapse(newState);
    };

    const navItems = [
        { id: "/", label: "Bridge", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "/campaigns", label: "Sector Ops", icon: <Users className="w-5 h-5" /> },
        { id: "/characters", label: "Personnel", icon: <User className="w-5 h-5" /> },
        { id: "settings", label: "Systems Management", icon: <Settings className="w-5 h-5" />, action: onOpenSettings },
    ];

    return (
        <aside
            className={`bg-side ${collapsed ? 'w-20' : 'w-72'} flex flex-col transition-all duration-500 overflow-hidden border-r border-border`}
        >
            {/* Sidebar Header */}
            <div className={`p-4 mb-4 ${collapsed ? 'justify-center' : ''}`}>
                <div className="mgt-header-bar mb-2">
                    {!collapsed && <span className="text-xs">System ID: DASH-01</span>}
                    <Rocket className="w-4 h-4" />
                </div>
                {!collapsed && (
                    <div className="px-2 py-4 animate-hud">
                        <div className="flex items-baseline gap-2">
                            <span className="font-black text-3xl tracking-tighter text-white">TRAVELLER</span>
                            <span className="text-[10px] font-bold text-primary px-1 border border-primary">v2.1</span>
                        </div>
                        <div className="h-1 bg-primary w-full mt-1 opacity-50" />
                    </div>
                )}
                <button
                    onClick={toggleCollapse}
                    className="absolute top-4 right-[-12px] z-50 p-1.5 bg-primary text-white shadow-lg hover:scale-110 transition-transform lg:flex hidden border border-white/20"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-grow px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.id;
                    const handleClick = () => {
                        if (item.action) {
                            item.action();
                        } else {
                            navigate(item.id);
                        }
                    };
                    return (
                        <button
                            key={item.id}
                            onClick={handleClick}
                            className={`w-full flex items-center transition-all duration-200 group relative ${collapsed ? 'justify-center py-4' : 'gap-4 px-4 py-3'} ${isActive
                                ? 'bg-primary text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            style={{ clipPath: collapsed ? '' : 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)' }}
                        >
                            {isActive && !collapsed && (
                                <div className="absolute left-0 top-0 w-1 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                            )}
                            <div className={`${isActive ? 'text-white' : 'group-hover:text-primary'} transition-colors shrink-0`}>
                                {item.icon}
                            </div>
                            {!collapsed && (
                                <span className="font-black text-xs uppercase tracking-[0.2em] animate-hud whitespace-nowrap overflow-hidden">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Profile & Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className={`flex items-center gap-4 p-2 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black uppercase text-xs">
                        {user?.email?.[0] || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="flex-grow min-w-0 animate-hud">
                            <p className="text-[10px] font-black text-white/90 truncate uppercase tracking-widest leading-none mb-1">{user?.displayName || 'User'}</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Active Link</span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => signOut()}
                    className={`w-full flex items-center text-slate-500 hover:text-accent transition-colors group mt-4 ${collapsed ? 'justify-center py-2' : 'gap-4 px-4 py-2'}`}
                >
                    <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform shrink-0" />
                    {!collapsed && (
                        <span className="font-black text-[10px] uppercase tracking-widest animate-hud whitespace-nowrap overflow-hidden">
                            Disconnect
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}
