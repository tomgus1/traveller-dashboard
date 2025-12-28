import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";
import AccountSettings from "../AccountSettings";
import { useAuth } from "../../hooks/useAuth";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);

    const { user, updateProfile, changePassword, deleteAccount } = useAuth();

    return (
        <div className="min-h-screen bg-transparent selection:bg-primary/20">
            {/* Mobile Header */}
            <div className="lg:hidden glass fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg shadow-lg flex items-center justify-center">
                        <span className="text-white text-xs font-black">T</span>
                    </div>
                    <span className="font-black tracking-tighter uppercase">TRAVELLER</span>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 hover:bg-hud-accent rounded-xl text-primary"
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Main Sidebar (Hidden on mobile by default) */}
            <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed inset-y-0 left-0 z-50 transition-transform duration-500
      `}>
                <Sidebar onCollapse={setCollapsed} onOpenSettings={() => setShowAccountSettings(true)} />
            </div>

            {/* Account Settings Modal */}
            {user && (
                <AccountSettings
                    isOpen={showAccountSettings}
                    onClose={() => setShowAccountSettings(false)}
                    user={user}
                    onUpdateProfile={async (data) => {
                        const result = await updateProfile(data);
                        if (!result.success && result.error) {
                            throw new Error(result.error);
                        }
                    }}
                    onChangePassword={async (data) => {
                        const result = await changePassword(data);
                        if (!result.success && result.error) {
                            throw new Error(result.error);
                        }
                    }}
                    onDeleteAccount={() => {
                        deleteAccount().then(() => {
                            setShowAccountSettings(false);
                        });
                    }}
                />
            )}

            {/* Mobile Menu Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className={`
        min-h-screen transition-all duration-500
        ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}
        pt-20 lg:pt-0
      `}>
                <div className="max-w-[1600px] mx-auto p-4 lg:p-8 animate-hud">
                    {children}
                </div>
            </main>
        </div>
    );
}
