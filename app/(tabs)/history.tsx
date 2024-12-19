import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, SafeAreaView } from 'react-native';
import { api, AnomalyWithMonitor, PaginatedResponse } from '@/services/api';
import { FontAwesome } from '@expo/vector-icons';
import { formatDistanceToNow, formatDistanceStrict } from 'date-fns';

function AnomalyItem({ anomaly }: { anomaly: AnomalyWithMonitor }) {
  const getStatusIcon = () => {
    return anomaly.monitor.type === 'http' ? 'globe' : 'server';
  };

  const getDuration = () => {
    if (anomaly.ended_at) {
      return formatDistanceStrict(new Date(anomaly.ended_at), new Date(anomaly.started_at));
    }
    return 'Ongoing';
  };

  const getTimeAgo = () => {
    return formatDistanceToNow(new Date(anomaly.started_at), { addSuffix: true });
  };

  return (
    <View style={styles.anomalyItem}>
      <View style={styles.iconContainer}>
        <FontAwesome 
          name={getStatusIcon()} 
          size={20} 
          color="#4B5563"
          style={styles.statusIcon} 
        />
      </View>
      <View style={styles.anomalyInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.monitorName}>{anomaly.monitor.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: anomaly.monitor.type === 'http' ? '#3B82F6' : '#8B5CF6' }]}>
            <Text style={styles.typeBadgeText}>{anomaly.monitor.type.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.addressText}>
          {anomaly.monitor.address}
          {anomaly.monitor.port && <Text style={styles.portText}>:{anomaly.monitor.port}</Text>}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={styles.timeText}>{getTimeAgo()}</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={[styles.durationText, !anomaly.ended_at && styles.ongoingText]}>
            {getDuration()}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

export default function HistoryScreen() {
  const [anomalies, setAnomalies] = useState<AnomalyWithMonitor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAnomalies = async (pageNumber: number = 1, shouldRefresh: boolean = false) => {
    try {
      const response = await api.getAnomalies(pageNumber);
      setAnomalies(prev => shouldRefresh ? response.data : [...prev, ...response.data]);
      setHasNextPage(!!response.next_page_url);
      setPage(response.current_page);
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnomalies(1, true);
    setRefreshing(false);
  }, []);

  const loadMore = async () => {
    if (hasNextPage && !loadingMore) {
      setLoadingMore(true);
      await fetchAnomalies(page + 1);
    }
  };

  useEffect(() => {
    fetchAnomalies();
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
          <Text style={styles.headerTitle}>Previous anomalies</Text>
        </SafeAreaView>
      </View>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={anomalies}
        renderItem={({ item }) => <AnomalyItem anomaly={item} />}
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator color="#DC2625" style={styles.loadingMore} />
        ) : null}
        ListHeaderComponent={<View style={styles.listHeader} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No incidents found</Text>
          </View>
        }
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
  list: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    height: 15,
  },
  anomalyItem: {
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
  },
  anomalyInfo: {
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
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#4B5563',
  },
  portText: {
    color: '#9CA3AF',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  dotSeparator: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 6,
  },
  durationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  ongoingText: {
    color: '#DC2625',
  },
  loadingMore: {
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
}); 