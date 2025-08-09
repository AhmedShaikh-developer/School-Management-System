const axios = require('axios');

class SMSService {
  constructor() {
    this.apiKey = process.env.SMS_API_KEY;
    this.apiUrl = process.env.SMS_API_URL;
    this.senderId = process.env.SMS_SENDER_ID;
  }

  // Send SMS
  async sendSMS(phoneNumber, message) {
    try {
      if (!this.apiKey || !this.apiUrl) {
        console.log('SMS service not configured, skipping SMS send');
        return { success: false, message: 'SMS service not configured' };
      }

      const payload = {
        api_key: this.apiKey,
        sender_id: this.senderId,
        phone_number: phoneNumber,
        message: message
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.success) {
        console.log(`SMS sent successfully to ${phoneNumber}`);
        return { success: true, messageId: response.data.message_id };
      } else {
        console.error('SMS sending failed:', response.data);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk SMS
  async sendBulkSMS(phoneNumbers, message) {
    try {
      const results = [];
      for (const phoneNumber of phoneNumbers) {
        const result = await this.sendSMS(phoneNumber, message);
        results.push({ phoneNumber, ...result });
      }
      return results;
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      throw error;
    }
  }

  // Send attendance alert SMS
  async sendAttendanceAlert(phoneNumber, studentName, status, date) {
    const message = this.createAttendanceAlertMessage(studentName, status, date);
    return await this.sendSMS(phoneNumber, message);
  }

  // Create attendance alert message
  createAttendanceAlertMessage(studentName, status, date) {
    const formattedDate = new Date(date).toLocaleDateString();
    
    switch (status) {
      case 'absent':
        return `Dear Parent, ${studentName} was absent from class on ${formattedDate}. Please contact the school if this is unexpected.`;
      case 'late':
        return `Dear Parent, ${studentName} arrived late to class on ${formattedDate}. Please ensure timely arrival.`;
      case 'early_departure':
        return `Dear Parent, ${studentName} left class early on ${formattedDate}. Please contact the school for details.`;
      default:
        return `Dear Parent, attendance update for ${studentName} on ${formattedDate}.`;
    }
  }
}

// Export singleton instance
const smsService = new SMSService();
module.exports = smsService;
