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
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tiktok-creator');
  const [credits, setCredits] = useState(0);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else {
        setUserProfile(null);
        setAssets([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch Profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If profile doesn't exist (e.g. first login after schema creation), create it?
      // Better to handle via trigger, but for robustness on client:
      if (!profile) {
         // This assumes public.profiles has RLS that allows user to insert their own row or we rely on trigger
      }

      if (profile) {
        setUserProfile(profile);
        setCredits(profile.credits);
      }

      // Fetch Assets
      const { data: userAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userAssets) {
        // Map snake_case from DB to camelCase if necessary, but here we used matching names mostly
        // except DB usually returns snake_case for keys. 
        // NOTE: In types.ts we defined camelCase. Supabase JS usually returns columns as is.
        // If you created table with "created_at", it returns "created_at".
        // We need to map it to match GeneratedAsset interface which uses createdAt.
        const mappedAssets: GeneratedAsset[] = userAssets.map((a: any) => ({
          ...a,
          createdAt: new Date(a.created_at).getTime(), // Convert string timestamp to number
          // prompt, url, type, etc map directly if names match
        }));
        setAssets(mappedAssets);
      }

    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeductCredits = async (amount: number) => {
    if (!session?.user) return;
    
    // Optimistic update
    const newAmount = Math.max(0, credits - amount);
    setCredits(newAmount);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newAmount })
        .eq('id', session.user.id);
      
      if (error) throw error;
    } catch (e) {
      console.error("Failed to update credits", e);
      // Revert on error
      if (userProfile) setCredits(userProfile.credits);
    }
  };

  const handleAddAsset = async (asset: GeneratedAsset) => {
    if (!session?.user) return;

    // Optimistic update
    setAssets(prev => [asset, ...prev]);

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
     // Optimistic
     setAssets(prev => prev.filter(a => a.id !== id));

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
        return userProfile?.role === 'admin' ? <AdminDashboard /> : <div>Access Denied</div>;
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