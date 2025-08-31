import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator } from "react-native";
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      verifyEmail(token as string);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    try {
      const response = await apiService.verifyEmail(verificationToken);

      if (response.success) {
        setIsVerified(true);
        Alert.alert(
          "Email Verified!", 
          "Your email has been verified successfully. You can now log in to your account.",
          [
            {
              text: "Go to Login",
              onPress: () => router.replace("/")
            }
          ]
        );
      } else {
        setError(response.message || "Verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerification = async () => {
    if (!user?.email) {
      Alert.alert("Error", "No email found. Please sign up again.");
      return;
    }

    try {
      const response = await apiService.resendVerification(user.email);

      if (response.success) {
        Alert.alert("Success", "Verification email sent successfully. Please check your inbox.");
      } else {
        Alert.alert("Error", response.message || "Failed to send verification email");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error. Please try again.");
    }
  };

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Verifying Email</Text>
          <ActivityIndicator size="large" color="#047857" style={styles.loader} />
          <Text style={styles.subtitle}>Please wait while we verify your email...</Text>
        </View>
      </View>
    );
  }

  if (isVerified) {
    return (
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.subtitle}>Your account has been successfully verified.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Email Verification</Text>
        <Text style={styles.subtitle}>
          {token ? "Verifying your email..." : "Please verify your email to continue"}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.message}>
          We've sent a verification link to your email address. Please check your inbox and click the verification link to activate your account.
        </Text>

        <TouchableOpacity style={styles.button} onPress={resendVerification}>
          <Text style={styles.buttonText}>Resend Verification Email</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>
      </View>
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
  loader: {
    marginVertical: 20,
  },
  content: {
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#047857",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
    minWidth: 200,
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
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
    fontSize: 14,
  },
});
