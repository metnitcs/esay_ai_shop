import React, { useState, useEffect, useRef } from 'react';
import { Video, Sparkles, Loader2, AlertCircle, Lock, Upload, X } from 'lucide-react';
import { VIDEO_ASPECT_RATIOS, COSTS } from '../constants';
import { generateVideo, checkVeoAuth, promptVeoAuth } from '../services/geminiService';
import { AssetType, GeneratedAsset } from '../types';

interface VideoGeneratorProps {
  credits: number;
  deductCredits: (amount: number) => void;
  addAsset: (asset: GeneratedAsset) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ credits, deductCredits, addAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAuth, setHasAuth] = useState(false);
  
  // Image to Video state
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authorized = await checkVeoAuth();
      setHasAuth(authorized);
    } catch (e) {
      setHasAuth(true); 
    }
  };

  const handleAuth = async () => {
    try {
      await promptVeoAuth();
      setHasAuth(true);
    } catch (e) {
      console.error("Auth failed", e);
      setError("Failed to authenticate for Veo. Please try again.");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        setSelectedImage({
          data: base64Data,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!hasAuth) {
      await handleAuth();
      return;
    }

    if (!prompt.trim() && !selectedImage) {
      setError("Please provide a prompt or an image.");
      return;
    }

    if (credits < COSTS.VIDEO) {
      setError(`Insufficient credits. You need ${COSTS.VIDEO} credits.`);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const videoUrl = await generateVideo(prompt, aspectRatio, selectedImage || undefined);
      
      const newAsset: GeneratedAsset = {
        id: crypto.randomUUID(),
        type: AssetType.VIDEO,
        url: videoUrl,
        prompt: prompt || "Image-to-Video",
        createdAt: Date.now(),
        aspectRatio: aspectRatio
      };

      addAsset(newAsset);
      deductCredits(COSTS.VIDEO);
    } catch (err: any) {
      if (err.message && err.message.includes("Requested entity was not found")) {
        setHasAuth(false);
        setError("Session expired or invalid key. Please re-authenticate.");
      } else {
        setError(err.message || 'Failed to generate video');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Video className="w-6 h-6 text-accent" />
          </div>
          Video Generation (Veo)
        </h2>
        <p className="text-zinc-400">Create stunning videos from text or animate your images.</p>
      </div>

      {!hasAuth && (
        <div className="mb-6 p-6 bg-gradient-to-r from-primary/20 to-surface border border-primary/30 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Authorization Required</h3>
            <p className="text-zinc-400 text-sm">To use Veo, you must select a valid paid API key from Google AI Studio.</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-primary hover:text-primaryHover underline mt-2 block"
            >
              Learn about billing
            </a>
          </div>
          <button 
            onClick={handleAuth}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primaryHover transition-colors flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Connect API Key
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className={`bg-surface border border-white/5 rounded-2xl p-6 relative ${!hasAuth ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {/* Image Upload Area */}
            <div className="mb-4">
               <label className="block text-sm font-medium text-zinc-300 mb-2">Starting Image (Optional)</label>
               {!selectedImage ? (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent/50 hover:bg-white/5 transition-all group"
                 >
                   <Upload className="w-6 h-6 text-zinc-500 group-hover:text-accent mb-2" />
                   <span className="text-xs text-zinc-500 group-hover:text-zinc-300">Click to upload reference image</span>
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                   />
                 </div>
               ) : (
                 <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                    <img 
                      src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                      className="w-full h-full object-cover" 
                      alt="Reference" 
                    />
                    <button 
                      onClick={() => { setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                 </div>
               )}
            </div>

            <label className="block text-sm font-medium text-zinc-300 mb-2">Video Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the motion: A cinematic drone shot, panning slowly..."
              className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
            />
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-zinc-500">Cost: {COSTS.VIDEO} Credits</span>
              <button
                onClick={handleGenerate}
                disabled={loading || (!prompt.trim() && !selectedImage) || credits < COSTS.VIDEO}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Video</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className={`space-y-6 ${!hasAuth ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-surface border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIDEO_ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        aspectRatio === ratio.value
                          ? 'bg-accent/20 border-accent text-white'
                          : 'bg-background border-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-accent/10 to-transparent border border-accent/20 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-accent mb-2">Veo Capabilities</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">
              Veo creates high-quality 720p videos. Generation typically takes 30-60 seconds. 
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong>Tip:</strong> Upload an image to animate it, or just use text to create from scratch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;