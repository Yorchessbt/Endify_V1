import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import styles from '../styles/styles';

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

export default ProductivityScreen;