const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'footcollect_db'
});


db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
    } else {
        console.log('✅ Connecté à la base de données MySQL !');
    }
});


app.get('/', (req, res) => {
    res.send('Bienvenue sur l\'API FootCollect !');
});


app.get('/users', (req, res) => {
    const sql = "SELECT * FROM users";
    db.query(sql, (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

// --- NOUVELLES ROUTES SPRINT 1 ---
app.get('/cards', (req, res) => {
    const sql = "SELECT * FROM cards";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});


// Route "Ouverture de pack" AVEC SAUVEGARDE
app.get('/pack/open', (req, res) => {
    const sqlDraw = "SELECT * FROM cards ORDER BY RAND() LIMIT 5";
    
    db.query(sqlDraw, (err, drawnCards) => {
        if (err) return res.status(500).json(err);

  
        const userId = 1; 

     
        drawnCards.forEach(card => {
            const sqlSave = `
                INSERT INTO user_collection (user_id, card_id, quantity) 
                VALUES (?, ?, 1) 
                ON DUPLICATE KEY UPDATE quantity = quantity + 1
            `;
            
            db.query(sqlSave, [userId, card.id], (err) => {
                if (err) console.error("Erreur de sauvegarde carte " + card.name, err);
            });
        });

        return res.json({
            message: "Pack ouvert et sauvegardé !",
            cards: drawnCards
        });
    });
});


// --- Route manquante pour l'Album ---
app.get('/my-album', (req, res) => {

    const sql = `
        SELECT cards.*, user_collection.quantity 
        FROM user_collection 
        JOIN cards ON user_collection.card_id = cards.id 
        WHERE user_collection.user_id = 1
    `;

    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(err);
        }
        return res.json(data);
    });
});
app.listen(3000, () => {
    console.log('🚀 Serveur lancé sur http://localhost:3000');
});