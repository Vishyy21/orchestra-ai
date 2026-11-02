"""Application configuration for ORCHESTRA AI."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration management using environment variables."""

    # Brand & Identity
    app_name: str = "ORCHESTRA AI"
    tagline: str = "Intelligence in Sync. Execution in Motion."
    version: str = "1.0.0"
    debug: bool = True

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    # Database settings
    database_url: str = "sqlite:///./orchestra.db"

    # Ollama Local LLM Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3.5:4b"
    ollama_timeout_seconds: float = 120.0
    ollama_health_timeout_seconds: float = 3.0

    # Storage paths
    data_dir: Path = Path("./data")
    uploads_dir: Path = Path("./data/uploads")
    reports_dir: Path = Path("./data/reports")
    chroma_dir: Path = Path("./data/chroma")
    checkpoints_db_path: Path = Path("./data/checkpoints.db")

    # Tavily Web Search Configuration
    tavily_api_key: str | None = None
    tavily_search_depth: str = "basic"
    tavily_max_results: int = 5

    # LangSmith Observability & Tracing Configuration
    langsmith_api_key: str | None = None
    langsmith_tracing: bool = True
    langsmith_project: str = "orchestra-ai"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langchain_api_key: str | None = None
    langchain_tracing_v2: bool | None = None
    langchain_project: str | None = None
    langchain_endpoint: str | None = None

    # Single-Operator Authentication & Session Security
    auth_enabled: bool = False
    auth_password: str | None = None
    auth_secret_key: str | None = None
    auth_token_expire_hours: int = 12
    auth_cookie_name: str = "orchestra_session"
    auth_cookie_secure: bool | None = None

    model_config = SettingsConfigDict(
        env_file=(
            Path(__file__).resolve().parent.parent / ".env",
            Path("backend/.env"),
            Path(".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def effective_langsmith_api_key(self) -> str | None:
        """Resolve LangSmith API key from either LANGSMITH_API_KEY or LANGCHAIN_API_KEY."""
        return self.langsmith_api_key or self.langchain_api_key

    @property
    def effective_langsmith_project(self) -> str:
        """Resolve LangSmith project name."""
        return self.langsmith_project or self.langchain_project or "orchestra-ai"

    @property
    def is_tavily_configured(self) -> bool:
        """Check if Tavily API key is provided and non-empty."""
        return bool(self.tavily_api_key and self.tavily_api_key.strip())

    @property
    def is_langsmith_configured(self) -> bool:
        """Check if LangSmith credentials are provided."""
        key = self.effective_langsmith_api_key
        return bool(key and key.strip())

    def setup_langsmith_environment(self) -> None:
        """Propagate LangSmith configuration into os.environ for LangChain/LangGraph automatic tracing."""
        key = self.effective_langsmith_api_key
        if key and self.langsmith_tracing:
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGSMITH_TRACING"] = "true"
            os.environ["LANGCHAIN_API_KEY"] = key
            os.environ["LANGSMITH_API_KEY"] = key
            os.environ["LANGCHAIN_PROJECT"] = self.effective_langsmith_project
            os.environ["LANGSMITH_PROJECT"] = self.effective_langsmith_project
            if self.langsmith_endpoint:
                os.environ["LANGCHAIN_ENDPOINT"] = self.langsmith_endpoint
                os.environ["LANGSMITH_ENDPOINT"] = self.langsmith_endpoint
        if self.tavily_api_key:
            os.environ["TAVILY_API_KEY"] = self.tavily_api_key

    def validate_auth(self) -> None:
        """Validate authentication configuration when auth is enabled.
        
        Enforces safe failure if AUTH_ENABLED=true but AUTH_PASSWORD or AUTH_SECRET_KEY is missing.
        """
        if self.auth_enabled:
            if not self.auth_password or not self.auth_password.strip():
                raise RuntimeError(
                    "ORCHESTRA AI Security Configuration Error: AUTH_ENABLED is True, but AUTH_PASSWORD is missing or empty. "
                    "Please configure a strong AUTH_PASSWORD in backend/.env before running in authenticated mode."
                )
            if not self.auth_secret_key or not self.auth_secret_key.strip():
                raise RuntimeError(
                    "ORCHESTRA AI Security Configuration Error: AUTH_ENABLED is True, but AUTH_SECRET_KEY is missing or empty. "
                    "Please configure a random AUTH_SECRET_KEY in backend/.env before running in authenticated mode."
                )

    def ensure_directories(self) -> None:
        """Ensure necessary storage directories exist."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoints_db_path.parent.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
