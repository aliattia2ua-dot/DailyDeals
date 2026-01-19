// src/store/slices/authSlice.ts - FIXED WITH PROPER LOCATION RESTORATION
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { onAuthStateChanged } from 'firebase/auth';
import type { AuthState, UserProfile } from '../../types';
import {
  signInWithGoogleToken,
  signOut as authSignOut,
  getUserProfile,
} from '../../services/authService';
import { getAllUserData, syncAllUserData } from '../../services/userDataService';
import { hydrateFavorites } from './favoritesSlice';
import { hydrateBasket } from './basketSlice';
import { hydrateLocation, resetFirestoreLocationFlag } from './settingsSlice';
import { getAuthInstance } from '../../config/firebase';
import type { RootState } from '../index';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
  error:  null,
};

interface GoogleAuthTokens {
  idToken: string | null;
  accessToken: string | null;
}

/**
 * Check auth state on app start - FIXED WITH PROPER LOCATION RESTORATION
 */
export const checkAuthState = createAsyncThunk(
  'auth/checkAuthState',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔍 [authSlice] Checking authentication state...');
      const auth = getAuthInstance();

      return new Promise<UserProfile | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          unsubscribe();

          if (firebaseUser) {
            console.log('✅ [authSlice] User already logged in:', firebaseUser.email);

            try {
              const userProfile = await getUserProfile(firebaseUser.uid);

              if (! userProfile) {
                console.warn('⚠️ [authSlice] User profile not found');
                resolve(null);
                return;
              }

              // Load user data (favorites, basket)
              try {
                console.log('🔥 [authSlice] Loading user data from Firestore...');
                const { favorites, basket } = await getAllUserData(userProfile.uid);

                if (favorites) {
                  console.log('📦 [authSlice] Restoring favorites:', favorites. subcategoryIds. length, 'subcategories');
                  dispatch(hydrateFavorites(favorites));
                }

                if (basket && basket.length > 0) {
                  console. log('🛒 [authSlice] Restoring basket:', basket.length, 'items');
                  const total = basket.reduce((sum, item) => {
                    if (item.type === 'offer' && item.offer) {
                      return sum + (item.offer.offerPrice * item.quantity);
                    }
                    return sum;
                  }, 0);
                  dispatch(hydrateBasket({ items: basket, total }));
                }

                // FIXED: Always restore location from Firestore for logged-in users
                // This ensures Firestore data takes priority over local storage
                if (userProfile.location && userProfile.location. governorate) {
                  console.log('📍 [authSlice] Restoring location from Firestore:', userProfile.location);
                  dispatch(hydrateLocation({
                    governorate: userProfile.location.governorate,
                    city: userProfile.location.city || null,
                  }));
                } else {
                  console.log('ℹ️ [authSlice] No saved location found in user profile, using hydrateLocation with null');
                  // Still dispatch to set the firestoreLocationLoaded flag
                  dispatch(hydrateLocation({
                    governorate: null,
                    city: null,
                  }));
                }

                console.log('✅ [authSlice] User data restored successfully');
              } catch (dataError) {
                console.warn('⚠️ [authSlice] Could not load user data:', dataError);
              }

              resolve(userProfile);
            } catch (error) {
              console. error('❌ [authSlice] Error getting user profile:', error);
              resolve(null);
            }
          } else {
            console.log('ℹ️ [authSlice] No user logged in');
            resolve(null);
          }
        });
      });
    } catch (error:  any) {
      console.error('❌ [authSlice] Error checking auth state:', error);
      return rejectWithValue(error.message || 'Failed to check auth state');
    }
  }
);

