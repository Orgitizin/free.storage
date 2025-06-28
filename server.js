const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple multipart/form-data parser (basic)
function parseMultipartData(body, boundary) {
  const parts = body.split(boundary).filter(part => part.includes('Content-Disposition'));
  const filePart = parts.find(part => part.includes('filename='));
  if (!filePart) return null;

  const match = /filename="(.+?)"\r\n/.exec(filePart);
  const filename = match ? match[1] : 'upload.bin';

  const start = filePart.indexOf('\r\n\r\n') + 4;
  const end = filePart.lastIndexOf('\r\n');
  const fileData = filePart.slice(start, end);

  return { filename, fileData: Buffer.from(fileData, 'binary') };
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    // Serve HTML form
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <form method="POST" enctype="multipart/form-data">
        <input type="file" name="myfile" />
        <button type="submit">Upload</button>
      </form>
    `);
  } else if (req.method === 'POST') {
    let data = '';
    req.setEncoding('binary'); // required for correct file data

    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      const contentType = req.headers['content-type'];
      const boundary = '--' + contentType.split('boundary=')[1];

      const parsed = parseMultipartData(data, boundary);
      if (!parsed) {
        res.writeHead(400);
        return res.end('Failed to parse file');
      }

      const uploadPath = path.join(__dirname, 'uploads', parsed.filename);
      fs.writeFileSync(uploadPath, parsed.fileData);
      res.writeHead(200);
      res.end(`File uploaded: ${parsed.filename}`);
    });
  } else {
    res.writeHead(405);
    res.end('Method Not Allowed');
  }
});

// Ensure uploads/ folder exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

