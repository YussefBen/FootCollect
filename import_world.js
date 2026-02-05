const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'footcollect_db'
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, retries = 3) {
    for (let i = 1; i <= retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            return await res.json();
        } catch {
            if (i === retries) throw new Error("API FAIL");
            await wait(2000 * i);
        }
    }
}

// 🎯 SYSTÈME DE CALCUL DE NOTES RÉALISTES
function calculateFIFARating(player, league, team) {
    let rating = 68; // Note de base augmentée
    
    // 1️⃣ BONUS SELON LA LIGUE (AJUSTÉ POUR TOP 5)
    const leagueBonus = {
        // TOP 5 LIGUES EUROPÉENNES
        'English Premier League': 12,      // La plus forte
        'Spanish La Liga': 11,             
        'German Bundesliga': 10,           
        'Italian Serie A': 10,             
        'French Ligue 1': 9,               
        
        // AUTRES LIGUES MAJEURES
        'UEFA Champions League': 15,       // Bonus maximal
        'Portuguese Primeira Liga': 6,
        'Dutch Eredivisie': 5,
        'Belgian First Division A': 4,
        'Major League Soccer': 3,
        'Scottish Premiership': 4,
        'Turkish Super Lig': 5,
        'Russian Premier League': 5,
        'Brazilian Serie A': 6,
        'Argentine Primera Division': 6
    };
    
    rating += leagueBonus[league] || 2;
    
    // 2️⃣ BONUS SELON L'ÉQUIPE (TOP CLUBS EUROPÉENS)
    const eliteTeams = {
        // ANGLETERRE
        'Manchester City': 12,
        'Liverpool': 11,
        'Arsenal': 10,
        'Manchester United': 10,
        'Chelsea': 10,
        'Tottenham': 9,
        'Newcastle United': 8,
        
        // ESPAGNE
        'Real Madrid': 12,
        'Barcelona': 12,
        'Atletico Madrid': 10,
        'Sevilla': 8,
        'Real Sociedad': 7,
        
        // ALLEMAGNE
        'Bayern Munich': 12,
        'Borussia Dortmund': 10,
        'RB Leipzig': 9,
        'Bayer Leverkusen': 8,
        
        // ITALIE
        'Inter Milan': 10,
        'AC Milan': 10,
        'Juventus': 10,
        'Napoli': 10,
        'Roma': 8,
        'Lazio': 8,
        
        // FRANCE
        'Paris Saint-Germain': 12,
        'AS Monaco': 8,
        'Olympique Marseille': 8,
        'Lyon': 8,
        'Lille': 7,
        'Nice': 7,
        
        // PORTUGAL
        'Benfica': 9,
        'Porto': 9,
        'Sporting CP': 8
    };
    
    rating += eliteTeams[team] || 0;
    
    // 3️⃣ BONUS SELON LA POSITION
    const positionBonus = {
        'Forward': 6,
        'Attacking Midfield': 5,
        'Midfielder': 4,
        'Winger': 5,
        'Defender': 3,
        'Goalkeeper': 5,
        'Centre-Back': 3,
        'Right-Back': 3,
        'Left-Back': 3,
        'Defensive Midfield': 4
    };
    
    rating += positionBonus[player.strPosition] || 2;
    
    // 4️⃣ VARIATION ALÉATOIRE pour diversité (-4 à +4)
    const randomVariation = Math.floor(Math.random() * 9) - 4;
    rating += randomVariation;
    
    // 5️⃣ LIMITER entre 65 et 92
    rating = Math.min(92, Math.max(65, rating));
    
    return rating;
}

// 🎲 DÉTERMINER LA RARETÉ selon la note
function determineRarity(rating) {
    if (rating >= 88) return 'LEGENDARY';  // Stars mondiales
    if (rating >= 83) return 'EPIC';       // Très bons joueurs
    if (rating >= 78) return 'RARE';       // Bons joueurs
    return 'COMMON';                       // Joueurs standards
}

// 1️⃣ Ligues
async function getAllSoccerLeagues() {
    const url = 'https://www.thesportsdb.com/api/v1/json/3/all_leagues.php';
    const data = await fetchSafe(url);
    return data.leagues.filter(l => l.strSport === 'Soccer');
}

// 2️⃣ Équipes
async function getTeamsByLeague(leagueName) {
    const url = `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(leagueName)}`;
    const data = await fetchSafe(url);
    return data.teams || [];
}

// 3️⃣ JOUEURS
async function getPlayers(teamId) {
    const url = `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${teamId}`;
    const data = await fetchSafe(url);
    return data.player || [];
}

// ---------------- MAIN ----------------
async function importWorldPlayers() {
    let db;
    try {
        db = await mysql.createConnection(dbConfig);
        console.log("🌍 IMPORT MONDIAL DES JOUEURS\n");

        const leagues = await getAllSoccerLeagues();

        for (const league of leagues) {
            console.log(`🏆 ${league.strLeague}`);
            const teams = await getTeamsByLeague(league.strLeague);

            for (const team of teams) {
                process.stdout.write(`   ⏳ ${team.strTeam}... `);

                try {
                    const players = await getPlayers(team.idTeam);
                    let inserted = 0;

                    for (const p of players) {
                        if (
                            p.strSport !== 'Soccer' ||
                            !p.strPosition ||
                            p.strPosition === 'Manager'
                        ) continue;

                        const image =
                            p.strCutout ||
                            p.strThumb ||
                            p.strRender;

                        if (!image) continue;

                        // 🎯 CALCUL DE LA NOTE RÉALISTE
                        const rating = calculateFIFARating(p, league.strLeague, team.strTeam);
                        const rarity = determineRarity(rating);

                        await db.execute(`
                            INSERT IGNORE INTO cards
                            (name, team, position, rarity, rating, image_url)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            p.strPlayer,
                            p.strTeam,
                            p.strPosition,
                            rarity,
                            rating,
                            image
                        ]);

                        inserted++;
                    }

                    console.log(`✅ ${inserted}`);
                } catch {
                    console.log("⚠️");
                }

                await wait(3000);
            }
        }

        console.log("\n🎉 IMPORT JOUEURS TERMINÉ");

    } catch (err) {
        console.error("❌ ERREUR", err);
    } finally {
        if (db) await db.end();
    }
}

importWorldPlayers();