import React, { useState, createContext, useContext, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Switch, Linking, ScrollView, TextInput, Modal } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configurar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const isSQLiteAvailable = typeof SQLite.openDatabase === 'function';
let db;
if (isSQLiteAvailable) {
  try {
    db = SQLite.openDatabase('organiza.db');
  } catch (error) {
    console.error('Error abriendo SQLite:', error);
  }
}

const ThemeContext = createContext();

const TaskNotificationHandler = () => {
  const { updateTaskInDB, tasks, theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const taskId = notification.request.content.data.taskId;
      const task = tasks.find(t => t.id === taskId);
      if (task && !task.completed) {
        setSelectedTask(task);
        setNotificationModalVisible(true);
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const taskId = response.notification.request.content.data.taskId;
      const task = tasks.find(t => t.id === taskId);
      if (task && !task.completed) {
        setSelectedTask(task);
        setNotificationModalVisible(true);
        navigation.navigate('Tareas', { taskId: task.id });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [tasks, navigation]);

  const handleNotificationAction = (action) => {
    if (!selectedTask) return;

    if (action === 'complete') {
      updateTaskInDB({ ...selectedTask, completed: true });
    } else if (action === 'reschedule') {
      navigation.navigate('Tareas', { taskId: selectedTask.id });
    }
    setNotificationModalVisible(false);
    setSelectedTask(null);
  };

  return (
    <Modal visible={notificationModalVisible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.notificationModal, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Ionicons name="notifications" size={28} color={theme.activeTint} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Tarea: {selectedTask?.name}
            </Text>
          </View>
          <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
            ¿Qué deseas hacer con esta tarea?
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.activeTint }]}
              onPress={() => handleNotificationAction('complete')}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Completar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.activeTint }]}
              onPress={() => handleNotificationAction('reschedule')}
            >
              <Ionicons name="calendar" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Reprogramar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF4444' }]}
              onPress={() => setNotificationModalVisible(false)}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [overdueModalVisible, setOverdueModalVisible] = useState(false);
  const [overdueTask, setOverdueTask] = useState(null);
  const [handledOverdueIds, setHandledOverdueIds] = useState(new Set());

  useEffect(() => {
    const requestPermissions = async () => {
      if (Device.isDevice) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('¡Necesitamos permisos para enviarte notificaciones!');
        }
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

  const scheduleTaskNotification = async (task) => {
    if (task.completed) return;
    const trigger = new Date(task.date);
    trigger.setHours(task.time.getHours());
    trigger.setMinutes(task.time.getMinutes());
    trigger.setSeconds(0);

    if (trigger > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `¡Tarea pendiente!`,
          body: `Es hora de entrega para "${task.name}" (${task.subject})`,
          data: { taskId: task.id },
        },
        trigger,
      });
    }
  };

  const addTaskToDB = async (task) => {
    const newTask = { ...task, id: Date.now(), completed: false };
    if (isSQLiteAvailable && db) {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO tasks (name, subject, teacher, date, time, color, completed) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [task.name, task.subject, task.teacher, task.date.toISOString(), task.time.toISOString(), task.color, 0],
          (_, { insertId }) => {
            newTask.id = insertId;
            setTasks(prevTasks => [...prevTasks, newTask]);
            scheduleTaskNotification(newTask);
          },
          (_, error) => console.error('Error insertando tarea:', error)
        );
      });
    } else {
      try {
        const updatedTasks = [...tasks, newTask];
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        setTasks(updatedTasks);
        scheduleTaskNotification(newTask);
      } catch (error) {
        console.error('Error guardando tarea:', error);
      }
    }
  };

  const updateTaskInDB = async (task) => {
    await Notifications.cancelScheduledNotificationAsync(task.id.toString());
    if (isSQLiteAvailable && db) {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE tasks SET name = ?, subject = ?, teacher = ?, date = ?, time = ?, color = ?, completed = ? WHERE id = ?;',
          [task.name, task.subject, task.teacher, task.date.toISOString(), task.time.toISOString(), task.color, task.completed ? 1 : 0, task.id],
          () => {
            setTasks(prevTasks => prevTasks.map(t => (t.id === task.id ? task : t)));
            if (!task.completed) scheduleTaskNotification(task);
          },
          (_, error) => console.error('Error actualizando tarea:', error)
        );
      });
    } else {
      try {
        const updatedTasks = tasks.map(t => (t.id === task.id ? task : t));
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        setTasks(updatedTasks);
        if (!task.completed) scheduleTaskNotification(task);
      } catch (error) {
        console.error('Error actualizando tarea:', error);
      }
    }
  };

  const deleteTaskFromDB = async (taskId) => {
    await Notifications.cancelScheduledNotificationAsync(taskId.toString());
    if (isSQLiteAvailable && db) {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM tasks WHERE id = ?;',
          [taskId],
          () => setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId)),
          (_, error) => console.error('Error eliminando tarea:', error)
        );
      });
    } else {
      try {
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        setTasks(updatedTasks);
      } catch (error) {
        console.error('Error eliminando tarea:', error);
      }
    }
  };

  const checkOverdueTasks = (loadedTasks) => {
    const now = new Date();
    const overdue = loadedTasks.find(task => 
      !task.completed && 
      !handledOverdueIds.has(task.id) && 
      new Date(task.date.getTime() + task.time.getTime()) <= now
    );
    if (overdue && overdue !== overdueTask) {
      setOverdueTask(overdue);
      setOverdueModalVisible(true);
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

  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newValue));
    } catch (error) {
      console.error('Error guardando el tema:', error);
    }
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

