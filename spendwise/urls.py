"""
spendwise URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from finance import views as page_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # REST API
    path('api/', include('finance.api_urls')),

    # Frontend (server-rendered shell pages; all data comes from /api/)
    path('', page_views.home_view, name='home'),
    path('login/', page_views.login_view, name='login'),
    path('register/', page_views.register_view, name='register'),
    path('logout/', page_views.logout_view, name='logout'),
    path('dashboard/', page_views.dashboard_view, name='dashboard'),
    path('transactions/', page_views.transactions_view, name='transactions'),
    path('budgets/', page_views.budgets_view, name='budgets'),
    path('savings/', page_views.savings_view, name='savings'),
    path('analytics/', page_views.analytics_view, name='analytics'),
    path('profile/', page_views.profile_view, name='profile'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
