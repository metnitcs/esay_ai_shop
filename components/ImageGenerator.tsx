import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, AlertCircle, Upload, X, Download } from 'lucide-react';
import { IMAGE_ASPECT_RATIOS, COSTS } from '../constants';
import { generateImage } from '../services/geminiService';
import { AssetType, GeneratedAsset } from '../types';

interface ImageGeneratorProps {
  credits: number;
  deductCredits: (amount: number) => void;
  addAsset: (asset: GeneratedAsset) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ credits, deductCredits, addAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const base64String = base64data.split(',')[1];

      setReferenceImage({
        data: base64String,
        mimeType: file.type,
        preview: base64data
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (credits < COSTS.IMAGE) {
      setError(`Insufficient credits. You need ${COSTS.IMAGE} credits.`);
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateImage(
        prompt,
        aspectRatio,
        referenceImage ? { data: referenceImage.data, mimeType: referenceImage.mimeType } : undefined
      );

      const newAsset: GeneratedAsset = {
        id: crypto.randomUUID(),
        type: AssetType.IMAGE,
        url: imageUrl,
        prompt: prompt,
        createdAt: Date.now(),
        aspectRatio: aspectRatio
      };

      addAsset(newAsset);
      deductCredits(COSTS.IMAGE);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <ImageIcon className="w-6 h-6 text-primary" />
          </div>
          Image Generation
        </h2>
        <p className="text-zinc-400">Transform text into high-fidelity visuals using Gemini 3 Pro.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-white/5 rounded-2xl p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic cyberpunk city with neon lights, rain-slicked streets, cinematic lighting..."
              className="w-full h-40 bg-background border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
            />

            {/* Reference Image Upload */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">รูปอ้างอิง (ไม่บังคับ)</label>
              {referenceImage ? (
                <div className="relative">
                  <img
                    src={referenceImage.preview}
                    alt="Reference"
                    className="w-full h-32 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                  <span className="text-sm text-zinc-500">อัปโหลดรูปเพื่อใช้เป็นแรงบันดาลใจ</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                💡 AI จะใช้รูปนี้เป็น reference สำหรับสไตล์และองค์ประกอบ
              </p>
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-zinc-500">Cost: {COSTS.IMAGE} Credits</span>
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || credits < COSTS.IMAGE}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dreaming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Image Display */}
          {generatedImage && (
            <div className="bg-surface border border-white/5 rounded-2xl p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Generated Image</h3>
                <button
                  onClick={handleDownload}
                  className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/80 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full h-auto rounded-xl border border-white/10"
              />
              <p className="text-xs text-zinc-500 mt-3">
                ✅ Image saved to Gallery
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`px-3 py-2 rounded-lg text-xs border transition-all ${aspectRatio === ratio.value
                          ? 'bg-primary/20 border-primary text-white'
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

          <div className="bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-primary mb-2">Pro Tip</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              For best results with Gemini 3 Pro, be descriptive about lighting (e.g., "cinematic lighting", "volumetric fog") and style (e.g., "oil painting", "photorealistic"). Upload a reference image to guide the style!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;