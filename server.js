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
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role, // This correctly accepts the 'role' from the frontend
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

    // Do not send the password back to the client
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful.', user: userWithoutPassword });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- CREATE POST ENDPOINT ---
app.post('/api/posts', async (req, res) => {
  const { content, authorId } = req.body;

  if (!content || !authorId) {
    return res.status(400).json({ error: 'Content and author ID are required.' });
  }

  try {
    const post = await prisma.post.create({
      data: {
        content,
        authorId,
      },
    });
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- GET POSTS ENDPOINT (UPDATED) ---
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      // UPDATE: Include the author data
      include: {
        author: {
          select: {
            id: true,
            email: true, // We use 'email' as name for now
          }
        }
      },
    });

    // Format the posts to match the frontend's `Post` type
    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      authorId: post.authorId,
      createdAt: post.createdAt,
      // The frontend expects author `name` and `avatar`, so we map them here.
      // We will use the author's email as their `name` for now.
      // A placeholder for the avatar is used as the User model does not have one yet.
      author: {
        id: post.author.id,
        name: post.author.email,
        avatar: 'https://www.gravatar.com/avatar/' // Placeholder
      }
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
