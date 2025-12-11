import React from 'react';
import { LayoutDashboard, Image as ImageIcon, Video, Layers, Settings, Zap, ScanEye, Clapperboard, LogOut, Shield } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  credits: number;
  userEmail?: string;
  userRole?: string;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, credits, userEmail, userRole, onLogout }) => {
  const menuItems = [
    { id: 'tiktok-creator', label: 'TikTok Creator', icon: Clapperboard },
    { id: 'comic-creator', label: 'Comic Creator', icon: Layers },
    { id: 'create-image', label: 'Image Gen', icon: ImageIcon },
    { id: 'create-video', label: 'Video Gen', icon: Video },
    { id: 'analyze', label: 'Image Analysis', icon: ScanEye },
    { id: 'gallery', label: 'My Assets', icon: Layers },
  ];

  if (userRole === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Dashboard', icon: Shield });
  }

  return (
    <div className="w-64 bg-glass-gradient border-r border-white/5 flex flex-col h-full flex-shrink-0 relative overflow-hidden backdrop-blur-xl">
      <div className="p-6 flex items-center space-x-3 relative z-10">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap className="text-white w-6 h-6 fill-current" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white font-sans">Ag0<span className="text-primary">.ai</span></span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 relative z-10">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'text-white shadow-glow border border-primary/30'
                : 'text-textMuted hover:text-white hover:bg-white/5'
                }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-50" />
              )}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
              )}

              <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'text-primary scale-110' : 'group-hover:text-primary group-hover:scale-110'}`} />
              <span className={`font-medium relative z-10 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>

              {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(34,211,238,0.8)]" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 relative z-10">
        <div className="bg-surface/50 p-4 rounded-xl border border-white/5 mb-4 backdrop-blur-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Credits</span>
            <span className="text-sm font-bold text-white">{credits} Available</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-500 shadow-glow"
              style={{ width: `${Math.min((credits / 100) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-surfaceHighlight to-surface flex items-center justify-center text-xs font-bold text-white uppercase border border-white/10">
            {userEmail ? userEmail.substring(0, 2) : 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userEmail || 'User'}</p>
            <p className="text-xs text-textMuted capitalize">{userRole || 'Free Plan'}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-textMuted hover:text-red-400 transition-all duration-200 hover:scale-110"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;