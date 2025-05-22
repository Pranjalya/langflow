from uuid import UUID
from typing import List, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from loguru import logger

from langflow.services.base import Service
from langflow.services.database.models.permission.model import (
    UserResourcePermission,
    ResourceTypeEnum,
    PermissionTypeEnum,
    UserResourcePermissionCreate,
)
# Adjusted import for session_scope based on common patterns in Langflow
from langflow.services.database.utils import session_scope
# get_or_create_super_user might not be directly needed here if owner assignment is handled in API layer
# from langflow.services.utils import get_or_create_super_user


class PermissionService(Service):
    name = "permission_service"

    def __init__(self):
        # In Langflow, services usually take settings and store_service as args
        # For now, let's keep it simple as per LLD if they are not strictly needed for this service's core logic
        pass

    async def grant_permission(
        self,
        user_id: UUID,
        resource_id: UUID,
        resource_type: ResourceTypeEnum,
        permission: PermissionTypeEnum,
        db_session: Optional[AsyncSession] = None,
    ) -> UserResourcePermission:
        logger.debug(
            f"Granting {permission} permission to user {user_id} for {resource_type.value} {resource_id}"
        )
        
        async def _grant(session: AsyncSession):
            existing_permission_stmt = select(UserResourcePermission).where(
                UserResourcePermission.user_id == user_id,
                UserResourcePermission.resource_id == resource_id,
                UserResourcePermission.resource_type == resource_type,
                UserResourcePermission.permission == permission,
            )
            existing_permission = (await session.exec(existing_permission_stmt)).first()
            if existing_permission:
                logger.debug("Permission already exists.")
                return existing_permission

            permission_create = UserResourcePermissionCreate(
                user_id=user_id,
                resource_id=resource_id,
                resource_type=resource_type,
                permission=permission,
            )
            # Ensure that enums are passed as their value if necessary for model_validate,
            # but SQLModel should handle enum objects directly.
            db_permission = UserResourcePermission.model_validate(permission_create)
            session.add(db_permission)
            await session.commit()
            await session.refresh(db_permission)
            logger.info(f"Successfully granted {permission.value} to user {user_id} for {resource_type.value} {resource_id}")
            return db_permission

        if db_session:
            return await _grant(db_session)
        else:
            # Assuming session_scope is an async context manager
            async with session_scope() as session:
                return await _grant(session)


    async def revoke_permission(
        self,
        user_id: UUID,
        resource_id: UUID,
        resource_type: ResourceTypeEnum,
        permission: PermissionTypeEnum,
        db_session: Optional[AsyncSession] = None,
    ) -> bool:
        logger.debug(
            f"Revoking {permission.value} permission from user {user_id} for {resource_type.value} {resource_id}"
        )
        async def _revoke(session: AsyncSession):
            stmt = select(UserResourcePermission).where(
                UserResourcePermission.user_id == user_id,
                UserResourcePermission.resource_id == resource_id,
                UserResourcePermission.resource_type == resource_type,
                UserResourcePermission.permission == permission,
            )
            permission_to_revoke = (await session.exec(stmt)).first()
            if permission_to_revoke:
                await session.delete(permission_to_revoke)
                await session.commit()
                logger.info(f"Successfully revoked {permission.value} from user {user_id} for {resource_type.value} {resource_id}")
                return True
            logger.debug("Permission not found for revocation.")
            return False
        
        if db_session:
            return await _revoke(db_session)
        else:
            async with session_scope() as session:
                return await _revoke(session)

    async def check_permission(
        self,
        user_id: UUID,
        resource_id: UUID,
        resource_type: ResourceTypeEnum,
        required_permission: PermissionTypeEnum,
        db_session: Optional[AsyncSession] = None,
    ) -> bool:
        logger.debug(
            f"Checking {required_permission.value} permission for user {user_id} on {resource_type.value} {resource_id}"
        )
        
        async def _check(session: AsyncSession):
            # Define permission hierarchy (OWNER > WRITE > RUN > READ)
            # A user with a higher permission implicitly has lower ones.
            permission_hierarchy = {
                PermissionTypeEnum.OWNER: [PermissionTypeEnum.OWNER, PermissionTypeEnum.WRITE, PermissionTypeEnum.RUN, PermissionTypeEnum.READ],
                PermissionTypeEnum.WRITE: [PermissionTypeEnum.WRITE, PermissionTypeEnum.RUN, PermissionTypeEnum.READ], # Assuming WRITE implies RUN and READ
                PermissionTypeEnum.RUN: [PermissionTypeEnum.RUN, PermissionTypeEnum.READ], # Assuming RUN implies READ
                PermissionTypeEnum.READ: [PermissionTypeEnum.READ],
            }

            # Find all permissions the user has on the resource
            stmt = select(UserResourcePermission.permission).where(
                UserResourcePermission.user_id == user_id,
                UserResourcePermission.resource_id == resource_id,
                UserResourcePermission.resource_type == resource_type,
            )
            user_permissions_on_resource = (await session.exec(stmt)).all()

            for user_perm in user_permissions_on_resource:
                # user_perm is a PermissionTypeEnum instance
                if required_permission in permission_hierarchy.get(user_perm, []):
                    logger.debug(f"Permission {required_permission.value} granted via explicit grant: {user_perm.value}")
                    return True
                
            logger.debug(f"Permission {required_permission.value} denied for user {user_id} on {resource_type.value} {resource_id} based on explicit grants.")
            return False

        if db_session:
            return await _check(db_session)
        else:
            async with session_scope() as session:
                return await _check(session)

    async def get_user_permissions_for_resource(
        self,
        user_id: UUID,
        resource_id: UUID,
        resource_type: ResourceTypeEnum,
        db_session: Optional[AsyncSession] = None,
    ) -> List[PermissionTypeEnum]:
        logger.debug(f"Getting permissions for user {user_id} on {resource_type.value} {resource_id}")
        async def _get(session: AsyncSession):
            stmt = select(UserResourcePermission.permission).where(
                UserResourcePermission.user_id == user_id,
                UserResourcePermission.resource_id == resource_id,
                UserResourcePermission.resource_type == resource_type,
            )
            permissions = (await session.exec(stmt)).all()
            logger.debug(f"User {user_id} has permissions: {[p.value for p in permissions]} on {resource_type.value} {resource_id}")
            return permissions

        if db_session:
            return await _get(db_session)
        else:
            async with session_scope() as session:
                return await _get(session)

    async def list_resources_for_user(
        self,
        user_id: UUID,
        resource_type: ResourceTypeEnum,
        required_permission: PermissionTypeEnum, # The minimum permission required
        db_session: Optional[AsyncSession] = None,
    ) -> List[UUID]:
        logger.debug(f"Listing resources of type {resource_type.value} for user {user_id} with required permission {required_permission.value}")
        permission_hierarchy = {
            PermissionTypeEnum.OWNER: [PermissionTypeEnum.OWNER, PermissionTypeEnum.WRITE, PermissionTypeEnum.RUN, PermissionTypeEnum.READ],
            PermissionTypeEnum.WRITE: [PermissionTypeEnum.WRITE, PermissionTypeEnum.RUN, PermissionTypeEnum.READ],
            PermissionTypeEnum.RUN: [PermissionTypeEnum.RUN, PermissionTypeEnum.READ],
            PermissionTypeEnum.READ: [PermissionTypeEnum.READ],
        }
        
        # Find all types of permissions that would grant the required_permission
        granting_permissions = [
            perm for perm, implied_perms in permission_hierarchy.items() 
            if required_permission in implied_perms
        ]
        logger.debug(f"Required permission {required_permission.value} can be satisfied by grants: {[gp.value for gp in granting_permissions]}")

        async def _list(session: AsyncSession):
            stmt = select(UserResourcePermission.resource_id).distinct().where(
                UserResourcePermission.user_id == user_id,
                UserResourcePermission.resource_type == resource_type,
                UserResourcePermission.permission.in_(granting_permissions)
            )
            resource_ids = (await session.exec(stmt)).all()
            logger.debug(f"User {user_id} has access to {resource_type.value} IDs: {resource_ids} with at least {required_permission.value} permission.")
            return resource_ids

        if db_session:
            return await _list(db_session)
        else:
            async with session_scope() as session:
                return await _list(session)

    async def get_resource_owner_id(
        self,
        resource_id: UUID,
        resource_type: ResourceTypeEnum,
        db_session: Optional[AsyncSession] = None,
    ) -> Optional[UUID]:
        logger.debug(f"Getting owner ID for {resource_type.value} {resource_id}")
        async def _get_owner(session: AsyncSession):
            resource_model: Optional[type[SQLModel]] = None
            if resource_type == ResourceTypeEnum.FLOW:
                from langflow.services.database.models.flow.model import Flow
                resource_model = Flow
            elif resource_type == ResourceTypeEnum.FOLDER:
                from langflow.services.database.models.folder.model import Folder
                resource_model = Folder
            else:
                logger.warning(f"Unknown resource type: {resource_type.value}")
                return None
            
            if resource_model is None: # Should not happen if check above is exhaustive
                 return None

            resource = await session.get(resource_model, resource_id)
            if resource and hasattr(resource, 'user_id'):
                logger.debug(f"Owner of {resource_type.value} {resource_id} is {resource.user_id}")
                return resource.user_id # type: ignore
            elif resource:
                logger.warning(f"{resource_type.value} {resource_id} found, but has no 'user_id' attribute.")
                return None
            else:
                logger.warning(f"{resource_type.value} {resource_id} not found.")
                return None
        
        if db_session:
            return await _get_owner(db_session)
        else:
            async with session_scope() as session:
                return await _get_owner(session)
