import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export const requireAuth = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export const requireAdmin = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        if (session.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Forbidden. Admin access required." });
        }

        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const optionalAuth = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });
        if (session) {
            req.user = session.user;
        }
        next();
    } catch (error) {
        next();
    }
};