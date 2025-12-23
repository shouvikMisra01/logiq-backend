import { ObjectId } from 'mongodb';
import { AuthFields } from './auth';

export interface StudentDoc extends AuthFields {
    _id?: ObjectId;
    student_id: string;
    name: string;
    email: string;
    class_id: string; // e.g., "Class 9"
    school_id: string;
    date_of_birth?: string;
    enrollment_date?: Date;
    roll?: string;
    created_at: Date;
    updated_at: Date;
}

export interface ParentDoc extends AuthFields {
    _id?: ObjectId;
    parent_id: string;
    name: string;
    email: string;
    school_id: string;
    child_student_id: string;
    child_name: string;
    child_class_label: string;
    child_class_number: number;
    created_at: Date;
    updated_at: Date;
}

export type AdminRole = 'super_admin' | 'school_admin';

export interface AdminDoc extends AuthFields {
    _id?: ObjectId;
    admin_id: string;
    name: string;
    email: string;
    role: AdminRole;
    school_id?: string; // Required for school_admin
    created_at: Date;
    updated_at: Date;
}
