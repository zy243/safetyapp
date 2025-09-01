// frontend/App.js
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Constants from 'expo-constants';

export default function App() {
  const BACKEND_URL = Constants.manifest.extra.BACKEND_URL;

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/endpoint`)
      .then(res => res.json())
      .then(data => console.log(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <View>
      <Text>Check console for backend data</Text>
    </View>
  );
}
