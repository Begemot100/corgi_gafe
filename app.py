from urllib.parse import quote
import math
from datetime import datetime, date, timedelta, time as dt_time
import time

from io import BytesIO
import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, send_file, make_response, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import extract
from openpyxl.utils import get_column_letter
# import schedule
from models import Employee, WorkLog
import logging
import threading
import openpyxl
from collections import defaultdict
from sqlalchemy import func
from apscheduler.schedulers.background import BackgroundScheduler



logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=4)

db = SQLAlchemy(app)
migrate = Migrate(app, db)
# employee = db.session.get(Employee, log.employee_id)

# Модель для администратора
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class DashboardUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Модель для сотрудников
class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    nie = db.Column(db.String(20), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    # hours_per_week = db.Column(db.Integer, nullable=False)
    days_per_week = db.Column(db.Integer, nullable=False)
    position = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(50), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    daily_hours = db.Column(db.Float, default=0)
    monthly_hours = db.Column(db.Float, default=0)
    work_start_time = db.Column(db.Time, nullable=False)
    work_end_time = db.Column(db.Time, nullable=False)
    total_hours = db.Column(db.Float, default=0)
    total_days = db.Column(db.Integer, default=0)
    paid_holidays = db.Column(db.Integer, default=0)
    unpaid_holidays = db.Column(db.Integer, default=0)

    work_logs = db.relationship('WorkLog', backref='employee', cascade="all, delete-orphan", lazy=True)

    def __repr__(self):
        return f'<Employee {self.full_name}>'

# Модель для записей рабочего времени
class WorkLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    worked_hours = db.Column(db.Float, default=0)
    log_date = db.Column(db.Date, nullable=False)
    holidays = db.Column(db.String(50), default='Working day')
    # work_log = db.session.get(WorkLog, id)
    def calculate_worked_hours(self):
        if self.check_in_time and self.check_out_time:
            time_diff = self.check_out_time - self.check_in_time
            return time_diff.total_seconds() / 3600  # Возвращаем количество часов
        return 0


@app.route('/')
def home():
    return render_template('home.html')

# Маршрут для логина администратора
@app.route('/admin_login')
def admin_login():
    return render_template('login.html')  # Здесь должна быть страница логина для администратора

# Маршрут для логина работника
@app.route('/dashboard_login', methods=['GET', 'POST'])
def dashboard_login():
    if request.method == 'POST':
        username = request.form['email']
        password = request.form['password']

        # Получаем пользователя из базы данных
        user = DashboardUser.query.filter_by(username=username).first()

        # Проверяем, существует ли пользователь и правильный ли пароль
        if user and user.check_password(password):
            # Сохраняем в сессии информацию о пользователе
            session['dashboard_user_id'] = user.id
            return redirect(url_for('dashboard'))
        else:
            error_message = 'Неверный логин или пароль'
            return render_template('dashboard_login.html', error_message=error_message)

    return render_template('dashboard_login.html')
# Главная страница - Страница входа
@app.route('/')
def index():
    return render_template('login.html')  # Возврат формы входа


def calculate_overtime(work_start_time, work_end_time, check_in, check_out):
    # Рассчитываем рабочее время на день
    scheduled_start = datetime.combine(datetime.today(), work_start_time)
    scheduled_end = datetime.combine(datetime.today(), work_end_time)
    scheduled_duration = scheduled_end - scheduled_start

    # Рассчитываем фактическое рабочее время
    actual_start = datetime.combine(datetime.today(), check_in)
    actual_end = datetime.combine(datetime.today(), check_out)
    actual_duration = actual_end - actual_start

    # Если фактическое время больше запланированного, считаем разницу как овертайм
    overtime = actual_duration - scheduled_duration if actual_duration > scheduled_duration else timedelta(0)

    # Возвращаем овертайм в часах и минутах
    return overtime

@app.route('/admin', methods=['GET'])
def admin():
    if 'admin_id' not in session:
        return redirect(url_for('index'))

    kitchen_employees = Employee.query.filter_by(section="Cocina").all()
    hall_employees = Employee.query.filter_by(section="Sala").all()

    # Логирование сотрудников для проверки
    logging.info(f"Сотрудники Cocina: {[e.full_name for e in kitchen_employees]}")
    logging.info(f"Сотрудники Sala: {[e.full_name for e in hall_employees]}")

    return render_template('index.html', kitchen_employees=kitchen_employees, hall_employees=hall_employees)


# Функция для преобразования десятичных часов в формат HH:MM
def decimal_hours_to_time(decimal_hours):
    hours = int(decimal_hours)
    minutes = int((decimal_hours - hours) * 60)
    return f'{hours:02d}:{minutes:02d}'


# Панель управления
@app.route('/dashboard')
def dashboard():
    # Проверяем, вошел ли сотрудник в систему
    if 'admin_id' in session:
        pass
    elif 'dashboard_user_id' not in session:
        return redirect(url_for('dashboard_login'))

    employees = Employee.query.all()  # Получаем всех сотрудников
    dashboard_data = []
    today = date.today()

    for employee in employees:
        # Ищем существующий лог для текущего дня
        work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()

        # Устанавливаем значения для отображения
        check_in_time = work_log.check_in_time.strftime('%H:%M') if work_log and work_log.check_in_time else '--:--'
        check_out_time = work_log.check_out_time.strftime('%H:%M') if work_log and work_log.check_out_time else '--:--'
        daily_hours = work_log.worked_hours if work_log else 0.0

        dashboard_data.append({
            'employee': employee,
            'check_in_time': check_in_time,
            'check_out_time': check_out_time,
            'daily_hours': daily_hours,
            'monthly_hours': employee.monthly_hours
        })

    return render_template('dashboard.html', dashboard_data=dashboard_data, current_date=today)

def format_hours_to_hm(decimal_hours):
    hours = int(decimal_hours)
    minutes = int((decimal_hours - hours) * 60)
    return f'{hours}h {minutes}min'

from datetime import date, datetime

@app.route('/work', methods=['GET'])
def work():
    # Получаем фильтры из URL
    employees = Employee.query.all()  # Получаем всех сотрудников
    selected_date_str = request.args.get('date', None)
    filter_type = request.args.get('filter', 'today')
    group_type = request.args.get('groups', None)
    app.logger.info(f"Применен фильтр группы: {group_type}")

    current_date = datetime.now()
    current_time = datetime.now().timestamp()  # Используем timestamp для текущего времени
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if start_date_str and end_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        logs = WorkLog.query.filter(WorkLog.log_date.between(start_date, end_date)).all()
    else:
        logs = WorkLog.query.all()

    # Устанавливаем выбранную дату или текущую дату
    if selected_date_str:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    else:
        selected_date = current_date.date()

    # Фильтрация по дате
    if filter_type == 'today':
        logs = WorkLog.query.filter(WorkLog.log_date == current_date.date()).all()
    elif filter_type == 'yesterday':
        yesterday = current_date - timedelta(days=1)
        logs = WorkLog.query.filter(WorkLog.log_date == yesterday.date()).all()
    elif filter_type == 'last_7_days':
        last_7_days = current_date - timedelta(days=7)
        logs = WorkLog.query.filter(WorkLog.log_date >= last_7_days.date()).all()
    elif filter_type == 'last_30_days':
        last_30_days = current_date - timedelta(days=30)
        logs = WorkLog.query.filter(WorkLog.log_date >= last_30_days.date()).all()
    elif filter_type == 'previous_month':
        first_day_of_current_month = current_date.replace(day=1)
        last_day_of_previous_month = first_day_of_current_month - timedelta(days=1)
        logs = WorkLog.query.filter(extract('month', WorkLog.log_date) == last_day_of_previous_month.month).all()
    elif filter_type == 'current_month':
        logs = WorkLog.query.filter(extract('month', WorkLog.log_date) == current_date.month).all()
    else:
        logs = WorkLog.query.all()

    # Фильтр по группам "Sala" и "Cocina"
    if group_type:
        group_filters_list = [g.lower() for g in group_type.split(',')]
        employees = Employee.query.filter(func.lower(Employee.section).in_(group_filters_list)).all()
    else:
        employees = Employee.query.all()

    # Подсчет данных для каждого сотрудника с группировкой логов
    employee_logs = defaultdict(list)
    for log in logs:
        employee_logs[log.employee_id].append(log)

    today = date.today()
    for employee in employees:
        if employee.id not in employee_logs:
            # Создаем новый лог для текущего дня, если его нет
            new_log = WorkLog(
                employee_id=employee.id,
                log_date=today,
                check_in_time=None,
                check_out_time=None,
                worked_hours=0
            )
            db.session.add(new_log)
            employee_logs[employee.id].append(new_log)

        # Подсчет общего времени, отпусков и переработок
        total_hours = round(sum(log.worked_hours or 0 for log in employee_logs[employee.id] if log.holidays != 'Unpaid'), 2)
        total_days = len([log for log in employee_logs[employee.id] if log.holidays != 'Unpaid'])
        paid_holidays = sum(1 for log in employee_logs[employee.id] if log.holidays == 'Paid')
        unpaid_holidays = sum(1 for log in employee_logs[employee.id] if log.holidays == 'Unpaid')

        # Сохранение данных summary в модель Employee
        employee.total_hours = total_hours
        employee.total_days = total_days
        employee.paid_holidays = paid_holidays
        employee.unpaid_holidays = unpaid_holidays
        employee.overtime = max(0, total_hours - (8 * total_days))

    # Сохранение изменений в базе данных
    db.session.commit()

    return render_template('work.html', employees=employees, current_time=current_time)


    # Передача данных на страницу work
    return render_template('work.html', employees=employees, work_logs=logs, current_time=current_time)


@app.template_filter('format_hours')
def format_hours(value):
    if value is None or value < 0:
        return '0h 0min'
    hours = int(value)
    minutes = int((value - hours) * 60)  # Получаем оставшиеся минуты
    return f'{hours}h {minutes}min' if hours > 0 else f'{minutes}min'

def calculate_worked_hours(log):
    if log.check_in_time and log.check_out_time:
        time_diff = log.check_out_time - log.check_in_time
        worked_hours = time_diff.total_seconds() / 3600
        return round(worked_hours, 2)  # Округляем до двух знаков
    return 0


# Добавление сотрудника
@app.route('/add', methods=['POST'])
def add_employee():
    full_name = request.form['full_name']
    nie = request.form['nie']
    start_date_str = request.form.get('start_date')
    end_date_str = request.form.get('end_date')
    days_per_week = request.form['days_per_week']
    position = request.form['position']
    phone = request.form['phone']
    email = request.form['email']
    section = request.form['section']

    # Получаем и парсим даты
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
    except ValueError as e:
        logging.error(f"Ошибка при парсинге даты: {e}")
        return jsonify({'error': 'Некорректный формат даты'}), 400

    # Получаем и парсим время
    work_start_time_str = request.form.get('work_start_time')
    work_end_time_str = request.form.get('work_end_time')

    if not work_start_time_str or not work_end_time_str:
        logging.error("Не указаны рабочие часы сотрудника.")
        return jsonify({'error': 'Не указаны рабочие часы'}), 400

    # Если значения есть, продолжаем парсить и сохранять
    try:
        work_start_time = datetime.strptime(work_start_time_str, '%H:%M').time()
        work_end_time = datetime.strptime(work_end_time_str, '%H:%M').time()
    except ValueError as e:
        logging.error(f"Ошибка при парсинге времени: {e}")
        return jsonify({'error': 'Некорректный формат времени'}), 400

    # Создаем объект Employee с рабочим диапазоном времени
    new_employee = Employee(
        full_name=full_name,
        nie=nie,
        start_date=start_date,
        end_date=end_date,
        work_start_time=work_start_time,
        work_end_time=work_end_time,
        days_per_week=int(days_per_week),
        position=position,
        phone=phone,
        email=email,
        section=section
    )

    try:
        db.session.add(new_employee)
        db.session.commit()
        logging.info(f"Сотрудник {full_name} успешно добавлен в раздел {section}.")
    except Exception as e:
        db.session.rollback()
        logging.error(f"Ошибка при добавлении сотрудника: {e}")
        return jsonify({'error': 'Ошибка при добавлении сотрудника'}), 500

    return jsonify({'message': 'Сотрудник успешно добавлен!'}), 200

# Удаление сотрудника
@app.route('/delete/<int:id>', methods=['POST'])
def delete_employee(id):
    employee = Employee.query.get_or_404(id)
    WorkLog.query.filter_by(employee_id=employee.id).delete()  # Удаляем все связанные WorkLog
    db.session.delete(employee)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting employee: {e}")
        return jsonify({'error': 'Error deleting employee'}), 500

    return '', 200

# Редактирование сотрудника
@app.route('/edit/<int:id>', methods=['POST'])
def edit_employee(id):
    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Сотрудник не найден'}), 404

    try:
        # Основные данные сотрудника
        employee.full_name = request.form['full_name']
        employee.nie = request.form['nie']
        employee.phone = request.form['phone']
        employee.position = request.form['position']
        employee.email = request.form['email']
        employee.section = request.form['section']
        employee.days_per_week = int(request.form['days_per_week'])

        # Обработка дат начала и окончания контракта
        start_date_str = request.form.get('start_date')
        end_date_str = request.form.get('end_date')
        if start_date_str:
            employee.start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            employee.end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            employee.end_date = None

        # Обработка рабочего диапазона времени
        work_start_time_str = request.form.get('work_start_time')
        work_end_time_str = request.form.get('work_end_time')

        if not work_start_time_str or not work_end_time_str:
            logging.error("Не указаны рабочие часы для редактирования.")
            return jsonify({'error': 'Не указаны рабочие часы'}), 400

        # Парсинг времени начала и окончания работы
        employee.work_start_time = datetime.strptime(work_start_time_str, '%H:%M').time()
        employee.work_end_time = datetime.strptime(work_end_time_str, '%H:%M').time()

        # Сохранение изменений
        db.session.commit()
        logging.info(f"Сотрудник {employee.full_name} успешно обновлен.")
        return jsonify({'message': 'Сотрудник успешно обновлен!'}), 200

    except ValueError as e:
        logging.error(f"Ошибка при парсинге данных: {e}")
        return jsonify({'error': 'Некорректный формат данных'}), 400
    except Exception as e:
        logging.error(f"Ошибка при обновлении данных сотрудника: {e}")
        db.session.rollback()
        return jsonify({'error': 'Ошибка при обновлении сотрудника'}), 500


# Маршрут для входа
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        # Добавляем логирование для отслеживания логина
        app.logger.info(f"Попытка входа с email: {email}")

        admin = Admin.query.filter_by(email=email).first()
        if admin:
            # Проверка пароля
            if admin.check_password(password):
                session['admin_id'] = admin.id  # Сохраняем ID администратора в сессии
                session.permanent = True  # Устанавливаем сессию как постоянную
                app.logger.info("Вход выполнен успешно")
                return redirect(url_for('admin'))  # Перенаправление на админку
            else:
                app.logger.warning("Неверный пароль")
        else:
            app.logger.warning("Администратор с таким email не найден")

        # Если неудачная попытка входа
        return jsonify({'error': 'Неверный email или пароль'}), 401

    return render_template('login.html')  # Возврат формы входа


# Маршрут для регистрации
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        full_name = request.form['full_name']  # Добавлено поле полного имени

        # Проверяем, существует ли администратор с таким email
        if Admin.query.filter_by(email=email).first():
            return jsonify({'error': 'Этот email уже зарегистрирован!'}), 400

        # Создаем нового администратора
        new_admin = Admin(email=email)
        new_admin.set_password(password)  # Устанавливаем хэш пароля
        db.session.add(new_admin)
        db.session.commit()

        return redirect(url_for('admin'))  # Перенаправление на админку после успешной регистрации

    return render_template('register.html')  # Возврат формы регистрации

# Чек-ин для сотрудника
@app.route('/check_in/<int:id>', methods=['POST'])
def check_in(id):
    employee = db.session.get(Employee, id)
    if not employee:
        return jsonify({'error': 'Сотрудник не найден'}), 404

    today = date.today()
    existing_log = WorkLog.query.filter_by(employee_id=id, log_date=today).first()

    # Если запись существует, проверяем, что чек-ин еще не был сделан
    if existing_log and existing_log.check_in_time is not None:
        return jsonify({'error': 'Вы уже зачекинились сегодня'}), 400

    # Если записи нет, создаем новую
    if not existing_log:
        new_log = WorkLog(
            employee_id=employee.id,
            log_date=today,
            check_in_time=datetime.now(),  # Проставляем текущее время как чек-ин
            check_out_time=None
        )
        db.session.add(new_log)
        db.session.commit()
        return jsonify({'message': 'Чек-ин выполнен', 'check_in_time': new_log.check_in_time.strftime('%H:%M:%S')})

    # Устанавливаем время чек-ина, если запись существует, но чек-ин еще не сделан
    if existing_log.check_in_time is None:
        existing_log.check_in_time = datetime.now()
        db.session.commit()

    return jsonify({'message': 'Чек-ин выполнен', 'check_in_time': existing_log.check_in_time.strftime('%H:%M:%S')})

# Чек-аут для сотрудника
@app.route('/check_out/<int:id>', methods=['POST'])
def check_out(id):
    employee = db.session.get(Employee, id)
    if not employee:
        return jsonify({'error': 'Сотрудник не найден'}), 404

    today = date.today()
    work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()

    # Проверка наличия лога рабочего времени
    if not work_log:
        return jsonify({'error': 'Чек-ин не найден за сегодня'}), 400

    # Проверка, был ли выполнен чек-аут
    if work_log.check_out_time is not None:
        return jsonify({'error': 'Чек-аут уже выполнен сегодня'}), 400

    # Выполнение чек-аута
    check_out_time = datetime.now()
    work_log.check_out_time = check_out_time

    # Рассчитываем время за смену (разница между чек-ином и чек-аутом)
    time_diff = work_log.check_out_time - work_log.check_in_time
    worked_hours = time_diff.total_seconds() / 3600  # Конвертация секунд в часы

    work_log.worked_hours = worked_hours  # Сохраняем отработанные часы в лог

    db.session.commit()

    return jsonify({'check_out_time': check_out_time.strftime('%H:%M:%S'), 'worked_hours': worked_hours})





@app.route('/work_logs', methods=['GET'])
def work_logs():
    # Получаем employee_id и даты из запроса
    employee_id = request.args.get('employee_id', None)
    start_date_str = request.args.get('start_date', None)
    end_date_str = request.args.get('end_date', None)

    # Формируем запрос к базе данных
    work_logs_query = WorkLog.query

    # Если указан employee_id, фильтруем по сотруднику
    if employee_id:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        work_logs_query = work_logs_query.filter_by(employee_id=employee_id)

    # Если указаны start_date и end_date, фильтруем по диапазону дат
    if start_date_str and end_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        work_logs_query = work_logs_query.filter(WorkLog.log_date.between(start_date, end_date))

    # Выполняем запрос и получаем результат
    work_logs = work_logs_query.all()

    if employee_id:
        total_hours = sum(log.worked_hours for log in work_logs)
        total_hours = round(total_hours, 2)  # Округляем до двух знаков
        total_days = len(work_logs)
        overtime = max(0, total_hours - (8 * total_days))


        logs_data = [
            {
                'date': log.log_date.strftime('%a %d/%m/%Y'),
                'check_in': log.check_in_time.strftime('%H:%M') if log.check_in_time else '--:--',
                'check_out': log.check_out_time.strftime('%H:%M') if log.check_out_time else '--:--',
                'total_hours': format_hours(log.worked_hours)
            }
            for log in work_logs
        ]

        return jsonify({
            'employee_name': employee.full_name,
            'position': employee.position,
            'total_hours': format_hours(total_hours),  # Общее время после округления
            'total_days': total_days,
            'overtime': format_hours(overtime),
            'work_logs': logs_data
        })
    else:
        return render_template('work.html', logs=work_logs)

# Обновление статуса отпуска для сотрудника
@app.route('/update_holiday_status/<int:id>', methods=['POST'])
def update_holiday_status(id):
    data = request.get_json()
    app.logger.info(f"Получены данные для обновления статуса: {data}")

    new_status = data.get('holiday_status', 'Working day').capitalize()
    valid_statuses = ['Working day', 'Paid', 'Unpaid', 'Weekend']

    if new_status in valid_statuses:
        work_log = db.session.get(WorkLog, id)
        if not work_log:
            return jsonify({'error': 'Запись не найдена'}), 404

        # Обновляем статус дня
        work_log.holidays = new_status

        # Обнуляем check-in и check-out, если статус "Unpaid"
        if new_status == 'Unpaid':
            work_log.check_in_time = None
            work_log.check_out_time = None
            work_log.worked_hours = 0  # Обнуляем количество отработанных часов

        try:
            db.session.commit()  # Сохраняем изменения в базе данных
            db.session.refresh(work_log)  # Обновляем данные для проверки
            app.logger.info(f"Сохраненные данные: check_in_time={work_log.check_in_time}, check_out_time={work_log.check_out_time}, worked_hours={work_log.worked_hours}")
            return jsonify({'message': 'Статус выходного дня обновлен'}), 200
        except Exception as e:
            db.session.rollback()  # Откат изменений в случае ошибки
            app.logger.error(f"Ошибка при обновлении статуса: {e}")
            return jsonify({'error': 'Не удалось обновить статус'}), 500

    app.logger.warning(f"Неверный статус: {new_status}")
    return jsonify({'error': 'Неверный статус'}), 400

@app.route('/export_excel', methods=['POST'])
def export_excel():
    # Получаем IDs выбранных сотрудников и логов работы
    employee_ids = request.json.get('employee_ids', [])
    work_log_ids = request.json.get('work_log_ids', [])

    logging.info(f"Полученные employee_ids: {employee_ids}")
    logging.info(f"Полученные work_log_ids: {work_log_ids}")

    if not employee_ids or not work_log_ids:
        return jsonify({'error': 'Нет выбранных сотрудников или логов работы'}), 400

    # Получаем сотрудников по переданным ID
    employees = Employee.query.filter(Employee.id.in_(employee_ids)).all()

    # Собираем имена сотрудников для названия файла
    employee_names = [employee.full_name for employee in employees]
    employee_names_str = ', '.join(employee_names[:3])  # Ограничим до 3 сотрудников для краткости
    if len(employee_names) > 3:
        employee_names_str += ' и др.'

    # Получаем текущую дату в формате DD-MM-YYYY
    current_date = datetime.now().strftime('%d-%m-%Y')

    # Формируем название файла
    filename = f"work_logs_{employee_names_str}_{current_date}.xlsx".replace(" ", "_").replace(",", "_").replace("__", "_")
    encoded_filename = quote(filename)
    logging.info("Получены IDs для экспорта: %s", employee_ids)
    logging.info("Количество сотрудников для экспорта: %d", len(employees))
    logging.info("Функция экспортирования в Excel запущена.")

    # Создаем DataFrame с данными сотрудников
    data = []
    for employee in employees:
        # Фильтруем логи работы по переданным work_log_ids
        filtered_work_logs = [log for log in employee.work_logs if str(log.id) in work_log_ids]

        # Подсчитываем количество дней каждого типа
        paid_holidays = sum(1 for log in employee.work_logs if log.holidays == 'Paid')
        unpaid_holidays = sum(1 for log in employee.work_logs if log.holidays == 'Unpaid')
        weekends = sum(1 for log in employee.work_logs if log.holidays == 'Weekend')
        working_days = sum(1 for log in employee.work_logs if log.holidays == 'Working day')


        # Итоговое количество отработанных часов (учитывая Paid и исключая Unpaid дни)
        total_hours_worked = sum(
            log.worked_hours or 0 for log in employee.work_logs if log.holidays != 'Unpaid'
        )
        for log in filtered_work_logs:
            formatted_hours = decimal_hours_to_time(log.worked_hours)
            data.append({
                'Full Name': employee.full_name,
                'Position': employee.position,
                'Date': log.log_date.strftime('%Y-%m-%d'),
                'Check In': log.check_in_time.strftime('%H:%M') if log.check_in_time else '--:--',
                'Check Out': log.check_out_time.strftime('%H:%M') if log.check_out_time else '--:--',
                'Total Day Hours': formatted_hours,
                'Holiday Type': log.holidays,
                'Days Worked': ''  # Пропускаем итоговые строки до конца блока сотрудника
            })

        # Добавляем итоговые строки
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            'Holiday Type': 'Total Worked Days',
            'Days Worked': working_days
        })
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            'Holiday Type': 'Paid Holiday',
            'Days Worked': paid_holidays
        })
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            'Holiday Type': 'Unpaid Holiday',
            'Days Worked': unpaid_holidays
        })
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            'Holiday Type': 'Weekend',
            'Days Worked': weekends
        })
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            'Holiday Type': 'Total Hours',
            'Days Worked': decimal_hours_to_time(total_hours_worked),
        })

        # Рассчитываем овертайм (при предположении, что стандартное время - 8 часов в день)
        overtime_hours = max(0, total_hours_worked - (8 * working_days))
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            'Holiday Type': 'Overtime',
            'Days Worked': decimal_hours_to_time(overtime_hours),
        })

        # Добавляем пустую строку для разделения сотрудников
        data.append({key: '' for key in data[0].keys()})
        data.append({key: '' for key in data[0].keys()})

    # Генерация Excel файла
    df = pd.DataFrame(data)
    output = BytesIO()

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Work Logs')

        # Получаем рабочий лист
        worksheet = writer.sheets['Work Logs']

        # Подстраиваем ширину колонок
        for idx, col in enumerate(df.columns, 1):  # Считаем колонки с 1
            max_length = max(df[col].astype(str).map(len).max(), len(col))
            col_letter = get_column_letter(idx)
            worksheet.column_dimensions[col_letter].width = (max_length + 2) * 1.2  # Коррекция ширины

    output.seek(0)

    # Создание ответа с явной установкой заголовков
    response = make_response(output.read())
    response.headers['Content-Disposition'] = f'attachment; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    return response

