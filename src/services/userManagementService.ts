// src/services/userManagementService.ts
import { collections } from '../config/database';

export class UserManagementService {
    static async getAllUsers(role?: string, search?: string, limit: number = 50, skip: number = 0) {
        const users: any[] = [];
        let totalCount = 0;

        const regex = search ? new RegExp(search, 'i') : null;
        const filter: any = {};
        if (regex) {
            filter.$or = [
                { name: regex },
                { email: regex }
            ];
        }

        // This is a unified view, so we might need to query different collections based on role
        // If role is unspecified, this approach might be slow if we query all.
        // For V1, let's prioritizing specific role queries or a parallel fetch if 'all'.

        const fetchCollection = async (collectionName: keyof typeof collections, type: string) => {
            // @ts-ignore
            const col = collections[collectionName]();
            const query = { ...filter };
            // Add specific filters if needed

            const docs = await col.find(query).limit(limit).skip(skip).toArray();
            return docs.map((d: any) => ({
                _id: d._id,
                id: d.student_id || d.teacher_id || d.parent_id || d.admin_id,
                name: d.name,
                email: d.email,
                role: type, // Normalized role
                school_id: d.school_id,
                created_at: d.created_at,
                status: d.status || (d.is_verified ? 'verified' : 'pending')
            }));
        };

        if (role === 'student') {
            users.push(...await fetchCollection('students', 'student'));
            totalCount = await collections.students().countDocuments(filter);
        } else if (role === 'teacher') {
            users.push(...await fetchCollection('teachers', 'teacher'));
            totalCount = await collections.teachers().countDocuments(filter);
        } else if (role === 'school_admin') {
            users.push(...await fetchCollection('school_admins', 'school_admin'));
            totalCount = await collections.school_admins().countDocuments(filter);
        } else if (role === 'parent') {
            users.push(...await fetchCollection('parents', 'parent'));
            totalCount = await collections.parents().countDocuments(filter);
        } else {
            // "All" View - Fetching a subset from each is tricky for pagination.
            // For now, let's fetch top 20 from each to fill the list if no role is selected, 
            // OR better: force a role filter or default to 'student' if undefined?
            // Requirement says: "users button will open a page where overall all role of users data can be seen in a structured way"
            // Let's default to fetching all but limit per category.

            const [students, teachers, admins, parents] = await Promise.all([
                fetchCollection('students', 'student'),
                fetchCollection('teachers', 'teacher'),
                fetchCollection('school_admins', 'school_admin'),
                fetchCollection('parents', 'parent')
            ]);

            users.push(...admins, ...teachers, ...students, ...parents);
            // This total count is approximate for "All" view pagination support, which is complex across collections
            totalCount = users.length;
        }

        return {
            users,
            total: totalCount
        };
    }
}
