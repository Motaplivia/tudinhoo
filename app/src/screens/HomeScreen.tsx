import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { auth, db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, Timestamp, DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../contexts/AppContext';
import { router, useNavigation } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  urgency: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate: Timestamp;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  userId: string;
  description?: string;
}

const urgencyColors = {
  baixa: '#4CAF50', // Verde
  media: '#FFC107', // Amarelo
  alta: '#FF9800', // Laranja
  urgente: '#F44336', // Vermelho
};

const formatDate = (date: Date | Timestamp | undefined) => {
  if (!date) return 'Data não definida';
  
  const dateObj = date instanceof Timestamp ? date.toDate() : date;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Remove a hora para comparar apenas as datas
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const taskDate = new Date(dateObj);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) {
    return 'Hoje';
  } else if (taskDate.getTime() === tomorrow.getTime()) {
    return 'Amanhã';
  } else {
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useApp();
  const theme = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser?.uid) {
          console.log('Usuário não autenticado');
          return;
        }

        console.log('Carregando dados iniciais para:', currentUser.uid);
        await Promise.all([
          fetchUserProfile(currentUser),
          fetchTasks(currentUser)
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();
  }, []);

  // Monitorar mudanças de autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user?.uid) {
          console.log('Usuário deslogado, redirecionando...');
          router.replace('/src/screens/LoginScreen');
          return;
        }

        console.log('Estado de autenticação mudou, recarregando dados...');
        await Promise.all([
          fetchUserProfile(user),
          fetchTasks(user)
        ]);
      } catch (error) {
        console.error('Erro na mudança de autenticação:', error);
        router.replace('/src/screens/LoginScreen');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Atualizar ao focar na tela
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser?.uid) {
          console.log('Usuário não encontrado ao focar');
          router.replace('/src/screens/LoginScreen');
          return;
        }

        console.log('Atualizando dados ao focar...');
        await Promise.all([
          fetchUserProfile(currentUser),
          fetchTasks(currentUser)
        ]);
      } catch (error) {
        console.error('Erro ao atualizar na focus:', error);
      }
    });

    return unsubscribe;
  }, [navigation]);

  const fetchUserProfile = async (user: any) => {
    if (!user?.uid) {
      console.log('fetchUserProfile: uid não encontrado');
      return;
    }

    try {
      console.log('Buscando perfil para:', user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.name || '');
        setPhotoUrl(userData.photoUrl || null);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const fetchTasks = async (user: any) => {
    if (!user?.uid) {
      console.log('fetchTasks: uid não encontrado');
      return;
    }

    setLoading(true);

    try {
      console.log('Iniciando busca de tarefas para:', user.uid);
      const tasksRef = collection(db, 'tasks');
      
      // Garantir que temos um uid válido antes de fazer a query
      const uid = user.uid;
      if (!uid || typeof uid !== 'string') {
        console.error('UID inválido:', uid);
        throw new Error('UID inválido');
      }

      // Criar a query com o userId e ordenação
      const q = query(
        tasksRef,
        where('userId', '==', uid),
        orderBy('dueDate', 'asc')
      );
      
      console.log('Executando query com uid:', uid);
      const querySnapshot = await getDocs(q);
      console.log('Tarefas encontradas:', querySnapshot.size);

      const tasksData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          completed: Boolean(data.completed),
          urgency: data.urgency || 'baixa',
          dueDate: data.dueDate || Timestamp.now(),
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          isFullDay: Boolean(data.isFullDay),
          userId: uid,
          description: data.description || '',
        } as Task;
      });

      console.log('Dados das tarefas:', tasksData);

      // Ordenar por urgência e data
      const sortTasks = (a: Task, b: Task) => {
        const urgencyOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
        
        // Primeiro ordenar por urgência
        if (a.urgency !== b.urgency) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        
        // Depois ordenar por data
        const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date();
        const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date();
        return dateA.getTime() - dateB.getTime();
      };

      const sortedTasks = tasksData.sort(sortTasks);
      console.log('Tarefas ordenadas:', sortedTasks.length);
      setTasks(sortedTasks);

      // Atualizar estatísticas
      const total = sortedTasks.length;
      const completed = sortedTasks.filter(task => task.completed).length;
      setStats({
        total,
        completed,
        pending: total - completed
      });

      // Filtrar tarefas do dia
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTasksList = sortedTasks.filter(task => {
        if (!(task.dueDate instanceof Timestamp)) return false;
        const taskDate = task.dueDate.toDate();
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });

      const upcomingTasksList = sortedTasks.filter(task => {
        if (!(task.dueDate instanceof Timestamp)) return false;
        const taskDate = task.dueDate.toDate();
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() > today.getTime();
      });

      console.log('Tarefas de hoje:', todayTasksList.length);
      console.log('Tarefas futuras:', upcomingTasksList.length);

      setTodayTasks(todayTasksList);
      setUpcomingTasks(upcomingTasksList);
    } catch (error) {
      console.error('Erro detalhado ao buscar tarefas:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas tarefas');
    } finally {
      setLoading(false);
    }
  };

  const TaskItem = ({ task }: { task: Task }) => (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => router.push({
        pathname: '/task-detail',
        params: { taskId: task.id }
      })}
    >
      <View style={[styles.taskLeftBorder, { backgroundColor: urgencyColors[task.urgency] }]} />
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDate}>{formatDate(task.dueDate)}</Text>
      </View>
    </TouchableOpacity>
  );

  const Menu = () => (
    <Modal
      visible={isMenuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsMenuVisible(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setIsMenuVisible(false)}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setIsMenuVisible(false);
              router.push('/src/screens/ProfileScreen');
            }}
          >
            <Ionicons name="person-outline" size={24} color={colors.text} />
            <Text style={styles.menuItemText}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: string }) => (
    <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <Text style={[styles.statValue, isDarkMode && styles.darkText]}>{value}</Text>
      <Text style={[styles.statTitle, isDarkMode && styles.darkTextLight]}>{title}</Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    darkContainer: {
      backgroundColor: colors.darkBackground,
    },
    header: {
      padding: 20,
      paddingTop: 60,
      backgroundColor: '#F2BDC7', // Rosa claro
    },
    darkHeader: {
      backgroundColor: '#F2BDC7', // Mantendo o rosa claro mesmo no modo escuro
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    menuButton: {
      padding: 8,
    },
    userInfo: {
      flex: 1,
      marginLeft: 16,
    },
    greeting: {
      fontSize: 14,
      color: '#000000', // Texto preto para melhor contraste
      marginBottom: 2,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#000000', // Texto preto para melhor contraste
    },
    statsSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
      backgroundColor: colors.white,
    },
    darkSection: {
      backgroundColor: colors.darkBackground,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    darkStatCard: {
      backgroundColor: colors.darkBackground,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      marginTop: 8,
    },
    statTitle: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 4,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    viewAllButton: {
      padding: 8,
    },
    viewAllText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: colors.white,
      borderRadius: 16,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textLight,
      marginTop: 16,
      textAlign: 'center',
    },
    addTaskButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      marginTop: 16,
    },
    addTaskText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: 'bold',
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    menuItemText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: colors.white,
      fontSize: 20,
      fontWeight: 'bold',
    },
    taskItem: {
      backgroundColor: colors.white,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 12,
      elevation: 2,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    darkTaskItem: {
      backgroundColor: colors.darkBackground,
    },
    taskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    taskTitleContainer: {
      flex: 1,
      marginRight: 8,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    darkText: {
      color: colors.white,
    },
    darkTextLight: {
      color: colors.white + '80',
    },
    urgencyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    urgencyText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    taskDate: {
      fontSize: 14,
      color: colors.textLight,
    },
    taskDetails: {
      marginTop: 8,
    },
    taskTime: {
      fontSize: 14,
      color: colors.textLight,
      marginBottom: 4,
    },
    taskDescription: {
      fontSize: 14,
      color: colors.textLight,
    },
    taskLeftBorder: {
      width: 4,
      height: '100%',
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
    },
    taskContent: {
      flex: 1,
      marginLeft: 16,
    },
  });

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setIsMenuVisible(true)}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.userName}>{userName || 'Usuário'}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statsSection, isDarkMode && styles.darkSection]}>
        <StatCard 
          title="Total" 
          value={stats.total} 
          icon="list-outline" 
        />
        <StatCard 
          title="Concluídas" 
          value={stats.completed} 
          icon="checkmark-circle-outline" 
        />
        <StatCard 
          title="Pendentes" 
          value={stats.pending} 
          icon="time-outline" 
        />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tarefas de Hoje</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('../screens/AllTasksScreen')}
            >
              <Text style={styles.viewAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {todayTasks.length > 0 ? (
            todayTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Nenhuma tarefa para hoje</Text>
              <TouchableOpacity 
                style={styles.addTaskButton}
                onPress={() => router.push('/src/screens/NewTaskScreen')}
              >
                <Text style={styles.addTaskText}>Adicionar Tarefa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximas Tarefas</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('../screens/AllTasksScreen')}
            >
              <Text style={styles.viewAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {upcomingTasks.length > 0 ? (
            upcomingTasks.slice(0, 3).map(task => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>Nenhuma tarefa futura</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/src/screens/NewTaskScreen')}
      >
        <Ionicons name="add" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Menu />
    </View>
  );
} 