@app.route('/edit_check_time/<int:log_id>', methods=['POST'])
def edit_check_time(log_id):
    data = request.get_json()
    check_in_time = data.get('check_in_time')
    check_out_time = data.get('check_out_time')

    log = WorkLog.query.get(log_id)
    if log:
        log.check_in_time = check_in_time
        log.check_out_time = check_out_time
        db.session.commit()
        return jsonify({'success': True})
    else:
        return jsonify({'success': False}), 404


@app.route('/update_check_time/<int:id>', methods=['POST'])
def update_check_time(id):
    data = request.get_json()
    check_in_time_str = data.get('check_in_time', '')
    check_out_time_str = data.get('check_out_time', '')

    app.logger.info(f"Получен запрос для обновления лога {id} с данными: {data}")

    try:
        check_in_time = datetime.combine(date.today(), datetime.strptime(check_in_time_str,
                                                                         '%H:%M').time()) if check_in_time_str else None
        check_out_time = datetime.combine(date.today(), datetime.strptime(check_out_time_str,
                                                                          '%H:%M').time()) if check_out_time_str else None

        work_log = db.session.get(WorkLog, id)
        if work_log:
            app.logger.info(f"Найдена запись: {work_log}")
            work_log.check_in_time = check_in_time
            work_log.check_out_time = check_out_time

            # Пересчет рабочих часов
            work_log.worked_hours = work_log.calculate_worked_hours()
            db.session.commit()
            app.logger.info(f"Запись с ID {id} успешно сохранена в базу данных.")
            app.logger.info(f"Часы обновлены для лога {id}: {work_log.worked_hours}")
            return jsonify({'success': True, 'worked_hours': work_log.worked_hours})
        else:
            app.logger.error(f"Запись с ID {id} не найдена")
            return jsonify({'error': 'Запись не найдена'}), 404

    except ValueError as ve:
        app.logger.error(f"Неверный формат времени: {ve}")
        return jsonify({'error': 'Неверный формат времени'}), 400
    except Exception as e:
        app.logger.error(f"Ошибка при обновлении времени: {e}")
        db.session.rollback()
        return jsonify({'error': 'Не удалось сохранить время', 'message': str(e)}), 500

