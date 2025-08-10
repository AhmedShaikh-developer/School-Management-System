const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send password change confirmation email
const sendPasswordChangeNotification = async (tenantEmail, tenantName, schoolName) => {
  try {
    const transporter = createTransporter();
    
    // Fallback for undefined names
    const displayName = tenantName || 'User';
    
    const mailOptions = {
      from: `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`,
      to: tenantEmail,
      subject: 'Password Changed Successfully - School Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Password Changed Successfully</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello <strong>${displayName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Your password for <strong>${schoolName}</strong> has been successfully changed.
            </p>
            
            <div style="background-color: #e8f5e8; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32;">
                <strong>Security Notice:</strong> If you did not request this password change, 
                please contact your system administrator immediately.
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              You can now log in to your school management system using your new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/tenant/login" 
                 style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Login to System
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This is an automated message. Please do not reply to this email.
              <br>
              If you have any questions, please contact your system administrator.
            </p>
          </div>
        </div>
      `,
      text: `
Password Changed Successfully - School Management System

Hello ${displayName},

Your password for ${schoolName} has been successfully changed.

Security Notice: If you did not request this password change, please contact your system administrator immediately.

You can now log in to your school management system using your new password.

Login to System: ${process.env.APP_URL || 'http://localhost:3000'}/tenant/login

This is an automated message. Please do not reply to this email.
If you have any questions, please contact your system administrator.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password change notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending password change notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send tenant onboarding welcome email (for future use)
const sendWelcomeEmail = async (tenantEmail, tenantName, schoolName, tempPassword) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`,
      to: tenantEmail,
      subject: 'Welcome to School Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to School Management System</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello <strong>${tenantName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Welcome to <strong>${schoolName}</strong>! Your school has been successfully onboarded to our School Management System.
            </p>
            
            <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1565c0;">
                <strong>Login Credentials:</strong><br>
                Email: ${tenantEmail}<br>
                Temporary Password: ${tempPassword}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Please log in with your temporary password and change it to a secure password of your choice.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/tenant/login" 
                 style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Login to System
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This is an automated message. Please do not reply to this email.
              <br>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `
Welcome to School Management System

Hello ${tenantName},

Welcome to ${schoolName}! Your school has been successfully onboarded to our School Management System.

Login Credentials:
Email: ${tenantEmail}
Temporary Password: ${tempPassword}

Please log in with your temporary password and change it to a secure password of your choice.

Login to System: ${process.env.APP_URL || 'http://localhost:3000'}/tenant/login

This is an automated message. Please do not reply to this email.
If you have any questions, please contact our support team.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordChangeNotification,
  sendWelcomeEmail
}; 