from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile, Category, DEFAULT_CATEGORIES


@receiver(post_save, sender=User)
def create_profile_and_defaults(sender, instance, created, **kwargs):
    """When a new user registers, give them a Profile and the default category set."""
    if not created:
        return

    Profile.objects.get_or_create(user=instance)

    Category.objects.bulk_create(
        [
            Category(user=instance, name=name, icon=icon)
            for name, icon in DEFAULT_CATEGORIES
        ],
        ignore_conflicts=True,
    )
