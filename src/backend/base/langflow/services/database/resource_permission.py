from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langflow.services.database.models.resource_permission import ResourcePermission, ResourceType

async def get_resource_permission(
    session: AsyncSession,
    resource_id: UUID,
    grantee_id: UUID,
    resource_type: ResourceType,
) -> Optional[ResourcePermission]:
    """
    Get the permission for a specific resource and grantee.
    
    Args:
        session: The database session
        resource_id: The ID of the resource (project or flow)
        grantee_id: The ID of the user to get permissions for
        resource_type: The type of resource (PROJECT or FLOW)
        
    Returns:
        The resource permission if found, None otherwise
    """
    query = select(ResourcePermission).where(
        ResourcePermission.resource_id == resource_id,
        ResourcePermission.grantee_id == grantee_id,
        ResourcePermission.resource_type == resource_type,
    )
    result = await session.execute(query)
    return result.scalar_one_or_none() 