@app.route('/get_employee_logs/<int:employee_id>', methods=['GET'])
def get_employee_logs(employee_id):
    # Получаем логи сотрудника по его ID
    logs = WorkLog.query.filter_by(employee_id=employee_id).all()

    # Логируем ID всех логов, которые собираемся отправить на клиент
    app.logger.info(f"Отправляем логи на страницу: {[log.id for log in logs]}")

    # Форматируем данные логов для отправки на клиент
    logs_data = [{
        "log_id": log.id,
        "date": log.log_date.strftime('%Y-%m-%d'),
        "check_in_time": log.check_in_time.strftime('%H:%M') if log.check_in_time else None,
        "check_out_time": log.check_out_time.strftime('%H:%M') if log.check_out_time else None,
        "worked_hours": round(log.worked_hours, 2)
    } for log in logs]

    # Возвращаем данные в формате JSON
    return jsonify(success=True, logs=logs_data)

@app.route('/edit_modal')
def edit_modal():
    return render_template('edit_modal.html')


@app.route('/get_employee_list', methods=['GET'])
def get_employee_list():
    kitchen_employees = Employee.query.filter_by(section="Cocina").all()
    hall_employees = Employee.query.filter_by(section="Sala").all()

    cocina = [{'full_name': emp.full_name} for emp in kitchen_employees]
    sala = [{'full_name': emp.full_name} for emp in hall_employees]

    return jsonify({'cocina': cocina, 'sala': sala})

