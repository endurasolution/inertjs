import sharp from 'sharp';

export async function optimizeImage(buffer, options = {}) {
  let instance = sharp(buffer);
  
  if (options.width || options.height) {
    instance = instance.resize({
      width: options.width ? parseInt(options.width) : undefined,
      height: options.height ? parseInt(options.height) : undefined,
      fit: 'cover'
    });
  }

  // Convert to WebP by default for modern browser support
  instance = instance.webp({ quality: options.quality ? parseInt(options.quality) : 80 });
  
  return instance.toBuffer();
}
