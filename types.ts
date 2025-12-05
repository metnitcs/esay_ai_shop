
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
  url?: string; // Optional URL from TikTok Shop/Shopee
  productType?: 'skincare' | 'beauty' | 'supplement' | 'food' | 'fashion' | 'tech' | 'home' | 'default';
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
  referenceType?: 'product' | 'ai' | 'upload'; // Reference image selection
  referenceImage?: {
    data: string;
    mimeType: string;
    preview: string;
  } | null;
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

// Comic/Cartoon Creator Types
export type ComicLayout = '4-panel' | '2-panel-vertical' | '3-panel' | '4-panel-manga';
export type ArtStyle = 'anime' | 'manga' | 'western' | 'chibi' | 'realistic' | 'sketch';
export type ColorMode = 'color' | 'blackwhite';

export interface ComicCharacter {
  id: string;
  name: string;
  description: string; // Physical appearance, personality, traits
  visualReference?: {
    data: string; // base64 image data
    mimeType: string;
    preview: string; // data URL for preview
  };
  createdAt: number;
}

export interface ComicPanel {
  panelNumber: number;
  prompt: string; // AI-generated or user-edited prompt for this panel
  generatedImageUrl?: string;
}

export interface ComicProject {
  step: number; // 1: Setup, 2: Characters, 3: Story, 4: Generate, 5: Result
  layout: ComicLayout;
  artStyle: ArtStyle;
  colorMode: ColorMode;
  storyPrompt: string; // User's initial story idea
  selectedCharacters: ComicCharacter[]; // Characters to use in this comic
  panels: ComicPanel[];
  generatedPanels: GeneratedAsset[];
}

// Window interface extension for AI Studio key selection
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}