// src/hooks/useAuthStateListener.ts
import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setUser, clearUser } from '../store/slices/authSlice';
import { onAuthChange } from '../services/authService';

export const useAuthStateListener = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log('👂 Setting up auth state listener...');

    const unsubscribe = onAuthChange((userProfile) => {
      console.log('🔄 Auth state changed:', userProfile?.email || 'signed out');
      if (userProfile) {
        dispatch(setUser(userProfile));
      } else {
        dispatch(clearUser());
      }
    });

    return () => {
      console.log('🛑 Cleaning up auth state listener');
      unsubscribe();
    };
  }, [dispatch]);
};