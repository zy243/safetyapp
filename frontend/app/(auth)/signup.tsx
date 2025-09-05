// app/(auth)/signup.tsx
import { useRouter } from "expo-router";
import { useState } from "react";

import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from "react-native";
import GeofencingService, { University } from "../../services/GeofencingService";
import UniversitySelector from "../../components/UniversitySelector";
import Constants from "expo-constants";

const BACKEND_URL =
    Constants.expoConfig?.extra?.BACKEND_URL || "http://localhost:5000";

export default function SignupScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [currentUniversity, setCurrentUniversity] =
        useState<University | null>(null);
    const [error, setError] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validate(): string | null {
        if (!fullName.trim()) return "Full name is required";
        if (!email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
        if (!currentUniversity) return "Please select your university.";
        if (!password) return "Password is required";
        if (password.length < 6) return "Password must be at least 6 characters";
        if (password !== confirmPassword) return "Passwords do not match";
        return null;
    }

    async function onSubmit() {
        const errorMsg = validate();
        if (errorMsg) {
            Alert.alert("Invalid input", errorMsg);
            return;
        }
        try {
            setIsSubmitting(true);

            // 🚀 Call backend API
            const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: fullName,
                    email,
                    password,
                    university: currentUniversity?.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Signup failed");
            }

            Alert.alert("Success", "Account created successfully!");
            router.replace("/"); // go back to login screen

        } catch (e: any) {
            Alert.alert("Sign up failed", e.message || "Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                <Image
                    source={require("../../assets/images/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Create your account</Text>
                <Text style={styles.subtitle}>Join your campus community</Text>
            </View>

            <TextInput
                style={styles.input}
                placeholder="Full name"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor="#999"
            />
            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#999"
            />

            {/* University Selector */}
            <UniversitySelector
                onUniversityChange={setCurrentUniversity}
                currentUniversity={currentUniversity}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#999"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#999"
            />

            <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={onSubmit}
                disabled={isSubmitting}
            >
                <Text style={styles.buttonText}>
                    {isSubmitting ? "Signing up..." : "Sign Up"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/")}>
                <Text style={styles.link}>Already have an account? Log in</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: "#fff",
        justifyContent: "center",
    },
    hero: {
        alignItems: "center",
        marginBottom: 24,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 4,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: "#fafafa",
    },
    button: {
        backgroundColor: "#047857",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
        marginBottom: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    link: {
        color: "#1e40af",
        textAlign: "center",
        fontSize: 14,
    },
});
