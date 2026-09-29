import type { User } from '@/types';
import { mockUser } from '@/data/settings';

let currentUser: User | null = null;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 200));
}

export const authService = {
  async login(): Promise<User> {
    currentUser = { ...mockUser };
    return delay({ ...currentUser });
  },

  async logout(): Promise<void> {
    currentUser = null;
    return delay(undefined);
  },

  async getCurrentUser(): Promise<User | null> {
    return delay(currentUser ? { ...currentUser } : null);
  },

  isAuthenticated(): boolean {
    return currentUser !== null;
  },
};
