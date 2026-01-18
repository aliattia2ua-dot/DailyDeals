import React from 'react';
import { View, Text, StyleSheet, I18nManager, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { MAP_CONFIG } from '../../constants/config';
import type { Branch } from '../../types';

interface LeafletMapProps {
  branches: Branch[];
  selectedBranchId?: string;
  height?: number;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  branches,
  selectedBranchId,
  height = 300,
}) => {
  // Generate markers for all branches
  const markers = branches
    .filter(b => b.latitude && b.longitude)
    .map(branch => {
      // For local stores, show the specific store name in popup
      const displayName = branch.storeName
        ? `${branch.storeName} - ${branch.addressAr}`
        : branch.addressAr;

      return {
        lat: branch.latitude!,
        lng: branch.longitude!,
        name: displayName,
        isSelected: branch.id === selectedBranchId,
      };
    });

  // Calculate center from markers or use default
  const center = markers.length > 0
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : { lat: MAP_CONFIG.defaultCenter.latitude, lng: MAP_CONFIG.defaultCenter.longitude };

  // HTML for Leaflet map
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .marker-selected { 
          filter: hue-rotate(120deg);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${center.lat}, ${center.lng}], ${MAP_CONFIG.defaultZoom});
        
        L.tileLayer('${MAP_CONFIG.tileUrl}', {
          attribution: '${MAP_CONFIG.attribution}'
        }).addTo(map);
        
        const markers = ${JSON.stringify(markers)};
        
        markers.forEach(function(marker) {
          const icon = L.icon({
            iconUrl: marker.isSelected 
              ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
              : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });
          
          L.marker([marker.lat, marker.lng], { icon: icon })
            .addTo(map)
            .bindPopup(marker.name);
        });
        
        if (markers.length > 1) {
          const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      </script>
    </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.webPlaceholder}>
          Map view is available on mobile devices
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: leafletHTML }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  webview: {
    flex: 1,
  },
  webPlaceholder: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    padding: spacing.lg,
  },
});

export default LeafletMap;