-- =============================================
-- School Help Database Schema
-- =============================================

-- 1. Пользователи
CREATE TABLE users (
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
);

-- 2. Наставники (дополнительная информация)
CREATE TABLE mentors (
    user_id INTEGER PRIMARY KEY,
    price_per_hour INTEGER DEFAULT 0,
    education TEXT,
    experience_years INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Предметы наставников
CREATE TABLE mentor_subjects (
    mentor_id INTEGER,
    subject TEXT CHECK(subject IN ('math', 'physics', 'chemistry', 'biology', 'history', 'literature', 'geography', 'informatics')),
    PRIMARY KEY (mentor_id, subject),
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Тесты
CREATE TABLE tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
    questions_count INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 5. Вопросы к тестам
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer1 TEXT NOT NULL,
    answer2 TEXT NOT NULL,
    answer3 TEXT NOT NULL,
    answer4 TEXT NOT NULL,
    correct_answer INTEGER CHECK(correct_answer BETWEEN 0 AND 3),
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 6. История прохождения тестов
CREATE TABLE test_results (
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
);

-- 7. Материалы (конспекты и видео)
CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('conspect', 'video')),
    subject TEXT NOT NULL,
    description TEXT,
    author_id INTEGER NOT NULL,
    file_name TEXT,
    file_size REAL,
    duration INTEGER,  -- для видео (минуты)
    pages INTEGER,    -- для конспектов
    views INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 8. Занятия (сессии)
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    student_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    date_time DATETIME NOT NULL,
    duration INTEGER DEFAULT 60,  -- минуты
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (mentor_id) REFERENCES users(id)
);

-- 9. Отзывы на занятия
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- 10. Благодарности (лайки наставникам)
CREATE TABLE thanks (
    user_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, mentor_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (mentor_id) REFERENCES users(id)
);

-- 11. Баллы пользователей
CREATE TABLE user_points (
    user_id INTEGER PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 12. Достижения
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    required_points INTEGER
);

-- 13. Полученные достижения
CREATE TABLE user_achievements (
    user_id INTEGER,
    achievement_id INTEGER,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- =============================================
-- Индексы для быстрого поиска
-- =============================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_rating ON users(rating DESC);
CREATE INDEX idx_materials_subject ON materials(subject);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_mentor ON sessions(mentor_id);
CREATE INDEX idx_sessions_date ON sessions(date_time);
CREATE INDEX idx_test_results_user ON test_results(user_id);