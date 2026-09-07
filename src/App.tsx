import { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { ChatbotSidebar } from './components/ChatbotSidebar';
import { StoreTab } from './components/tabs/StoreTab';
import { HQTab } from './components/tabs/HQTab';
import { AdminTab } from './components/tabs/AdminTab';
import { TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('store');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-text-primary font-sans overflow-hidden selection:bg-blue-500/30 transition-colors duration-300">
      <TopNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        toggleChat={() => setIsChatOpen(!isChatOpen)} 
        isChatOpen={isChatOpen}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-6 md:p-8 min-w-0 transition-all">
          {activeTab === 'store' && <StoreTab />}
          {activeTab === 'hq' && <HQTab />}
          {activeTab === 'admin' && <AdminTab />}
        </main>
        
        <ChatbotSidebar isOpen={isChatOpen} close={() => setIsChatOpen(false)} />
      </div>
    </div>
  );
}
