// Request validation shared by every route. Each helper returns the cleaned value
// or throws a ValidationError, which the error handler turns into a 400 response.

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

export function text(value, field, { required = false, max } = {}) {
  if (isBlank(value)) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  const clean = String(value).trim();
  if (max && clean.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters`);
  }
  return clean;
}

export function integer(value, field, { required = false, min, max } = {}) {
  if (isBlank(value)) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new ValidationError(`${field} must be a whole number`);
  }
  if ((min !== undefined && number < min) || (max !== undefined && number > max)) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return number;
}

export function decimal(value, field, { required = false, min, max } = {}) {
  if (isBlank(value)) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if ((min !== undefined && number < min) || (max !== undefined && number > max)) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return number;
}

export function oneOf(value, field, allowed, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

export function url(value, field) {
  const clean = text(value, field, { max: 255 });
  if (clean === null) return null;
  try {
    const parsed = new URL(clean);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new ValidationError(`${field} must be an http(s) URL`);
  }
  return clean;
}

export function id(value, field = "id") {
  return integer(value, field, { required: true, min: 1, max: 2147483647 });
}

export const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
