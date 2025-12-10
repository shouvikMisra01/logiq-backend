// src/controllers/passwordController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuthService } from '../services/authService';
import { collections } from '../config/database';

export class PasswordController {
  /**
   * Change password for authenticated user
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }

      // Determine which collection to update based on role
      let collection;
      let idField;
      let userDoc: any;

      switch (user.role) {
        case 'student':
          collection = collections.students();
          idField = 'student_id';
          userDoc = await collection.findOne({ student_id: user.userId });
          break;
        case 'super_admin':
        case 'school_admin':
          collection = collections.admins();
          idField = 'admin_id';
          userDoc = await collection.findOne({ admin_id: user.userId });
          break;
        case 'parent':
          collection = collections.parents();
          idField = 'parent_id';
          userDoc = await collection.findOne({ parent_id: user.userId });
          break;
        case 'teacher':
          collection = collections.teachers();
          idField = 'teacher_id';
          userDoc = await collection.findOne({ teacher_id: user.userId });
          break;
        default:
          res.status(400).json({ error: 'Invalid user role' });
          return;
      }

      if (!userDoc) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      if (!AuthService.verifyPassword(currentPassword, userDoc.password_hash)) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const newPasswordHash = AuthService.hashPassword(newPassword);

      // Update password
      await collection.updateOne(
        { [idField]: user.userId },
        {
          $set: {
            password_hash: newPasswordHash,
            updated_at: new Date().toISOString()
          }
        }
      );

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error: any) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
