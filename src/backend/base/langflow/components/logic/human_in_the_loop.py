from langflow.custom import Component
from langflow.io import MessageTextInput, HandleInput, Output
from langflow.schema.message import Message
from langflow.components.logic.exceptions import HumanInputRequiredError

class HumanInLoopComponent(Component):
    display_name = "Human In The Loop"
    description = "Pauses the flow and prompts the user for input before continuing."
    icon = "user-check"
    name = "HumanInLoop"
    beta = True

    inputs = [
        MessageTextInput(
            name="question",
            display_name="Question",
            info="The question to ask the user.",
            required=True,
            tool_mode=True,
        ),
        HandleInput(
            name="input_value",
            display_name="Input Value",
            info="The data from the previous component that will be passed through after user input.",
            input_types=["Data", "Message", "DataFrame"],
            required=True,
        ),
        MessageTextInput(
            name="user_response",
            display_name="User Response",
            info="This field will be populated with the user's answer to resume the flow.",
            advanced=True,
            show=False, # Hidden from the user in the UI
        ),
    ]

    outputs = [
        Output(display_name="User Response", name="response", method="get_response"),
        Output(display_name="Original Input", name="original_input", method="pass_through_input"),
    ]

    def _check_for_pause(self):
        """Checks if the flow should pause for input."""
        # The component's `user_response` attribute is populated only when resuming.
        # If it's None, it's the first time we're hitting this node.
        if self.user_response is None:
            raise HumanInputRequiredError(question=self.question, component_id=self._id)

    def get_response(self) -> Message:
        """
        This output method is called when the 'User Response' handle is connected.
        It first checks if it needs to pause, and if not, returns the user's response.
        """
        self._check_for_pause()
        # If we are here, it means the flow is resuming.
        self.status = f"User responded: {self.user_response}"
        return Message(text=self.user_response)

    def pass_through_input(self) -> Message:
        """
        This output method is called when the 'Original Input' handle is connected.
        It first checks if it needs to pause, and if not, passes the original input through.
        """
        self._check_for_pause()
        # If we are here, it means the flow is resuming.
        self.status = self.input_value
        return self.input_value