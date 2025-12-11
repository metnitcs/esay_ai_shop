
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateId } from './uuid';

// R2 Configuration
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicDomain = process.env.R2_PUBLIC_DOMAIN;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

/**
 * Uploads a Base64 image string to Cloudflare R2 Storage.
 * @param base64Data The base64 string
 * @param bucket (Ignored - uses environment variable)
 * @param folder The folder path within the bucket (default: 'generated')
 * @returns The public URL of the uploaded image
 */
export const uploadBase64Image = async (
    base64Data: string,
    _bucket: string = 'assets', // Deprecated: we use env bucket
    folder: string = 'generated'
): Promise<string> => {
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

        // 2. Generate unique filename
        const filename = `${folder}/${generateId()}.${mimeType.split('/')[1]}`;

        // 3. Upload to R2
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: byteArray,
            ContentType: mimeType,
        });

        await r2Client.send(command);

        // 4. Return Public URL
        // Requires that the bucket is connected to a custom domain or allowed for public access
        if (publicDomain) {
            return `https://${publicDomain}/${filename}`;
        } else {
            // Fallback if no public domain configured (might not work if bucket is private)
            // Or user can use the R2.dev domain if enabled
            return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${filename}`;
        }

    } catch (error: any) {
        console.error('Error uploading image to R2:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
};
