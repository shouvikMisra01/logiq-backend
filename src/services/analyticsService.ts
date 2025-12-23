// src/services/analyticsService.ts
import { collections } from '../config/database';

export class AnalyticsService {
    static async getSystemAnalytics() {
        const schoolsCol = collections.schools();
        const teachersCol = collections.teachers();
        const studentsCol = collections.students();
        const parentsCol = collections.parents();

        // 1. Total Counts
        const totalSchools = await schoolsCol.countDocuments();
        const totalTeachers = await teachersCol.countDocuments();
        const totalStudents = await studentsCol.countDocuments();
        const totalParents = await parentsCol.countDocuments();
        const activeSchools = await schoolsCol.countDocuments({ status: 'active' });

        // 2. Students per School Distribution (for charts)
        // We can use aggregation to group students by school_id
        const studentsPerSchool = await studentsCol.aggregate([
            {
                $group: {
                    _id: '$school_id',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        // Enrich with school names
        const schoolIds = studentsPerSchool.map((s: any) => s._id);
        const schools = await schoolsCol.find({ school_id: { $in: schoolIds } }).toArray();
        const schoolNameMap = new Map(schools.map(s => [s.school_id, s.name]));

        const studentsDistribution = studentsPerSchool.map((s: any) => ({
            school_id: s._id,
            school_name: schoolNameMap.get(s._id) || 'Unknown School',
            student_count: s.count
        })).slice(0, 10); // Top 10 schools by student count

        // 3. User Growth (Last 6 months) - simplified using created_at
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Helper to get monthly counts
        const getMonthlyGrowth = async (collection: any) => {
            return collection.aggregate([
                { $match: { created_at: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: {
                            month: { $month: '$created_at' },
                            year: { $year: '$created_at' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]).toArray();
        };

        const studentGrowth = await getMonthlyGrowth(studentsCol);
        const teacherGrowth = await getMonthlyGrowth(teachersCol);

        return {
            overview: {
                total_schools: totalSchools,
                total_teachers: totalTeachers,
                total_students: totalStudents,
                total_parents: totalParents,
                active_schools: activeSchools
            },
            students_distribution: studentsDistribution,
            growth_trends: {
                students: studentGrowth,
                teachers: teacherGrowth
            }
        };
    }
}
