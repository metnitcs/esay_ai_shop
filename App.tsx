import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import ImageAnalyzer from './components/ImageAnalyzer';
import TikTokCreator from './components/TikTokCreator';
import Gallery from './components/Gallery';
import AuthPage from './components/AuthPage';
import AdminDashboard from './components/AdminDashboard';
import { GeneratedAsset, UserProfile } from './types';
import { Loader2, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tiktok-creator');
  const [credits, setCredits] = useState(0);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
           console.error("Session init error:", error);
           // Don't block app, just show auth page
           setLoading(false);
           return;
        }
        
        setSession(data.session);
        if (data.session) {
          await fetchUserData(data.session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Critical Supabase connection error:", err);
        setConnectionError(true);
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
         fetchUserData(session.user.id);
      } else {
        setUserProfile(null);
        setAssets([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserProfile(profile);
        setCredits(profile.credits);
      }

      const { data: userAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userAssets) {
        const mappedAssets: GeneratedAsset[] = userAssets.map((a: any) => ({
          ...a,
          createdAt: new Date(a.created_at).getTime(),
          // Ensure prompts and urls map correctly if column names differ
        }));
        setAssets(mappedAssets);
      }
    } catch (e) {
      console.error("Error fetching user data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeductCredits = async (amount: number) => {
    if (!session?.user) return;
    
    const newAmount = Math.max(0, credits - amount);
    setCredits(newAmount); // Optimistic

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newAmount })
        .eq('id', session.user.id);
      
      if (error) throw error;
    } catch (e) {
      console.error("Failed to update credits", e);
      if (userProfile) setCredits(userProfile.credits); // Revert
    }
  };

  const handleAddAsset = async (asset: GeneratedAsset) => {
    if (!session?.user) return;

    setAssets(prev => [asset, ...prev]); // Optimistic

    try {
      const dbAsset = {
        user_id: session.user.id,
        type: asset.type,
        url: asset.url,
        prompt: asset.prompt,
        aspect_ratio: asset.aspectRatio,
        created_at: new Date(asset.createdAt).toISOString()
      };

      const { error } = await supabase
        .from('assets')
        .insert([dbAsset]);

      if (error) throw error;
    } catch (e) {
      console.error("Failed to save asset", e);
    }
  };

  const handleDeleteAsset = async (id: string) => {
     setAssets(prev => prev.filter(a => a.id !== id)); // Optimistic

     try {
       await supabase.from('assets').delete().eq('id', id);
     } catch (e) {
       console.error("Failed to delete", e);
     }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Display helpful message if keys are missing (detected via placeholder domain usually, or just error state)
  if (connectionError) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-zinc-400 max-w-md">
            Could not connect to Supabase. Please ensure your <code>SUPABASE_URL</code> and <code>SUPABASE_KEY</code> environment variables are set correctly.
          </p>
       </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

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
      case 'admin':
        return userProfile?.role === 'admin' ? <AdminDashboard /> : <div className="p-8 text-white">Access Denied</div>;
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
        userEmail={session.user.email}
        userRole={userProfile?.role}
        onLogout={handleLogout}
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