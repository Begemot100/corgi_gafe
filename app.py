from flask import Flask, render_template, request, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime, timedelta
import pandas as pd
import io
import openpyxl

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
    check_in = db.Column(db.DateTime, nullable=True)
    check_out = db.Column(db.DateTime, nullable=True)
    daily_work_time = db.Column(db.Interval, nullable=True)
    monthly_work_time = db.Column(db.Float, nullable=True, default=0)

    def __repr__(self):
        return f'<Employee {self.full_name}>'


# MonthlyWorkTime model
class MonthlyWorkTime(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    employee = db.relationship('Employee', backref=db.backref('monthly_logs', lazy=True))
    month = db.Column(db.String(7), nullable=False)
    total_work_time = db.Column(db.Float, nullable=False, default=0)

    def __repr__(self):
        return f'<MonthlyWorkTime {self.employee.full_name} - {self.month}>'


# Route to reset check-in/check-out for an employee
@app.route('/reset/<int:employee_id>', methods=['POST'])
def reset_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    employee.check_in = None
    employee.check_out = None
    employee.daily_work_time = None
    db.session.commit()
    return redirect(url_for('dashboard'))


# Main route
@app.route('/')
def index():
    kitchen_employees = Employee.query.filter_by(section="Cocina").all()
    hall_employees = Employee.query.filter_by(section="Sala").all()
    return render_template('index.html', kitchen_employees=kitchen_employees, hall_employees=hall_employees)


# Dashboard route for check-in/check-out
@app.route('/dashboard')
def dashboard():
    employees = Employee.query.all()
    return render_template('dashboard.html', employees=employees)


@app.route('/employees')
def employees():
    all_employees = Employee.query.all()
    return render_template('employees.html', employees=all_employees)


# Route to add a new employee
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


# Route to delete an employee
@app.route('/delete/<int:id>', methods=['POST'])
def delete_employee(id):
    employee_to_delete = Employee.query.get_or_404(id)
    db.session.delete(employee_to_delete)
    db.session.commit()
    return '', 200


# Route to edit an employee
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


# Route for checking in
@app.route('/check-in/<int:employee_id>', methods=['POST'])
def check_in(employee_id):
    employee = Employee.query.get_or_404(employee_id)  # Only target the specific employee
    current_date = datetime.utcnow().date()

    # If the employee already checked in but it was on a previous day, reset check-in and check-out
    if employee.check_in and employee.check_in.date() < current_date:
        # Reset only for this specific employee if it’s a new day
        employee.check_in = None
        employee.check_out = None
        employee.daily_work_time = None

    # Allow check-in if the employee hasn't checked in today
    if not employee.check_in:
        employee.check_in = datetime.utcnow()  # Set the current time as check-in time
        db.session.commit()

    return redirect(url_for('dashboard'))

# Route for checking out
@app.route('/check-out/<int:employee_id>', methods=['POST'])
def check_out(employee_id):
    employee = Employee.query.get_or_404(employee_id)  # Only target the specific employee
    if employee.check_in and not employee.check_out:
        employee.check_out = datetime.utcnow()

        # Calculate daily work time
        work_time = employee.check_out - employee.check_in
        employee.daily_work_time = work_time

        # Add daily time to monthly work time
        if employee.monthly_work_time:
            employee.monthly_work_time += work_time.total_seconds() / 3600  # Convert to hours
        else:
            employee.monthly_work_time = work_time.total_seconds() / 3600

        db.session.commit()

    return redirect(url_for('dashboard'))


# Reset monthly work time at the start of a new month
@app.before_request
def reset_monthly_work_time():
    first_day_of_month = datetime.utcnow().replace(day=1).date()
    employees = Employee.query.all()

    for employee in employees:
        if employee.check_in and employee.check_in.date() < first_day_of_month:
            last_month = (first_day_of_month - timedelta(days=1)).strftime('%Y-%m')
            monthly_log = MonthlyWorkTime(
                employee_id=employee.id,
                month=last_month,
                total_work_time=employee.monthly_work_time
            )
            db.session.add(monthly_log)
            employee.monthly_work_time = 0
            employee.check_in = None
            employee.check_out = None
    db.session.commit()


@app.route('/export')
def export_to_excel():
    employees = Employee.query.all()
    data = []
    for employee in employees:
        data.append({
            "Full Name": employee.full_name,
            "NIE": employee.nie,
            "Check-in": employee.check_in.strftime('%d-%m-%Y %H:%M') if employee.check_in else '--:--',
            "Check-out": employee.check_out.strftime('%d-%m-%Y %H:%M') if employee.check_out else '--:--',
            "Daily Work Time": str(employee.daily_work_time) if employee.daily_work_time else '--:--',
            "Monthly Work Time (Hours)": round(employee.monthly_work_time, 2) if employee.monthly_work_time else 0
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine='openpyxl')
    df.to_excel(writer, index=False, sheet_name='Employees')
    workbook = writer.book
    worksheet = writer.sheets['Employees']

    for column_cells in worksheet.columns:
        max_length = 0
        for cell in column_cells:
            cell.alignment = openpyxl.styles.Alignment(horizontal='center', vertical='center')
            try:
                max_length = max(max_length, len(str(cell.value)))
            except:
                pass
        adjusted_width = max_length + 2
        worksheet.column_dimensions[column_cells[0].column_letter].width = adjusted_width

    writer.close()
    output.seek(0)

    return send_file(output, download_name="employees_data.xlsx", as_attachment=True)


if __name__ == '__main__':
    app.run(debug=True)
