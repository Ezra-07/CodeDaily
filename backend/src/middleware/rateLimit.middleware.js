import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const submissionLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 1,
  message: {
    error: "You are submitting too fast. Please wait 10 seconds.",
  },
  keyGenerator: (req) => {
    if (req.user) {
      return req.user.userId;
    }
    return ipKeyGenerator(req); //prevent warning for IPV6 bypass
  },
});