const lightTheme = {
  background: '#fff',
  text: '#333',
  secondaryText: '#666',
  buttonBackground: '#f0f0f0',
  activeTint: '#007AFF',
  tabBarBackground: '#fff',
  searchBackground: '#f0f0f0',
};
const darkTheme = {
  background: '#1a1a1a',
  text: '#fff',
  secondaryText: '#bbb',
  buttonBackground: '#333',
  activeTint: '#81b0ff',
  tabBarBackground: '#2a2a2a',
  searchBackground: '#444',
};

// Componente de barra de búsqueda (se mantiene para TasksScreen)
const SearchBar = ({ onSearch }) => {
  const { theme } = useContext(ThemeContext);
  const [searchText, setSearchText] = useState('');

  const handleSearch = (text) => {
    setSearchText(text);
    onSearch(text);
  };

  return (
    <View style={[styles.searchBar, { backgroundColor: theme.searchBackground }]}>
      <Ionicons name="search-outline" size={20} color={theme.secondaryText} style={styles.searchIcon} />
      <TextInput
        style={[styles.searchInput, { color: theme.text }]}
        placeholder="Buscar tareas..."
        placeholderTextColor={theme.secondaryText}
        value={searchText}
        onChangeText={handleSearch}
      />
    </View>
  );
};

const HomeScreen = () => {
  const { theme } = useContext(ThemeContext);
  return (
    <View style={[styles.homeContainer, { backgroundColor: theme.background }]}>
      {/* Encabezado mejorado */}
      <View style={[styles.header, { backgroundColor: theme.buttonBackground }]}>
        <Image 
          source={require('./assets/icono.png')} 
          style={styles.headerLogo}
        />
        <Text style={[styles.headerTitle, { color: theme.activeTint }]}>
          Endify
        </Text>
      </View>
      <View style={styles.content}>
        <Image source={require('./assets/GIPCE-Fondo.png')} style={styles.logo} />
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          ¡Bienvenido a Endify!
        </Text>
        <Text style={[styles.sloganText, { color: theme.secondaryText }]}>
          Organiza, Prioriza, Triunfa
        </Text>
      </View>
    </View>
  );
};

const TasksScreen = ({ route }) => {
  const { theme, tasks, addTaskToDB, updateTaskInDB, deleteTaskFromDB } = useContext(ThemeContext);
  const navigation = useNavigation();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState(tasks);

  useEffect(() => {
    if (route.params?.taskId) {
      const task = tasks.find(t => t.id === route.params.taskId);
      if (task) {
        setSelectedTask(task);
        setEditModalVisible(true);
      }
      navigation.setParams({ taskId: undefined });
    }
  }, [route.params?.taskId, tasks, navigation]);

  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

  const handleEdit = (task) => {
    setSelectedTask(task);
    setEditModalVisible(true);
  };

  const saveEdit = (updatedTask) => {
    updateTaskInDB(updatedTask);
    setEditModalVisible(false);
    setSelectedTask(null);
  };

  const handleAddTask = (task) => {
    addTaskToDB(task);
    setAddModalVisible(false);
  };

  const toggleTaskCompleted = (task) => {
    updateTaskInDB({ ...task, completed: !task.completed });
  };

  const handleSearch = (text) => {
    const filtered = tasks.filter(task =>
      task.name.toLowerCase().includes(text.toLowerCase()) ||
      task.subject.toLowerCase().includes(text.toLowerCase()) ||
      task.teacher.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredTasks(filtered);
  };

  const tabBarHeight = 70;
  const fabBottomPosition = tabBarHeight + 20;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SearchBar onSearch={handleSearch} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 80 }}>
        {filteredTasks.length === 0 ? (
          <View style={styles.noTasksContainer}>
            <Text style={[styles.noTasksText, { color: theme.activeTint }]}>
              ¡Yu hu!
            </Text>
            <Text style={[styles.noTasksSubText, { color: theme.text }]}>
              No tienes tareas por el momento
            </Text>
            <Text style={[styles.noTasksActionText, { color: theme.secondaryText }]}>
              Para agregar, da click en <Text style={{ color: theme.activeTint }}>+</Text>
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <View key={task.id} style={[styles.taskItem, { backgroundColor: task.color || theme.buttonBackground, opacity: task.completed ? 0.6 : 1 }]}>
              <View style={styles.taskContent}>
                <TouchableOpacity onPress={() => toggleTaskCompleted(task)}>
                  <Ionicons
                    name={task.completed ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={task.completed ? '#4CAF50' : theme.secondaryText}
                  />
                </TouchableOpacity>
                <View style={styles.taskDetails}>
                  <Text style={{ color: theme.text, fontSize: 16, textDecorationLine: task.completed ? 'line-through' : 'none' }}>
                    {task.name}
                  </Text>
                  <Text style={{ color: theme.secondaryText }}>Materia: {task.subject}</Text>
                  <Text style={{ color: theme.secondaryText }}>Maestro: {task.teacher}</Text>
                  <Text style={{ color: theme.secondaryText }}>
                    Entrega: {task.date.toLocaleDateString()} {task.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity onPress={() => handleEdit(task)}>
                  <Ionicons name="pencil" size={20} color={theme.activeTint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTaskFromDB(task.id)}>
                  <Ionicons name="trash" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.activeTint, bottom: fabBottomPosition }]}
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {selectedTask && (
        <TaskModal
          visible={editModalVisible}
          task={selectedTask}
          onSave={saveEdit}
          onCancel={() => setEditModalVisible(false)}
          theme={theme}
        />
      )}
      <TaskModal
        visible={addModalVisible}
        onSave={handleAddTask}
        onCancel={() => setAddModalVisible(false)}
        theme={theme}
      />
    </View>
  );
};

