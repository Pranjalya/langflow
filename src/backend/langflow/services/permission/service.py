from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from langflow.database.models.permission.model import PermissionType, ResourcePermission, ResourceType
from langflow.database.models.user.model import User


class PermissionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def has_permission(
        self,
        user: User,
        resource_id: UUID,
        resource_type: ResourceType,
        permission_type: PermissionType,
    ) -> bool:
        """
        Check if a user has a specific permission on a resource.
        """
        # Superusers have all permissions
        if user.is_superuser:
            return True

        # Check if user is the owner
        if resource_type == ResourceType.FOLDER:
            query = select(User).where(User.id == user.id).options(selectinload(User.folders))
            result = await self.db.execute(query)
            user_obj = result.scalar_one_or_none()
            if user_obj and any(folder.id == resource_id for folder in user_obj.folders):
                return True
        elif resource_type == ResourceType.FLOW:
            query = select(User).where(User.id == user.id).options(selectinload(User.flows))
            result = await self.db.execute(query)
            user_obj = result.scalar_one_or_none()
            if user_obj and any(flow.id == resource_id for flow in user_obj.flows):
                return True

        # Check explicit permissions
        query = select(ResourcePermission).where(
            ResourcePermission.grantee_user_id == user.id,
            ResourcePermission.resource_id == resource_id,
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.permission_type == permission_type,
        )
        result = await self.db.execute(query)
        permission = result.scalar_one_or_none()
        
        return permission is not None

    async def grant_permission(
        self,
        granter: User,
        grantee_id: UUID,
        resource_id: UUID,
        resource_type: ResourceType,
        permission_type: PermissionType,
    ) -> ResourcePermission:
        """
        Grant a permission to a user.
        """
        # Check if granter has MANAGE_PERMISSIONS
        if not await self.has_permission(
            granter, resource_id, resource_type, PermissionType.MANAGE_PERMISSIONS
        ):
            raise PermissionError("User does not have permission to grant permissions")

        # Create new permission
        permission = ResourcePermission(
            grantee_user_id=grantee_id,
            resource_id=resource_id,
            resource_type=resource_type,
            permission_type=permission_type,
            granted_by_user_id=granter.id,
        )
        self.db.add(permission)
        await self.db.commit()
        await self.db.refresh(permission)
        return permission

    async def revoke_permission(
        self,
        revoker: User,
        grantee_id: UUID,
        resource_id: UUID,
        resource_type: ResourceType,
        permission_type: PermissionType,
    ) -> None:
        """
        Revoke a permission from a user.
        """
        # Check if revoker has MANAGE_PERMISSIONS
        if not await self.has_permission(
            revoker, resource_id, resource_type, PermissionType.MANAGE_PERMISSIONS
        ):
            raise PermissionError("User does not have permission to revoke permissions")

        # Delete permission
        query = select(ResourcePermission).where(
            ResourcePermission.grantee_user_id == grantee_id,
            ResourcePermission.resource_id == resource_id,
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.permission_type == permission_type,
        )
        result = await self.db.execute(query)
        permission = result.scalar_one_or_none()
        
        if permission:
            await self.db.delete(permission)
            await self.db.commit() 