from rest_framework import views, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from django.contrib.auth import login, logout
from .models import User
from .serializers import UserSerializer, LoginSerializer

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class LoginView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data
        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        data = UserSerializer(user).data
        data['token'] = token.key
        return Response(data)

class LogoutView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        if request.user.is_authenticated:
            Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

class MeView(views.APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        """更新当前用户信息"""
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class ChangePasswordView(views.APIView):
    def post(self, request):
        """修改密码"""
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': '请提供旧密码和新密码'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(old_password):
            return Response(
                {'error': '旧密码错误'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()

        # 更新 token
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)

        return Response({
            'message': '密码修改成功',
            'token': token.key
        })

class UserViewSet(viewsets.ModelViewSet):
    """用户管理（仅管理员）"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset.order_by('-date_joined')

    def create(self, request, *args, **kwargs):
        """创建用户"""
        password = request.data.get('password', 'password123')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.set_password(password)
        user.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """重置用户密码"""
        user = self.get_object()
        new_password = request.data.get('password', 'password123')
        user.set_password(new_password)
        user.save()
        Token.objects.filter(user=user).delete()
        return Response({'message': f'密码已重置为: {new_password}'})

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """用户统计"""
        return Response({
            'total': User.objects.count(),
            'admins': User.objects.filter(role='admin').count(),
            'teachers': User.objects.filter(role='teacher').count(),
            'students': User.objects.filter(role='student').count(),
        })
