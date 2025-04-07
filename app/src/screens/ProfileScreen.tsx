import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../contexts/AppContext';
import { router } from 'expo-router';

interface UserProfile {
  name: string;
  email: string;
}

export default function ProfileScreen() {
  const { isDarkMode } = useApp();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser?.uid) {
          console.log('Usuário não autenticado, redirecionando...');
          router.replace('/src/screens/LoginScreen');
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            name: userData.name || '',
            email: currentUser.email || '',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        Alert.alert('Erro', 'Não foi possível carregar seu perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    fetchUserStats();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log('Usuário não autenticado, redirecionando...');
        router.replace('/src/screens/LoginScreen');
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const totalTasks = querySnapshot.size;
      const completedTasks = querySnapshot.docs.filter(doc => doc.data().completed).length;
      
      setStats({
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const handleSave = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        Alert.alert('Erro', 'Usuário não autenticado');
        router.replace('/src/screens/LoginScreen');
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, editedProfile);

      setProfile(prev => ({ ...prev, ...editedProfile }));
      setIsEditing(false);
      setEditedProfile({});
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar seu perfil');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/src/screens/LoginScreen');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout');
    }
  };

  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: string }) => (
    <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <Text style={[styles.statValue, isDarkMode && styles.darkText]}>{value}</Text>
      <Text style={[styles.statTitle, isDarkMode && styles.darkTextLight]}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
          Carregando...
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
          Perfil
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
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Nome
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                isDarkMode && styles.darkInput
              ]}
              value={editedProfile.name || profile.name}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
              placeholder="Seu nome"
              placeholderTextColor={colors.textLight}
            />
          ) : (
            <Text style={[styles.value, isDarkMode && styles.darkText]}>
              {profile.name || 'Não definido'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Email
          </Text>
          <Text style={[styles.value, isDarkMode && styles.darkText]}>
            {profile.email}
          </Text>
        </View>

        <View style={[styles.statsSection, isDarkMode && styles.darkSection]}>
          <StatCard 
            title="Total de Tarefas" 
            value={stats.totalTasks} 
            icon="list-outline" 
          />
          <StatCard 
            title="Concluídas" 
            value={stats.completedTasks} 
            icon="checkmark-circle-outline" 
          />
          <StatCard 
            title="Pendentes" 
            value={stats.pendingTasks} 
            icon="time-outline" 
          />
        </View>

        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Sobre</Text>
          <TouchableOpacity style={[styles.menuItem, isDarkMode && styles.darkMenuItem]}>
            <Ionicons name="information-circle-outline" size={24} color={isDarkMode ? colors.white : colors.text} />
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Versão do App</Text>
            <Text style={[styles.menuItemValue, isDarkMode && styles.darkTextLight]}>1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, isDarkMode && styles.darkMenuItem]}>
            <Ionicons name="help-circle-outline" size={24} color={isDarkMode ? colors.white : colors.text} />
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Ajuda e Suporte</Text>
            <Ionicons name="chevron-forward" size={24} color={isDarkMode ? colors.white : colors.textLight} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={styles.logoutButtonText}>Sair</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  darkInput: {
    color: colors.white,
    borderColor: colors.darkBorder,
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  darkText: {
    color: colors.white,
  },
  darkTextLight: {
    color: colors.white + '80',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '20',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  logoutButtonText: {
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
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.white,
    marginBottom: 20,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray + '30',
  },
  darkMenuItem: {
    borderBottomColor: colors.white + '30',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  menuItemValue: {
    fontSize: 16,
    color: colors.textLight,
  },
}); 