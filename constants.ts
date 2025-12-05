
export const COSTS = {
  IMAGE: 5,
  VIDEO: 25,
  ANALYSIS: 2,
  TIKTOK_GENERATION: 35, // Bundle cost estimate
  VOICEOVER: 0.2, // per image
  DIGITAL_VOICE: 5, // base + per clip
  COMIC_PANEL: 5 // per comic (single multi-panel image)
};

export const MODELS = {
  IMAGE: 'gemini-3-pro-image-preview', // High fidelity for "Ag0" feel
  VIDEO: 'veo-3.0-fast-generate-001', // Fast video generation
  ANALYSIS: 'gemini-2.0-flash' // Complex text/multimodal tasks
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

// Product Categories for Smart Prompt Generation
export const PRODUCT_TYPES = [
  { id: 'skincare', label: 'สกินแคร์/ดูแลผิว', action: 'applying and demonstrating', thaiLabel: 'ครีมบำรุง/เซรั่ม' },
  { id: 'beauty', label: 'เครื่องสำอาง', action: 'applying and showing results', thaiLabel: 'เมคอัพ/ลิปสติก' },
  { id: 'supplement', label: 'อาหารเสริม/วิตามิน', action: 'unboxing and presenting', thaiLabel: 'วิตามิน/อาหารเสริม' },
  { id: 'food', label: 'อาหาร/เครื่องดื่ม', action: 'tasting and enjoying', thaiLabel: 'ขนม/เครื่องดื่ม' },
  { id: 'fashion', label: 'เสื้อผ้า/แฟชั่น', action: 'wearing and styling', thaiLabel: 'เสื้อผ้า/กระเป๋า' },
  { id: 'tech', label: 'อิเล็กทรอนิกส์', action: 'unboxing and demonstrating features', thaiLabel: 'หูฟัง/สมาร์ทโฟน' },
  { id: 'home', label: 'ของใช้ในบ้าน', action: 'demonstrating usage', thaiLabel: 'เครื่องใช้ไฟฟ้า' },
  { id: 'default', label: 'อื่นๆ', action: 'naturally showcasing and holding', thaiLabel: 'สินค้าทั่วไป' }
];

// Comic Creator Constants - ALL VERTICAL LAYOUTS
export const COMIC_LAYOUTS = [
  {
    id: '4-panel' as const,
    label: '4 ช่อง (แนวตั้ง)',
    panels: 4,
    description: 'เหมาะสำหรับเรื่องสั้น 4-koma style แนวแก๊กตลก (1 ภาพ 4 ช่องแนวตั้ง)',
    gridClass: 'grid-rows-4',
    aspectRatio: '9:16',
    promptLayout: '4 vertical panels in a single image, arranged top to bottom'
  },
  {
    id: '2-panel-vertical' as const,
    label: '2 ช่อง (แนวตั้ง)',
    panels: 2,
    description: 'เหมาะสำหรับ before/after หรือเปรียบเทียบ (1 ภาพ 2 ช่องแนวตั้ง)',
    gridClass: 'grid-rows-2',
    aspectRatio: '9:16',
    promptLayout: '2 vertical panels in a single image, arranged top to bottom'
  },
  {
    id: '3-panel' as const,
    label: '3 ช่อง (แนวตั้ง)',
    panels: 3,
    description: 'เหมาะสำหรับโพสเฟส/IG แนวตั้ง (1 ภาพ 3 ช่องแนวตั้ง)',
    gridClass: 'grid-rows-3',
    aspectRatio: '9:16',
    promptLayout: '3 vertical panels in a single image, arranged top to bottom'
  },
  {
    id: '4-panel-manga' as const,
    label: '4 ช่อง (แบบญี่ปุ่น 2x2)',
    panels: 4,
    description: 'อ่านจากขวาไปซ้าย แนวมังงะ (1 ภาพ 4 ช่อง 2x2 แนวตั้ง)',
    gridClass: 'grid-cols-2 grid-rows-2',
    aspectRatio: '9:16',
    promptLayout: '4 panels in a 2x2 grid in a single vertical image, manga reading order (right to left, top to bottom)'
  },
];

export const ART_STYLES = [
  {
    id: 'anime' as const,
    label: 'อนิเมะ',
    description: 'Japanese anime style, vibrant colors, expressive eyes, clean lines, cel-shaded',
    promptKeywords: 'anime style, vibrant colors, expressive large eyes, clean linework, cel-shaded'
  },
  {
    id: 'manga' as const,
    label: 'มังงะ',
    description: 'Black and white manga style, screentones, dynamic action lines, dramatic shading',
    promptKeywords: 'manga style, black and white, screentones, speed lines, dramatic inking'
  },
  {
    id: 'western' as const,
    label: 'การ์ตูนตะวันตก',
    description: 'Western comic book style, bold outlines, punchy colors, dynamic poses',
    promptKeywords: 'western comic book style, bold black outlines, flat colors, dynamic composition'
  },
  {
    id: 'chibi' as const,
    label: 'ชิบิ (น่ารัก)',
    description: 'Cute chibi style, small proportions, kawaii, exaggerated expressions',
    promptKeywords: 'chibi style, super deformed, cute proportions, kawaii, big head small body'
  },
  {
    id: 'realistic' as const,
    label: 'สมจริง',
    description: 'Semi-realistic illustration style with detailed shading',
    promptKeywords: 'semi-realistic illustration, detailed shading, painterly style'
  },
  {
    id: 'sketch' as const,
    label: 'สเก็ตช์',
    description: 'Hand-drawn sketch style, loose lines, pencil texture',
    promptKeywords: 'hand-drawn sketch, loose pencil lines, rough texture, sketch marks'
  },
];

export const COLOR_MODES = [
  {
    id: 'color' as const,
    label: 'สี',
    description: 'Full color illustration',
    promptKeywords: 'full color, vibrant palette'
  },
  {
    id: 'blackwhite' as const,
    label: 'ขาวดำ',
    description: 'Black and white, grayscale',
    promptKeywords: 'black and white, grayscale, monochrome'
  },
];
