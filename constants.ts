
export const COSTS = {
  IMAGE: 5,
  VIDEO: 25, // per 8s clip
  ANALYSIS: 2,
  TIKTOK_GENERATION: 35, // Bundle cost estimate
  VOICEOVER: 0.2, // per image
  DIGITAL_VOICE: 5 // base + per clip
};

export const MODELS = {
  IMAGE: 'gemini-3-pro-image-preview', // High fidelity for "Ag0" feel
  VIDEO: 'veo-3.1-fast-generate-preview', // Fast video generation
  ANALYSIS: 'gemini-3-pro-preview' // Complex text/multimodal tasks
};

export const IMAGE_ASPECT_RATIOS = [
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Portrait (2:3)', value: '2:3' },
  { label: 'Landscape (3:2)', value: '3:2' },
  { label: 'Vertical (3:4)', value: '3:4' },
  { label: 'Classic (4:3)', value: '4:3' },
  { label: 'Story (9:16)', value: '9:16' },
  { label: 'Cinema (16:9)', value: '16:9' },
  { label: 'Ultrawide (21:9)', value: '21:9' },
];

export const VIDEO_ASPECT_RATIOS = [
  { label: 'Landscape (16:9)', value: '16:9' },
  { label: 'Portrait (9:16)', value: '9:16' },
];

// Character Options
export const ETHNICITIES = [
  { id: 'thai', label: 'Thai' },
  { id: 'korean', label: 'Korean' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'western', label: 'Western' }
];

export const SKIN_TONES = [
  { id: 'fair', label: 'Fair' },
  { id: 'tan', label: 'Tan' },
  { id: 'two-tone', label: 'Two-tone' },
  { id: 'dark', label: 'Dark' }
];

export const BODY_TYPES = [
  { id: 'slim', label: 'Slim' },
  { id: 'normal', label: 'Normal' },
  { id: 'plump', label: 'Plump' }
];

export const CAPTION_STYLES = [
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'pastel', label: 'Pastel' }
];
