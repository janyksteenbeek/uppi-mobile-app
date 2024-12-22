import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Switch, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
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
    // set or get device id from async storage
    const getOrSetDeviceId = async () => {
      try {
        let deviceId = await AsyncStorage.getItem('@uppi_device_id');
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
          await AsyncStorage.setItem('@uppi_device_id', deviceId);
        }
      } catch (error) {
        console.error('Failed to get/set device ID:', error);
      }
    };

    getOrSetDeviceId();
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

        // Get the Expo push token
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();

        // Register the token with our API
        await api.registerPushToken(expoPushToken);
        await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, 'true');
        setPushEnabled(true);

        // Send a test notification
        await sendTestNotification();
      } else {
        // Remove the token from the API
        await api.removePushToken();
        await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, 'false');
        setPushEnabled(false);
      }
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      Alert.alert('Error', 'Failed to toggle push notifications');
      setPushEnabled(!value); // Revert the toggle
    }
  };

  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Push notifications are working! 🎉',
      },
      trigger: null, // Send immediately
    });
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