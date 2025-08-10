const multer = require('multer');
const { updateTenantBranding, getTenantBranding } = require('../config/database');

// Configure multer for memory storage (no file system)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Update tenant branding
const updateBranding = async (tenantId, brandingData) => {
  try {
    const {
      logo_data,
      logo_filename,
      logo_mimetype,
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css
    } = brandingData;
    
    // Debug: Log received values
    console.log('Received branding data:', {
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css
    });
    
    // Validate colors if provided
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (primary_color && !colorRegex.test(primary_color)) {
      throw new Error('Invalid primary color format');
    }
    if (secondary_color && !colorRegex.test(secondary_color)) {
      throw new Error('Invalid secondary color format');
    }
    if (accent_color && !colorRegex.test(accent_color)) {
      throw new Error('Invalid accent color format');
    }
    
    // Get existing branding to preserve values that aren't being updated
    const existingBranding = await getTenantBranding(tenantId);
    
    // Prepare update data - only update fields that are provided
    const updateData = {
      logo_data: logo_data !== undefined ? logo_data : (existingBranding ? existingBranding.logo_data : null),
      logo_filename: logo_filename !== undefined ? logo_filename : (existingBranding ? existingBranding.logo_filename : null),
      logo_mimetype: logo_mimetype !== undefined ? logo_mimetype : (existingBranding ? existingBranding.logo_mimetype : null),
      primary_color: (primary_color !== undefined && primary_color !== '') ? primary_color : (existingBranding ? existingBranding.primary_color : '#2563eb'),
      secondary_color: (secondary_color !== undefined && secondary_color !== '') ? secondary_color : (existingBranding ? existingBranding.secondary_color : '#1d4ed8'),
      accent_color: (accent_color !== undefined && accent_color !== '') ? accent_color : (existingBranding ? existingBranding.accent_color : '#16a34a'),
      font_family: (font_family !== undefined && font_family !== '') ? font_family : (existingBranding ? existingBranding.font_family : 'Inter'),
      custom_css: custom_css !== undefined ? custom_css : (existingBranding ? existingBranding.custom_css : '')
    };
    
    // Debug: Log final update data
    console.log('Final update data:', {
      primary_color: updateData.primary_color,
      secondary_color: updateData.secondary_color,
      accent_color: updateData.accent_color,
      font_family: updateData.font_family
    });
    
    // Update branding in database
    await updateTenantBranding(tenantId, updateData);
    
    return {
      success: true,
      message: 'Branding updated successfully',
      data: {
        tenantId,
        logo_filename: updateData.logo_filename,
        primary_color: updateData.primary_color,
        secondary_color: updateData.secondary_color,
        accent_color: updateData.accent_color,
        font_family: updateData.font_family,
        custom_css: updateData.custom_css
      }
    };
  } catch (error) {
    console.error('Error updating branding:', error);
    throw error;
  }
};

// Get tenant branding
const getBranding = async (tenantId) => {
  try {
    const branding = await getTenantBranding(tenantId);
    
    if (!branding) {
      // Return default branding
      return {
        success: true,
        data: {
          tenantId,
          logo_filename: null,
          primary_color: '#2563eb',
          secondary_color: '#1d4ed8',
          accent_color: '#16a34a',
          font_family: 'Inter',
          custom_css: ''
        }
      };
    }
    
    return {
      success: true,
      data: {
        tenantId: branding.tenant_id,
        logo_filename: branding.logo_filename,
        logo_mimetype: branding.logo_mimetype,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        font_family: branding.font_family,
        custom_css: branding.custom_css
      }
    };
  } catch (error) {
    console.error('Error getting branding:', error);
    throw error;
  }
};

