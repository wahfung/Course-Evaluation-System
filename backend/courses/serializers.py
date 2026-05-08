from rest_framework import serializers
from .models import Course
from users.serializers import UserSerializer

class CourseSerializer(serializers.ModelSerializer):
    teacher_detail = UserSerializer(source='teacher', read_only=True)

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ('created_at',)
