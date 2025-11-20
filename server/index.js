import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import sqlite3 from 'sqlite3';
const { verbose } = sqlite3;
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@skytech.mk';

// Domain Management
// In production, set CORS_ORIGIN to "https://snapify.skytech.mk" or "http://192.168.20.153"
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';

// MinIO / S3 Config
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://192.168.20.153:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'snapify-media';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';

const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY
    },
    forcePathStyle: true // Required for MinIO
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ extended: true }));

// Local Temp Storage for Processing
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
} else {
    // Boot Cleanup: Remove leftover temp files from previous crashes
    fs.readdir(uploadDir, (err, files) => {
        if (err) console.log(err);
        else {
            for (const file of files) {
                fs.unlink(path.join(uploadDir, file), err => {
                    if (err) console.error(`Failed to clean temp file ${file}`);
                });
            }
            console.log(`Cleaned ${files.length} temp files from startup.`);
        }
    });
}

// Database Setup
const dbPath = path.join(__dirname, 'snapify.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('DB Error', err);
    else console.log('Connected to SQLite database');
});

// Initialize Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        role TEXT,
        tier TEXT,
        storageUsedMb REAL DEFAULT 0,
        storageLimitMb REAL,
        joinedDate TEXT,
        studioName TEXT,
        logoUrl TEXT,
        watermarkOpacity REAL,
        watermarkSize REAL,
        watermarkPosition TEXT,
        watermarkOffsetX REAL,
        watermarkOffsetY REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        date TEXT,
        hostId TEXT,
        code TEXT,
        coverImage TEXT,
        coverMediaType TEXT,
        expiresAt TEXT,
        pin TEXT,
        views INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        FOREIGN KEY(hostId) REFERENCES users(id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        eventId TEXT,
        type TEXT,
        url TEXT,
        previewUrl TEXT,
        isProcessing INTEGER DEFAULT 0,
        caption TEXT,
        uploadedAt TEXT,
        uploaderName TEXT,
        isWatermarked INTEGER,
        watermarkText TEXT,
        likes INTEGER DEFAULT 0,
        FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS guestbook (
        id TEXT PRIMARY KEY,
        eventId TEXT,
        senderName TEXT,
        message TEXT,
        createdAt TEXT,
        FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE
    )`);
});

// File Upload Middleware (Save to disk temporarily)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- TRANSCODING QUEUE ---
// Limit concurrent FFmpeg processes to prevent CPU crash on Proxmox
class VideoQueue {
    constructor(concurrency = 1) {
        this.queue = [];
        this.active = 0;
        this.concurrency = concurrency;
    }

    add(task) {
        this.queue.push(task);
        this.process();
    }

    process() {
        if (this.active >= this.concurrency || this.queue.length === 0) return;
        
        this.active++;
        const task = this.queue.shift();
        
        task().finally(() => {
            this.active--;
            this.process();
        });
    }
}
// Initialize queue with 1 concurrent video process
const videoQueue = new VideoQueue(1);


// --- HELPER FUNCTIONS ---

// Upload file from local disk to S3, then delete local
// Robust error handling for MinIO downtime/backups
async function uploadToS3(filePath, key, contentType) {
    try {
        const fileStream = fs.createReadStream(filePath);
        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: contentType
        };
        await s3Client.send(new PutObjectCommand(uploadParams));
        return key;
    } catch (err) {
        // Detect MinIO Downtime (Connection Refused, Timeout, etc.)
        if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.code === 'NetworkingError') {
            console.error(`MinIO Unreachable (Backup/Shutdown?): ${err.message}`);
            throw new Error('Storage Service Unavailable. Please try again later.');
        }
        
        console.error("S3 Upload Error:", err);
        throw new Error('Failed to upload media to storage.');
    } finally {
        // Always clean up local file to prevent disk filling on Proxmox
        // even if the upload to S3 failed.
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete temp file: ${filePath}`, err);
            });
        }
    }
}

// Generate Presigned URL for a Key
async function generatePresignedUrl(key) {
    if (!key) return null;
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: key
        });
        // URL valid for 1 hour (3600 seconds)
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (err) {
        console.error(`Error generating signed URL for ${key}:`, err.message);
        // Return null so the frontend handles the missing image gracefully
        // instead of crashing the whole request
        return null;
    }
}

