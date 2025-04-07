import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description: string;
  urgency: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate: Date;
  completed: boolean;
  createdAt: Date;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  userId: string;
}

const urgencyColors = {
  baixa: '#4CAF50',
  media: '#FFC107',
  alta: '#FF9800',
  urgente: '#F44336',
};

export default function AllTasksScreen() {
  const theme = useTheme();
  const { cancelTaskNotification } = useNotifications();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      router.replace('/src/screens/LoginScreen');
      return;
    }

    setLoading(true);

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('userId', '==', auth.currentUser.uid),
        orderBy('dueDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      
      const tasksData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          urgency: data.urgency || 'baixa',
          dueDate: data.dueDate?.toDate() || new Date(),
          completed: data.completed || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          isFullDay: data.isFullDay || false,
          userId: data.userId || '',
        };
      });

      // Ordenar tarefas: primeiro incompletas, depois por urgência, depois por data
      const sortTasks = (a: Task, b: Task) => {
        // Primeiro, separar completas e incompletas
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        // Depois por urgência
        const urgencyOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
        if (a.urgency !== b.urgency) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        
        // Por fim, por data
        return a.dueDate.getTime() - b.dueDate.getTime();
      };

      setTasks(tasksData.sort(sortTasks));
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas tarefas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { completed });
      
      if (completed) {
        await cancelTaskNotification(taskId);
      }

      // Atualiza localmente e reordena
      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, completed } : task
      );
      
      // Reordenar após atualização
      const sortTasks = (a: Task, b: Task) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        const urgencyOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
        if (a.urgency !== b.urgency) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        
        return a.dueDate.getTime() - b.dueDate.getTime();
      };
      
      setTasks(updatedTasks.sort(sortTasks));
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da tarefa');
    }
  };

  const confirmDeleteTask = (taskId: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Deseja realmente excluir esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => deleteTask(taskId)
        }
      ]
    );
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      await cancelTaskNotification(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      Alert.alert('Erro', 'Não foi possível excluir a tarefa');
    }
  };

  const editTask = (taskId: string) => {
    router.push({
      pathname: '/src/screens/EditTaskScreen',
      params: { taskId }
    });
  };

  const viewTaskDetails = (taskId: string) => {
    router.push({
      pathname: '/src/screens/TaskDetailScreen',
      params: { taskId }
    });
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const dateText = format(task.dueDate, "dd/MM", { locale: ptBR });
    const isExpired = new Date() > task.dueDate && !task.completed;
    
    return (
      <View style={[
        styles.taskCard,
        task.completed && styles.completedTaskCard
      ]}>
        {/* Checkbox para concluir/desfazer */}
        <TouchableOpacity
          style={styles.checkboxButton}
          onPress={() => toggleTaskCompletion(task.id, !task.completed)}
        >
          <View style={[
            styles.checkbox,
            task.completed && { backgroundColor: urgencyColors[task.urgency] }
          ]}>
            {task.completed && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
        
        {/* Conteúdo principal - clicável para ver detalhes */}
        <TouchableOpacity 
          style={styles.taskContent}
          onPress={() => viewTaskDetails(task.id)}
          activeOpacity={0.7}
        >
          <View style={styles.taskHeader}>
            <Text 
              style={[
                styles.taskTitle,
                task.completed && styles.completedText,
                isExpired && styles.expiredText
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            <View style={[styles.urgencyDot, {backgroundColor: urgencyColors[task.urgency]}]} />
          </View>
          
          <View style={styles.taskDetails}>
            <Text style={[styles.dateText, task.completed && styles.completedText]}>
              <Ionicons name="calendar-outline" size={10} color={theme.colors.text + '99'} /> {dateText}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Botões de ação */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => editTask(task.id)}
          >
            <Ionicons name="pencil-outline" size={16} color={theme.colors.text + '99'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => confirmDeleteTask(task.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Minhas Tarefas</Text>
      <View style={{width: 40}} />
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="list" size={48} color={theme.colors.text + '70'} />
      <Text style={styles.emptyText}>Nenhuma tarefa encontrada</Text>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push('/add-task')}
      >
        <Text style={styles.addButtonText}>Adicionar nova tarefa</Text>
      </TouchableOpacity>
    </View>
  );

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
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      marginLeft: -100,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    listContainer: {
      padding: 12,
    },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      marginBottom: 8,
      padding: 8,
      borderLeftWidth: 0,
      height: 48,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    completedTaskCard: {
      opacity: 0.7,
      backgroundColor: theme.colors.card + '80',
    },
    checkboxButton: {
      marginRight: 10,
      padding: 2,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.colors.text + '60',
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskContent: {
      flex: 1,
      justifyContent: 'center',
    },
    taskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    taskTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      flex: 1,
    },
    urgencyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 6,
    },
    taskDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    dateText: {
      fontSize: 11,
      color: theme.colors.text + '99',
    },
    completedText: {
      textDecorationLine: 'line-through',
      color: theme.colors.text + '70',
    },
    expiredText: {
      color: '#F44336',
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 6,
      marginLeft: 5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.text + '70',
      marginTop: 12,
      marginBottom: 20,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    addButtonText: {
      color: '#FFF',
      fontWeight: '600',
    }
  });

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor={theme.colors.background} 
        barStyle='dark-content' 
      />
      
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={({ item }) => <TaskCard task={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContainer,
            tasks.length === 0 && { flex: 1 }
          ]}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}