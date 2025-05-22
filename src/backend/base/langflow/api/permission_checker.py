from functools import wraps
from typing import Callable, Coroutine, Any
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from langflow.services.auth.utils import get_current_active_user
from langflow.services.database.models.user.model import UserRead, User
# For PUBLIC check and owner_id retrieval, we need Flow and Folder models
from langflow.services.database.models.flow.model import Flow, AccessTypeEnum
from langflow.services.database.models.folder.model import Folder
from langflow.services.deps import get_permission_service, get_session # Assuming get_session provides AsyncSession
from langflow.services.permission.service import PermissionService, ResourceTypeEnum, PermissionTypeEnum


class PermissionChecker:
    def __init__(
        self,
        resource_type: ResourceTypeEnum,
        required_permission: PermissionTypeEnum,
        resource_id_param_name: str = "id", # Common default, e.g. /flows/{id}
    ):
        self.resource_type = resource_type
        self.required_permission = required_permission
        self.resource_id_param_name = resource_id_param_name

    async def __call__(
        self,
        request: Request,
        current_user: User = Depends(get_current_active_user), # Changed to User from UserRead for broader compatibility
        permission_service: PermissionService = Depends(get_permission_service),
        db_session: AsyncSession = Depends(get_session),
    ) -> None:
        logger.debug(
            f"User {current_user.id} ({'Superuser' if current_user.is_superuser else 'User'}) attempting "
            f"{self.required_permission.value} on {self.resource_type.value} "
            f"(resource ID from param: '{self.resource_id_param_name}')"
        )

        if current_user.is_superuser:
            logger.info(f"Superuser {current_user.id} granted access to {self.resource_type.value} for {self.required_permission.value}.")
            return

        resource_id_str = request.path_params.get(self.resource_id_param_name)
        if not resource_id_str:
            resource_id_str = request.query_params.get(self.resource_id_param_name)
            if not resource_id_str:
                # This case needs careful handling.
                # If creating a resource, there's no ID yet. This checker is for existing resources.
                # If listing, filtering should happen in the route.
                # For specific actions like UPDATE/DELETE/GET_ONE, an ID is expected.
                # If resource_id_param_name is not found for an action that requires it,
                # it's a client/developer error.
                if self.required_permission in [
                    PermissionTypeEnum.READ,
                    PermissionTypeEnum.WRITE,
                    PermissionTypeEnum.RUN,
                    PermissionTypeEnum.OWNER,
                ]: # These usually apply to a specific resource
                    logger.warning(
                        f"Resource ID parameter '{self.resource_id_param_name}' not found in request path or query "
                        f"for a permission check ({self.required_permission.value}) that requires it."
                    )
                    # Raising 404 might be more appropriate if the ID is expected in the path
                    # and defines the resource the endpoint operates on.
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND, 
                        detail=f"Resource ID '{self.resource_id_param_name}' not found in request path."
                    )
                # For list operations where checker might be used broadly, allow to proceed.
                # The route itself must then filter results appropriately.
                logger.debug("No resource ID found, but permission check does not strictly require one (e.g. general list). Passing through.")
                return


        try:
            resource_id = UUID(resource_id_str)
        except ValueError:
            logger.error(f"Invalid UUID format for resource ID: {resource_id_str}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resource ID format.")

        # 1. Check direct ownership
        # The LLD has `permission_service.get_resource_owner_id`. This is good.
        owner_id = await permission_service.get_resource_owner_id(resource_id, self.resource_type, db_session)
        
        if owner_id == current_user.id:
            logger.info(f"User {current_user.id} owns {self.resource_type.value} {resource_id}. Permission {self.required_permission.value} granted.")
            return

        # 2. If not owner, check explicit permissions from UserResourcePermission table
        # The LLD's `permission_service.check_permission` handles the hierarchy (OWNER > WRITE > RUN > READ)
        has_explicit_permission = await permission_service.check_permission(
            user_id=current_user.id,
            resource_id=resource_id,
            resource_type=self.resource_type,
            required_permission=self.required_permission, # This service method checks if any existing grant satisfies the required one
            db_session=db_session,
        )

        if has_explicit_permission:
            logger.info(f"User {current_user.id} has explicit permission {self.required_permission.value} for {self.resource_type.value} {resource_id}. Permission granted.")
            return

        # 3. Special handling for PUBLIC flows (READ and RUN)
        if self.resource_type == ResourceTypeEnum.FLOW and            self.required_permission in [PermissionTypeEnum.READ, PermissionTypeEnum.RUN]:
            # We need to fetch the flow to check its access_type
            flow = await db_session.get(Flow, resource_id) # Fetch by primary key
            if flow and flow.access_type == AccessTypeEnum.PUBLIC:
                logger.info(f"Flow {resource_id} is PUBLIC. READ/RUN permission granted to user {current_user.id}.")
                return
        
        logger.warning(
            f"Permission Denied: User {current_user.id} does not have {self.required_permission.value} "
            f"on {self.resource_type.value} {resource_id}."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
