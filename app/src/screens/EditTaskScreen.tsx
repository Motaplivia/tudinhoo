import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../contexts/NotificationContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const urgencyOptions = [
  { value: 'baixa', label: 'Baixa', color: '#4CAF50' },
  { value: 'media', label: 'Média', color: '#FFC107' },
  { value: 'alta', label: 'Alta', color: '#FF9800' },
  { value: 'urgente', label: 'Urgente', color: '#F44336' },
];

export default function EditTaskScreen() {
  const theme = useTheme();
  const { taskId } = useLocalSearchParams();
  const { scheduleTaskNotification, cancelTaskNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('baixa');
  const [dueDate, setDueDate] = useState(new Date());
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [completed, setCompleted] = useState(false);
  
  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Fetch task data
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        Alert.alert('Erro', 'ID da tarefa não informado');
        router.back();
        return;
      }

      try {
        const taskRef = doc(db, 'tasks', taskId as string);
        const taskSnap = await getDoc(taskRef);

        if (!taskSnap.exists()) {
          Alert.alert('Erro', 'Tarefa não encontrada');
          router.back();
          return;
        }

        const taskData = taskSnap.data();
        setTitle(taskData.title || '');
        setDescription(taskData.description || '');
        setUrgency(taskData.urgency || 'baixa');
        setDueDate(taskData.dueDate?.toDate() || new Date());
        setIsFullDay(taskData.isFullDay !== undefined ? taskData.isFullDay : true);
        setStartTime(taskData.startTime || '');
        setEndTime(taskData.endTime || '');
        setCompleted(taskData.completed || false);
      } catch (error) {
        console.error('Erro ao carregar tarefa:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados da tarefa');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título da tarefa é obrigatório');
      return;
    }

    if (!isFullDay && (!startTime || !endTime)) {
      Alert.alert('Erro', 'Defina os horários de início e término');
      return;
    }

    setSaving(true);

    try {
      const taskRef = doc(db, 'tasks', taskId as string);
      
      // Prepare task data
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        urgency,
        dueDate,
        isFullDay,
        startTime: isFullDay ? '' : startTime,
        endTime: isFullDay ? '' : endTime,
        completed,
        updatedAt: new Date(),
      };

      await updateDoc(taskRef, taskData);
      
      // Update notification
      await cancelTaskNotification(taskId as string);
      if (!completed) {
        await scheduleTaskNotification(title, dueDate);
      }

      Alert.alert('Sucesso', 'Tarefa atualizada com sucesso', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(false);
    setDueDate(currentDate);
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    const currentTime = selectedTime || new Date();
    setShowStartTimePicker(false);
    if (event.type === 'set') {
      if (event.nativeEvent.timestamp === 0) {
        setStartTime(format(currentTime, 'HH:mm'));
      } else {
        setEndTime(format(currentTime, 'HH:mm'));
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    safeArea: {
      flex: 1,
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

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar backgroundColor={theme.colors.background} barStyle='dark-content' />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar backgroundColor={theme.colors.background} barStyle='dark-content' />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Tarefa</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.safeArea} contentContainerStyle={styles.scrollContent}>
        {/* Título */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título da tarefa"
            placeholderTextColor={theme.colors.text + '50'}
          />
        </View>
        
        {/* Descrição */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição da tarefa"
            placeholderTextColor={theme.colors.text + '50'}
            multiline
            numberOfLines={4}
          />
        </View>
        
        {/* Urgência */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Urgência</Text>
          <View style={styles.urgencyOptions}>
            {urgencyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.urgencyOption,
                  { 
                    borderColor: option.color,
                    backgroundColor: urgency === option.value ? option.color + '20' : 'transparent' 
                  }
                ]}
                onPress={() => setUrgency(option.value)}
              >
                <Text 
                  style={[
                    styles.urgencyOptionText,
                    { color: option.color }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Data */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Data</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
            <Ionicons name="calendar" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
        
        {/* Dia todo / Horários */}
        <View style={styles.formGroup}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setIsFullDay(!isFullDay)}
          >
            <View style={[
              styles.checkbox,
              isFullDay && styles.checkboxChecked
            ]}>
              {isFullDay && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Dia todo</Text>
          </TouchableOpacity>
          
          {!isFullDay && (
            <View style={[styles.timePickersContainer, { marginTop: 12 }]}>
              <View style={styles.timePicker}>
                <Text style={styles.formLabel}>Horário inicial</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={styles.dateText}>{startTime || '00:00'}</Text>
                  <Ionicons name="time-outline" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                
                {showStartTimePicker && (
                  <DateTimePicker
                    value={startTime ? new Date(`2000/01/01 ${startTime}`) : new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>
              
              <View style={styles.timePicker}>
                <Text style={styles.formLabel}>Horário final</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={styles.dateText}>{endTime || '00:00'}</Text>
                  <Ionicons name="time-outline" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                
                {showEndTimePicker && (
                  <DateTimePicker
                    value={endTime ? new Date(`2000/01/01 ${endTime}`) : new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>
            </View>
          )}
        </View>
        
        {/* Status */}
        <View style={styles.formGroup}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setCompleted(!completed)}
          >
            <View style={[
              styles.checkbox,
              completed && styles.checkboxChecked
            ]}>
              {completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Marcar como concluída</Text>
          </TouchableOpacity>
        </View>
        
        {/* Botão Salvar */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}