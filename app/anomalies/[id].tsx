import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { api } from '@/services/api';
import { format } from 'date-fns';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface Alert {
  id: string;
  name: string;
  type: string;
  destination: string;
  is_enabled: boolean;
}

interface Trigger {
  id: string;
  type: string;
  channels_notified: string[];
  metadata: {
    monitor_name: string;
    monitor_target: string;
  };
  triggered_at: string;
  alert: Alert;
}

interface Monitor {
  id: string;
  type: string;
  address: string;
  port: number | null;
  name: string;
  interval: number;
  consecutive_threshold: number;
  status: string;
}

interface Anomaly {
  id: string;
  monitor_id: string;
  started_at: string;
  ended_at: string | null;
  monitor: Monitor;
  triggers: Trigger[];
}

export default function AnomalyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnomaly = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAnomalyDetail(id);
      setAnomaly(data);
    } catch (error) {
      console.error('Failed to fetch anomaly:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnomaly();
    setRefreshing(false);
  }, [loadAnomaly]);

  useEffect(() => {
    loadAnomaly();
  }, [loadAnomaly]);

  if (loading || !anomaly) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2625" />
      </SafeAreaView>
    );
  }

  const duration = anomaly.ended_at 
    ? format(new Date(anomaly.ended_at), 'MMM d, HH:mm') 
    : 'Ongoing';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{
          headerStyle: { backgroundColor: '#DC2625' },
          headerTintColor: '#ffffff',
          headerTitle: 'Anomaly Details',
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome name="chevron-left" size={16} color="#ffffff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      <View style={styles.mainContainer}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { 
                backgroundColor: anomaly.ended_at ? '#4ADE80' : '#FACC15'
              }]} />
              <Text style={[styles.statusText, { 
                color: anomaly.ended_at ? '#4ADE80' : '#FACC15'
              }]}>
                {anomaly.ended_at ? 'Resolved' : 'Active'}
              </Text>
            </View>
          </View>
          <Text style={styles.monitorName}>{anomaly.monitor.name}</Text>
          <Text style={styles.address}>{anomaly.monitor.address}{anomaly.monitor.port ? `:${anomaly.monitor.port}` : ''}</Text>
        </View>

        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2625" />
          }
        >
          <View style={styles.content}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Started</Text>
                <Text style={styles.statValue}>{format(new Date(anomaly.started_at), 'MMM d, HH:mm')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{duration}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Alert History</Text>
            {anomaly.triggers.map((trigger) => (
              <View key={trigger.id} style={styles.triggerItem}>
                <View style={styles.triggerHeader}>
                  <View style={styles.triggerType}>
                    <FontAwesome 
                      name={trigger.type === 'down' ? 'arrow-down' : 'arrow-up'} 
                      size={12} 
                      color={trigger.type === 'down' ? '#DC2625' : '#22C55E'} 
                    />
                    <Text style={[styles.triggerTypeText, {
                      color: trigger.type === 'down' ? '#DC2625' : '#22C55E'
                    }]}>
                      {trigger.type === 'down' ? 'Down' : 'Up'}
                    </Text>
                  </View>
                  <Text style={styles.triggerTime}>
                    {format(new Date(trigger.triggered_at), 'MMM d, HH:mm')}
                  </Text>
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertLabel}>Notified via:</Text>
                  {trigger.channels_notified.map((channel) => (
                    <View key={channel} style={styles.channelBadge}>
                      <Text style={styles.channelText}>{channel}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.alertDestination}>
                  {trigger.alert.destination}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DC2625',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#DC2625',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#DC2625',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  monitorName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  address: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  triggerItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  triggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  triggerType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerTypeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  triggerTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  alertLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  channelBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  channelText: {
    fontSize: 12,
    color: '#374151',
    textTransform: 'capitalize',
  },
  alertDestination: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  backText: {
    color: '#ffffff',
    marginLeft: 4,
    fontSize: 16,
  },
}); 