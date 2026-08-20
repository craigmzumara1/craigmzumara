const basicAuth = require("express-basic-auth");
const crypto = require("crypto");

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "craigmzumara1";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "";

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "";

const TOKEN_EXPIRES_IN =
  process.env.ADMIN_JWT_EXPIRES_IN || "12h";

const JWT_ISSUER = "craigmzumara-api";
const JWT_AUDIENCE = "craigmzumara-admin";

function base64UrlEncode(value) {
  return Buffer
    .from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const padding =
    normalized.length % 4 === 0
      ? ""
      : "=".repeat(4 - (normalized.length % 4));

  return Buffer
    .from(normalized + padding, "base64")
    .toString("utf8");
}

function parseDuration(value) {
  if (typeof value === "number") {
    return Math.max(60, Math.floor(value));
  }

  const match =
    String(value || "")
      .trim()
      .match(/^(\d+)\s*(s|m|h|d)$/i);

  if (!match) {
    return 12 * 60 * 60;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multiplier =
    unit === "d"
      ? 86400
      : unit === "h"
        ? 3600
        : unit === "m"
          ? 60
          : 1;

  return Math.max(60, amount * multiplier);
}

function safeEqualStrings(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function signJwt(payload) {
  if (!ADMIN_JWT_SECRET) {
    throw new Error("ADMIN_JWT_SECRET is not configured.");
  }

  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const encodedHeader =
    base64UrlEncode(
      JSON.stringify(header)
    );

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(payload)
    );

  const signingInput =
    `${encodedHeader}.${encodedPayload}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        ADMIN_JWT_SECRET
      )
      .update(signingInput)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

  return `${signingInput}.${signature}`;
}

function verifyJwt(token) {
  if (!ADMIN_JWT_SECRET) {
    throw new Error("ADMIN_JWT_SECRET is not configured.");
  }

  const parts =
    String(token || "").split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] =
    parts;

  const signingInput =
    `${encodedHeader}.${encodedPayload}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        ADMIN_JWT_SECRET
      )
      .update(signingInput)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

  const supplied =
    Buffer.from(signature);

  const expected =
    Buffer.from(expectedSignature);

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const header =
      JSON.parse(
        base64UrlDecode(encodedHeader)
      );

    const payload =
      JSON.parse(
        base64UrlDecode(encodedPayload)
      );

    if (
      header.alg !== "HS256" ||
      header.typ !== "JWT"
    ) {
      return null;
    }

    const now =
      Math.floor(Date.now() / 1000);

    if (
      !Number.isFinite(payload.exp) ||
      payload.exp <= now
    ) {
      return null;
    }

    if (
      payload.iss !== JWT_ISSUER ||
      payload.aud !== JWT_AUDIENCE ||
      payload.type !== "admin" ||
      payload.username !== ADMIN_USERNAME
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Legacy Basic Auth is kept for localhost/backward compatibility.
 * Production Firebase -> Railway requests use Bearer JWTs.
 */
const legacyBasicAuth = basicAuth({
  users: {
    [ADMIN_USERNAME]: ADMIN_PASSWORD
  },
  challenge: true,
  unauthorizedResponse: () =>
    JSON.stringify({
      success: false,
      error: "Authentication required"
    })
});

function adminAuth(req, res, next) {
  const authHeader =
    req.get("Authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    const payload =
      verifyJwt(
        authHeader.slice("Bearer ".length).trim()
      );

    if (!payload) {
      return res.status(401).json({
        success: false,
        error:
          "Authentication session expired. Please sign in again."
      });
    }

    req.admin = payload;
    return next();
  }

  return legacyBasicAuth(req, res, next);
}

async function adminLogin(req, res) {
  try {
    if (
      !ADMIN_PASSWORD ||
      !ADMIN_JWT_SECRET
    ) {
      console.error(
        "Admin authentication is not configured. " +
        "Set ADMIN_PASSWORD and ADMIN_JWT_SECRET."
      );

      return res.status(500).json({
        success: false,
        error:
          "Admin authentication is not configured on the server."
      });
    }

    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim()
        : "";

    const password =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    if (
      !safeEqualStrings(username, ADMIN_USERNAME) ||
      !safeEqualStrings(password, ADMIN_PASSWORD)
    ) {
      return res.status(401).json({
        success: false,
        error: "Invalid admin credentials."
      });
    }

    const now =
      Math.floor(Date.now() / 1000);

    const expiresIn =
      parseDuration(TOKEN_EXPIRES_IN);

    const token =
      signJwt({
        type: "admin",
        username: ADMIN_USERNAME,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        iat: now,
        exp: now + expiresIn
      });

    return res.json({
      success: true,
      token,
      expiresIn: TOKEN_EXPIRES_IN
    });
  } catch (error) {
    console.error(
      "Admin login failed:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to authenticate admin."
    });
  }
}

module.exports = {
  adminAuth,
  adminLogin,
  ADMIN_USERNAME
};
