const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('./db');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'audio')));

app.use(express.json()); // Built-in body parser for JSON
app.use(express.urlencoded({ extended: true })); // For URL-encoded data


// Configure multer for file uploads
// Configure multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            // Save images to the 'images' directory
            cb(null, 'images/');
        },
        filename: (req, file, cb) => {
            // Keep the original filename
            cb(null, file.originalname); // Save with original file name
        }
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
});


// API to fetch books with optional filters
app.get('/api/books', async (req, res) => {
    const { language, subject, author, search } = req.query;
    let query = 'SELECT * FROM book WHERE 1=1';
    const params = [];

    // Apply filters based on query parameters
    if (language) {
        query += ' AND language = ?';
        params.push(language);
    }
    if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
    }
    if (author) {
        query += ' AND author = ?';
        params.push(author);
    }
    if (search) {
        query += ' AND name LIKE ?';
        params.push(`%${search}%`);
    }

    try {
        const [books] = await db.query(query, params);
        res.json(books);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// API to fetch chapters for a book
app.get('/api/books/:id/chapters', async (req, res) => {
    const bookId = req.params.id;
    try {
        const [chapters] = await db.query('SELECT * FROM chapters WHERE book_id = ?', [bookId]);
        res.json(chapters);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// API to fetch distinct filter options (author, language, subject)
app.get('/api/filters', async (req, res) => {
    try {
        const [authors] = await db.query('SELECT DISTINCT author FROM book');
        const [languages] = await db.query('SELECT DISTINCT language FROM book');
        const [subjects] = await db.query('SELECT DISTINCT subject FROM book');
        
        res.json({
            authors: authors.map(a => a.author),
            languages: languages.map(l => l.language),
            subjects: subjects.map(s => s.subject)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// API to handle book upload
app.post('/api/upload/book', upload.single('image'), async (req, res) => {
    const { name, author, subject, language } = req.body;
    const image = req.file;

    if (!image) {
        return res.status(400).send('Image file is required!');
    }

    // Save book data to the database
    try {
        const imageLink = `${image.originalname}`; // Use original filename in the link
        const [result] = await db.query('INSERT INTO book (name, author, subject, language, image_link) VALUES (?, ?, ?, ?, ?)', [
            name, author, subject, language, imageLink
        ]);
        
        res.status(200).send('Book uploaded successfully!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading book!');
    }
});


// API to handle chapter upload
app.post('/api/upload/chapter', upload.single('audio'), async (req, res) => {
    const { chapter_name, chapter_number, book_id } = req.body;
    const audio = req.file;

    if (!audio) {
        return res.status(400).send('Audio file is required!');
    }

    // Save chapter data to the database
    try {
        const audioLink = `/audio/${audio.filename}`;
        const [result] = await db.query('INSERT INTO chapters (book_id, chapter_name, chapter_number, audio_link) VALUES (?, ?, ?, ?)', [
            book_id, chapter_name, chapter_number, audioLink
        ]);
        
        res.status(200).send('Chapter uploaded successfully!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading chapter!');
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// Fetch all suggestions
app.get('/api/suggestions', async (req, res) => {
    try {
        const [suggestions] = await db.query('SELECT * FROM comments ORDER BY created_at DESC');
        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching suggestions.');
    }
});

// Submit a new suggestion
app.post('/api/suggestions', async (req, res) => {
    const { comment_text } = req.body;
    if (!comment_text) {
        return res.status(400).send('Suggestion text is required.');
    }

    try {
        await db.query('INSERT INTO comments (comment_text) VALUES (?)', [comment_text]);
        res.status(200).send('Suggestion submitted.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error submitting suggestion.');
    }
});

