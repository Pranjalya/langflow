from langchain_core.prompts import ChatPromptTemplate

from langflow.base.agents.agent import LCToolsAgentComponent
from langflow.inputs import MessageTextInput
from langflow.inputs.inputs import DataInput, HandleInput
from langflow.schema import Data

from typing import Callable, List, Sequence, Tuple

from langchain_core.agents import AgentAction
from langchain_core.language_models import BaseLanguageModel
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable, RunnablePassthrough
from langchain_core.tools import BaseTool

from langchain.agents.format_scratchpad.tools import (
    format_to_tool_messages,
)
from langchain.agents.output_parsers.tools import ToolsAgentOutputParser

MessageFormatter = Callable[[Sequence[Tuple[AgentAction, str]]], List[BaseMessage]]


def create_tool_calling_agent(
    llm: BaseLanguageModel,
    tools: Sequence[BaseTool],
    prompt: ChatPromptTemplate,
    *,
    message_formatter: MessageFormatter = format_to_tool_messages,
) -> Runnable:
    """Create an agent that uses tools.

    Args:
        llm: LLM to use as the agent.
        tools: Tools this agent has access to.
        prompt: The prompt to use. See Prompt section below for more on the expected
            input variables.
        message_formatter: Formatter function to convert (AgentAction, tool output)
            tuples into FunctionMessages.

    Returns:
        A Runnable sequence representing an agent. It takes as input all the same input
        variables as the prompt passed in does. It returns as output either an
        AgentAction or AgentFinish.

    Example:

        .. code-block:: python

            from langchain.agents import AgentExecutor, create_tool_calling_agent, tool
            from langchain_anthropic import ChatAnthropic
            from langchain_core.prompts import ChatPromptTemplate

            prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", "You are a helpful assistant"),
                    ("placeholder", "{chat_history}"),
                    ("human", "{input}"),
                    ("placeholder", "{agent_scratchpad}"),
                ]
            )
            model = ChatAnthropic(model="claude-3-opus-20240229")

            @tool
            def magic_function(input: int) -> int:
                \"\"\"Applies a magic function to an input.\"\"\"
                return input + 2

            tools = [magic_function]

            agent = create_tool_calling_agent(model, tools, prompt)
            agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

            agent_executor.invoke({"input": "what is the value of magic_function(3)?"})

            # Using with chat history
            from langchain_core.messages import AIMessage, HumanMessage
            agent_executor.invoke(
                {
                    "input": "what's my name?",
                    "chat_history": [
                        HumanMessage(content="hi! my name is bob"),
                        AIMessage(content="Hello Bob! How can I assist you today?"),
                    ],
                }
            )

    Prompt:

        The agent prompt must have an `agent_scratchpad` key that is a
            ``MessagesPlaceholder``. Intermediate agent actions and tool output
            messages will be passed in here.
    """
    missing_vars = {"agent_scratchpad"}.difference(
        prompt.input_variables + list(prompt.partial_variables)
    )
    if missing_vars:
        raise ValueError(f"Prompt missing required variables: {missing_vars}")

    if not hasattr(llm, "bind_tools"):
        raise ValueError(
            "This function requires a .bind_tools method be implemented on the LLM.",
        )
    
    agent = (
        RunnablePassthrough.assign(
            agent_scratchpad=lambda x: message_formatter(x["intermediate_steps"])
        )
        | prompt
        | llm.bind_tools(tools, tool_choice="auto")
        | ToolsAgentOutputParser()
    )
    return agent


class ToolCallingAgentComponent(LCToolsAgentComponent):
    display_name: str = "Tool Calling Agent"
    description: str = "An agent designed to utilize various tools seamlessly within workflows."
    icon = "LangChain"
    name = "ToolCallingAgent"

    inputs = [
        *LCToolsAgentComponent._base_inputs,
        HandleInput(
            name="llm",
            display_name="Language Model",
            input_types=["LanguageModel"],
            required=True,
            info="Language model that the agent utilizes to perform tasks effectively.",
        ),
        MessageTextInput(
            name="system_prompt",
            display_name="System Prompt",
            info="System prompt to guide the agent's behavior.",
            value="You are a helpful assistant that can use tools to answer questions and perform tasks.",
        ),
        DataInput(
            name="chat_history",
            display_name="Chat Memory",
            is_list=True,
            advanced=True,
            info="This input stores the chat history, allowing the agent to remember previous conversations.",
        ),
    ]

    def get_chat_history_data(self) -> list[Data] | None:
        return self.chat_history

    def create_agent_runnable(self):
        messages = [
            ("system", "{system_prompt}"),
            ("placeholder", "{chat_history}"),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}"),
        ]
        prompt = ChatPromptTemplate.from_messages(messages)
        self.validate_tool_names()
        try:
            return create_tool_calling_agent(self.llm, self.tools or [], prompt)
        except NotImplementedError as e:
            message = f"{self.display_name} does not support tool calling. Please try using a compatible model."
            raise NotImplementedError(message) from e
