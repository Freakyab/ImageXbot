import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get('path') || '';
        console.log('Fetching files for path:', path);

        const folderPrefix = `file-explorer/${path}`;

        // ✅ Fetch raw resources under the given prefix
        const result = await cloudinary.api.resources({
            resource_type: 'raw',
            type: 'upload',
            prefix: folderPrefix,
            max_results: 500,
        });
        console.log('Fetched resources:', result);

        // ✅ Filter only files (not folders)
        const files = result.resources
            .filter((resource: any) => resource.context?.custom?.type !== 'folder')
            .map((resource: any) => ({
                id: resource.asset_id,
                name: resource.public_id,
                type: 'file',
                path: resource.public_id,
                size: resource.bytes,
                createdAt: resource.created_at,
                format: resource.format,
                url: resource.secure_url,
            }));


        return NextResponse.json({ files }, { status: 200 });
    } catch (error) {
        console.error('Error fetching files:', error);
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
}
