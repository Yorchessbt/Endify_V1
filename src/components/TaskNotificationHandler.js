import React, { useContext, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { ThemeContext } from '../context/ThemeContext';
import styles from '../styles/styles';

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

export default TaskNotificationHandler;