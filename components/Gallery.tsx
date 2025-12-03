import React from 'react';
import { Play, Download, Trash2, Calendar } from 'lucide-react';
import { GeneratedAsset, AssetType } from '../types';

interface GalleryProps {
  assets: GeneratedAsset[];
  deleteAsset: (id: string) => void;
}

const Gallery: React.FC<GalleryProps> = ({ assets, deleteAsset }) => {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No assets yet</h3>
        <p>Start generating images or videos to see them here.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h2 className="text-3xl font-bold text-white mb-8">My Assets</h2>
      
      {/* Masonry-ish Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {assets.map((asset) => (
          <div key={asset.id} className="break-inside-avoid bg-surface border border-white/5 rounded-2xl overflow-hidden group hover:border-white/20 transition-all duration-300 relative">
            
            {/* Asset Content */}
            <div className="relative">
              {asset.type === AssetType.IMAGE ? (
                <img src={asset.url} alt={asset.prompt} className="w-full h-auto object-cover" />
              ) : (
                <div className="relative w-full aspect-video bg-black">
                  <video src={asset.url} controls className="w-full h-full object-cover" />
                </div>
              )}
              
              {/* Overlay for Image Type Actions (Video has controls) */}
              {asset.type === AssetType.IMAGE && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                   <a 
                    href={asset.url} 
                    download={`ag0-${asset.id}.png`}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                   >
                     <Download className="w-5 h-5" />
                   </a>
                </div>
              )}
            </div>

            {/* Info Footer */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                    asset.type === AssetType.VIDEO 
                      ? 'bg-accent/20 text-accent' 
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {asset.type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <button 
                  onClick={() => deleteAsset(asset.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {asset.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;