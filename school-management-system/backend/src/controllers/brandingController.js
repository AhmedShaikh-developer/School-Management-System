const { 
  updateBranding,
  getBranding,
  generateDynamicCSS,
  uploadLogo,
  deleteLogo,
  getLogoData,
  upload
} = require('../services/brandingService');

// Update tenant branding
const updateTenantBranding = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css
    } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    const result = await updateBranding(tenantId, {
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css
    });
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update branding'
    });
  }
};

// Get tenant branding
const getTenantBranding = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    const result = await getBranding(tenantId);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting branding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get branding'
    });
  }
};

// Get dynamic CSS for tenant
const getDynamicCSS = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    const css = await generateDynamicCSS(tenantId);
    
    res.set('Content-Type', 'text/css');
    res.send(css);
  } catch (error) {
    console.error('Error generating CSS:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate CSS'
    });
  }
};

// Get logo data from database
const getTenantLogoData = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    const logoData = await getLogoData(tenantId);
    
    if (!logoData) {
      return res.status(404).json({
        success: false,
        message: 'Logo not found'
      });
    }
    
    res.set('Content-Type', logoData.mimetype);
    res.set('Content-Disposition', `inline; filename="${logoData.filename}"`);
    res.send(logoData.data);
  } catch (error) {
    console.error('Error getting logo data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get logo data'
    });
  }
};

// Upload logo
const uploadTenantLogo = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Debug: Log file information
    console.log('Uploading logo for tenant:', tenantId);
    console.log('File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer
    });
    
    const result = await uploadLogo(tenantId, req.file);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload logo'
    });
  }
};

// Delete logo
const deleteTenantLogo = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    const result = await deleteLogo(tenantId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete logo'
    });
  }
};

// Get available fonts
const getAvailableFonts = async (req, res) => {
  try {
    const fonts = [
      { name: 'Inter', value: 'Inter' },
      { name: 'Roboto', value: 'Roboto' },
      { name: 'Open Sans', value: 'Open Sans' },
      { name: 'Lato', value: 'Lato' },
      { name: 'Poppins', value: 'Poppins' },
      { name: 'Montserrat', value: 'Montserrat' },
      { name: 'Source Sans Pro', value: 'Source Sans Pro' },
      { name: 'Ubuntu', value: 'Ubuntu' },
      { name: 'Nunito', value: 'Nunito' },
      { name: 'Raleway', value: 'Raleway' }
    ];
    
    res.json({
      success: true,
      data: fonts
    });
  } catch (error) {
    console.error('Error getting fonts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fonts'
    });
  }
};

// Get color presets
const getColorPresets = async (req, res) => {
  try {
    const presets = [
      {
        name: 'Blue',
        primary: '#2563eb',
        secondary: '#1d4ed8',
        accent: '#16a34a'
      },
      {
        name: 'Purple',
        primary: '#7c3aed',
        secondary: '#6d28d9',
        accent: '#16a34a'
      },
      {
        name: 'Green',
        primary: '#059669',
        secondary: '#047857',
        accent: '#dc2626'
      },
      {
        name: 'Red',
        primary: '#dc2626',
        secondary: '#b91c1c',
        accent: '#16a34a'
      },
      {
        name: 'Orange',
        primary: '#ea580c',
        secondary: '#c2410c',
        accent: '#16a34a'
      },
      {
        name: 'Teal',
        primary: '#0d9488',
        secondary: '#0f766e',
        accent: '#dc2626'
      }
    ];
    
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    console.error('Error getting color presets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get color presets'
    });
  }
};

module.exports = {
  updateTenantBranding,
  getTenantBranding,
  getDynamicCSS,
  getTenantLogoData,
  uploadTenantLogo,
  deleteTenantLogo,
  getAvailableFonts,
  getColorPresets,
  upload
}; 