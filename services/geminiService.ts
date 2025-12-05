
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

  // Try multiple paths to extract video URI
  let videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

  // Alternative path 1: Check if it's directly in generatedVideos
  if (!videoUri && operation.response?.generatedVideos?.[0]?.uri) {
    videoUri = operation.response.generatedVideos[0].uri;
  }

  // Alternative path 2: Check if it's in a different structure
  if (!videoUri && operation.response?.videos?.[0]?.uri) {
    videoUri = operation.response.videos[0].uri;
  }

  if (!videoUri) {
    console.error("Full operation response:", JSON.stringify(operation, null, 2));
    console.error("Response structure:", {
      hasResponse: !!operation.response,
      hasGeneratedVideos: !!operation.response?.generatedVideos,
      generatedVideosLength: operation.response?.generatedVideos?.length,
      firstVideoKeys: operation.response?.generatedVideos?.[0] ? Object.keys(operation.response.generatedVideos[0]) : [],
    });
    throw new Error("Video generation completed but no URI was returned. Check console for response structure details.");
  }

  console.log("Video URI found:", videoUri);

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

export const generateScript = async (productName: string, productDesc: string, targetAudience: string, price?: string, characterGender?: string, characterEthnicity?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let prompt = `เขียนสคริปต์วิดีโอ TikTok/UGC สำหรับสินค้าชื่อ "${productName}"
  รายละเอียดสินค้า: "${productDesc}"
  กลุ่มเป้าหมาย: "${targetAudience}"`;

  if (price) {
    prompt += `\n  ราคา: "${price}"`;
  }

  if (characterGender && characterEthnicity) {
    prompt += `\n  ผู้นำเสนอ: ${characterGender === 'female' ? 'ผู้หญิง' : 'ผู้ชาย'} ${characterEthnicity === 'thai' ? 'ไทย' : characterEthnicity}`;
  }

  prompt += `
  
  ให้เขียนเฉพาะ "คำพูด" ที่จะใช้พูดในวิดีโอเท่านั้น ไม่ต้องมีหัวข้อ ไม่ต้องมีคำอธิบาย ไม่ต้องแบ่งส่วน
  ความยาว: ไม่เกิน 30 วินาที (ประมาณ 60-80 คำ)
  ภาษา: ไทยที่เป็นกันเอง สไตล์ TikTok ดึงดูดความสนใจ
  ถ้ามีราคาให้กล่าวถึงในสคริปต์ด้วย
  
  ตัวอย่างรูปแบบที่ต้องการ:
  "สวัสดีค่ะ! วันนี้มาแนะนำเซรั่มวิตามินซีที่ใช้ดีมากๆ ผิวกระจ่างใสขึ้นจริง ราคาแค่ 990 บาท ลองดูนะคะ"
  
  ห้าม: ใส่หัวข้อ "ส่วนที่ 1", "ส่วนที่ 2", วงเล็บ [], คำแนะนำ, หรือคำอธิบายใดๆ`;

  const response = await ai.models.generateContent({
    model: MODELS.ANALYSIS, // Using the text model
    contents: prompt
  });

  return response.text || "ไม่สามารถสร้างสคริปต์ได้";
};

/**
 * Generate panel-by-panel story breakdown for comics
 * Uses Gemini 2.0 Flash to break down a story into panel descriptions
 */
export const generatePanelBreakdown = async (
  storyPrompt: string,
  numPanels: number,
  characters: { name: string; description: string }[]
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const characterList = characters.length > 0
    ? characters.map(c => `${c.name}: ${c.description}`).join(', ')
    : 'Create appropriate characters for this story';

  let prompt = `You are a professional comic book writer specializing in comedy and gag comics.

Break down this story into EXACTLY ${numPanels} panels for a ${numPanels === 4 ? '4-koma (four-panel)' : numPanels === 3 ? 'three-panel' : numPanels === 2 ? 'two-panel' : `${numPanels}-panel`} comedy comic.

Story: ${storyPrompt}

Characters: ${characterList}

`;

  // Add structure guidance based on panel count
  if (numPanels === 4) {
    prompt += `Follow the classic 4-koma structure:
1. Setup (起): Establish the scene and characters in a normal situation
2. Development (承): Introduce the conflict or unusual element
3. Turn/Twist (転): The unexpected twist or escalation
4. Conclusion/Punchline (結): The comedic payoff or resolution

`;
  } else if (numPanels === 3) {
    prompt += `Follow this 3-panel structure:
1. Setup: Establish the scene
2. Conflict: The problem or twist
3. Punchline: The comedic conclusion

`;
  } else if (numPanels === 2) {
    prompt += `Follow this 2-panel structure:
1. Setup: Normal situation
2. Punchline: The twist or comedic payoff

`;
  }

  prompt += `For each panel, provide a clear, visual description focusing on:
- Character actions and expressions (be specific and exaggerated for comedy)
- Setting and background (keep simple but supportive)
- Key visual elements that drive the joke
- Emotional tone and comedic timing

IMPORTANT: 
- Write all descriptions in THAI language (ภาษาไทย)
- Return ONLY a valid JSON array of exactly ${numPanels} strings, each describing one panel
- Do NOT include any markdown formatting, code blocks, or explanations
- Just the raw JSON array

Example format: ["คำอธิบาย panel 1 เป็นภาษาไทย", "คำอธิบาย panel 2 เป็นภาษาไทย", ...]`;

  const response = await ai.models.generateContent({
    model: MODELS.ANALYSIS,
    contents: prompt
  });

  const text = response.text || '';

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length === numPanels) {
      return parsed;
    }
  } catch (e) {
    // If JSON parsing fails, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length === numPanels) {
          return parsed;
        }
      } catch (e2) {
        // Continue to fallback
      }
    }
  }

  // Fallback: split by lines and take first numPanels
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.slice(0, numPanels).map(line => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, ''));
};

/**
 * Generate a single comic panel image
 * Uses Gemini 3 Pro Image for high-quality comic illustrations
 */
export const generateComicPanel = async (
  panelPrompt: string,
  aspectRatio: string = '1:1',
  characterReferences?: { data: string; mimeType: string }[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [];

  // Add character reference images if provided
  if (characterReferences && characterReferences.length > 0) {
    characterReferences.forEach(ref => {
      parts.push({
        inlineData: {
          data: ref.data,
          mimeType: ref.mimeType
        }
      });
    });

    // Add context about reference images
    parts.push({
      text: `Using the provided ${characterReferences.length} character reference image(s) to maintain character consistency. ${panelPrompt}`
    });
  } else {
    parts.push({ text: panelPrompt });
  }

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
    throw new Error("Failed to generate comic panel. No image data returned.");
  }

  return imageUrl;
};
