import { Router } from 'express';
import { getPool, sql } from '../config/database.js';

const router = Router();

// GET all settings
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT setting_key, setting_value
      FROM settings
    `);

        // Convert rows to object
        const settings: Record<string, any> = {};
        for (const row of result.recordset) {
            try {
                settings[row.setting_key] = JSON.parse(row.setting_value);
            } catch {
                settings[row.setting_key] = row.setting_value;
            }
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// GET single setting by key
router.get('/:key', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('key', sql.NVarChar, req.params.key)
            .query('SELECT setting_value FROM settings WHERE setting_key = @key');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        try {
            res.json(JSON.parse(result.recordset[0].setting_value));
        } catch {
            res.json(result.recordset[0].setting_value);
        }
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// PUT update setting (upsert)
router.put('/:key', async (req, res) => {
    try {
        const { value } = req.body;
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const pool = await getPool();
        await pool.request()
            .input('key', sql.NVarChar, req.params.key)
            .input('value', sql.NVarChar(sql.MAX), valueStr)
            .query(`
        MERGE settings AS target
        USING (SELECT @key AS setting_key) AS source
        ON target.setting_key = source.setting_key
        WHEN MATCHED THEN
          UPDATE SET setting_value = @value, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (setting_key, setting_value) VALUES (@key, @value);
      `);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// POST bulk update settings
router.post('/bulk', async (req, res) => {
    try {
        const settings = req.body;
        const pool = await getPool();

        for (const [key, value] of Object.entries(settings)) {
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await pool.request()
                .input('key', sql.NVarChar, key)
                .input('value', sql.NVarChar(sql.MAX), valueStr)
                .query(`
          MERGE settings AS target
          USING (SELECT @key AS setting_key) AS source
          ON target.setting_key = source.setting_key
          WHEN MATCHED THEN
            UPDATE SET setting_value = @value, updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (setting_key, setting_value) VALUES (@key, @value);
        `);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error bulk updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
