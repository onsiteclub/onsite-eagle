import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../src/lib/supabase';
import type { Site } from '@onsite/shared';

export default function HomeScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    try {
      const { data } = await supabase
        .from('sites')
        .select('*')
        .order('name');

      if (data) {
        setSites(data);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    } finally {
      setLoading(false);
    }
  }

  // Smart search: matches name, address, city, partial words
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites;

    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/);

    return sites.filter(site => {
      const searchText = `${site.name} ${site.address} ${site.city}`.toLowerCase();
      // Match if all query words are found (partial match)
      return queryWords.every(word => searchText.includes(word));
    });
  }, [sites, searchQuery]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Carregando jobsites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar jobsite (nome, endereço, cidade...)"
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredSites.length} jobsite{filteredSites.length !== 1 ? 's' : ''}
          {searchQuery ? ` encontrado${filteredSites.length !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      {/* Jobsite Cards */}
      <FlatList
        data={filteredSites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Link href={`/site/${item.id}`} asChild>
            <TouchableOpacity style={styles.siteCard}>
              <View style={styles.siteHeader}>
                <Text style={styles.siteName}>{item.name}</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {item.completed_lots || 0}/{item.total_lots || 0}
                  </Text>
                </View>
              </View>

              <Text style={styles.siteAddress}>{item.address}</Text>
              <Text style={styles.siteCity}>{item.city}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${item.total_lots ? (item.completed_lots / item.total_lots) * 100 : 0}%`
                    }
                  ]}
                />
              </View>

              <View style={styles.siteFooter}>
                <Text style={styles.siteDates}>
                  {item.start_date
                    ? `Início: ${new Date(item.start_date).toLocaleDateString('pt-BR')}`
                    : 'Sem data de início'
                  }
                </Text>
                {item.expected_end_date && (
                  <Text style={styles.siteDates}>
                    Previsão: {new Date(item.expected_end_date).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nenhum jobsite encontrado' : 'Nenhum jobsite cadastrado'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Tente buscar com outros termos'
                : 'Adicione um novo jobsite para começar'}
            </Text>
          </View>
        }
      />

      {/* FAB to add new jobsite */}
      <Link href="/site/new" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  clearButton: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    color: '#6B7280',
    fontSize: 13,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  siteCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  progressBadge: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  siteAddress: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 2,
  },
  siteCity: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  siteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  siteDates: {
    fontSize: 12,
    color: '#6B7280',
  },
  empty: {
    alignItems: 'center',
    padding: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});
