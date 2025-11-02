const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// FIGYELEM: A globális "const prisma = new PrismaClient();" sort eltávolítottuk innen,
// hogy megakadályozzuk a szerver azonnali összeomlását (502-es hiba).

const app = express();
app.use(express.json());

// A port beolvasása (a 8080 a Fly.io által preferált alapértelmezett)
const PORT = process.env.PORT || 8080; 

// --- HEALTH CHECK (Állapot Ellenőrzés) ---
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', service: 'backend' });
});

// --- REGISZTRÁCIÓS VÉGPONT ---
app.post('/api/register', async (req, res) => {
    
    // JAVÍTÁS: A Prisma klienst itt, a funkción belül inicializáljuk.
    // Ez biztosítja, hogy csak akkor fusson le, amikor már hívás érkezik,
    // és a szerver már stabilan fut (a titkos kulcsok be vannak töltve).
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
    }
});

// --- SZERVER INDÍTÁSA ---
// A '0.0.0.0' garantálja, hogy a szerver elérhető legyen a Fly.io hálózatán
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});