from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models
from django.core.validators import MinValueValidator


DEFAULT_CATEGORIES = [
    ("Food", "🍔"),
    ("Transport", "🚗"),
    ("Education", "🎓"),
    ("Entertainment", "🎬"),
    ("Shopping", "🛍️"),
    ("Bills", "🧾"),
    ("Health", "💊"),
    ("Savings", "💰"),
    ("Other", "📦"),
]


class Profile(models.Model):
    """Extra per-user information that doesn't belong on django.contrib.auth.User."""

    CURRENCY_CHOICES = [
        ("NGN", "Nigerian Naira (₦)"),
        ("USD", "US Dollar ($)"),
        ("EUR", "Euro (€)"),
        ("GBP", "British Pound (£)"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    profile_image = models.ImageField(upload_to="profile_images/", blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="NGN")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


class Category(models.Model):
    """
    Expense/income categories. Default categories are seeded with user=None-like
    behaviour by being created per-user on registration (see signals.py) so that
    every user can freely edit/delete their own copy without affecting others.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, blank=True, default="📁")
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("user", "name")
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Transaction(models.Model):
    INCOME = "income"
    EXPENSE = "expense"
    TYPE_CHOICES = [
        (INCOME, "Income"),
        (EXPENSE, "Expense"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.description} ({self.transaction_type}) - {self.amount}"


class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="budgets")
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.category.name} budget: {self.amount}"

    def spent(self):
        total = Transaction.objects.filter(
            user=self.user,
            category=self.category,
            transaction_type=Transaction.EXPENSE,
            date__gte=self.start_date,
            date__lte=self.end_date,
        ).aggregate(total=models.Sum("amount"))["total"]
        return total or Decimal("0.00")

    def remaining(self):
        return self.amount - self.spent()

    def percent_used(self):
        if self.amount == 0:
            return 0
        pct = (self.spent() / self.amount) * 100
        return round(min(float(pct), 100), 1)


class SavingsGoal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="savings_goals")
    name = models.CharField(max_length=150)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    current_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    deadline = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def percent_complete(self):
        if self.target_amount == 0:
            return 0
        pct = (self.current_amount / self.target_amount) * 100
        return round(min(float(pct), 100), 1)


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=150)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
