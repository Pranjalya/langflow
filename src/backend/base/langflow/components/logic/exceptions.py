# langflow/components/logic/exceptions.py

class HumanInputRequiredError(Exception):
    """Custom exception to signal that human input is required."""
    def __init__(self, question: str, component_id: str):
        self.question = question
        self.component_id = component_id
        super().__init__(f"Human input required for component {component_id}: {question}")