const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();

// 1. CORS CONFIGURATION (Matches Frontend)
const allowedOrigins = [
  'https://beamish-stardust-0c393f.netlify.app', // Production
  'http://localhost:3000' // Local Dev
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json());
const PORT = process.env.PORT || 8080;

// --- ROUTES ---

// Health Check
app.get('/api/status', (req, res) => res.json({ status: 'ok' }));

// Register
app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role }
    });
    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (e) {
    res.status(500).json({ error: 'User already exists or server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET POSTS (Timeline)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, email: true }
        }
      }
    });
    // Format data for frontend
    const formatted = posts.map(p => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      likes: p.likes || 0,
      comments: 0,
      author: {
        id: p.author.id,
        name: p.author.email.split('@')[0], // Fallback name
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author.id}` // Better avatars
      }
    }));
    res.json(formatted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// CREATE POST
app.post('/api/posts', async (req, res) => {
  const { content, authorId } = req.body;
  try {
    const post = await prisma.post.create({
      data: { content, authorId }
    });
    res.status(201).json(post);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));
