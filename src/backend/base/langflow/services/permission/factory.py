from langflow.services.factory import ServiceFactory
from langflow.services.permission.service import PermissionService
from langflow.services.manager import service_manager
from langflow.services.schema import ServiceType

class PermissionServiceFactory(ServiceFactory):
    def __init__(self):
        super().__init__(PermissionService)

    def create(self):
        # This basic service might not need other services injected at creation time
        # If it did, they would be resolved using service_manager:
        # e.g. settings_service = service_manager.get(ServiceType.SETTINGS_SERVICE)
        return PermissionService()

# Registration step, often done in manager.py or a central services __init__
# For now, let's assume this factory will be added to the list in ServiceManager
