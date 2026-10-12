from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Profile, Category, Transaction, Budget, SavingsGoal, Notification


# ----------------------------------------------------------------------
# Auth / User / Profile
# ----------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "user", "profile_image", "phone", "currency", "created_at"]
        read_only_fields = ["id", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "password", "password2"]

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


# ----------------------------------------------------------------------
# Category
# ----------------------------------------------------------------------
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon", "description", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        request = self.context["request"]
        qs = Category.objects.filter(user=request.user, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("You already have a category with this name.")
        return value


# ----------------------------------------------------------------------
# Transaction
# ----------------------------------------------------------------------
class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    category_icon = serializers.CharField(source="category.icon", read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = [
            "id", "category", "category_name", "category_icon", "transaction_type",
            "description", "amount", "date", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_category(self, value):
        if value is None:
            return value
        request = self.context["request"]
        if value.user_id != request.user.id:
            raise serializers.ValidationError("You cannot use a category that isn't yours.")
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


# ----------------------------------------------------------------------
# Budget
# ----------------------------------------------------------------------
class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)
    spent = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    percent_used = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id", "category", "category_name", "category_icon", "amount",
            "start_date", "end_date", "spent", "remaining", "percent_used", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_spent(self, obj):
        return obj.spent()

    def get_remaining(self, obj):
        return obj.remaining()

    def get_percent_used(self, obj):
        return obj.percent_used()

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and start > end:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs

    def validate_category(self, value):
        request = self.context["request"]
        if value.user_id != request.user.id:
            raise serializers.ValidationError("You cannot budget a category that isn't yours.")
        return value


# ----------------------------------------------------------------------
# Savings Goal
# ----------------------------------------------------------------------
class SavingsGoalSerializer(serializers.ModelSerializer):
    percent_complete = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = [
            "id", "name", "target_amount", "current_amount", "deadline",
            "percent_complete", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_percent_complete(self, obj):
        return obj.percent_complete()

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target amount must be greater than zero.")
        return value


# ----------------------------------------------------------------------
# Notification
# ----------------------------------------------------------------------
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "created_at"]
