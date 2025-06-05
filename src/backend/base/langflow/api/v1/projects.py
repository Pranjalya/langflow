import io
import json
import zipfile
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

import orjson
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from fastapi_pagination import Params
from fastapi_pagination.ext.sqlmodel import apaginate
from sqlalchemy import or_, update, and_
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from langflow.api.utils import CurrentActiveUser, DbSession, cascade_delete_flow, custom_params, remove_api_keys
from langflow.api.v1.flows import create_flows
from langflow.api.v1.schemas import FlowListCreate
from langflow.logging import logger
from langflow.helpers.flow import generate_unique_flow_name
from langflow.helpers.folders import generate_unique_folder_name
from langflow.initial_setup.constants import STARTER_FOLDER_NAME
from langflow.services.database.models.flow.model import Flow, FlowCreate, FlowRead
from langflow.services.database.models.folder.constants import DEFAULT_FOLDER_NAME
from langflow.services.database.models.folder.model import (
    Folder,
    FolderCreate,
    FolderRead,
    FolderReadWithFlows,
    FolderUpdate,
)
from langflow.services.database.models.folder.pagination_model import FolderWithPaginatedFlows
from langflow.services.database.models.user.model import User
from langflow.services.database.models.resource_permission import ResourcePermission, PermissionLevel, ResourceType
from langflow.api.v1.schemas import ProjectUserPermissionsResponse, ProjectUserPermission, ProjectUserPermissionUpdate, ProjectPermissionResponse
from langflow.services.database.resource_permission import get_resource_permission
from langflow.services.auth.utils import get_current_active_user, get_session

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=FolderRead, status_code=201)
async def create_project(
    *,
    session: DbSession,
    project: FolderCreate,
    current_user: CurrentActiveUser,
):
    try:
        project_data = project.model_dump(exclude_unset=True)
        project_data.pop("users", None)  # Remove users from the dict
        new_project = Folder(**project_data)
        new_project.user_id = current_user.id
        # Add shared users if provided
        if project.users:
            users = (await session.exec(select(User).where(User.id.in_([u.id for u in project.users])))).all()
            new_project.users = users  # Assign model instances, not UUIDs
            
            # Create ResourcePermission entries for each user
            for user_permission in project.users:
                user = next((u for u in users if u.id == user_permission.id), None)
                if user:
                    permission = ResourcePermission(
                        resource_id=new_project.id,
                        grantor_id=current_user.id,
                        grantee_id=user.id,
                        permission_level='USER',  # Default to USER, will be overridden by specific permissions
                        resource_type='project',
                        can_read=user_permission.can_read,
                        can_run=user_permission.can_run,
                        can_edit=user_permission.can_edit
                    )
                    session.add(permission)
        
        # First check if the project.name is unique
        # there might be flows with name like: "MyFlow", "MyFlow (1)", "MyFlow (2)"
        # so we need to check if the name is unique with `like` operator
        # if we find a flow with the same name, we add a number to the end of the name
        # based on the highest number found
        if (
            await session.exec(
                statement=select(Folder).where(Folder.name == new_project.name).where(Folder.user_id == current_user.id)
            )
        ).first():
            project_results = await session.exec(
                select(Folder).where(
                    Folder.name.like(f"{new_project.name}%"),  # type: ignore[attr-defined]
                    Folder.user_id == current_user.id,
                )
            )
            if project_results:
                project_names = [project.name for project in project_results]
                project_numbers = [int(name.split("(")[-1].split(")")[0]) for name in project_names if "(" in name]
                if project_numbers:
                    new_project.name = f"{new_project.name} ({max(project_numbers) + 1})"
                else:
                    new_project.name = f"{new_project.name} (1)"
        
        session.add(new_project)
        await session.commit()
        await session.refresh(new_project)
        return new_project
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            # Get the name of the column that failed
            columns = str(e).split("UNIQUE constraint failed: ")[1].split(".")[1].split("\n")[0]
            # UNIQUE constraint failed: flow.user_id, flow.name
            # or UNIQUE constraint failed: flow.name
            # if the column has id in it, we want the other column
            column = columns.split(",")[1] if "id" in columns.split(",")[0] else columns.split(",")[0]

            raise HTTPException(
                status_code=400, detail=f"{column.capitalize().replace('_', ' ')} must be unique"
            ) from e
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/", response_model=list[FolderRead], status_code=200)
async def read_projects(
    *,
    session: DbSession,
    current_user: CurrentActiveUser,
):
    try:
        # Folders owned by the user or public
        owned_or_public_stmt = select(Folder).where(
            or_(Folder.user_id == current_user.id, Folder.user_id == None)
        )

        # Folders shared with the user
        # shared_stmt = select(Folder).join(Folder.users).where(User.id == current_user.id)
        shared_stmt = (select(Folder)
                       .join(ResourcePermission, ResourcePermission.resource_id == Folder.id)
                       .where(ResourcePermission.grantee_id == current_user.id)
                       .where(ResourcePermission.resource_type == 'project'))

        # Execute both queries
        owned_or_public_projects = (await session.exec(owned_or_public_stmt)).all()
        shared_projects = (await session.exec(shared_stmt)).all()

        # Combine and deduplicate
        all_projects = {project.id: project for project in owned_or_public_projects + shared_projects}
        projects = [project for project in all_projects.values() if project.name != STARTER_FOLDER_NAME]

        return sorted(projects, key=lambda x: x.name != DEFAULT_FOLDER_NAME)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{project_id}", response_model=FolderWithPaginatedFlows | FolderReadWithFlows, status_code=200)
