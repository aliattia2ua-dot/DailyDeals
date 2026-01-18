const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simpler, safer config
config.resolver.assetExts.push('pdf');
config.resolver.sourceExts = [...config.resolver.sourceExts];

module.exports = config;