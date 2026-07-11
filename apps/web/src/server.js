import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, "index.html");
const port = process.env.PORT ?? 5173;

createServer(async (_req, res) => {
  const html = await readFile(indexPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(port, () => console.log(`murcha web placeholder — http://localhost:${port}`));
