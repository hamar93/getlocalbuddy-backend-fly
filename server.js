const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Configure CORS to allow requests from the Netlify frontend
app.use(cors({ origin: 'https://beamish-stardust-0c393f.netlify.app' }));

const PORT = process.env.PORT || 8080;

// --- HEALTH CHECK ---
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// --- REGISTRATION ENDPOINT ---
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    res.status(201).json({ message: 'User created successfully.', userId: user.id });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- LOGIN ENDPOINT ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    res.status(200).json({ id: user.id, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
