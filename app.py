from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime
import logging

# Logging konfiqurasiyası
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'riyazer-secret-key-2024'
app.config['UPLOAD_FOLDER'] = 'uploads'
CORS(app)

# Upload qovluğunu yarat
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

class RiyazerBot:
    def __init__(self):
        self.db_path = 'bot_data.db'
    
    def get_db_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_daily_question_by_date(self, date):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM daily_questions WHERE question_date = ?', (date,))
        question = cursor.fetchone()
        conn.close()
        return dict(question) if question else None
    
    def get_graded_questions(self, difficulty, user_id=None):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute('''
                SELECT * FROM graded_questions 
                WHERE difficulty = ? 
                AND id NOT IN (
                    SELECT question_id FROM answered_questions 
                    WHERE user_id = ? AND question_type = 'graded'
                )
                ORDER BY RANDOM()
            ''', (difficulty, user_id))
        else:
            cursor.execute('SELECT * FROM graded_questions WHERE difficulty = ? ORDER BY RANDOM()', (difficulty,))
        
        questions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return questions
    
    def register_student(self, user_data):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # İstifadəçinin artıq qeydiyyatdan keçib-keçmədiyini yoxla
        cursor.execute('SELECT * FROM students WHERE user_id = ?', (user_data['user_id'],))
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            return {'success': True, 'message': 'İstifadəçi artıq mövcuddur'}
        
        cursor.execute('''
            INSERT INTO students 
            (user_id, username, full_name, registration_date, last_activity_month)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user_data['user_id'],
            user_data['username'], 
            user_data['full_name'],
            datetime.now().isoformat(),
            datetime.now().strftime('%Y-%m')
        ))
        
        conn.commit()
        conn.close()
        return {'success': True, 'message': 'Uğurla qeydiyyatdan keçildi'}
    
    def check_answer(self, question_id, question_type, user_answer, user_id):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        if question_type == 'daily':
            cursor.execute('SELECT * FROM daily_questions WHERE id = ?', (question_id,))
        else:
            cursor.execute('SELECT * FROM graded_questions WHERE id = ?', (question_id,))
        
        question = cursor.fetchone()
        if not question:
            return {'correct': False, 'error': 'Sual tapılmadı'}
        
        correct_answer = question['answer']
        is_correct = user_answer.upper() == correct_answer.upper()
        
        # Bal sistemi
        score_earned = 0
        if is_correct:
            if question_type == 'daily':
                score_earned = 1
            else:
                # Dərəcəli suallar üçün bal
                difficulty_scores = {'Asan': 1, 'Orta': 2, 'Çətin': 3}
                score_earned = difficulty_scores.get(question['difficulty'], 1)
            
            # Balı yenilə
            cursor.execute('''
                UPDATE students 
                SET total_score = total_score + ?, monthly_score = monthly_score + ?
                WHERE user_id = ?
            ''', (score_earned, score_earned, user_id))
            
            # Cavabı qeyd et
            cursor.execute('''
                INSERT OR REPLACE INTO answered_questions 
                (user_id, question_id, question_type, answer_date)
                VALUES (?, ?, ?, ?)
            ''', (user_id, question_id, question_type, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return {
            'correct': is_correct,
            'correct_answer': correct_answer,
            'explanation': question['explanation'],
            'score_earned': score_earned
        }
    
    def get_student_stats(self, user_id):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT total_score, monthly_score FROM students WHERE user_id = ?', (user_id,))
        student = cursor.fetchone()
        
        cursor.execute('''
            SELECT COUNT(*) as total_answered,
                   SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers
            FROM student_answers 
            WHERE user_id = ?
        ''', (user_id,))
        stats = cursor.fetchone()
        
        conn.close()
        
        total_answered = stats['total_answered'] if stats and stats['total_answered'] else 0
        correct_answers = stats['correct_answers'] if stats and stats['correct_answers'] else 0
        accuracy = round((correct_answers / total_answered * 100) if total_answered > 0 else 0, 1)
        
        return {
            'total_score': student['total_score'] if student else 0,
            'monthly_score': student['monthly_score'] if student else 0,
            'total_answered': total_answered,
            'correct_answers': correct_answers,
            'accuracy': accuracy
        }
    
    def get_rating(self, period='monthly'):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        if period == 'monthly':
            current_month = datetime.now().strftime('%Y-%m')
            cursor.execute('''
                SELECT full_name, monthly_score 
                FROM students 
                WHERE last_activity_month = ?
                ORDER BY monthly_score DESC 
                LIMIT 10
            ''', (current_month,))
        else:
            cursor.execute('''
                SELECT full_name, total_score 
                FROM students 
                ORDER BY total_score DESC 
                LIMIT 10
            ''')
        
        rating = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rating

bot = RiyazerBot()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register_student():
    try:
        data = request.json
        result = bot.register_student(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Qeydiyyat xətası: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/daily-question/<date>')
def get_daily_question(date):
    try:
        question = bot.get_daily_question_by_date(date)
        return jsonify(question if question else {'error': 'Sual tapılmadı'})
    except Exception as e:
        logger.error(f"Gündəlik sual xətası: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/graded-questions/<difficulty>')
def get_graded_questions(difficulty):
    try:
        user_id = request.args.get('user_id')
        questions = bot.get_graded_questions(difficulty, user_id)
        return jsonify(questions)
    except Exception as e:
        logger.error(f"Dərəcəli suallar xətası: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/check-answer', methods=['POST'])
def check_answer():
    try:
        data = request.json
        result = bot.check_answer(
            data['question_id'],
            data['question_type'], 
            data['user_answer'],
            data['user_id']
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Cavab yoxlama xətası: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/student/stats/<int:user_id>')
def get_student_stats(user_id):
    try:
        stats = bot.get_student_stats(user_id)
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Statistika xətası: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rating/<period>')
def get_rating(period):
    try:
        rating = bot.get_rating(period)
        return jsonify(rating)
    except Exception as e:
        logger.error(f"Reyting xətası: {e}")
        return jsonify({'error': str(e)}), 500

# Static fayllar üçün route
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    # Verilənlər bazasının mövcud olub-olmadığını yoxla
    if not os.path.exists('bot_data.db'):
        logger.warning("bot_data.db faylı tapılmadı! Zəhmət olmasa botun verilənlər bazasını köçürün.")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
