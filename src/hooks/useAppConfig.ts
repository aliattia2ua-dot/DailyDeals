// src/hooks/useAppConfig.ts
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setConfig, setLoading, setError } from '../store/slices/appConfigSlice';
import { subscribeToAppConfig, checkVersionUpdate } from '../services/appConfigService';
import { APP_CONFIG } from '../constants/config';

export const useAppConfig = () => {
  const dispatch = useAppDispatch();
  const config = useAppSelector((state) => state.appConfig.config);
  const loading = useAppSelector((state) => state.appConfig.loading);
  
  const [updateInfo, setUpdateInfo] = useState({
    needsUpdate: false,
    forceUpdate: false,
    message: { ar: '', en: '' },
  });

  useEffect(() => {
    console.log('🔧 [useAppConfig] Setting up real-time config listener');

    // Subscribe to real-time config changes
    const unsubscribe = subscribeToAppConfig(
      (newConfig) => {
        console.log('📥 [useAppConfig] Config updated:', newConfig);
        dispatch(setConfig(newConfig));

        // Check version after config loads
        const versionCheck = checkVersionUpdate(APP_CONFIG.version, newConfig);
        setUpdateInfo(versionCheck);

        if (versionCheck.needsUpdate) {
          console.log(
            versionCheck.forceUpdate
              ? '🚨 [useAppConfig] FORCE UPDATE REQUIRED'
              : '⚠️ [useAppConfig] Update available'
          );
        }
      },
      (error) => {
        console.error('❌ [useAppConfig] Error:', error);
        dispatch(setError(error.message));
      }
    );

    // Cleanup
    return () => {
      console.log('🧹 [useAppConfig] Cleaning up listener');
      unsubscribe();
    };
  }, [dispatch]);

  return {
    config,
    loading,
    updateInfo,
  };
};
