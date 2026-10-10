const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "set-cookie",
  "jwt",
  "secret",
]);

function sanitize(input) {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return input;
  }

  if (
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitize(item));
  }

  if (typeof input === "object") {
    const sanitizedObject = {};

    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObject[key] = "[REDACTED]";
      } else {
        sanitizedObject[key] = sanitize(value);
      }
    }

    return sanitizedObject;
  }

  return input;
}

module.exports = {
  sanitize,
};