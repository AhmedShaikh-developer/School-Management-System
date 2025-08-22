export interface Student {
  id?: number;
  student_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string | null;
  gender?: string;
  address?: string;
  parent_id?: number;
  class_id?: number | null | 'unassigned';
  ay_id?: number | null; // Academic Year ID
  enrollment_date?: string | null;
  status?: string;
  class_name?: string;
  grade_level?: string;
  photo_url?: string | null; // Student photo URL
  biometric_data?: any | null; // Biometric data (JSON)
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_conditions?: string;
  allergies?: string;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  mother_tongue?: string;
  previous_school?: string;
}

export interface StudentListProps {
  students: Student[];
  loading: boolean;
  pagination: {
    current_page: number;
    total_pages: number;
    total_students: number;
    limit: number;
  };
  onPageChange: (page: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (studentId: number) => void;
  onTransfer: (studentId: number) => void;
  onAssignClass: (student: Student) => void;
}

export interface StudentFormProps {
  student?: Student | null;
  classes: Array<{ id: number; class_name: string; grade_level: string }>;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

export interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: (importData: any) => void;
}

export interface ImportError {
  row: number;
  error: string;
}
