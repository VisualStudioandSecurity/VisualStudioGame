const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { OAuth2Client } = require('google-auth-library');

const app = express();
const client = new OAuth2Client('SEU_CLIENT_ID_DO_GOOGLE.apps.googleusercontent.com');

app.use(cors());
app.use(express.json());

// Criar/conectar ao banco de dados SQLite local
const db = new sqlite3.Database('./database.db', (err) => {
    if (!err) {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT,
            credits INTEGER DEFAULT 0
        )`);
    }
});

// Middleware para verificar se o token do Google é válido
async function verifyGoogleToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const token = authHeader.split(' ')[1];
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: 'SEU_CLIENT_ID_DO_GOOGLE.apps.googleusercontent.com'
        });
        req.user = ticket.getPayload(); // Dados do usuário validados pelo Google
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}

// Rota: Dar recompensa por assistir anúncio
app.post('/api/credits/reward-ad', verifyGoogleToken, (req, res) => {
    const userId = req.user.sub;
    const userEmail = req.user.email;

    db.run(
        `INSERT INTO users (id, email, credits) VALUES (?, ?, 1000)
         ON CONFLICT(id) DO UPDATE SET credits = credits + 1000`,
        [userId, userEmail],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erro no banco' });

            db.get(`SELECT credits FROM users WHERE id = ?`, [userId], (err, row) => {
                res.json({ success: true, newBalance: row.credits });
            });
        }
    );
});

app.listen(3000, () => console.log('Servidor rodando no Codespaces na porta 3000'));
