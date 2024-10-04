from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from models import Employee, WorkLog
from sqlalchemy import extract


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'ваш_секретный_ключ'  # Секретный ключ для сессии
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
    lunch_start_time = db.Column(db.DateTime, nullable=True)
    lunch_end_time = db.Column(db.DateTime, nullable=True)

    work_logs = db.relationship('WorkLog', backref='employee', cascade="all, delete-orphan", lazy=True)

    def __repr__(self):
        return f'<Employee {self.full_name}>'

# Модель для записей рабочего времени
class WorkLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=False)
    lunch_start_time = db.Column(db.DateTime, nullable=True)
    lunch_end_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    worked_hours = db.Column(db.Float, default=0)
    log_date = db.Column(db.Date, nullable=False)

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

# Панель управления
@app.route('/dashboard')
def dashboard():
    employees = Employee.query.all()
    current_date = datetime.now().strftime('%Y-%m-%d')
    return render_template('dashboard.html', employees=employees, current_date=current_date)



@app.route('/work')
def work():
    filter_type = request.args.get('filter', 'today')
    group_type = request.args.get('group', None)
    current_date = datetime.now()

    # Инициализация logs в зависимости от фильтра
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
        total_hours = sum(log.worked_hours for log in employee_logs)
        employee.total_hours = total_hours
        employee.total_days = len(employee_logs)
        employee.overtime = max(0, total_hours - (8 * len(employee_logs)))

    return render_template('work.html', employees=employees)

# Custom filter to format total hours
@app.template_filter('format_hours')
def format_hours_filter(value):
    """Форматирование времени в часы и минуты"""
    if value is None:
        return '--:--'

    total_minutes = int(value * 60)  # Преобразуем часы в минуты
    hours = total_minutes // 60  # Получаем целые часы
    minutes = total_minutes % 60  # Оставшиеся минуты

    if hours > 0:
        return f"{hours}h {minutes}min"
    else:
        return f"{minutes}min"


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

    return redirect(url_for('index'))

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
        admin = Admin.query.filter_by(email=email).first()
        if admin and check_password_hash(admin.password_hash, password):
            session['admin_id'] = admin.id  # Сохраняем ID администратора в сессии
            return redirect(url_for('admin'))  # Перенаправление на админку
        else:
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
    if employee:
        check_in_time = datetime.now()
        employee.check_in_time = check_in_time
        work_log = WorkLog(employee_id=employee.id, check_in_time=check_in_time, log_date=date.today())
        db.session.add(work_log)
        db.session.commit()
        return jsonify(check_in_time=employee.check_in_time.strftime('%H:%M:%S'))
    else:
        return jsonify({'error': 'Employee not found'}), 404

# Чек-аут для сотрудника
# Чек-аут для сотрудника
@app.route('/check_out/<int:id>', methods=['POST'])
def check_out(id):
    employee = db.session.get(Employee, id)
    if employee:
        if employee.check_in_time is not None and employee.check_out_time is None:
            check_out_time = datetime.now()
            employee.check_out_time = check_out_time
            time_difference = check_out_time - employee.check_in_time

            # Расчет времени обеда
            lunch_time = (employee.lunch_end_time - employee.lunch_start_time).total_seconds() / 3600 if employee.lunch_start_time and employee.lunch_end_time else 0
            hours = round((time_difference.total_seconds() / 3600) - lunch_time, 2)  # Округляем до 2 знаков

            employee.daily_hours = hours
            employee.monthly_hours += hours

            work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=date.today()).first()
            if work_log:
                work_log.check_out_time = check_out_time
                work_log.worked_hours = hours

            db.session.commit()

            return jsonify(
                check_out_time=check_out_time.strftime('%H:%M:%S'),
                daily_hours=round(employee.daily_hours, 2),
                monthly_hours=round(employee.monthly_hours, 2)
            )
        else:
            return jsonify({'error': 'Check-out already completed or no Check-in recorded'}), 400
    else:
        return jsonify({'error': 'Employee not found'}), 404

# Старт обеда для сотрудника
@app.route('/lunch_start/<int:id>', methods=['POST'])
def lunch_start(id):
    employee = db.session.get(Employee, id)
    if employee:
        if employee.check_in_time is not None and employee.lunch_start_time is None:
            lunch_start_time = datetime.now()
            employee.lunch_start_time = lunch_start_time
            work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=date.today()).first()
            if work_log:
                work_log.lunch_start_time = lunch_start_time
            db.session.commit()
            return jsonify({'lunch_start_time': lunch_start_time.strftime('%H:%M:%S')})
        else:
            return jsonify({'error': 'Check-in not found or lunch already started'}), 400
    else:
        return jsonify({'error': 'Employee not found'}), 404

# Конец обеда для сотрудника
@app.route('/lunch_end/<int:id>', methods=['POST'])
def lunch_end(id):
    employee = db.session.get(Employee, id)
    if employee:
        if employee.lunch_start_time is not None and employee.lunch_end_time is None:
            lunch_end_time = datetime.now()
            employee.lunch_end_time = lunch_end_time
            work_log = WorkLog.query.filter_by(employee_id=employee.id, log_date=date.today()).first()
            if work_log:
                work_log.lunch_end_time = lunch_end_time
            db.session.commit()
            return jsonify({'lunch_end_time': lunch_end_time.strftime('%H:%M:%S')})
        else:
            return jsonify({'error': 'Lunch already ended or not started yet'}), 400
    else:
        return jsonify({'error': 'Employee not found'}), 404

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
            'lunch_start': log.lunch_start_time.strftime('%H:%M') if log.lunch_start_time else '--:--',
            'lunch_end': log.lunch_end_time.strftime('%H:%M') if log.lunch_end_time else '--:--',
            'check_out': log.check_out_time.strftime('%H:%M') if log.check_out_time else '--:--',
            'total_hours': format_hours_filter(log.worked_hours)  # Используем функцию здесь
        }
        for log in work_logs
    ]

    return jsonify({
        'employee_name': employee.full_name,
        'position': employee.position,
        'total_hours': format_hours_filter(total_hours),  # Используем функцию здесь
        'total_days': total_days,
        'overtime': format_hours_filter(overtime),  # Используем функцию здесь
        'work_logs': logs_data
    })


if __name__ == '__main__':
    app.run(debug=True)
