import React, { createContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { lightTheme, darkTheme } from '../themes/themes';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/styles';
import useTasks from '../hooks/useTasks';

export const ThemeContext = createContext();

const isSQLiteAvailable = typeof SQLite.openDatabase === 'function';
let db;
if (isSQLiteAvailable) {
  try {
    db = SQLite.openDatabase('organiza.db');
  } catch (error) {
    console.error('Error abriendo SQLite:', error);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [overdueModalVisible, setOverdueModalVisible] = useState(false);
  const [overdueTask, setOverdueTask] = useState(null);
  const [handledOverdueIds, setHandledOverdueIds] = useState(new Set());
  const { tasks, setTasks, addTaskToDB, updateTaskInDB, deleteTaskFromDB, scheduleTaskNotification, checkOverdueTasks } = useTasks(db, isSQLiteAvailable);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Device.isDevice) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') alert('¡Necesitamos permisos para enviarte notificaciones!');
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('isDarkMode');
        if (storedTheme !== null) setIsDarkMode(JSON.parse(storedTheme));
      } catch (error) {
        console.error('Error cargando el tema:', error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      if (isSQLiteAvailable && db) {
        db.transaction(tx => {
          tx.executeSql(
            'CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, subject TEXT, teacher TEXT, date TEXT, time TEXT, color TEXT, completed INTEGER);',
            [],
            () => {},
            (_, error) => console.error('Error creando tabla:', error)
          );
          tx.executeSql(
            'SELECT * FROM tasks;',
            [],
            (_, { rows }) => {
              const loadedTasks = rows._array.map(task => ({
                ...task,
                date: new Date(task.date),
                time: new Date(task.time),
                completed: !!task.completed,
              }));
              setTasks(loadedTasks);
              loadedTasks.forEach(scheduleTaskNotification);
              checkOverdueTasks(loadedTasks);
            },
            (_, error) => console.error('Error cargando tareas:', error)
          );
        });
      } else {
        try {
          const storedTasks = await AsyncStorage.getItem('tasks');
          if (storedTasks) {
            const parsedTasks = JSON.parse(storedTasks).map(task => ({
              ...task,
              date: new Date(task.date),
              time: new Date(task.time),
              completed: task.completed || false,
            }));
            setTasks(parsedTasks);
            parsedTasks.forEach(scheduleTaskNotification);
            checkOverdueTasks(parsedTasks);
          }
        } catch (error) {
          console.error('Error cargando tareas:', error);
        }
      }
    };
    loadTasks();
  }, []);

  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newValue));
    } catch (error) {
      console.error('Error guardando el tema:', error);
    }
  };

  const handleOverdueAction = (action) => {
    if (action === 'complete') {
      updateTaskInDB({ ...overdueTask, completed: true });
    } else if (action === 'reschedule') {
      setOverdueModalVisible(false);
      setOverdueTask(null);
      return overdueTask;
    }
    setHandledOverdueIds(prev => new Set(prev).add(overdueTask.id));
    setOverdueModalVisible(false);
    setOverdueTask(null);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleDarkMode, tasks, addTaskToDB, updateTaskInDB, deleteTaskFromDB }}>
      <NavigationContainer>
        {children}
        {overdueTask && (
          <Modal visible={overdueModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.notificationModal, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                  <Ionicons name="warning" size={28} color="#FF4444" />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Tarea vencida: {overdueTask.name}
                  </Text>
                </View>
                <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
                  La fecha y hora de entrega han pasado. ¿Qué quieres hacer?
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.activeTint }]}
                    onPress={() => handleOverdueAction('complete')}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Completar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.activeTint }]}
                    onPress={() => handleOverdueAction('reschedule')}
                  >
                    <Ionicons name="calendar" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Reprogramar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF4444' }]}
                    onPress={() => handleOverdueAction('ignore')}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Ignorar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </NavigationContainer>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;