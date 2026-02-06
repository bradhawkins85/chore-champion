import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import type { RowDataPacket } from 'mysql2';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, original_name, file_type, mime_type, file_path, created_at
      FROM wallpaper_assets
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    const wallpapers = rows.map((row) => ({
      id: row.id,
      name: row.original_name,
      fileType: row.file_type,
      mimeType: row.mime_type,
      url: `/uploads/${row.file_path}`,
      createdAt: row.created_at,
    }));

    res.json({ wallpapers });
  } catch (error) {
    console.error('Error fetching wallpaper gallery:', error);
    res.status(500).json({ error: 'Failed to fetch wallpaper gallery' });
  }
});

export default router;
