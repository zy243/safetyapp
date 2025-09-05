import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView，
    Button
} from "react-native";
import { Link } from "expo-router";


WebBrowser.maybeCompleteAuthSession();
export default function HomeScreen() {
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 20, marginBottom: 16 }}>Welcome to UniSafe 🚀</Text>
            <Link href="/guardians" asChild>
                <Button title="Go to Guardians" />
            </Link>
        </View>
    );
}

export default function Index() {
    const router = useRouter();
    const [role, setRole] = useState<"student" | "staff">("student");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const redirectUri = makeRedirectUri();
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "YOUR_GOOGLE_CLIENT_ID";
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId,
        scopes: ["profile", "email"],
        redirectUri
    });

    // ✅ Handle Google login (store user locally instead of backend)
    useEffect(() => {
        if (response?.type === "success" && response.authentication?.accessToken) {
            saveUser({ email: "google_user@example.com", password: "", role });
            router.replace("/(tabs)");
        } else if (response?.type === "error") {
            Alert.alert("Authentication failed", "Google sign-in failed. Please try again.");
        }
    }, [response, router]);

    function validate(): string | null {
        if (!email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
        if (!password) return "Password is required";
        if (password.length < 6) return "Password must be at least 6 characters";
        return null;
    }

    // ✅ Save user into AsyncStorage
    async function saveUser(user: { email: string; password: string; role: string }) {
        const existing = JSON.parse(await AsyncStorage.getItem("users") || "[]");
        const updated = [...existing.filter((u: any) => u.email !== user.email), user];
        await AsyncStorage.setItem("users", JSON.stringify(updated));
        await AsyncStorage.setItem("currentUser", JSON.stringify(user));
    }

    // ✅ Load users from storage
    async function loadUsers() {
        return JSON.parse(await AsyncStorage.getItem("users") || "[]");
    }

    // ✅ Email login without backend
    async function onEmailLogin() {
        const error = validate();
        if (error) {
            Alert.alert("Invalid input", error);
            return;
        }
        try {
            setIsSubmitting(true);
            const users = await loadUsers();
            const user = users.find((u: any) => u.email === email && u.password === password);

            if (user) {
                await AsyncStorage.setItem("currentUser", JSON.stringify(user));
                router.replace("/(tabs)");
            } else {
                Alert.alert("Login failed", "User not found. Please sign up first.");
            }
        } catch (e) {
            Alert.alert("Login failed", "Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoid}
            >
                <View style={styles.container}>
                    <View style={styles.hero}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push("/(tabs)/profile")}
                            accessibilityLabel="UniSafe logo"
                        >
                            <Image
                                source={require("../assets/images/logo.png")}
                                style={styles.logo}
                                contentFit="cover"
                                transition={200}
                            />
                        </TouchableOpacity>
                        <Text style={styles.subtitle}>Your safety. Your community. One app.</Text>
                    </View>

                    <View style={styles.cta}>
                        <View style={styles.roleRow}>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === "student" && styles.roleSelected]}
                                onPress={() => setRole("student")}
                            >
                                <Text style={[styles.roleText, role === "student" && styles.roleTextSelected]}>Student</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === "staff" && styles.roleSelected]}
                                onPress={() => setRole("staff")}
                            >
                                <Text style={[styles.roleText, role === "staff" && styles.roleTextSelected]}>Staff</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            placeholderTextColor="#999"
                        />

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                style={styles.showPasswordBtn}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.showPasswordText}>
                                    {showPassword ? "Hide" : "Show"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={onEmailLogin}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.primaryBtnText}>{isSubmitting ? "Signing in..." : "Sign In"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.googleBtn, (!request) && styles.buttonDisabled]}
                            onPress={() => promptAsync()}
                            disabled={!request}
                        >
                            <Image
                                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                                style={styles.googleIcon}
                            />
                            <Text style={styles.googleBtnText}>
                                Continue with Google
                            </Text>
                        </TouchableOpacity>

                        <Text
                            style={styles.link}
                            onPress={() => router.push("/(auth)/signup")}
                        >
                            New to UniSafe? Sign up
                        </Text>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By continuing, you agree to our Terms of Service and Privacy Policy
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: "#f8fafc", 
    justifyContent: "space-between" 
  },
  hero: { 
    alignItems: "center", 
    marginTop: 40 
  },
  logo: { 
    width: 140, 
    height: 140, 
    marginBottom: 16, 
    borderRadius: 70, 
    overflow: "hidden" 
  },
  title: { 
    fontSize: 34, 
    fontWeight: "800", 
    letterSpacing: 0.5, 
    color: "#0f172a", 
    marginBottom: 6 
  },
  subtitle: { 
    fontSize: 16, 
    color: "#475569", 
    textAlign: "center", 
    marginHorizontal: 16 
  },
  cta: { 
    alignItems: "center", 
    marginBottom: 40 
  },
  roleRow: { 
    flexDirection: "row", 
    gap: 10, 
    marginBottom: 12 
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
  },
  roleSelected: { 
    borderColor: "#1e40af", 
    backgroundColor: "#e0e7ff" 
  },
  roleText: { 
    color: "#334155", 
    fontWeight: "600" 
  },
  roleTextSelected: { 
    color: "#1e40af" 
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    width: "100%",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  showPasswordBtn: {
    position: "absolute",
    right: 10,
    padding: 5,
  },
  showPasswordText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#1e40af",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16 
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleBtnText: { 
    color: "#111", 
    fontWeight: "600", 
    fontSize: 16 
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  link: { 
    color: "#1e40af", 
    fontWeight: "600", 
    fontSize: 14, 
    marginTop: 8 
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});