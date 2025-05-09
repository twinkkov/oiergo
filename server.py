from flask import Flask, request, jsonify
import sqlite3
import os

app = Flask(__name__)

# Путь к базе данных
db_path = os.path.join(os.getcwd(), 'database.db')

# Инициализация базы данных
def init_db():
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                coins INTEGER NOT NULL
            )
        ''')
        conn.commit()

# Маршрут для получения данных лидерборда
@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT name, coins FROM leaderboard ORDER BY coins DESC LIMIT 10')
        rows = cursor.fetchall()
        return jsonify(rows)

# Маршрут для добавления или обновления игрока
@app.route('/leaderboard', methods=['POST'])
def update_leaderboard():
    data = request.get_json()
    name = data.get('name')
    coins = data.get('coins')

    if not name or coins is None:
        return jsonify({'error': 'Invalid data'}), 400

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO leaderboard (name, coins)
            VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET coins=excluded.coins
        ''', (name, coins))
        conn.commit()

    return jsonify({'message': 'Leaderboard updated successfully'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)