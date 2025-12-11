
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateId } from './uuid';

// R2 Configuration
const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
const publicDomain = import.meta.env.VITE_R2_PUBLIC_DOMAIN;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
    requestHandler: {
        requestTimeout: 30000, // 30 seconds
        connectionTimeout: 10000, // 10 seconds
    },
});

/**
 * Uploads a Base64 image string to Cloudflare R2 Storage with user-specific organization.
 * @param base64Data The base64 string
 * @param userId The user ID for organizing files
 * @param assetType The type of asset (images, videos, characters, etc.)
 * @param folder Additional folder path (optional)
 * @returns The public URL of the uploaded image
 */
export const uploadBase64Image = async (
    base64Data: string,
    userId: string,
    assetType: string = 'images',
    folder?: string
): Promise<string> => {
    console.log('R2 Config:', { accountId, bucketName, publicDomain });
    
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error('R2 credentials missing. Check your environment variables.');
    }

    try {
        // 1. Convert Base64 to Buffer/Uint8Array
        const base64Content = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data;

        // Basic mime type detection
        let mimeType = 'image/png';
        if (base64Data.includes('data:')) {
            const match = base64Data.match(/data:([^;]+);/);
            if (match) mimeType = match[1];
        }

        // Convert to byte array
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // 2. Generate unique filename with user organization
        const fileExtension = mimeType.split('/')[1] || 'png';
        const timestamp = Date.now();
        const uniqueId = generateId();
        
        // Organize files: users/{userId}/{assetType}/{folder?}/{timestamp}_{uniqueId}.ext
        let filePath = `users/${userId}/${assetType}`;
        if (folder) {
            filePath += `/${folder}`;
        }
        const filename = `${filePath}/${timestamp}_${uniqueId}.${fileExtension}`;
        
        console.log('Uploading to R2:', { filename, mimeType, size: byteArray.length });

        // 3. Upload to R2
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: byteArray,
            ContentType: mimeType,
        });

        console.log('Starting R2 upload...');
        const uploadPromise = r2Client.send(command);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000)
        );
        
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        console.log('R2 Upload Success:', result);

        // 4. Return Public URL
        const finalUrl = publicDomain 
            ? `${publicDomain}/${filename}`
            : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${filename}`;
            
        console.log('Final URL:', finalUrl);
        return finalUrl;

    } catch (error: any) {
        console.error('Error uploading to R2:', error);
        console.log('Falling back to base64 storage');
        // Fallback: return base64 data URL if R2 upload fails
        return base64Data;
    }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use uploadBase64Image with userId parameter instead
 */
export const uploadBase64ImageLegacy = async (
    base64Data: string,
    _bucket: string = 'assets',
    folder: string = 'generated'
): Promise<string> => {
    // Use 'anonymous' as fallback user for legacy calls
    return uploadBase64Image(base64Data, 'anonymous', 'legacy', folder);
};

/**
 * Upload different types of assets with proper organization
 */
export const uploadUserAsset = async (
    base64Data: string,
    userId: string,
    assetType: 'images' | 'videos' | 'characters' | 'tiktok' | 'comics',
    metadata?: { name?: string; prompt?: string }
): Promise<string> => {
    const folder = metadata?.name ? metadata.name.replace(/[^a-zA-Z0-9]/g, '_') : undefined;
    return uploadBase64Image(base64Data, userId, assetType, folder);
};
