/**
 * Cloudinary Image Upload Service
 * Uses unsigned uploads for browser-based image uploads
 * 
 * Setup Instructions:
 * 1. Create a free Cloudinary account at https://cloudinary.com
 * 2. Go to Settings > Upload > Upload presets
 * 3. Create a new unsigned upload preset named "wms_products"
 * 4. Copy your Cloud Name from the Dashboard
 * 5. Update CLOUDINARY_CLOUD_NAME below with your cloud name
 */

// Cloudinary cloud name
const CLOUDINARY_CLOUD_NAME = "drnfqm0mm";
const CLOUDINARY_UPLOAD_PRESET = "wms_products"; // Create this preset in Cloudinary settings

// Cloudinary upload URL
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Validate image file before upload
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Max file size: 10MB (Cloudinary free tier limit)
  const MAX_SIZE = 10 * 1024 * 1024;
  
  // Allowed MIME types
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." 
    };
  }
  
  if (file.size > MAX_SIZE) {
    return { 
      valid: false, 
      error: "File is too large. Maximum size is 10MB." 
    };
  }
  
  return { valid: true };
}

/**
 * Upload an image to Cloudinary
 * @param file - The image file to upload
 * @param folder - Optional folder name (default: "wms-products")
 * @returns The secure URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  folder: string = "wms-products"
): Promise<string> {
  // Validate the file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create form data for upload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  
  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload error:", errorData);
      throw new Error(errorData.error?.message || "Failed to upload image");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Upload error:", error);
    throw error instanceof Error ? error : new Error("Failed to upload image");
  }
}

/**
 * Delete an image from Cloudinary
 * Note: Deletion requires signed requests which need backend support.
 * For now, we just log the deletion request. 
 * In production, you'd call your backend API to delete the image.
 * @param imageUrl - The URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes("cloudinary")) {
    return;
  }
  
  // Extract public_id from URL for logging
  // Cloudinary URLs format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{format}
  console.log("Image deletion requested:", imageUrl);
  console.log("Note: Cloudinary deletion requires backend API. Image will remain in Cloudinary.");
  
  // In production, you would call your backend:
  // await fetch('/api/cloudinary/delete', { method: 'POST', body: JSON.stringify({ url: imageUrl }) });
}

/**
 * Get optimized image URL with transformations
 * @param url - Original Cloudinary URL
 * @param options - Transformation options
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: "auto" | number;
    format?: "auto" | "webp" | "jpg" | "png";
  } = {}
): string {
  if (!url || !url.includes("cloudinary")) {
    return url;
  }

  const { width, height, quality = "auto", format = "auto" } = options;
  
  // Build transformation string
  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);
  
  // Insert transformations into URL
  // From: .../upload/v123/folder/image.jpg
  // To:   .../upload/w_300,h_300,q_auto,f_auto/v123/folder/image.jpg
  const transformString = transforms.join(",");
  return url.replace("/upload/", `/upload/${transformString}/`);
}

// Export cloud name for configuration check
export function isCloudinaryConfigured(): boolean {
  return CLOUDINARY_CLOUD_NAME !== "your-cloud-name";
}

export { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET };

