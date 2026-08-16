const basicAuth = require('express-basic-auth');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const adminAuth = basicAuth({
  users: { 'craigmzumara1': ADMIN_PASSWORD || '' },
  challenge: true,
  unauthorizedResponse: req => req.auth ? 'Credentials rejected' : 'No credentials provided'
});

module.exports = { adminAuth };