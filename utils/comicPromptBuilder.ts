import { ComicProject, ComicCharacter, ArtStyle, ColorMode } from '../types';
import { ART_STYLES, COLOR_MODES } from '../constants';

/**
 * Get art style prompt keywords
 */
export const getArtStyleKeywords = (artStyle: ArtStyle): string => {
    const style = ART_STYLES.find(s => s.id === artStyle);
    return style?.promptKeywords || '';
};

/**
 * Get color mode prompt keywords
 */
export const getColorModeKeywords = (colorMode: ColorMode): string => {
    const mode = COLOR_MODES.find(m => m.id === colorMode);
    return mode?.promptKeywords || '';
};

/**
 * Build character description for prompt
 */
export const buildCharacterDescription = (character: ComicCharacter): string => {
    return `${character.name} (${character.description})`;
};

/**
 * Generate panel-specific prompt based on story and panel position
 * Optimized for comedy/gag comics with 4-koma structure
 */
export const buildComicPanelPrompt = (
    project: ComicProject,
    panelNumber: number,
    totalPanels: number,
    panelStorySegment: string
): string => {
    const artStyleKeywords = getArtStyleKeywords(project.artStyle);
    const colorModeKeywords = getColorModeKeywords(project.colorMode);

    // Build character list
    const characterDescs = project.selectedCharacters
        .map(char => buildCharacterDescription(char))
        .join(', ');

    // Panel position context for 4-koma comedy structure
    let panelContext = '';
    let emotionalDirection = '';

    if (totalPanels === 4) {
        // Classic 4-koma structure: Setup -> Development -> Turn -> Conclusion
        if (panelNumber === 1) {
            panelContext = 'Panel 1 (Setup): Establish the scene and characters in a normal situation.';
            emotionalDirection = 'Calm, neutral expressions.';
        } else if (panelNumber === 2) {
            panelContext = 'Panel 2 (Development): Introduce the conflict or unusual element.';
            emotionalDirection = 'Curious or slightly concerned expressions.';
        } else if (panelNumber === 3) {
            panelContext = 'Panel 3 (Turn/Twist): The unexpected twist or escalation.';
            emotionalDirection = 'Shocked, surprised, or exaggerated reaction.';
        } else {
            panelContext = 'Panel 4 (Punchline/Conclusion): The comedic payoff or resolution.';
            emotionalDirection = 'Extreme reaction, deadpan, or comedic resolution expression.';
        }
    } else if (totalPanels === 3) {
        // 3-panel structure: Setup -> Conflict -> Punchline
        if (panelNumber === 1) {
            panelContext = 'Panel 1 (Setup): Establish the scene.';
            emotionalDirection = 'Normal, calm expressions.';
        } else if (panelNumber === 2) {
            panelContext = 'Panel 2 (Conflict): The problem or twist.';
            emotionalDirection = 'Surprised or concerned expressions.';
        } else {
            panelContext = 'Panel 3 (Punchline): The comedic conclusion.';
            emotionalDirection = 'Exaggerated comedic reaction.';
        }
    } else if (totalPanels === 2) {
        // 2-panel structure: Setup -> Punchline
        if (panelNumber === 1) {
            panelContext = 'Panel 1 (Setup): Normal situation.';
            emotionalDirection = 'Calm expressions.';
        } else {
            panelContext = 'Panel 2 (Punchline): The twist or comedic payoff.';
            emotionalDirection = 'Exaggerated reaction or deadpan humor.';
        }
    } else {
        panelContext = `Panel ${panelNumber} of ${totalPanels}.`;
        emotionalDirection = 'Appropriate expressions for the scene.';
    }

    const prompt = `Single comic panel illustration for a comedy/gag comic. ${panelContext}

Art Style: ${artStyleKeywords}
Color: ${colorModeKeywords}

Characters: ${characterDescs || 'Create appropriate characters for this scene'}

Scene Description: ${panelStorySegment}

Emotional Direction: ${emotionalDirection}

Technical Requirements:
- Single panel composition, clear panel borders
- Dynamic, expressive character poses and facial expressions
- Exaggerated reactions for comedic effect
- Clean, readable composition
- Consistent character design (maintain same character appearance across all panels)
- ${project.layout === '4-panel-manga' ? 'Manga reading direction (right to left)' : 'Standard reading direction (left to right)'}
- Professional comic book quality
- Clear visual storytelling
- Leave space for speech bubbles if needed
- Focus on visual humor and timing

Style Notes:
- Emphasize expressive eyes and facial features
- Use dynamic angles and perspectives
- Include visual comedy elements (sweat drops, shock lines, etc.)
- Keep backgrounds simple but supportive of the gag`;

    return prompt;
};
