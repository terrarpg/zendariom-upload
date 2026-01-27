const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const axios = require('axios'); // Ajout du module axios

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const UPDATES_DIR = path.join(__dirname, 'updates');
const CACHE_MAX_AGE = 3600;
const RENDER_URL = 'https://zendarion-config.onrender.com'; // URL Render à activer
const PING_INTERVAL = 14 * 60 * 1000; // Ping toutes les 14 minutes (Render s'endort après 15 min d'inactivité)

// Créer dossier updates
if (!fs.existsSync(UPDATES_DIR)) {
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
    console.log(`📁 Dossier créé: ${UPDATES_DIR}`);
}

// Fonction pour activer le serveur Render
async function pingRenderServer() {
    try {
        const response = await axios.get(RENDER_URL, { timeout: 10000 });
        console.log(`✅ Serveur Render activé: ${RENDER_URL} - Status: ${response.status}`);
        return true;
    } catch (error) {
        console.warn(`⚠️ Impossible de contacter le serveur Render: ${error.message}`);
        return false;
    }
}

// Ping automatique toutes les 14 minutes pour maintenir le serveur Render actif
setInterval(pingRenderServer, PING_INTERVAL);

// Middleware pour ping le serveur Render sur certaines requêtes
const activateRenderMiddleware = async (req, res, next) => {
    // Ping le serveur Render sur les requêtes de mises à jour importantes
    if (req.path.includes('/api/files') || req.path.includes('/download/')) {
        try {
            await pingRenderServer();
        } catch (error) {
            // Ne pas bloquer la requête en cas d'erreur
            console.warn('Ping Render échoué, mais continuation de la requête');
        }
    }
    next();
};

// Middleware
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
app.use(activateRenderMiddleware); // Appliquer le middleware d'activation

// Servir fichiers statiques
app.use('/download', express.static(UPDATES_DIR, {
    maxAge: CACHE_MAX_AGE * 1000,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.exe') || filePath.endsWith('.blockmap')) {
            res.setHeader('Content-Disposition', 'attachment');
        }
        res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
    }
}));

// Endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Zendarion Update Server',
        render_url: RENDER_URL,
        render_active: 'auto-ping every 14min',
        files: fs.existsSync(UPDATES_DIR) ? fs.readdirSync(UPDATES_DIR) : []
    });
});

app.get('/api/files', async (req, res) => {
    try {
        // Ping le serveur Render avant de répondre
        await pingRenderServer();
        
        const files = fs.readdirSync(UPDATES_DIR).map(file => {
            return {
                name: file,
                url: `/download/${encodeURIComponent(file)}`,
                size: fs.statSync(path.join(UPDATES_DIR, file)).size,
                lastModified: fs.statSync(path.join(UPDATES_DIR, file)).mtime
            };
        });
        res.json({ files, render_activated: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Nouvel endpoint pour activer manuellement le serveur Render
app.get('/api/activate-render', async (req, res) => {
    try {
        const success = await pingRenderServer();
        res.json({
            success,
            message: success ? 'Serveur Render activé avec succès' : 'Échec de l\'activation',
            url: RENDER_URL
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrer le serveur
app.listen(PORT, async () => {
    console.log(`🚀 Serveur Zendarion démarré sur le port ${PORT}`);
    console.log(`📁 Dossier: ${UPDATES_DIR}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`⬇️  Endpoint: http://localhost:${PORT}/download/`);
    console.log(`🌐 Serveur Render cible: ${RENDER_URL}`);
    console.log(`⏰ Ping auto toutes les ${PING_INTERVAL / 60000} minutes`);
    
    // Ping initial au démarrage
    await pingRenderServer();
});