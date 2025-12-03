
import React, { useState, useRef, useEffect } from 'react';
import { Box, Sparkles, Image as ImageIcon, Film, Video as VideoIcon, Upload, X, Check, ChevronRight, ChevronLeft, Loader2, Music, User, Download, RotateCcw, Layers } from 'lucide-react';
import { ETHNICITIES, SKIN_TONES, BODY_TYPES, CAPTION_STYLES, COSTS } from '../constants';
import { GeneratedAsset, AssetType, ProductInfo, CharacterInfo, TikTokProject } from '../types';
import { generateImage, generateScript, generateVideo, checkVeoAuth, promptVeoAuth } from '../services/geminiService';

interface TikTokCreatorProps {
  credits: number;
  deductCredits: (amount: number) => void;
  addAsset: (asset: GeneratedAsset) => void;
}

const TikTokCreator: React.FC<TikTokCreatorProps> = ({ credits, deductCredits, addAsset }) => {
  const [project, setProject] = useState<TikTokProject>({
    step: 1,
    product: {
      name: '',
      description: '',
      price: '',
      targetAudience: '',
      image: null
    },
    character: {
      gender: 'female',
      ethnicity: 'thai',
      skinTone: 'fair',
      bodyType: 'normal',
      caption: {
        enabled: false,
        text: '',
        style: 'modern',
        position: 'top'
      }
    },
    script: '',
    generatedImages: [],
    selectedImageIds: [],
    videoLength: 8
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasAuth, setHasAuth] = useState(false);
  const [resultVideo, setResultVideo] = useState<GeneratedAsset | null>(null);

  useEffect(() => {
    // Check Veo auth early
    checkVeoAuth().then(setHasAuth).catch(() => setHasAuth(true));
  }, []);

  // --- Handlers ---

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProject(prev => ({
          ...prev,
          product: {
            ...prev.product,
            image: {
              data: (reader.result as string).split(',')[1],
              mimeType: file.type,
              preview: reader.result as string
            }
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAssets = async () => {
    // Logic for Step 2 -> 3
    if (credits < COSTS.IMAGE * 3) {
      setError(`Insufficient credits. Generating 3 variations costs ${COSTS.IMAGE * 3} credits.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Generate Script
      const script = await generateScript(project.product.name, project.product.description, project.product.targetAudience);
      
      // 2. Generate 3 Images
      // Construct prompt
      const basePrompt = `A ${project.character.gender}, ${project.character.ethnicity} ethnicity, ${project.character.skinTone} skin tone, ${project.character.bodyType} build, holding the product. High quality, UGC style, TikTok aesthetic, professional lighting, photorealistic.`;
      
      const imagePromises = [1, 2, 3].map(() => 
        generateImage(basePrompt, '9:16', project.product.image ? { data: project.product.image.data, mimeType: project.product.image.mimeType } : undefined)
      );

      const imageUrls = await Promise.all(imagePromises);
      
      const newAssets: GeneratedAsset[] = imageUrls.map(url => ({
        id: crypto.randomUUID(),
        type: AssetType.IMAGE,
        url: url,
        prompt: basePrompt,
        createdAt: Date.now(),
        aspectRatio: '9:16'
      }));

      // Add to global assets just in case user drops off
      newAssets.forEach(addAsset);
      deductCredits(COSTS.IMAGE * 3);

      setProject(prev => ({
        ...prev,
        script: script,
        generatedImages: newAssets,
        step: 3
      }));

    } catch (err: any) {
      setError(err.message || "Failed to generate assets");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalGenerate = async () => {
    // Logic for Step 4/5 -> Final Video
    if (!hasAuth) {
      await promptVeoAuth();
      setHasAuth(true);
      return;
    }

    if (project.selectedImageIds.length === 0) {
      setError("Please select at least one image.");
      return;
    }
    
    // Cost calculation based on length (simplification: 1 video gen per clip needed)
    // 8s = 1 clip, 16s = 2 clips...
    const clipCount = project.videoLength / 8;
    const cost = COSTS.VIDEO * clipCount;

    if (credits < cost) {
       setError(`Insufficient credits for ${project.videoLength}s video. Need ${cost} credits.`);
       return;
    }

    setLoading(true);
    // Move to step 5 (Loading UI)
    setProject(prev => ({ ...prev, step: 5 }));

    try {
      // Find selected asset
      const selectedAsset = project.generatedImages.find(img => img.id === project.selectedImageIds[0]);
      if (!selectedAsset) throw new Error("Selected image not found");

      // Generate video using the selected image as start frame
      const fetchImg = await fetch(selectedAsset.url);
      const blob = await fetchImg.blob();
      const reader = new FileReader();
      
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      // Generate Clip 1
      const videoUrl = await generateVideo(
        `UGC video of person holding product ${project.product.name}, talking excitedly. ${project.script.slice(0, 100)}`,
        '9:16',
        { data: base64Data, mimeType: 'image/png' }
      );

      const newVideoAsset: GeneratedAsset = {
        id: crypto.randomUUID(),
        type: AssetType.VIDEO,
        url: videoUrl,
        prompt: `TikTok Video for ${project.product.name}`,
        createdAt: Date.now(),
        aspectRatio: '9:16'
      };

      // Save asset
      addAsset(newVideoAsset);
      deductCredits(cost);
      setResultVideo(newVideoAsset);
      setProject(prev => ({ ...prev, step: 6 })); // Move to success step
      
    } catch (err: any) {
      setError(err.message);
      setProject(prev => ({ ...prev, step: 4 })); // Go back
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setProject({
      step: 1,
      product: { ...project.product, image: null, name: '', description: '', price: '', targetAudience: '' },
      character: { ...project.character },
      script: '',
      generatedImages: [],
      selectedImageIds: [],
      videoLength: 8
    });
    setResultVideo(null);
  };

  // --- Step Components ---

  const renderStepper = () => (
    <div className="flex items-center justify-center mb-8 px-4">
      {[
        { step: 1, icon: Box },
        { step: 2, icon: Sparkles },
        { step: 3, icon: ImageIcon },
        { step: 4, icon: Film },
        { step: 5, icon: VideoIcon }
      ].map((s, idx, arr) => (
        <React.Fragment key={s.step}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            project.step === s.step || (project.step === 6 && s.step === 5)
              ? 'bg-white text-black border-white' 
              : project.step > s.step 
                ? 'bg-primary text-white border-primary' 
                : 'bg-transparent text-zinc-600 border-zinc-700'
          }`}>
            {project.step > s.step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
          </div>
          {idx < arr.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 ${project.step > s.step ? 'bg-primary' : 'bg-zinc-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      <div className="bg-surface border border-white/5 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" /> Product Info
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Product Image *</label>
            {!project.product.image ? (
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-40 h-56 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group mx-auto lg:mx-0"
               >
                 <Upload className="w-8 h-8 text-zinc-500 group-hover:text-primary mb-3" />
                 <span className="text-xs text-zinc-400 font-medium text-center px-4">Upload Product<br/>(PNG, JPG max 10MB)</span>
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleProductImageUpload}
                 />
               </div>
             ) : (
               <div className="relative w-40 h-56 rounded-xl overflow-hidden border border-white/10 group mx-auto lg:mx-0">
                  <img 
                    src={project.product.image.preview} 
                    className="w-full h-full object-cover" 
                    alt="Product" 
                  />
                  <button 
                    onClick={() => { setProject(p => ({...p, product: {...p.product, image: null}})); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-red-500/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
               </div>
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Product Name *</label>
            <input 
              type="text"
              value={project.product.name}
              onChange={(e) => setProject(p => ({...p, product: {...p.product, name: e.target.value}}))}
              className="w-full bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="e.g. Vitamin C Serum"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <textarea 
              value={project.product.description}
              onChange={(e) => setProject(p => ({...p, product: {...p.product, description: e.target.value}}))}
              className="w-full h-24 bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Key features, ingredients, benefits..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Price</label>
              <input 
                type="text"
                value={project.product.price}
                onChange={(e) => setProject(p => ({...p, product: {...p.product, price: e.target.value}}))}
                className="w-full bg-background border border-white/10 rounded-lg p-3 text-white"
                placeholder="e.g. $29"
              />
             </div>
             <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Target Audience</label>
              <input 
                type="text"
                value={project.product.targetAudience}
                onChange={(e) => setProject(p => ({...p, product: {...p.product, targetAudience: e.target.value}}))}
                className="w-full bg-background border border-white/10 rounded-lg p-3 text-white"
                placeholder="e.g. Women 25-35"
              />
             </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col items-center justify-center bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="w-[280px] h-[500px] bg-background border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center z-10">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <VideoIcon className="w-6 h-6 text-white/50" />
          </div>
          <h4 className="text-white font-semibold">UGC Style Video</h4>
          <p className="text-zinc-500 text-xs mt-2 text-center px-8">Real person holding product + Voiceover</p>
          <div className="mt-8 text-xs text-zinc-600 flex items-center gap-2">
            <span>9:16</span> <span>•</span> <span>15-30s</span>
          </div>
        </div>
      </div>

      <div className="col-span-full flex justify-end">
        <button 
          onClick={() => setProject(p => ({...p, step: 2}))}
          disabled={!project.product.name || !project.product.image}
          className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-3xl mx-auto animate-fade-in">
       <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Create Character
        </h3>

        {/* Gender */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Gender</label>
          <div className="grid grid-cols-2 gap-4">
            {['Male', 'Female'].map(g => (
              <button
                key={g}
                onClick={() => setProject(p => ({...p, character: {...p.character, gender: g.toLowerCase()}}))}
                className={`py-3 rounded-xl border font-medium transition-all ${
                  project.character.gender === g.toLowerCase()
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
           <div>
             <label className="block text-sm font-medium text-zinc-300 mb-2">Ethnicity</label>
             <div className="grid grid-cols-2 gap-2">
                {ETHNICITIES.map(e => (
                   <button 
                     key={e.id}
                     onClick={() => setProject(p => ({...p, character: {...p.character, ethnicity: e.id}}))}
                     className={`text-xs py-2 rounded-lg border transition-all ${
                        project.character.ethnicity === e.id
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                     }`}
                   >
                    {e.label}
                   </button>
                ))}
             </div>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-zinc-300 mb-2">Skin Tone</label>
             <div className="grid grid-cols-2 gap-2">
                {SKIN_TONES.map(s => (
                   <button 
                     key={s.id}
                     onClick={() => setProject(p => ({...p, character: {...p.character, skinTone: s.id}}))}
                     className={`text-xs py-2 rounded-lg border transition-all ${
                        project.character.skinTone === s.id
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                     }`}
                   >
                    {s.label}
                   </button>
                ))}
             </div>
           </div>

           <div className="md:col-span-2">
             <label className="block text-sm font-medium text-zinc-300 mb-2">Body Type</label>
             <div className="grid grid-cols-3 gap-2">
                {BODY_TYPES.map(b => (
                   <button 
                     key={b.id}
                     onClick={() => setProject(p => ({...p, character: {...p.character, bodyType: b.id}}))}
                     className={`text-xs py-2 rounded-lg border transition-all ${
                        project.character.bodyType === b.id
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                     }`}
                   >
                    {b.label}
                   </button>
                ))}
             </div>
           </div>
        </div>

        {/* Caption Section */}
        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center justify-between mb-4">
             <h4 className="font-semibold text-white">Caption on Image</h4>
             <button 
               onClick={() => setProject(p => ({...p, character: {...p.character, caption: {...p.character.caption, enabled: !p.character.caption.enabled}}}))}
               className={`w-12 h-6 rounded-full p-1 transition-colors ${project.character.caption.enabled ? 'bg-primary' : 'bg-zinc-700'}`}
             >
               <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${project.character.caption.enabled ? 'translate-x-6' : ''}`} />
             </button>
          </div>

          {project.character.caption.enabled && (
             <div className="space-y-4 animate-fade-in">
                <input 
                  type="text"
                  placeholder="e.g. 50% Discount Today!"
                  value={project.character.caption.text}
                  onChange={(e) => setProject(p => ({...p, character: {...p.character, caption: {...p.character.caption, text: e.target.value}}}))}
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-white"
                />
                <div>
                   <label className="block text-xs font-medium text-zinc-400 mb-2">Style</label>
                   <div className="flex gap-2">
                      {CAPTION_STYLES.map(style => (
                         <button
                           key={style.id}
                           onClick={() => setProject(p => ({...p, character: {...p.character, caption: {...p.character.caption, style: style.id}}}))}
                           className={`px-3 py-1.5 rounded-full text-xs border ${
                              project.character.caption.style === style.id
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-transparent border-zinc-700 text-zinc-400'
                           }`}
                         >
                           {style.label}
                         </button>
                      ))}
                   </div>
                </div>
             </div>
          )}
        </div>
       </div>
       
       <div className="flex justify-between">
         <button onClick={() => setProject(p => ({...p, step: 1}))} className="text-zinc-400 hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
         </button>
         <button 
           onClick={generateAssets}
           disabled={loading}
           className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
         >
           {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
           Generate Assets
         </button>
       </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-5xl mx-auto animate-fade-in">
       {/* Script Section */}
       <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
         <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" /> Generated Script
         </h3>
         <textarea 
            value={project.script}
            onChange={(e) => setProject(p => ({...p, script: e.target.value}))}
            className="w-full h-24 bg-background border border-white/10 rounded-xl p-4 text-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
         />
       </div>

       {/* Image Selection */}
       <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" /> Select Image
            </h3>
            <span className="text-sm text-zinc-500">Select {project.videoLength / 8} image(s)</span>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {project.generatedImages.map((img) => {
              const isSelected = project.selectedImageIds.includes(img.id);
              return (
                <div 
                   key={img.id}
                   onClick={() => {
                     // Single selection logic for simplicity for now, but allow tracking array
                     setProject(p => ({...p, selectedImageIds: [img.id]}))
                   }}
                   className={`relative rounded-xl overflow-hidden aspect-[9/16] cursor-pointer border-2 transition-all ${
                     isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-transparent hover:border-white/20'
                   }`}
                >
                   <img src={img.url} alt="Generated" className="w-full h-full object-cover" />
                   {isSelected && (
                     <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                       <Check className="w-4 h-4 text-white" />
                     </div>
                   )}
                </div>
              )
            })}
         </div>
       </div>

       <div className="flex justify-between">
         <button onClick={() => setProject(p => ({...p, step: 2}))} className="text-zinc-400 hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
         </button>
         <button 
           onClick={() => setProject(p => ({...p, step: 4}))}
           disabled={project.selectedImageIds.length === 0}
           className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
         >
           Next <ChevronRight className="w-4 h-4" />
         </button>
       </div>
    </div>
  );

  const renderStep4 = () => {
    const cost = COSTS.VIDEO * (project.videoLength / 8);
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" /> Video Settings
          </h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-4">Video Length</label>
            <div className="grid grid-cols-3 gap-4">
              {[8, 16, 24].map((sec) => {
                const clips = sec / 8;
                return (
                  <button
                    key={sec}
                    onClick={() => setProject(p => ({...p, videoLength: sec as any}))}
                    className={`py-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      project.videoLength === sec
                        ? 'bg-white text-black border-white'
                        : 'bg-background border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <span className="text-xl font-bold">{sec}s</span>
                    <span className="text-xs opacity-60">{clips} Clip(s)</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-6">
             <div className="flex justify-between items-center mb-2">
               <span className="text-zinc-400 text-sm">Structure</span>
               <span className="text-zinc-500 text-xs">Based on {project.videoLength}s</span>
             </div>
             <div className="flex gap-2">
               {Array.from({ length: project.videoLength / 8 }).map((_, i) => (
                  <div key={i} className="flex-1 aspect-video bg-zinc-800 rounded-lg flex items-center justify-center border border-white/5">
                    <span className="text-xs text-zinc-500">Clip {i+1}</span>
                  </div>
               ))}
             </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
             <div className="text-sm text-zinc-400">Total Cost</div>
             <div className="text-xl font-bold text-accent">{cost} Credits</div>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setProject(p => ({...p, step: 3}))} className="text-zinc-400 hover:text-white flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button 
            onClick={handleFinalGenerate}
            disabled={credits < cost}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <VideoIcon className="w-4 h-4" /> Generate Video ({cost} Cr)
          </button>
        </div>
        {error && <p className="text-red-400 text-center mt-4 text-sm">{error}</p>}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px] animate-fade-in text-center">
       <div className="relative w-24 h-24 mb-6">
         <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
         <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
         <VideoIcon className="absolute inset-0 m-auto w-8 h-8 text-primary" />
       </div>
       <h3 className="text-2xl font-bold text-white mb-2">Creating your video...</h3>
       <p className="text-zinc-400 max-w-md">
         We are generating the clips and stitching them together. This usually takes about 1-2 minutes per clip. Please don't close this tab.
       </p>
       <div className="mt-8 p-4 bg-surface rounded-xl border border-white/5 w-full">
         <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-300">Clip 1 generation</span>
            <span className="text-primary animate-pulse">Processing...</span>
         </div>
         <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-primary w-2/3 animate-pulse"></div>
         </div>
       </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="max-w-4xl mx-auto animate-fade-in flex flex-col items-center">
      <div className="w-full bg-surface border border-white/5 rounded-3xl p-8 mb-8 flex flex-col md:flex-row gap-8 items-center">
        
        {/* Video Player */}
        <div className="w-full md:w-1/2">
           <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {resultVideo && (
                <video 
                  src={resultVideo.url} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-cover" 
                />
              )}
           </div>
        </div>

        {/* Success Info */}
        <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
           <div>
             <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
               <Check className="w-8 h-8 text-green-500" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2">Video Ready!</h2>
             <p className="text-zinc-400">Your TikTok UGC video has been successfully generated. It has been saved to your gallery.</p>
           </div>

           <div className="space-y-3">
             <a 
               href={resultVideo?.url} 
               download="tiktok-video.mp4"
               className="w-full bg-primary hover:bg-primaryHover text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
             >
               <Download className="w-5 h-5" /> Download Video
             </a>
             <button 
               onClick={resetFlow}
               className="w-full bg-surface hover:bg-white/5 text-white border border-white/10 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
             >
               <RotateCcw className="w-5 h-5" /> Create Another
             </button>
             <button 
               onClick={() => { /* Navigate to Gallery logic usually handled by parent or just reset */ resetFlow(); }}
               className="w-full text-zinc-500 hover:text-white py-2 text-sm flex items-center justify-center gap-2"
             >
               <Layers className="w-4 h-4" /> Go to Gallery
             </button>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {renderStepper()}
      
      {project.step === 1 && renderStep1()}
      {project.step === 2 && renderStep2()}
      {project.step === 3 && renderStep3()}
      {project.step === 4 && renderStep4()}
      {project.step === 5 && renderStep5()}
      {project.step === 6 && renderStep6()}

    </div>
  );
};

export default TikTokCreator;
