import React from 'react';
import ThemeProvider from './context/ThemeContext';
import AppNavigator from './navigation/AppNavigator';
import TaskNotificationHandler from './components/TaskNotificationHandler';

const AppWithNotifications = () => (
  <>
    <AppNavigator />
    <TaskNotificationHandler />
  </>
);

export default function App() {
  return (
    <ThemeProvider>
      <AppWithNotifications />
    </ThemeProvider>
  );
}