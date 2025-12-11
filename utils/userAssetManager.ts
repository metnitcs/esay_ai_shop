import { supabase } from '../supabaseClient';
import { uploadUserAsset } from './storageUtils';
import { GeneratedAsset, AssetType } from '../types';

/**
 * User Asset Manager - จัดการการอัปโหลดและบันทึก assets ของ user
 */

export interface AssetUploadOptions {
  userId: string;
  asset: GeneratedAsset;
  assetCategory?: 'images' | 'videos' | 'characters' | 'tiktok' | 'comics';
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * อัปโหลดและบันทึก asset ของ user ไปยัง R2 และ database
 */
export const saveUserAsset = async (options: AssetUploadOptions): Promise<string> => {
  const { userId, asset, assetCategory, metadata } = options;
  
  let assetUrl = asset.url;
  
  // อัปโหลดไปยัง R2 ถ้าเป็น base64
  if (assetUrl && assetUrl.startsWith('data:')) {
    // กำหนดประเภท asset
    let category = assetCategory;
    if (!category) {
      if (asset.type === AssetType.VIDEO) {
        category = 'videos';
      } else if (asset.type === AssetType.CHARACTER) {
        category = 'characters';
      } else {
        // ตรวจสอบจาก prompt
        const prompt = asset.prompt?.toLowerCase() || '';
        if (prompt.includes('tiktok') || prompt.includes('ugc')) {
          category = 'tiktok';
        } else if (prompt.includes('comic') || prompt.includes('cartoon')) {
          category = 'comics';
        } else {
          category = 'images';
        }
      }
    }
    
    try {
      assetUrl = await uploadUserAsset(
        assetUrl,
        userId,
        category,
        {
          name: metadata?.name,
          prompt: asset.prompt
        }
      );
    } catch (error) {
      console.error('Failed to upload asset to R2:', error);
      throw new Error('ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    }
  }
  
  // บันทึกลง database
  const dbAsset = {
    id: asset.id,
    user_id: userId,
    type: asset.type,
    url: assetUrl,
    prompt: asset.prompt,
    aspect_ratio: asset.aspectRatio,
    created_at: new Date(asset.createdAt).toISOString(),
    // เพิ่ม metadata ถ้ามี
    ...(metadata?.name && { name: metadata.name }),
    ...(metadata?.description && { description: metadata.description }),
    ...(metadata?.tags && { tags: metadata.tags })
  };
  
  const { error } = await supabase
    .from('assets')
    .insert([dbAsset]);
    
  if (error) {
    console.error('Failed to save asset to database:', error);
    throw new Error('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
  }
  
  return assetUrl;
};

/**
 * ดึง assets ของ user ตามประเภท
 */
export const getUserAssets = async (
  userId: string, 
  assetType?: AssetType,
  limit?: number
): Promise<GeneratedAsset[]> => {
  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (assetType) {
    query = query.eq('type', assetType);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch user assets:', error);
    return [];
  }
  
  return data?.map((asset: any) => ({
    id: asset.id,
    type: asset.type,
    url: asset.url,
    prompt: asset.prompt,
    createdAt: new Date(asset.created_at).getTime(),
    aspectRatio: asset.aspect_ratio,
    userId: asset.user_id
  })) || [];
};

/**
 * ลบ asset ของ user
 */
export const deleteUserAsset = async (userId: string, assetId: string): Promise<void> => {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId)
    .eq('user_id', userId); // ตรวจสอบว่าเป็นของ user นี้จริง
    
  if (error) {
    console.error('Failed to delete asset:', error);
    throw new Error('ไม่สามารถลบไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
  }
};

/**
 * นับจำนวน assets ของ user ตามประเภท
 */
export const getUserAssetCount = async (
  userId: string, 
  assetType?: AssetType
): Promise<number> => {
  let query = supabase
    .from('assets')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);
    
  if (assetType) {
    query = query.eq('type', assetType);
  }
  
  const { count, error } = await query;
  
  if (error) {
    console.error('Failed to count user assets:', error);
    return 0;
  }
  
  return count || 0;
};

/**
 * ดึงสถิติการใช้งานของ user
 */
export const getUserAssetStats = async (userId: string) => {
  const [
    totalAssets,
    imageCount,
    videoCount,
    characterCount
  ] = await Promise.all([
    getUserAssetCount(userId),
    getUserAssetCount(userId, AssetType.IMAGE),
    getUserAssetCount(userId, AssetType.VIDEO),
    getUserAssetCount(userId, AssetType.CHARACTER)
  ]);
  
  return {
    total: totalAssets,
    images: imageCount,
    videos: videoCount,
    characters: characterCount
  };
};