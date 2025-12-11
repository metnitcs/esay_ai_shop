import { ComicCharacter } from '../types';
import { generateId } from './uuid';

const STORAGE_KEY = 'esay_ai_comic_characters';

/**
 * Get all saved characters from localStorage
 */
export const getSavedCharacters = (): ComicCharacter[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading characters:', error);
        return [];
    }
};

/**
 * Save a new character to library
 */
export const saveCharacter = (character: Omit<ComicCharacter, 'id' | 'createdAt'>): ComicCharacter => {
    const newCharacter: ComicCharacter = {
        ...character,
        id: generateId(),
        createdAt: Date.now(),
    };

    const characters = getSavedCharacters();
    characters.push(newCharacter);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));

    return newCharacter;
};

/**
 * Update existing character
 */
export const updateCharacter = (id: string, updates: Partial<ComicCharacter>): void => {
    const characters = getSavedCharacters();
    const index = characters.findIndex(c => c.id === id);

    if (index !== -1) {
        characters[index] = { ...characters[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    }
};

/**
 * Delete character from library
 */
export const deleteCharacter = (id: string): void => {
    const characters = getSavedCharacters();
    const filtered = characters.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};
