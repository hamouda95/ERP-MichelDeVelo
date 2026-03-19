from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('password-reset/', views.password_reset_request, name='password-reset-request'),
    path('password-reset-confirm/', views.password_reset_confirm, name='password-reset-confirm'),
    path('me/', views.get_current_user, name='current-user'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/permissions/', views.update_user_permissions, name='update-user-permissions'),
]
