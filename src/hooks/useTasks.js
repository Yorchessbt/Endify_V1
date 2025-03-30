import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const useTasks = (db, isSQLiteAvailable) => {
  const [tasks, setTasks] = useState([]);

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
    return loadedTasks.find(task => 
      !task.completed && 
      new Date(task.date.getTime() + task.time.getTime()) <= now
    );
  };

  return { tasks, setTasks, addTaskToDB, updateTaskInDB, deleteTaskFromDB, scheduleTaskNotification, checkOverdueTasks };
};

export default useTasks;