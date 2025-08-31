export interface FeeStructure {
  id?: number;
  class_id: number;
  ay_id: number; // Academic Year ID
  tuition_fee: number;
  library_fee?: number;
  lab_fee?: number;
  sports_fee?: number;
  transport_fee?: number;
  examination_fee?: number;
  development_fee?: number;
  other_fees?: FeeItem[];
  total_annual_fee: number;
  installments: number;
  installment_amount: number;
  due_dates: string[]; // Array of due dates for each installment
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface FeeItem {
  id?: string;
  name: string;
  amount: number;
  is_optional: boolean;
  description?: string;
}

export interface FeeVoucher {
  id?: number;
  voucher_number: string;
  student_id: number;
  class_id: number;
  ay_id: number;
  fee_structure_id: number;
  installment_number: number;
  due_date: string;
  amount_due: number;
  discount_amount: number;
  scholarship_amount: number;
  final_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  generated_date: string;
  generated_by: number;
  student_name?: string;
  class_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeePayment {
  id?: number;
  voucher_id: number;
  student_id: number;
  payment_date: string;
  amount_paid: number;
  payment_method: 'cash' | 'online' | 'cheque' | 'bank_transfer';
  transaction_id?: string;
  gateway_reference?: string;
  receipt_number: string;
  notes?: string;
  processed_by: number;
  gateway_response?: any;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at?: string;
  updated_at?: string;
}

export interface Discount {
  id?: number;
  discount_name: string;
  discount_type: 'percentage' | 'fixed' | 'conditional';
  discount_value: number;
  applicable_to: 'all' | 'class' | 'student';
  class_ids?: number[];
  student_ids?: number[];
  max_amount?: number;
  valid_from: string;
  valid_to: string;
  status: 'active' | 'inactive' | 'expired';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Scholarship {
  id?: number;
  scholarship_name: string;
  scholarship_type: 'percentage' | 'fixed';
  scholarship_value: number;
  criteria: string;
  max_students?: number;
  current_recipients: number;
  valid_from: string;
  valid_to: string;
  status: 'active' | 'inactive' | 'expired';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentScholarship {
  id?: number;
  student_id: number;
  scholarship_id: number;
  academic_year_id: number;
  awarded_date: string;
  amount: number;
  valid_from: string;
  valid_to: string;
  status: 'active' | 'suspended' | 'expired';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeReminder {
  id?: number;
  voucher_id: number;
  student_id: number;
  reminder_type: 'sms' | 'email' | 'both';
  due_date: string;
  sent_date: string;
  last_sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'queued' | 'delivered';
  message_content: string;
  gateway_response?: any;
  retry_count: number;
  next_retry?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentGateway {
  id?: number;
  name: string;
  type: 'razorpay' | 'payu' | 'stripe' | 'paypal';
  api_key: string;
  secret_key: string;
  webhook_url: string;
  is_active: boolean;
  test_mode: boolean;
  currency: string;
  supported_methods: string[];
  configuration?: any;
  created_at?: string;
  updated_at?: string;
}

// Component Props Interfaces
export interface FeeStructureFormProps {
  feeStructure?: FeeStructure | null;
  classes: Array<{ id: number; class_name: string; grade_level: string }>;
  academicYears: Array<{ id: number; label: string; status: string }>;
  onClose: () => void;
  onSuccess: (feeStructure: FeeStructure) => void;
}

export interface VoucherGenerationProps {
  classes: Array<{ id: number; class_name: string; grade_level: string }>;
  academicYears: Array<{ id: number; label: string; status: string }>;
  onClose: () => void;
  onSuccess: (vouchers: FeeVoucher[]) => void;
}

export interface PaymentFormProps {
  voucher: FeeVoucher;
  onClose: () => void;
  onSuccess: (payment: FeePayment) => void;
}

export interface DiscountFormProps {
  discount?: Discount | null;
  classes: Array<{ id: number; class_name: string; grade_level: string }>;
  students: Array<{ id: number; first_name: string; last_name: string }>;
  onClose: () => void;
  onSuccess: (discount: Discount) => void;
}

export interface ScholarshipFormProps {
  scholarship?: Scholarship | null;
  onClose: () => void;
  onSuccess: (scholarship: Scholarship) => void;
}

export interface FeeReportsProps {
  classes: Array<{ id: number; class_name: string; grade_level: string }>;
  academicYears: Array<{ id: number; label: string; status: string }>;
}

export interface SMSQueueItem {
  id?: number;
  phone_number: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  scheduled_time: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailQueueItem {
  id?: number;
  email_address: string;
  subject: string;
  message: string;
  html_content?: string;
  priority: 'high' | 'medium' | 'low';
  scheduled_time: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

// API Response Interfaces
export interface FeeStructureResponse {
  success: boolean;
  data?: FeeStructure | FeeStructure[];
  error?: string;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_records: number;
    limit: number;
  };
}

export interface PaymentResponse {
  success: boolean;
  data?: FeePayment;
  error?: string;
  receipt_url?: string;
}

export interface VoucherResponse {
  success: boolean;
  data?: FeeVoucher | FeeVoucher[];
  error?: string;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_records: number;
    limit: number;
  };
}

export interface ReminderResponse {
  success: boolean;
  data?: {
    sent_count: number;
    failed_count: number;
    queued_count: number;
  };
  error?: string;
}

export interface Voucher {
  id: number;
  student_id: number;
  class_id: number;
  fee_structure_id: number;
  ay_id: number; // Matches database schema
  voucher_number: string;
  due_date: string;
  installment_number: number;
  amount_due: number; // Matches database schema
  discount_amount: number;
  scholarship_amount: number;
  final_amount: number; // Matches database schema
  amount_paid: number;
  balance_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  student_name?: string;
  class_name?: string;
  generated_date: string;
  generated_by?: number;
  created_at: string;
  updated_at: string;
}
