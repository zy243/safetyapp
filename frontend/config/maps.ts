import Constants from "expo-constants";

export const APP_CONFIG = {
    // Backend API
    BACKEND_URL: Constants.expoConfig?.extra?.BACKEND_URL || "http://192.168.0.100:5000",

    // Google Maps
    MAPS: {
        GOOGLE_MAPS_API_KEY: Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || "",

        DEFAULT_REGION: {
            latitude: 3.1390,
            longitude: 101.6869,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
        },

        MAP_STYLE: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
            },
        ],
    },
} as const;

export type MapRegion = typeof APP_CONFIG["MAPS"]["DEFAULT_REGION"];
