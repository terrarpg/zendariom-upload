const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const UPDATES_DIR = path.join(__dirname, 'updates');
const CACHE_MAX_AGE = 3600;

// Créer dossier updates
if (!fs.existsSync(UPDATES_DIR)) {
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
    console.log(`📁 Dossier créé: ${UPDATES_DIR}`);
}

// Middleware
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

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
        service: 'Zendariom Update Server',
        files: fs.existsSync(UPDATES_DIR) ? fs.readdirSync(UPDATES_DIR) : []
    });
});

app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(UPDATES_DIR).map(file => {
            return {
                name: file,
                url: `/download/${encodeURIComponent(file)}`
            };
        });
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrer
app.listen(PORT, () => {
    console.log(`🚀 Serveur Zendariom démarré sur le port ${PORT}`);
    console.log(`📁 Dossier: ${UPDATES_DIR}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`⬇️  Endpoint: http://localhost:${PORT}/download/`);
});
