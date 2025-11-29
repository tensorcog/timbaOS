import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export interface UploadOptions {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    width?: number;
    height?: number;
    quality?: number;
}

const DEFAULT_OPTIONS: UploadOptions = {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    width: 800,
    height: 800,
    quality: 90,
};

export async function processAndSaveImage(
    file: File,
    directory: 'company' | 'profiles',
    options: UploadOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate file type
    if (!opts.allowedTypes?.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${opts.allowedTypes?.join(', ')}`);
    }

    // Validate file size
    if (opts.maxSizeBytes && file.size > opts.maxSizeBytes) {
        throw new Error(`File too large. Maximum size: ${opts.maxSizeBytes / 1024 / 1024}MB`);
    }

    // Generate unique filename
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const filepath = join(process.cwd(), 'public', 'uploads', directory, filename);

    // Process image with sharp (optional - fallback to direct save if sharp unavailable)
    const buffer = Buffer.from(await file.arrayBuffer());
    
    try {
        const sharp = (await import('sharp')).default;
        await sharp(buffer)
            .resize(opts.width, opts.height, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality: opts.quality })
            .png({ quality: opts.quality })
            .toFile(filepath);
    } catch (error) {
        // Fallback: save file directly without processing
        console.warn('Sharp not available, saving image without processing:', error);
        await writeFile(filepath, buffer);
    }

    // Return the public URL path
    return `/uploads/${directory}/${filename}`;
}

export async function deleteImage(imagePath: string): Promise<void> {
    try {
        const filepath = join(process.cwd(), 'public', imagePath);
        await import('fs/promises').then(fs => fs.unlink(filepath));
    } catch (error) {
        console.error('Failed to delete image:', error);
    }
}
