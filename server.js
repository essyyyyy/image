const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const app = express();
const port = process.env.PORT || 3000;

// Setup file upload storage with multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Store image metadata in-memory (could be a database in production)
let images = [];
let uploadCount = {};

app.use(express.static('public'));

// Handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
    const ip = req.ip;
    if (!uploadCount[ip]) uploadCount[ip] = 0;

    // Limit uploads to 10 per day
    if (uploadCount[ip] >= 10) {
        return res.json({ success: false, message: "You have reached the upload limit." });
    }

    // Track image metadata
    const image = {
        id: Date.now(),
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        timestamp: moment().toISOString()
    };
    images.push(image);
    uploadCount[ip]++;

    res.json({ success: true, image: image });
});

// Serve gallery
app.get('/gallery', (req, res) => {
    res.json({ images: images });
});

// Delete image
app.delete('/delete/:id', (req, res) => {
    const imageId = parseInt(req.params.id);
    images = images.filter(img => img.id !== imageId);

    // Remove file from disk
    const image = images.find(img => img.id === imageId);
    if (image) {
        fs.unlinkSync(path.join(__dirname, 'uploads', image.filename));
    }

    res.json({ success: true });
});

// Delete images older than 1 day
setInterval(() => {
    const oneDayAgo = moment().subtract(1, 'days');
    images = images.filter(img => moment(img.timestamp).isAfter(oneDayAgo));
}, 3600000); // Run every hour

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
