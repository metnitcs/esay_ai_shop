
import React, { useState, useRef, useEffect } from 'react';
import { Box, Sparkles, Image as ImageIcon, Film, Video as VideoIcon, Upload, X, Check, ChevronRight, ChevronLeft, Loader2, Music, User, Download, RotateCcw, Layers } from 'lucide-react';
import { ETHNICITIES, SKIN_TONES, BODY_TYPES, CAPTION_STYLES, COSTS, PRODUCT_TYPES } from '../constants';
import { GeneratedAsset, AssetType, ProductInfo, CharacterInfo, TikTokProject } from '../types';
import { generateImage, generateScript, generateVideo, checkVeoAuth, promptVeoAuth } from '../services/geminiService';
import { buildImagePrompt, buildVideoPrompt } from '../utils/promptBuilder';

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
      image: null,
      url: '', // Optional URL from TikTok Shop/Shopee
      productType: 'default'
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
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
  const [hasAuth, setHasAuth] = useState(false);
  const [resultVideo, setResultVideo] = useState<GeneratedAsset | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    // Check Veo auth early
    const checkAuth = async () => {
      const auth = await checkVeoAuth();
      setHasAuth(auth);
    };
    checkAuth();
  }, []);

  // --- Handlers ---

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("ขนาดไฟล์ใหญ่เกินไป ใช้ได้สูงสุด 10MB");
        return;
      }

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

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("ขนาดไฟล์ใหญ่เกินไป ใช้ได้สูงสุด 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProject(prev => ({
          ...prev,
          character: {
            ...prev.character,
            referenceImage: {
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
      setError(`เครดิตไม่เพียงพอ การสร้างภาพ 3 แบบใช้เครดิต ${COSTS.IMAGE * 3} เครดิต`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Generate Script
      const script = await generateScript(
        project.product.name,
        project.product.description,
        project.product.targetAudience,
        project.product.price,
        project.character.gender,
        project.character.ethnicity
      );

      // 2. Generate 3 Images with optimized prompts (one at a time to avoid rate limits)
      let basePrompt = buildImagePrompt(project.product, project.character);

      // Prepare images
      const primaryImage = project.product.image ? { data: project.product.image.data, mimeType: project.product.image.mimeType } : undefined;
      let secondaryImage = undefined;

      if (project.character.referenceType === 'upload' && project.character.referenceImage) {
        secondaryImage = { data: project.character.referenceImage.data, mimeType: project.character.referenceImage.mimeType };
        basePrompt += `\n\nIMPORTANT: Use the second image as a strict reference for the character's appearance (face, hair, style).`;
      }

      // Generate images sequentially with delay to avoid rate limiting
      const imageUrls: string[] = [];
      for (let i = 0; i < 3; i++) {
        console.log(`Generating image ${i + 1}/3...`);
        const imageUrl = await generateImage(basePrompt, '9:16', primaryImage, secondaryImage);
        imageUrls.push(imageUrl);

        // Add delay between images (except after last one)
        if (i < 2) {
          console.log(`Waiting 2 seconds before generating next image...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

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
      setError(err.message || "ไม่สามารถสร้างเนื้อหาได้ กรุณาลองใหม่อีกครั้ง");
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
      setError("กรุณาเลือกรูปอย่างน้อย 1 รูป");
      return;
    }

    // Cost calculation
    const clipCount = project.videoLength / 8;
    const voiceoverCost = 3 * COSTS.VOICEOVER;
    const digitalVoiceCost = 1 + (clipCount * COSTS.DIGITAL_VOICE);
    const videoCost = clipCount * COSTS.VIDEO;
    const totalCost = voiceoverCost + digitalVoiceCost + videoCost;

    if (credits < totalCost) {
      setError(`เครดิตไม่พอ ต้องการ ${totalCost.toFixed(1)} แต่มี ${credits.toFixed(1)} เครดิต`);
      return;
    }

    setLoading(true);
    // Move to step 5 (Loading UI)
    setProject(prev => ({ ...prev, step: 5 }));

    try {
      // Find selected asset
      const selectedAsset = project.generatedImages.find(img => img.id === project.selectedImageIds[0]);
      if (!selectedAsset) throw new Error("ไม่พบรูปภาพที่เลือก");

      // Generate video using the selected image as start frame
      const fetchImg = await fetch(selectedAsset.url);
      const blob = await fetchImg.blob();
      const reader = new FileReader();

      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      // Generate multiple clips based on video length
      const videoClips: string[] = [];
      setGenerationProgress({ current: 0, total: clipCount });

      for (let i = 0; i < clipCount; i++) {
        setGenerationProgress({ current: i + 1, total: clipCount });

        // Use optimized video prompt with clip-specific focus
        const clipPrompt = buildVideoPrompt(project.product, project.character, i + 1, clipCount, project.script);

        const clipUrl = await generateVideo(
          clipPrompt,
          '9:16',
          { data: base64Data, mimeType: 'image/png' }
        );

        videoClips.push(clipUrl);

        // Add delay between API calls to avoid rate limiting (except after last clip)
        if (i < clipCount - 1) {
          console.log(`Waiting 3 seconds before generating next clip...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
      }

      // Save ALL clips as separate assets
      const videoAssets: GeneratedAsset[] = videoClips.map((url, index) => ({
        id: crypto.randomUUID(),
        type: AssetType.VIDEO,
        url: url,
        prompt: `TikTok Video for ${project.product.name} - Clip ${index + 1}/${clipCount}`,
        createdAt: Date.now(),
        aspectRatio: '9:16'
      }));

      // Add all video assets to gallery
      videoAssets.forEach(addAsset);
      deductCredits(totalCost);

      // Set the first clip as the result to display
      setResultVideo(videoAssets[0]);
      setProject(prev => ({ ...prev, step: 6 })); // Move to success step

    } catch (err: any) {
      console.error("Video generation error:", err);
      setError(err.message || "ไม่สามารถสร้างวิดีโอได้ กรุณาลองใหม่อีกครั้ง");
      setProject(prev => ({ ...prev, step: 4 })); // Go back to settings on error
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
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${project.step === s.step || (project.step === 6 && s.step === 5)
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" /> ข้อมูลสินค้า
        </h3>

        <div className="space-y-6">
          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">รูปสินค้า *</label>
            {!project.product.image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group"
              >
                <Upload className="w-10 h-10 text-zinc-500 group-hover:text-primary mb-3" />
                <span className="text-sm text-zinc-400 font-medium">อัพโหลดรูปสินค้า</span>
                <span className="text-xs text-zinc-500 mt-1">(PNG, JPG สูงสุด 10MB)</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                />
              </div>
            ) : (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 group">
                <img
                  src={project.product.image.preview}
                  className="w-full h-full object-contain bg-black/20"
                  alt="Product"
                />
                <button
                  onClick={() => { setProject(p => ({ ...p, product: { ...p.product, image: null } })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">ชื่อสินค้า *</label>
            <input
              type="text"
              value={project.product.name}
              onChange={(e) => setProject(p => ({ ...p, product: { ...p.product, name: e.target.value } }))}
              className="w-full bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="เช่น เซรั่มวิตามินซี"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">รายละเอียดสินค้า</label>
            <textarea
              value={project.product.description}
              onChange={(e) => setProject(p => ({ ...p, product: { ...p.product, description: e.target.value } }))}
              className="w-full h-28 bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="คุณสมบัติ ส่วนผสม ประโยชน์ ให้ละเอียด เพื่อ AI จะได้สร้างสคริปต์ที่ดี"
            />
          </div>

          {/* Product Type Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">ประเภทสินค้า</label>
            <p className="text-xs text-zinc-500 mb-3">เลือกให้ถูกต้องเพื่อ AI จะสร้างวิดีโอที่เหมาะสมกับสินค้า</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRODUCT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setProject(p => ({ ...p, product: { ...p.product, productType: type.id as any } }))}
                  className={`text-xs py-2.5 px-3 rounded-lg border transition-all ${project.product.productType === type.id
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price and Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">ราคา</label>
              <input
                type="text"
                value={project.product.price}
                onChange={(e) => setProject(p => ({ ...p, product: { ...p.product, price: e.target.value } }))}
                className="w-full bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="เช่น 990 บาท"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">กลุ่มเป้าหมาย</label>
              <input
                type="text"
                value={project.product.targetAudience}
                onChange={(e) => setProject(p => ({ ...p, product: { ...p.product, targetAudience: e.target.value } }))}
                className="w-full bg-background border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="เช่น ผู้หญิงวัย 25-35"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          onClick={() => setProject(p => ({ ...p, step: 2 }))}
          disabled={!project.product.name || !project.product.image}
          className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          ถัดไป <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> สร้างตัวละคร
        </h3>

        {/* Reference Image Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-3">ภาพอ้างอิง</label>
          <p className="text-xs text-zinc-500 mb-3">เลือกรูปแบบที่ต้องการให้ AI สร้างตามหรืออัพโหลดภาพอ้างอิง</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Use Product Image */}
            <button
              onClick={() => setProject(p => ({ ...p, character: { ...p.character, referenceType: 'product' } }))}
              className={`p-4 rounded-xl border-2 transition-all ${(!project.character.referenceType || project.character.referenceType === 'product')
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
                }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-white">เลือกสินค้า</span>
                <span className="text-xs text-zinc-400 text-center">ใช้รูปสินค้าที่อัพโหลด</span>
              </div>
            </button>

            {/* AI Decide */}
            <button
              onClick={() => setProject(p => ({ ...p, character: { ...p.character, referenceType: 'ai' } }))}
              className={`p-4 rounded-xl border-2 transition-all ${project.character.referenceType === 'ai'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
                }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-white">จัดฉาก</span>
                <span className="text-xs text-zinc-400 text-center">ให้ AI จัดฉากเอง</span>
              </div>
            </button>

            {/* Upload Custom */}
            <button
              onClick={() => setProject(p => ({ ...p, character: { ...p.character, referenceType: 'upload' } }))}
              className={`p-4 rounded-xl border-2 transition-all ${project.character.referenceType === 'upload'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
                }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-white">อัพโหลด</span>
                <span className="text-xs text-zinc-400 text-center">อัพโหลดภาพอ้างอิง</span>
              </div>
            </button>
          </div>

          {/* Upload Area for Custom Reference */}
          {project.character.referenceType === 'upload' && (
            <div className="animate-fade-in">
              {!project.character.referenceImage ? (
                <div
                  onClick={() => referenceImageInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group"
                >
                  <Upload className="w-8 h-8 text-zinc-500 group-hover:text-primary mb-2" />
                  <span className="text-sm text-zinc-400 font-medium">คลิกเพื่ออัพโหลดรูปอ้างอิง</span>
                  <span className="text-xs text-zinc-500 mt-1">(PNG, JPG สูงสุด 10MB)</span>
                  <input
                    type="file"
                    ref={referenceImageInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleReferenceImageUpload}
                  />
                </div>
              ) : (
                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-white/10 group bg-black/20">
                  <img
                    src={project.character.referenceImage.preview}
                    className="w-full h-full object-contain"
                    alt="Reference"
                  />
                  <button
                    onClick={() => {
                      setProject(p => ({ ...p, character: { ...p.character, referenceImage: null } }));
                      if (referenceImageInputRef.current) referenceImageInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Character Customization - Only show if NOT uploading reference image */}
        {project.character.referenceType !== 'upload' && (
          <>
            {/* Gender */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">เพศ</label>
              <div className="grid grid-cols-2 gap-4">
                {[{ id: 'male', label: 'ชาย' }, { id: 'female', label: 'หญิง' }].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setProject(p => ({ ...p, character: { ...p.character, gender: g.id } }))}
                    className={`py-3 rounded-xl border font-medium transition-all ${project.character.gender === g.id
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                      }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdowns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">เชื้อชาติ</label>
                <div className="grid grid-cols-2 gap-2">
                  {ETHNICITIES.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setProject(p => ({ ...p, character: { ...p.character, ethnicity: e.id } }))}
                      className={`text-xs py-2 rounded-lg border transition-all ${project.character.ethnicity === e.id
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">สีผิว</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKIN_TONES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setProject(p => ({ ...p, character: { ...p.character, skinTone: s.id } }))}
                      className={`text-xs py-2 rounded-lg border transition-all ${project.character.skinTone === s.id
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">รูปร่าง</label>
                <div className="grid grid-cols-3 gap-2">
                  {BODY_TYPES.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setProject(p => ({ ...p, character: { ...p.character, bodyType: b.id } }))}
                      className={`text-xs py-2 rounded-lg border transition-all ${project.character.bodyType === b.id
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
          </>
        )}

        {/* Show helper text when upload is selected */}
        {project.character.referenceType === 'upload' && project.character.referenceImage && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-xl">
            <p className="text-sm text-primary">✨ AI จะใช้รูปที่คุณอัพโหลดเป็นตัวอ้างอิงสำหรับหน้าตาและสไตล์ของตัวละคร</p>
          </div>
        )}

        {/* Caption Section */}
        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-white">ข้อความบนภาพ (Caption)</h4>
            <button
              onClick={() => setProject(p => ({ ...p, character: { ...p.character, caption: { ...p.character.caption, enabled: !p.character.caption.enabled } } }))}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${project.character.caption.enabled ? 'bg-primary' : 'bg-zinc-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${project.character.caption.enabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-4">เพิ่มข้อความสำหรับโปรโมชั่นหรือข้อมูลสำคัญบนภาพ UGC</p>

          {project.character.caption.enabled && (
            <div className="space-y-4 animate-fade-in">
              {/* Caption Text Input with Counter */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">ข้อความบนภาพ</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="เช่น ลด 50% วันนี้เท่านั้น!"
                    value={project.character.caption.text}
                    onChange={(e) => {
                      if (e.target.value.length <= 50) {
                        setProject(p => ({ ...p, character: { ...p.character, caption: { ...p.character.caption, text: e.target.value } } }));
                      }
                    }}
                    maxLength={50}
                    className="w-full bg-background border border-white/10 rounded-lg p-3 pr-16 text-white focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    {project.character.caption.text.length}/50
                  </span>
                </div>
              </div>

              {/* Style Selector */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">รูปแบบ</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CAPTION_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setProject(p => ({ ...p, character: { ...p.character, caption: { ...p.character.caption, style: style.id } } }))}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${project.character.caption.style === style.id
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Selector */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">ตำแหน่ง</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'top', label: 'บน', icon: '⬆️' },
                    { id: 'center', label: 'กลาง', icon: '➡️' },
                    { id: 'bottom', label: 'ล่าง', icon: '⬇️' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setProject(p => ({ ...p, character: { ...p.character, caption: { ...p.character.caption, position: pos.id } } }))}
                      className={`px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center justify-center gap-2 ${project.character.caption.position === pos.id
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                    >
                      <span>{pos.icon}</span>
                      <span>{pos.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Helper Text */}
              <p className="text-xs text-green-400/80 flex items-start gap-1.5">
                <span className="mt-0.5">✨</span>
                <span>AI จะช่วยสร้างตามรูปแบบที่เลือก</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setProject(p => ({ ...p, step: 1 }))} className="text-zinc-400 hover:text-white flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
        </button>
        <button
          onClick={generateAssets}
          disabled={loading}
          className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          สร้างเนื้อหา
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Script Section */}
      <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" /> สคริปต์ที่สร้าง
        </h3>
        <textarea
          value={project.script}
          onChange={(e) => setProject(p => ({ ...p, script: e.target.value }))}
          className="w-full h-24 bg-background border border-white/10 rounded-xl p-4 text-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Image Selection */}
      <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> เลือกรูป
          </h3>
          <span className="text-sm text-zinc-500">เลือก {project.videoLength / 8} รูป</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {project.generatedImages.map((img) => {
            const isSelected = project.selectedImageIds.includes(img.id);
            return (
              <div
                key={img.id}
                onClick={() => {
                  // Single selection logic for simplicity for now, but allow tracking array
                  setProject(p => ({ ...p, selectedImageIds: [img.id] }))
                }}
                className={`relative rounded-xl overflow-hidden aspect-[9/16] cursor-pointer border-2 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-transparent hover:border-white/20'
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
        <button onClick={() => setProject(p => ({ ...p, step: 2 }))} className="text-zinc-400 hover:text-white flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
        </button>
        <button
          onClick={() => setProject(p => ({ ...p, step: 4 }))}
          disabled={project.selectedImageIds.length === 0}
          className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          ถัดไป <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    // Calculate costs
    const clipCount = project.videoLength / 8;
    const voiceoverCost = 3 * COSTS.VOICEOVER; // 3 images generated previously
    const digitalVoiceCost = 1 + (clipCount * COSTS.DIGITAL_VOICE); // Base + per clip
    const videoCost = clipCount * COSTS.VIDEO;
    const totalCost = voiceoverCost + digitalVoiceCost + videoCost;

    // Find selected image
    const selectedImage = project.generatedImages.find(img => project.selectedImageIds.includes(img.id));

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" /> ตั้งค่าวิดีโอ
          </h3>

          {/* Video Length Selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-zinc-300 mb-4">ความยาววิดีโอ</label>
            <div className="grid grid-cols-2 gap-4">
              {[8, 16].map((sec) => {
                const clips = sec / 8;
                return (
                  <button
                    key={sec}
                    onClick={() => setProject(p => ({ ...p, videoLength: sec }))}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${project.videoLength === sec
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                      }`}
                  >
                    <span className="text-2xl font-bold mb-1">{sec} วิ</span>
                    <span className="text-xs opacity-60">{clips} คลิปย่อย</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Clip Structure Visualization */}
          <div className="bg-black/30 rounded-xl p-6 border border-white/5 mb-8">
            <label className="block text-sm font-medium text-zinc-400 mb-4">โครงสร้างคลิป:</label>
            <div className="flex items-start gap-4">
              {/* Selected Image Preview */}
              <div className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                {selectedImage ? (
                  <img src={selectedImage.url} alt="Selected" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-zinc-600" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center py-1">
                  ภาพหลัก
                </div>
              </div>

              {/* Clips Timeline */}
              <div className="flex-1 grid grid-cols-3 gap-2">
                {Array.from({ length: clipCount }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="h-20 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center relative overflow-hidden group">
                      <VideoIcon className="w-6 h-6 text-zinc-600 group-hover:text-primary transition-colors" />
                      <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                        {i + 1}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-white font-medium">คลิป {i + 1}</div>
                      <div className="text-[10px] text-zinc-500">8 วินาที</div>
                    </div>
                  </div>
                ))}
                {/* Empty slots for visual consistency if less than 3 clips */}
                {Array.from({ length: 3 - clipCount }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex flex-col gap-2 opacity-30">
                    <div className="h-20 rounded-lg bg-zinc-900 border border-zinc-800 border-dashed flex items-center justify-center">
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white/5 rounded-xl">
            <div>
              <div className="text-xs text-zinc-400 mb-1">จำนวนคลิปย่อย</div>
              <div className="text-lg font-bold text-white">{clipCount} คลิป</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">ความยาวรวม</div>
              <div className="text-lg font-bold text-white">{project.videoLength} วินาที</div>
            </div>
          </div>

          {/* Detailed Cost Breakdown */}
          <div className="space-y-3 border-t border-white/10 pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">ค่าสร้างภาพ (3 ภาพ)</span>
              <span className="text-zinc-300">{voiceoverCost.toFixed(1)} เครดิต</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">ค่าสร้างวิดีโอ ({clipCount} × {COSTS.VIDEO} เครดิต)</span>
              <span className="text-zinc-300">{videoCost.toFixed(1)} เครดิต</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">ค่าพากย์ดิจิทัล (1 + {clipCount * COSTS.DIGITAL_VOICE} เครดิต)</span>
              <span className="text-zinc-300">{digitalVoiceCost.toFixed(1)} เครดิต</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <span className="font-semibold text-white">รวมทั้งหมด</span>
              <span className="text-xl font-bold text-accent">{totalCost.toFixed(1)} เครดิต</span>
            </div>
          </div>

          {/* Helper Message */}
          <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400 text-center">
              ระบบจะดึง frame สุดท้ายต่อคลิปถัดไป ทำให้ตัวละครต่อเนื่องตลอดคลิป
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setProject(p => ({ ...p, step: 3 }))} className="text-zinc-400 hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
          </button>
          <button
            onClick={handleFinalGenerate}
            disabled={credits < totalCost || !selectedImage}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <VideoIcon className="w-4 h-4" /> สร้างคลิป ({totalCost.toFixed(1)} เครดิต)
          </button>
        </div>

        {credits < totalCost && (
          <p className="text-red-400 text-center mt-4 text-sm">
            เครดิตไม่พอ ต้องการ {totalCost.toFixed(1)} แต่มี {credits.toFixed(1)}
          </p>
        )}
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
      <h3 className="text-2xl font-bold text-white mb-2">กำลังสร้างวิดีโอ...</h3>
      <p className="text-zinc-400 max-w-md">
        กำลังสร้างคลิปและเชื่อมต่อเข้าด้วยกัน ใช้เวลาประมาณ 1-2 นาทีต่อคลิป กรุณาอย่าปิดหน้าต่างนี้
      </p>
      <div className="mt-8 p-4 bg-surface rounded-xl border border-white/5 w-full">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-zinc-300">
            กำลังสร้างคลิป {generationProgress.current} จาก {generationProgress.total}
          </span>
          <span className="text-primary animate-pulse">กำลังประมวลผล...</span>
        </div>
        <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="max-w-4xl mx-auto animate-fade-in flex flex-col items-center">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">สร้างสำเร็จ! 🎉</h2>
        <p className="text-zinc-400">วิดีโอ TikTok ของคุณพร้อมใช้งานแล้ว</p>
      </div>

      <div className="w-full bg-surface border border-white/5 rounded-3xl p-8 mb-8 flex flex-col md:flex-row gap-8 items-center">

        {/* Video Player */}
        <div className="w-full md:w-1/2">
          <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {resultVideo ? (
              <video
                src={resultVideo.url}
                controls
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                <VideoIcon className="w-12 h-12 mb-4 opacity-50" />
                <p>วิดีโอสไตล์ UGC</p>
                <p className="text-xs mt-2">คนจริงถือสินค้า + เสียงบรรยาย</p>
              </div>
            )}

            {/* Video Info Overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center gap-4 text-xs text-zinc-300">
                <span>9:16</span>
                <span>•</span>
                <span>{project.videoLength} วินาที</span>
                <span>•</span>
                <span>พร้อมเสียง</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info & Actions */}
        <div className="w-full md:w-1/2 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">รายละเอียดวิดีโอ</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Box className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-zinc-300">สินค้า</div>
                  <div className="text-sm text-white">{project.product.name}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-zinc-300">ตัวละคร</div>
                  <div className="text-sm text-white">
                    {project.character.gender === 'male' ? 'ชาย' : 'หญิง'},
                    {' '}{ETHNICITIES.find(e => e.id === project.character.ethnicity)?.label}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Film className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-zinc-300">ความยาว</div>
                  <div className="text-sm text-white">{project.videoLength} วินาที ({project.videoLength / 8} คลิป)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Music className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-zinc-300">สคริปต์</div>
                  <div className="text-sm text-zinc-400 line-clamp-2">{project.script}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {resultVideo && (
              <a
                href={resultVideo.url}
                download={`tiktok-${project.product.name}-${Date.now()}.mp4`}
                className="w-full bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                ดาวน์โหลดวิดีโอ
              </a>
            )}
            <button
              onClick={resetFlow}
              className="w-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
            >
              <RotateCcw className="w-5 h-5" />
              สร้างวิดีโอใหม่
            </button>
          </div>

          {/* Tips */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400">
              💡 <strong>เคล็ดลับ:</strong> วิดีโอนี้พร้อมอัพโหลดไปยัง TikTok, Facebook, Instagram หรือแพลตฟอร์มอื่นๆ ได้ทันที!
            </p>
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
