from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from . import auth_views

app_name = 'accounts'

urlpatterns = [
    # Standard JWT endpoints (backup)
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Custom auth endpoints
    path('token/', auth_views.custom_token_obtain, name='custom_token_obtain'),
    path('me/', auth_views.current_user_info, name='current_user_info'),
    
    # User management
    path('register/', views.RegisterView.as_view(), name='register'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/permissions/', views.update_user_permissions, name='update-user-permissions'),
    
    # Profile management
    path('profile/', views.update_profile, name='update_profile'),
    path('upload-avatar/', views.upload_avatar, name='upload_avatar'),
    
    # Password management
    path('password-reset/', views.request_password_reset, name='password_reset'),
    path('password-reset-confirm/', views.confirm_password_reset, name='password_reset_confirm'),
    path('change-password/', views.change_password, name='change_password'),
]
