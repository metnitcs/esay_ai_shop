/**
 * Generates a version 4 UUID.
 * Uses crypto.randomUUID() if available, otherwise falls back to a manual implementation.
*/
export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback for environments where crypto.randomUUID is not available (e.g. insecure contexts)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
