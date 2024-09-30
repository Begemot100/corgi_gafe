from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
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
    section = db.Column(db.String(50), nullable=False)  # Add this line for the section field

    def __repr__(self):
        return f'<Employee {self.full_name}>'

# Main route
@app.route('/')
def index():
    kitchen_employees = Employee.query.filter_by(section="Cocina").all()
    hall_employees = Employee.query.filter_by(section="Sala").all()
    return render_template('index.html', kitchen_employees=kitchen_employees, hall_employees=hall_employees)


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

        # Convert the date strings to Python date objects
        start_date_str = request.form['start_date']
        end_date_str = request.form['end_date']

        # Convert the date strings to date objects (format must match your input format)
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



if __name__ == '__main__':
    app.run(debug=True)
