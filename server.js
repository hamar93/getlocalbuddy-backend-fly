const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// A Fly.io szerverekhez hozzáadjuk a dotenv-et a kulcsok beolvasásához
// (A Fly.io maga tölti be a titkokat, de a kódban szükség van erre a hívásra)
require('dotenv').config(); 

const prisma = new PrismaClient();
const app = express();

// Fontos: Engedélyezzük a JSON formátumot a POST kérésekhez
app.use(express.json());

// A port beolvasása a környezeti változókból (Fly.io)
const PORT = process.env.PORT || 8080; 

// --- HEALTH CHECK (Állapot Ellenőrzés) ---
app.get('/api/status', (req, res) => {
    // Ha ezt eléred, a szerver fut!
    res.json({ status: 'ok', service: 'getlocalbuddy-backend' });
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
        // P2002: Egyedi mező (email) konfliktus (már létezik)
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- SZERVER INDÍTÁSA ---
// A '0.0.0.0' garantálja, hogy a szerver elérhető legyen a Fly.io hálózatán
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});