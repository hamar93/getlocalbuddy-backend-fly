const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());

// JAVÍTÁS: Engedélyezzük a CORS-t a Netlify domainről
app.use(cors({ origin: 'https://beamish-stardust-0c393f.netlify.app' }));

// FIGYELEM: A globális "const prisma = new PrismaClient();" sort eltávolítottuk innen.
const PORT = process.env.PORT || 8080;

// --- HEALTH CHECK (Állapot Ellenőrzés) ---
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// --- REGISZTRÁCIÓS VÉGPONT ---
app.post('/api/register', async (req, res) => {
  const prisma = new PrismaClient(); // Prisma inicializálása a funkción belül
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
  } finally {
    await prisma.$disconnect();
  }
});

// --- BEJELENTKEZÉSI VÉGPONT ---
app.post('/api/login', async (req, res) => {
  const prisma = new PrismaClient(); // Prisma inicializálása a funkción belül
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

    res.status(200).json({ message: 'Login successful', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    await prisma.$disconnect();
  }
});

// --- SZERVER INDÍTÁSA ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