@app.route('/get_employee_data/<int:employee_id>')
def get_employee_data(employee_id):
    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Сотрудник не найден'}), 404

    return jsonify({
        'fullName': employee.full_name,
        'nie': employee.nie,
        'phone': employee.phone,
        'position': employee.position,
        'email': employee.email,
        'startDate': employee.start_date.strftime('%Y-%m-%d') if employee.start_date else '',
        'endDate': employee.end_date.strftime('%Y-%m-%d') if employee.end_date else '',
        'section': employee.section,
        'workStartTime': employee.work_start_time.strftime('%H:%M') if employee.work_start_time else '',
        'workEndTime': employee.work_end_time.strftime('%H:%M') if employee.work_end_time else '',
        'daysPerWeek': employee.days_per_week,

    })


@app.route('/update_work_logs', methods=['POST'])
def update_work_logs():
    data = request.get_json()
    updates = data.get('updates', [])
    for update in updates:
        log_id = update.get('logId')
        check_in = update.get('checkIn')
        check_out = update.get('checkOut')

        # Обновите запись в базе данных
        work_log = WorkLog.query.get(log_id)
        if work_log:
            work_log.check_in_time = check_in
            work_log.check_out_time = check_out
            db.session.commit()

    return jsonify(success=True)


@app.route('/update_times', methods=['POST'])
def update_times():
    data = request.get_json()
    updates = data.get('updates', [])
    for update in updates:
        log_id = update.get('logId')
        check_in_time = datetime.strptime(update.get('checkIn'), '%H:%M')
        check_out_time = datetime.strptime(update.get('checkOut'), '%H:%M')

        work_log = WorkLog.query.get(log_id)
        if work_log:
            work_log.check_in_time = datetime.combine(work_log.log_date, check_in_time.time())
            work_log.check_out_time = datetime.combine(work_log.log_date, check_out_time.time())
            work_log.worked_hours = work_log.calculate_worked_hours()
            db.session.commit()

    return jsonify({'success': True})




