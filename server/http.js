// Shared helpers for Express route handlers.

// Wraps async handlers so rejected promises reach the error middleware.
export const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const badRequest = (res, message) =>
  res.status(400).json({ error: message });

// Maps PostgreSQL error codes to readable API errors.
export function errorHandler(error, _req, res, _next) {
  const messages = {
    "23505": [409, "That value already exists (unique constraint)."],
    "23503": [409, "Blocked by a related record (foreign key constraint)."],
    "23502": [400, "A required field is missing (not-null constraint)."],
    "23514": [400, "A value is outside the allowed range (check constraint)."],
    // Raised by business-logic triggers; their message is meant for the user.
    "23001": [409, error.message],
  };
  const mapped = messages[error.code];
  if (mapped) {
    return res.status(mapped[0]).json({ error: mapped[1], detail: error.detail });
  }
  console.error(error);
  res.status(500).json({ error: "Database request failed." });
}
