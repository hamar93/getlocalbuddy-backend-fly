const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

// --- 🔍 DEBUG ZÓNA (EZT FIGYELD A LOGBAN!) ---
console.log("========================================");
console.log("🔍 PRISMA CLIENT DIAGNOSTICS");
console.log("========================================");
try {
  // Kiírjuk az összes modellt, amit a Prisma ismer
  // A prisma._runtimeDataModel.models vagy hasonló belső tulajdonságok helyett
  // egyszerűen megnézzük a prisma objektum kulcsait.
  const keys = Object.keys(prisma);
  console.log("Available keys on prisma object:", keys);
  
  if (prisma.post) {
    console.log("✅ SUCCESS: 'post' model FOUND!");
  } else {
    console.error("❌ CRITICAL ERROR: 'post' model is UNDEFINED!");
    console.error("⚠️ Ez azt jelenti, hogy a 'prisma generate' a RÉGI sémából dolgozott.");
  }
} catch (err) {
  console.error("Debug error:", err);
}
console.log("========================================");
// ---------------------------------------------

// 1. CORS CONFIGURATION
const allowedOrigins = [
    'https://beamish-stardust-0c393f.netlify.app',
    'http://localhost:3000'
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

app.get('/api/status', (req, res) => res.json({ status: 'ok', service: 'backend' }));

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
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: 'User already exists or server error' });
  }
});

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

app.get('/api/posts', async (req, res) => {
  try {
    console.log("Attempting to fetch posts..."); // Debug log
    if (!prisma.post) throw new Error("Prisma Post model is missing!");
    
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, email: true } } }
    });
    const formatted = posts.map(p => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      likes: p.likes || 0,
      comments: 0,
      author: {
        id: p.author.id,
        name: p.author.email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author.id}`
      }
    }));
    res.json(formatted);
  } catch (e) {
    console.error("GET /api/posts ERROR:", e);
    res.status(500).json({ error: 'Failed to fetch posts', details: e.message });
  }
});

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

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, role: true, createdAt: true, name: true, bio: true, city: true, avatarUrl: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const finalUser = {
      ...user,
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
    };
    res.json(finalUser);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { name, bio, city, role } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, bio, city, role },
      select: { id: true, name: true, bio: true, city: true, role: true, avatarUrl: true }
    });
    res.json(updatedUser);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));
