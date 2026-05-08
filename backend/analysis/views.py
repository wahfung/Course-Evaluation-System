from rest_framework import views, permissions
from rest_framework.response import Response
from evaluations.models import Questionnaire, Response as UserResponse, Answer
from courses.models import Course
from django.db.models import Avg, Count

class CourseAnalysisView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        # Stats:
        # 1. Responses count per questionnaire in the course
        # 2. Average rating for each rating question
        
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=404)

        if request.user.role == 'student' and request.user not in course.students.all():
             # Students can only see analysis if they are enrolled? Or maybe they shouldn't see it at all.
             # Let's restrict to teacher/admin for now, or allow student to see basic stats.
             pass

        questionnaires = Questionnaire.objects.filter(course=course)
        
        data = []
        for q in questionnaires:
            responses_count = UserResponse.objects.filter(questionnaire=q).count()
            
            # questions stats
            questions_data = []
            for question in q.questions.all():
                if question.question_type == 'rating':
                    avg = Answer.objects.filter(question=question, value__in=['1','2','3','4','5']).aggregate(avg=Avg('value'))
                    questions_data.append({
                        'text': question.text,
                        'type': 'rating',
                        'average': avg['avg'] or 0
                    })
                elif question.question_type == 'choice':
                    # count choices
                    choices = [c.strip() for c in question.choices.split(',')]
                    counts = {}
                    for c in choices:
                        count = Answer.objects.filter(question=question, value=c).count()
                        counts[c] = count
                    questions_data.append({
                        'text': question.text,
                        'type': 'choice',
                        'counts': counts
                    })
            
            data.append({
                'questionnaire': q.title,
                'responses': responses_count,
                'stats': questions_data
            })
            
        return Response(data)
