"""
Delivery photo endpoints for upload and download URLs.

Provides presigned S3 URLs for secure photo uploads and downloads
without exposing AWS credentials to clients.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import get_current_user, require_role
from services.aws.s3 import get_s3_client
from middleware.request_id import get_request_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


class PhotoUploadRequest(BaseModel):
    """Request body for photo upload URL generation."""
    filename: str


class PhotoUploadResponse(BaseModel):
    """Response with presigned upload URL."""
    upload_url: str
    key: str
    content_type: str
    expires_in: int


class PhotoDownloadResponse(BaseModel):
    """Response with presigned download URL."""
    download_url: str
    expires_in: int


@router.post("/{delivery_id}/photo/upload-url", response_model=PhotoUploadResponse)
async def get_photo_upload_url(
    delivery_id: UUID,
    request: PhotoUploadRequest,
    current_user: dict = Depends(require_role(["FLORIST", "ADMIN"])),
):
    """
    Generate a presigned URL for uploading a delivery photo.
    
    Only florists and admins can upload delivery photos.
    The URL is valid for 15 minutes.
    
    Args:
        delivery_id: UUID of the delivery
        request: Contains the filename for the photo
        
    Returns:
        Presigned upload URL with metadata
    """
    request_id = get_request_id()
    
    try:
        s3_client = get_s3_client()
        result = s3_client.generate_upload_url(
            delivery_id=str(delivery_id),
            filename=request.filename,
            expires_in=900,  # 15 minutes
        )
        
        logger.info(
            f"Generated upload URL for delivery {delivery_id}",
            extra={"request_id": request_id, "user_id": current_user["id"]}
        )
        
        return PhotoUploadResponse(**result)
        
    except Exception as e:
        logger.error(
            f"Failed to generate upload URL for delivery {delivery_id}: {e}",
            extra={"request_id": request_id}
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "S3_UNAVAILABLE",
                    "message": "Failed to generate upload URL. Please try again.",
                    "request_id": request_id,
                }
            }
        )


@router.get("/{delivery_id}/photo", response_model=PhotoDownloadResponse)
async def get_photo_download_url(
    delivery_id: UUID,
    filename: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a presigned URL for downloading a delivery photo.
    
    Any authenticated user can view delivery photos.
    The URL is valid for 1 hour.
    
    Args:
        delivery_id: UUID of the delivery
        filename: Name of the photo file
        
    Returns:
        Presigned download URL
    """
    request_id = get_request_id()
    
    try:
        s3_client = get_s3_client()
        
        # Check if the photo exists
        key = f"deliveries/{delivery_id}/{filename}"
        if not s3_client.check_object_exists(key):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "PHOTO_NOT_FOUND",
                        "message": "Delivery photo not found",
                        "request_id": request_id,
                    }
                }
            )
        
        download_url = s3_client.generate_download_url(
            key=key,
            expires_in=3600,  # 1 hour
        )
        
        logger.info(
            f"Generated download URL for delivery {delivery_id}",
            extra={"request_id": request_id, "user_id": current_user["id"]}
        )
        
        return PhotoDownloadResponse(
            download_url=download_url,
            expires_in=3600,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to generate download URL for delivery {delivery_id}: {e}",
            extra={"request_id": request_id}
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "S3_UNAVAILABLE",
                    "message": "Failed to generate download URL. Please try again.",
                    "request_id": request_id,
                }
            }
        )


@router.delete("/{delivery_id}/photo")
async def delete_photo(
    delivery_id: UUID,
    filename: str,
    current_user: dict = Depends(require_role(["FLORIST", "ADMIN"])),
):
    """
    Delete a delivery photo.
    
    Only florists and admins can delete delivery photos.
    
    Args:
        delivery_id: UUID of the delivery
        filename: Name of the photo file
        
    Returns:
        Success message
    """
    request_id = get_request_id()
    
    try:
        s3_client = get_s3_client()
        key = f"deliveries/{delivery_id}/{filename}"
        
        if not s3_client.check_object_exists(key):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "PHOTO_NOT_FOUND",
                        "message": "Delivery photo not found",
                        "request_id": request_id,
                    }
                }
            )
        
        success = s3_client.delete_object(key)
        
        if not success:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": {
                        "code": "DELETE_FAILED",
                        "message": "Failed to delete photo. Please try again.",
                        "request_id": request_id,
                    }
                }
            )
        
        logger.info(
            f"Deleted photo for delivery {delivery_id}",
            extra={"request_id": request_id, "user_id": current_user["id"]}
        )
        
        return {"message": "Photo deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to delete photo for delivery {delivery_id}: {e}",
            extra={"request_id": request_id}
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "S3_UNAVAILABLE",
                    "message": "Failed to delete photo. Please try again.",
                    "request_id": request_id,
                }
            }
        )
