<div align="center">
<h1>AI Creative Suite (Easy AI Shop)</h1>
<p>
  <strong>A comprehensive AI-powered content creation platform.</strong><br>
  Create TikTok videos, Comics, Images, and Videos using Google Gemini & Veo models.
</p>
</div>

## Features

- **TikTok Creator**: Generate short-form video scripts from product descriptions and create videos with AI-generated assets.
- **Comic Creator**: Create multi-panel comics with consistent character generation and storytelling.
- **Image Generator**: Generate high-quality images using Google Gemini 3 Pro.
- **Video Generator**: Create videos from text or images using Google Veo.
- **Image Analyzer**: Analyze images to get detailed descriptions and insights.
- **Asset Gallery**: Manage your generated assets.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS
- **AI Models**: Google Gemini 2.0 Flash / 3 Pro (Text & Image), Google Veo (Video)
- **Backend/Services**: 
  - **Database & Auth**: Supabase
  - **Storage**: Cloudflare R2 (recently migrated from Supabase Storage)

## Prerequisites

- Node.js (v18+)
- Supabase Account (for Auth and Database)
- Cloudflare R2 Account (for Storage)
- Google AI Studio API Key

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd esay_ai_shop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory (copy from `.env.example`).
   
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key

   # Google AI Studio
   GEMINI_API_KEY=your_gemini_api_key

   # Cloudflare R2 Storage (Required for saving large assets)
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_r2_bucket_name
   R2_PUBLIC_DOMAIN=https://your-custom-domain.com
   ```

4. **Run Locally:**
   ```bash
   npm run dev
   ```

## Key Configuration Notes

- **Storage**: This project uses **AWS SDK v3** to communicate with Cloudflare R2. Files are organized by user ID for better security and management:
  ```
  users/{userId}/{assetType}/{optional_folder}/{timestamp}_{uniqueId}.ext
  ```
- **Database**: The app expects a `profiles` table and an `assets` table in Supabase. The `assets` table stores metadata and R2 file URLs.
- **File Organization**: 
  - `images/` - Generated images from Image Generator
  - `videos/` - Generated videos from Video Generator  
  - `characters/` - Comic character references
  - `tiktok/` - TikTok UGC content
  - `comics/` - Generated comics and cartoons

## File Storage Structure

The application organizes files in Cloudflare R2 with the following structure:

```
bucket/
└── users/
    └── {userId}/
        ├── images/          # AI-generated images
        ├── videos/          # AI-generated videos
        ├── characters/      # Comic character references
        │   └── {characterName}/
        ├── tiktok/          # TikTok UGC content
        │   └── {productName}/
        └── comics/          # Generated comics
            └── {storyTitle}/
```

Each file is named with: `{timestamp}_{uniqueId}.{extension}`

## User Asset Management

The app includes a comprehensive asset management system:

- **User-specific storage**: All files are organized by user ID
- **Asset categorization**: Files are grouped by type (images, videos, characters, etc.)
- **Metadata tracking**: Each asset includes prompt, creation time, and user information
- **Automatic cleanup**: Failed uploads don't leave orphaned files

## Deployment

Build the project for production:
```bash
npm run build
```
The output will be in the `dist` directory.

### R2 Bucket Configuration

1. Create a Cloudflare R2 bucket
2. Configure CORS if needed for direct access
3. Set up a custom domain (recommended) or use R2.dev domain
4. Ensure proper access keys have read/write permissions