@app.route('/export_unique_excel', methods=['GET'])
def export_unique_excel():
    # Получение данных сотрудников
    employees = Employee.query.all()
    employee_data = []

    # Перебор сотрудников и добавление данных в список
    for employee in employees:
        employee_data.append({
            'Full Name': employee.full_name,
            'NIE': employee.nie,
            'Phone': employee.phone,
            'Position': employee.position,
            'Email': employee.email,
            'Start Date': employee.start_date.strftime('%Y-%m-%d') if employee.start_date else '',
            'End Date': employee.end_date.strftime('%Y-%m-%d') if employee.end_date else '',
            'Work Start Time': employee.work_start_time.strftime('%H:%M') if employee.work_start_time else '',
            'Work End Time': employee.work_end_time.strftime('%H:%M') if employee.work_end_time else '',
            'Days per Week': employee.days_per_week,
            'Section': employee.section
        })

        # Добавляем пустую строку (None во всех полях) для разрыва
        employee_data.append({key: None for key in employee_data[-1].keys()})

    # Создание DataFrame из данных сотрудников
    df = pd.DataFrame(employee_data)

    # Создаем объект BytesIO для сохранения файла в памяти
    output = BytesIO()

    # Сохранение данных в Excel с настройками ширины
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, sheet_name='Employees', index=False)

        # Получаем рабочую книгу и лист для дальнейшей настройки
        worksheet = writer.sheets['Employees']

        # Настройка ширины колонок по содержимому
        for idx, col in enumerate(df.columns):
            max_len = max(df[col].astype(str).map(len).max(), len(col))
            worksheet.set_column(idx, idx, max_len + 2)  # +2 для небольшого отступа

    output.seek(0)

    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name='Unique_Employee_Export.xlsx')

