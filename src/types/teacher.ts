export interface TeacherDoc {
  _id?: any;
  teacher_id: string;
  school_id: string;
  name: string;
  email: string;
  role: 'teacher' | 'mentor' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface TeacherAssignmentDoc {
  _id?: any;
  assignment_id: string;
  teacher_id: string;
  school_id: string;
  type: 'class' | 'subject' | 'manual';
  class_ids?: string[];
  subject_map?: { class_id: string; subject_id: string }[];
  student_ids?: string[];
  meta?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
