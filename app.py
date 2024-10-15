from datetime import datetime, date, timedelta
import time
from urllib.parse import quote
import math
from io import BytesIO
import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, send_file, make_response, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import extract
from openpyxl.utils import get_column_letter

from models import Employee, WorkLog
import logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'ваш_секретный_ключ'  # Секретный ключ для сессии
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
    holidays = db.Column(db.String(50), default='Working day')
    # work_log = db.session.get(WorkLog, id)
    def calculate_worked_hours(self):
        if self.check_in_time and self.check_out_time:
            time_diff = self.check_out_time - self.check_in_time
            return time_diff.total_seconds() / 3600  # возвращаем количество часов
        return 0


# Главная страница - Страница входа
@app.route('/')
def index():
    return render_template('login.html')  # Возврат формы входа


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
    employees = Employee.query.all()  # Получаем всех сотрудников
    dashboard_data = []
    today = date.today()

    for employee in employees:
        work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()

        # Если нет логов, устанавливаем значения по умолчанию
        if not work_log:
            # Если запись отсутствует, создаем её с прочерками
            work_log = WorkLog(
                employee_id=employee.id,
                log_date=today,
                check_in_time=None,
                check_out_time=None,
                worked_hours=0
            )
            db.session.add(work_log)

            # Форматирование данных для отображения в интерфейсе
        check_in_time = work_log.check_in_time.strftime('%H:%M') if work_log.check_in_time else '--:--'
        check_out_time = work_log.check_out_time.strftime('%H:%M') if work_log.check_out_time else '--:--'
        daily_hours = work_log.worked_hours if work_log.worked_hours else 0.0

        dashboard_data.append({
            'employee': employee,
            'check_in_time': check_in_time,
            'check_out_time': check_out_time,
            'daily_hours': daily_hours,
            'monthly_hours': employee.monthly_hours
        })
    db.session.commit()  # Сохранение новых записей, если они были добавлены

    return render_template('dashboard.html', dashboard_data=dashboard_data, current_date=today)




@app.route('/work', methods=['GET'])
def work():
    # Получаем фильтры из URL
    selected_date_str = request.args.get('date', None)
    filter_type = request.args.get('filter', 'today')
    group_type = request.args.get('group', None)
    current_date = datetime.now()
    current_time = datetime.now().timestamp()  # Используем timestamp для текущего времени

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
        group_filters_list = group_type.split(',')  # Получаем список групп из строки
        employees = Employee.query.filter(
            Employee.section.in_(group_filters_list)).all()  # Фильтруем сотрудников по выбранным группам
    else:
        employees = Employee.query.all()

    # Проверка наличия лога за текущий день и создание его при отсутствии
    today = date.today()
    for employee in employees:
        existing_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=today).first()
        if not existing_log:
            new_log = WorkLog(
                employee_id=employee.id,
                log_date=today,
                check_in_time=datetime.now(),  # Устанавливаем текущее время
                check_out_time=None,
                holidays='Working day'  # Устанавливаем по умолчанию статус
            )
            db.session.add(new_log)
    db.session.commit()

    # Подсчет данных для каждого сотрудника
    for employee in employees:
        employee_logs = WorkLog.query.filter_by(employee_id=employee.id).all()

        # Подсчет общего времени
        total_hours = sum(log.worked_hours or 0 for log in employee_logs)
        employee.total_hours = total_hours
        employee.total_days = len(employee_logs)  # Количество рабочих дней
        employee.overtime = max(0, total_hours - (8 * employee.total_days))  # Предполагается, что стандартное рабочее время 8 часов в день

        # Подсчет отпусков
        employee.paid_holidays = sum(1 for log in employee_logs if log.holidays == 'Paid')
        employee.unpaid_holidays = sum(1 for log in employee_logs if log.holidays == 'Unpaid')
        logging.info(f"Загрузка страницы /work. Total Hours: {total_hours}")

    # Получаем обновленный список логов
    work_logs = WorkLog.query.all()
    app.logger.info(f"Полученные логи: {logs}")
    # В функции, которая передает данные на страницу work
    app.logger.info(f"Отправленные логи на страницу: {[log.id for log in logs]}")

    return render_template('work.html', employees=employees, work_logs=work_logs, current_time=current_time)


