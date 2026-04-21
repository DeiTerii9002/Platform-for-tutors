// =============================================
// School Help - Серверная часть
// Файл: server.js
// =============================================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const SECRET_KEY = 'school-help-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключение к базе данных
const db = new sqlite3.Database('./school_help.db', (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        initDatabase();
    }
});

// =============================================
// ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
// =============================================

function initDatabase() {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL CHECK(role IN ('student', 'mentor')),
        bio TEXT,
        rating REAL DEFAULT 0,
        thanks_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица предметов наставников
    db.run(`CREATE TABLE IF NOT EXISTS mentor_subjects (
        mentor_id INTEGER,
        subject TEXT,
        PRIMARY KEY (mentor_id, subject),
        FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Таблица тестов
    db.run(`CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
        questions_count INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица вопросов
    db.run(`CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        answer1 TEXT NOT NULL,
        answer2 TEXT NOT NULL,
        answer3 TEXT NOT NULL,
        answer4 TEXT NOT NULL,
        correct_answer INTEGER CHECK(correct_answer BETWEEN 0 AND 3),
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )`);

    // Таблица результатов тестов
    db.run(`CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        test_id INTEGER NOT NULL,
        score INTEGER,
        correct_answers INTEGER,
        total_questions INTEGER,
        earned_points INTEGER,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (test_id) REFERENCES tests(id)
    )`);

    // Таблица материалов
    db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT CHECK(type IN ('conspect', 'video')),
        subject TEXT NOT NULL,
        description TEXT,
        author_id INTEGER NOT NULL,
        file_name TEXT,
        file_size REAL,
        duration INTEGER,
        pages INTEGER,
        views INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id)
    )`);

    // Таблица занятий
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        student_id INTEGER NOT NULL,
        mentor_id INTEGER NOT NULL,
        date_time DATETIME NOT NULL,
        duration INTEGER DEFAULT 60,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (mentor_id) REFERENCES users(id)
    )`);

    // Таблица благодарностей
    db.run(`CREATE TABLE IF NOT EXISTS thanks (
        user_id INTEGER,
        mentor_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, mentor_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (mentor_id) REFERENCES users(id)
    )`);

    // Таблица баллов пользователей
    db.run(`CREATE TABLE IF NOT EXISTS user_points (
        user_id INTEGER PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    console.log('✅ Таблицы созданы/проверены');
    
    // Добавляем демо-данные
    insertDemoData();
}

// =============================================
// ДЕМО-ДАННЫЕ
// =============================================

function insertDemoData() {
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err || row.count > 0) return;

        const demoUsers = [
            { username: 'Roman', email: 'roman@example.com', password: 'password123', role: 'student', thanks: 30508, rating: 4.9 },
            { username: 'Anastasia', email: 'anastasia@example.com', password: 'password123', role: 'mentor', thanks: 25099, rating: 4.8, subjects: ['math', 'physics'] },
            { username: 'Miron', email: 'miron@example.com', password: 'password123', role: 'mentor', thanks: 20184, rating: 4.9, subjects: ['chemistry', 'biology'] },
            { username: 'Andrew', email: 'andrew@example.com', password: 'password123', role: 'student', thanks: 16873, rating: 4.7 }
        ];

        const stmt = db.prepare(`INSERT INTO users (username, email, password, role, thanks_count, rating) VALUES (?, ?, ?, ?, ?, ?)`);
        
        demoUsers.forEach(user => {
            const hashedPassword = bcrypt.hashSync(user.password, 10);
            stmt.run(user.username, user.email, hashedPassword, user.role, user.thanks, user.rating, function(err) {
                if (!err && user.role === 'mentor' && user.subjects) {
                    const subjectStmt = db.prepare(`INSERT INTO mentor_subjects (mentor_id, subject) VALUES (?, ?)`);
                    user.subjects.forEach(sub => subjectStmt.run(this.lastID, sub));
                    subjectStmt.finalize();
                }
                if (!err) {
                    db.run(`INSERT INTO user_points (user_id, balance) VALUES (?, ?)`, [this.lastID, Math.floor(Math.random() * 500)]);
                }
            });
        });
        stmt.finalize();

        // Добавляем тесты
        const tests = [
            { title: 'Арифметика и основы алгебры', subject: 'math', difficulty: 'easy', points: 50 },
            { title: 'Законы Ньютона', subject: 'physics', difficulty: 'medium', points: 40 },
            { title: 'Периодическая таблица', subject: 'chemistry', difficulty: 'hard', points: 60 },
            { title: 'Строение клетки', subject: 'biology', difficulty: 'medium', points: 50 }
        ];

        tests.forEach(test => {
            db.run(`INSERT INTO tests (title, subject, difficulty, points) VALUES (?, ?, ?, ?)`,
                [test.title, test.subject, test.difficulty, test.points]);
        });

        console.log('✅ Демо-данные добавлены');
    });
}

// =============================================
// МИДДЛВЭР АУТЕНТИФИКАЦИИ
// =============================================

function authenticate(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Неверный токен' });
        }
        req.user = decoded;
        next();
    });
}

// =============================================
// API ЭНДПОИНТЫ
// =============================================

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, email, password, phone, role, subjects } = req.body;
    
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }
    
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(`INSERT INTO users (username, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, phone, role], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Пользователь с таким логином или email уже существует' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            const userId = this.lastID;
            db.run(`INSERT INTO user_points (user_id, balance) VALUES (?, 0)`, [userId]);
            
            if (role === 'mentor' && subjects && subjects.length > 0) {
                const subjectStmt = db.prepare(`INSERT INTO mentor_subjects (mentor_id, subject) VALUES (?, ?)`);
                subjects.forEach(sub => subjectStmt.run(userId, sub));
                subjectStmt.finalize();
            }
            
            res.json({ id: userId, username, email, role });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    
    db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
        
        if (user.role === 'mentor') {
            db.all(`SELECT subject FROM mentor_subjects WHERE mentor_id = ?`, [user.id], (err, subjects) => {
                user.subjects = subjects.map(s => s.subject);
                const { password, ...userWithoutPassword } = user;
                res.json({ token, user: userWithoutPassword });
            });
        } else {
            const { password, ...userWithoutPassword } = user;
            res.json({ token, user: userWithoutPassword });
        }
    });
});

