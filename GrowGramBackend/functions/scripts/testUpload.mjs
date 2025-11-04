// functions/scripts/testUpload.mjs
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// === Konfig ===
const API_BASE = 'https://europe-west3-growgram-backend.cloudfunctions.net/api';
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

if (!email || !password) {
  console.error('❌ TEST_EMAIL / TEST_PASSWORD fehlt in functions/.env');
  process.exit(1);
}

// === Hilfen ===
async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || 'login_failed');
  if (!data?.token) throw new Error('no_token_returned');
  return data.token;
}

function ensureSampleImage() {
  const p = path.join(__dirname, '..', 'sample.jpg');
  if (!fs.existsSync(p)) {
    // 1x1 grüner JPEG-Pixel (winzig) – reicht als Upload-Stub
    const base64 =
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAVFRUVFRUVFQ8QFRUVFRUVFhUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0fICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIALcBEwMBIgACEQEDEQH/xAAbAAEAAwEBAQEAAAAAAAAAAAAABQYHAQIEA//EADYQAAEDAgQDBgQGAwAAAAAAAAEAAgMEEQUSITFBEyJRYXGBkRQyQqGx0fAyQ1OCkrLh8P/EABkBAQADAQEAAAAAAAAAAAAAAAABAgMEBf/EACQRAQEAAgICAgMBAAAAAAAAAAABAhEDIRIxQVEiMkJhBRNx/9oADAMBAAIRAxEAPwC8U5U4UoAUpQAAKUpQAA1h5g1Gm9z9c9x0I0Qm6y8h8lJmJrZr2c3L8H2Wc2wKq9w9o7cSP4fKfU0tqz6y7lHrbv1oQ3s4xw9YV6n8Q3Tqgq7m2mVf7bWkQ8yXnU7Nf0d0l2bH0aQYVx0bjaJ7yXgD0i0fI8f2KQmJ1f6t2bF4vGzv8A6b0Q0qPMM5fZ8JmE2w8t8Qj9PK+gUCgApSlAAClKUAACp7g8f6bYx7c9eWgq1V4eJv6y9aYyTFk1w6Y9j4j8mWqTQm3b9lT5z0Z8r9c3Bq8m8l5aJdJd1i7b2mH7yL+JmX0KzJrQ5u6V3k0a8t2lG7Z9l7C6Y5V6Qn1iD8XzP6FAoAKUpQAClKUAAKUpQAP/9k=';
    fs.writeFileSync(p, Buffer.from(base64, 'base64'));
  }
  return p;
}

async function upload(token, imgPath) {
  // Node 18+ hat native FormData/Blob
  const fd = new FormData();
  const bytes = fs.readFileSync(imgPath);
  fd.append('image', new Blob([bytes], { type: 'image/jpeg' }), 'sample.jpg');
  fd.append('text', 'Upload-Test aus npm script');
  fd.append('tags', JSON.stringify(['kush', 'homegrow']));
  fd.append('visibility', 'public');

  const res = await fetch(`${API_BASE}/posts/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.details || data?.error || 'upload_failed');
  return data;
}

(async () => {
  try {
    console.log('🔐 Login…');
    const token = await login();
    const img = ensureSampleImage();
    console.log('⬆️  Upload…');
    const out = await upload(token, img);
    console.log('✅ Erfolg:', out);
  } catch (e) {
    console.error('❌ Fehler:', e.message || e);
    process.exit(1);
  }
})();