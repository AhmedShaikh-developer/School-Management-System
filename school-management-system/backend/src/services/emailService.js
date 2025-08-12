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

// Send Super Admin notification for new school onboarding
const sendSuperAdminNotification = async (superAdminEmail, tenantData) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`,
      to: superAdminEmail,
      subject: 'New School Onboarded - School Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">New School Onboarded</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello <strong>Super Administrator</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              A new school has been successfully onboarded to the School Management System.
            </p>
            
            <div style="background-color: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #e65100;">School Details:</h3>
              <p style="margin: 5px 0; color: #333;">
                <strong>School Name:</strong> ${tenantData.schoolName}<br>
                <strong>Domain:</strong> ${tenantData.domain}<br>
                <strong>Admin Name:</strong> ${tenantData.adminName}<br>
                <strong>Admin Email:</strong> ${tenantData.adminEmail}<br>
                <strong>Phone:</strong> ${tenantData.phone || 'Not provided'}<br>
                <strong>School Type:</strong> ${tenantData.schoolType || 'Not specified'}<br>
                <strong>Student Count:</strong> ${tenantData.studentCount || 'Not specified'}<br>
                <strong>Address:</strong> ${tenantData.address || 'Not provided'}<br>
                <strong>Website:</strong> ${tenantData.website || 'Not provided'}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              The school has been set up with their own isolated database and the admin user has been created with temporary credentials.
            </p>
            
            <div style="background-color: #e8f5e8; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32;">
                <strong>Next Steps:</strong><br>
                • The tenant admin will receive login credentials via email<br>
                • They can access their portal at: ${tenantData.domain}.${process.env.APP_URL || 'localhost:3000'}<br>
                • Monitor their setup progress through the admin dashboard
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This is an automated notification. Please do not reply to this email.
              <br>
              If you need to review or manage this tenant, please access the admin dashboard.
            </p>
          </div>
        </div>
      `,
      text: `
New School Onboarded - School Management System

Hello Super Administrator,

A new school has been successfully onboarded to the School Management System.

School Details:
School Name: ${tenantData.schoolName}
Domain: ${tenantData.domain}
Admin Name: ${tenantData.adminName}
Admin Email: ${tenantData.adminEmail}
Phone: ${tenantData.phone || 'Not provided'}
School Type: ${tenantData.schoolType || 'Not specified'}
Student Count: ${tenantData.studentCount || 'Not specified'}
Address: ${tenantData.address || 'Not provided'}
Website: ${tenantData.website || 'Not provided'}

The school has been set up with their own isolated database and the admin user has been created with temporary credentials.

Next Steps:
• The tenant admin will receive login credentials via email
• They can access their portal at: ${tenantData.domain}.${process.env.APP_URL || 'localhost:3000'}
• Monitor their setup progress through the admin dashboard

This is an automated notification. Please do not reply to this email.
If you need to review or manage this tenant, please access the admin dashboard.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Super Admin notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending Super Admin notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send Super Admin notification for failed tenant onboarding
const sendFailureNotification = async (superAdminEmail, tenantData, errorMessage) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`,
      to: superAdminEmail,
      subject: 'Tenant Onboarding Failed - School Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Tenant Onboarding Failed</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello <strong>Super Administrator</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              A tenant onboarding process has failed and requires your attention.
            </p>
            
            <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #c62828;">Failed Onboarding Details:</h3>
              <p style="margin: 5px 0; color: #333;">
                <strong>School Name:</strong> ${tenantData.schoolName}<br>
                <strong>Domain:</strong> ${tenantData.domain}<br>
                <strong>Admin Name:</strong> ${tenantData.adminName}<br>
                <strong>Admin Email:</strong> ${tenantData.adminEmail}<br>
                <strong>Phone:</strong> ${tenantData.phone || 'Not provided'}<br>
                <strong>School Type:</strong> ${tenantData.schoolType || 'Not specified'}<br>
                <strong>Student Count:</strong> ${tenantData.studentCount || 'Not specified'}<br>
                <strong>Address:</strong> ${tenantData.address || 'Not provided'}<br>
                <strong>Website:</strong> ${tenantData.website || 'Not provided'}
              </p>
            </div>
            
            <div style="background-color: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #e65100;">Error Details:</h3>
              <p style="margin: 0; color: #e65100;">
                <strong>Error Message:</strong> ${errorMessage}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              The system has attempted to rollback any partial changes, but manual intervention may be required.
            </p>
            
            <div style="background-color: #e8f5e8; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32;">
                <strong>Recommended Actions:</strong><br>
                • Check the system logs for detailed error information<br>
                • Verify database connectivity and permissions<br>
                • Ensure all required services are running<br>
                • Contact the tenant admin if manual intervention is needed
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This is an automated notification. Please do not reply to this email.
              <br>
              If you need to review the system status, please access the admin dashboard.
            </p>
          </div>
        </div>
      `,
      text: `
Tenant Onboarding Failed - School Management System

Hello Super Administrator,

A tenant onboarding process has failed and requires your attention.

Failed Onboarding Details:
School Name: ${tenantData.schoolName}
Domain: ${tenantData.domain}
Admin Name: ${tenantData.adminName}
Admin Email: ${tenantData.adminEmail}
Phone: ${tenantData.phone || 'Not provided'}
School Type: ${tenantData.schoolType || 'Not specified'}
Student Count: ${tenantData.studentCount || 'Not specified'}
Address: ${tenantData.address || 'Not provided'}
Website: ${tenantData.website || 'Not provided'}

Error Details:
Error Message: ${errorMessage}

The system has attempted to rollback any partial changes, but manual intervention may be required.

Recommended Actions:
• Check the system logs for detailed error information
• Verify database connectivity and permissions
• Ensure all required services are running
• Contact the tenant admin if manual intervention is needed

This is an automated notification. Please do not reply to this email.
If you need to review the system status, please access the admin dashboard.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Failure notification email sent to Super Admin:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending failure notification email to Super Admin:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordChangeNotification,
  sendWelcomeEmail,
  sendSuperAdminNotification,
  sendFailureNotification
}; 