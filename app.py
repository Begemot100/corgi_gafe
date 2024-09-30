from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# Модель для сотрудников
class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    position = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    section = db.Column(db.String(10), nullable=False)  # "Кухня" или "Зал"

    def __repr__(self):
        return f'<Employee {self.first_name} {self.last_name}>'


# Главная страница с отображением сотрудников
@app.route('/')
def index():
    kitchen_employees = Employee.query.filter_by(section="Кухня").all()
    hall_employees = Employee.query.filter_by(section="Зал").all()
    print(f"Kitchen employees: {kitchen_employees}")  # Для отладки
    print(f"Hall employees: {hall_employees}")  # Для отладки
    return render_template('index.html', kitchen_employees=kitchen_employees, hall_employees=hall_employees)


@app.route('/add', methods=['POST'])
def add_employee():
    first_name = request.form['first_name']
    last_name = request.form['last_name']
    phone = request.form['phone']
    position = request.form['position']
    start_date = datetime.strptime(request.form['start_date'], '%Y-%m-%d')
    end_date = request.form.get('end_date')
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    section = request.form['section']

    new_employee = Employee(first_name=first_name, last_name=last_name, phone=phone, position=position,
                            start_date=start_date, end_date=end_date, section=section)

    try:
        db.session.add(new_employee)
        db.session.commit()  # Сохранение данных в базу
        print(f"Employee added: {new_employee}")
    except Exception as e:
        db.session.rollback()  # В случае ошибки откат
        print(f"Ошибка при добавлении сотрудника: {e}")

    return redirect(url_for('index'))


# Удаление сотрудника
@app.route('/delete/<int:id>', methods=['POST'])
def delete_employee(id):
    employee_to_delete = Employee.query.get_or_404(id)
    try:
        db.session.delete(employee_to_delete)
        db.session.commit()
        return '', 200  # Успешный ответ
    except:
        db.session.rollback()
        return '', 500  # Ошибка на сервере


# Редактирование информации о сотруднике
@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit_employee(id):
    employee = Employee.query.get_or_404(id)

    if request.method == 'POST':
        employee.first_name = request.form['first_name']
        employee.last_name = request.form['last_name']
        employee.phone = request.form['phone']
        employee.position = request.form['position']
        employee.start_date = datetime.strptime(request.form['start_date'], '%Y-%m-%d')
        end_date = request.form.get('end_date')
        if end_date:
            employee.end_date = datetime.strptime(end_date, '%Y-%m-%d')
        else:
            employee.end_date = None
        employee.section = request.form['section']

        db.session.commit()
        return redirect(url_for('index'))

    return render_template('edit.html', employee=employee)


if __name__ == '__main__':
    app.run(debug=True)