@app.route('/add_work_log', methods=['POST'])
def add_work_log():
    employee_id = request.form['employee_id']
    check_in_str = request.form['check_in']
    check_out_str = request.form['check_out']

    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Сотрудник не найден'}), 404

    try:
        check_in = datetime.strptime(check_in_str, '%H:%M').time()
        check_out = datetime.strptime(check_out_str, '%H:%M').time()
    except ValueError as e:
        logging.error(f"Ошибка при парсинге времени: {e}")
        return jsonify({'error': 'Некорректный формат времени'}), 400

    overtime = calculate_overtime(employee.work_start_time, employee.work_end_time, check_in, check_out)
    logging.info(f"Переработка для сотрудника {employee.full_name}: {overtime}")

    # Сохранить данные в таблицу лога
    new_log = WorkLog(employee_id=employee_id, check_in=check_in, check_out=check_out, overtime=overtime)
    db.session.add(new_log)
    db.session.commit()

    return jsonify({'message': 'Рабочий лог добавлен', 'overtime': str(overtime)})

from datetime import datetime, timedelta

def check_missing_checkins():
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)

    employees = Employee.query.all()
    for employee in employees:
        # Проверяем, если запись за вчера отсутствует
        missing_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=yesterday).first()
        if not missing_log:
            # Создаем запись с прочерками для вчерашнего дня
            new_log = WorkLog(
                employee_id=employee.id,
                log_date=yesterday,
                check_in_time=None,
                check_out_time=None,
                holidays="-"
            )
            db.session.add(new_log)
    db.session.commit()


