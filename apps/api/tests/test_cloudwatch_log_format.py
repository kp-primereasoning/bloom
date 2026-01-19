"""
Property-based tests for CloudWatch log format.

Property 7: CloudWatch Log Format
*For any* log entry, the format SHALL include timestamp, level, message,
service name, and request_id for traceability.

Validates: Requirements 7.2, 7.5
"""

import json
import logging
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings
import pytest


class TestCloudWatchLogFormat:
    """
    Property 7: CloudWatch Log Format
    
    Tests that log entries have consistent JSON format with required fields.
    """
    
    @given(
        message=st.text(min_size=1, max_size=200).filter(lambda x: x.strip()),
        level=st.sampled_from(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
    )
    @settings(max_examples=50, deadline=None)
    def test_json_formatter_includes_required_fields(self, message, level):
        """
        For any log message and level, the JSON formatter should include
        all required fields: timestamp, level, message, service, logger.
        """
        from services.aws.cloudwatch import JSONFormatter
        
        formatter = JSONFormatter(service_name="test-service")
        
        # Create a log record
        record = logging.LogRecord(
            name="test.logger",
            level=getattr(logging, level),
            pathname="test.py",
            lineno=42,
            msg=message,
            args=(),
            exc_info=None,
        )
        
        # Format the record
        formatted = formatter.format(record)
        
        # Parse as JSON
        log_entry = json.loads(formatted)
        
        # Verify required fields
        assert "timestamp" in log_entry
        assert "level" in log_entry
        assert "message" in log_entry
        assert "service" in log_entry
        assert "logger" in log_entry
        
        # Verify values
        assert log_entry["level"] == level
        assert log_entry["message"] == message
        assert log_entry["service"] == "test-service"
        assert log_entry["logger"] == "test.logger"
    
    @given(
        request_id=st.uuids().map(str),
        message=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
    )
    @settings(max_examples=50, deadline=None)
    def test_request_id_is_included_when_set(self, request_id, message):
        """
        For any request_id, it should be included in the log entry.
        """
        from services.aws.cloudwatch import JSONFormatter, RequestIdFilter
        
        formatter = JSONFormatter(service_name="test-service")
        
        # Create a log record with request_id
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=42,
            msg=message,
            args=(),
            exc_info=None,
        )
        record.request_id = request_id
        
        # Format the record
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        # Verify request_id is included
        assert "request_id" in log_entry
        assert log_entry["request_id"] == request_id
    
    def test_error_logs_include_source_location(self):
        """
        Error and critical logs should include source file location.
        """
        from services.aws.cloudwatch import JSONFormatter
        
        formatter = JSONFormatter(service_name="test-service")
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.ERROR,
            pathname="/app/services/test.py",
            lineno=123,
            msg="Test error",
            args=(),
            exc_info=None,
        )
        record.funcName = "test_function"
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert "source" in log_entry
        assert log_entry["source"]["file"] == "/app/services/test.py"
        assert log_entry["source"]["line"] == 123
        assert log_entry["source"]["function"] == "test_function"
    
    def test_info_logs_do_not_include_source_location(self):
        """
        Info and debug logs should not include source location to reduce noise.
        """
        from services.aws.cloudwatch import JSONFormatter
        
        formatter = JSONFormatter(service_name="test-service")
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/app/services/test.py",
            lineno=123,
            msg="Test info",
            args=(),
            exc_info=None,
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert "source" not in log_entry
    
    def test_exception_info_is_included(self):
        """
        When exception info is present, it should be included in the log.
        """
        from services.aws.cloudwatch import JSONFormatter
        
        formatter = JSONFormatter(service_name="test-service")
        
        try:
            raise ValueError("Test exception")
        except ValueError:
            import sys
            exc_info = sys.exc_info()
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.ERROR,
            pathname="test.py",
            lineno=42,
            msg="Error occurred",
            args=(),
            exc_info=exc_info,
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert "exception" in log_entry
        assert "ValueError" in log_entry["exception"]
        assert "Test exception" in log_entry["exception"]
    
    def test_request_id_filter_adds_id_to_records(self):
        """
        RequestIdFilter should add request_id to all log records.
        """
        from services.aws.cloudwatch import RequestIdFilter
        
        filter = RequestIdFilter()
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        
        # Filter should return True and add request_id
        result = filter.filter(record)
        
        assert result is True
        assert hasattr(record, "request_id")
        assert record.request_id is not None
    
    @given(
        request_id=st.uuids().map(str),
    )
    @settings(max_examples=20, deadline=None)
    def test_request_id_can_be_set_and_retrieved(self, request_id):
        """
        For any request_id, it can be set and retrieved correctly.
        """
        from services.aws.cloudwatch import RequestIdFilter
        
        # Set request ID
        RequestIdFilter.set_request_id(request_id)
        
        # Retrieve it
        retrieved = RequestIdFilter.get_request_id()
        
        assert retrieved == request_id
        
        # Clear for next test
        RequestIdFilter.clear_request_id()
    
    def test_request_id_generates_new_if_not_set(self):
        """
        If no request_id is set, a new one should be generated.
        """
        from services.aws.cloudwatch import RequestIdFilter
        
        # Clear any existing
        RequestIdFilter.clear_request_id()
        
        # Get should generate new
        request_id = RequestIdFilter.get_request_id()
        
        assert request_id is not None
        # Should be a valid UUID format
        import uuid
        uuid.UUID(request_id)  # Will raise if invalid
        
        # Clear for next test
        RequestIdFilter.clear_request_id()
    
    @given(
        service_name=st.text(min_size=1, max_size=50).filter(
            lambda x: x.strip() and x.isalnum()
        ),
    )
    @settings(max_examples=20, deadline=None)
    def test_service_name_is_configurable(self, service_name):
        """
        For any service name, it should appear in log entries.
        """
        from services.aws.cloudwatch import JSONFormatter
        
        formatter = JSONFormatter(service_name=service_name)
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=42,
            msg="Test",
            args=(),
            exc_info=None,
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        assert log_entry["service"] == service_name
    
    def test_timestamp_is_iso_format(self):
        """
        Timestamp should be in ISO 8601 format.
        """
        from services.aws.cloudwatch import JSONFormatter
        from datetime import datetime
        
        formatter = JSONFormatter(service_name="test-service")
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=42,
            msg="Test",
            args=(),
            exc_info=None,
        )
        
        formatted = formatter.format(record)
        log_entry = json.loads(formatted)
        
        # Should be parseable as ISO format
        timestamp = log_entry["timestamp"]
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
