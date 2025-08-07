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
    
    // Validate colors
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
    
    // Get existing branding to preserve logo if not provided
    const existingBranding = await getTenantBranding(tenantId);
    const updateData = {
      logo_data: logo_data || (existingBranding ? existingBranding.logo_data : null),
      logo_filename: logo_filename || (existingBranding ? existingBranding.logo_filename : null),
      logo_mimetype: logo_mimetype || (existingBranding ? existingBranding.logo_mimetype : null),
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css
    };
    
    // Update branding in database
    await updateTenantBranding(tenantId, updateData);
    
    return {
      success: true,
      message: 'Branding updated successfully',
      data: {
        tenantId,
        logo_filename: updateData.logo_filename,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css
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
    
    // Store logo data in database
    await updateTenantBranding(tenantId, {
      logo_data: file.buffer,
      logo_filename: file.originalname,
      logo_mimetype: file.mimetype
    });
    
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
    // Update branding to remove logo data
    await updateTenantBranding(tenantId, {
      logo_data: null,
      logo_filename: null,
      logo_mimetype: null
    });
    
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