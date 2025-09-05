// services/speech.ts
import * as Speech from 'expo-speech';

/**
 * Speak a given text aloud.
 * @param text The text to be spoken
 * @param options Optional Speech options like language, pitch, rate
 */
export const speakText = (text: string, options?: Speech.SpeechOptions) => {
    if (!text) return;
    Speech.speak(text, options);
};

/**
 * Stop any ongoing speech.
 */
export const stopSpeech = () => {
    Speech.stop();
};

/**
 * Check if speech is currently ongoing.
 * Note: expo-speech does not provide direct isSpeaking API.
 * You may manage a flag if needed.
 */
