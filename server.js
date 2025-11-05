const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // CORS importálása

const app = express();
app.use(express.json()); // JSON olvasó engedélyezése

// --- JAVÍTÁS: CORS Engedélyezése a Netlify domainről ---
// Enélkül a böngésző blokkolja a "Failed to connect" hibával
app.use(cors({
  origin: 'https://beamish-stardust-0c393f.netlify.app'
}));

// JAVÍTÁS: A Prisma klienst globálisan inicializáljuk, a szerver tetején.
// Erre azért van szükség, hogy ne hozzunk létre minden egyes kérésnél új kapcsolatot.
const prisma = new PrismaClient();

// A port beolvasása (a 8080 a Fly.io által preferált alapértelmezett)
const PORT = process.env.PORT || 8080; 

// --- HEALTH CHECK (Állapot Ellenőrzés) ---
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', service: 'backend' });
});

// --- REGISZTRÁCIÓS VÉGPONT ---
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

// --- BEJELENTKEZÉSI VÉGPONT ---
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

        res.status(200).json({ message: 'Login successful', userId: user.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- SZERVER INDÍTÁSA ---
// A '0.0.0.0' garantálja, hogy a szerver elérhető legyen a Fly.io hálózatán
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});