@app.template_filter('format_hours')
def format_hours(value):
    if value is None or value < 0:
        return '0h 0min'
    hours = int(value)
    minutes = int((value - hours) * 60)  # Получаем оставшиеся минуты
    return f'{hours}h {minutes}min' if hours > 0 else f'{minutes}min'


# Добавление сотрудника
@app.route('/add', methods=['POST'])
def add_employee():
    full_name = request.form['full_name']
    nie = request.form['nie']
    start_date_str = request.form.get('start_date')  # Получаем как строку
    end_date_str = request.form.get('end_date')
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
    hours_per_week = request.form['hours_per_week']
    days_per_week = request.form['days_per_week']
    position = request.form['position']
    phone = request.form['phone']
    email = request.form['email']
    section = request.form['section']

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
    except ValueError as e:
        logging.error(f"Ошибка при парсинге даты: {e}")
        return jsonify({'error': 'Некорректный формат даты'}), 400

    new_employee = Employee(
        full_name=full_name,
        nie=nie,
        start_date=start_date,
        end_date=end_date,
        hours_per_week=int(hours_per_week),
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

        # Возвращаем JSON-ответ для обновления страницы
        return jsonify({'message': 'Сотрудник успешно добавлен!'}), 200
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

    # Получение параметра даты из запроса
    selected_date_str = request.args.get('date', None)
    if selected_date_str:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        # Фильтрация по дате
        work_logs = WorkLog.query.filter_by(employee_id=employee_id, log_date=selected_date).all()
    else:
        work_logs = WorkLog.query.filter_by(employee_id=employee_id).all()

    total_hours = sum(log.worked_hours for log in work_logs)
    total_days = len(work_logs)
    overtime = max(0, total_hours - (8 * total_days))

    logs_data = [
        {
            'date': log.log_date.strftime('%a %d/%m/%Y'),
            'check_in': log.check_in_time.strftime('%H:%M') if log.check_in_time else '--:--',
            'check_out': log.check_out_time.strftime('%H:%M') if log.check_out_time else '--:--',
            'total_hours': format_hours(log.worked_hours)  # Форматируем отработанные часы
        }
        for log in work_logs
    ]
    logging.info(f"Total hours before formatting: {total_hours}")  # Логируем до форматирования
    formatted_total_hours = format_hours(total_hours)
    logging.info(f"Formatted total hours: {formatted_total_hours}")  # Логируем после форматирования

    return jsonify({
        'employee_name': employee.full_name,
        'position': employee.position,
        'total_hours': format_hours(total_hours),  # Форматируем общее время
        'total_days': total_days,
        'overtime': format_hours(overtime),  # Форматируем овертайм
        'work_logs': logs_data
    })


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

        work_log.holidays = new_status
        try:
            db.session.commit()
            return jsonify({'message': 'Статус выходного дня обновлен'}), 200
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Ошибка при обновлении статуса: {e}")
            return jsonify({'error': 'Не удалось обновить статус'}), 500

    app.logger.warning(f"Неверный статус: {new_status}")
    return jsonify({'error': 'Неверный статус'}), 400


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
    logging.info("Получены IDs для экспорта: %s", employee_ids)
    logging.info("Количество сотрудников для экспорта: %d", len(employees))
    logging.info("Функция экспортирования в Excel запущена.")

    # Создаем DataFrame с данными сотрудников
    data = []
    for employee in employees:
        # Подсчитываем количество дней каждого типа
        paid_holidays = sum(1 for log in employee.work_logs if log.holidays == 'Paid')
        unpaid_holidays = sum(1 for log in employee.work_logs if log.holidays == 'Unpaid')
        weekends = sum(1 for log in employee.work_logs if log.holidays == 'Weekend')
        working_days = sum(1 for log in employee.work_logs if log.holidays == 'Working day')
        total_hours_worked = sum(log.worked_hours or 0 for log in employee.work_logs)


        for log in employee.work_logs:
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

        # Итоговая строка по каждому сотруднику
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
            # 'Total Hours': '',
            'Holiday Type': 'Paid Holiday',
            'Days Worked': paid_holidays
        })
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            # 'Total Hours': '',
            'Holiday Type': 'Unpaid Holiday',
            'Days Worked': unpaid_holidays
        })
        data.append({
            'Full Name': '',
            'Position': '',
            'Date': '',
            'Check In': '',
            'Check Out': '',
            # 'Total Hours': '',
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

    try:
        check_in_time = datetime.combine(date.today(), datetime.strptime(check_in_time_str, '%H:%M').time()) if check_in_time_str else None
        check_out_time = datetime.combine(date.today(), datetime.strptime(check_out_time_str, '%H:%M').time()) if check_out_time_str else None

        work_log = db.session.get(WorkLog, id)
        if work_log:
            work_log.check_in_time = check_in_time
            work_log.check_out_time = check_out_time

            # Пересчет рабочих часов
            work_log.worked_hours = work_log.calculate_worked_hours()
            db.session.commit()
            return jsonify({'success': True, 'worked_hours': work_log.worked_hours})
        else:
            return jsonify({'error': 'Запись не найдена'}), 404

    except ValueError:
        return jsonify({'error': 'Неверный формат времени'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Не удалось сохранить время', 'message': str(e)}), 500


@app.route('/get_employee_logs/<int:employee_id>', methods=['GET'])
def get_employee_logs(employee_id):
    logs = WorkLog.query.filter_by(employee_id=employee_id).all()
    logs_data = [{
        "log_id": log.id,
        "date": log.log_date.strftime('%Y-%m-%d'),
        "check_in_time": log.check_in_time.strftime('%H:%M') if log.check_in_time else None,
        "check_out_time": log.check_out_time.strftime('%H:%M') if log.check_out_time else None,
        "worked_hours": log.worked_hours
    } for log in logs]

    return jsonify(success=True, logs=logs_data)
@app.route('/edit_modal')
def edit_modal():
    return render_template('edit_modal.html')

@app.route('/get_logs_by_date')
def get_logs_by_date():
    selected_date = request.args.get('date')
    logs = WorkLog.query.filter_by(log_date=selected_date).all()
    employee_logs = []

    for log in logs:
        # Обновлено для использования session.get
        employee = db.session.get(Employee, log.employee_id)  # Заменено на db.session.get
        employee_logs.append({
            'employeeId': employee.id,
            'employeeName': employee.full_name,
            'position': employee.position,
            'logDate': log.log_date.strftime('%Y-%m-%d'),
            'checkInTime': log.check_in_time.strftime('%H:%M') if log.check_in_time else None,
            'checkOutTime': log.check_out_time.strftime('%H:%M') if log.check_out_time else None,
            'totalHours': log.worked_hours,
            'holidayId': log.id,
            'holidays': log.holidays
        })

    return jsonify(employee_logs)
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
    if employee:
        return jsonify({
            'fullName': employee.full_name,
            'nie': employee.nie,
            'phone': employee.phone,
            'position': employee.position,
            'email': employee.email,
            'startDate': employee.start_date.strftime('%Y-%m-%d') if employee.start_date else '',
            'endDate': employee.end_date.strftime('%Y-%m-%d') if employee.end_date else '',
            'section': employee.section,
            'hoursPerWeek': employee.hours_per_week,
            'daysPerWeek': employee.days_per_week
        })
    else:
        return jsonify({'error': 'Employee not found'}), 404


if __name__ == '__main__':
    app.run(debug=True, port=5001)
