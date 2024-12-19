import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
  isLoading: boolean;
  signIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// This hook can be used to access the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// This hook will protect the route access based on user authentication
function useProtectedRoute(isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!api.isAuthenticated() && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/(auth)/login');
    } else if (api.isAuthenticated() && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)');
    }
  }, [isLoading, segments, api.isAuthenticated()]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useProtectedRoute(isLoading);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      await api.init();
      if (api.isAuthenticated()) {
        try {
          await api.getProfile();
        } catch {
          await signOut();
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (code: string) => {
    try {
      await api.login(code);
      await api.getProfile(); // Verify the token works
      router.replace('/(tabs)'); // Force navigation after successful login
    } catch (err) {
      await signOut();
      throw err;
    }
  };

  const signOut = async () => {
    await api.logout();
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        isLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
} 