const ProfileScreen = () => {
  const { theme } = useContext(ThemeContext);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.text }}>Perfil</Text>
    </View>
  );
};

const SettingsScreen = () => {
  const { theme, isDarkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <ScrollView style={[styles.settingsContainer, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Apariencia</Text>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]}>
          <View style={styles.optionRow}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Modo Oscuro</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: theme.activeTint }}
              thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Contacto</Text>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]} onPress={() => Linking.openURL('mailto:soporte@organiza.com')}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Email: soporte@organiza.com</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]} onPress={() => Linking.openURL('https://twitter.com/organiza_app')}>
          <View style={styles.optionRow}>
            <Ionicons name="logo-twitter" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 16, marginLeft: 10 }}>Twitter</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]} onPress={() => Linking.openURL('https://instagram.com/organiza_app')}>
          <View style={styles.optionRow}>
            <Ionicons name="logo-instagram" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 16, marginLeft: 10 }}>Instagram</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]} onPress={() => Linking.openURL('https://facebook.com/organiza_app')}>
          <View style={styles.optionRow}>
            <Ionicons name="logo-facebook" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 16, marginLeft: 10 }}>Facebook</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Acerca de</Text>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Endify v1.0.0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: theme.buttonBackground }]}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Creado por:</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Barraza Torres Jorge Eduardo</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Romero Hernandez Jose Christian</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Gonzalez Caballon Josue Panzon</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Pera Morena Edgar</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Gutierrez Longaniza Gael</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Gonzalez Alerta Halison Melani</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>© 2025 by Dj - GIPCE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const ProductivityScreen = () => {
  const { theme, tasks } = useContext(ThemeContext);

  const analyzeProductivity = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const tasksByDay = tasks.reduce((acc, task) => {
      const day = task.date.getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const busiestDay = Object.entries(tasksByDay).reduce((a, b) => (a[1] > b[1] ? a : b), [0, 0])[0] || 0;
    const busiestDayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][busiestDay];

    return {
      totalTasks,
      completedTasks,
      busiestDay: busiestDayName,
      taskCountOnBusiestDay: tasksByDay[busiestDay] || 0,
      avgTasksPerDay: totalTasks / 7,
    };
  };

  const stats = analyzeProductivity();

  return (
    <View style={[styles.productivityContainer, { backgroundColor: theme.background }]}>
      <Text style={[styles.productivityTitle, { color: theme.text }]}>Tu Productividad</Text>
      <View style={styles.statsContainer}>
        <Text style={[styles.stat, { color: theme.text }]}>
          Total de tareas: {stats.totalTasks}
        </Text>
        <Text style={[styles.stat, { color: theme.text }]}>
          Tareas completadas: {stats.completedTasks}
        </Text>
        <Text style={[styles.stat, { color: theme.text }]}>
          Día más ocupado: {stats.busiestDay} ({stats.taskCountOnBusiestDay} tareas)
        </Text>
        <Text style={[styles.stat, { color: theme.text }]}>
          Promedio de tareas por día: {stats.avgTasksPerDay.toFixed(1)}
        </Text>
        <Text style={[styles.recommendation, { color: theme.secondaryText }]}>
          {stats.taskCountOnBusiestDay > 3
            ? `Considera redistribuir algunas tareas del ${stats.busiestDay} a días más libres.`
            : '¡Tu carga de trabajo está bien distribuida!'}
        </Text>
      </View>
    </View>
  );
};

