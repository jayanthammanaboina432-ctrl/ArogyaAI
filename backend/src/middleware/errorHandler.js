export function notFound(req, res, next) {
  res.status(404).json({ error: 'Route not found' });
}

export class AppError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
    this.isOperational = true;
  }
}

// Known, expected error shapes that don't come from our own AppError class
// (body-parser's oversized-payload / malformed-JSON errors) — map them to a
// clean user-facing message instead of a generic 500.
function knownExpectedMessage(err) {
  if (err.type === 'entity.too.large') return 'Request is too large. Please try again.';
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return 'Could not understand that request. Please try again.';
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const expectedMessage = knownExpectedMessage(err);
  const status = err.status || (expectedMessage ? 400 : 500);
  const isExpected = err.isOperational || Boolean(expectedMessage);

  if (isExpected) {
    // Expected, already-handled conditions: one concise line, no stack.
    if (status >= 500) {
      console.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
    }
  } else {
    console.error(`${req.method} ${req.originalUrl} ->`, err);
  }

  res.status(status).json({
    error: err.publicMessage || expectedMessage || 'Something went wrong. Please try again.',
  });
}
