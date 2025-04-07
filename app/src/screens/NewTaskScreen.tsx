import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { auth, db } from '../config/firebase';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../hooks/useTheme';
import { format } from 'date-fns';

interface Task {
  title: string;
  description?: string;
  urgency: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate: Date;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
}

const urgencyColors = {
  baixa: '#4CAF50', // Verde
  media: '#FFC107', // Amarelo
  alta: '#FF9800', // Laranja
  urgente: '#F44336', // Vermelho
};

export default function NewTaskScreen() {
  const { isDarkMode } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { scheduleTaskNotification } = useNotifications();
  const [task, setTask] = useState<Task>({
    title: '',
    description: '',
    urgency: 'baixa',
    dueDate: new Date(),
    startTime: '',
    endTime: '',
    isFullDay: true,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isStartTime, setIsStartTime] = useState(true);

  const handleSave = async () => {
    if (!task.title.trim()) {
      Alert.alert('Erro', 'O título da tarefa é obrigatório');
      return;
    }

    if (!task.isFullDay && (!task.startTime || !task.endTime)) {
      Alert.alert('Erro', 'Defina os horários de início e término');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        Alert.alert('Erro', 'Usuário não autenticado');
        router.replace('/src/screens/LoginScreen');
        return;
      }

      const tasksRef = collection(db, 'tasks');
      await addDoc(tasksRef, {
        ...task,
        userId: currentUser.uid,
        completed: false,
        createdAt: serverTimestamp(),
      });

      // Agendar notificação para a tarefa
      await scheduleTaskNotification(task.title.trim(), task.dueDate);

      Alert.alert('Sucesso', 'Tarefa criada com sucesso');
      router.back();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível criar a tarefa');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTask(prev => ({ ...prev, dueDate: selectedDate }));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (isStartTime) {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      const timeString = format(selectedTime, 'HH:mm');
      setTask(prev => ({
        ...prev,
        [isStartTime ? 'startTime' : 'endTime']: timeString,
      }));
    }
  };

  const toggleFullDay = () => {
    setTask(prev => ({
      ...prev,
      isFullDay: !prev.isFullDay,
      startTime: !prev.isFullDay ? '' : prev.startTime,
      endTime: !prev.isFullDay ? '' : prev.endTime,
    }));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      position: 'absolute',
      left: 0,
      top: 55,
      right: 0,
      textAlign: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    datePickerButton: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
    },
    checkboxLabel: {
      fontSize: 16,
      color: theme.colors.text,
    },
    urgencyOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    urgencyOption: {
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginHorizontal: 4,
      marginBottom: 8,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    urgencyOptionText: {
      fontWeight: '500',
      fontSize: 14,
    },
    timePickersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    timePicker: {
      width: '48%',
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    saveButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Nova Tarefa</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        <Text style={styles.formLabel}>Título</Text>
        <TextInput
          style={styles.input}
          value={task.title}
          onChangeText={(text) => setTask(prev => ({ ...prev, title: text }))}
          placeholder="Digite o título da tarefa"
          placeholderTextColor={theme.colors.text + '80'}
        />

        <Text style={styles.formLabel}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={task.description}
          onChangeText={(text) => setTask(prev => ({ ...prev, description: text }))}
          placeholder="Digite a descrição da tarefa"
          placeholderTextColor={theme.colors.text + '80'}
          multiline
        />

        <Text style={styles.formLabel}>Data de Entrega</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {task.dueDate.toLocaleDateString('pt-BR')}
          </Text>
          <Ionicons name="calendar-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={task.dueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.formLabel}>Urgência</Text>
        <View style={styles.urgencyOptions}>
          {Object.keys(urgencyColors).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.urgencyOption,
                {
                  backgroundColor: task.urgency === level ? urgencyColors[level as keyof typeof urgencyColors] : theme.colors.card,
                },
              ]}
              onPress={() => setTask(prev => ({ ...prev, urgency: level as Task['urgency'] }))}
            >
              <Text
                style={[
                  styles.urgencyOptionText,
                  {
                    color: task.urgency === level ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.formLabel}>Horários</Text>
        <View style={styles.timePickersContainer}>
          <TouchableOpacity
            style={styles.timePicker}
            onPress={() => {
              setIsStartTime(true);
              setShowStartTimePicker(true);
            }}
          >
            <Text style={styles.formLabel}>Início</Text>
            <Text style={styles.input}>{task.startTime || 'Selecione'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timePicker}
            onPress={() => {
              setIsStartTime(false);
              setShowEndTimePicker(true);
            }}
          >
            <Text style={styles.formLabel}>Término</Text>
            <Text style={styles.input}>{task.endTime || 'Selecione'}</Text>
          </TouchableOpacity>
        </View>

        {showStartTimePicker && (
          <DateTimePicker
            value={new Date(task.dueDate.setHours(task.startTime ? parseInt(task.startTime.split(':')[0]) : 0, task.startTime ? parseInt(task.startTime.split(':')[1]) : 0))}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            minimumDate={new Date(task.dueDate.setHours(0, 0))}
            maximumDate={new Date(task.dueDate.setHours(23, 59))}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={new Date(task.dueDate.setHours(task.endTime ? parseInt(task.endTime.split(':')[0]) : 0, task.endTime ? parseInt(task.endTime.split(':')[1]) : 0))}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            minimumDate={new Date(task.dueDate.setHours(0, 0))}
            maximumDate={new Date(task.dueDate.setHours(23, 59))}
          />
        )}

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[styles.checkbox, task.isFullDay && styles.checkboxChecked]}
            onPress={toggleFullDay}
          >
            {task.isFullDay && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Dia todo</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salvar Tarefa</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
} 