import React, { useContext, useState } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import styles from '../styles/styles';

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

export default SearchBar;