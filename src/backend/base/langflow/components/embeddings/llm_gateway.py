from langchain_openai import OpenAIEmbeddings

from langflow.base.embeddings.model import LCEmbeddingsModel
from langflow.field_typing import Embeddings
from langflow.io import BoolInput, DictInput, DropdownInput, FloatInput, IntInput, MessageTextInput, SecretStrInput
from langflow.inputs import StrInput

LLM_GATEWAY_EMBEDDINGS_MODELS = [
    "text-embedding-ada-002",
    "gpl-nlmv10_e100",
    "bge-m3"
]


class LLMGatewayEmbeddingsComponent(LCEmbeddingsModel):
    display_name = "LLM Gateway Embeddings"
    description = "Generate embeddings using LLM Gateway models."
    icon = "Brain"
    name = "LLMGatewayEmbeddings"

    inputs = [
        StrInput(
            name="base_url",
            display_name="LLM Gateway API Base URL",
            value="",
            advanced=False,
            info="The base URL of the LLM Gateway.",
        ),
        SecretStrInput(
            name="llmgw_api_key",
            display_name="LLM Gateway API Key",
            value="",
            advanced=False,
            info="The API Key of the LLM Gateway.",
        ),
        StrInput(
            name="llmgw_workspace",
            display_name="LLM Gateway Workspace Name",
            value="",
            advanced=False,
            info="The workspace name of the LLM Gateway.",
        ),
        DictInput(
            name="default_query",
            display_name="Default Query",
            advanced=True,
            info="Default query parameters to use for the API request.",
        ),
        IntInput(name="chunk_size", display_name="Chunk Size", advanced=True, value=1000),
        IntInput(name="embedding_ctx_length", display_name="Embedding Context Length", advanced=True, value=1536),
        IntInput(name="max_retries", display_name="Max Retries", value=3, advanced=True),
        DropdownInput(
            name="model",
            display_name="Model",
            advanced=False,
            options=LLM_GATEWAY_EMBEDDINGS_MODELS,
            value="text-embedding-ada-002",
        ),
        DictInput(name="model_kwargs", display_name="Model Kwargs", advanced=True),
        FloatInput(name="request_timeout", display_name="Request Timeout", advanced=True),
        BoolInput(name="show_progress_bar", display_name="Show Progress Bar", advanced=True),
        BoolInput(name="skip_empty", display_name="Skip Empty", advanced=True),
        MessageTextInput(
            name="tiktoken_model_name",
            display_name="TikToken Model Name",
            advanced=True,
        ),
        BoolInput(
            name="tiktoken_enable",
            display_name="TikToken Enable",
            advanced=True,
            value=True,
            info="If False, you must have transformers installed.",
        ),
        IntInput(
            name="dimensions",
            display_name="Dimensions",
            info="The number of dimensions the resulting output embeddings should have. "
            "Only supported by certain models.",
            advanced=True,
        ),
    ]

    def build_embeddings(self) -> Embeddings:
        return OpenAIEmbeddings(
            model=self.model,
            dimensions=self.dimensions or None,
            base_url=self.base_url or None,
            embedding_ctx_length=self.embedding_ctx_length,
            api_key="NONE",
            allowed_special="all",
            disallowed_special="all",
            chunk_size=self.chunk_size,
            max_retries=self.max_retries,
            timeout=self.request_timeout or None,
            tiktoken_enabled=self.tiktoken_enable,
            tiktoken_model_name=self.tiktoken_model_name or None,
            show_progress_bar=self.show_progress_bar,
            model_kwargs=self.model_kwargs,
            skip_empty=self.skip_empty,
            default_headers={
                "api-key": self.llmgw_api_key,
                "workspacename": self.llmgw_workspace
            },
            default_query=self.default_query or None,
        )
