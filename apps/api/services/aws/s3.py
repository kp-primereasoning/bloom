"""
AWS S3 client for delivery photo storage.

This module provides presigned URL generation for secure photo uploads
and downloads without exposing AWS credentials to clients.
"""

import logging
import mimetypes
from typing import Optional, Dict, Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Content type mappings for common image formats
CONTENT_TYPE_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
}


class S3Client:
    """
    Client for AWS S3 with presigned URL generation.
    
    Provides secure upload and download URLs for delivery photos
    without exposing AWS credentials to frontend clients.
    """
    
    def __init__(self, bucket_name: str, region: str):
        """
        Initialize S3 client.
        
        Args:
            bucket_name: Name of the S3 bucket
            region: AWS region for the bucket
        """
        self.bucket_name = bucket_name
        self.region = region
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of boto3 client with signature v4."""
        if self._client is None:
            self._client = boto3.client(
                "s3",
                region_name=self.region,
                config=Config(signature_version="s3v4")
            )
        return self._client
    
    def _get_content_type(self, filename: str) -> str:
        """
        Determine content type from filename extension.
        
        Args:
            filename: Name of the file
            
        Returns:
            MIME content type string
        """
        # Get extension and normalize
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        # Check our custom map first
        if ext in CONTENT_TYPE_MAP:
            return CONTENT_TYPE_MAP[ext]
        
        # Fall back to mimetypes library
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or "application/octet-stream"
    
    def _build_key(self, delivery_id: str, filename: str) -> str:
        """
        Build S3 object key following the pattern deliveries/{delivery_id}/{filename}.
        
        Args:
            delivery_id: UUID of the delivery
            filename: Original filename
            
        Returns:
            S3 object key
        """
        # Sanitize filename to prevent path traversal
        safe_filename = filename.replace("/", "_").replace("\\", "_")
        return f"deliveries/{delivery_id}/{safe_filename}"
    
    def generate_upload_url(
        self,
        delivery_id: str,
        filename: str,
        expires_in: int = 900,  # 15 minutes
    ) -> Dict[str, Any]:
        """
        Generate a presigned PUT URL for photo upload.
        
        Args:
            delivery_id: UUID of the delivery
            filename: Original filename for the photo
            expires_in: URL expiration time in seconds (default 15 minutes)
            
        Returns:
            Dict with upload_url, key, and content_type
            
        Raises:
            Exception: If URL generation fails
        """
        key = self._build_key(delivery_id, filename)
        content_type = self._get_content_type(filename)
        
        try:
            url = self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            
            logger.info(f"Generated upload URL for delivery {delivery_id}: {key}")
            
            return {
                "upload_url": url,
                "key": key,
                "content_type": content_type,
                "expires_in": expires_in,
            }
            
        except ClientError as e:
            logger.error(f"Failed to generate upload URL: {e}")
            raise
    
    def generate_download_url(
        self,
        key: str,
        expires_in: int = 3600,  # 1 hour
    ) -> str:
        """
        Generate a presigned GET URL for photo download.
        
        Args:
            key: S3 object key
            expires_in: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Presigned download URL
            
        Raises:
            Exception: If URL generation fails
        """
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": key,
                },
                ExpiresIn=expires_in,
            )
            
            logger.debug(f"Generated download URL for key: {key}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate download URL: {e}")
            raise
    
    def generate_download_url_for_delivery(
        self,
        delivery_id: str,
        filename: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Generate a presigned GET URL for a delivery photo.
        
        Args:
            delivery_id: UUID of the delivery
            filename: Filename of the photo
            expires_in: URL expiration time in seconds
            
        Returns:
            Presigned download URL
        """
        key = self._build_key(delivery_id, filename)
        return self.generate_download_url(key, expires_in)
    
    def check_object_exists(self, key: str) -> bool:
        """
        Check if an object exists in the bucket.
        
        Args:
            key: S3 object key
            
        Returns:
            True if object exists, False otherwise
        """
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "404":
                return False
            logger.error(f"Error checking object existence: {e}")
            return False
    
    def delete_object(self, key: str) -> bool:
        """
        Delete an object from the bucket.
        
        Args:
            key: S3 object key
            
        Returns:
            True if deletion succeeded, False otherwise
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Deleted object: {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete object {key}: {e}")
            return False
    
    def check_health(self) -> bool:
        """
        Check S3 connectivity by listing bucket contents.
        
        Returns:
            True if S3 is accessible, False otherwise
        """
        try:
            self.client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=1)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"S3 health check failed: {error_code}")
            return False
        except Exception as e:
            logger.error(f"S3 health check failed: {e}")
            return False


# Module-level singleton instance (lazy initialized)
_s3_client: Optional[S3Client] = None


def get_s3_client(bucket_name: str = None, region: str = None) -> S3Client:
    """
    Get or create the S3 client singleton.
    
    Args:
        bucket_name: S3 bucket name (uses config default if not provided)
        region: AWS region (uses config default if not provided)
        
    Returns:
        S3Client instance
    """
    global _s3_client
    
    if _s3_client is None:
        from services.aws.config import get_aws_settings
        settings = get_aws_settings()
        
        _s3_client = S3Client(
            bucket_name=bucket_name or settings.s3_bucket_name,
            region=region or settings.s3_region,
        )
    
    return _s3_client
