import React, { useContext } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import styles from '../styles/styles';

const HomeScreen = () => {
  const { theme, isDarkMode } = useContext(ThemeContext);

  // Nuevos colores personalizados
  const headerBackgroundColor = isDarkMode ? '#1E2A38' : '#E8EAF6'; // Oscuro: gris azulado, Claro: morado-azul grisáceo

  return (
    <View style={[styles.homeContainer, { backgroundColor: theme.background }]}>
      {/* Encabezado con nuevos colores */}
      <View style={[localStyles.header, { backgroundColor: headerBackgroundColor }]}>
        <Image 
          source={require('../../assets/icono.png')} 
          style={localStyles.headerLogo}
        />
        <Text style={[localStyles.headerTitle, { color: isDarkMode ? '#DDE4EB' : '#4A3F35' }]}>
          Endify
        </Text>
      </View>
      <View style={styles.content}>
        <Image source={require('../../assets/GIPCE-Fondo.png')} style={styles.logo} />
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

// Estilos locales para el encabezado
const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 35, // Espacio para la barra de estado
  },
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});

export default HomeScreen;