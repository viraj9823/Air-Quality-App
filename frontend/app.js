class AirQualityApp {
    constructor() {
        this.API_BASE = 'http://localhost:3001/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkBackendHealth();
    }

    bindEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const cityInput = document.getElementById('cityInput');
        const exampleBtns = document.querySelectorAll('.example-btn');

        searchBtn.addEventListener('click', () => this.searchCity());
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCity();
        });

        exampleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const city = e.target.dataset.city;
                cityInput.value = city;
                this.searchCity(city);
            });
        });
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.API_BASE}/health`);
            if (!response.ok) throw new Error('Backend not responding');
            console.log('Backend is healthy');
        } catch (error) {
            this.showError('Backend server is not running. Please make sure the backend is started on port 3001.');
        }
    }

    async searchCity() {
        const cityInput = document.getElementById('cityInput');
        const city = cityInput.value.trim();

        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            const response = await fetch(`${this.API_BASE}/search/${encodeURIComponent(city)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data');
            }

            this.displayResults(data);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(data) {
        this.updateAqiDisplay(data);
        this.updatePollutants(data.pollutants);
        this.updateDetails(data);
        this.showResults();
    }

    updateAqiDisplay(data) {
        document.getElementById('cityName').textContent = data.city;
        
        const aqiBadge = document.getElementById('aqiBadge');
        aqiBadge.textContent = data.aqiInfo.status;
        aqiBadge.className = `aqi-badge aqi-${data.aqiInfo.level}`;

        const aqiCircle = document.querySelector('.aqi-circle');
        aqiCircle.style.backgroundColor = data.aqiInfo.color;
        aqiCircle.className = `aqi-circle aqi-${data.aqiInfo.level}`;

        document.getElementById('aqiValue').textContent = data.aqi;
        document.getElementById('aqiStatus').textContent = data.aqiInfo.status;
        document.getElementById('aqiDescription').textContent = this.getAqiDescription(data.aqiInfo.level);
    }

    getAqiDescription(level) {
        const descriptions = {
            'good': 'Air quality is satisfactory, and air pollution poses little or no risk.',
            'moderate': 'Air quality is acceptable. However, there may be a risk for some people.',
            'unhealthy-sg': 'Members of sensitive groups may experience health effects.',
            'unhealthy': 'Some members of the general public may experience health effects.',
            'very-unhealthy': 'Health alert: The risk of health effects is increased for everyone.',
            'hazardous': 'Health warning of emergency conditions: everyone is more likely to be affected.'
        };
        return descriptions[level] || 'Air quality data available.';
    }

    updatePollutants(pollutants) {
        const pollutantsGrid = document.getElementById('pollutants');
        pollutantsGrid.innerHTML = '';

        const pollutantNames = {
            'pm25': 'PM2.5',
            'pm10': 'PM10',
            'o3': 'Ozone',
            'no2': 'Nitrogen Dioxide',
            'so2': 'Sulfur Dioxide',
            'co': 'Carbon Monoxide'
        };

        const pollutantUnits = {
            'pm25': 'µg/m³',
            'pm10': 'µg/m³',
            'o3': 'ppb',
            'no2': 'ppb',
            'so2': 'ppb',
            'co': 'ppm'
        };

        Object.entries(pollutants).forEach(([key, value]) => {
            if (pollutantNames[key]) {
                const pollutantItem = document.createElement('div');
                pollutantItem.className = 'pollutant-item';
                pollutantItem.innerHTML = `
                    <div class="pollutant-name">${pollutantNames[key]}</div>
                    <div class="pollutant-value">${value}</div>
                    <div class="pollutant-unit">${pollutantUnits[key] || ''}</div>
                `;
                pollutantsGrid.appendChild(pollutantItem);
            }
        });
    }

    updateDetails(data) {
        document.getElementById('location').textContent = 
            `Lat: ${data.location.latitude.toFixed(4)}, Lng: ${data.location.longitude.toFixed(4)}`;
        
        document.getElementById('timestamp').textContent = 
            new Date(data.timestamp).toLocaleString();
        
        document.getElementById('dominantPollutant').textContent = 
            data.dominantPollutant ? data.dominantPollutant.toUpperCase() : 'N/A';

        this.updateAttribution(data.attribution);
    }

    updateAttribution(attributions) {
        const attributionEl = document.getElementById('attribution');
        if (attributions && attributions.length > 0) {
            attributionEl.innerHTML = `
                <strong>Data provided by:</strong> 
                ${attributions.map(attr => 
                    `<a href="${attr.url}" target="_blank">${attr.name}</a>`
                ).join(', ')}
            `;
        } else {
            attributionEl.innerHTML = 'Data provided by World Air Quality Index';
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }

    showResults() {
        document.getElementById('results').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('results').classList.add('hidden');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AirQualityApp();
});