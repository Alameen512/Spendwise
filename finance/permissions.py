from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Object-level permission that only allows the owner of an object to
    view/edit/delete it. Assumes the model instance has a `user` attribute.
    """

    def has_object_permission(self, request, view, obj):
        return getattr(obj, "user_id", None) == request.user.id
