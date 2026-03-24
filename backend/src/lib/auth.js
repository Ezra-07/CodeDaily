import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {prisma} from "./prisma.js";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000", 
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    advanced: {
        defaultBasePath: "/api/v1/auth" 
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }
    },
    emailAndPassword: {  
        enabled: true 
    },
    user: {
        additionalFields: {
            username: { type: "string" },
            role: { type: "string" }
        }
    }
});