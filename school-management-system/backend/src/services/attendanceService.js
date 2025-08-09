const { createTenantPool } = require('../config/database');
const smsService = require('./smsService');

class AttendanceService {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.tenantPool = createTenantPool(tenantId);
  }

  // Get attendance configuration for a class
  async getAttendanceConfig(classId) {
    try {
      const client = await this.tenantPool.connect();
      const result = await client.query(`
        SELECT * FROM attendance_config WHERE class_id = $1
      `, [classId]);
      client.release();
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting attendance config:', error);
      throw error;
    }
  }

  // Update attendance configuration for a class
  async updateAttendanceConfig(classId, config) {
    try {
      const client = await this.tenantPool.connect();
      const {
        attendance_mode,
        grace_time_minutes,
        cut_off_time_minutes,
        sms_alerts_enabled,
        offline_mode_enabled,
        conflict_resolution
      } = config;

      // Check if biometric mode is allowed for this tenant
      if (attendance_mode === 'biometric') {
        const biometricEnabled = await this.checkBiometricEnabled();
        if (!biometricEnabled) {
          throw new Error('Biometric attendance is not enabled for this school');
        }
      }

      const result = await client.query(`
        INSERT INTO attendance_config (
          class_id, attendance_mode, grace_time_minutes, cut_off_time_minutes,
          sms_alerts_enabled, offline_mode_enabled, conflict_resolution
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (class_id) DO UPDATE SET
          attendance_mode = EXCLUDED.attendance_mode,
          grace_time_minutes = EXCLUDED.grace_time_minutes,
          cut_off_time_minutes = EXCLUDED.cut_off_time_minutes,
          sms_alerts_enabled = EXCLUDED.sms_alerts_enabled,
          offline_mode_enabled = EXCLUDED.offline_mode_enabled,
          conflict_resolution = EXCLUDED.conflict_resolution,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [classId, attendance_mode, grace_time_minutes, cut_off_time_minutes,
          sms_alerts_enabled, offline_mode_enabled, conflict_resolution]);

      client.release();
      return result.rows[0];
    } catch (error) {
      console.error('Error updating attendance config:', error);
      throw error;
    }
  }

  // Check if biometric attendance is enabled for this tenant
  async checkBiometricEnabled() {
    try {
      const { mainPool } = require('../config/database');
      const client = await mainPool.connect();
      const result = await client.query(`
        SELECT biometric_enabled FROM tenant_biometric_settings WHERE tenant_id = $1
      `, [this.tenantId]);
      client.release();
      return result.rows[0]?.biometric_enabled || false;
    } catch (error) {
      console.error('Error checking biometric enabled:', error);
      return false;
    }
  }

  // Record attendance
  async recordAttendance(attendanceData) {
    try {
      const client = await this.tenantPool.connect();
      const {
        student_id,
        class_id,
        date,
        time_in,
        time_out,
        status,
        attendance_mode,
        device_id,
        location_data,
        remarks,
        recorded_by
      } = attendanceData;

      // Check for conflicts
      const conflicts = await this.checkAttendanceConflicts(student_id, class_id, date, time_in);
      if (conflicts.length > 0) {
        await this.handleAttendanceConflicts(conflicts, attendanceData);
      }

      // Record attendance
      const result = await client.query(`
        INSERT INTO attendance (
          student_id, class_id, date, time_in, time_out, status,
          attendance_mode, device_id, location_data, remarks, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [student_id, class_id, date, time_in, time_out, status,
          attendance_mode, device_id, location_data, remarks, recorded_by]);

      // Send SMS alert if enabled
      if (status === 'absent' || status === 'late') {
        await this.sendAttendanceAlert(student_id, status);
      }

      client.release();
      return result.rows[0];
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  }

  // Check for attendance conflicts
  async checkAttendanceConflicts(studentId, classId, date, timeIn) {
    try {
      const client = await this.tenantPool.connect();
      const result = await client.query(`
        SELECT * FROM attendance 
        WHERE student_id = $1 AND class_id = $2 AND date = $3
        ORDER BY created_at DESC
      `, [studentId, classId, date]);
      client.release();

      const conflicts = [];
      if (result.rows.length > 0) {
        // Check for duplicate entries
        if (result.rows.length > 1) {
          conflicts.push({
            type: 'duplicate_entry',
            existing_records: result.rows,
            new_record: { time_in: timeIn }
          });
        }

        // Check for time overlap
        const existingRecord = result.rows[0];
        if (existingRecord.time_in && timeIn) {
          const timeDiff = Math.abs(new Date(`2000-01-01 ${existingRecord.time_in}`) - new Date(`2000-01-01 ${timeIn}`));
          if (timeDiff < 5 * 60 * 1000) { // 5 minutes
            conflicts.push({
              type: 'time_overlap',
              existing_record: existingRecord,
              new_record: { time_in: timeIn }
            });
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking attendance conflicts:', error);
      return [];
    }
  }

  // Handle attendance conflicts
  async handleAttendanceConflicts(conflicts, newAttendanceData) {
    try {
      const client = await this.tenantPool.connect();
      
      for (const conflict of conflicts) {
        // Log conflict
        await client.query(`
          INSERT INTO attendance_conflicts (
            student_id, class_id, date, conflict_type, conflict_data
          ) VALUES ($1, $2, $3, $4, $5)
        `, [newAttendanceData.student_id, newAttendanceData.class_id, newAttendanceData.date,
            conflict.type, JSON.stringify(conflict)]);

        // Apply conflict resolution based on config
        const config = await this.getAttendanceConfig(newAttendanceData.class_id);
        const resolutionMethod = config?.conflict_resolution || 'latest';

        if (resolutionMethod === 'latest') {
          // Update existing record with latest data
          await client.query(`
            UPDATE attendance 
            SET time_in = $1, time_out = $2, status = $3, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $4 AND class_id = $5 AND date = $6
          `, [newAttendanceData.time_in, newAttendanceData.time_out, newAttendanceData.status,
              newAttendanceData.student_id, newAttendanceData.class_id, newAttendanceData.date]);
        }
        // Add more resolution methods as needed
      }

      client.release();
    } catch (error) {
      console.error('Error handling attendance conflicts:', error);
      throw error;
    }
  }

  // Send attendance alert via SMS
  async sendAttendanceAlert(studentId, status) {
    try {
      const client = await this.tenantPool.connect();
      
      // Get student and parent information
      const studentResult = await client.query(`
        SELECT s.*, p.phone as parent_phone 
        FROM students s 
        LEFT JOIN parents p ON s.parent_id = p.id 
        WHERE s.id = $1
      `, [studentId]);

      if (studentResult.rows.length === 0) {
        client.release();
        return;
      }

      const student = studentResult.rows[0];
      const config = await this.getAttendanceConfig(student.class_id);

      if (!config?.sms_alerts_enabled || !student.parent_phone) {
        client.release();
        return;
      }

      // Create alert message
      const message = this.createAlertMessage(student, status);
      
      // Store SMS alert
      await client.query(`
        INSERT INTO sms_alerts (
          student_id, alert_type, message, phone_number
        ) VALUES ($1, $2, $3, $4)
      `, [studentId, status, message, student.parent_phone]);

      // Send SMS
      try {
        await smsService.sendSMS(student.parent_phone, message);
        
        // Update SMS status
        await client.query(`
          UPDATE sms_alerts 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
          WHERE student_id = $1 AND alert_type = $2 AND status = 'pending'
        `, [studentId, status]);
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
        await client.query(`
          UPDATE sms_alerts 
          SET status = 'failed' 
          WHERE student_id = $1 AND alert_type = $2 AND status = 'pending'
        `, [studentId, status]);
      }

      client.release();
    } catch (error) {
      console.error('Error sending attendance alert:', error);
    }
  }

  // Create alert message
  createAlertMessage(student, status) {
    const studentName = `${student.first_name} ${student.last_name}`;
    const date = new Date().toLocaleDateString();
    
    switch (status) {
      case 'absent':
        return `Dear Parent, ${studentName} was absent from class on ${date}. Please contact the school if this is unexpected.`;
      case 'late':
        return `Dear Parent, ${studentName} arrived late to class on ${date}. Please ensure timely arrival.`;
      case 'early_departure':
        return `Dear Parent, ${studentName} left class early on ${date}. Please contact the school for details.`;
      default:
        return `Dear Parent, attendance update for ${studentName} on ${date}.`;
    }
  }

  // Generate QR code for attendance
  async generateQRCode(classId, validFrom, validUntil, createdBy) {
    try {
      const client = await this.tenantPool.connect();
      const qrCode = `QR_${classId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(`
        INSERT INTO qr_codes (class_id, qr_code, valid_from, valid_until, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [classId, qrCode, validFrom, validUntil, createdBy]);

      client.release();
      return result.rows[0];
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Validate QR code for attendance
  async validateQRCode(qrCode, classId) {
    try {
      const client = await this.tenantPool.connect();
      const result = await client.query(`
        SELECT * FROM qr_codes 
        WHERE qr_code = $1 AND class_id = $2 AND is_active = true
        AND valid_from <= CURRENT_TIMESTAMP AND valid_until >= CURRENT_TIMESTAMP
      `, [qrCode, classId]);

      client.release();
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error validating QR code:', error);
      return null;
    }
  }

  // Get attendance report
  async getAttendanceReport(classId, startDate, endDate) {
    try {
      const client = await this.tenantPool.connect();
      const result = await client.query(`
        SELECT 
          s.student_id,
          s.first_name,
          s.last_name,
          a.date,
          a.time_in,
          a.time_out,
          a.status,
          a.attendance_mode,
          a.remarks
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.class_id = $1 AND a.date BETWEEN $2 AND $3
        ORDER BY a.date DESC, s.first_name, s.last_name
      `, [classId, startDate, endDate]);

      client.release();
      return result.rows;
    } catch (error) {
      console.error('Error getting attendance report:', error);
      throw error;
    }
  }

  // Get attendance statistics
  async getAttendanceStatistics(classId, date) {
    try {
      const client = await this.tenantPool.connect();
      const result = await client.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM attendance 
        WHERE class_id = $1 AND date = $2
        GROUP BY status
      `, [classId, date]);

      client.release();
      return result.rows;
    } catch (error) {
      console.error('Error getting attendance statistics:', error);
      throw error;
    }
  }

  // Sync offline attendance
  async syncOfflineAttendance() {
    try {
      const client = await this.tenantPool.connect();
      const offlineRecords = await client.query(`
        SELECT * FROM offline_attendance_queue 
        WHERE sync_status = 'pending'
        ORDER BY created_at ASC
      `);

      for (const record of offlineRecords.rows) {
        try {
          // Record attendance
          await this.recordAttendance({
            student_id: record.student_id,
            class_id: record.class_id,
            date: record.date,
            time_in: record.time_in,
            time_out: record.time_out,
            status: record.status,
            attendance_mode: 'offline',
            device_id: record.device_id,
            recorded_by: null
          });

          // Mark as synced
          await client.query(`
            UPDATE offline_attendance_queue 
            SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [record.id]);
        } catch (error) {
          // Mark as failed
          await client.query(`
            UPDATE offline_attendance_queue 
            SET sync_status = 'failed', sync_attempts = sync_attempts + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [record.id]);
        }
      }

      client.release();
    } catch (error) {
      console.error('Error syncing offline attendance:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    if (this.tenantPool) {
      await this.tenantPool.end();
    }
  }
}

module.exports = AttendanceService;
