from rest_framework.routers import DefaultRouter
from .views import QuestionnaireViewSet, ResponseViewSet

router = DefaultRouter()
router.register(r'questionnaires', QuestionnaireViewSet)
router.register(r'responses', ResponseViewSet)

urlpatterns = router.urls
