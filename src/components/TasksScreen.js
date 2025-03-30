import React, { useContext, useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import SearchBar from './SearchBar';
import TaskModal from './TaskModal';
import styles from '../styles/styles';

const TasksScreen = ({ route }) => {
  const { theme, tasks, addTaskToDB, updateTaskInDB, deleteTaskFromDB, isDarkMode } = useContext(ThemeContext);
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
            <View 
              key={task.id} 
              style={[
                styles.taskItem, 
                { 
                  backgroundColor: isDarkMode ? `${task.color || theme.buttonBackground}80` : task.color || theme.buttonBackground, // 50% opacidad en modo oscuro
                  opacity: task.completed ? 0.6 : 1,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5E74' : '#D1D5DB', // Borde más claro en modo oscuro
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }
              ]}
            >
              <View style={styles.taskContent}>
                <TouchableOpacity onPress={() => toggleTaskCompleted(task)}>
                  <Ionicons
                    name={task.completed ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={task.completed ? '#4CAF50' : theme.secondaryText}
                  />
                </TouchableOpacity>
                <View style={styles.taskDetails}>
                  <Text 
                    style={{ 
                      color: isDarkMode ? '#FFFFFF' : '#1F2937', // Blanco puro en oscuro, gris oscuro en claro
                      fontSize: 16, 
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                      fontWeight: '600', // Peso más bold para destacar
                    }}
                  >
                    {task.name}
                  </Text>
                  <Text style={{ color: isDarkMode ? '#E2E8F0' : theme.secondaryText, fontSize: 14 }}>
                    Materia: {task.subject}
                  </Text>
                  <Text style={{ color: isDarkMode ? '#E2E8F0' : theme.secondaryText, fontSize: 14 }}>
                    Maestro: {task.teacher}
                  </Text>
                  <Text style={{ color: isDarkMode ? '#E2E8F0' : theme.secondaryText, fontSize: 14 }}>
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

export default TasksScreen;