import { Router, Request, Response } from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const router = Router();

// Proxy endpoint for ICS feed fetching
// This solves the 403 error issue by fetching ICS feeds from the backend
// with proper User-Agent headers instead of directly from the browser
router.get('/ics-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are allowed' });
    }
    
    console.log(`Proxying ICS feed request to: ${url}`);
    
    // Make the request with proper headers
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const fetchPromise = new Promise<string>((resolve, reject) => {
      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000, // 30 second timeout
      }, (response) => {
        let data = '';
        
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`Following redirect to: ${redirectUrl}`);
            return reject(new Error(`Redirect to: ${redirectUrl}`));
          }
        }
        
        if (response.statusCode !== 200) {
          return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve(data);
        });
      });
      
      request.on('error', (err) => {
        reject(err);
      });
      
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
    
    try {
      const icsData = await fetchPromise;
      
      // Validate that it's actually an ICS file
      if (!icsData.includes('BEGIN:VCALENDAR')) {
        console.warn('Response does not appear to be a valid ICS file');
        return res.status(400).json({ error: 'Response is not a valid ICS file' });
      }
      
      // Return the ICS data with appropriate content type
      res.type('text/calendar');
      res.send(icsData);
    } catch (err) {
      // Handle redirects by re-fetching
      if (err instanceof Error && err.message.startsWith('Redirect to:')) {
        const redirectUrl = err.message.replace('Redirect to: ', '');
        // For simplicity, return an error and let the client retry
        // In a production system, you might want to follow redirects automatically
        return res.status(302).json({ error: 'Redirect required', redirectUrl });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error proxying ICS feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch ICS feed',
      details: errorMessage 
    });
  }
});

export default router;
