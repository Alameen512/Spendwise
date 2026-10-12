from django.contrib import admin

from .models import Profile, Category, Transaction, Budget, SavingsGoal, Notification


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "currency", "created_at")
    search_fields = ("user__username", "user__email", "phone")
    list_filter = ("currency",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "user", "created_at")
    search_fields = ("name", "user__username")
    list_filter = ("created_at",)
    ordering = ("user", "name")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("description", "user", "transaction_type", "category", "amount", "date")
    search_fields = ("description", "notes", "user__username")
    list_filter = ("transaction_type", "category", "date")
    ordering = ("-date",)
    date_hierarchy = "date"


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("category", "user", "amount", "start_date", "end_date", "spent", "remaining")
    search_fields = ("category__name", "user__username")
    list_filter = ("start_date", "end_date")


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "target_amount", "current_amount", "deadline", "percent_complete")
    search_fields = ("name", "user__username")
    list_filter = ("deadline",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "is_read", "created_at")
    search_fields = ("title", "message", "user__username")
    list_filter = ("is_read", "created_at")