// Получить профиль
app.get('/api/profile', authenticate, (req, res) => {
    db.get(`
        SELECT u.*, up.balance as points 
        FROM users u 
        LEFT JOIN user_points up ON u.id = up.user_id 
        WHERE u.id = ?
    `, [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (user.role === 'mentor') {
            db.all(`SELECT subject FROM mentor_subjects WHERE mentor_id = ?`, [user.id], (err, subjects) => {
                user.subjects = subjects.map(s => s.subject);
                const { password, ...userWithoutPassword } = user;
                res.json(userWithoutPassword);
            });
        } else {
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        }
    });
});

// Обновить профиль
app.put('/api/profile', authenticate, (req, res) => {
    const { phone, bio, price_per_hour, education, experience_years, subjects } = req.body;
    
    db.run(`UPDATE users SET phone = ?, bio = ? WHERE id = ?`, [phone, bio, req.user.id], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (req.user.role === 'mentor') {
            db.run(`DELETE FROM mentor_subjects WHERE mentor_id = ?`, [req.user.id]);
            
            if (subjects && subjects.length > 0) {
                const subjectStmt = db.prepare(`INSERT INTO mentor_subjects (mentor_id, subject) VALUES (?, ?)`);
                subjects.forEach(sub => subjectStmt.run(req.user.id, sub));
                subjectStmt.finalize();
            }
        }
        
        res.json({ success: true });
    });
});

// Получить рейтинг наставников
app.get('/api/mentors/rating', (req, res) => {
    db.all(`
        SELECT u.id, u.username, u.rating, u.thanks_count,
               GROUP_CONCAT(ms.subject) as subjects
        FROM users u
        LEFT JOIN mentor_subjects ms ON u.id = ms.mentor_id
        WHERE u.role = 'mentor'
        GROUP BY u.id
        ORDER BY u.thanks_count DESC
        LIMIT 10
    `, (err, mentors) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(mentors);
    });
});

// Получить тесты
app.get('/api/tests', (req, res) => {
    db.all(`
        SELECT t.*, COUNT(q.id) as actual_questions
        FROM tests t
        LEFT JOIN questions q ON t.id = q.test_id
        GROUP BY t.id
    `, (err, tests) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(tests);
    });
});

// Получить тест с вопросами
app.get('/api/tests/:id', (req, res) => {
    const testId = req.params.id;
    
    db.get(`SELECT * FROM tests WHERE id = ?`, [testId], (err, test) => {
        if (err || !test) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        db.all(`SELECT * FROM questions WHERE test_id = ?`, [testId], (err, questions) => {
            test.questions = questions;
            res.json(test);
        });
    });
});

