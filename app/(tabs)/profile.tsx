import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Switch, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import { api, ProfileResponse } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/auth';
import * as Notifications from 'expo-notifications';

const PUSH_NOTIFICATIONS_KEY = '@uppi_push_notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    loadProfile();
    checkNotificationPermissions();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    const storedValue = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_KEY);
    setPushEnabled(existingStatus === 'granted' && storedValue === 'true');
  };

  const togglePushNotifications = async (value: boolean) => {
    try {
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setPushEnabled(false);
          Alert.alert(
            'Permission Required',
            'Push notifications were denied. Please enable them in your device settings to receive notifications.'
          );
          return;
        }

        // Get the Expo push token with proper configuration
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID, // Make sure this is set in your environment
        });

        console.log('Obtained push token:', expoPushToken); // Debug log

        // Register the token with our API
        await api.registerPushToken(expoPushToken);
        await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, 'true');
        setPushEnabled(true);
      } else {
        // Remove the token from the API
        await api.removePushToken();
        await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, 'false');
        setPushEnabled(false);
      }
    } catch (error) {
      console.error('Push notification error details:', {
        error,
        platform: Platform.OS,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      Alert.alert(
        'Push Notification Error',
        Platform.select({
          android: 'Failed to setup push notifications. Please check if Google Play Services is installed and up to date.',
          default: 'Failed to toggle push notifications'
        })
      );
      setPushEnabled(!value); // Revert the toggle
    }
  };


  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2625" />
      </View>
    );
  }

  const avatarUrl = `https://eu.ui-avatars.com/api/?background=random&name=${encodeURIComponent(profile.name)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView style={styles.headerContent}>
          <Image 
            source={{ uri: avatarUrl }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </SafeAreaView>
      </View>
      <View style={styles.content}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={pushEnabled}
            onValueChange={togglePushNotifications}
            trackColor={{ false: '#E5E7EB', true: '#DC2625' }}
            thumbColor="#ffffff"
          />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#DC2625',
    paddingBottom: 40,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 120,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  logoutButton: {
    marginTop: 24,
  },
  logoutText: {
    fontSize: 16,
    color: '#DC2625',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 