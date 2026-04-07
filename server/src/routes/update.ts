import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { requireAdmin } from '../middleware/adminAuth.js';

const execAsync = promisify(exec);
const router = Router();

// Update endpoint - triggers the update script
router.post('/update', requireAdmin, async (req, res) => {
  try {
    // Check if we're running in a Docker container
    const isDocker = await checkIfDocker();
    
    if (!isDocker) {
      return res.status(400).json({
        success: false,
        message: 'Update is only available when running in Docker'
      });
    }

    // Use absolute path and validate it exists
    const scriptPath = path.resolve('/app/scripts/update-internal.sh');
    
    // Ensure the path is within expected directory
    if (!scriptPath.startsWith('/app/scripts/')) {
      return res.status(500).json({
        success: false,
        message: 'Invalid script path'
      });
    }
    
    try {
      await execAsync(`test -f "${scriptPath}"`);
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Update script not found. Ensure /app/scripts is mounted correctly.'
      });
    }

    // Verify script is executable
    try {
      await execAsync(`test -x "${scriptPath}"`);
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Update script is not executable'
      });
    }

    // Execute the update script in the background
    // We need to detach the process so it continues after the API returns
    exec(`"${scriptPath}" > /tmp/update.log 2>&1 &`, (error) => {
      if (error) {
        console.error('Error starting update:', error);
      }
    });

    res.json({
      success: true,
      message: 'Update started successfully'
    });
  } catch (error) {
    console.error('Error triggering update:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to trigger update'
    });
  }
});

// Helper function to check if running in Docker
async function checkIfDocker(): Promise<boolean> {
  try {
    // Check for .dockerenv file (most reliable indicator)
    await execAsync('test -f /.dockerenv');
    return true;
  } catch {
    try {
      // Check /proc/1/cgroup for docker/containerd
      const { stdout } = await execAsync('cat /proc/1/cgroup 2>/dev/null || echo ""');
      return stdout.includes('docker') || stdout.includes('containerd');
    } catch {
      return false;
    }
  }
}

// Get current version endpoint
router.get('/version', async (req, res) => {
  try {
    // Try to get version from package.json
    const version = process.env.APP_VERSION || '1.0.0';
    
    res.json({
      version,
      isDocker: await checkIfDocker()
    });
  } catch (error) {
    console.error('Error getting version:', error);
    res.status(500).json({
      error: 'Failed to get version information'
    });
  }
});

export default router;
