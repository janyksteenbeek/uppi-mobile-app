import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Animated, SafeAreaView, TouchableOpacity } from 'react-native';
import { api, Monitor } from '@/services/api';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';

function PulsingCircle() {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulsingCircle,
        {
          opacity: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 0.4],
          }),
          transform: [{
            scale: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [1.2, 1.8],
            }),
          }],
        },
      ]}
    />
  );
}

function MonitorItem({ monitor }: { monitor: Monitor }) {
  const router = useRouter();
  const getStatusColor = () => {
    return monitor.status === 'ok' ? '#22C55E' : '#DC2625';
  };

  const getStatusIcon = () => {
    return monitor.status === 'ok' ? 'check-circle' : 'x-circle';
  };

  const getTypeIcon = () => {
    return monitor.type === 'http' ? 'globe' : 'server';
  };

  const getDowntime = () => {
    if (monitor.status === 'fail' && monitor.anomalies.length > 0) {
      const firstAnomaly = monitor.anomalies[0];
      return formatDistanceToNow(new Date(firstAnomaly.started_at), { addSuffix: true });
    }
    return null;
  };

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/monitors/${monitor.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.monitorItem}>
        <View style={styles.iconContainer}>
          {monitor.status === 'fail' && <PulsingCircle />}
          <Feather 
            name={getStatusIcon()} 
            size={24} 
            color={getStatusColor()} 
            style={styles.statusIcon} 
          />
        </View>
        <View style={styles.monitorInfo}>
          <Text style={styles.monitorName}>{monitor.name}</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressText}>
              {monitor.address}
              {monitor.port && <Text style={styles.portText}>:{monitor.port}</Text>}
            </Text>
            <View style={styles.typeBadge}>
              <Feather name={getTypeIcon()} size={12} color="#6B7280" style={styles.typeIcon} />
              <Text style={styles.typeBadgeText}>{monitor.type.toUpperCase()}</Text>
            </View>
          </View>
          {monitor.status === 'fail' && (
            <Text style={styles.downtimeText}>Down since {getDowntime()}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

export default function MonitorsScreen() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMonitors = async () => {
    try {
      const data = await api.getMonitors();
      // Sort monitors: failed first, then alphabetically by name
      const sortedData = [...data].sort((a, b) => {
        if (a.status === b.status) {
          return a.name.localeCompare(b.name);
        }
        return a.status === 'fail' ? -1 : 1;
      });
      setMonitors(sortedData);
    } catch (error) {
      console.error('Failed to fetch monitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMonitors();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchMonitors();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2625" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <Text style={styles.headerTitle}>Monitors</Text>
        </SafeAreaView>
      </View>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={monitors}
        renderItem={({ item }) => <MonitorItem monitor={item} />}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#DC2625"
            colors={["#DC2625"]}
            progressBackgroundColor="#ffffff"
          />
        }
        ItemSeparatorComponent={ListSeparator}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={<View style={styles.listHeader} />}
        ListFooterComponent={<View style={styles.listFooter} />}
      />
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    height: 15,
  },
  listFooter: {
    height: 15,
  },
  monitorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 16,
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    position: 'absolute',
    zIndex: 2,
  },
  pulsingCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC2625',
    zIndex: 1,
  },
  monitorInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  monitorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  portText: {
    color: '#9CA3AF',
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  typeIcon: {
    marginRight: 4,
  },
  typeBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  downtimeText: {
    fontSize: 14,
    color: '#DC2625',
    marginTop: 4,
  },
  list: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    flexGrow: 1,
  },
});
