import csv
import io
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django.http import HttpResponse
from .models import Course
from .serializers import CourseSerializer

class IsTeacherOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['teacher', 'admin']

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Course.objects.none()
        if user.role == 'admin':
            return Course.objects.all()
        elif user.role == 'teacher':
            return Course.objects.filter(teacher=user)
        else:
            # 学生可以查看所有课程（只读权限由IsTeacherOrReadOnly控制）
            return Course.objects.all()

    def perform_create(self, serializer):
        # 教师创建课程时自动设置为自己
        if self.request.user.role == 'teacher':
            serializer.save(teacher=self.request.user)
        else:
            # 管理员可以指定教师，如果没指定则为空
            serializer.save()

    def perform_update(self, serializer):
        # 教师只能更新自己的课程，且不能修改teacher字段
        if self.request.user.role == 'teacher':
            serializer.save(teacher=self.request.user)
        else:
            # 管理员可以修改任何字段包括teacher
            serializer.save()

    @action(detail=False, methods=['get'])
    def export(self, request):
        """导出课程为CSV"""
        courses = self.get_queryset()

        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="courses.csv"'

        writer = csv.writer(response)
        writer.writerow(['课程代码', '课程名称', '描述', '学分', '教师'])

        for course in courses:
            writer.writerow([
                course.code,
                course.name,
                course.description or '',
                course.credits,
                course.teacher.username if course.teacher else ''
            ])

        return response

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def import_csv(self, request):
        """从CSV批量导入课程"""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': '请上传CSV文件'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))

            created = 0
            updated = 0
            errors = []

            for row in reader:
                code = row.get('课程代码', '').strip()
                name = row.get('课程名称', '').strip()

                if not code or not name:
                    errors.append(f'缺少必填字段: {row}')
                    continue

                defaults = {
                    'name': name,
                    'description': row.get('描述', ''),
                    'credits': int(row.get('学分', 3)),
                }

                if request.user.role == 'teacher':
                    defaults['teacher'] = request.user

                course, is_created = Course.objects.update_or_create(
                    code=code,
                    defaults=defaults
                )

                if is_created:
                    created += 1
                else:
                    updated += 1

            return Response({
                'message': f'导入完成: 新建 {created} 门, 更新 {updated} 门',
                'errors': errors
            })
        except Exception as e:
            return Response({'error': f'导入失败: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def all(self, request):
        """获取所有课程（用于下拉选择）"""
        courses = Course.objects.all()
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)