// Attach Signed URLs to media objects
async function attachSignedUrls(mediaList) {
    return Promise.all(mediaList.map(async (m) => {
        const signedUrl = await generatePresignedUrl(m.url); // m.url holds the S3 Key
        const signedPreview = m.previewUrl ? await generatePresignedUrl(m.previewUrl) : null;
        return {
            ...m,
            url: signedUrl || m.url, // Fallback if fails
            previewUrl: signedPreview || m.previewUrl,
            s3Key: m.url // Keep reference to key if needed
        };
    }));
}

// --- SOCKET IO ---
io.on('connection', (socket) => {
    socket.on('join_event', (eventId) => {
        socket.join(eventId);
    });
});

// --- API ENDPOINTS ---

// Health Check
app.get('/api/health', async (req, res) => {
    // Check DB
    const dbStatus = db.open ? 'connected' : 'disconnected';
    // Check S3 (Optional: lightweight check)
    let s3Status = 'unknown';
    try {
        // Listing objects with max 1 item just to check connectivity
        // await s3Client.send(new ListObjectsCommand({ Bucket: S3_BUCKET, MaxKeys: 1 }));
        // s3Status = 'connected';
        // Commented out to keep health check fast, but you can enable strict checking
        s3Status = 'unchecked';
    } catch (e) {
        s3Status = 'error';
    }

    res.json({ 
        status: 'ok', 
        uptime: process.uptime(), 
        db: dbStatus, 
        s3: s3Status 
    });
});

// Users
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    const user = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [user.email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json(row);
        } else {
            const stmt = db.prepare(`INSERT INTO users (
                id, name, email, role, tier, storageUsedMb, storageLimitMb, joinedDate, studioName
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            
            stmt.run(
                user.id, user.name, user.email, user.role, user.tier, 
                user.storageUsedMb, user.storageLimitMb, user.joinedDate, user.studioName,
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(user);
                }
            );
            stmt.finalize();
        }
    });
});

app.put('/api/users/:id', (req, res) => {
    const u = req.body;
    const stmt = db.prepare(`UPDATE users SET 
        name=?, role=?, tier=?, storageUsedMb=?, storageLimitMb=?, studioName=?, 
        logoUrl=?, watermarkOpacity=?, watermarkSize=?, watermarkPosition=?, 
        watermarkOffsetX=?, watermarkOffsetY=?
        WHERE id=?`);
    
    stmt.run(
        u.name, u.role, u.tier, u.storageUsedMb, u.storageLimitMb, u.studioName,
        u.logoUrl, u.watermarkOpacity, u.watermarkSize, u.watermarkPosition,
        u.watermarkOffsetX, u.watermarkOffsetY, req.params.id,
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
    stmt.finalize();
});

app.delete('/api/users/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id=?", req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Events
app.get('/api/events', (req, res) => {
    // Get user ID from query parameter for access control
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }

    // Get user role to determine access level
    db.get("SELECT role FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let query = "SELECT * FROM events";
        let params = [];

        // Admin users can see all events
        if (user.role !== 'admin') {
            // Regular users can only see their own events and events they've been invited to via shared links
            // For now, we'll only show events they own. Shared events are handled via direct links.
            query = "SELECT * FROM events WHERE hostId = ?";
            params = [userId];
        }

        db.all(query, params, async (err, events) => {
            if (err) return res.status(500).json({ error: err.message });
            
            try {
                const detailedEvents = await Promise.all(events.map(async (evt) => {
                    // Resolve Media
                    const media = await new Promise((resolve) => {
                        db.all("SELECT * FROM media WHERE eventId = ? ORDER BY uploadedAt DESC", [evt.id], (err, rows) => resolve(rows || []));
                    });
                    
                    // Resolve Guestbook
                    const guestbook = await new Promise((resolve) => {
                        db.all("SELECT * FROM guestbook WHERE eventId = ? ORDER BY createdAt DESC", [evt.id], (err, rows) => resolve(rows || []));
                    });

                    // Sign Media URLs
                    const signedMedia = await attachSignedUrls(media);
                    
                    // Sign Cover Image if it exists (assuming it's a key)
                    let signedCover = evt.coverImage;
                    if (evt.coverImage && !evt.coverImage.startsWith('http') && !evt.coverImage.startsWith('data:')) {
                        signedCover = await generatePresignedUrl(evt.coverImage);
                    }

                    return { ...evt, media: signedMedia, guestbook, coverImage: signedCover };
                }));
                
                res.json(detailedEvents);
            } catch (e) {
                console.error("Failed to generate signed URLs during event fetch:", e);
                // Return events anyway, even if some URLs failed to sign (they will appear broken in UI but app won't crash)
                res.status(500).json({ error: 'Failed to retrieve event data from storage.' });
            }
        });
    });
});

app.post('/api/events/:id/validate-pin', (req, res) => {
    const { pin } = req.body;
    db.get("SELECT pin FROM events WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Event not found" });
        res.json({ success: (!row.pin || row.pin === pin) });
    });
});

app.post('/api/events', (req, res) => {
    const e = req.body;
    const stmt = db.prepare(`INSERT INTO events (
        id, title, description, date, hostId, code, expiresAt, pin, views, downloads
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run(e.id, e.title, e.description, e.date, e.hostId, e.code, e.expiresAt, e.pin, 0, 0, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(e);
    });
    stmt.finalize();
});

