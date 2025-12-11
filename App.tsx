import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import ImageGenerator from './components/ImageGenerator';
import { uploadUserAsset } from './utils/storageUtils';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import VideoGenerator from './components/VideoGenerator';
import ImageAnalyzer from './components/ImageAnalyzer';
import TikTokCreator from './components/TikTokCreator';
import ComicCreator from './components/ComicCreator';
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
    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => {
      setLoading((currentLoading) => {
        if (currentLoading) {
          console.error("Auth check timed out");
          setConnectionError(true);
          return false;
        }
        return currentLoading;
      });
    }, 8000); // 8 seconds timeout

    // Use only onAuthStateChange - it fires initial state automatically
    // This prevents duplicate fetchUserData calls (race condition)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timer); // Clear timeout if auth responds
      setSession(session);

      if (session) {
        try {
          await fetchUserData(session.user.id);
        } catch (err) {
          console.error("Critical Supabase connection error:", err);
          setConnectionError(true);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setAssets([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If profile doesn't exist (user created before trigger), create it
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile...');
        const { data: user } = await supabase.auth.getUser();

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              email: user.user?.email,
              credits: 20,
              role: 'user'
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create profile:', insertError);
        } else {
          profile = newProfile;
        }
      }

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
        // Filter out CHARACTER assets so they don't clutter the main gallery
        // They are managed separately in ComicCreator
        const mappedAssets: GeneratedAsset[] = userAssets
          .filter((a: any) => a.type !== 'CHARACTER')
          .map((a: any) => ({
            ...a,
            createdAt: new Date(a.created_at).getTime(),
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
      let assetUrl = asset.url;

      // Upload to R2 if it's a base64 string
      if (assetUrl && assetUrl.startsWith('data:')) {
        try {
          // Determine asset type for proper organization
          let assetType: 'images' | 'videos' | 'characters' | 'tiktok' | 'comics';
          
          if (asset.type === 'VIDEO') {
            assetType = 'videos';
          } else if (asset.type === 'CHARACTER') {
            assetType = 'characters';
          } else {
            // Determine by prompt content or default to images
            if (asset.prompt?.toLowerCase().includes('tiktok')) {
              assetType = 'tiktok';
            } else if (asset.prompt?.toLowerCase().includes('comic')) {
              assetType = 'comics';
            } else {
              assetType = 'images';
            }
          }
          
          assetUrl = await uploadUserAsset(
            assetUrl, 
            session.user.id, 
            assetType,
            { prompt: asset.prompt }
          );
        } catch (err) {
          console.error("Failed to upload asset to storage, saving directly (might fail if too large)", err);
          // Fallback: stick with base64 if upload fails, though DB might reject it
        }
      }

      const dbAsset = {
        user_id: session.user.id,
        type: asset.type,
        url: assetUrl,
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
    // Find asset to get R2 file path
    const assetToDelete = assets.find(a => a.id === id);
    console.log('Deleting asset:', { id, url: assetToDelete?.url });
    
    setAssets(prev => prev.filter(a => a.id !== id)); // Optimistic

    try {
      // Delete from R2 first if it's an R2 URL
      if (assetToDelete?.url && (assetToDelete.url.includes('r2.dev') || assetToDelete.url.includes('r2.cloudflarestorage.com'))) {
        try {
          const r2Client = new S3Client({
            region: 'auto',
            endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
              secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
            },
          });
          
          // Extract file key from URL
          const url = new URL(assetToDelete.url);
          const fileKey = url.pathname.substring(1); // Remove leading slash
          
          await r2Client.send(new DeleteObjectCommand({
            Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
            Key: fileKey
          }));
          
          console.log('Deleted from R2:', fileKey);
        } catch (r2Error) {
          console.error('Failed to delete from R2:', r2Error);
          // Continue to delete from database anyway
        }
      }
      
      // First check if asset exists in database
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();
        
      console.log('Asset exists in DB:', existingAsset);
      
      if (!existingAsset) {
        console.log('Asset not found in database, removing from UI only');
        return; // Asset already deleted or doesn't exist
      }
      
      // Then delete from Supabase
      console.log('Attempting database delete:', { id, userId: session?.user?.id });
      
      const { data, error: dbError, count } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', session?.user?.id)
        .select();
        
      console.log('Database delete result:', { data, error: dbError, count });
      
      if (dbError) {
        console.error('Database delete error:', dbError);
        throw dbError;
      }
      
      if (!data || data.length === 0) {
        console.warn('No rows deleted - asset may not exist or belong to different user');
      } else {
        console.log('Successfully deleted from database:', id);
      }
      // Force refresh assets from database
      if (session?.user) {
        const { data: userAssets } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (userAssets) {
          const mappedAssets: GeneratedAsset[] = userAssets
            .filter((a: any) => a.type !== 'CHARACTER')
            .map((a: any) => ({
              ...a,
              createdAt: new Date(a.created_at).getTime(),
            }));
          setAssets(mappedAssets);
        }
      }
    } catch (e) {
      console.error("Failed to delete asset:", e);
      // Revert optimistic update on error
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
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
        <h2 className="text-2xl font-bold text-white mb-2">Connection Issue</h2>
        <p className="text-zinc-400 max-w-md mb-6">
          Taking too long to connect or connection failed. Please check your internet or configuration.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryHover transition-colors"
          >
            Retry
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-surfaceHighlight text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Force Logout & Reset
          </button>
        </div>
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
      case 'comic-creator':
        return (
          <ComicCreator
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

      <main className="flex-1 overflow-y-auto relative bg-deep-space text-textMain">
        {/* Subtle background glow effects */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="min-h-full relative z-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;