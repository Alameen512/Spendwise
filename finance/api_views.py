from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from django.utils import timezone

from rest_framework import viewsets, generics, status, filters
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile, Category, Transaction, Budget, SavingsGoal, Notification
from .permissions import IsOwner
from .serializers import (
    UserSerializer, ProfileSerializer, RegisterSerializer, ChangePasswordSerializer,
    CategorySerializer, TransactionSerializer, BudgetSerializer,
    SavingsGoalSerializer, NotificationSerializer,
)


# ========================================================================
# AUTHENTICATION
# ========================================================================
class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/  -> create a user + auth token"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"user": UserSerializer(user).data, "token": token.key},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/auth/login/  {username, password} -> user + token, also starts a session"""
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"user": UserSerializer(user).data, "token": token.key})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except (AttributeError, Token.DoesNotExist):
            pass
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET /api/auth/me/ -> current logged-in user + profile"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(
            {
                "user": UserSerializer(request.user).data,
                "profile": ProfileSerializer(profile).data,
            }
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH /api/profile/"""
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def update(self, request, *args, **kwargs):
        # allow updating nested user fields (first/last name, email) too
        user_data = request.data.get("user")
        if user_data:
            user_serializer = UserSerializer(request.user, data=user_data, partial=True)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()
        return super().update(request, *args, **kwargs)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        # rotate token so old sessions/tokens elsewhere are invalidated
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        return Response({"detail": "Password updated successfully.", "token": token.key})


# ========================================================================
# BASE MIXIN — scope every queryset to the logged-in user
# ========================================================================
class UserScopedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ========================================================================
# CATEGORY
# ========================================================================
class CategoryViewSet(UserScopedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]


# ========================================================================
# TRANSACTION
# ========================================================================
class TransactionViewSet(UserScopedModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["description", "notes"]
    ordering_fields = ["date", "amount", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset().select_related("category")

        transaction_type = self.request.query_params.get("type")
        category_id = self.request.query_params.get("category")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        period = self.request.query_params.get("period")  # week | month | year
        search = self.request.query_params.get("q")

        if transaction_type in ("income", "expense"):
            qs = qs.filter(transaction_type=transaction_type)
        if category_id:
            qs = qs.filter(category_id=category_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(Q(description__icontains=search) | Q(notes__icontains=search))
        if period:
            qs = qs.filter(date__gte=_period_start(period))

        return qs


# ========================================================================
# BUDGET
# ========================================================================
class BudgetViewSet(UserScopedModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer

    def get_queryset(self):
        return super().get_queryset().select_related("category")


# ========================================================================
# SAVINGS GOAL
# ========================================================================
class SavingsGoalViewSet(UserScopedModelViewSet):
    queryset = SavingsGoal.objects.all()
    serializer_class = SavingsGoalSerializer


# ========================================================================
# NOTIFICATION
# ========================================================================
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


# ========================================================================
# HELPERS
# ========================================================================
def _period_start(period):
    today = timezone.localdate()
    if period == "week":
        return today - timedelta(days=today.weekday())
    if period == "month":
        return today.replace(day=1)
    if period == "year":
        return today.replace(month=1, day=1)
    return date(1970, 1, 1)


def _totals_for_queryset(qs):
    income = qs.filter(transaction_type=Transaction.INCOME).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    expenses = qs.filter(transaction_type=Transaction.EXPENSE).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    return income, expenses


# ========================================================================
# DASHBOARD
# ========================================================================
class DashboardView(APIView):
    """GET /api/dashboard/?period=week|month|year|all"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get("period", "month")
        qs = Transaction.objects.filter(user=request.user)
        if period != "all":
            qs = qs.filter(date__gte=_period_start(period))

        income, expenses = _totals_for_queryset(qs)
        balance = income - expenses

        savings_total = SavingsGoal.objects.filter(user=request.user).aggregate(
            t=Sum("current_amount")
        )["t"] or Decimal("0")

        transaction_count = qs.count()

        recent = Transaction.objects.filter(user=request.user).select_related("category")[:5]

        active_budgets = Budget.objects.filter(user=request.user).select_related("category")
        budgets_over = [b for b in active_budgets if b.percent_used() >= 100]

        return Response(
            {
                "period": period,
                "balance": balance,
                "income": income,
                "expenses": expenses,
                "savings": savings_total,
                "transaction_count": transaction_count,
                "recent_transactions": TransactionSerializer(recent, many=True).data,
                "budgets_over_limit": len(budgets_over),
            }
        )


# ========================================================================
# ANALYTICS
# ========================================================================
class AnalyticsView(APIView):
    """GET /api/analytics/?months=6 -> structured data for Chart.js"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        months = int(request.query_params.get("months", 6))
        today = timezone.localdate()
        user = request.user

        # --- Spending by category (all-time-ish: current month) ---
        month_start = today.replace(day=1)
        category_qs = (
            Transaction.objects.filter(
                user=user, transaction_type=Transaction.EXPENSE, date__gte=month_start
            )
            .values("category__name", "category__icon")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )
        spending_by_category = [
            {
                "category": row["category__name"] or "Uncategorized",
                "icon": row["category__icon"] or "📁",
                "total": row["total"],
            }
            for row in category_qs
        ]

        # --- Monthly income vs expenses trend ---
        monthly_labels = []
        monthly_income = []
        monthly_expenses = []

        # build the last `months` month buckets, oldest first
        buckets = []
        cursor_year, cursor_month = today.year, today.month
        for _ in range(months):
            buckets.append((cursor_year, cursor_month))
            cursor_month -= 1
            if cursor_month == 0:
                cursor_month = 12
                cursor_year -= 1
        buckets.reverse()

        for year, month in buckets:
            label = date(year, month, 1).strftime("%b %Y")
            monthly_labels.append(label)
            month_qs = Transaction.objects.filter(user=user, date__year=year, date__month=month)
            income, expenses = _totals_for_queryset(month_qs)
            monthly_income.append(income)
            monthly_expenses.append(expenses)

        # --- Savings progress ---
        goals = SavingsGoal.objects.filter(user=user)
        savings_progress = [
            {
                "name": g.name,
                "target": g.target_amount,
                "current": g.current_amount,
                "percent": g.percent_complete(),
            }
            for g in goals
        ]

        return Response(
            {
                "spending_by_category": spending_by_category,
                "monthly_trend": {
                    "labels": monthly_labels,
                    "income": monthly_income,
                    "expenses": monthly_expenses,
                },
                "savings_progress": savings_progress,
            }
        )