const TaskModal = ({ visible, task = {}, onSave, onCancel, theme }) => {
  const [taskName, setTaskName] = useState(task.name || '');
  const [subject, setSubject] = useState(task.subject || '');
  const [teacher, setTeacher] = useState(task.teacher || '');
  const [date, setDate] = useState(task.date || new Date());
  const [time, setTime] = useState(task.time || new Date());
  const [color, setColor] = useState(task.color || '#f0f0f0');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const colors = ['#f0f0f0', '#FFD1DC', '#D4F1F4', '#D9F7BE', '#FFF3B0', '#E2D1F9'];

  const handleSave = () => {
    const updatedTask = {
      id: task.id || Date.now(),
      name: taskName,
      subject,
      teacher,
      date,
      time,
      color,
      completed: task.completed || false,
    };
    onSave(updatedTask);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{task.id ? 'Editar Tarea' : 'Agregar Tarea'}</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.secondaryText }]}
            placeholder="Nombre de la tarea"
            placeholderTextColor={theme.secondaryText}
            value={taskName}
            onChangeText={setTaskName}
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.secondaryText }]}
            placeholder="Materia"
            placeholderTextColor={theme.secondaryText}
            value={subject}
            onChangeText={setSubject}
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.secondaryText }]}
            placeholder="Maestro"
            placeholderTextColor={theme.secondaryText}
            value={teacher}
            onChangeText={setTeacher}
          />
          <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.buttonBackground }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: theme.text }}>Fecha: {date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
          <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.buttonBackground }]} onPress={() => setShowTimePicker(true)}>
            <Text style={{ color: theme.text }}>Hora: {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) setTime(selectedTime);
              }}
            />
          )}
          <Text style={[styles.colorLabel, { color: theme.text }]}>Color:</Text>
          <View style={styles.colorPicker}>
            {colors.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorOption, { backgroundColor: c, borderWidth: color === c ? 2 : 0, borderColor: theme.activeTint }]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF4444' }]} onPress={onCancel}>
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.activeTint }]} onPress={handleSave}>
              <Text style={styles.actionButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.tabBarBackground }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = route.name;
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tab}>
            <Ionicons
              name={
                label === 'Home' ? 'home-outline' :
                label === 'Tareas' ? 'checkbox-outline' :
                label === 'Productividad' ? 'stats-chart-outline' :
                label === 'Perfil' ? 'person-outline' :
                label === 'Ajustes' ? 'settings-outline' : 'help-outline'
              }
              size={24}
              color={isFocused ? theme.activeTint : theme.secondaryText}
            />
            <Text style={[styles.tabText, { color: isFocused ? theme.activeTint : theme.secondaryText }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const Tab = createBottomTabNavigator();

const AppNavigator = () => (
  <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Tareas" component={TasksScreen} />
    <Tab.Screen name="Productividad" component={ProductivityScreen} />
    <Tab.Screen name="Perfil" component={ProfileScreen} />
    <Tab.Screen name="Ajustes" component={SettingsScreen} />
  </Tab.Navigator>
);

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

const styles = StyleSheet.create({
  homeContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 40, // Espacio adicional en la parte superior
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLogo: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 150, height: 150, borderRadius: 75, marginBottom: 20 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  sloganText: { fontSize: 18, textAlign: 'center', fontStyle: 'italic' },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    width: Dimensions.get('window').width,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    elevation: 5,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 50,
    margin: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  settingsContainer: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  optionButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  taskDetails: { marginLeft: 10, flex: 1 },
  taskActions: { flexDirection: 'row', gap: 15 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  notificationModal: {
    width: '85%',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginLeft: 10 },
  modalSubtitle: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    elevation: 3,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  modalContent: { width: '85%', padding: 20, borderRadius: 15, elevation: 5 },
  input: { borderWidth: 1, borderRadius: 5, padding: 10, marginBottom: 10, fontSize: 16 },
  dateButton: { padding: 10, borderRadius: 5, marginBottom: 10, alignItems: 'center' },
  colorLabel: { fontSize: 16, marginBottom: 10 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorOption: { width: 30, height: 30, borderRadius: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, gap: 10 },
  productivityContainer: { flex: 1, padding: 20 },
  productivityTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  statsContainer: { padding: 15, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  stat: { fontSize: 16, marginBottom: 10 },
  recommendation: { fontSize: 14, fontStyle: 'italic', marginTop: 10 },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  noTasksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  noTasksText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noTasksSubText: {
    fontSize: 18,
    marginBottom: 5,
  },
  noTasksActionText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});