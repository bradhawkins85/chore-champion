import { Router } from 'express';

const router = Router();

// Get SMTP configuration status
router.get('/smtp-status', (req, res) => {
  try {
    const smtpEnabled = process.env.SMTP_ENABLED === 'true';
    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM_EMAIL
    );

    res.json({
      enabled: smtpEnabled && smtpConfigured,
      configured: smtpConfigured,
    });
  } catch (error) {
    console.error('Error getting SMTP status:', error);
    res.status(500).json({
      error: 'Failed to get SMTP status'
    });
  }
});

export default router;
