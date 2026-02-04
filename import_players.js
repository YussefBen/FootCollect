const mysql = require('mysql2/promise'); // On utilise la version "promise" pour le async/await

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'footcollect_db'
};

const teams = [
    'Real Madrid', 
    'Manchester City', 
    'Paris Saint-Germain', 
    'FC Barcelona', 
    'Bayern Munich', 
    'Liverpool', 
    'Arsenal',
    'Juventus',
    'AC Milan',
    'Inter Milan'
];

function getRandomRating() {
    return Math.floor(Math.random() * (95 - 75 + 1)) + 75;
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
        console.log("✅ Connecté ! Début de l'importation...\n");

        for (const teamName of teams) {
            console.log(`🌍 Récupération de l'équipe : ${teamName}...`);
            
  
            const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=${encodeURIComponent(teamName)}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (!data.player) {
                console.log(`❌ Pas de joueurs trouvés pour ${teamName}`);
                continue;
            }

            for (const player of data.player) {
                if (player.strSport === 'Soccer' && player.strPosition !== 'Manager') {
                    
                    const name = player.strPlayer;
                    const team = player.strTeam;
                    const position = player.strPosition; 
                    
                    const rating = getRandomRating();
                    const rarity = getRarity(rating);

                    const image_url = player.strCutout || player.strThumb || player.strRender || null;

                    const sql = `
                        INSERT IGNORE INTO cards (name, team, position, rarity, rating, image_url) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;

                    await connection.execute(sql, [name, team, position, rarity, rating, image_url]);
                }
            }
            console.log(`✅ Joueurs de ${teamName} importés.`);
        }

        console.log("\n🎉 TERMINE ! Ta base de données est remplie.");

    } catch (error) {
        console.error("Erreur critique :", error);
    } finally {
        if (connection) connection.end();
    }
}


importerJoueurs();