async def read_project(
    *,
    session: DbSession,
    project_id: UUID,
    current_user: CurrentActiveUser,
    params: Annotated[Params | None, Depends(custom_params)],
    is_component: bool = False,
    is_flow: bool = False,
    search: str = "",
):
    try:
        logger.info(f"Project ID: {project_id}")
        logger.info(f"params: {params}")
        project = (
            await session.exec(
                select(Folder)
                .options(selectinload(Folder.flows))
                .where(
                    Folder.id == project_id,
                    or_(
                        Folder.user_id == current_user.id,
                        and_(
                            ResourcePermission.resource_id == Folder.id,
                            ResourcePermission.grantee_id == current_user.id,
                            ResourcePermission.resource_type == 'project'
                        )
                    )
                )
            )
        ).first()
    except Exception as e:
        if "No result found" in str(e):
            raise HTTPException(status_code=404, detail="Project not found") from e
        raise HTTPException(status_code=500, detail=str(e)) from e

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"project found {project}")

    try:
        if params and params.page and params.size:
            stmt = select(Flow).where(Flow.folder_id == project_id)

            if Flow.updated_at is not None:
                stmt = stmt.order_by(Flow.updated_at.desc())  # type: ignore[attr-defined]
            if is_component:
                stmt = stmt.where(Flow.is_component == True)  # noqa: E712
            if is_flow:
                stmt = stmt.where(Flow.is_component == False)  # noqa: E712
            if search:
                stmt = stmt.where(Flow.name.like(f"%{search}%"))  # type: ignore[attr-defined]
            import warnings

            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore", category=DeprecationWarning, module=r"fastapi_pagination\.ext\.sqlalchemy"
                )
                paginated_flows = await apaginate(session, stmt, params=params)

            return FolderWithPaginatedFlows(folder=FolderRead.model_validate(project), flows=paginated_flows)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return project


