require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/tmp/' });
const db = new sqlite3.Database('images.db');

// Initialize database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        filename TEXT,
        originalName TEXT,
        uploaderIP TEXT,
        uploadDate DATETIME,
        deleteDate DATETIME
    )`);
});

// Security middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// File processing and validation
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        // Validate upload
        if (!req.file) throw new Error('No file uploaded');
        if (req.file.size > 5 * 1024 * 1024) throw new Error('File too large (max 5MB)');

        // Check upload limits
        const ip = req.ip;
        const uploadCount = await new Promise(resolve => {
            db.get(`SELECT COUNT(*) as count FROM images 
                   WHERE uploaderIP = ? AND uploadDate > datetime('now','-1 day')`, 
                   [ip], (err, row) => resolve(row?.count || 0));
        });

        if (uploadCount >= 10) {
            throw new Error('Daily upload limit reached');
        }

        // Process image
        const fileId = uuidv4();
        const processedFile = path.join('uploads', `${fileId}.webp`);
        
        await sharp(req.file.path)
            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(processedFile);

        // Cleanup and store metadata
        fs.unlinkSync(req.file.path);
        const deleteDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

        db.run(`INSERT INTO images VALUES (?, ?, ?, ?, datetime('now'), ?)`, 
              [fileId, `${fileId}.webp`, req.file.originalname, ip, deleteDate]);

        res.json({ 
            success: true, 
            url: `${process.env.BASE_URL}/${fileId}.webp`
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Auto-deletion job
setInterval(() => {
    db.run(`DELETE FROM images WHERE deleteDate < datetime('now')`, (err) => {
        if (!err) console.log('Cleaned expired images');
    });
}, 3600000); // Run hourly

app.use(express.static('public'));
app.listen(3000, () => console.log('Server running on port 3000'));
