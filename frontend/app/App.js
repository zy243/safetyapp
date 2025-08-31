import React from 'react';
import { GuardianProvider } from '../contexts/GuardianContext';
import Navigation from './Navigation'; // Your navigation component

const App = () => {
  return (
    <GuardianProvider>
      <Navigation />
    </GuardianProvider>
  );
};

export default App;