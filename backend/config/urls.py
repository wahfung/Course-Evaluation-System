from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/evaluations/', include('evaluations.urls')),
    path('api/analysis/', include('analysis.urls')),
]