// Generate dynamic CSS for tenant
const generateDynamicCSS = async (tenantId) => {
  try {
    const branding = await getTenantBranding(tenantId);
    
    if (!branding) {
      return '';
    }
    
    const css = `
      :root {
        --primary-color: ${branding.primary_color || '#2563eb'};
        --secondary-color: ${branding.secondary_color || '#1d4ed8'};
        --accent-color: ${branding.accent_color || '#16a34a'};
        --font-family: ${branding.font_family || 'Inter'};
      }
      
      body {
        font-family: var(--font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .bg-primary { background-color: var(--primary-color) !important; }
      .bg-secondary { background-color: var(--secondary-color) !important; }
      .bg-accent { background-color: var(--accent-color) !important; }
      
      .text-primary { color: var(--primary-color) !important; }
      .text-secondary { color: var(--secondary-color) !important; }
      .text-accent { color: var(--accent-color) !important; }
      
      .border-primary { border-color: var(--primary-color) !important; }
      .border-secondary { border-color: var(--secondary-color) !important; }
      .border-accent { border-color: var(--accent-color) !important; }
      
      .focus\\:ring-primary:focus { box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5) !important; }
      .focus\\:ring-secondary:focus { box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.5) !important; }
      .focus\\:ring-accent:focus { box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.5) !important; }
      
      .hover\\:bg-primary:hover { background-color: var(--secondary-color) !important; }
      .hover\\:bg-secondary:hover { background-color: var(--primary-color) !important; }
      .hover\\:bg-accent:hover { background-color: var(--accent-color) !important; }
      
      ${branding.custom_css || ''}
    `;
    
    return css;
  } catch (error) {
    console.error('Error generating dynamic CSS:', error);
    return '';
  }
};

// Upload logo (store in database as binary data)
const uploadLogo = async (tenantId, file) => {
  try {
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    if (!file.buffer) {
      throw new Error('File buffer is missing');
    }
    
    // Get existing branding to preserve other fields
    const existingBranding = await getTenantBranding(tenantId);
    
    // Only update logo-related fields, preserve all other branding data
    const updateData = {
      logo_data: file.buffer,
      logo_filename: file.originalname,
      logo_mimetype: file.mimetype,
      primary_color: existingBranding ? existingBranding.primary_color : '#2563eb',
      secondary_color: existingBranding ? existingBranding.secondary_color : '#1d4ed8',
      accent_color: existingBranding ? existingBranding.accent_color : '#16a34a',
      font_family: existingBranding ? existingBranding.font_family : 'Inter',
      custom_css: existingBranding ? existingBranding.custom_css : ''
    };
    
    // Store logo data in database
    await updateTenantBranding(tenantId, updateData);
    
    return {
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo_filename: file.originalname,
        logo_mimetype: file.mimetype
      }
    };
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};

// Delete logo
const deleteLogo = async (tenantId) => {
  try {
    // Get existing branding to preserve other fields
    const existingBranding = await getTenantBranding(tenantId);
    
    // Only update logo-related fields, preserve all other branding data
    const updateData = {
      logo_data: null,
      logo_filename: null,
      logo_mimetype: null,
      primary_color: existingBranding ? existingBranding.primary_color : '#2563eb',
      secondary_color: existingBranding ? existingBranding.secondary_color : '#1d4ed8',
      accent_color: existingBranding ? existingBranding.accent_color : '#16a34a',
      font_family: existingBranding ? existingBranding.font_family : 'Inter',
      custom_css: existingBranding ? existingBranding.custom_css : ''
    };
    
    // Update branding in database
    await updateTenantBranding(tenantId, updateData);
    
    return {
      success: true,
      message: 'Logo deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting logo:', error);
    throw error;
  }
};

// Get logo data for serving
const getLogoData = async (tenantId) => {
  try {
    const branding = await getTenantBranding(tenantId);
    
    if (!branding || !branding.logo_data) {
      return null;
    }
    
    return {
      data: branding.logo_data,
      filename: branding.logo_filename,
      mimetype: branding.logo_mimetype
    };
  } catch (error) {
    console.error('Error getting logo data:', error);
    return null;
  }
};

module.exports = {
  upload,
  updateBranding,
  getBranding,
  generateDynamicCSS,
  uploadLogo,
  deleteLogo,
  getLogoData
}; 