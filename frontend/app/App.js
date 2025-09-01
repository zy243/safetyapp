import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Constants from "expo-constants";

export default function App() {
  const BACKEND_URL = Constants.manifest.extra.BACKEND_URL;

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/users`)
      .then(res => res.json())
      .then(data => console.log("Users from backend:", data))
      .catch(err => console.error("Error fetching users:", err));
  }, []);

  return (
    <View>
      <Text>Check console for backend response</Text>
    </View>
  );
}
