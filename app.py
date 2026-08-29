from flask import Flask, render_template, request, jsonify
import sqlite3
import time
import os

app = Flask(__name__)
DB_NAME = 'database.db'

last_request_times = {}

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            coins INTEGER DEFAULT 3000,
            score INTEGER DEFAULT 0,
            achievements TEXT DEFAULT ''
        )
    ''')
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN achievements TEXT DEFAULT ""')
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    if not username:
        return jsonify({'status': 'error', 'message': 'اسم المستخدم مطلوب'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT username, coins, score, achievements FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()

    if not user:
        cursor.execute('INSERT INTO users (username, coins, score, achievements) VALUES (?, ?, ?, ?)', (username, 3000, 0, ''))
        conn.commit()
        coins, score, achievements = 3000, 0, ''
    else:
        username, coins, score, achievements = user['username'], user['coins'], user['score'], user['achievements']
    
    conn.close()
    return jsonify({
        'status': 'success', 
        'username': username, 
        'coins': coins, 
        'score': score,
        'achievements': achievements.split(',') if achievements else []
    })

@app.route('/api/save', methods=['POST'])
def save_progress():
    data = request.get_json() or {}
    username = data.get('username')
    coins = data.get('coins')
    score = data.get('score')
    achievements = data.get('achievements', [])

    if not username or coins is None or score is None:
        return jsonify({'status': 'error', 'message': 'بيانات غير مكتملة'}), 400

    now = time.time()
    if username in last_request_times and now - last_request_times[username] < 0.8:
        return jsonify({'status': 'error', 'message': 'تمهل في الطلبات'}), 429
    last_request_times[username] = now

    ach_str = ','.join(achievements)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users 
        SET coins = ?, score = MAX(score, ?), achievements = ? 
        WHERE username = ?
    ''', (coins, score, ach_str, username))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT username, score FROM users ORDER BY score DESC LIMIT 10')
    rows = cursor.fetchall()
    conn.close()
    return jsonify([{'username': r['username'], 'score': r['score']} for r in rows])

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)