def add_missing_logs():
    with app.app_context():
        logging.info("Запуск функции add_missing_logs")
        today = datetime.now().date()
        employees = Employee.query.all()

        for employee in employees:
            existing_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()
            if not existing_log:
                logging.info(f"Добавление пропущенной записи для сотрудника {employee.full_name}")
                missing_log = WorkLog(
                    employee_id=employee.id,
                    log_date=today,
                    check_in_time=None,
                    check_out_time=None,
                    holidays='Working day'
                )
                db.session.add(missing_log)

        db.session.commit()
        logging.info("Функция add_missing_logs завершена")



@app.route('/register_dashboard_user', methods=['GET', 'POST'])
def register_dashboard_user():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Проверяем, существует ли уже пользователь с таким именем
        existing_user = DashboardUser.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'error': 'Этот пользователь уже зарегистрирован!'}), 400

        # Создаем нового пользователя
        new_user = DashboardUser(username=username)
        new_user.set_password(password)  # Хешируем пароль

        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for('dashboard'))  # Перенаправляем на страницу логина после успешной регистрации

    return render_template('register.html')  # Страница регистрации для метода GET
def get_logs_in_date_range(start_date, end_date):
    return WorkLog.query.filter(WorkLog.log_date >= start_date, WorkLog.log_date <= end_date).all()

