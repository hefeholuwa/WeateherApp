import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom weather marker icon
const createWeatherIcon = (temp, isNight) => {
    return L.divIcon({
        className: 'weather-marker',
        html: `
            <div class="marker-content ${isNight ? 'night' : ''}">
                <span class="marker-temp">${Math.round(temp)}°</span>
            </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 50],
    });
};

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const WeatherMap = ({
    currentLocation,
    weatherData,
    onLocationSelect,
    isNight,
    apiKey
}) => {
    const center = currentLocation || [6.5244, 3.3792]; // Default to Lagos

    // Weather layer options
    const weatherLayers = {
        clouds: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        precipitation: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        temp: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        wind: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`,
    };

    const handleMapClick = (lat, lng) => {
        if (onLocationSelect) {
            onLocationSelect(lat, lng);
        }
    };

    return (
        <div className="weather-map-container">
            <MapContainer
                center={center}
                zoom={8}
                className="weather-map"
                scrollWheelZoom={true}
            >
                {/* Base map layer - dark or light based on time */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={isNight
                        ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                        : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                    }
                />

                {/* Weather radar overlay - precipitation */}
                <TileLayer
                    url={weatherLayers.precipitation}
                    opacity={0.6}
                />

                {/* Weather radar overlay - clouds */}
                <TileLayer
                    url={weatherLayers.clouds}
                    opacity={0.4}
                />

                {/* Click handler */}
                <MapClickHandler onMapClick={handleMapClick} />

                {/* Current location marker */}
                {weatherData && currentLocation && (
                    <Marker
                        position={currentLocation}
                        icon={createWeatherIcon(weatherData.main.temp, isNight)}
                    >
                        <Popup>
                            <div className="map-popup">
                                <h4>{weatherData.name}</h4>
                                <p>{Math.round(weatherData.main.temp)}°C</p>
                                <p>{weatherData.weather[0].description}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            <div className="map-legend">
                <span className="legend-item">
                    <span className="legend-color precipitation"></span>
                    Precipitation
                </span>
                <span className="legend-item">
                    <span className="legend-color clouds"></span>
                    Clouds
                </span>
            </div>

            <div className="map-hint">
                Tap anywhere on the map to get weather for that location
            </div>
        </div>
    );
};

export default WeatherMap;
