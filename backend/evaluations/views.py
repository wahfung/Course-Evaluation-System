from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response as APIResponse
from .models import Questionnaire, Question, Response, Answer
from .serializers import QuestionnaireSerializer, ResponseSerializer
from django.db.models import Count, Avg

class IsTeacherOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.role == 'admin':
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'teacher'

class QuestionnaireViewSet(viewsets.ModelViewSet):
    queryset = Questionnaire.objects.all()
    serializer_class = QuestionnaireSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            # 学生只看到已发布且未评价过的问卷
            submitted_ids = Response.objects.filter(student=user).values_list('questionnaire_id', flat=True)
            return Questionnaire.objects.filter(status='published').exclude(id__in=submitted_ids)
        elif user.role == 'teacher':
            return Questionnaire.objects.filter(created_by=user)
        return Questionnaire.objects.all()

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """发布问卷"""
        questionnaire = self.get_object()
        questionnaire.status = 'published'
        questionnaire.save()
        return APIResponse({'status': 'published'})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """关闭问卷"""
        questionnaire = self.get_object()
        questionnaire.status = 'closed'
        questionnaire.save()
        return APIResponse({'status': 'closed'})

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """重新开启问卷"""
        questionnaire = self.get_object()
        questionnaire.status = 'published'
        questionnaire.save()
        return APIResponse({'status': 'published'})

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """获取问卷统计数据"""
        questionnaire = self.get_object()
        questions = questionnaire.questions.all().order_by('order')

        stats = {
            'questionnaire': questionnaire.title,
            'total_responses': Response.objects.filter(questionnaire=questionnaire).count(),
            'questions': []
        }

        for question in questions:
            q_stat = {
                'id': question.id,
                'text': question.text,
                'type': question.question_type,
            }

            answers = Answer.objects.filter(question=question)

            if question.question_type == 'rating':
                valid_answers = answers.filter(value__in=['1', '2', '3', '4', '5'])
                if valid_answers.exists():
                    avg = valid_answers.aggregate(
                        avg=Avg('value', output_field=models.FloatField())
                    )['avg']
                    q_stat['average'] = round(float(avg) if avg else 0, 2)

                    # 评分分布
                    distribution = {}
                    for i in range(1, 6):
                        distribution[str(i)] = valid_answers.filter(value=str(i)).count()
                    q_stat['distribution'] = distribution
                else:
                    q_stat['average'] = 0
                    q_stat['distribution'] = {}

            elif question.question_type == 'choice':
                choices = question.choices.split(',') if question.choices else []
                counts = {}
                for choice in choices:
                    choice = choice.strip()
                    counts[choice] = answers.filter(value=choice).count()
                q_stat['counts'] = counts

            elif question.question_type == 'text':
                q_stat['answers'] = list(answers.values_list('value', flat=True)[:20])

            stats['questions'].append(q_stat)

        return APIResponse(stats)

    @action(detail=True, methods=['get'])
    def check_submitted(self, request, pk=None):
        """检查当前用户是否已提交"""
        questionnaire = self.get_object()
        submitted = Response.objects.filter(
            questionnaire=questionnaire,
            student=request.user
        ).exists()
        return APIResponse({'submitted': submitted})

class ResponseViewSet(viewsets.ModelViewSet):
    queryset = Response.objects.all()
    serializer_class = ResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Response.objects.filter(student=user)
        elif user.role == 'teacher':
            return Response.objects.filter(questionnaire__created_by=user)
        return Response.objects.all()

    def create(self, request, *args, **kwargs):
        """提交问卷响应，检查是否重复提交"""
        questionnaire_id = request.data.get('questionnaire')

        # 检查是否已提交
        if Response.objects.filter(
            questionnaire_id=questionnaire_id,
            student=request.user
        ).exists():
            return APIResponse(
                {'error': '您已经提交过此问卷'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)

# 需要导入 models
from django.db import models
