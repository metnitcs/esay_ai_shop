
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

export const generateImage = async (prompt: string, aspectRatio: string, referenceImage?: { data: string, mimeType: string }): Promise<string> => {
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
    // When using reference image for product placement, we modify the prompt to be explicit
    parts.push({ text: `Using the first image as a reference product, generate a photorealistic image based on this description: ${prompt}. Ensure the product from the reference image is featured prominently and looks natural.` });
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

  let operation = await ai.models.generateVideos(payload);

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!videoUri) {
    throw new Error("Video generation completed but no URI was returned.");
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
  
  const prompt = `Write a short, catchy TikTok/UGC video script for a product named "${productName}". 
  Product Description: "${productDesc}". 
  Target Audience: "${targetAudience}".
  Keep it under 30 seconds. Split it into 2-3 short, punchy parts suitable for a fast-paced video.
  Format it like: Part 1: [Text], Part 2: [Text]`;

  const response = await ai.models.generateContent({
    model: MODELS.ANALYSIS, // Using the text model
    contents: prompt
  });

  return response.text || "Could not generate script.";
};
