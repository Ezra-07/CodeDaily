import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: "/api/v1/auth",
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins:[process.env.FRONTEND_URL],
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
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    const baseUsername = user.username || user.email.split('@')[0];
                    const randomSuffix = Math.floor(Math.random() * 10000);
                    const username = `${baseUsername}_${randomSuffix}`;

                    return {
                        data: {
                            ...user,
                            username,
                            role: user.role || "USER",
                        }
                    };
                }
            }
        }
    },
    advanced: {
        cookies: {
            state: {
            attributes: {
                sameSite: "none",
                secure: true,
            },
            },
        },
        useSecureCookies: true,
    }
});