@app.route('/logout_employee')
def logout_employee():
    session.pop('employee_id', None)
    return redirect(url_for('dashboard_login'))

# Пример в Python для добавления нового дня

from datetime import datetime

def add_new_day_for_employees():
    today = datetime.today().date()
    employees = Employee.query.all()
    for employee in employees:
        # Проверяем, есть ли уже лог за сегодня, чтобы не создавать дубликаты
        log_exists = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()
        if not log_exists:
            new_log = WorkLog(
                employee_id=employee.id,
                log_date=today,
                check_in_time=None,  # Вместо времени прочерки
                check_out_time=None,
                worked_hours=0,
                holidays='Working day'
            )
            db.session.add(new_log)
    db.session.commit()



# Маршрут для добавления пустого лога
@app.route('/add_empty_log', methods=['POST'])
def add_empty_log():
    data = request.get_json()
    employee_id = data.get('employee_id')
    date_str = data.get('date')

    # Проверяем, что переданы employee_id и дата
    if not employee_id or not date_str:
        return jsonify({'success': False, 'message': 'Необходимо указать employee_id и дату'}), 400

    # Парсим дату
    try:
        log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Неверный формат даты'}), 400

    # Проверяем, существует ли уже лог на эту дату
    existing_log = WorkLog.query.filter_by(employee_id=employee_id, log_date=log_date).first()
    if existing_log:
        return jsonify({'success': False, 'message': 'Лог на эту дату уже существует'}), 409  # Код 409 для конфликта

    # Создаем новый лог с прочерками
    new_log = WorkLog(
        employee_id=employee_id,
        log_date=log_date,
        check_in_time=None,
        check_out_time=None,
        worked_hours=0,
        holidays='Working day'
    )

    # Сохраняем лог в базе данных
    db.session.add(new_log)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Пустой лог успешно добавлен'})

@app.route('/api/log_totals', methods=['GET'])
def get_log_totals():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    group_type = request.args.get('group_type')

    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

    employees = Employee.query
    if group_type:
        employees = employees.filter(Employee.section == group_type)

    totals = {}
    for employee in employees.all():
        logs = employee.work_logs
        if start_date and end_date:
            logs = [log for log in logs if start_date <= log.log_date <= end_date]

        # Подсчеты
        total_hours = sum(log.worked_hours or 0 for log in logs if log.holidays != 'Unpaid')
        total_days = len([log for log in logs if log.holidays != 'Unpaid'])
        paid_holidays = sum(1 for log in logs if log.holidays == 'Paid')
        unpaid_holidays = sum(1 for log in logs if log.holidays == 'Unpaid')

        totals[employee.id] = {
            'total_hours': f"{int(total_hours)}h {int((total_hours % 1) * 60)}min",
            'total_days': total_days,
            'paid_holidays': paid_holidays,
            'unpaid_holidays': unpaid_holidays
        }
    return jsonify(totals)


def create_placeholder_logs():
    tomorrow = datetime.today().date() + timedelta(days=1)  # Установка даты на завтра
    employees = Employee.query.all()
    for employee in employees:
        existing_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=tomorrow).first()
        # Если запись есть, но без check-in/check-out, ничего не делаем
        if existing_log and not existing_log.check_in_time:
            continue
        # Если записи нет, создаем её с прочерками
        if not existing_log:
            placeholder_log = WorkLog(
                employee_id=employee.id,
                log_date=tomorrow,
                check_in_time=None,
                check_out_time=None
            )
            db.session.add(placeholder_log)
    db.session.commit()

# Настройка планировщика
scheduler = BackgroundScheduler()
scheduler.add_job(create_placeholder_logs, 'cron', hour=23, minute=45)
scheduler.start()

if __name__ == '__main__':

    # Запускаем Flask сервер
    app.run(debug=True, port=5005)
