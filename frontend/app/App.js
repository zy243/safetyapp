// app/App.js
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Constants from "expo-constants";

export default function App() {
  // Backend URL from app.json extra
  const BACKEND_URL = Constants.manifest.extra.BACKEND_URL;

  useEffect(() => {
    // 1️⃣ Health check
    fetch(`${BACKEND_URL}/api/health`)
      .then(res => res.json())
      .then(data => console.log("Health check:", data))
      .catch(err => console.error("Error fetching health:", err));

    // 2️⃣ Get users
    fetch(`${BACKEND_URL}/api/users`)
      .then(res => res.json())
      .then(data => console.log("Users from backend:", data))
      .catch(err => console.error("Error fetching users:", err));

    // 3️⃣ Example: login (POST)
    fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    })
      .then(res => res.json())
      .then(data => console.log("Login response:", data))
      .catch(err => console.error("Error logging in:", err));

    // 4️⃣ Example: send SOS (POST)
    fetch(`${BACKEND_URL}/api/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: 1.23, longitude: 4.56 }),
    })
      .then(res => res.json())
      .then(data => console.log("SOS response:", data))
      .catch(err => console.error("Error sending SOS:", err));

  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18 }}>UniSafe Expo App</Text>
      <Text>Check console for backend responses</Text>
    </View>
  );
}

