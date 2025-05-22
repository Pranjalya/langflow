from typing import Optional, Union
from uuid import UUID, uuid4

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from langflow.database.models.permission.model import PermissionType, ResourceType, ResourcePermission
from langflow.services.database.models.user.model import User
from langflow.services.database.models.folder.model import Folder
from langflow.services.database.models.flow.model import Flow


class PermissionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def has_permission(
        self,
        user: User,
        resource_id: str | UUID,
        resource_type: ResourceType,
        permission_type: PermissionType,
    ) -> bool:
        """Check if a user has a specific permission on a resource."""
        # Convert string ID to UUID if needed
        resource_id = UUID(str(resource_id)) if isinstance(resource_id, str) else resource_id
        
        # Owner always has all permissions
        if resource_type == ResourceType.FOLDER:
            folder_query = select(Folder).where(Folder.id == resource_id)
            folder_result = await self.session.exec(folder_query)
            folder = folder_result.first()
            if folder and folder.user_id == user.id:
                return True
        elif resource_type == ResourceType.FLOW:
            flow_query = select(Flow).where(Flow.id == resource_id)
            flow_result = await self.session.exec(flow_query)
            flow = flow_result.first()
            if flow and flow.user_id == user.id:
                return True

        # Check explicit permissions
        permission_query = select(ResourcePermission).where(
            ResourcePermission.grantee_user_id == user.id,
            ResourcePermission.resource_id == str(resource_id),
            ResourcePermission.resource_type == resource_type.value,
            ResourcePermission.permission_type == permission_type.value,
        )
        permission_result = await self.session.exec(permission_query)
        permission = permission_result.first()

        return permission is not None

    async def grant_permission(
        self,
        grantor: User,
        grantee: User,
        resource_id: Union[str, UUID],
        resource_type: ResourceType,
        permission_type: PermissionType,
    ) -> ResourcePermission:
        """Grant a permission to a user for a resource."""
        # Convert resource_id to string if it's a UUID
        resource_id_str = str(resource_id) if isinstance(resource_id, UUID) else resource_id

        # Check if permission already exists
        existing_permission_query = select(ResourcePermission).where(
            ResourcePermission.grantee_user_id == str(grantee.id),
            ResourcePermission.resource_id == resource_id_str,
            ResourcePermission.resource_type == resource_type.value,
            ResourcePermission.permission_type == permission_type.value,
        )
        existing_permission_result = await self.session.exec(existing_permission_query)
        existing_permission = existing_permission_result.first()

        if existing_permission:
            return existing_permission

        # Create new permission with generated UUID as string
        permission = ResourcePermission(
            id=str(uuid4()),  # Convert UUID to string
            grantee_user_id=str(grantee.id),
            resource_id=resource_id_str,
            resource_type=resource_type.value,
            permission_type=permission_type.value,
            granted_by_user_id=str(grantor.id),
        )

        self.session.add(permission)
        await self.session.commit()
        await self.session.refresh(permission)

        return permission

    async def revoke_permission(
        self,
        revoker: User,
        grantee: User,
        resource_id: str | UUID,
        resource_type: ResourceType,
        permission_type: PermissionType,
    ) -> None:
        """Revoke a permission from a user."""
        # Convert string ID to UUID if needed
        resource_id = UUID(str(resource_id)) if isinstance(resource_id, str) else resource_id
        
        # Check if revoker has permission to manage permissions
        if not await self.has_permission(
            revoker, resource_id, resource_type, PermissionType.MANAGE_PERMISSIONS
        ):
            raise PermissionError("Revoker does not have permission to manage permissions")

        # Delete the permission
        await self.session.exec(
            select(ResourcePermission).where(
                ResourcePermission.grantee_user_id == grantee.id,
                ResourcePermission.resource_id == str(resource_id),
                ResourcePermission.resource_type == resource_type.value,
                ResourcePermission.permission_type == permission_type.value,
            )
        ).delete()
        await self.session.commit() 