@router.patch("/{project_id}", response_model=FolderRead, status_code=200)
async def update_project(
    *,
    session: DbSession,
    project_id: UUID,
    project: FolderUpdate,  # Assuming FolderUpdate is a Pydantic model defining updatable fields
    current_user: CurrentActiveUser,
):
    try:
        existing_project = (
            await session.exec(select(Folder).where(Folder.id == project_id, Folder.user_id == current_user.id))
        ).first()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    if not existing_project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        if project.name and project.name != existing_project.name:
            existing_project.name = project.name
            session.add(existing_project)
            await session.commit()
            await session.refresh(existing_project)
            return existing_project

        project_data = existing_project.model_dump(exclude_unset=True)
        for key, value in project_data.items():
            if key not in {"components", "flows"}:
                setattr(existing_project, key, value)
        
        # Update shared users if provided
        if project.users is not None:
            # Get current shared users
            current_permissions = await session.exec(
                select(ResourcePermission).where(
                    ResourcePermission.resource_id == project_id,
                    ResourcePermission.resource_type == 'project'
                )
            )
            current_shared_users = {p.grantee_id for p in current_permissions}
            
            # Get new shared users
            new_shared_users = set(project.users)
            
            # Remove permissions for users no longer shared with
            users_to_remove = current_shared_users - new_shared_users
            if users_to_remove:
                await session.exec(
                    select(ResourcePermission).where(
                        ResourcePermission.resource_id == project_id,
                        ResourcePermission.grantee_id.in_(users_to_remove),
                        ResourcePermission.resource_type == 'project'
                    )
                )
            
            # Add permissions for new shared users
            users_to_add = new_shared_users - current_shared_users
            for user_id in users_to_add:
                permission = ResourcePermission(
                    resource_id=project_id,
                    grantor_id=current_user.id,
                    grantee_id=user_id,
                    permission_level='USER',  # Default to USER since we're using granular permissions
                    resource_type='project',
                    can_read=True,  # Default permissions for new users
                    can_run=True,
                    can_edit=False
                )
                session.add(permission)
            
            # Update the users relationship
            users = (await session.exec(select(User).where(User.id.in_(project.users)))).all()
            existing_project.users = users

        session.add(existing_project)
        await session.commit()
        await session.refresh(existing_project)

        concat_project_components = project.components + project.flows

        flows_ids = (await session.exec(select(Flow.id).where(Flow.folder_id == project_id))).all()

        excluded_flows = list(set(flows_ids) - set(concat_project_components))

        my_collection_project = (await session.exec(select(Folder).where(Folder.name == DEFAULT_FOLDER_NAME))).first()
        if my_collection_project:
            update_statement_my_collection = (
                update(Flow).where(Flow.id.in_(excluded_flows)).values(folder_id=my_collection_project.id)  # type: ignore[attr-defined]
            )
            await session.exec(update_statement_my_collection)
            await session.commit()

        if concat_project_components:
            update_statement_components = (
                update(Flow).where(Flow.id.in_(concat_project_components)).values(folder_id=existing_project.id)  # type: ignore[attr-defined]
            )
            await session.exec(update_statement_components)
            await session.commit()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return existing_project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    *,
    session: DbSession,
    project_id: UUID,
    current_user: CurrentActiveUser,
):
    try:
        project = (
            await session.exec(select(Folder).where(Folder.id == project_id, Folder.user_id == current_user.id))
        ).first()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Delete all flows in the project
        flows = (await session.exec(select(Flow).where(Flow.folder_id == project_id))).all()
        for flow in flows:
            await cascade_delete_flow(session, flow.id)

        # Delete the project
        await session.delete(project)
        await session.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/download/{project_id}", status_code=200)
async def download_file(
    *,
    session: DbSession,
    project_id: UUID,
    current_user: CurrentActiveUser,
):
    try:
        project = (
            await session.exec(select(Folder).where(Folder.id == project_id, Folder.user_id == current_user.id))
        ).first()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        flows = (await session.exec(select(Flow).where(Flow.folder_id == project_id))).all()
        if not flows:
            raise HTTPException(status_code=404, detail="No flows found in project")

        # Create a zip file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            # Add each flow to the zip file
            for flow in flows:
                flow_data = flow.model_dump()
                flow_data = remove_api_keys(flow_data)
                zip_file.writestr(f"{flow.name}.json", orjson.dumps(flow_data).decode())

        # Reset buffer position
        zip_buffer.seek(0)

        # Create the response
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{project.name}.zip"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/upload/", response_model=list[FlowRead], status_code=201)
async def upload_file(
    *,
    session: DbSession,
    file: Annotated[UploadFile, File(...)],
    current_user: CurrentActiveUser,
):
    """Upload flows from a file."""
    contents = await file.read()
    data = orjson.loads(contents)

    if not data:
        raise HTTPException(status_code=400, detail="No flows found in the file")

    project_name = await generate_unique_folder_name(data["folder_name"], current_user.id, session)

    data["folder_name"] = project_name

    project = FolderCreate(name=data["folder_name"], description=data["folder_description"])

    new_project = Folder.model_validate(project, from_attributes=True)
    new_project.id = None
    new_project.user_id = current_user.id
    session.add(new_project)
    await session.commit()
    await session.refresh(new_project)

    del data["folder_name"]
    del data["folder_description"]

    if "flows" in data:
        flow_list = FlowListCreate(flows=[FlowCreate(**flow) for flow in data["flows"]])
    else:
        raise HTTPException(status_code=400, detail="No flows found in the data")
    # Now we set the user_id for all flows
    for flow in flow_list.flows:
        flow_name = await generate_unique_flow_name(flow.name, current_user.id, session)
        flow.name = flow_name
        flow.user_id = current_user.id
        flow.folder_id = new_project.id

    return await create_flows(session=session, flow_list=flow_list, current_user=current_user)


