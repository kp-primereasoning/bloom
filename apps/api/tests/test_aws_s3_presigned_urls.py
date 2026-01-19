"""
Property-based tests for S3 presigned URL generation.

Property 2: Presigned URL Generation
*For any* delivery ID and filename, the S3 client SHALL generate a presigned URL
that follows the pattern `deliveries/{delivery_id}/{filename}` and includes
the correct content type based on file extension.

Validates: Requirements 5.1, 5.2, 5.3, 5.4
"""

import re
from unittest.mock import patch, MagicMock
from uuid import uuid4

from hypothesis import given, strategies as st, settings, assume
import pytest


# Strategy for valid UUIDs
uuid_strategy = st.uuids().map(str)

# Strategy for valid filenames with various extensions
filename_strategy = st.from_regex(
    r"[a-zA-Z0-9_-]{1,50}\.(jpg|jpeg|png|gif|webp|pdf|txt)",
    fullmatch=True
)

# Strategy for image filenames specifically
image_filename_strategy = st.from_regex(
    r"[a-zA-Z0-9_-]{1,50}\.(jpg|jpeg|png|gif|webp)",
    fullmatch=True
)


class TestS3PresignedUrlGeneration:
    """
    Property 2: Presigned URL Generation
    
    Tests that presigned URLs follow the correct pattern and include
    appropriate content types.
    """
    
    @given(
        delivery_id=uuid_strategy,
        filename=filename_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_upload_url_key_follows_pattern(self, delivery_id, filename):
        """
        For any delivery ID and filename, the generated key should follow
        the pattern deliveries/{delivery_id}/{filename}.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        # Mock the boto3 client
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        result = client.generate_upload_url(delivery_id, filename)
        
        # Verify key follows pattern
        expected_key = f"deliveries/{delivery_id}/{filename}"
        assert result["key"] == expected_key
        
        # Verify the pattern structure
        assert result["key"].startswith("deliveries/")
        assert delivery_id in result["key"]
        assert filename in result["key"]
    
    @given(
        delivery_id=uuid_strategy,
        filename=image_filename_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_content_type_matches_extension(self, delivery_id, filename):
        """
        For any filename with a known extension, the content type should
        match the file extension.
        """
        from services.aws.s3 import S3Client, CONTENT_TYPE_MAP
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        result = client.generate_upload_url(delivery_id, filename)
        
        # Get expected content type
        ext = "." + filename.rsplit(".", 1)[-1].lower()
        expected_content_type = CONTENT_TYPE_MAP.get(ext, "application/octet-stream")
        
        assert result["content_type"] == expected_content_type
    
    @given(
        delivery_id=uuid_strategy,
        filename=filename_strategy,
        expires_in=st.integers(min_value=60, max_value=86400),
    )
    @settings(max_examples=100, deadline=None)
    def test_upload_url_respects_expiration(self, delivery_id, filename, expires_in):
        """
        For any expiration time, the result should include the correct expires_in value.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        result = client.generate_upload_url(delivery_id, filename, expires_in=expires_in)
        
        assert result["expires_in"] == expires_in
        
        # Verify boto3 was called with correct expiration
        call_kwargs = mock_boto_client.generate_presigned_url.call_args
        assert call_kwargs[1]["ExpiresIn"] == expires_in
    
    @given(
        delivery_id=uuid_strategy,
        malicious_filename=st.sampled_from([
            "../../../etc/passwd.jpg",
            "..\\..\\windows\\system32.jpg",
            "foo/bar/baz.jpg",
            "foo\\bar\\baz.jpg",
            "/absolute/path.jpg",
            "\\absolute\\path.jpg",
            "normal/../traversal.jpg",
            "a/b/c/d/e.jpg",
        ]),
    )
    @settings(max_examples=100, deadline=None)
    def test_filename_sanitization_prevents_path_traversal(self, delivery_id, malicious_filename):
        """
        For any filename containing path separators, they should be sanitized
        to prevent path traversal attacks.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        result = client.generate_upload_url(delivery_id, malicious_filename)
        
        # The key should not contain path traversal sequences
        key_after_prefix = result["key"].replace(f"deliveries/{delivery_id}/", "")
        assert "/" not in key_after_prefix
        assert "\\" not in key_after_prefix
    
    @given(
        delivery_id=uuid_strategy,
        filename=filename_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_download_url_uses_same_key_pattern(self, delivery_id, filename):
        """
        For any delivery ID and filename, download URL should use the same
        key pattern as upload URL.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        # Generate upload URL to get the key
        upload_result = client.generate_upload_url(delivery_id, filename)
        upload_key = upload_result["key"]
        
        # Generate download URL with the same key
        client.generate_download_url(upload_key)
        
        # Verify boto3 was called with the same key
        download_call = mock_boto_client.generate_presigned_url.call_args_list[-1]
        assert download_call[1]["Params"]["Key"] == upload_key
    
    @given(
        delivery_id=uuid_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_content_type_defaults_to_octet_stream_for_unknown(self, delivery_id):
        """
        For any filename with unknown extension, content type should default
        to application/octet-stream.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        # Use a filename with unknown extension
        result = client.generate_upload_url(delivery_id, "file.unknownext")
        
        assert result["content_type"] == "application/octet-stream"
    
    def test_jpeg_variations_have_same_content_type(self):
        """
        Both .jpg and .jpeg extensions should produce image/jpeg content type.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        delivery_id = str(uuid4())
        
        result_jpg = client.generate_upload_url(delivery_id, "photo.jpg")
        result_jpeg = client.generate_upload_url(delivery_id, "photo.jpeg")
        
        assert result_jpg["content_type"] == "image/jpeg"
        assert result_jpeg["content_type"] == "image/jpeg"
    
    @given(
        delivery_id=uuid_strategy,
        filename=filename_strategy,
    )
    @settings(max_examples=100, deadline=None)
    def test_upload_url_returns_all_required_fields(self, delivery_id, filename):
        """
        For any valid input, upload URL response should contain all required fields.
        """
        from services.aws.s3 import S3Client
        
        client = S3Client(bucket_name="test-bucket", region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.generate_presigned_url.return_value = "https://example.com/presigned"
        client._client = mock_boto_client
        
        result = client.generate_upload_url(delivery_id, filename)
        
        # Verify all required fields are present
        assert "upload_url" in result
        assert "key" in result
        assert "content_type" in result
        assert "expires_in" in result
        
        # Verify types
        assert isinstance(result["upload_url"], str)
        assert isinstance(result["key"], str)
        assert isinstance(result["content_type"], str)
        assert isinstance(result["expires_in"], int)
