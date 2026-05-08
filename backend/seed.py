import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User
from courses.models import Course
from evaluations.models import Questionnaire, Question, Response, Answer
from django.utils import timezone

def seed():
    print("Seeding data...")

    # Create Users
    admin, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com', 'role': 'admin'})
    admin.set_password('admin123')
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()

    teacher, _ = User.objects.get_or_create(username='teacher1', defaults={'email': 'teacher@example.com', 'role': 'teacher'})
    teacher.set_password('teacher123')
    teacher.save()

    student1, _ = User.objects.get_or_create(username='student1', defaults={'email': 's1@example.com', 'role': 'student'})
    student1.set_password('student123')
    student1.save()

    student2, _ = User.objects.get_or_create(username='student2', defaults={'email': 's2@example.com', 'role': 'student'})
    student2.set_password('student123')
    student2.save()

    print("Users created.")

    # Create Course
    course, created = Course.objects.get_or_create(
        code='CS101',
        defaults={
            'name': 'Introduction to Computer Science',
            'teacher': teacher,
            'description': 'Basic concepts of CS.',
            'credits': 4
        }
    )
    if created:
        course.students.add(student1, student2)
        print("Course CS101 created.")
    else:
        print("Course CS101 already exists.")

    # Create Questionnaire
    q, created = Questionnaire.objects.get_or_create(
        title='Mid-term Feedback',
        course=course,
        defaults={
            'description': 'Please provide feedback on the first half of the course.',
            'status': 'published',
            'created_by': teacher
        }
    )

    if created:
        Question.objects.create(questionnaire=q, text='How would you rate the course content?', question_type='rating', order=1)
        Question.objects.create(questionnaire=q, text='What did you like most?', question_type='text', order=2)
        Question.objects.create(questionnaire=q, text='Pace of the course', question_type='choice', choices='Too Fast,Just Right,Too Slow', order=3)
        print("Questionnaire created.")
    else:
        print("Questionnaire already exists.")

    # Create Response (Student 1)
    if not Response.objects.filter(questionnaire=q, student=student1).exists():
        resp = Response.objects.create(questionnaire=q, student=student1)
        
        q1 = q.questions.get(order=1)
        Answer.objects.create(response=resp, question=q1, value='5')
        
        q2 = q.questions.get(order=2)
        Answer.objects.create(response=resp, question=q2, value='The practical examples.')
        
        q3 = q.questions.get(order=3)
        Answer.objects.create(response=resp, question=q3, value='Just Right')
        
        print("Response created for student1.")
    else:
        print("Response already exists.")

    print("Seeding complete.")

if __name__ == '__main__':
    seed()
