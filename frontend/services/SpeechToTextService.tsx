import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as Audio from "expo-av";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.100:5000";
const API_URL = "http://192.168.0.170:5000/api/speech-to-text";

const speechToTextService = {
    startSpeechRecognition: async ({ onResult, onError }) => {
        let recording: Audio.Recording | null = null;

        try {
            // 1. Ask for microphone permission
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                throw new Error("Microphone permission not granted");
            }

            // 2. Prepare audio recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            recording = new Audio.Recording();
            await recording.prepareToRecordAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            // 3. Start recording
            await recording.startAsync();
            console.log("🎙️ Recording started...");

            // Wait 5 seconds (demo). In real app, stop when user taps.
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // 4. Stop recording
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log("✅ Recording saved at:", uri);

            if (!uri) throw new Error("No audio recorded");

            // 5. Upload to backend
            const formData = new FormData();
            formData.append("audio", {
                uri,
                type: "audio/wav",
                name: "speech.wav",
            } as any);

            const response = await axios.post(API_URL, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.text) {
                onResult(response.data.text);
            } else {
                throw new Error("No text returned from backend");
            }
        } catch (error) {
            console.error("Speech service error:", error);
            onError(error);
        } finally {
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => { });
            }
        }
    },
};

export default speechToTextService;

