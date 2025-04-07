import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';
import { router, useLocalSearchParams } from 'expo-router';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  urgency: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate: Date;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  userId: string;
  description?: string;
}

const urgencyColors = {
  baixa: '#F2BDC7', // Rosa claro
  media: '#E88D9D', // Rosa médio
  alta: '#D96281', // Rosa escuro
  urgente: '#C73B5D', // Rosa mais escuro
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
};

export default function TaskDetailScreen() {
  const { isDarkMode } = useApp();
  const params = useLocalSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  useEffect(() => {
    const loadTask = async () => {
      try {
        const taskId = params.taskId as string;
        if (!taskId) {
          Alert.alert('Erro', 'ID da tarefa não encontrado');
          router.back();
          return;
        }

        const taskRef = doc(db, 'tasks', taskId);
        const taskDoc = await getDoc(taskRef);

        if (!taskDoc.exists()) {
          Alert.alert('Erro', 'Tarefa não encontrada');
          router.back();
          return;
        }

        const taskData = taskDoc.data();
        setTask({
          id: taskDoc.id,
          title: taskData.title || '',
          completed: Boolean(taskData.completed),
          urgency: taskData.urgency || 'baixa',
          dueDate: taskData.dueDate?.toDate() || new Date(),
          startTime: taskData.startTime || '',
          endTime: taskData.endTime || '',
          isFullDay: Boolean(taskData.isFullDay),
          userId: taskData.userId || '',
          description: taskData.description || '',
        });
      } catch (error) {
        console.error('Erro ao carregar tarefa:', error);
        Alert.alert('Erro', 'Não foi possível carregar a tarefa');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [params.taskId]);

  const handleSave = async () => {
    if (!task) return;

    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, editedTask);

      setTask(prev => prev ? { ...prev, ...editedTask } : null);
      setIsEditing(false);
      setEditedTask({});
      Alert.alert('Sucesso', 'Tarefa atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a tarefa');
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const taskRef = doc(db, 'tasks', task.id);
              await deleteDoc(taskRef);
              Alert.alert('Sucesso', 'Tarefa excluída com sucesso');
              router.back();
            } catch (error) {
              console.error('Erro ao excluir tarefa:', error);
              Alert.alert('Erro', 'Não foi possível excluir a tarefa');
            }
          },
        },
      ]
    );
  };

  const toggleCompletion = async () => {
    if (!task) return;

    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        completed: !task.completed
      });

      setTask(prev => prev ? { ...prev, completed: !prev.completed } : null);
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da tarefa');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
          Carregando...
        </Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
          Tarefa não encontrada
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Detalhes da Tarefa
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'pencil'}
            size={24}
            color={colors.primary}
            onPress={isEditing ? handleSave : undefined}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={toggleCompletion}
          >
            <Ionicons
              name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={task.completed ? colors.primary : colors.textLight}
            />
          </TouchableOpacity>
          {isEditing ? (
            <TextInput
              style={[
                styles.titleInput,
                isDarkMode && styles.darkInput,
                task.completed && styles.completedTask
              ]}
              value={editedTask.title || task.title}
              onChangeText={(text) => setEditedTask({ ...editedTask, title: text })}
              placeholder="Título da tarefa"
              placeholderTextColor={colors.textLight}
            />
          ) : (
            <Text style={[
              styles.title,
              isDarkMode && styles.darkText,
              task.completed && styles.completedTask
            ]}>
              {task.title}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Urgência
          </Text>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColors[task.urgency] }]}>
            <Text style={styles.urgencyText}>
              {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Data e Hora
          </Text>
          <Text style={[styles.dateText, isDarkMode && styles.darkText]}>
            {formatDate(task.dueDate)}
          </Text>
          <Text style={[styles.timeText, isDarkMode && styles.darkText]}>
            {task.isFullDay ? 'Dia todo' : `${task.startTime} - ${task.endTime}`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Descrição
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.descriptionInput,
                isDarkMode && styles.darkInput
              ]}
              value={editedTask.description || task.description}
              onChangeText={(text) => setEditedTask({ ...editedTask, description: text })}
              placeholder="Descrição da tarefa"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={[styles.description, isDarkMode && styles.darkText]}>
              {task.description || 'Nenhuma descrição'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color={colors.error} />
          <Text style={styles.deleteButtonText}>Excluir Tarefa</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  darkContainer: {
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.white,
  },
  darkHeader: {
    backgroundColor: colors.darkBackground,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  checkbox: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  darkInput: {
    color: colors.white,
    borderBottomColor: colors.darkBorder,
  },
  darkText: {
    color: colors.white,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  urgencyText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 16,
    color: colors.textLight,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  descriptionInput: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '20',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
}); 