app.put('/api/events/:id', (req, res) => {
    const e = req.body;
    
    const stmt = db.prepare(`UPDATE events SET 
        title=?, description=?, coverImage=?, coverMediaType=?, expiresAt=?, views=?, downloads=?
        WHERE id=?`);
    
    stmt.run(e.title, e.description, e.coverImage, e.coverMediaType, e.expiresAt, e.views, e.downloads, req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/events/:id', (req, res) => {
    // Note: Deleting media objects from S3 for the event is skipped here for simplicity,
    // but could be implemented by querying all media for this event and calling DeleteObject.
    db.run("DELETE FROM events WHERE id=?", req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Guestbook
app.post('/api/guestbook', (req, res) => {
    const g = req.body;
    const stmt = db.prepare(`INSERT INTO guestbook (
        id, eventId, senderName, message, createdAt
    ) VALUES (?, ?, ?, ?, ?)`);
    
    stmt.run(g.id, g.eventId, g.senderName, g.message, g.createdAt, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        io.to(g.eventId).emit('new_message', g);
        res.json(g);
    });
    stmt.finalize();
});

// Media Upload
app.post('/api/media', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const body = req.body;
    const isVideo = body.type === 'video';
    const ext = path.extname(req.file.originalname);
    const s3Key = `events/${body.eventId}/${body.id}${ext}`; // Clean hierarchy
    
    // Initial DB Insert
    const stmt = db.prepare(`INSERT INTO media (
        id, eventId, type, url, previewUrl, isProcessing, caption, uploadedAt, uploaderName, isWatermarked, watermarkText, likes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // 1. Upload Image immediately to S3
    if (!isVideo) {
        try {
            await uploadToS3(req.file.path, s3Key, req.file.mimetype);
            
            stmt.run(
                body.id, body.eventId, body.type, s3Key, '', 0, body.caption, 
                body.uploadedAt, body.uploaderName, body.isWatermarked === 'true' ? 1 : 0, 
                body.watermarkText, 0,
                async (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Generate signed URL for immediate display
                    const signedUrl = await generatePresignedUrl(s3Key);
                    
                    const mediaItem = { 
                        id: body.id, eventId: body.eventId, url: signedUrl, type: body.type, 
                        caption: body.caption, isProcessing: false, uploadedAt: body.uploadedAt, 
                        uploaderName: body.uploaderName, likes: 0 
                    };
                    io.to(body.eventId).emit('media_uploaded', mediaItem);
                    res.json(mediaItem);
                }
            );
            stmt.finalize();
        } catch (e) {
            // Handle the S3 error gracefully
            // The temp file is already deleted by uploadToS3's finally block
            const isServiceUnavailable = e.message.includes('Service Unavailable');
            const status = isServiceUnavailable ? 503 : 500;
            res.status(status).json({ error: e.message });
        }
    } 
    // 2. Handle Video (Transcode first, then upload)
    else {
        // Save initial state with isProcessing=1, url=s3Key (placeholder)
        stmt.run(
            body.id, body.eventId, body.type, s3Key, '', 1, body.caption, 
            body.uploadedAt, body.uploaderName, body.isWatermarked === 'true' ? 1 : 0, 
            body.watermarkText, 0,
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Notify client processing started
                const mediaItem = { 
                    id: body.id, eventId: body.eventId, url: '', type: body.type, 
                    caption: body.caption, isProcessing: true, uploadedAt: body.uploadedAt, 
                    uploaderName: body.uploaderName, likes: 0 
                };
                io.to(body.eventId).emit('media_uploaded', mediaItem);
                res.json(mediaItem);

                // Add to Transcoding Queue
                videoQueue.add(async () => {
                    const inputPath = req.file.path;
                    const outputFilename = `preview_${path.parse(req.file.filename).name}.mp4`;
                    const outputPath = path.join(uploadDir, outputFilename);
                    const previewKey = `events/${body.eventId}/preview_${body.id}.mp4`;

                    return new Promise((resolve, reject) => {
                        console.log(`Start Transcoding: ${body.id}`);
                        const ffmpeg = spawn('ffmpeg', [
                            '-i', inputPath,
                            '-vf', 'scale=-2:720',
                            '-c:v', 'libx264',
                            '-crf', '23',
                            '-preset', 'fast', // 'ultrafast' if cpu is very weak
                            '-c:a', 'aac',
                            '-b:a', '128k',
                            '-y',
                            outputPath
                        ]);

                        ffmpeg.on('close', async (code) => {
                            if (code === 0) {
                                // Transcoding done. Upload BOTH original and preview to S3
                                try {
                                    await Promise.all([
                                        uploadToS3(inputPath, s3Key, req.file.mimetype),
                                        uploadToS3(outputPath, previewKey, 'video/mp4')
                                    ]);

                                    // Update DB
                                    db.run("UPDATE media SET isProcessing = 0, previewUrl = ? WHERE id = ?", [previewKey, body.id], async (err) => {
                                        if (!err) {
                                            const signedPreview = await generatePresignedUrl(previewKey);
                                            const signedOriginal = await generatePresignedUrl(s3Key);
                                            io.to(body.eventId).emit('media_processed', { 
                                                id: body.id, 
                                                previewUrl: signedPreview,
                                                url: signedOriginal
                                            });
                                        }
                                    });
                                    console.log(`Finished Transcoding: ${body.id}`);
                                    resolve();
                                } catch (e) {
                                    console.error("Failed to upload video to S3 (Video Processing Failed)", e);
                                    // Consider emitting a 'media_failed' socket event here in the future
                                    // Cleanup handled by uploadToS3
                                    reject(e);
                                }
                            } else {
                                console.error("FFmpeg failed");
                                // Clean up source file since uploadToS3 wasn't called
                                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                                reject("FFmpeg Error");
                            }
                        });
                    });
                });
            }
        );
        stmt.finalize();
    }
});

app.put('/api/media/:id/like', (req, res) => {
    db.run("UPDATE media SET likes = likes + 1 WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT eventId, likes FROM media WHERE id = ?", req.params.id, (err, row) => {
            if (row) {
                io.to(row.eventId).emit('new_like', { id: req.params.id, likes: row.likes });
            }
        });
        res.json({ success: true });
    });
});

app.delete('/api/media/:id', (req, res) => {
    db.get("SELECT url, previewUrl FROM media WHERE id = ?", req.params.id, async (err, row) => {
        if (row) {
            // Delete from S3
            try {
                if (row.url) await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: row.url }));
                if (row.previewUrl) await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: row.previewUrl }));
            } catch (e) { 
                // If S3 is down, we log it but still allow DB deletion so the user dashboard stays clean
                console.error("S3 Delete Error (Object might be orphaned):", e.message);
            }
        }
        db.run("DELETE FROM media WHERE id = ?", req.params.id, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Listen
server.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Allowed Origins: ${ALLOWED_ORIGINS}`);
    console.log(`S3 Endpoint: ${S3_ENDPOINT} | Bucket: ${S3_BUCKET} (Private Mode)`);
});
