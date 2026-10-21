import { Router, type Response, type NextFunction } from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import { getNtfySettingsRow, publicNtfySettings, updateNtfySettings, NtfyValidationError } from '../services/ntfy-settings.js';
import { publishNtfy } from '../services/ntfy.js';

const router = Router();
router.use(authenticateToken);
router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.viewOnly) return res.status(403).json({ error: 'Ntfy settings are unavailable in view-only mode' });
  next();
});

router.get('/settings', async (req: AuthRequest, res: Response) => {
  try { res.json(publicNtfySettings(await getNtfySettingsRow(req.tenantId!))); }
  catch { res.status(500).json({ error: 'Unable to load ntfy settings' }); }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try { res.json(await updateNtfySettings(req.tenantId!, req.body)); }
  catch (error) {
    if (error instanceof NtfyValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Unable to save ntfy settings' });
  }
});

router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const row = await getNtfySettingsRow(req.tenantId!);
    if (!row.enabled) return res.status(400).json({ error: 'Enable and save ntfy notifications before sending a test' });
    try {
      await publishNtfy(row, { title: 'ChoreQuest test notification', message: 'Your family notifications are connected. Chore and reward updates will appear in this topic.' });
      await pool.query('UPDATE tenant_ntfy_settings SET last_delivered_at = NOW(), last_error = NULL WHERE tenant_id = ?', [req.tenantId]);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ntfy delivery failed';
      await pool.query('UPDATE tenant_ntfy_settings SET last_error = ? WHERE tenant_id = ?', [message, req.tenantId]);
      res.status(502).json({ error: message });
    }
  } catch { res.status(500).json({ error: 'Unable to send test notification' }); }
});

export default router;
