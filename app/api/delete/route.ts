import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: NextRequest) {
  try {
    const { type, cloudinaryId } = await request.json();
    if (!cloudinaryId) {
      return NextResponse.json({ error: 'No cloudinary ID provided' }, { status: 400 });
    }


    // Delete file
    const result = await cloudinary.uploader.destroy(cloudinaryId, { resource_type: 'raw' });

    if (result.result !== 'ok') {
      console.error('Failed to delete item:', result);
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
