"""
Custom logging configuration to reduce log verbosity
Filters out repetitive status check requests while keeping important logs
"""
import logging
import sys


class EndpointFilter(logging.Filter):
    """Filter out specific endpoint access logs to reduce noise"""

    def __init__(self, *endpoints_to_filter):
        super().__init__()
        self.endpoints_to_filter = endpoints_to_filter

    def filter(self, record: logging.LogRecord) -> bool:
        # Only filter INFO level access logs from uvicorn.access
        if record.levelno != logging.INFO:
            return True

        # Check if any filtered endpoint is in the log message
        message = record.getMessage()
        for endpoint in self.endpoints_to_filter:
            if endpoint in message:
                return False

        return True


def setup_logging():
    """Configure logging with filters for cleaner output"""

    # Configure uvicorn access logger to filter status checks
    access_logger = logging.getLogger("uvicorn.access")
    access_logger.addFilter(EndpointFilter(
        "/api/status/",      # Filter out status polling
        "/api/batch-status/" # Filter out batch status polling
    ))

    # Keep error logs visible
    error_logger = logging.getLogger("uvicorn.error")
    error_logger.setLevel(logging.INFO)

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(levelname)s: %(message)s",
            },
            "detailed": {
                "format": "[%(asctime)s] %(levelname)s - %(name)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
            },
        },
        "loggers": {
            "uvicorn": {
                "handlers": ["default"],
                "level": "INFO",
            },
            "uvicorn.error": {
                "level": "INFO",
            },
            "uvicorn.access": {
                "handlers": ["default"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }
