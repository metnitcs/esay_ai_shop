# Setup R2 CORS Configuration

## วิธีที่ 1: ใช้ Cloudflare Dashboard (แนะนำ)

1. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com)
2. ไป R2 Object Storage
3. เลือก bucket `generateasstes`
4. ไปที่ **Settings** tab
5. หา **CORS policy** section
6. คลิก **Edit CORS policy**
7. Copy-paste JSON config นี้:

```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

8. คลิก **Save**

## วิธีที่ 2: ใช้ Cloudflare CLI (ถ้ามี wrangler)

```bash
# ติดตั้ง wrangler ถ้ายังไม่มี
npm install -g wrangler

# Login
wrangler login

# ตั้งค่า CORS
wrangler r2 bucket cors put generateasstes --file r2-cors-config.json
```

## หลังจากตั้งค่าแล้ว

1. รอสักครู่ให้ config มีผล (1-2 นาที)
2. ลองเจนรูปใหม่
3. ควรจะอัปโหลดไป R2 ได้แล้ว

## ตรวจสอบว่าใช้งานได้

- เช็ค console ใน browser ไม่ควรมี CORS error
- เช็คใน R2 bucket ควรเห็นไฟล์ใน folder `users/`
- URL ที่ return กลับมาควรเข้าถึงได้