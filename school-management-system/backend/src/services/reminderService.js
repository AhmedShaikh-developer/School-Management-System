const { createTenantPool, mainPool } = require('../config/database');
const nodemailer = require('nodemailer');

// Helper function to get tenant database name
const getTenantDatabaseName = async (tenantId) => {
  const client = await mainPool.connect();
  try {
    const dbNameResult = await client.query(
      'SELECT database_name FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    
    if (dbNameResult.rows.length === 0 || !dbNameResult.rows[0].database_name) {
      throw new Error('Tenant database not configured');
    }
    
    return dbNameResult.rows[0].database_name;
  } finally {
    client.release();
  }
};

// SMS Queue Management with rate limiting (30/min)
class SMSQueueManager {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedTime = Date.now();
    this.processedInCurrentMinute = 0;
    this.MAX_SMS_PER_MINUTE = 30;
  }

  async addToQueue(tenantId, phoneNumber, message, priority = 'medium') {
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        const result = await client.query(`
          INSERT INTO sms_queue (phone_number, message, priority)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [phoneNumber, message, priority]);
        
        console.log(`SMS queued for ${phoneNumber}: ${message.substring(0, 50)}...`);
        
        // Start processing if not already running
        if (!this.isProcessing) {
          this.processQueue(tenantId);
        }
        
        return result.rows[0];
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error adding SMS to queue:', error);
      throw error;
    }
  }

  async processQueue(tenantId) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Starting SMS queue processing...');
    
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        while (true) {
          // Check rate limit
          const now = Date.now();
          if (now - this.lastProcessedTime >= 60000) {
            // Reset counter every minute
            this.processedInCurrentMinute = 0;
            this.lastProcessedTime = now;
          }
          
          if (this.processedInCurrentMinute >= this.MAX_SMS_PER_MINUTE) {
            console.log('SMS rate limit reached, waiting for next minute...');
            await new Promise(resolve => setTimeout(resolve, 60000 - (now - this.lastProcessedTime)));
            continue;
          }
          
          // Get next SMS from queue
          const result = await client.query(`
            SELECT * FROM sms_queue 
            WHERE status = 'queued' AND scheduled_time <= CURRENT_TIMESTAMP
            ORDER BY priority DESC, created_at ASC
            LIMIT 1
          `);
          
          if (result.rows.length === 0) {
            console.log('No SMS in queue, stopping processor');
            break;
          }
          
          const sms = result.rows[0];
          
          // Update status to sending
          await client.query(
            'UPDATE sms_queue SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sending', sms.id]
          );
          
          try {
            // Simulate SMS sending (replace with actual SMS gateway)
            await this.sendSMS(sms.phone_number, sms.message);
            
            // Update status to sent
            await client.query(`
              UPDATE sms_queue SET 
                status = $1, 
                gateway_response = $2,
                updated_at = CURRENT_TIMESTAMP 
              WHERE id = $3
            `, ['sent', JSON.stringify({ status: 'success', sentAt: new Date() }), sms.id]);
            
            this.processedInCurrentMinute++;
            console.log(`SMS sent successfully to ${sms.phone_number}`);
            
          } catch (error) {
            console.error(`Failed to send SMS to ${sms.phone_number}:`, error);
            
            // Update retry count and status
            const newRetryCount = sms.retry_count + 1;
            if (newRetryCount >= sms.max_retries) {
              await client.query(`
                UPDATE sms_queue SET 
                  status = $1, 
                  error_message = $2,
                  retry_count = $3,
                  updated_at = CURRENT_TIMESTAMP 
                WHERE id = $4
              `, ['failed', error.message, newRetryCount, sms.id]);
            } else {
              const nextRetry = new Date(Date.now() + (newRetryCount * 60000)); // Exponential backoff
              await client.query(`
                UPDATE sms_queue SET 
                  status = $1, 
                  retry_count = $2,
                  next_retry = $3,
                  error_message = $4,
                  updated_at = CURRENT_TIMESTAMP 
                WHERE id = $5
              `, ['queued', newRetryCount, nextRetry, error.message, sms.id]);
            }
          }
          
          // Small delay between SMS
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error processing SMS queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async sendSMS(phoneNumber, message) {
    // Simulate SMS gateway integration
    // Replace this with actual SMS gateway (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS to ${phoneNumber}: ${message}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate random failures for testing
    if (Math.random() < 0.1) {
      throw new Error('SMS gateway timeout');
    }
    
    return { success: true, messageId: `msg_${Date.now()}` };
  }
}

// Email Queue Management
class EmailQueueManager {
  constructor() {
    this.isProcessing = false;
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configure email transporter (using Gmail as example)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async addToQueue(tenantId, emailAddress, subject, message, htmlContent = null, priority = 'medium') {
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        const result = await client.query(`
          INSERT INTO email_queue (email_address, subject, message, html_content, priority)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [emailAddress, subject, message, htmlContent, priority]);
        
        console.log(`Email queued for ${emailAddress}: ${subject}`);
        
        // Start processing if not already running
        if (!this.isProcessing) {
          this.processQueue(tenantId);
        }
        
        return result.rows[0];
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error adding email to queue:', error);
      throw error;
    }
  }

  async processQueue(tenantId) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Starting email queue processing...');
    
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        while (true) {
          // Get next email from queue
          const result = await client.query(`
            SELECT * FROM email_queue 
            WHERE status = 'queued' AND scheduled_time <= CURRENT_TIMESTAMP
            ORDER BY priority DESC, created_at ASC
            LIMIT 1
          `);
          
          if (result.rows.length === 0) {
            console.log('No emails in queue, stopping processor');
            break;
          }
          
          const email = result.rows[0];
          
          // Update status to sending
          await client.query(
            'UPDATE email_queue SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sending', email.id]
          );
          
          try {
            await this.sendEmail(email);
            
            // Update status to sent
            await client.query(`
              UPDATE email_queue SET 
                status = $1, 
                gateway_response = $2,
                updated_at = CURRENT_TIMESTAMP 
              WHERE id = $3
            `, ['sent', JSON.stringify({ status: 'success', sentAt: new Date() }), email.id]);
            
            console.log(`Email sent successfully to ${email.email_address}`);
            
          } catch (error) {
            console.error(`Failed to send email to ${email.email_address}:`, error);
            
            // Update retry count and status
            const newRetryCount = email.retry_count + 1;
            if (newRetryCount >= email.max_retries) {
              await client.query(`
                UPDATE email_queue SET 
                  status = $1, 
                  error_message = $2,
                  retry_count = $3,
                  updated_at = CURRENT_TIMESTAMP 
                WHERE id = $4
              `, ['failed', error.message, newRetryCount, email.id]);
            } else {
              const nextRetry = new Date(Date.now() + (newRetryCount * 300000)); // 5 minute backoff
              await client.query(`
                UPDATE email_queue SET 
                  status = $1, 
                  retry_count = $2,
                  next_retry = $3,
                  error_message = $4,
                  updated_at = CURRENT_TIMESTAMP 
                WHERE id = $5
              `, ['queued', newRetryCount, nextRetry, error.message, email.id]);
            }
          }
          
          // Small delay between emails
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async sendEmail(email) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@schoolmanagement.com',
      to: email.email_address,
      subject: email.subject,
      text: email.message,
      html: email.html_content || email.message
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

