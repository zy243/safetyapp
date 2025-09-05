// File: frontend/services/SpeechService.ts
import * as Speech from "expo-speech";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
/**
 * A simple wrapper around Expo Speech API
 * so we can reuse speech functions across the app.
 */
const SpeechService = {
    /**
     * Speak out loud the given text.
     * @param text The message to speak
     */
    speak: (text: string) => {
        if (!text || text.trim() === "") return;
        Speech.speak(text, {
            language: "en",
            pitch: 1.0,
            rate: 1.0,
        });
    },

    /**
     * Stop all current speech.
     */
    stop: () => {
        Speech.stop();
    },

    /**
     * Check if text-to-speech is available on device.
     */
    isAvailable: async (): Promise<boolean> => {
        try {
            const voices = await Speech.getAvailableVoicesAsync();
            return voices.length > 0;
        } catch (err) {
            console.warn("SpeechService: Error checking voices", err);
            return false;
        }
    },
};

export default SpeechService;
