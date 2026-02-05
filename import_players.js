const mysql = require('mysql2/promise');

// CONFIGURATION BDD
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'footcollect_db'
};

// --- 1. LA GRANDE LISTE DES CLUBS ---
const teams = [
    // 🇬🇧 Angleterre
    'Manchester City', 'Arsenal', 'Liverpool', 'Manchester United', 'Chelsea', 'Tottenham', 'Aston Villa',
    // 🇪🇸 Espagne
    'Real Madrid', 'FC Barcelona', 'Atletico Madrid', 'Sevilla',
    // 🇫🇷 France
    'Paris Saint-Germain', 'Marseille', 'Monaco', 'Lyon', 'Lille',
    // 🇩🇪 Allemagne
    'Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig',
    // 🇮🇹 Italie
    'Juventus', 'AC Milan', 'Inter Milan', 'Napoli', 'AS Roma',
    // 🇵🇹 Portugal / 🇳🇱 Pays-Bas
    'Benfica', 'Porto', 'Ajax',
    // 🌎 Reste du Monde
    'Flamengo', 'Boca Juniors', 'River Plate', 'Al Hilal', 'Al Nassr', 'Inter Miami'
];

// --- 2. FONCTION DE PAUSE (Anti-Blocage API) ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomRating() {
    return Math.floor(Math.random() * (94 - 75 + 1)) + 75;
}

function getRarity(rating) {
    if (rating >= 88) return 'LEGENDARY';
    if (rating >= 83) return 'RARE';
    return 'COMMON';
}

async function importerJoueurs() {
    let connection;
    try {
        console.log("🔌 Connexion à la base de données...");
        connection = await mysql.createConnection(dbConfig);
        
        console.log(`\n📋 LISTE CHARGÉE : ${teams.length} équipes à traiter.`);
        console.log("🚀 Début de l'importation sécurisée (Prends un café, ça va durer 2-3 minutes)...\n");

        for (const teamName of teams) {
            process.stdout.write(`⏳ Traitement de : ${teamName}... `);
            
            // On nettoie le nom pour l'URL
            const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=${encodeURIComponent(teamName)}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();

                if (!data.player) {
                    console.log("❌ Zéro résultat (API occupée).");
                } else {
                    let count = 0;
                    for (const player of data.player) {
                        // Filtre : Footballeur + Pas Manager
                        if (player.strSport === 'Soccer' && player.strPosition !== 'Manager') {
                            
                            // Filtre : Doit avoir une image (Cutout > Thumb > Render)
                            const image_url = player.strCutout || player.strThumb || player.strRender;
                            
                            // Si pas d'image, on ne l'ajoute pas (pour avoir un album propre)
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
                console.log("⚠️ Erreur réseau.");
            }

            // --- 3. LA PAUSE CRUCIALE (3 secondes) ---
            await wait(3000);
        }

        console.log("\n🎉 TERMINE ! Ta base de données est remplie avec le monde entier !");

    } catch (error) {
        console.error("Erreur critique :", error);
    } finally {
        if (connection) connection.end();
    }
}

importerJoueurs();