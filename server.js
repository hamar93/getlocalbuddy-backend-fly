const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

// 1. CORS CONFIGURATION (Critical for Netlify connection)
const allowedOrigins = [
  'https://beamish-stardust-0c393f.netlify.app', // Production Frontend
  'http://localhost:3000' // Local Development
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

// --- HEALTH CHECK ---
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// --- REGISTRATION ---
app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      },
    });
    res.status(201).json({ message: 'User created.', userId: user.id });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Email already exists.' });
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password.' });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful.', user: userWithoutPassword });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- GET POSTS (Timeline) ---
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            email: true // Using email as name fallback
          }
        }
      }
    });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- CREATE POST ---
app.post('/api/posts', async (req, res) => {
  const { content, authorId } = req.body;
  if (!content || !authorId) return res.status(400).json({ error: 'Content/Author missing' });

  try {
    const post = await prisma.post.create({
      data: {
        content,
        authorId
      },
    });
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