@router.get("/{project_id}/users", response_model=ProjectUserPermissionsResponse, status_code=200)
async def get_project_users(
    *,
    session: DbSession,
    project_id: UUID,
    current_user: CurrentActiveUser,
):
    """Get all users and their permissions for a specific project."""
    try:
        # First check if the project exists and user has access
        project = (await session.exec(
            select(Folder).where(
                Folder.id == project_id,
                or_(
                    Folder.user_id == current_user.id,
                    and_(
                        ResourcePermission.resource_id == Folder.id,
                        ResourcePermission.grantee_id == current_user.id,
                        ResourcePermission.resource_type == 'project'
                    )
                )
            )
        )).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get all permissions for this project
        permissions = (await session.exec(
            select(ResourcePermission)
            .where(
                ResourcePermission.resource_id == project_id,
                ResourcePermission.resource_type == 'project'
            )
        )).all()

        # Get all users who have permissions
        user_ids = [p.grantee_id for p in permissions]
        users = (await session.exec(
            select(User).where(User.id.in_(user_ids))
        )).all()

        # Create response
        user_permissions = []
        for permission in permissions:
            user = next((u for u in users if u.id == permission.grantee_id), None)
            if user:
                user_permissions.append(
                    ProjectUserPermission(
                        user_id=user.id,
                        username=user.username,
                        can_read=permission.can_read,
                        can_run=permission.can_run,
                        can_edit=permission.can_edit,
                        is_project_admin=permission.permission_level == PermissionLevel.PROJECT_ADMIN
                    )
                )

        # Add the project owner if not already in the list
        if project.user_id not in [p.user_id for p in user_permissions]:
            owner = (await session.exec(
                select(User).where(User.id == project.user_id)
            )).first()
            if owner:
                user_permissions.append(
                    ProjectUserPermission(
                        user_id=owner.id,
                        username=owner.username,
                        can_read=True,
                        can_run=True,
                        can_edit=True,
                        is_project_admin=True
                    )
                )

        return ProjectUserPermissionsResponse(
            users=user_permissions,
            total_count=len(user_permissions)
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch("/{project_id}/users/{user_id}", response_model=ProjectUserPermission, status_code=200)
async def update_project_user_permissions(
    *,
    session: DbSession,
    project_id: UUID,
    user_id: UUID,
    permissions: ProjectUserPermissionUpdate,
    current_user: CurrentActiveUser,
):
    """Update a user's permissions for a specific project."""
    try:
        # First check if the project exists and user has access
        project = (await session.exec(
            select(Folder).where(
                Folder.id == project_id,
                or_(
                    Folder.user_id == current_user.id,
                    and_(
                        ResourcePermission.resource_id == Folder.id,
                        ResourcePermission.grantee_id == current_user.id,
                        ResourcePermission.resource_type == 'project',
                        ResourcePermission.can_edit == True
                    )
                )
            )
        )).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check if the target user exists
        target_user = (await session.exec(
            select(User).where(User.id == user_id)
        )).first()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get existing permission or create new one
        permission = (await session.exec(
            select(ResourcePermission).where(
                ResourcePermission.resource_id == project_id,
                ResourcePermission.grantee_id == user_id,
                ResourcePermission.resource_type == 'project'
            )
        )).first()

        if not permission:
            # Create new permission
            permission = ResourcePermission(
                resource_id=project_id,
                grantor_id=current_user.id,
                grantee_id=user_id,
                resource_type='project',
                permission_level=PermissionLevel.PROJECT_ADMIN if permissions.is_project_admin else PermissionLevel.USER,
                can_read=permissions.can_read or False,
                can_run=permissions.can_run or False,
                can_edit=permissions.can_edit or False
            )
            session.add(permission)
        else:
            # Update existing permission
            if permissions.can_read is not None:
                permission.can_read = permissions.can_read
            if permissions.can_run is not None:
                permission.can_run = permissions.can_run
            if permissions.can_edit is not None:
                permission.can_edit = permissions.can_edit
            if permissions.is_project_admin is not None:
                permission.permission_level = PermissionLevel.PROJECT_ADMIN if permissions.is_project_admin else PermissionLevel.USER

        # If user is being made a PROJECT_ADMIN, update all flow permissions
        if permissions.is_project_admin:
            # Get all flows in the project
            flows = await session.exec(
                select(Flow).where(Flow.folder_id == project_id)
            )
            
            # Update or create permissions for each flow
            for flow in flows:
                flow_permission = (await session.exec(
                    select(ResourcePermission).where(
                        ResourcePermission.resource_id == flow.id,
                        ResourcePermission.grantee_id == user_id,
                        ResourcePermission.resource_type == 'flow'
                    )
                )).first()

                if not flow_permission:
                    # Create new flow permission
                    flow_permission = ResourcePermission(
                        resource_id=flow.id,
                        grantor_id=current_user.id,
                        grantee_id=user_id,
                        resource_type='flow',
                        permission_level=PermissionLevel.PROJECT_ADMIN,
                        can_read=True,
                        can_run=True,
                        can_edit=True
                    )
                    session.add(flow_permission)
                else:
                    # Update existing flow permission
                    flow_permission.permission_level = PermissionLevel.PROJECT_ADMIN
                    flow_permission.can_read = True
                    flow_permission.can_run = True
                    flow_permission.can_edit = True

        await session.commit()
        await session.refresh(permission)

        return ProjectUserPermission(
            user_id=user_id,
            can_read=permission.can_read,
            can_run=permission.can_run,
            can_edit=permission.can_edit
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{project_id}/users/{user_id}", status_code=204)
async def remove_project_user(
    *,
    session: DbSession,
    project_id: UUID,
    user_id: UUID,
    current_user: CurrentActiveUser,
):
    """Remove a user's permissions from a project."""
    try:
        # First check if the project exists and user has access
        project = (await session.exec(
            select(Folder).where(
                Folder.id == project_id,
                or_(
                    Folder.user_id == current_user.id,
                    and_(
                        ResourcePermission.resource_id == Folder.id,
                        ResourcePermission.grantee_id == current_user.id,
                        ResourcePermission.resource_type == 'project',
                        ResourcePermission.can_edit == True
                    )
                )
            )
        )).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get the permission to delete
        permission = (await session.exec(
            select(ResourcePermission).where(
                ResourcePermission.resource_id == project_id,
                ResourcePermission.grantee_id == user_id,
                ResourcePermission.resource_type == 'project'
            )
        )).first()

        if not permission:
            raise HTTPException(status_code=404, detail="User permission not found")

        # Don't allow removing the project owner
        if project.user_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot remove project owner")

        await session.delete(permission)
        await session.commit()

    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/{project_id}/permissions",
    response_model=ProjectPermissionResponse,
    dependencies=[Depends(get_current_active_user)],
)
async def get_project_permissions(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectPermissionResponse:
    """Get the permissions for a project for the current user."""
    # Get the project
    project = (
        await session.exec(
            select(Folder).where(
                Folder.id == project_id,
                or_(
                    Folder.user_id == current_user.id,
                    and_(
                        ResourcePermission.resource_id == Folder.id,
                        ResourcePermission.grantee_id == current_user.id,
                        ResourcePermission.resource_type == 'project'
                    )
                )
            )
        )
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get the permission for the current user
    permission = await get_resource_permission(
        session,
        resource_id=project_id,
        grantee_id=current_user.id,
        resource_type=ResourceType.PROJECT,
    )

    if not permission:
        # If no explicit permission is set, return default permissions
        return ProjectPermissionResponse(
            permission_level=PermissionLevel.USER,
            can_read=False,
            can_edit=False,
            can_run=False,
        )

    return ProjectPermissionResponse(
        permission_level=permission.permission_level,
        can_read=permission.can_read,
        can_edit=permission.can_edit,
        can_run=permission.can_run,
    )
