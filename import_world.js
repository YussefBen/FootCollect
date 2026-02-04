const mysql = require('mysql2/promise');

// CONFIGURATION BDD
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'footcollect_db'
};

// LA LISTE DES CLUBS (Europe, AmSud, Monde)
const teams = [
    'Arsenal', 'Aston Villa', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham', // Anglais
    'Real Madrid', 'FC Barcelona', 'Atletico Madrid', 'Sevilla', // Espagnols
    'Paris Saint-Germain', 'Marseille', 'Monaco', 'Lille', // Français
    'Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', // Allemands
    'Juventus', 'AC Milan', 'Inter Milan', 'Napoli', // Italiens
    'Benfica', 'Porto', 'Ajax', // Autres Europe
    'Inter Miami', 'Al Hilal' // Monde
];

// Fonction pour faire une pause (pour ne pas énerver l'API)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomRating() {
    // Note entre 75 et 94
    return Math.floor(Math.random() * (94 - 75 + 1)) + 75;
}

function getRarity(rating) {
    if (rating >= 88) return 'LEGENDARY';
    if (rating >= 83) return 'RARE';
    return 'COMMON';
}

async function importerMonde() {
    let connection;
    try {
        console.log("🔌 Connexion à la BDD...");
        connection = await mysql.createConnection(dbConfig);
        console.log("✅ C'est parti pour le Tour du Monde !\n");

        for (const teamName of teams) {
            process.stdout.write(`🌍 Recherche : ${teamName}... `);
            
            // 1. Appel API
            const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=${encodeURIComponent(teamName)}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();

                if (!data.player) {
                    console.log("❌ Pas trouvé (ou API bloquée).");
                } else {
                    let count = 0;
                    // 2. Traitement des joueurs
                    for (const player of data.player) {
                        // On garde seulement les joueurs de foot avec une photo
                        // (On filtre aussi pour éviter les doublons de prêt)
                        if (player.strSport === 'Soccer' && player.strPosition !== 'Manager') {
                            
                            // Si pas d'image, on ignore pour garder la qualité "Pro"
                            const image_url = player.strCutout || player.strThumb || player.strRender;
                            if (!image_url) continue;

                            const rating = getRandomRating();
                            const rarity = getRarity(rating);

                            const sql = `
                                INSERT IGNORE INTO cards (name, team, position, rarity, rating, image_url) 
                                VALUES (?, ?, ?, ?, ?, ?)
                            `;

                            await connection.execute(sql, [player.strPlayer, player.strTeam, player.strPosition, rarity, rating, image_url]);
                            count++;
                        }
                    }
                    console.log(`✅ ${count} joueurs ajoutés.`);
                }
            } catch (err) {
                console.log("⚠️ Erreur réseau sur cette équipe.");
            }

            // 3. LA PAUSE CRUCIALE (1.5 secondes)
            await wait(1500);
        }

        console.log("\n🎉 IMPORTATION TERMINÉE ! Ta base est remplie de stars.");

    } catch (error) {
        console.error("Erreur générale :", error);
    } finally {
        if (connection) connection.end();
    }
}

importerMonde();