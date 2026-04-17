// src/utils/uploadImageToCloudinary.js

/**
 * Uploads an image file to Cloudinary and returns the secure_url.
 * @param {File} file - The image file to upload.
 * @returns {Promise<string|null>} The secure_url of the uploaded image, or null if failed.
 */
export async function uploadImageToCloudinary(file) {
  const url = 'https://api.cloudinary.com/v1_1/dztmcw3mm/image/upload';
  const uploadPreset = 'gym_unsigned';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.secure_url || null;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
}
