from datetime import datetime, date, timedelta
import time
from urllib.parse import quote

import math
from io import BytesIO

import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, send_file, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import extract
from openpyxl.utils import get_column_letter

from models import Employee, WorkLog

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'ваш_секретный_ключ'  # Секретный ключ для сессии
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=4)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Модель для администратора
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
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
    hours_per_week = db.Column(db.Integer, nullable=False)
    days_per_week = db.Column(db.Integer, nullable=False)
    position = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(50), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    daily_hours = db.Column(db.Float, default=0)
    monthly_hours = db.Column(db.Float, default=0)

    work_logs = db.relationship('WorkLog', backref='employee', cascade="all, delete-orphan", lazy=True)

    def __repr__(self):
        return f'<Employee {self.full_name}>'

# Модель для записей рабочего времени
class WorkLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=False)
    check_out_time = db.Column(db.DateTime, nullable=True)
    worked_hours = db.Column(db.Float, default=0)
    log_date = db.Column(db.Date, nullable=False)
    holidays = db.Column(db.String(50), default='-')
    # work_log = db.session.get(WorkLog, id)


# Главная страница - Страница входа
@app.route('/')
def index():
    return render_template('login.html')  # Возврат формы входа

@app.route('/admin', methods=['GET'])
def admin():
    # Проверка, вошел ли администратор
    if 'admin_id' not in session:
        return redirect(url_for('index'))  # Перенаправление на страницу входа, если администратор не вошел

    # Логика для отображения админской панели
    kitchen_employees = Employee.query.filter_by(section="Cocina").all()
    hall_employees = Employee.query.filter_by(section="Sala").all()
    return render_template('index.html', kitchen_employees=kitchen_employees, hall_employees=hall_employees)

# Функция для преобразования десятичных часов в формат HH:MM
def decimal_hours_to_time(decimal_hours):
    hours = int(decimal_hours)
    minutes = int((decimal_hours - hours) * 60)
    return f'{hours:02d}:{minutes:02d}'

# Панель управления
@app.route('/dashboard')
def dashboard():
    employees = Employee.query.all()  # Получаем всех сотрудников
    dashboard_data = []
    today = date.today()

    for employee in employees:
        work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()

        # Если нет логов, устанавливаем значения по умолчанию
        if work_log:
            check_in_time = work_log.check_in_time.strftime('%H:%M') if work_log.check_in_time else '--:--'
            check_out_time = work_log.check_out_time.strftime('%H:%M') if work_log.check_out_time else '--:--'
            daily_hours = work_log.worked_hours if work_log.worked_hours else 0.0
        else:
            # Если логов нет, обнуляем чек-ин
            check_in_time = '--:--'  # Обнуляем время чек-ина
            check_out_time = '--:--'
            daily_hours = 0.0

        dashboard_data.append({
            'employee': employee,
            'check_in_time': check_in_time,
            'check_out_time': check_out_time,
            'daily_hours': daily_hours,
            'monthly_hours': employee.monthly_hours
        })

    return render_template('dashboard.html', dashboard_data=dashboard_data, current_date=today)


@app.route('/work', methods=['GET'])
def work():
    # Получаем фильтры из URL
    selected_date_str = request.args.get('date', None)
    filter_type = request.args.get('filter', 'today')
    group_type = request.args.get('group', None)
    current_date = datetime.now()
    current_time = time.time()

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
    if group_type == 'cocina':
        employees = Employee.query.filter_by(section='Cocina').all()
    elif group_type == 'sala':
        employees = Employee.query.filter_by(section='Sala').all()
    else:
        employees = Employee.query.all()

    # Подсчет данных для каждого сотрудника
    for employee in employees:
        employee_logs = [log for log in logs if log.employee_id == employee.id]

        # Подсчет общего времени
        total_hours = sum(log.worked_hours for log in employee_logs)
        employee.total_hours = total_hours
        employee.total_days = len(employee_logs)  # Количество рабочих дней
        employee.overtime = max(0, total_hours - (8 * employee.total_days))  # Предполагается, что стандартное рабочее время 8 часов в день

        # Добавляем подсчет отпусков
        employee.paid_holidays = sum(1 for log in employee_logs if log.holidays == 'Paid')
        employee.unpaid_holidays = sum(1 for log in employee_logs if log.holidays == 'Unpaid')

    return render_template('work.html', employees=employees, current_time=current_time)


@app.template_filter('format_hours')
def format_hours(value):
    if value is None:
        return '0min'
    hours = int(value)
    minutes = int((value - hours) * 60)
    return f'{hours}h {minutes}min' if hours > 0 else f'{minutes}min'


