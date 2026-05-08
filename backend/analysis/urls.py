from django.urls import path
from .views import CourseAnalysisView

urlpatterns = [
    path('course/<int:course_id>/', CourseAnalysisView.as_view(), name='course_analysis'),
]
