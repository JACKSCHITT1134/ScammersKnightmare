import { User } from '@/types';

const MOCK_USER_KEY = 'scammer_knightmare_user';

export const mockAuth = {
  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(MOCK_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  signIn: (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (password.length < 6) {
          reject(new Error('Password must be at least 6 characters'));
          return;
        }

        const user: User = {
          id: `user_${Date.now()}`,
          email,
          tier: 'free',
          scansRemaining: 1,
          autoScanEnabled: false,
        };

        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
        resolve(user);
      }, 800);
    });
  },

  signUp: (email: string, password: string): Promise<User> => {
    return mockAuth.signIn(email, password);
  },

  signOut: (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem(MOCK_USER_KEY);
        resolve();
      }, 300);
    });
  },

  upgradeTier: (tier: 'premium' | 'family'): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockAuth.getCurrentUser();
        if (user) {
          const updated: User = {
            ...user,
            tier,
            scansRemaining: undefined,
            autoScanEnabled: tier === 'premium' || tier === 'family',
          };
          localStorage.setItem(MOCK_USER_KEY, JSON.stringify(updated));
          resolve(updated);
        }
      }, 1000);
    });
  },
};
