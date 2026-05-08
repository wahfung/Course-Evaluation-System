from rest_framework import serializers
from .models import Questionnaire, Question, Response, Answer
from users.serializers import UserSerializer

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'choices', 'order']

class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)

    class Meta:
        model = Questionnaire
        fields = ['id', 'title', 'description', 'status', 'course', 'created_by', 'created_by_detail', 'created_at', 'questions']
        read_only_fields = ('created_by', 'created_at')

    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        questionnaire = Questionnaire.objects.create(**validated_data)
        for question_data in questions_data:
            Question.objects.create(questionnaire=questionnaire, **question_data)
        return questionnaire

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['question', 'value']

class ResponseSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)
    student_detail = UserSerializer(source='student', read_only=True)

    class Meta:
        model = Response
        fields = ['id', 'questionnaire', 'student', 'student_detail', 'submitted_at', 'answers']
        read_only_fields = ('student', 'submitted_at')

    def create(self, validated_data):
        answers_data = validated_data.pop('answers')
        response = Response.objects.create(**validated_data)
        for answer_data in answers_data:
            Answer.objects.create(response=response, **answer_data)
        return response
