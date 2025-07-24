const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 80;
const cors = require('cors');

app.use(express.json());
// app.use(cors());

// Use full CORS config
app.use(cors({
    origin: '*', // Or restrict to ['http://localhost:5173'] if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Connect to SQLite DB
const dbPath = path.join(__dirname, 'data-db.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err);
    } else {
        console.log('Connected to SQLite database');
    }

    // Get Users
    app.get('/users', (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 5;
        const offset = (page - 1) * pageSize;
        // Count total records
        const countQuery = `SELECT COUNT(*) AS total FROM users`;
        // Get all users with pagination
        db.get(countQuery, [], (err, countResult) => {
            if (err) return res.status(500).json({ error: err });

            const totalRecords = countResult.total;
            const totalPages = Math.ceil(totalRecords / pageSize);

            const query = `
      SELECT 
        users.id, 
        users.name, 
        users.email,
        addresses.street || ', ' || addresses.city || ', ' || addresses.state || ' ' || addresses.zipcode AS address
      FROM users
      LEFT JOIN addresses ON addresses.user_id = users.id
      LIMIT ? OFFSET ?
    `;

            db.all(query, [pageSize, offset], (err, rows) => {
                if (err) return res.status(500).json({ error: err });

                res.json({
                    data: rows,
                    pagination: {
                        currentPage: page,
                        pageSize,
                        totalPages,
                        totalRecords
                    }
                });
            });
        });
    });

    // Get all Posts made by a user
    app.get('/users/:id/posts', (req, res) => {
        if (!req.params.id) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const userId = req.params.id;

        const query = `
    SELECT id, title, body, created_at
    FROM posts
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
  `;

        db.all(query, [userId], (err, rows) => {
            if (err) return res.status(500).json({ error: err });

            res.json({
                userId,
                data: rows
            });
        });
    });
});

// POST /users/:userId/posts
app.post('/users/posts/add/:userId', async (req, res) => {
    const { userId } = req.params;
    const { title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required.' });
    }

    try {
        const createdAt = new Date().toISOString();

        const insert = db.prepare(`
      INSERT INTO posts (user_id, title, body, created_at)
      VALUES (?, ?, ?, ?)
    `);

        const result = insert.run(userId, title, body, createdAt);

        res.status(201).json({
            message: "Post created successfully",
            data: {
                id: result.lastInsertRowid,
                userId,
                title,
                body,
                createdAt,
            },
        });

    } catch (err) {
        console.error('[DB ERROR]', err, err);
        res.status(500).json({ message: 'Internal Server Error', error: err });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
