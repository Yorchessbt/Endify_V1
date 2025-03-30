import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/styles';

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

export default TaskModal;