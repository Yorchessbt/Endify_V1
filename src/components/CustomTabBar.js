import React, { useContext } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import styles from '../styles/styles';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDarkMode } = useContext(ThemeContext);

  // Nuevos colores personalizados
  const tabBarBackground = isDarkMode ? '#1E2A38' : '#E8EAF6'; // Oscuro: gris azulado, Claro: morado-azul grisáceo

  return (
    <View style={[styles.tabBar, { backgroundColor: tabBarBackground }]}>
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

export default CustomTabBar;