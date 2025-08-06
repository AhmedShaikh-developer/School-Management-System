const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send welcome email to new tenant admin
const sendWelcomeEmail = async (adminEmail, adminName, schoolName, domain, password) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"School Management System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `Welcome to School Management System - ${schoolName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to School Management System</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Hello ${adminName},</h2>
            
            <p>Congratulations! Your school <strong>${schoolName}</strong> has been successfully onboarded to our School Management System.</p>
            
            <div style="background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h3>Your School Details:</h3>
              <ul>
                <li><strong>School Name:</strong> ${schoolName}</li>
                <li><strong>Domain:</strong> ${domain}</li>
                <li><strong>Admin Email:</strong> ${adminEmail}</li>
                <li><strong>Login URL:</strong> <a href="${process.env.APP_URL}/login">${process.env.APP_URL}/login</a></li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3>Login Credentials:</h3>
              <p><strong>Email:</strong> ${adminEmail}</p>
              <p><strong>Temporary Password:</strong> ${password}</p>
              <p style="color: #856404; font-size: 14px;">Please change your password after your first login for security.</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3>Next Steps:</h3>
              <ol>
                <li>Login to your school dashboard</li>
                <li>Change your password</li>
                <li>Add teachers and staff members</li>
                <li>Create classes and courses</li>
                <li>Start managing your school!</li>
              </ol>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The School Management System Team</p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send notification email for failed onboarding
const sendFailureNotification = async (adminEmail, adminName, schoolName, error) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"School Management System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `School Onboarding Issue - ${schoolName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
            <h1>School Onboarding Issue</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Hello ${adminName},</h2>
            
            <p>We encountered an issue while setting up your school <strong>${schoolName}</strong> in our School Management System.</p>
            
            <div style="background-color: #ffebee; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336;">
              <h3>What happened:</h3>
              <p>${error}</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h3>What we're doing:</h3>
              <ul>
                <li>Our technical team has been notified</li>
                <li>We're working to resolve this issue</li>
                <li>You'll receive an update within 24 hours</li>
              </ul>
            </div>
            
            <p>We apologize for the inconvenience. Our support team will contact you soon with a resolution.</p>
            
            <p>Best regards,<br>The School Management System Team</p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Failure notification email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending failure notification email:', error);
    throw error;
  }
};

// Send admin notification about new tenant
const sendAdminNotification = async (tenantData) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"School Management System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `New School Onboarded - ${tenantData.schoolName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
            <h1>New School Onboarded</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>New Tenant Details:</h2>
            
            <div style="background-color: white; padding: 15px; margin: 20px 0;">
              <ul>
                <li><strong>School Name:</strong> ${tenantData.schoolName}</li>
                <li><strong>Domain:</strong> ${tenantData.domain}</li>
                <li><strong>Admin Name:</strong> ${tenantData.adminName}</li>
                <li><strong>Admin Email:</strong> ${tenantData.adminEmail}</li>
                <li><strong>Tenant ID:</strong> ${tenantData.tenantId}</li>
                <li><strong>Onboarded At:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <p>This school has been successfully onboarded and is ready for use.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    // Don't throw error for admin notifications as they're not critical
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendFailureNotification,
  sendAdminNotification
}; 