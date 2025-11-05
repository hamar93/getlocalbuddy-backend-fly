const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());

// --- JAVÍTÁS: CORS Engedélyezése ---
app.use(cors({
  origin: 'https://beamish-stardust-0c393f.netlify.app'
}));

// FIGYELEM: A Prisma klienst globálisan TÖRLÖLJÜK innen!
// const prisma = new PrismaClient(); // EZ A SOR TÖRÖLVE!

// A port beolvasása (a 8080 a Fly.io által preferált alapértelmezett)
const PORT = process.env.PORT || 8080; 

// --- HEALTH CHECK (Állapot Ellenőrzés) ---
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', service: 'backend' });
});

// --- REGISZTRÁCIÓS VÉGPONT ---
app.post('/api/register', async (req, res) => {
    // JAVÍTÁS: A Prisma klienst itt, a funkción belül inicializáljuk!
    const prisma = new PrismaClient();
    
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
        await prisma.$disconnect(); // Jó gyakorlat: a funkció végén bontsuk a kapcsolatot.
    }
});

// --- BEJELENTKEZÉSI VÉGPONT ---
app.post('/api/login', async (req, res) => {
    
    // JAVÍTÁS: A Prisma klienst itt is, a funkción belül inicializáljuk!
    const prisma = new PrismaClient();
    
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
        await prisma.$disconnect(); // Jó gyakorlat: a funkció végén bontsuk a kapcsolatot.
    }
});

// --- SZERVER INDÍTÁSA ---
// A '0.0.0.0' garantálja, hogy a szerver elérhető legyen a Fly.io hálózatán
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});