/**
 * Sign in with Google - FIXED WITH PROPER LOCATION RESTORATION
 */
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (tokens:  GoogleAuthTokens, { dispatch, rejectWithValue }) => {
    try {
      const { idToken, accessToken } = tokens;

      console.log('=== AUTH SLICE DEBUG ===');
      console.log('Received idToken:', idToken ?  'present' : 'null');
      console.log('Received accessToken:', accessToken ?  'present' :  'null');

      const userProfile = await signInWithGoogleToken(idToken, accessToken);

      if (!userProfile) {
        return rejectWithValue('Sign-in cancelled or failed');
      }

      console.log('✅ [authSlice] User profile obtained:', userProfile.email);

      // Load user data from Firestore
      try {
        console.log('🔥 [authSlice] Loading user data from Firestore.. .');
        const { favorites, basket } = await getAllUserData(userProfile.uid);

        console.log('📊 [authSlice] Loaded data:', {
          favorites: favorites ?  'yes' : 'no',
          basketItems: basket. length,
        });

        if (favorites) {
          console.log('🔄 [authSlice] Hydrating favorites:', favorites);
          dispatch(hydrateFavorites(favorites));
        }

        if (basket && basket.length > 0) {
          console.log('🔄 [authSlice] Hydrating basket:', basket.length, 'items');
          const total = basket.reduce((sum, item) => {
            if (item.type === 'offer' && item. offer) {
              return sum + (item.offer.offerPrice * item.quantity);
            }
            return sum;
          }, 0);

          dispatch(hydrateBasket({ items: basket, total }));
          console.log('✅ [authSlice] Basket hydrated with total:', total);
        } else {
          console.log('ℹ️ [authSlice] No basket items to restore');
        }

        // FIXED:  Always restore location from Firestore
        // This happens AFTER any local storage hydration, so it takes priority
        if (userProfile.location && userProfile.location.governorate) {
          console.log('📍 [authSlice] Restoring location from Firestore:', userProfile.location);
          dispatch(hydrateLocation({
            governorate: userProfile. location.governorate,
            city: userProfile.location.city || null,
          }));
        } else {
          console.log('ℹ️ [authSlice] No saved location in profile, setting flag anyway');
          dispatch(hydrateLocation({
            governorate: null,
            city:  null,
          }));
        }
      } catch (dataError:  any) {
        console.error('⚠️ [authSlice] Could not load user data:', dataError);
      }

      return userProfile;
    } catch (error: any) {
      console.error('❌ [authSlice] Auth slice error:', error);
      return rejectWithValue(error.message || 'Failed to sign in');
    }
  }
);

/**
 * Sign out with data sync
 */
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      console. log('🔵 [authSlice] Starting sign out.. .');

      const state = getState() as RootState;
      const { user } = state. auth;

      if (user) {
        try {
          console. log('💾 [authSlice] Syncing user data to Firestore before sign out...');
          await syncAllUserData(
            user.uid,
            state.favorites,
            state.basket. items
          );
          console.log('✅ [authSlice] User data synced');
        } catch (syncError) {
          console.warn('⚠️ [authSlice] Failed to sync data before sign out:', syncError);
        }
      }

      await authSignOut();

      // Reset the Firestore location flag so next login can properly restore
      dispatch(resetFirestoreLocationFlag());

      console.log('✅ [authSlice] Firebase sign out complete');
    } catch (error:  any) {
      console.error('❌ [authSlice] Sign out error:', error);
      return rejectWithValue(error.message || 'Failed to sign out');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action. payload;
      state.isAuthenticated = true;
      state.isAdmin = action.payload.isAdmin;
      state.loading = false;
      state.error = null;
    },
    clearUser: (state) => {
      console.log('🗑️ [authSlice] Clearing user state');
      state.user = null;
      state.isAuthenticated = false;
      state.isAdmin = false;
      state.loading = false;
      state. error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action. payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth state
      .addCase(checkAuthState.pending, (state) => {
        state.loading = true;
        console.log('⏳ [authSlice] Checking auth state...');
      })
      .addCase(checkAuthState.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state. user = action.payload;
          state. isAuthenticated = true;
          state. isAdmin = action. payload.isAdmin;
          console.log('✅ [authSlice] Auth state restored:', action.payload. email);
        } else {
          state.user = null;
          state.isAuthenticated = false;
          state.isAdmin = false;
          console.log('ℹ️ [authSlice] No authenticated user found');
        }
      })
      .addCase(checkAuthState.rejected, (state, action) => {
        state. loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
        console.error('❌ [authSlice] Failed to check auth state:', action.payload);
      })
      // Sign in with Google
      .addCase(signInWithGoogle.pending, (state) => {
        state. loading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action. payload;
        state.isAuthenticated = true;
        state.isAdmin = action.payload.isAdmin;
        state.error = null;
        console.log('✅ [authSlice] User signed in:', action.payload.email);
      })
      .addCase(signInWithGoogle. rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('❌ [authSlice] Sign in failed:', action. payload);
      })
      // Sign out
      .addCase(signOut.pending, (state) => {
        state. loading = true;
        console.log('⏳ [authSlice] Sign out pending...');
      })
      .addCase(signOut.fulfilled, (state) => {
        console.log('✅ [authSlice] Sign out fulfilled - clearing state');
        state.user = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(signOut. rejected, (state, action) => {
        console.error('❌ [authSlice] Sign out rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state. isAuthenticated = false;
        state. isAdmin = false;
      });
  },
});

export const { setUser, clearUser, setError, clearError } = authSlice.actions;
export default authSlice.reducer;