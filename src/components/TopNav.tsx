import React from 'react';
import { Building2, MessageSquare, ShieldAlert, Store, Moon, Sun } from 'lucide-react';
import { TabType } from '../types';

interface TopNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  toggleChat: () => void;
  isChatOpen: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function TopNav({ activeTab, setActiveTab, toggleChat, isChatOpen, isDarkMode, toggleTheme }: TopNavProps) {
  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-border bg-surface shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <div className="w-5 h-5 bg-blue-500 rounded-md" />
          </div>
          <span className="font-bold text-2xl tracking-wide">TABLEPULSE</span>
        </div>
        
        <nav className="flex items-center gap-2">
          <TabButton
            active={activeTab === 'store'}
            onClick={() => setActiveTab('store')}
            icon={<Store className="w-5 h-5" />}
            label="Store"
          />
          <TabButton
            active={activeTab === 'hq'}
            onClick={() => setActiveTab('hq')}
            icon={<Building2 className="w-5 h-5" />}
            label="HQ"
          />
          <TabButton
            active={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
            icon={<ShieldAlert className="w-5 h-5" />}
            label="Admin"
          />
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleChat}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-lg transition-colors ${
            isChatOpen ? 'bg-blue-500/20 text-blue-500 font-bold' : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary font-semibold'
          }`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-lg">AI 비서</span>
        </button>
      </div>
    </header>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-bold transition-colors ${
        active 
          ? 'bg-surface-hover text-text-primary shadow-sm' 
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
