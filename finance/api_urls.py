from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import api_views

router = DefaultRouter()
router.register(r"categories", api_views.CategoryViewSet, basename="category")
router.register(r"transactions", api_views.TransactionViewSet, basename="transaction")
router.register(r"budgets", api_views.BudgetViewSet, basename="budget")
router.register(r"savings-goals", api_views.SavingsGoalViewSet, basename="savingsgoal")
router.register(r"notifications", api_views.NotificationViewSet, basename="notification")

auth_patterns = [
    path("register/", api_views.RegisterView.as_view(), name="api-register"),
    path("login/", api_views.LoginView.as_view(), name="api-login"),
    path("logout/", api_views.LogoutView.as_view(), name="api-logout"),
    path("me/", api_views.MeView.as_view(), name="api-me"),
    path("change-password/", api_views.ChangePasswordView.as_view(), name="api-change-password"),
]

urlpatterns = [
    path("auth/", include(auth_patterns)),
    path("profile/", api_views.ProfileView.as_view(), name="api-profile"),
    path("dashboard/", api_views.DashboardView.as_view(), name="api-dashboard"),
    path("analytics/", api_views.AnalyticsView.as_view(), name="api-analytics"),
    path("", include(router.urls)),
]
