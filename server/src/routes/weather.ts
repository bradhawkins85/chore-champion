import { Router } from 'express';

const router = Router();

const OPEN_METEO_API = 'https://api.open-meteo.com';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com';

function parseCoordinate(value: unknown, name: string): { value: number; error?: never } | { value?: never; error: string } {
  const num = Number(value);
  if (!value || isNaN(num) || !isFinite(num)) {
    return { error: `${name} must be a valid number` };
  }
  return { value: num };
}

// Proxy weather forecast from Open-Meteo
router.get('/forecast', async (req, res) => {
  try {
    const lat = parseCoordinate(req.query.latitude, 'latitude');
    const lon = parseCoordinate(req.query.longitude, 'longitude');

    if (lat.error) return res.status(400).json({ error: lat.error });
    if (lon.error) return res.status(400).json({ error: lon.error });

    // Match original frontend default: fahrenheit when unit is not explicitly 'celsius'
    const temperatureUnit = req.query.unit === 'celsius' ? 'celsius' : 'fahrenheit';
    const url = `${OPEN_METEO_API}/v1/forecast?latitude=${lat.value}&longitude=${lon.value}&current=temperature_2m,relative_humidity_2m,weather_code&temperature_unit=${temperatureUnit}&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Weather API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Weather forecast proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Proxy geocoding search from Open-Meteo
router.get('/geocode', async (req, res) => {
  try {
    const name = String(req.query.name ?? '').trim();

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (name.length > 200) {
      return res.status(400).json({ error: 'name must be 200 characters or fewer' });
    }

    const url = `${GEOCODING_API}/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Geocoding API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Geocoding proxy error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

// Proxy reverse geocoding from Open-Meteo
router.get('/reverse-geocode', async (req, res) => {
  try {
    const lat = parseCoordinate(req.query.latitude, 'latitude');
    const lon = parseCoordinate(req.query.longitude, 'longitude');

    if (lat.error) return res.status(400).json({ error: lat.error });
    if (lon.error) return res.status(400).json({ error: lon.error });

    const url = `${GEOCODING_API}/v1/reverse?latitude=${lat.value}&longitude=${lon.value}&count=1&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Reverse geocoding API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Reverse geocoding proxy error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

export default router;
