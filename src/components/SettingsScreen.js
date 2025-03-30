import React, { useContext } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import styles from '../styles/styles';

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
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Gonzalez Caballero Josue Antonio</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Moreno Perez Edgar</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Gutierrez Zuñiga Gael</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>- Gonzalez Lerma Halison Melani</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 14 }}>© 2025 by Dj - GIPCE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;