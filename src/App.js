import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

// Lazy load the map component for better performance
const WeatherMap = lazy(() => import('./components/WeatherMap'));

const API_KEY = process.env.REACT_APP_API_KEY;

function App() {
    const [weatherData, setWeatherData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [hourlyData, setHourlyData] = useState(null);
    const [airQuality, setAirQuality] = useState(null);
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [locationLoading, setLocationLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);

    // Load favorites and recent from localStorage
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('weatherFavorites');
        return saved ? JSON.parse(saved) : [];
    });

    const [recentCities, setRecentCities] = useState(() => {
        const saved = localStorage.getItem('weatherRecent');
        return saved ? JSON.parse(saved) : [];
    });

    // Demo data for when API key is invalid
    const DEMO_DATA = {
        paris: {
            name: "Paris",
            main: { temp: 12, feels_like: 10, humidity: 78, temp_max: 14 },
            weather: [{ id: 801, description: "few clouds", icon: "02d" }],
            sys: { country: "FR" },
            wind: { speed: 5.2 },
            timezone: 3600
        },
        london: {
            name: "London",
            main: { temp: 8, feels_like: 5, humidity: 85, temp_max: 10 },
            weather: [{ id: 500, description: "light rain", icon: "10d" }],
            sys: { country: "GB" },
            wind: { speed: 8.5 },
            timezone: 0
        },
        tokyo: {
            name: "Tokyo",
            main: { temp: 18, feels_like: 17, humidity: 65, temp_max: 21 },
            weather: [{ id: 800, description: "clear sky", icon: "01d" }],
            sys: { country: "JP" },
            wind: { speed: 3.1 },
            timezone: 32400
        },
        "new york": {
            name: "New York",
            main: { temp: 5, feels_like: 2, humidity: 55, temp_max: 8 },
            weather: [{ id: 802, description: "scattered clouds", icon: "03d" }],
            sys: { country: "US" },
            wind: { speed: 6.7 },
            timezone: -18000
        },
        lagos: {
            name: "Lagos",
            main: { temp: 32, feels_like: 36, humidity: 70, temp_max: 34 },
            weather: [{ id: 802, description: "scattered clouds", icon: "03d" }],
            sys: { country: "NG" },
            wind: { speed: 4.2 },
            timezone: 3600
        },
        oye: {
            name: "Oye",
            main: { temp: 30, feels_like: 33, humidity: 59, temp_max: 30 },
            weather: [{ id: 802, description: "scattered clouds", icon: "03d" }],
            sys: { country: "NG" },
            wind: { speed: 12 },
            timezone: 3600
        },
    };

    // Update clock every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchWeather = async (queryCity) => {
        if (!queryCity.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${queryCity}&appid=${API_KEY}&units=metric`
            );

            // Handle 401 Unauthorized - use demo data
            if (response.status === 401) {
                console.warn("Invalid API key - using demo data");
                const cityLower = queryCity.toLowerCase();
                const demoCity = DEMO_DATA[cityLower] || DEMO_DATA["paris"];
                setWeatherData({ ...demoCity, isDemo: true });
                return;
            }

            if (!response.ok) throw new Error("City not found");
            const data = await response.json();
            setWeatherData(data);

            // Add to recent searches
            if (data.name && data.coord) {
                addToRecent(data.name, data.coord);
            }

            // Fetch Air Quality data using coordinates
            if (data.coord) {
                fetchAirQuality(data.coord.lat, data.coord.lon);
            }

        } catch (err) {
            // Try demo data as fallback
            const cityLower = queryCity.toLowerCase();
            if (DEMO_DATA[cityLower]) {
                setWeatherData({ ...DEMO_DATA[cityLower], isDemo: true });
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch Air Quality Index
    const fetchAirQuality = async (lat, lon) => {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
            );
            if (!response.ok) return;
            const data = await response.json();
            if (data.list && data.list[0]) {
                setAirQuality(data.list[0]);
            }
        } catch (err) {
            console.warn('Failed to fetch air quality:', err);
        }
    };

    // Calculate Dew Point (Magnus formula)
    const calculateDewPoint = (temp, humidity) => {
        const a = 17.27;
        const b = 237.7;
        const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
        return Math.round((b * alpha) / (a - alpha));
    };

    // Get UV Index level and color (for future UV Index feature)
    // eslint-disable-next-line no-unused-vars
    const getUVLevel = (uvi) => {
        if (uvi <= 2) return { level: 'Low', color: '#4CAF50' };
        if (uvi <= 5) return { level: 'Moderate', color: '#FFEB3B' };
        if (uvi <= 7) return { level: 'High', color: '#FF9800' };
        if (uvi <= 10) return { level: 'Very High', color: '#F44336' };
        return { level: 'Extreme', color: '#9C27B0' };
    };

    // Get AQI level and color
    const getAQILevel = (aqi) => {
        const levels = [
            { level: 'Good', color: '#4CAF50' },
            { level: 'Fair', color: '#8BC34A' },
            { level: 'Moderate', color: '#FFEB3B' },
            { level: 'Poor', color: '#FF9800' },
            { level: 'Very Poor', color: '#F44336' }
        ];
        return levels[aqi - 1] || levels[0];
    };

    // Format time from timestamp
    const formatSunTime = (timestamp, timezone) => {
        const date = new Date((timestamp + timezone) * 1000);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC'
        });
    };

    // Fetch 5-day forecast and hourly data
    const fetchForecast = async (queryCity) => {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${queryCity}&appid=${API_KEY}&units=metric`
            );

            if (!response.ok) return;
            const data = await response.json();

            // Process hourly data (next 24 hours - 8 entries at 3-hour intervals)
            const hourlyForecasts = data.list.slice(0, 8).map((item) => {
                const date = new Date(item.dt * 1000);
                return {
                    time: date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                    temp: Math.round(item.main.temp),
                    icon: item.weather[0].icon,
                    description: item.weather[0].description,
                };
            });
            setHourlyData(hourlyForecasts);

            // Process daily forecast data - get one entry per day (at noon)
            const dailyForecasts = [];
            const seenDates = new Set();

            data.list.forEach((item) => {
                const date = new Date(item.dt * 1000);
                const dateStr = date.toDateString();
                const hour = date.getHours();

                // Get forecast around noon (12:00) for each day
                if (!seenDates.has(dateStr) && hour >= 11 && hour <= 14) {
                    seenDates.add(dateStr);
                    dailyForecasts.push({
                        date: date,
                        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        icon: item.weather[0].icon,
                        description: item.weather[0].description,
                        tempMax: Math.round(item.main.temp_max),
                        tempMin: Math.round(item.main.temp_min),
                    });
                }
            });

            // Limit to 5 days
            setForecastData(dailyForecasts.slice(0, 5));
        } catch (err) {
            console.warn('Failed to fetch forecast:', err);
        }
    };

    // Fetch weather by coordinates (for geolocation)
    const fetchWeatherByCoords = async (lat, lon) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
            );

            if (!response.ok) throw new Error("Failed to get weather for location");
            const data = await response.json();
            setWeatherData(data);

            // Add to recent searches
            if (data.name && data.coord) {
                addToRecent(data.name, data.coord);
            }

            // Fetch Air Quality data
            fetchAirQuality(lat, lon);

            // Fetch forecast by coordinates
            fetchForecastByCoords(lat, lon);

        } catch (err) {
            setError(err.message);
            // Fallback to default city
            fetchWeather("Lagos");
            fetchForecast("Lagos");
        } finally {
            setLoading(false);
            setLocationLoading(false);
        }
    };

    // Fetch forecast by coordinates
    const fetchForecastByCoords = async (lat, lon) => {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
            );

            if (!response.ok) return;
            const data = await response.json();

            // Process hourly data
            const hourlyForecasts = data.list.slice(0, 8).map((item) => {
                const date = new Date(item.dt * 1000);
                return {
                    time: date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                    temp: Math.round(item.main.temp),
                    icon: item.weather[0].icon,
                    description: item.weather[0].description,
                };
            });
            setHourlyData(hourlyForecasts);

            // Process daily forecast
            const dailyForecasts = [];
            const seenDates = new Set();

            data.list.forEach((item) => {
                const date = new Date(item.dt * 1000);
                const dateStr = date.toDateString();
                const hour = date.getHours();

                if (!seenDates.has(dateStr) && hour >= 11 && hour <= 14) {
                    seenDates.add(dateStr);
                    dailyForecasts.push({
                        date: date,
                        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        icon: item.weather[0].icon,
                        description: item.weather[0].description,
                        tempMax: Math.round(item.main.temp_max),
                        tempMin: Math.round(item.main.temp_min),
                    });
                }
            });

            setForecastData(dailyForecasts.slice(0, 5));
        } catch (err) {
            console.warn('Failed to fetch forecast by coords:', err);
        }
    };

    // Get user's location
    const getUserLocation = () => {
        setLocationLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                setLocationLoading(false);
                // Fallback to default city
                fetchWeather("Lagos");
                fetchForecast("Lagos");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    };

    useEffect(() => {
        // Try to get user's location on first load, fallback to Lagos
        getUserLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchValue.trim()) {
            triggerHaptic('light');
            fetchWeather(searchValue);
            fetchForecast(searchValue);
        }
    };

    // Haptic feedback helper
    const triggerHaptic = (style = 'light') => {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30],
                success: [10, 50, 10],
                error: [50, 100, 50]
            };
            navigator.vibrate(patterns[style] || patterns.light);
        }
    };

    // Refresh weather data
    const handleRefresh = () => {
        triggerHaptic('medium');
        if (weatherData?.coord) {
            fetchWeatherByCoords(weatherData.coord.lat, weatherData.coord.lon);
        } else {
            getUserLocation();
        }
    };

    // Handle map location selection
    const handleMapLocationSelect = (lat, lng) => {
        triggerHaptic('light');
        setShowMap(false);
        fetchWeatherByCoords(lat, lng);
    };

    // Add city to recent searches
    const addToRecent = (cityName, coord) => {
        if (!cityName) return;

        const newRecent = [
            { name: cityName, coord, timestamp: Date.now() },
            ...recentCities.filter(c => c.name.toLowerCase() !== cityName.toLowerCase())
        ].slice(0, 5); // Keep only 5 recent

        setRecentCities(newRecent);
        localStorage.setItem('weatherRecent', JSON.stringify(newRecent));
    };

    // Toggle favorite city
    const toggleFavorite = () => {
        if (!weatherData?.name) return;

        const cityName = weatherData.name;
        const isFav = favorites.some(f => f.name.toLowerCase() === cityName.toLowerCase());

        let newFavorites;
        if (isFav) {
            newFavorites = favorites.filter(f => f.name.toLowerCase() !== cityName.toLowerCase());
            triggerHaptic('light');
        } else {
            newFavorites = [
                ...favorites,
                {
                    name: cityName,
                    coord: weatherData.coord,
                    country: weatherData.sys?.country
                }
            ].slice(0, 10); // Max 10 favorites
            triggerHaptic('success');
        }

        setFavorites(newFavorites);
        localStorage.setItem('weatherFavorites', JSON.stringify(newFavorites));
    };

    // Check if current city is favorite
    const isFavorite = () => {
        if (!weatherData?.name) return false;
        return favorites.some(f => f.name.toLowerCase() === weatherData.name.toLowerCase());
    };

    // Quick switch to a city
    const switchToCity = (city) => {
        triggerHaptic('light');
        setShowFavorites(false);
        if (city.coord) {
            fetchWeatherByCoords(city.coord.lat, city.coord.lon);
        } else {
            fetchWeather(city.name);
            fetchForecast(city.name);
        }
    };

    // Remove from favorites
    const removeFromFavorites = (cityName) => {
        const newFavorites = favorites.filter(f => f.name.toLowerCase() !== cityName.toLowerCase());
        setFavorites(newFavorites);
        localStorage.setItem('weatherFavorites', JSON.stringify(newFavorites));
        triggerHaptic('light');
    };

    // Clear recent searches
    const clearRecent = () => {
        setRecentCities([]);
        localStorage.removeItem('weatherRecent');
        triggerHaptic('light');
    };

    // Format time based on timezone
    const formatTime = (timezone) => {
        if (!timezone && timezone !== 0) {
            return currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        const utcTime = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
        const cityTime = new Date(utcTime + (timezone * 1000));
        return cityTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Format date
    const formatDate = () => {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        return currentTime.toLocaleDateString('en-US', options).toUpperCase();
    };

    // ==================== SUN & MOON CALCULATIONS ====================

    // Calculate moon phase (0-29.53 day lunar cycle)
    const getMoonPhase = () => {
        const now = new Date();
        // Known new moon: January 6, 2000
        const knownNewMoon = new Date(2000, 0, 6, 18, 14);
        const lunarCycle = 29.53058867; // days
        const daysSinceNew = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
        const phase = ((daysSinceNew % lunarCycle) / lunarCycle) * 100;

        // Determine phase name and emoji
        if (phase < 3.125) return { name: 'New Moon', emoji: '🌑', illumination: 0 };
        if (phase < 12.5) return { name: 'Waxing Crescent', emoji: '🌒', illumination: Math.round(phase * 2) };
        if (phase < 21.875) return { name: 'First Quarter', emoji: '🌓', illumination: 50 };
        if (phase < 31.25) return { name: 'Waxing Gibbous', emoji: '🌔', illumination: Math.round(50 + (phase - 25) * 2) };
        if (phase < 40.625) return { name: 'Full Moon', emoji: '🌕', illumination: 100 };
        if (phase < 56.25) return { name: 'Waning Gibbous', emoji: '🌖', illumination: Math.round(100 - (phase - 50) * 2) };
        if (phase < 71.875) return { name: 'Last Quarter', emoji: '🌗', illumination: 50 };
        if (phase < 87.5) return { name: 'Waning Crescent', emoji: '🌘', illumination: Math.round(50 - (phase - 75) * 2) };
        return { name: 'New Moon', emoji: '🌑', illumination: 0 };
    };

    // Calculate golden hour times (roughly 1 hour after sunrise, 1 hour before sunset)
    const getGoldenHours = (sunrise, sunset, timezone) => {
        const goldenDuration = 60 * 60; // 1 hour in seconds

        const morningStart = sunrise;
        const morningEnd = sunrise + goldenDuration;
        const eveningStart = sunset - goldenDuration;
        const eveningEnd = sunset;

        return {
            morning: {
                start: formatSunTime(morningStart, timezone),
                end: formatSunTime(morningEnd, timezone)
            },
            evening: {
                start: formatSunTime(eveningStart, timezone),
                end: formatSunTime(eveningEnd, timezone)
            }
        };
    };

    // Calculate daylight duration
    const getDaylightDuration = (sunrise, sunset) => {
        const durationSeconds = sunset - sunrise;
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        return { hours, minutes, totalMinutes: Math.round(durationSeconds / 60) };
    };

    // Calculate sun position for the arc (0-100%)
    const getSunPosition = (sunrise, sunset, timezone) => {
        const now = new Date();
        const utcNow = Math.floor(now.getTime() / 1000) - now.getTimezoneOffset() * 60;
        const localNow = utcNow + timezone;

        // Before sunrise
        if (localNow < sunrise) return { position: 0, isDay: false };
        // After sunset
        if (localNow > sunset) return { position: 100, isDay: false };

        // During day - calculate position
        const dayDuration = sunset - sunrise;
        const elapsed = localNow - sunrise;
        const position = (elapsed / dayDuration) * 100;

        // Calculate vertical position along parabolic arc (0 at edges, max at 50%)
        // Using parabola: y = -4x(x-1) where x is 0-1, gives peak at 0.5
        const x = position / 100;
        const arcHeight = -4 * x * (x - 1); // 0 to 1 parabola
        const verticalOffset = arcHeight * 60; // Max 60px height

        return { position, isDay: true, verticalOffset };
    };

    // Get twilight info (for future twilight display feature)
    // eslint-disable-next-line no-unused-vars
    const getTwilightInfo = (sunrise, sunset, timezone) => {
        const twilightDuration = 30 * 60; // 30 minutes
        return {
            dawnStart: formatSunTime(sunrise - twilightDuration, timezone),
            duskEnd: formatSunTime(sunset + twilightDuration, timezone)
        };
    };

    // ==================== END SUN & MOON ====================

    // Get weather type for animations
    const getWeatherType = () => {
        if (!weatherData) return { type: 'default', isNight: false };
        const id = weatherData.weather[0].id;
        const icon = weatherData.weather[0].icon;
        const isNight = icon.includes('n');

        let type = 'clear';
        if (id >= 200 && id < 300) type = 'thunderstorm';
        else if (id >= 300 && id < 600) type = 'rain';
        else if (id >= 600 && id < 700) type = 'snow';
        else if (id >= 700 && id < 800) type = 'mist';
        else if (id > 800) type = 'clouds';

        return { type, isNight };
    };

    // Get background class based on weather with enhanced theming
    const getBackgroundClass = () => {
        const { type, isNight } = getWeatherType();

        // Night themes
        if (isNight) {
            if (type === 'clear') return 'bg-night-clear';
            if (type === 'rain' || type === 'thunderstorm') return 'bg-night-storm';
            return 'bg-night';
        }

        // Day themes - weather reactive
        if (type === 'thunderstorm') return 'bg-thunderstorm';
        if (type === 'rain') return 'bg-rain';
        if (type === 'snow') return 'bg-snow';
        if (type === 'mist') return 'bg-mist';
        if (type === 'clear') return 'bg-clear-warm';
        return 'bg-clouds';
    };

    // Get temperature-based accent class
    const getTempAccent = () => {
        if (!weatherData?.main?.temp) return '';
        const temp = weatherData.main.temp;
        if (temp >= 35) return 'temp-hot';
        if (temp >= 25) return 'temp-warm';
        if (temp >= 15) return 'temp-mild';
        if (temp >= 5) return 'temp-cool';
        return 'temp-cold';
    };

    // Render gradient mesh background
    const renderGradientMesh = () => {
        const { type, isNight } = getWeatherType();

        return (
            <div className="gradient-mesh">
                <div className={`mesh-blob mesh-blob-1 ${isNight ? 'mesh-night' : ''} ${type}`}></div>
                <div className={`mesh-blob mesh-blob-2 ${isNight ? 'mesh-night' : ''} ${type}`}></div>
                <div className={`mesh-blob mesh-blob-3 ${isNight ? 'mesh-night' : ''} ${type}`}></div>
            </div>
        );
    };

    // Render animated clouds
    const renderClouds = () => {
        const { type, isNight } = getWeatherType();
        // Show clouds for cloudy, misty, rainy weather
        const showClouds = ['clouds', 'mist', 'rain', 'thunderstorm'].includes(type);

        if (!showClouds) return null;

        return (
            <div className="clouds-container">
                <div className={`cloud cloud-1 ${isNight ? 'cloud-night' : ''}`}></div>
                <div className={`cloud cloud-2 ${isNight ? 'cloud-night' : ''}`}></div>
                <div className={`cloud cloud-3 ${isNight ? 'cloud-night' : ''}`}></div>
                <div className={`cloud cloud-4 ${isNight ? 'cloud-night' : ''}`}></div>
                <div className={`cloud cloud-5 ${isNight ? 'cloud-night' : ''}`}></div>
            </div>
        );
    };

    return (
        <div className={`app-container ${getBackgroundClass()} ${getTempAccent()}`}>
            {/* Gradient Mesh Background */}
            {renderGradientMesh()}
            {/* Animated Weather Effects */}
            {renderClouds()}

            {/* Dashboard Header */}
            <header className="dashboard-header">
                <div className="dashboard-logo">
                    <span className="dashboard-logo-icon">🌤️</span>
                    <h1>Weather Dashboard</h1>
                </div>

                {/* Search Bar in Header */}
                <div className="header-search">
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search city..."
                            autoComplete="off"
                        />
                        <button type="submit" aria-label="Search">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </form>
                    <button
                        className={`header-location-btn ${locationLoading ? 'loading' : ''}`}
                        onClick={getUserLocation}
                        aria-label="Use my location"
                        disabled={locationLoading}
                    >
                        {locationLoading ? (
                            <span className="location-spinner"></span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M12 2v4"></path>
                                <path d="M12 18v4"></path>
                                <path d="M2 12h4"></path>
                                <path d="M18 12h4"></path>
                            </svg>
                        )}
                    </button>
                </div>

                <div className="header-actions">
                    <button className="header-btn" onClick={() => setShowFavorites(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        {favorites.length > 0 && <span className="header-badge">{favorites.length}</span>}
                    </button>
                    <button className="header-btn" onClick={() => setShowMap(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                            <line x1="8" y1="2" x2="8" y2="18"></line>
                            <line x1="16" y1="6" x2="16" y2="22"></line>
                        </svg>
                    </button>
                </div>
            </header>

            {/* Dashboard Main Content */}
            <main className="dashboard-main">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="dashboard-loading"
                        >
                            <div className="dashboard-panel skeleton-panel">
                                <div className="skeleton skeleton-lg"></div>
                            </div>
                            <div className="dashboard-panel skeleton-panel">
                                <div className="skeleton skeleton-md"></div>
                                <div className="skeleton skeleton-sm"></div>
                            </div>
                            <div className="dashboard-panel skeleton-panel">
                                <div className="skeleton skeleton-md"></div>
                            </div>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="dashboard-error"
                        >
                            <div className="error-card">
                                <span className="error-icon">⚠️</span>
                                <p>{error}</p>
                                <button onClick={handleRefresh}>Try Again</button>
                            </div>
                        </motion.div>
                    ) : weatherData && (
                        <>
                            {/* Left Panel - Current Weather */}
                            <motion.div
                                className="dashboard-panel main-weather-panel"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="current-weather">
                                    <div className="weather-location">
                                        <h2>{weatherData.name}</h2>
                                        <span className="weather-country">{weatherData.sys?.country}</span>
                                        <button
                                            className={`fav-star ${isFavorite() ? 'active' : ''}`}
                                            onClick={toggleFavorite}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite() ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="weather-time">{formatTime(weatherData.timezone)}</p>
                                    <p className="weather-date">{formatDate()}</p>

                                    <div className="weather-main">
                                        <img
                                            src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`}
                                            alt={weatherData.weather[0].description}
                                            className="weather-icon-large"
                                        />
                                        <div className="weather-temp-display">
                                            <span className="temp-big">{Math.round(weatherData.main.temp)}</span>
                                            <span className="temp-unit-big">°C</span>
                                        </div>
                                    </div>

                                    <p className="weather-desc">
                                        {weatherData.weather[0].description.charAt(0).toUpperCase() +
                                            weatherData.weather[0].description.slice(1)}
                                    </p>
                                    <p className="weather-feels">Feels like {Math.round(weatherData.main.feels_like)}°</p>

                                    <div className="weather-minmax">
                                        <span>↑ {Math.round(weatherData.main.temp_max)}°</span>
                                        <span>↓ {Math.round(weatherData.main.temp_min || weatherData.main.temp - 2)}°</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Center Panel - Stats & Details */}
                            <motion.div
                                className="center-panels"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {/* Hourly Forecast */}
                                {hourlyData && hourlyData.length > 0 && (
                                    <div className="dashboard-panel hourly-panel">
                                        <div className="panel-header">
                                            <span className="panel-title">Hourly Forecast</span>
                                        </div>
                                        <div className="hourly-grid">
                                            {hourlyData.map((hour, index) => (
                                                <div key={index} className="hourly-item">
                                                    <span className="hourly-time">{hour.time}</span>
                                                    <img
                                                        src={`https://openweathermap.org/img/wn/${hour.icon}@2x.png`}
                                                        alt={hour.description}
                                                        className="hourly-icon"
                                                    />
                                                    <span className="hourly-temp">{hour.temp}°</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stats Grid */}
                                <div className="dashboard-panel stats-panel">
                                    <div className="panel-header">
                                        <span className="panel-title">Weather Details</span>
                                    </div>
                                    <div className="stats-grid">
                                        <div className="stat-item">
                                            <span className="stat-icon">💧</span>
                                            <div className="stat-info">
                                                <span className="stat-label">Humidity</span>
                                                <span className="stat-value">{weatherData.main.humidity}%</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-icon">💨</span>
                                            <div className="stat-info">
                                                <span className="stat-label">Wind</span>
                                                <span className="stat-value">{Math.round(weatherData.wind.speed * 3.6)} km/h</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-icon">📊</span>
                                            <div className="stat-info">
                                                <span className="stat-label">Pressure</span>
                                                <span className="stat-value">{weatherData.main.pressure} hPa</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-icon">👁️</span>
                                            <div className="stat-info">
                                                <span className="stat-label">Visibility</span>
                                                <span className="stat-value">{Math.round((weatherData.visibility || 10000) / 1000)} km</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-icon">💧</span>
                                            <div className="stat-info">
                                                <span className="stat-label">Dew Point</span>
                                                <span className="stat-value">{calculateDewPoint(weatherData.main.temp, weatherData.main.humidity)}°C</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-icon">☁️</span>
                                            <div className="stat-info">
                                                <span className="stat-label">Clouds</span>
                                                <span className="stat-value">{weatherData.clouds?.all || 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Air Quality */}
                                {airQuality && airQuality.list && airQuality.list[0] && (
                                    <div className="dashboard-panel aqi-panel">
                                        <div className="panel-header">
                                            <span className="panel-title">Air Quality</span>
                                            <span className={`aqi-badge aqi-${airQuality.list[0].main.aqi}`}>
                                                {getAQILevel(airQuality.list[0].main.aqi).level}
                                            </span>
                                        </div>
                                        <div className="aqi-bar">
                                            <div
                                                className="aqi-fill"
                                                style={{
                                                    width: `${(airQuality.list[0].main.aqi / 5) * 100}%`,
                                                    backgroundColor: getAQILevel(airQuality.list[0].main.aqi).color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Sun & Moon Widget */}
                                {weatherData.sys?.sunrise && weatherData.sys?.sunset && (
                                    <div className="dashboard-panel sun-moon-panel">
                                        <div className="panel-header">
                                            <span className="panel-title">Sun & Moon</span>
                                            <span className="moon-phase-badge">
                                                {getMoonPhase().emoji}
                                            </span>
                                        </div>

                                        {/* Sun Arc Visualization */}
                                        <div className="sun-arc-container">
                                            <div className="sun-arc">
                                                <div className="sun-arc-path"></div>
                                                <div
                                                    className="sun-indicator"
                                                    style={{
                                                        left: `${getSunPosition(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).position}%`,
                                                        bottom: `${getSunPosition(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).verticalOffset || 0}px`,
                                                        opacity: getSunPosition(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).isDay ? 1 : 0.3
                                                    }}
                                                >
                                                    {getSunPosition(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).isDay ? '☀️' : '🌙'}
                                                </div>
                                                <div className="horizon-line"></div>
                                            </div>
                                            <div className="sun-times">
                                                <div className="sun-time sunrise">
                                                    <span className="sun-icon">🌅</span>
                                                    <span className="sun-label">Sunrise</span>
                                                    <span className="sun-value">{formatSunTime(weatherData.sys.sunrise, weatherData.timezone)}</span>
                                                </div>
                                                <div className="daylight-info">
                                                    <span className="daylight-icon">☀️</span>
                                                    <span className="daylight-duration">
                                                        {getDaylightDuration(weatherData.sys.sunrise, weatherData.sys.sunset).hours}h {getDaylightDuration(weatherData.sys.sunrise, weatherData.sys.sunset).minutes}m
                                                    </span>
                                                    <span className="daylight-label">of daylight</span>
                                                </div>
                                                <div className="sun-time sunset">
                                                    <span className="sun-icon">🌇</span>
                                                    <span className="sun-label">Sunset</span>
                                                    <span className="sun-value">{formatSunTime(weatherData.sys.sunset, weatherData.timezone)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Moon Phase */}
                                        <div className="moon-section">
                                            <div className="moon-display">
                                                <span className="moon-emoji">{getMoonPhase().emoji}</span>
                                                <div className="moon-info">
                                                    <span className="moon-phase-name">{getMoonPhase().name}</span>
                                                    <span className="moon-illumination">{getMoonPhase().illumination}% illuminated</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Golden Hour for Photographers */}
                                        <div className="golden-hour-section">
                                            <div className="golden-hour-header">
                                                <span className="golden-icon">📸</span>
                                                <span className="golden-title">Golden Hour</span>
                                            </div>
                                            <div className="golden-hours">
                                                <div className="golden-period morning">
                                                    <span className="period-label">Morning</span>
                                                    <span className="period-time">
                                                        {getGoldenHours(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).morning.start} - {getGoldenHours(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).morning.end}
                                                    </span>
                                                </div>
                                                <div className="golden-period evening">
                                                    <span className="period-label">Evening</span>
                                                    <span className="period-time">
                                                        {getGoldenHours(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).evening.start} - {getGoldenHours(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone).evening.end}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            {/* Right Panel - Forecast */}
                            <motion.div
                                className="dashboard-panel forecast-panel"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="panel-header">
                                    <span className="panel-title">5-Day Forecast</span>
                                </div>
                                {forecastData && forecastData.length > 0 ? (
                                    <div className="forecast-list">
                                        {forecastData.map((day, index) => (
                                            <div key={index} className="forecast-item">
                                                <span className="forecast-day">{day.dayName}</span>
                                                <img
                                                    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                                                    alt={day.description}
                                                    className="forecast-icon"
                                                />
                                                <div className="forecast-temps">
                                                    <span className="temp-high">{day.tempMax}°</span>
                                                    <span className="temp-low">{day.tempMin}°</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-data">No forecast data available</p>
                                )}

                                {/* Quick Favorites */}
                                {favorites.length > 0 && (
                                    <div className="quick-favorites">
                                        <div className="panel-header">
                                            <span className="panel-title">Favorites</span>
                                        </div>
                                        <div className="quick-fav-list">
                                            {favorites.slice(0, 4).map((city, index) => (
                                                <button
                                                    key={city.name}
                                                    className="quick-fav-btn"
                                                    onClick={() => switchToCity(city)}
                                                >
                                                    {city.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>

            {/* Demo Mode Indicator */}
            {weatherData?.isDemo && (
                <div className="demo-badge">Demo Mode - Using sample data</div>
            )}

            {/* Map Modal */}
            <AnimatePresence>
                {showMap && (
                    <motion.div
                        className="map-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.target === e.currentTarget && setShowMap(false)}
                    >
                        <motion.div
                            className="map-modal-content"
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            transition={{ type: "spring", damping: 25 }}
                        >
                            <div className="map-modal-header">
                                <h3>🗺️ Weather Map</h3>
                                <button
                                    className="map-close-btn"
                                    onClick={() => setShowMap(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            <Suspense fallback={<div className="loading">Loading map...</div>}>
                                <WeatherMap
                                    currentLocation={weatherData?.coord ? [weatherData.coord.lat, weatherData.coord.lon] : null}
                                    weatherData={weatherData}
                                    onLocationSelect={handleMapLocationSelect}
                                    isNight={getWeatherType().isNight}
                                    apiKey={API_KEY}
                                />
                            </Suspense>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Favorites Panel */}
            <AnimatePresence>
                {showFavorites && (
                    <motion.div
                        className="favorites-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.target === e.currentTarget && setShowFavorites(false)}
                    >
                        <motion.div
                            className="favorites-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25 }}
                        >
                            <div className="favorites-header">
                                <h3>⭐ Favorites & Recent</h3>
                                <button
                                    className="favorites-close-btn"
                                    onClick={() => setShowFavorites(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="favorites-content">
                                {/* Favorites Section */}
                                <div className="favorites-section">
                                    <h4 className="section-title">Favorite Cities</h4>
                                    {favorites.length === 0 ? (
                                        <p className="empty-message">No favorites yet</p>
                                    ) : (
                                        <div className="favorites-list">
                                            {favorites.map((city, index) => (
                                                <motion.div
                                                    key={city.name}
                                                    className="favorite-item"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => switchToCity(city)}
                                                >
                                                    <div className="favorite-info">
                                                        <span className="favorite-name">{city.name}</span>
                                                        {city.country && (
                                                            <span className="favorite-country">{city.country}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        className="remove-favorite-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromFavorites(city.name);
                                                        }}
                                                    >✕</button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Recent Section */}
                                <div className="recent-section">
                                    <div className="section-header">
                                        <h4 className="section-title">Recent</h4>
                                        {recentCities.length > 0 && (
                                            <button className="clear-btn" onClick={clearRecent}>
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    {recentCities.length === 0 ? (
                                        <p className="empty-message">No recent searches</p>
                                    ) : (
                                        <div className="recent-list">
                                            {recentCities.map((city, index) => (
                                                <motion.div
                                                    key={city.name + city.timestamp}
                                                    className="recent-item"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => switchToCity(city)}
                                                >
                                                    <span>🕐</span>
                                                    <span className="recent-name">{city.name}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;