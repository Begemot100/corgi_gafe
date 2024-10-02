from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from flask_migrate import Migrate


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

migrate = Migrate(app, db)


# Employee model
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

    def __repr__(self):
        return f'<Employee {self.full_name}>'


# WorkLog model for storing work time information
class WorkLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=False)
    check_out_time = db.Column(db.DateTime, nullable=True)
    worked_hours = db.Column(db.Float, default=0)
    log_date = db.Column(db.Date, nullable=False)

    employee = db.relationship('Employee', backref=db.backref('work_logs', lazy=True))


# Main route
@app.route('/')
def index():
    kitchen_employees = Employee.query.filter_by(section="Cocina").all()
    hall_employees = Employee.query.filter_by(section="Sala").all()
    return render_template('index.html', kitchen_employees=kitchen_employees, hall_employees=hall_employees)


# Route to display the dashboard
@app.route('/dashboard')
def dashboard():
    employees = Employee.query.all()
    current_date = datetime.now().strftime('%Y-%m-%d')  # Получаем текущую дату
    return render_template('dashboard.html', employees=employees, current_date=current_date)
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
    section = request.form['section']  # Capture the section field

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
        section=section  # Assign section
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
    employee_to_delete = Employee.query.get_or_404(id)
    db.session.delete(employee_to_delete)
    db.session.commit()
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


# Route for check-in
# Route for check-in
@app.route('/check_in/<int:id>', methods=['POST'])
def check_in(id):
    employee = db.session.get(Employee, id)  # Используем db.session.get() для получения сотрудника
    if employee:  # Проверяем, что сотрудник существует
        check_in_time = datetime.now()
        employee.check_in_time = check_in_time

        # Создаем запись в WorkLog при чек-ине
        work_log = WorkLog(employee_id=employee.id, check_in_time=check_in_time, log_date=date.today())
        db.session.add(work_log)
        db.session.commit()

        return jsonify(
            check_in_time=employee.check_in_time.strftime('%H:%M:%S')
        )
    else:
        return jsonify({'error': 'Employee not found'}), 404

# Route for check-out
# Route for check-out
@app.route('/check_out/<int:id>', methods=['POST'])
def check_out(id):
    employee = db.session.get(Employee, id)  # Получаем сотрудника
    if employee:
        if employee.check_in_time is not None and employee.check_out_time is None:  # Проверяем, что есть check-in и еще не было check-out
            check_out_time = datetime.now()
            employee.check_out_time = check_out_time

            # Вычисляем отработанные часы за день
            time_difference = check_out_time - employee.check_in_time
            hours = time_difference.total_seconds() / 3600  # Конвертируем в часы

            # Обновляем дневные и месячные часы
            employee.daily_hours = hours
            employee.monthly_hours += hours

            # Обновляем запись в WorkLog
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

# Route to reset check-in and check-out for an employee
@app.route('/reset/<int:id>', methods=['POST'])
def reset_employee(id):
    employee = Employee.query.get(id)
    if employee:
        # Сбрасываем время чек-ина и чек-аута
        employee.check_in_time = None
        employee.check_out_time = None
        employee.daily_hours = 0  # Обнуляем время за день
        db.session.commit()
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Employee not found'}), 404


if __name__ == '__main__':
    app.run(debug=True)
