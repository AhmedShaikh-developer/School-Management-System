const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const { 
  addCustomDomain, 
  getCustomDomainByDomain, 
  updateDomainVerificationStatus,
  generateVerificationToken 
} = require('../config/database');

// Verify domain via TXT record
const verifyDomainViaTXT = async (domain, expectedToken) => {
  try {
    const txtRecords = await dns.resolveTxt(domain);
    
    // Flatten the TXT records array
    const allTxtRecords = txtRecords.flat();
    
    // Check if any TXT record contains the expected token
    const hasToken = allTxtRecords.some(record => 
      record.includes(expectedToken)
    );
    
    return hasToken;
  } catch (error) {
    console.error('Error verifying domain via TXT:', error);
    return false;
  }
};

// Verify domain via file upload
const verifyDomainViaFile = async (domain, expectedToken) => {
  try {
    // Try to fetch the verification file from the domain
    const verificationUrl = `http://${domain}/sms-verification.txt`;
    
    const response = await fetch(verificationUrl);
    if (!response.ok) {
      return false;
    }
    
    const content = await response.text();
    return content.trim() === expectedToken;
  } catch (error) {
    console.error('Error verifying domain via file:', error);
    return false;
  }
};

// Add custom domain for tenant
const addCustomDomainForTenant = async (tenantId, domain, verificationType = 'txt') => {
  try {
    // Check if domain already exists
    const existingDomain = await getCustomDomainByDomain(domain);
    if (existingDomain) {
      throw new Error('Domain is already registered');
    }
    
    // Add domain to database
    const result = await addCustomDomain(tenantId, domain, verificationType);
    
    return {
      success: true,
      domain,
      verificationToken: result.verificationToken,
      verificationType,
      instructions: verificationType === 'txt' 
        ? `Add TXT record: ${result.verificationToken}`
        : `Upload file: sms-verification.txt with content: ${result.verificationToken}`
    };
  } catch (error) {
    console.error('Error adding custom domain:', error);
    throw error;
  }
};

// Verify custom domain
const verifyCustomDomain = async (domain) => {
  try {
    // Get domain info from database
    const domainInfo = await getCustomDomainByDomain(domain);
    if (!domainInfo) {
      throw new Error('Domain not found');
    }
    
    let isVerified = false;
    
    // Verify based on verification type
    if (domainInfo.verification_type === 'txt') {
      isVerified = await verifyDomainViaTXT(domain, domainInfo.verification_token);
    } else if (domainInfo.verification_type === 'file') {
      isVerified = await verifyDomainViaFile(domain, domainInfo.verification_token);
    }
    
    // Update verification status
    const status = isVerified ? 'verified' : 'failed';
    await updateDomainVerificationStatus(domain, status);
    
    return {
      success: true,
      domain,
      verified: isVerified,
      status,
      message: isVerified 
        ? 'Domain verified successfully'
        : 'Domain verification failed'
    };
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    throw error;
  }
};

// Get domain verification instructions
const getDomainVerificationInstructions = async (domain) => {
  try {
    const domainInfo = await getCustomDomainByDomain(domain);
    if (!domainInfo) {
      throw new Error('Domain not found');
    }
    
    const instructions = {
      txt: {
        title: 'TXT Record Verification',
        steps: [
          'Log in to your domain registrar or DNS provider',
          'Navigate to DNS settings',
          'Add a new TXT record',
          `Set the value to: ${domainInfo.verification_token}`,
          'Save the record',
          'Wait 5-10 minutes for propagation',
          'Click "Verify Domain" below'
        ]
      },
      file: {
        title: 'File Upload Verification',
        steps: [
          'Upload a file named "sms-verification.txt" to your domain root',
          `Set the file content to: ${domainInfo.verification_token}`,
          'Make sure the file is accessible at:',
          `http://${domain}/sms-verification.txt`,
          'Click "Verify Domain" below'
        ]
      }
    };
    
    return {
      success: true,
      domain,
      verificationType: domainInfo.verification_type,
      verificationToken: domainInfo.verification_token,
      status: domainInfo.verification_status,
      instructions: instructions[domainInfo.verification_type]
    };
  } catch (error) {
    console.error('Error getting verification instructions:', error);
    throw error;
  }
};

// List custom domains for tenant
const listCustomDomainsForTenant = async (tenantId) => {
  try {
    const { mainPool } = require('../config/database');
    const client = await mainPool.connect();
    
    const result = await client.query(`
      SELECT * FROM custom_domains 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC
    `, [tenantId]);
    
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error listing custom domains:', error);
    throw error;
  }
};

// Delete custom domain
const deleteCustomDomain = async (domain, tenantId) => {
  try {
    const { mainPool } = require('../config/database');
    const client = await mainPool.connect();
    
    await client.query(`
      DELETE FROM custom_domains 
      WHERE domain = $1 AND tenant_id = $2
    `, [domain, tenantId]);
    
    client.release();
    return { success: true, message: 'Domain deleted successfully' };
  } catch (error) {
    console.error('Error deleting custom domain:', error);
    throw error;
  }
};

module.exports = {
  verifyDomainViaTXT,
  verifyDomainViaFile,
  addCustomDomainForTenant,
  verifyCustomDomain,
  getDomainVerificationInstructions,
  listCustomDomainsForTenant,
  deleteCustomDomain
}; 