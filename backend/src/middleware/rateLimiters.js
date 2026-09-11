import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function limiterResponse(message) {
  return (req, res) => {
    res.status(429).json({ error: message });
  };
}

// Slows down brute-force login/registration attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse('Too many attempts. Please wait a few minutes and try again.'),
});

// AI-backed endpoints call the (quota-limited) Gemini API — this protects
// the shared quota from being burned by a single user or a runaway client.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || ipKeyGenerator(req.ip),
  handler: limiterResponse('Too many AI requests. Please wait a moment and try again.'),
});