# Добавление сотрудника
@app.route('/add', methods=['POST'])
def add_employee():
    full_name = request.form['full_name']
    nie = request.form['nie']
    start_date = datetime.strptime(request.form['start_date'], '%Y-%m-%d')
    end_date = request.form.get('end_date')
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    hours_per_week = request.form['hours_per_week']
    days_per_week = request.form['days_per_week']
    position = request.form['position']
    phone = request.form['phone']
    email = request.form['email']
    section = request.form['section']

    new_employee = Employee(
        full_name=full_name,
        nie=nie,
        start_date=start_date,
        end_date=end_date,
        hours_per_week=hours_per_week,
        days_per_week=days_per_week,
        position=position,
        phone=phone,
        email=email,
        section=section
    )

    try:
        db.session.add(new_employee)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error adding employee: {e}")

    return redirect(url_for('admin'))

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
    if employee:
        employee.full_name = request.form['full_name']
        employee.nie = request.form['nie']
        employee.phone = request.form['phone']
        employee.position = request.form['position']
        start_date_str = request.form['start_date']
        end_date_str = request.form['end_date']
        employee.start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            employee.end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            employee.end_date = None
        employee.hours_per_week = request.form['hours_per_week']
        employee.days_per_week = request.form['days_per_week']
        employee.email = request.form['email']
        employee.section = request.form['section']
        db.session.commit()

    return redirect(url_for('index'))

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
    # Проверяем, есть ли лог за сегодняшний день
    existing_log = WorkLog.query.filter_by(employee_id=id, log_date=today).first()
    if existing_log:
        return jsonify({'error': 'Вы уже зачекинились сегодня'}), 400  # Возвращаем ошибку если чек-ин уже был

    # Если логов нет, создаём новый лог
    check_in_time = datetime.now()
    new_work_log = WorkLog(employee_id=employee.id, check_in_time=check_in_time, log_date=today)
    db.session.add(new_work_log)
    db.session.commit()

    return jsonify({'message': 'Чек-ин выполнен', 'check_in_time': check_in_time.strftime('%H:%M:%S')})


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

 # Старт обеда для сотрудника

# Получение логов для конкретного сотрудника
@app.route('/work_logs/<int:employee_id>', methods=['GET'])
def get_work_logs(employee_id):
    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    work_logs = WorkLog.query.filter_by(employee_id=employee_id).all()

    total_hours = sum(log.worked_hours for log in work_logs)
    total_days = len(work_logs)
    overtime = max(0, total_hours - (8 * total_days))

    logs_data = [
        {
            'date': log.log_date.strftime('%a %d/%m/%Y'),
            'check_in': log.check_in_time.strftime('%H:%M') if log.check_in_time else '--:--',
            'check_out': log.check_out_time.strftime('%H:%M') if log.check_out_time else '--:--',
            'total_hours': format_hours(log.worked_hours)  # Используем функцию здесь
        }
        for log in work_logs
    ]

    return jsonify({
        'employee_name': employee.full_name,
        'position': employee.position,
        'total_hours': format_hours(total_hours),  # Используем функцию здесь
        'total_days': total_days,
        'overtime': format_hours(overtime),  # Используем функцию здесь
        'work_logs': logs_data
    })

# Обновление статуса отпуска для сотрудника
@app.route('/update_holiday_status/<int:id>', methods=['POST'])
def update_holiday_status(id):
    work_log = WorkLog.query.get(id)
    if not work_log:
        return jsonify({'error': 'Запись не найдена'}), 404

    data = request.get_json()
    print("Получены данные:", data)

    # Приведение к нижнему регистру для стандартной проверки
    new_status = data.get('holiday_status').lower()
    valid_statuses = ['working day', 'paid', 'unpaid', 'weekend']

    if new_status in valid_statuses:
        # Приведение обратно к нужному регистру для записи в базу данных
        work_log.holidays = new_status.capitalize() if new_status != 'working day' else 'Working day'
        db.session.commit()
        return jsonify({'message': 'Статус выходного дня обновлен'}), 200

    print("Неверный статус:", new_status)
    return jsonify({'error': 'Неверный статус выходного дня'}), 400

@app.route('/export_excel', methods=['POST'])
def export_excel():
    # Получаем IDs выбранных сотрудников
    employee_ids = request.json.get('employee_ids', [])

    if not employee_ids:
        return jsonify({'error': 'Нет выбранных сотрудников'}), 400

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

    # Создаем DataFrame с данными сотрудников
    data = []
    for employee in employees:
        total_days_worked = len(employee.work_logs)
        for i, log in enumerate(employee.work_logs):
            formatted_hours = decimal_hours_to_time(log.worked_hours)
            # Если это последняя запись для текущего сотрудника, добавляем 'Days Worked'
            days_worked = total_days_worked if i == len(employee.work_logs) - 1 else ""
            data.append({
                'Full Name': employee.full_name,
                'Position': employee.position,
                'Date': log.log_date.strftime('%Y-%m-%d'),
                'Check In': log.check_in_time.strftime('%H:%M') if log.check_in_time else '--:--',
                'Check Out': log.check_out_time.strftime('%H:%M') if log.check_out_time else '--:--',
                'Total Hours': formatted_hours,
                'Holiday Type': log.holidays,
                'Days Worked': days_worked
            })

        # Добавляем две пустые строки после последней записи текущего сотрудника
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



if __name__ == '__main__':
    app.run(debug=True)
