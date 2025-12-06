import { ComicProject, ComicCharacter } from '../types';
import { ART_STYLES, COLOR_MODES, COMIC_LAYOUTS } from '../constants';

/**
 * Build a complete comic prompt for generating a SINGLE IMAGE with multiple panels
 * This is different from buildComicPanelPrompt which was for individual panels
 */
export const buildFullComicPrompt = (project: ComicProject): string => {
    const layout = COMIC_LAYOUTS.find(l => l.id === project.layout);
    const artStyle = ART_STYLES.find(s => s.id === project.artStyle);
    const colorMode = COLOR_MODES.find(m => m.id === project.colorMode);

    // Build character descriptions
    const characterDescs = project.selectedCharacters
        .map(char => `${char.name} (${char.description})`)
        .join(', ');

    // Build panel descriptions
    const panelDescriptions = project.panels
        .map((panel, idx) => `Panel ${idx + 1}: ${panel.prompt}`)
        .join('\n\n');

    const prompt = `Create a complete comic strip as a SINGLE IMAGE with ${layout?.panels} panels.

LAYOUT: ${layout?.promptLayout}

ART STYLE: ${artStyle?.promptKeywords}
COLOR: ${colorMode?.promptKeywords}

CHARACTERS: ${characterDescs || 'Create appropriate characters for this story'}

STORY PANELS:
${panelDescriptions}

🔴 CRITICAL TEXT REQUIREMENTS - READ CAREFULLY:
- ALL text in speech bubbles MUST be in THAI language (ภาษาไทย) ONLY
- ALL dialogue MUST be in THAI language (ภาษาไทย) ONLY  
- ALL sound effects MUST use THAI onomatopoeia (e.g., "ปัง!" not "BANG!", "โครม!" not "CRASH!")
- NO English words allowed anywhere in the comic
- Use clear, readable Thai fonts for all text
- Thai text must be grammatically correct and natural
- Make sure Thai characters are properly rendered and legible

TECHNICAL REQUIREMENTS:
- This must be a SINGLE IMAGE containing all ${layout?.panels} panels
- Each panel should be clearly separated with borders/gutters
- ${layout?.promptLayout}
- Maintain consistent character design across ALL panels
- Professional comic book quality
- Clear visual storytelling
- ${project.layout === '4-panel-manga' ? 'Manga reading order (right to left)' : 'Standard reading order (left to right)'}
- Expressive character poses and facial expressions
- Exaggerated reactions for comedic effect
- Clean, readable composition in each panel
- Include visual comedy elements (sweat drops, shock lines, speed lines, etc.)
- Keep backgrounds simple but supportive

ABSOLUTE REQUIREMENT: Every single word of text visible in this comic MUST be in Thai language (ภาษาไทย). This is non-negotiable!

CRITICAL: Generate this as ONE COMPLETE IMAGE with all panels arranged as specified, NOT as separate images.`;

    return prompt;
};
