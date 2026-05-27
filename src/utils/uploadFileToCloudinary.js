const CLOUDINARY_CLOUD_NAME = 'dztmcw3mm';
const CLOUDINARY_DEFAULT_UPLOAD_PRESET = 'gym_unsigned';
const CLOUDINARY_DELETE_BY_TOKEN_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/delete_by_token`;

const getCloudinaryUploadUrl = (resourceType = 'auto') => {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
};

export const uploadFileToCloudinary = async (file, options = {}) => {
  if (!file) {
    return { url: null, deleteToken: null, error: 'Missing file' };
  }

  const resourceType = options.resourceType || 'auto';
  const uploadPreset = options.uploadPreset || CLOUDINARY_DEFAULT_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  if (options.folder) formData.append('folder', options.folder);
  if (options.publicId) formData.append('public_id', options.publicId);
  if (options.tags) formData.append('tags', options.tags);
  if (options.context) formData.append('context', options.context);
  const shouldReturnDeleteToken = options.returnDeleteToken === true;
  if (shouldReturnDeleteToken) {
    formData.append('return_delete_token', 'true');
  }

  try {
    const response = await fetch(getCloudinaryUploadUrl(resourceType), {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || 'Upload failed';
      console.error('Cloudinary file upload error:', message, data);
      return { url: null, deleteToken: null, error: message };
    }
    return {
      url: data?.secure_url || null,
      deleteToken: data?.delete_token || null,
      error: null,
    };
  } catch (error) {
    console.error('Cloudinary file upload error:', error);
    return { url: null, deleteToken: null, error: error?.message || 'Upload failed' };
  }
};

export const deleteCloudinaryAssetByToken = async (deleteToken) => {
  if (!deleteToken) return false;

  const formData = new FormData();
  formData.append('token', deleteToken);

  try {
    const response = await fetch(CLOUDINARY_DELETE_BY_TOKEN_URL, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};
