import { Router } from 'express';

const router = Router();

const OPEN_METEO_API = 'https://api.open-meteo.com';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com';

// Proxy weather forecast from Open-Meteo
router.get('/forecast', async (req, res) => {
  try {
    const { latitude, longitude, unit } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const temperatureUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const url = `${OPEN_METEO_API}/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&temperature_unit=${temperatureUnit}&timezone=auto`;

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
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const url = `${GEOCODING_API}/v1/search?name=${encodeURIComponent(String(name))}&count=1&language=en&format=json`;

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
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const url = `${GEOCODING_API}/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;

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
