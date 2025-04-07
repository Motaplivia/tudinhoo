import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../hooks/useTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode, logout } = useApp();
  const { isNotificationsEnabled, toggleNotifications } = useNotifications();
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: '700' as const,
      color: theme.colors.text,
      marginLeft: theme.spacing.md,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: '700' as const,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    optionText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '400' as const,
      color: theme.colors.text,
      flex: 1,
    },
    icon: {
      marginRight: theme.spacing.md,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.xl,
    },
    logoutButtonText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600' as const,
      color: '#FFFFFF',
      marginLeft: theme.spacing.sm,
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/src/screens/LoginScreen');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aparência</Text>
          <View style={styles.option}>
            <Ionicons name="moon-outline" size={24} color={theme.colors.text} style={styles.icon} />
            <Text style={styles.optionText}>Modo Escuro</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isDarkMode ? theme.colors.secondary : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações</Text>
          <View style={styles.option}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} style={styles.icon} />
            <Text style={styles.optionText}>Lembretes de Tarefas</Text>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isNotificationsEnabled ? theme.colors.secondary : '#FFFFFF'}
            />
          </View>
          <TouchableOpacity style={styles.option}>
            <Ionicons name="time-outline" size={24} color={theme.colors.text} style={styles.icon} />
            <Text style={styles.optionText}>Configurar Horário de Lembretes</Text>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados</Text>
          <TouchableOpacity style={styles.option}>
            <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.text} style={styles.icon} />
            <Text style={styles.optionText}>Backup de Dados</Text>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidade</Text>
          <TouchableOpacity style={styles.option}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.text} style={styles.icon} />
            <Text style={styles.optionText}>Política de Privacidade</Text>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
} 