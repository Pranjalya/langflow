import os
from typing import Any
from langchain_openai import ChatOpenAI

from langflow.base.models.model import LCModelComponent
from langflow.field_typing import LanguageModel
from langflow.field_typing.range_spec import RangeSpec
from langflow.inputs import StrInput, BoolInput, SecretStrInput
from langflow.io import DropdownInput, IntInput, SliderInput
from langflow.logging import logger

LLM_REASONING_OPTIONS = [
    "o1",
    "o1-mini",
    "o3-mini"
]

LLM_OPTIONS = [
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-v2",
    "gpt-35-turbo",
    "gpt-35-turbo-16k",
    "gpt-35-turbo-1106",
    "gpt-35-turbo-instruct",
    "gpt-4",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-vision-preview",
    "gpt-4o",
    "gpt-4o-mini",
    "Llama-2-13b-chat-maas",
    "chat-bison",
    "chat-bison-32k",
    "gemini-1.0-pro-001",
    "gemini-1.0-pro-002",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro-001",
    "gemini-2.0-flash-001",
    "Llama_3_70b",
    "Llama_3_8b",
    "meta-llama-3.1-8b-instruct",
    "meta-llama-3.1-70b-instruct",
    "meta-llama-3.3-70b-instruct"
]


class LLMGatewayComponent(LCModelComponent):
    display_name: str = "LLM Gateway"
    description: str = "Generate text using Custom LLM Gateway"
    documentation: str = ""
    beta = False
    icon = "Brain"
    name = "LLMGatewayModel"

    inputs = [
        *LCModelComponent._base_inputs,
        DropdownInput(
            name="model_name",
            display_name="Model Name",
            advanced=False,
            options=LLM_OPTIONS + LLM_REASONING_OPTIONS,
            value="gpt-4o-mini",
            combobox=True,
            real_time_refresh=True,
        ),
        SliderInput(
            name="temperature",
            display_name="Temperature",
            value=0.4,
            range_spec=RangeSpec(min=0, max=2, step=0.01),
            info="Controls randomness. Lower values are more deterministic, higher values are more creative.",
            advanced=True,
        ),
        IntInput(
            name="max_tokens",
            display_name="Max Tokens",
            advanced=True,
            info="The maximum number of tokens to generate. Set to 0 for unlimited tokens.",
        ),
        BoolInput(
            name="json_mode",
            display_name="JSON Mode",
            advanced=True,
            info="If True, it will output JSON regardless of passing a schema.",
        ),
        StrInput(
            name="base_url",
            display_name="LLM Gateway API Base URL",
            value="",
            advanced=False,
            info="The base URL of the LLM Gateway. "
            "Defaults to LLMGW_API_BASE in environment file.",
        ),
        SecretStrInput(
            name="llmgw_api_key",
            display_name="LLM Gateway API Key",
            value="",
            advanced=False,
            info="The API Key of the LLM Gateway. "
            "Defaults to LLMGW_API_KEY in environment file.",
        ),
        StrInput(
            name="llmgw_workspace",
            display_name="LLM Gateway Workspace Name",
            value="",
            advanced=False,
            info="The workspace name of the LLM Gateway. "
            "Defaults to LLMGW_WORKSPACE in environment file.",
        ),
        IntInput(
            name="seed",
            display_name="Seed",
            info="The seed controls the reproducibility of the job.",
            advanced=True,
            value=1,
        ),
        IntInput(
            name="max_retries",
            display_name="Max Retries",
            info="The maximum number of retries to make when generating.",
            advanced=True,
            value=5,
        ),
        IntInput(
            name="timeout",
            display_name="Timeout",
            info="The timeout for requests to OpenAI completion API.",
            advanced=True,
            value=700,
        )
    ]

    def build_model(self) -> LanguageModel:  # type: ignore[type-var]
        parameters = {
            "api_key": "NONE",
            "model": self.model_name,
            "max_tokens": self.max_tokens or None,
            "base_url": self.base_url or os.environ.get("LLMGW_API_BASE", ""),
            "seed": self.seed,
            "max_retries": self.max_retries,
            "timeout": self.timeout,
            "temperature": self.temperature if self.temperature is not None else 0.1,
            "default_headers": {
                "api-key": self.llmgw_api_key or os.environ.get("LLMGW_API_KEY", ""),
                "workspacename": self.llmgw_workspace or os.environ.get("LLMGW_WORKSPACE", ""),
            }
        }

        logger.info(f"Model name: {self.model_name}")
        if self.model_name in LLM_REASONING_OPTIONS:
            logger.info("Getting reasoning model parameters")
            parameters.pop("temperature")
            parameters.pop("seed")
        output = ChatOpenAI(**parameters)
        if self.json_mode:
            output = output.bind(response_format={"type": "json_object"})

        return output

    def _get_exception_message(self, e: Exception):
        """Get a message from an OpenAI exception.

        Args:
            e (Exception): The exception to get the message from.

        Returns:
            str: The message from the exception.
        """
        try:
            from openai import BadRequestError
        except ImportError:
            return None
        if isinstance(e, BadRequestError):
            message = e.body.get("message")
            if message:
                return message
        return None

    def update_build_config(self, build_config: dict, field_value: Any, field_name: str | None = None) -> dict:
        if field_name in {"model_name"} and field_value in LLM_REASONING_OPTIONS:
            build_config["temperature"]["show"] = False
            build_config["seed"]["show"] = False
        if field_name in {"model_name"} and field_value in LLM_OPTIONS:
            build_config["temperature"]["show"] = True
            build_config["seed"]["show"] = True
        return build_config

