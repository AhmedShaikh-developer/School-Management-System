const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { updateTenantBranding, getTenantBranding } = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const tenantId = req.params.tenantId || req.body.tenantId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${tenantId}_${timestamp}${ext}`);
  }
});

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
      logo_url,
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
    
    // Get existing branding to preserve logo_url if not provided
    const existingBranding = await getTenantBranding(tenantId);
    const updateData = {
      logo_url: logo_url || (existingBranding ? existingBranding.logo_url : null),
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
        logo_url: updateData.logo_url,
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
          logo_url: null,
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
      data: branding
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

// Upload logo
const uploadLogo = async (tenantId, file) => {
  try {
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    // Generate logo URL
    const logoUrl = `/uploads/logos/${file.filename}`;
    
    // Update branding with new logo URL
    await updateTenantBranding(tenantId, {
      logo_url: logoUrl
    });
    
    return {
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo_url: logoUrl,
        filename: file.filename
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
    const branding = await getTenantBranding(tenantId);
    
    if (branding && branding.logo_url) {
      // Delete file from filesystem
      const logoPath = path.join(__dirname, '../../', branding.logo_url);
      try {
        await fs.unlink(logoPath);
      } catch (error) {
        console.error('Error deleting logo file:', error);
      }
      
      // Update branding to remove logo URL
      await updateTenantBranding(tenantId, {
        logo_url: null
      });
    }
    
    return {
      success: true,
      message: 'Logo deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting logo:', error);
    throw error;
  }
};

module.exports = {
  upload,
  updateBranding,
  getBranding,
  generateDynamicCSS,
  uploadLogo,
  deleteLogo
}; 