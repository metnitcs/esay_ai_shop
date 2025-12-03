import React, { useState, useRef } from 'react';
import { ScanEye, Upload, X, Loader2, AlertCircle, Bot } from 'lucide-react';
import { COSTS } from '../constants';
import { analyzeImage } from '../services/geminiService';

interface ImageAnalyzerProps {
  credits: number;
  deductCredits: (amount: number) => void;
}

const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ credits, deductCredits }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string, preview: string} | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size should be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setSelectedImage({
          data: base64Data,
          mimeType: file.type,
          preview: base64String
        });
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError("Please upload an image to analyze.");
      return;
    }
    if (credits < COSTS.ANALYSIS) {
      setError(`Insufficient credits. You need ${COSTS.ANALYSIS} credits.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = await analyzeImage(prompt, { data: selectedImage.data, mimeType: selectedImage.mimeType });
      setResult(text);
      deductCredits(COSTS.ANALYSIS);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <ScanEye className="w-6 h-6 text-purple-400" />
          </div>
          Image Intelligence
        </h2>
        <p className="text-zinc-400">Analyze content, extract details, or get creative descriptions using Gemini 3 Pro.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Column */}
        <div className="space-y-6">
          <div className="bg-surface border border-white/5 rounded-2xl p-6">
            
            {/* Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Upload Image</label>
              {!selectedImage ? (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 hover:bg-white/5 transition-all group"
                 >
                   <Upload className="w-8 h-8 text-zinc-500 group-hover:text-purple-400 mb-3" />
                   <span className="text-sm text-zinc-400 font-medium">Click to upload</span>
                   <span className="text-xs text-zinc-600 mt-1">PNG, JPG, WebP up to 10MB</span>
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                   />
                 </div>
               ) : (
                 <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 group bg-black">
                    <img 
                      src={selectedImage.preview} 
                      className="w-full h-full object-contain" 
                      alt="To Analyze" 
                    />
                    <button 
                      onClick={() => { setSelectedImage(null); setResult(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>
               )}
            </div>

            {/* Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Instruction (Optional)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what's happening in this image... or What styles are used here?"
                className="w-full h-24 bg-background border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
              />
            </div>

            <div className="flex justify-between items-center">
               <span className="text-xs text-zinc-500">Cost: {COSTS.ANALYSIS} Credits</span>
               <button
                onClick={handleAnalyze}
                disabled={loading || !selectedImage || credits < COSTS.ANALYSIS}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <ScanEye className="w-4 h-4" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
            
             {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center space-x-2 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Output Column */}
        <div className="h-full">
           <div className="bg-surface border border-white/5 rounded-2xl p-6 h-full min-h-[400px] flex flex-col">
              <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-white/5">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Analysis Result</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {result ? (
                  <div className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap">
                    {result}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50">
                    <ScanEye className="w-12 h-12 mb-3" />
                    <p>Result will appear here</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;