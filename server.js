const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname);

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const requestedUrl = decodeURIComponent(req.url.split('?')[0]);
  const sanitizedPath = path.normalize(requestedUrl).replace(/^\.+/, '');
  let filePath = path.join(publicDir, sanitizedPath);

  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad request');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      const fallback = path.join(publicDir, 'index.html');
      return sendFile(res, fallback);
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});