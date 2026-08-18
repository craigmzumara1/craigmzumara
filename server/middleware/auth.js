const basicAuth = require("express-basic-auth");

const ADMIN_USERNAME =
  "craigmzumara1";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;

const adminAuth = basicAuth({
  users: {
    [ADMIN_USERNAME]:
      ADMIN_PASSWORD || ""
  },

  challenge: true,

  unauthorizedResponse: () => {
    return JSON.stringify({
      success: false,
      error: "Invalid admin credentials"
    });
  }
});

module.exports = {
  adminAuth
};