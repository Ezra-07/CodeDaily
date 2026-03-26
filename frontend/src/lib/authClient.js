import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL,
    basePath: "/api/v1/auth", 
    fetchOptions: {
        credentials: "include",
    },
});