import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Monitor, api } from '@/services/api';
import { format } from 'date-fns';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMonitor = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMonitorDetail(id);
      setMonitor(data);
    } catch (error) {
      console.error('Failed to fetch monitor:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMonitor();
    setRefreshing(false);
  }, [loadMonitor]);

  useEffect(() => {
    loadMonitor();
  }, [loadMonitor]);

  if (loading || !monitor) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2625" />
      </SafeAreaView>
    );
  }

  const responseTimes = monitor.checks
    .slice()
    .reverse()
    .map(check => ({
      time: format(new Date(check.checked_at), 'HH:mm'),
      value: check.response_time || 0
    }));

  const chartData = {
    labels: responseTimes.map(rt => rt.time),
    datasets: [{
      data: responseTimes.map(rt => rt.value)
    }]
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{
          headerStyle: { backgroundColor: '#DC2625' },
          headerTintColor: '#ffffff',
          headerTitle: monitor.name,
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
            <View style={[styles.statusBadge, { 
              backgroundColor: monitor.status === 'ok' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : 'rgba(255, 255, 255, 0.2)',
            }]}>
              <View style={[styles.statusDot, { 
                backgroundColor: monitor.status === 'ok' 
                  ? '#4ADE80' 
                  : '#FACC15'
              }]} />
              <Text style={[styles.statusText, { 
                color: monitor.status === 'ok' 
                  ? '#4ADE80' 
                  : '#FACC15'
              }]}>
                {monitor.status === 'ok' ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <Text style={styles.address}>{monitor.address}{monitor.port ? `:${monitor.port}` : ''}</Text>
          <Text style={styles.lastCheck}>Last check: {format(new Date(monitor.checks[0].checked_at), 'MMM d, HH:mm')}</Text>
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
                <Text style={styles.statLabel}>Type</Text>
                <Text style={styles.statValue}>{monitor.type.toUpperCase()}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Interval</Text>
                <Text style={styles.statValue}>{monitor.interval}m</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Threshold</Text>
                <Text style={styles.statValue}>{monitor.consecutive_threshold}</Text>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Response Time (ms)</Text>
              <LineChart
                data={chartData}
                width={Dimensions.get('window').width - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(220, 38, 37, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>

            <Text style={styles.sectionTitle}>Recent Checks</Text>
            {monitor.checks.map((check, index) => (
              <View 
                key={check.id} 
                style={[
                  styles.checkItem,
                  index === monitor.checks.length - 1 && { marginBottom: 0 }
                ]}
              >
                <View style={styles.checkHeader}>
                  <View style={[styles.checkStatus, { backgroundColor: check.status === 'ok' ? '#22C55E' : '#DC2625' }]} />
                  <Text style={styles.checkTime}>
                    {format(new Date(check.checked_at), 'MMM d, HH:mm')}
                  </Text>
                  {check.response_time && (
                    <Text style={styles.responseTime}>{check.response_time}ms</Text>
                  )}
                </View>
                <Text style={styles.checkOutput}>{check.output}</Text>
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
  address: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  lastCheck: {
    fontSize: 13,
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
  chartContainer: {
    marginBottom: 24,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  checkItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  checkTime: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  responseTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkOutput: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 14,
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