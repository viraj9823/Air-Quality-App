const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const Cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.AQICN_API_KEY;
const CACHE_EXPIRY = parseInt(process.env.CACHE_EXPIRY_MINUTES) || 30;
const MAX_CACHE_ENTRIES = parseInt(process.env.MAX_CACHE_ENTRIES) || 100;

// Initialize cache
const cache = new Cache(CACHE_EXPIRY, MAX_CACHE_ENTRIES);

// Middleware
app.use(cors());
app.use(express.json());

// Utility function to get AQI color and status
function getAQIColorAndStatus(aqi) {
    if (aqi <= 50) return { color: '#00E400', status: 'Good', level: 'good' };
    if (aqi <= 100) return { color: '#FFFF00', status: 'Moderate', level: 'moderate' };
    if (aqi <= 150) return { color: '#FF7E00', status: 'Unhealthy for Sensitive Groups', level: 'unhealthy-sg' };
    if (aqi <= 200) return { color: '#FF0000', status: 'Unhealthy', level: 'unhealthy' };
    if (aqi <= 300) return { color: '#8F3F97', status: 'Very Unhealthy', level: 'very-unhealthy' };
    return { color: '#7E0023', status: 'Hazardous', level: 'hazardous' };
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        cacheSize: cache.size(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/search/:city', async (req, res) => {
    const city = req.params.city.trim();
    
    if (!city) {
        return res.status(400).json({ error: 'City name is required' });
    }

    try {
        // Check cache first
        const cachedData = cache.get(city.toLowerCase());
        if (cachedData) {
            console.log(`Cache hit for: ${city}`);
            return res.json(cachedData);
        }

        console.log(`Fetching data for: ${city}`);
        
        // Fetch from AQICN API
        const response = await fetch(`https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'ok') {
            return res.status(404).json({ 
                error: data.data || 'City not found or data unavailable' 
            });
        }

        // Transform the data
        const aqiData = data.data;
        const aqi = aqiData.aqi;
        const { color, status, level } = getAQIColorAndStatus(aqi);

        const transformedData = {
            city: aqiData.city.name,
            aqi: aqi,
            aqiInfo: {
                color,
                status,
                level
            },
            dominantPollutant: aqiData.dominentpol,
            location: {
                latitude: aqiData.city.geo[0],
                longitude: aqiData.city.geo[1]
            },
            timestamp: aqiData.time.iso,
            pollutants: aqiData.iaqi ? Object.entries(aqiData.iaqi).reduce((acc, [key, value]) => {
                acc[key] = value.v;
                return acc;
            }, {}) : {},
            attribution: aqiData.attribution
        };

        // Cache the result
        cache.set(city.toLowerCase(), transformedData);

        res.json(transformedData);

    } catch (error) {
        console.error('Error fetching air quality data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch air quality data',
            details: error.message
        });
    }
});

app.get('/api/cache/info', (req, res) => {
    res.json({
        size: cache.size(),
        maxEntries: MAX_CACHE_ENTRIES,
        expiryMinutes: CACHE_EXPIRY
    });
});

app.delete('/api/cache/clear', (req, res) => {
    cache.clear();
    res.json({ message: 'Cache cleared successfully' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`Air Quality API server running on http://localhost:${PORT}`);
});