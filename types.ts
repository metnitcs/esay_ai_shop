
export interface UserCredits {
  available: number;
  totalUsed: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  credits: number;
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface GeneratedAsset {
  id: string;
  type: AssetType;
  url: string;
  prompt: string;
  createdAt: number;
  aspectRatio?: string;
  userId?: string; // Added for Supabase
}

export interface GenerationConfig {
  prompt: string;
  aspectRatio: string;
  negativePrompt?: string;
}

// TikTok Creator Types
export interface ProductInfo {
  name: string;
  description: string;
  price: string;
  targetAudience: string;
  image: {
    data: string;
    mimeType: string;
    preview: string;
  } | null;
}

export interface CharacterInfo {
  gender: string;
  ethnicity: string;
  skinTone: string;
  bodyType: string;
  caption: {
    enabled: boolean;
    text: string;
    style: string;
    position: string;
  };
}

export interface TikTokProject {
  step: number;
  product: ProductInfo;
  character: CharacterInfo;
  script: string;
  generatedImages: GeneratedAsset[];
  selectedImageIds: string[];
  videoLength: 8 | 16 | 24;
}

// Window interface extension for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}