
import React from 'react';
import { LayoutDashboard, Image as ImageIcon, Video, Layers, Settings, Zap, ScanEye, Clapperboard } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  credits: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, credits }) => {
  const menuItems = [
    { id: 'tiktok-creator', label: 'TikTok Creator', icon: Clapperboard },
    { id: 'create-image', label: 'Image Gen', icon: ImageIcon },
    { id: 'create-video', label: 'Video Gen', icon: Video },
    { id: 'analyze', label: 'Image Analysis', icon: ScanEye },
    { id: 'gallery', label: 'My Assets', icon: Layers },
  ];

  return (
    <div className="w-64 bg-surface border-r border-white/5 flex flex-col h-full flex-shrink-0">
      <div className="p-6 flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Ag0<span className="text-primary">.ai</span></span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-white'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-gradient-to-r from-surfaceHighlight to-surface p-4 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Credits</span>
            <span className="text-xs font-bold text-accent">{credits} Available</span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-1.5 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full" 
              style={{ width: `${Math.min((credits / 100) * 100, 100)}%` }}
            ></div>
          </div>
          <button className="w-full text-xs py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
            Top Up
          </button>
        </div>
        
        <div className="mt-4 flex items-center space-x-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Creator</p>
            <p className="text-xs text-zinc-500">Pro Plan</p>
          </div>
          <Settings className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
