"""
AWS CloudWatch logging integration.

This module provides CloudWatch Logs integration with JSON formatting
and request_id tracking for structured logging.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

# Try to import watchtower for CloudWatch logging
try:
    import watchtower
    WATCHTOWER_AVAILABLE = True
except ImportError:
    WATCHTOWER_AVAILABLE = False


class JSONFormatter(logging.Formatter):
    """
    JSON log formatter for structured logging.
    
    Formats log records as JSON with consistent fields for
    easy parsing and querying in CloudWatch Logs Insights.
    """
    
    def __init__(self, service_name: str = "bloom-api"):
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string."""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
        }
        
        # Add request_id if available
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "extra"):
            log_entry.update(record.extra)
        
        # Add source location for errors
        if record.levelno >= logging.ERROR:
            log_entry["source"] = {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            }
        
        return json.dumps(log_entry)


class RequestIdFilter(logging.Filter):
    """
    Logging filter that adds request_id to log records.
    
    Uses a context variable to track request_id across async calls.
    """
    
    _request_id: Optional[str] = None
    
    @classmethod
    def set_request_id(cls, request_id: str):
        """Set the current request ID."""
        cls._request_id = request_id
    
    @classmethod
    def get_request_id(cls) -> str:
        """Get the current request ID or generate a new one."""
        if cls._request_id is None:
            cls._request_id = str(uuid4())
        return cls._request_id
    
    @classmethod
    def clear_request_id(cls):
        """Clear the current request ID."""
        cls._request_id = None
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add request_id to the log record."""
        record.request_id = self.get_request_id()
        return True


def setup_cloudwatch_logging(
    log_group: str,
    region: str,
    service_name: str = "bloom-api",
    log_level: int = logging.INFO,
) -> logging.Logger:
    """
    Set up CloudWatch logging with JSON formatting.
    
    Args:
        log_group: CloudWatch log group name
        region: AWS region
        service_name: Service name for log entries
        log_level: Minimum log level
        
    Returns:
        Configured root logger
    """
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Add request ID filter
    request_id_filter = RequestIdFilter()
    
    # Create JSON formatter
    json_formatter = JSONFormatter(service_name=service_name)
    
    if WATCHTOWER_AVAILABLE:
        try:
            # Create CloudWatch handler
            cloudwatch_handler = watchtower.CloudWatchLogHandler(
                log_group=log_group,
                stream_name=f"{service_name}-{{strftime:%Y-%m-%d}}",
                boto3_client=boto3.client("logs", region_name=region),
                create_log_group=True,
            )
            cloudwatch_handler.setFormatter(json_formatter)
            cloudwatch_handler.addFilter(request_id_filter)
            logger.addHandler(cloudwatch_handler)
            
            logger.info(f"CloudWatch logging enabled: {log_group}")
            
        except ClientError as e:
            # Fall back to console if CloudWatch fails
            logger.warning(f"Failed to set up CloudWatch logging: {e}")
            _add_console_handler(logger, json_formatter, request_id_filter)
    else:
        logger.warning("watchtower not installed, using console logging")
        _add_console_handler(logger, json_formatter, request_id_filter)
    
    return logger


def setup_console_logging(
    service_name: str = "bloom-api",
    log_level: int = logging.INFO,
    use_json: bool = False,
) -> logging.Logger:
    """
    Set up console logging for local development.
    
    Args:
        service_name: Service name for log entries
        log_level: Minimum log level
        use_json: Whether to use JSON formatting
        
    Returns:
        Configured root logger
    """
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Add request ID filter
    request_id_filter = RequestIdFilter()
    
    if use_json:
        formatter = JSONFormatter(service_name=service_name)
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    _add_console_handler(logger, formatter, request_id_filter)
    
    return logger


def _add_console_handler(
    logger: logging.Logger,
    formatter: logging.Formatter,
    filter: logging.Filter,
):
    """Add a console handler to the logger."""
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(filter)
    logger.addHandler(console_handler)


def configure_logging():
    """
    Configure logging based on feature flags.
    
    Uses CloudWatch when USE_CLOUDWATCH=true, otherwise console logging.
    """
    from services.aws.config import get_aws_settings
    
    settings = get_aws_settings()
    
    if settings.use_cloudwatch:
        return setup_cloudwatch_logging(
            log_group=settings.cloudwatch_log_group,
            region=settings.aws_region,
            service_name="bloom-api",
            log_level=logging.INFO,
        )
    else:
        return setup_console_logging(
            service_name="bloom-api",
            log_level=logging.INFO,
            use_json=settings.environment != "development",
        )
