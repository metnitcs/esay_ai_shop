
import { GoogleGenAI } from "@google/genai";
import { MODELS } from '../constants';

// Helper to check Veo API key requirement
export const checkVeoAuth = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  // Fallback for environments where the window extension isn't present (dev mostly)
  return !!process.env.API_KEY;
};

export const promptVeoAuth = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};

export const generateImage = async (prompt: string, aspectRatio: string, referenceImage?: { data: string, mimeType: string }, secondaryImage?: { data: string, mimeType: string }): Promise<string> => {
  // Always create a new instance to ensure latest keys are used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [];

  if (referenceImage) {
    parts.push({
      inlineData: {
        data: referenceImage.data,
        mimeType: referenceImage.mimeType
      }
    });
  }

  if (secondaryImage) {
    parts.push({
      inlineData: {
        data: secondaryImage.data,
        mimeType: secondaryImage.mimeType
      }
    });
  }

  if (referenceImage || secondaryImage) {
    // When using reference images, we modify the prompt to be explicit
    let contextPrompt = `Using the provided image(s) as reference, generate a photorealistic image based on this description: ${prompt}.`;
    if (referenceImage) contextPrompt += ` The first image is the product to be featured.`;
    if (secondaryImage) contextPrompt += ` The second image is the character reference/style to match.`;

    parts.push({ text: contextPrompt });
  } else {
    parts.push({ text: prompt });
  }

  // Using gemini-3-pro-image-preview for high quality results similar to midjourney/flux
  const response = await ai.models.generateContent({
    model: MODELS.IMAGE,
    contents: {
      parts: parts,
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
      }
    },
  });

  // Extract image
  let imageUrl = '';
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!imageUrl) {
    throw new Error("Failed to generate image. No image data returned.");
  }

  return imageUrl;
};

export const generateVideo = async (prompt: string, aspectRatio: string, image?: { data: string, mimeType: string }): Promise<string> => {
  // Important: Veo requires a specific paid key selection in some environments
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const payload: any = {
    model: MODELS.VIDEO,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio as any,
    }
  };

  // If image is provided, add it to payload
  if (image) {
    payload.image = {
      imageBytes: image.data,
      mimeType: image.mimeType
    };
    // Prompt is optional if image is present, but good to have
    if (prompt) payload.prompt = prompt;
  } else {
    // Prompt is mandatory if no image
    payload.prompt = prompt;
  }

  console.log("Starting video generation...", { prompt, hasImage: !!image });
  let operation = await ai.models.generateVideos(payload);
  console.log("Initial operation:", operation);

  // Polling loop with timeout (e.g., 5 minutes max)
  const startTime = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000;

  while (!operation.done) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error("Video generation timed out after 5 minutes");
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    console.log("Polling video status...");
    operation = await ai.operations.getVideosOperation({ operation: operation });
    console.log("Poll result:", operation);
  }

  if (operation.error) {
    console.error("Video generation operation error:", operation.error);
    throw new Error(`Video generation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

  if (!videoUri) {
    console.error("Full operation response:", JSON.stringify(operation, null, 2));
    throw new Error("Video generation completed but no URI was returned. Check console for details.");
  }

  // Fetch the actual bytes to create a blob URL for playback
  // We must append the API Key manually as per documentation
  const fetchResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await fetchResponse.blob();
  return URL.createObjectURL(blob);
};

export const analyzeImage = async (prompt: string, image: { data: string, mimeType: string }): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: MODELS.ANALYSIS,
    contents: {
      parts: [
        { inlineData: { data: image.data, mimeType: image.mimeType } },
        { text: prompt || "Analyze this image in detail." }
      ]
    }
  });

  return response.text || "No analysis could be generated.";
};

export const generateScript = async (productName: string, productDesc: string, targetAudience: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `เขียนสคริปต์วิดีโอ TikTok/UGC สั้นๆ น่าสนใจสำหรับสินค้าชื่อ "${productName}"
  รายละเอียดสินค้า: "${productDesc}"
  กลุ่มเป้าหมาย: "${targetAudience}"
  
  ให้สคริปต์สั้นกระชับ ไม่เกิน 30 วินาที แบ่งเป็น 2-3 ส่วน เหมาะสำหรับวิดีโอจังหวะเร็ว
  เขียนเป็นภาษาไทยที่เป็นกันเอง สไตล์ TikTok ดึงดูดความสนใจ
  รูปแบบ: ส่วนที่ 1: [ข้อความ], ส่วนที่ 2: [ข้อความ]`;

  const response = await ai.models.generateContent({
    model: MODELS.ANALYSIS, // Using the text model
    contents: prompt
  });

  return response.text || "ไม่สามารถสร้างสคริปต์ได้";
};