// Fee Reminder Service
class FeeReminderService {
  constructor() {
    this.smsQueue = new SMSQueueManager();
    this.emailQueue = new EmailQueueManager();
  }

  async sendOverdueReminders(tenantId) {
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        // Get overdue vouchers
        const overdueVouchers = await client.query(`
          SELECT 
            v.*,
            s.first_name || ' ' || s.last_name as student_name,
            s.phone as student_phone,
            s.email as student_email,
            c.class_name,
            ay.year_name as academic_year
          FROM fee_vouchers v
          LEFT JOIN students s ON v.student_id = s.id
          LEFT JOIN classes c ON v.class_id = c.id
          LEFT JOIN academic_years ay ON v.ay_id = ay.id
          WHERE v.status = 'pending' 
          AND v.due_date < CURRENT_DATE
          AND v.balance_amount > 0
        `);
        
        console.log(`Found ${overdueVouchers.rows.length} overdue vouchers`);
        
        for (const voucher of overdueVouchers.rows) {
          await this.sendReminderForVoucher(tenantId, voucher, 'overdue');
        }
        
        return {
          success: true,
          reminders_sent: overdueVouchers.rows.length
        };
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error sending overdue reminders:', error);
      throw error;
    }
  }

  async sendUpcomingDueReminders(tenantId, daysAhead = 3) {
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        // Get vouchers due in the next few days
        const upcomingVouchers = await client.query(`
          SELECT 
            v.*,
            s.first_name || ' ' || s.last_name as student_name,
            s.phone as student_phone,
            s.email as student_email,
            c.class_name,
            ay.year_name as academic_year
          FROM fee_vouchers v
          LEFT JOIN students s ON v.student_id = s.id
          LEFT JOIN classes c ON v.class_id = c.id
          LEFT JOIN academic_years ay ON v.ay_id = ay.id
          WHERE v.status = 'pending' 
          AND v.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysAhead} days'
          AND v.balance_amount > 0
        `);
        
        console.log(`Found ${upcomingVouchers.rows.length} upcoming due vouchers`);
        
        for (const voucher of upcomingVouchers.rows) {
          await this.sendReminderForVoucher(tenantId, voucher, 'upcoming');
        }
        
        return {
          success: true,
          reminders_sent: upcomingVouchers.rows.length
        };
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error sending upcoming due reminders:', error);
      throw error;
    }
  }

  async sendReminderForVoucher(tenantId, voucher, reminderType) {
    try {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      const client = await tenantPool.connect();
      
      try {
        // Check if reminder was already sent recently (within 24 hours)
        const recentReminder = await client.query(`
          SELECT id FROM fee_reminders 
          WHERE voucher_id = $1 
          AND sent_date >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
          AND status = 'sent'
        `, [voucher.id]);
        
        if (recentReminder.rows.length > 0) {
          console.log(`Reminder already sent recently for voucher ${voucher.voucher_number}`);
          return;
        }
        
        // Generate reminder messages
        const smsMessage = this.generateSMSMessage(voucher, reminderType);
        const emailMessage = this.generateEmailMessage(voucher, reminderType);
        
        // Record reminder in database
        const reminderResult = await client.query(`
          INSERT INTO fee_reminders (
            voucher_id, student_id, reminder_type, sent_date, 
            status, message_content
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
          RETURNING *
        `, [voucher.id, voucher.student_id, 'both', 'queued', smsMessage]);
        
        // Send SMS if phone number available
        if (voucher.student_phone) {
          await this.smsQueue.addToQueue(
            tenantId, 
            voucher.student_phone, 
            smsMessage, 
            reminderType === 'overdue' ? 'high' : 'medium'
          );
        }
        
        // Send Email if email available
        if (voucher.student_email) {
          const subject = `Fee ${reminderType === 'overdue' ? 'Overdue' : 'Due'} - ${voucher.voucher_number}`;
          await this.emailQueue.addToQueue(
            tenantId,
            voucher.student_email,
            subject,
            emailMessage.text,
            emailMessage.html,
            reminderType === 'overdue' ? 'high' : 'medium'
          );
        }
        
        // Update reminder status
        await client.query(
          'UPDATE fee_reminders SET status = $1 WHERE id = $2',
          ['sent', reminderResult.rows[0].id]
        );
        
        console.log(`Reminder sent for voucher ${voucher.voucher_number} to ${voucher.student_name}`);
        
      } finally {
        client.release();
        tenantPool.end();
      }
    } catch (error) {
      console.error('Error sending reminder for voucher:', error);
      throw error;
    }
  }

  generateSMSMessage(voucher, reminderType) {
    const daysOverdue = reminderType === 'overdue' 
      ? Math.floor((new Date() - new Date(voucher.due_date)) / (1000 * 60 * 60 * 24))
      : null;
    
    if (reminderType === 'overdue') {
      return `URGENT: Fee payment overdue by ${daysOverdue} days. Voucher: ${voucher.voucher_number}, Amount: ₹${voucher.balance_amount}, Student: ${voucher.student_name}. Please pay immediately.`;
    } else {
      return `Fee payment due on ${voucher.due_date}. Voucher: ${voucher.voucher_number}, Amount: ₹${voucher.balance_amount}, Student: ${voucher.student_name}. Pay before due date.`;
    }
  }

  generateEmailMessage(voucher, reminderType) {
    const daysOverdue = reminderType === 'overdue' 
      ? Math.floor((new Date() - new Date(voucher.due_date)) / (1000 * 60 * 60 * 24))
      : null;
    
    const text = reminderType === 'overdue' 
      ? `Dear Parent/Guardian,

This is an urgent reminder that the fee payment for ${voucher.student_name} is overdue by ${daysOverdue} days.

Voucher Details:
- Voucher Number: ${voucher.voucher_number}
- Student: ${voucher.student_name}
- Class: ${voucher.class_name}
- Academic Year: ${voucher.academic_year}
- Due Date: ${voucher.due_date}
- Amount Due: ₹${voucher.balance_amount}

Please make the payment immediately to avoid any inconvenience.

Thank you.`
      : `Dear Parent/Guardian,

This is a reminder that the fee payment for ${voucher.student_name} is due on ${voucher.due_date}.

Voucher Details:
- Voucher Number: ${voucher.voucher_number}
- Student: ${voucher.student_name}
- Class: ${voucher.class_name}
- Academic Year: ${voucher.academic_year}
- Due Date: ${voucher.due_date}
- Amount Due: ₹${voucher.balance_amount}

Please ensure payment is made before the due date.

Thank you.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${reminderType === 'overdue' ? '#dc3545' : '#007bff'};">
          Fee Payment ${reminderType === 'overdue' ? 'Overdue' : 'Reminder'}
        </h2>
        
        <p>Dear Parent/Guardian,</p>
        
        <p>${reminderType === 'overdue' 
          ? `This is an <strong>urgent reminder</strong> that the fee payment for <strong>${voucher.student_name}</strong> is overdue by <strong>${daysOverdue} days</strong>.`
          : `This is a reminder that the fee payment for <strong>${voucher.student_name}</strong> is due on <strong>${voucher.due_date}</strong>.`
        }</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Voucher Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td><strong>Voucher Number:</strong></td><td>${voucher.voucher_number}</td></tr>
            <tr><td><strong>Student:</strong></td><td>${voucher.student_name}</td></tr>
            <tr><td><strong>Class:</strong></td><td>${voucher.class_name}</td></tr>
            <tr><td><strong>Academic Year:</strong></td><td>${voucher.academic_year}</td></tr>
            <tr><td><strong>Due Date:</strong></td><td>${voucher.due_date}</td></tr>
            <tr><td><strong>Amount Due:</strong></td><td style="color: #dc3545; font-weight: bold;">₹${voucher.balance_amount}</td></tr>
          </table>
        </div>
        
        <p>${reminderType === 'overdue' 
          ? 'Please make the payment <strong>immediately</strong> to avoid any inconvenience.'
          : 'Please ensure payment is made before the due date.'
        }</p>
        
        <p>Thank you.</p>
      </div>
    `;

    return { text, html };
  }
}

// Initialize singleton instances
const feeReminderService = new FeeReminderService();

module.exports = {
  feeReminderService,
  SMSQueueManager,
  EmailQueueManager
};
