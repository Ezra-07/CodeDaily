import { create } from "zustand";
import { authClient } from "../lib/authClient.js"; 

export const useAuthStore = create((set) => ({
  authUser: null,
  isCheckingAuth: true, 
  checkAuth: async () => {
    try {
      const { data, error } = await authClient.getSession();
      
      if (error || !data) {
        set({ authUser: null, isCheckingAuth: false });
      } else {
        set({ authUser: data.user, isCheckingAuth: false });
      }
    } catch {
      set({ authUser: null, isCheckingAuth: false });
    }
  },
  setAuthUser: (user) => set({ authUser: user }),
  logout: async () => {
    try {
      await authClient.signOut();
      set({ authUser: null });
    } catch (error) {
      console.error("Logout failed", error);
    }
  },
}));