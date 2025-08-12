export interface Class {
  id?: number;
  class_name: string;
  grade_level: string;
  section?: string;
  capacity?: number;
  academic_year?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassListProps {
  classes: Class[];
  onEdit: (classData: Class) => void;
  onDelete: (classId: number) => void;
  loading: boolean;
}

export interface ClassFormProps {
  classData?: Class | null;
  onClose: () => void;
  onSuccess: (classData: Class) => void;
}
