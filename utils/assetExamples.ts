/**
 * ตัวอย่างการใช้งาน User Asset Manager
 * 
 * ไฟล์นี้แสดงตัวอย่างการใช้งานฟังก์ชันต่างๆ ในการจัดการ assets ของ user
 */

import { saveUserAsset, getUserAssets, deleteUserAsset, getUserAssetStats } from './userAssetManager';
import { AssetType, GeneratedAsset } from '../types';
import { generateId } from './uuid';

// ตัวอย่างการบันทึก asset ประเภทต่างๆ

/**
 * บันทึกรูปภาพที่เจนเนอเรตจาก Image Generator
 */
export const saveImageAsset = async (userId: string, imageUrl: string, prompt: string) => {
  const asset: GeneratedAsset = {
    id: generateId(),
    type: AssetType.IMAGE,
    url: imageUrl,
    prompt: prompt,
    createdAt: Date.now(),
    aspectRatio: '1:1',
    userId: userId
  };

  return await saveUserAsset({
    userId,
    asset,
    assetCategory: 'images',
    metadata: {
      name: 'Generated Image',
      description: prompt,
      tags: ['ai-generated', 'image']
    }
  });
};

/**
 * บันทึกวิดีโอ TikTok
 */
export const saveTikTokVideo = async (userId: string, videoUrl: string, productName: string, script: string) => {
  const asset: GeneratedAsset = {
    id: generateId(),
    type: AssetType.VIDEO,
    url: videoUrl,
    prompt: `TikTok Video: ${productName}`,
    createdAt: Date.now(),
    aspectRatio: '9:16',
    userId: userId
  };

  return await saveUserAsset({
    userId,
    asset,
    assetCategory: 'tiktok',
    metadata: {
      name: `TikTok - ${productName}`,
      description: script,
      tags: ['tiktok', 'ugc', 'video', productName.toLowerCase()]
    }
  });
};

/**
 * บันทึกตัวละครการ์ตูน
 */
export const saveComicCharacter = async (userId: string, imageUrl: string, characterName: string, description: string) => {
  const asset: GeneratedAsset = {
    id: generateId(),
    type: AssetType.CHARACTER,
    url: imageUrl,
    prompt: JSON.stringify({ name: characterName, description }),
    createdAt: Date.now(),
    aspectRatio: '1:1',
    userId: userId
  };

  return await saveUserAsset({
    userId,
    asset,
    assetCategory: 'characters',
    metadata: {
      name: characterName,
      description: description,
      tags: ['character', 'comic', 'cartoon']
    }
  });
};

/**
 * บันทึกการ์ตูน/คอมิค
 */
export const saveComicAsset = async (userId: string, imageUrl: string, storyPrompt: string, layout: string) => {
  const asset: GeneratedAsset = {
    id: generateId(),
    type: AssetType.IMAGE,
    url: imageUrl,
    prompt: `Comic (${layout}): ${storyPrompt}`,
    createdAt: Date.now(),
    aspectRatio: layout === '4-panel' ? '1:2' : '1:1',
    userId: userId
  };

  return await saveUserAsset({
    userId,
    asset,
    assetCategory: 'comics',
    metadata: {
      name: `Comic - ${layout}`,
      description: storyPrompt,
      tags: ['comic', 'cartoon', layout, 'ai-generated']
    }
  });
};

// ตัวอย่างการดึงข้อมูล assets

/**
 * ดึง assets ล่าสุดของ user
 */
export const getRecentUserAssets = async (userId: string, limit: number = 10) => {
  return await getUserAssets(userId, undefined, limit);
};

/**
 * ดึงเฉพาะวิดีโอของ user
 */
export const getUserVideos = async (userId: string) => {
  return await getUserAssets(userId, AssetType.VIDEO);
};

/**
 * ดึงเฉพาะรูปภาพของ user
 */
export const getUserImages = async (userId: string) => {
  return await getUserAssets(userId, AssetType.IMAGE);
};

/**
 * ดึงตัวละครการ์ตูนของ user
 */
export const getUserCharacters = async (userId: string) => {
  return await getUserAssets(userId, AssetType.CHARACTER);
};

// ตัวอย่างการใช้งานสถิติ

/**
 * แสดงสถิติการใช้งานของ user
 */
export const displayUserStats = async (userId: string) => {
  const stats = await getUserAssetStats(userId);
  
  console.log(`User ${userId} Statistics:`);
  console.log(`- Total Assets: ${stats.total}`);
  console.log(`- Images: ${stats.images}`);
  console.log(`- Videos: ${stats.videos}`);
  console.log(`- Characters: ${stats.characters}`);
  
  return stats;
};

// ตัวอย่างการลบ assets

/**
 * ลบ asset ของ user (พร้อมตรวจสอบสิทธิ์)
 */
export const removeUserAsset = async (userId: string, assetId: string) => {
  try {
    await deleteUserAsset(userId, assetId);
    console.log(`Asset ${assetId} deleted successfully for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete asset ${assetId}:`, error);
    return false;
  }
};

// ตัวอย่างการจัดระเบียบไฟล์ตาม user

/**
 * โครงสร้างไฟล์ใน R2 จะเป็นดังนี้:
 * 
 * users/
 * ├── {userId1}/
 * │   ├── images/
 * │   │   ├── 1704067200000_abc123.png
 * │   │   └── 1704067300000_def456.jpg
 * │   ├── videos/
 * │   │   ├── 1704067400000_ghi789.mp4
 * │   │   └── 1704067500000_jkl012.mp4
 * │   ├── characters/
 * │   │   ├── character_name/
 * │   │   │   └── 1704067600000_mno345.png
 * │   │   └── 1704067700000_pqr678.png
 * │   ├── tiktok/
 * │   │   ├── product_name/
 * │   │   │   ├── 1704067800000_stu901.mp4
 * │   │   │   └── 1704067900000_vwx234.png
 * │   │   └── 1704068000000_yz567.mp4
 * │   └── comics/
 * │       ├── 1704068100000_abc890.png
 * │       └── story_title/
 * │           └── 1704068200000_def123.png
 * └── {userId2}/
 *     └── ... (same structure)
 * 
 * ข้อดีของการจัดระเบียบแบบนี้:
 * 1. แยกไฟล์ตาม user ชัดเจน
 * 2. จัดกลุ่มตามประเภท asset
 * 3. ใช้ timestamp + unique ID ป้องกันชื่อไฟล์ซ้ำ
 * 4. สามารถจัดกลุ่มย่อยตามชื่อโปรเจคได้
 * 5. ง่ายต่อการ backup และ cleanup
 */