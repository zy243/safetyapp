import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { MAPS_CONFIG } from "../config/maps";
import { fetchIncidents, fetchUniversity } from "../services/mapService";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
interface GoogleMapsViewProps {
    userLocation: { latitude: number; longitude: number } | null;
    showSafeRoute: boolean;
    onMapPress?: (latitude: number, longitude: number) => void;
}

export default function GoogleMapsView({
    userLocation,
    showSafeRoute,
    onMapPress,
}: GoogleMapsViewProps) {
    const webViewRef = useRef<WebView>(null);

    const [incidents, setIncidents] = useState<any[]>([]);
    const [currentUniversity, setCurrentUniversity] = useState<any | null>(null);

    // Fetch incidents and university data from backend
    useEffect(() => {
        const loadData = async () => {
            try {
                const [incidentsData, universityData] = await Promise.all([
                    fetchIncidents(),
                    fetchUniversity(),
                ]);
                setIncidents(incidentsData);
                setCurrentUniversity(universityData);
            } catch (error) {
                console.error("Failed to fetch map data:", error);
            }
        };
        loadData();
    }, []);

    const getIncidentColor = (type: string) => {
        const colors: Record<string, string> = {
            theft: "#FF9500",
            harassment: "#FF3B30",
            accident: "#007AFF",
            suspicious: "#FF6B35",
            fire: "#FF2D55",
        };
        return colors[type] || "#FF3B30";
    };

    // Generate Google Maps HTML
    const generateGoogleMapsHTML = () => {
        const apiKey = MAPS_CONFIG.GOOGLE_MAPS_API_KEY;

        // Incident markers
        const incidentMarkers = incidents
            .map((incident) => {
                const color = getIncidentColor(incident.type);
                return `
                    new google.maps.Marker({
                        position: { lat: ${incident.location.latitude}, lng: ${incident.location.longitude} },
                        map: map,
                        title: '${incident.title}',
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 15,
                            fillColor: '${color}',
                            fillOpacity: 1.0,
                            strokeColor: '#fff',
                            strokeWeight: 3
                        }
                    });
                `;
            })
            .join("");

        // University coverage
        const universityCoverage = currentUniversity
            ? `
                const coverageCircle = new google.maps.Circle({
                    strokeColor: '#FF9500',
                    strokeOpacity: 0.3,
                    strokeWeight: 2,
                    fillColor: '#FF9500',
                    fillOpacity: 0.1,
                    map: map,
                    center: { lat: ${currentUniversity.center.latitude}, lng: ${currentUniversity.center.longitude} },
                    radius: ${currentUniversity.coverageRadius * 1000},
                });

                const campusBoundary = new google.maps.Polygon({
                    paths: [${currentUniversity.campusBoundary
                .map((point: any) => `{ lat: ${point.latitude}, lng: ${point.longitude} }`)
                .join(", ")}],
                    strokeColor: '#34C759',
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    fillColor: '#34C759',
                    fillOpacity: 0.1,
                    map: map,
                });
            `
            : "";

        // Safe route polyline
        const safeRoutePolyline = showSafeRoute
            ? `
                const safeRoute = new google.maps.Polyline({
                    path: [
                        { lat: ${userLocation?.latitude || 3.1201}, lng: ${userLocation?.longitude || 101.6544} },
                        { lat: 3.1250, lng: 101.6600 },
                        { lat: 3.1150, lng: 101.6480 }
                    ],
                    geodesic: true,
                    strokeColor: '#34C759',
                    strokeOpacity: 1.0,
                    strokeWeight: 4,
                    icons: [{
                        icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                        offset: '50%'
                    }]
                });
                safeRoute.setMap(map);
            `
            : "";

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style> body { margin: 0; padding: 0; } #map { width: 100%; height: 100vh; } </style>
                </head>
                <body>
                    <div id="map"></div>
                    <script>
                        let map;
                        function initMap() {
                            const userLat = ${userLocation?.latitude || 3.1201};
                            const userLng = ${userLocation?.longitude || 101.6544};

                            map = new google.maps.Map(document.getElementById('map'), {
                                center: { lat: userLat, lng: userLng },
                                zoom: 15,
                                mapTypeId: google.maps.MapTypeId.ROADMAP
                            });

                            new google.maps.Marker({
                                position: { lat: userLat, lng: userLng },
                                map: map,
                                title: 'Your Location',
                                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#007AFF', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }
                            });

                            ${universityCoverage}
                            ${incidentMarkers}
                            ${safeRoutePolyline}

                            map.addListener('click', function(event) {
                                const lat = event.latLng.lat();
                                const lng = event.latLng.lng();
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick', latitude: lat, longitude: lng }));
                            });
                        }
                    </script>
                    <script async defer src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap"></script>
                </body>
            </html>
        `;
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "mapClick" && onMapPress) {
                onMapPress(data.latitude, data.longitude);
            }
        } catch (error) {
            console.log("WebView message error:", event.nativeEvent.data);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ html: generateGoogleMapsHTML() }}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, borderRadius: 16, overflow: "hidden" },
    webview: { flex: 1, borderRadius: 16 },
});
