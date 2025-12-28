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
        { id: "/", label: "Mission Control", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "/campaigns", label: "Campaigns", icon: <Users className="w-5 h-5" /> },
        { id: "/characters", label: "Characters", icon: <User className="w-5 h-5" /> },
        { id: "settings", label: "Diagnostics", icon: <Settings className="w-5 h-5" />, action: onOpenSettings },
    ];

    return (
        <aside
            className={`sidebar-hud ${collapsed ? 'w-20' : 'w-72'} flex flex-col transition-all duration-500 overflow-hidden`}
        >
            {/* Sidebar Header */}
            <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <div className="flex items-center gap-3 animate-hud">
                        <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary-glow">
                            <Rocket className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tighter uppercase whitespace-nowrap">
                            TRAVELLER
                        </span>
                    </div>
                )}
                <button
                    onClick={toggleCollapse}
                    className="p-2 hover:bg-hud-accent rounded-xl transition-colors text-muted hover:text-primary shrink-0"
                >
                    {collapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-grow px-4 mt-8 space-y-2">
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
                            className={`w-full flex items-center rounded-2xl transition-all duration-300 group ${collapsed ? 'justify-center p-3.5' : 'gap-4 px-4 py-3.5'} ${isActive
                                ? 'bg-primary text-white shadow-lg shadow-primary-glow scale-[1.02]'
                                : 'text-muted hover:text-text-main hover:bg-hud-accent'
                                }`}
                        >
                            <div className={`${isActive ? 'text-white' : 'group-hover:text-primary'} transition-colors shrink-0`}>
                                {item.icon}
                            </div>
                            {!collapsed && (
                                <span className="font-bold text-sm uppercase tracking-wider animate-hud whitespace-nowrap overflow-hidden">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Profile & Footer */}
            <div className="p-4 border-t border-border-color">
                <div className={`flex items-center gap-4 p-3 rounded-2xl ${collapsed ? 'justify-center' : 'bg-hud-accent'}`}>
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black uppercase shadow-inner">
                        {user?.email?.[0] || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="flex-grow min-w-0 animate-hud">
                            <p className="text-sm font-bold truncate tracking-tight">{user?.displayName || 'User'}</p>
                            <p className="text-[10px] text-muted truncate uppercase tracking-widest font-black">Logged In</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => signOut()}
                    className={`w-full flex items-center text-muted hover:text-red-500 transition-colors rounded-2xl group ${collapsed ? 'justify-center p-4 mt-4' : 'gap-4 px-4 py-4 mt-6'}`}
                >
                    <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
                    {!collapsed && (
                        <span className="font-bold text-sm uppercase tracking-wider animate-hud whitespace-nowrap overflow-hidden">
                            Sign Out
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}
