import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { filename, content, path } = await request.json();
    
    const uploadPath = path ? `file-explorer/${path}/${filename}` : `file-explorer/${filename}`;
    const buffer = Buffer.from(content);
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: uploadPath,
          original_filename: filename,
          resource_type: 'raw',
        },
        (error, result) => {
          if (error) {
            console.error('Upload error:', error);
            reject(NextResponse.json({ error: 'Failed to create JSON file' }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ success: true, file: result }));
          }
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('Error creating JSON file:', error);
    return NextResponse.json({ error: 'Failed to create JSON file' }, { status: 500 });
  }
}
