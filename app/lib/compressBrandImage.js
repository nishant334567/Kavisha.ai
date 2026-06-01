import sharp from "sharp";

/** Display-oriented presets (2× retina headroom, high visual quality, smaller files). */
const PRESETS = {
  logo: { maxWidth: 512, maxHeight: 512, quality: 86 },
  brandImage: { maxWidth: 1920, maxHeight: 720, quality: 86 },
};

/**
 * Resize and re-encode brand images before GCS upload.
 * @param {Buffer} buffer
 * @param {"logo"|"brandImage"|"paymentQr"|string} imageType
 * @returns {Promise<{ buffer: Buffer, contentType: string, extension: string }>}
 */
export async function compressBrandImageBuffer(buffer, imageType) {
  if (!buffer?.length) {
    return { buffer: Buffer.alloc(0), contentType: "image/jpeg", extension: "jpg" };
  }

  if (imageType === "paymentQr") {
    return preserveOriginal(buffer);
  }

  const preset = PRESETS[imageType];
  if (!preset) {
    return preserveOriginal(buffer);
  }

  try {
    const input = sharp(buffer, { failOn: "none" }).rotate();
    const meta = await input.metadata();
    const hasAlpha =
      Boolean(meta.hasAlpha) ||
      meta.channels === 4 ||
      meta.format === "png" ||
      meta.format === "webp";

    let pipeline = input.resize({
      width: preset.maxWidth,
      height: preset.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (hasAlpha && imageType === "logo") {
      const out = await pipeline
        .webp({ quality: preset.quality, effort: 4, alphaQuality: 90 })
        .toBuffer();
      return { buffer: out, contentType: "image/webp", extension: "webp" };
    }

    const out = await pipeline
      .jpeg({ quality: preset.quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();

    return { buffer: out, contentType: "image/jpeg", extension: "jpg" };
  } catch (err) {
    console.warn("[compressBrandImage] fallback to original:", err?.message || err);
    return preserveOriginal(buffer);
  }
}

function preserveOriginal(buffer) {
  const contentType = sniffContentType(buffer);
  return {
    buffer,
    contentType,
    extension: extensionFromContentType(contentType),
  };
}

function sniffContentType(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer.length > 12 && buffer.slice(8, 12).toString() === "WEBP") {
    return "image/webp";
  }
  return "image/jpeg";
}

function extensionFromContentType(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}
