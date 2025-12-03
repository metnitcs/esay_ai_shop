
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import ImageAnalyzer from './components/ImageAnalyzer';
import TikTokCreator from './components/TikTokCreator';
import Gallery from './components/Gallery';
import { GeneratedAsset } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tiktok-creator');
  const [credits, setCredits] = useState(100); // Starting credits
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);

  const handleDeductCredits = (amount: number) => {
    setCredits(prev => Math.max(0, prev - amount));
  };

  const handleAddAsset = (asset: GeneratedAsset) => {
    setAssets(prev => [asset, ...prev]);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tiktok-creator':
        return (
           <TikTokCreator
              credits={credits}
              deductCredits={handleDeductCredits}
              addAsset={handleAddAsset}
           />
        );
      case 'create-image':
        return (
          <ImageGenerator 
            credits={credits} 
            deductCredits={handleDeductCredits}
            addAsset={handleAddAsset}
          />
        );
      case 'create-video':
        return (
          <VideoGenerator 
            credits={credits} 
            deductCredits={handleDeductCredits}
            addAsset={handleAddAsset}
          />
        );
      case 'analyze':
        return (
          <ImageAnalyzer 
             credits={credits}
             deductCredits={handleDeductCredits}
          />
        );
      case 'gallery':
        return (
          <Gallery 
            assets={assets} 
            deleteAsset={handleDeleteAsset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 selection:text-white">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        credits={credits}
      />
      
      <main className="flex-1 overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background">
        <div className="min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
