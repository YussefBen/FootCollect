USE footcollect_db;

CREATE TABLE users (
    id SERIAL PRIMARY KEY, -- Identifiant unique
    username VARCHAR(50) NOT NULL, -- Pseudo
    email VARCHAR(100) UNIQUE NOT NULL, -- Email (pour login)
    password_hash VARCHAR(255) NOT NULL, -- Mot de passe crypté
    credits INT DEFAULT 500, -- Le "Starter Pack" offert à l'inscription
    created_at TIMESTAMP DEFAULT NOW() -- Date d'inscription
);

CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Ex: 'Kylian Mbappé'
    team VARCHAR(100), -- Ex: 'Real Madrid'
    position VARCHAR(10), -- Ex: 'FWD' (Attaquant), 'GK' (Gardien)
    rarity VARCHAR(20) NOT NULL, -- Ex: 'COMMON', 'RARE', 'LEGENDARY'
    rating INT, -- Note globale (ex: 91)
    image_url VARCHAR(255) -- Lien vers l'image de la carte
);

CREATE TABLE user_collection (
    user_id INT REFERENCES users (id), -- Qui ?
    card_id INT REFERENCES cards (id), -- Quelle carte ?
    quantity INT DEFAULT 1, -- Combien en a-t-il ? (Doublons)
    obtained_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, card_id) -- Clé composée (Un user ne peut pas avoir 2 lignes pour la même carte)
);

CREATE TABLE market_listings (
    id SERIAL PRIMARY KEY,
    seller_id INT REFERENCES users (id), -- Qui vend ?
    card_id INT REFERENCES cards (id), -- Quelle carte ?
    price INT NOT NULL, -- Prix de vente demandé
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'SOLD', 'CANCELLED'
    created_at TIMESTAMP DEFAULT NOW()
);