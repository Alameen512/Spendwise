from django.contrib.auth import logout as auth_logout
from django.shortcuts import render, redirect


def home_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    return render(request, "home.html")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    return render(request, "login.html")


def register_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    return render(request, "register.html")


def logout_view(request):
    auth_logout(request)
    return redirect("home")


def dashboard_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    return render(request, "dashboard.html")


def transactions_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    return render(request, "transactions.html")


def budgets_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    return render(request, "budgets.html")


def savings_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    return render(request, "savings.html")


def analytics_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    return render(request, "analytics.html")


def profile_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    return render(request, "profile.html")