// Сохранить результат теста
app.post('/api/tests/:id/submit', authenticate, (req, res) => {
    const testId = req.params.id;
    const { score, correct, total, earned_points } = req.body;
    const userId = req.user.id;
    
    db.run(`
        INSERT INTO test_results (user_id, test_id, score, correct_answers, total_questions, earned_points)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, testId, score, correct, total, earned_points], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        db.run(`UPDATE user_points SET balance = balance + ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?`, [earned_points, userId]);
        
        res.json({ success: true, earned_points });
    });
});

// Получить историю тестов
app.get('/api/history', authenticate, (req, res) => {
    db.all(`
        SELECT tr.*, t.title as test_title
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.user_id = ?
        ORDER BY tr.completed_at DESC
    `, [req.user.id], (err, history) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(history);
    });
});

// Получить материалы
app.get('/api/materials', (req, res) => {
    const { subject, type, search } = req.query;
    let query = `
        SELECT m.*, u.username as author_name
        FROM materials m
        JOIN users u ON m.author_id = u.id
        WHERE m.status = 'approved'
    `;
    const params = [];
    
    if (subject) {
        query += ` AND m.subject = ?`;
        params.push(subject);
    }
    if (type) {
        query += ` AND m.type = ?`;
        params.push(type);
    }
    if (search) {
        query += ` AND m.title LIKE ?`;
        params.push(`%${search}%`);
    }
    
    query += ` ORDER BY m.created_at DESC`;
    
    db.all(query, params, (err, materials) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(materials);
    });
});

// Загрузить материал
app.post('/api/materials', authenticate, (req, res) => {
    const { title, type, subject, description, file_name, file_size, duration, pages } = req.body;
    
    if (!title || !type || !subject) {
        return res.status(400).json({ error: 'Название, тип и предмет обязательны' });
    }
    
    db.run(`
        INSERT INTO materials (title, type, subject, description, author_id, file_name, file_size, duration, pages)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, type, subject, description, req.user.id, file_name, file_size, duration, pages], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, success: true });
    });
});

// Получить занятия пользователя
app.get('/api/sessions', authenticate, (req, res) => {
    db.all(`
        SELECT s.*, 
               s1.username as student_name,
               s2.username as mentor_name
        FROM sessions s
        JOIN users s1 ON s.student_id = s1.id
        JOIN users s2 ON s.mentor_id = s2.id
        WHERE s.student_id = ? OR s.mentor_id = ?
        ORDER BY s.date_time ASC
    `, [req.user.id, req.user.id], (err, sessions) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(sessions);
    });
});

// Создать занятие
app.post('/api/sessions', authenticate, (req, res) => {
    const { subject, student_id, mentor_id, date_time, duration, notes } = req.body;
    
    if (!subject || !student_id || !mentor_id || !date_time) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    db.run(`
        INSERT INTO sessions (subject, student_id, mentor_id, date_time, duration, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [subject, student_id, mentor_id, date_time, duration, notes], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, success: true });
    });
});

// Сказать спасибо наставнику
app.post('/api/thanks/:mentorId', authenticate, (req, res) => {
    const mentorId = req.params.mentorId;
    const userId = req.user.id;
    
    if (userId == mentorId) {
        return res.status(400).json({ error: 'Нельзя сказать спасибо самому себе' });
    }
    
    db.run(`INSERT INTO thanks (user_id, mentor_id) VALUES (?, ?)`, [userId, mentorId], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Вы уже говорили спасибо этому наставнику' });
        }
        
        db.run(`UPDATE users SET thanks_count = thanks_count + 1 WHERE id = ?`, [mentorId]);
        res.json({ success: true });
    });
});

// Получить баллы пользователя
app.get('/api/points', authenticate, (req, res) => {
    db.get(`SELECT balance FROM user_points WHERE user_id = ?`, [req.user.id], (err, points) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ points: points ? points.balance : 0 });
    });
});

// =============================================
// ЗАПУСК СЕРВЕРА
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🎓 School Help Server запущен!                         ║
║                                                          ║
║   📍 Локальный адрес: http://localhost:${PORT}            ║
║   📍 Открыть сайт: http://localhost:${PORT}/rep1.html     ║
║                                                          ║
║   ✅ База данных: school_help.db                         ║
║   ✅ API доступен по адресу: http://localhost:${PORT}/api   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});