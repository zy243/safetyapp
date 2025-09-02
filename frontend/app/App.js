// app/App.js
import React from 'react';
import { GuardianProvider } from '../contexts/GuardianContext';
import { ExpoRouter } from 'expo-router';

const App = () => {
  return (
    <GuardianProvider>
      <ExpoRouter /> {/* Handles routing automatically */}
    </GuardianProvider>
  );
};

export default App;

