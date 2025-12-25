import { Router } from 'express';
import { getPool, sql } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all users
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT 
        id, name, email, role, department, avatar_url as avatarUrl,
        can_dept_review as canDeptReview,
        email_pref_instant as emailPrefInstant,
        email_pref_daily as emailPrefDaily
      FROM users
      WHERE is_deleted = 0
      ORDER BY name
    `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query(`
        SELECT 
          id, name, email, role, department, avatar_url as avatarUrl,
          can_dept_review as canDeptReview,
          email_pref_instant as emailPrefInstant,
          email_pref_daily as emailPrefDaily
        FROM users
        WHERE id = @id AND is_deleted = 0
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST create user
router.post('/', async (req, res) => {
    try {
        const { name, email, role, department, avatarUrl, canDeptReview } = req.body;
        const id = uuidv4();

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('role', sql.NVarChar, role || 'User')
            .input('department', sql.NVarChar, department)
            .input('avatarUrl', sql.NVarChar, avatarUrl || '')
            .input('canDeptReview', sql.Bit, canDeptReview || false)
            .query(`
        INSERT INTO users (id, name, email, role, department, avatar_url, can_dept_review)
        VALUES (@id, @name, @email, @role, @department, @avatarUrl, @canDeptReview)
      `);

        res.status(201).json({ id, name, email, role, department, avatarUrl, canDeptReview });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT update user
router.put('/:id', async (req, res) => {
    try {
        const { name, email, role, department, avatarUrl, canDeptReview, emailPreferences } = req.body;

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('role', sql.NVarChar, role)
            .input('department', sql.NVarChar, department)
            .input('avatarUrl', sql.NVarChar, avatarUrl || '')
            .input('canDeptReview', sql.Bit, canDeptReview || false)
            .input('emailPrefInstant', sql.Bit, emailPreferences?.instant || false)
            .input('emailPrefDaily', sql.Bit, emailPreferences?.daily || false)
            .query(`
        UPDATE users SET
          name = @name,
          email = @email,
          role = @role,
          department = @department,
          avatar_url = @avatarUrl,
          can_dept_review = @canDeptReview,
          email_pref_instant = @emailPrefInstant,
          email_pref_daily = @emailPrefDaily,
          updated_at = GETDATE()
        WHERE id = @id
      `);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE user (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query('UPDATE users SET is_deleted = 1, deleted_at = GETDATE() WHERE id = @id');

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
