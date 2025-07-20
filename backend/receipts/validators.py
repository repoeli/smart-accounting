import os
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile

def validate_file_size(file: UploadedFile):
    """
    Validate that the uploaded file is under 10MB.
    """
    max_size = 10 * 1024 * 1024  # 10MB
    if file.size > max_size:
        raise ValidationError(f"File size {file.size} exceeds maximum allowed size of {max_size} bytes (10MB).")

def validate_file_extension(file: UploadedFile):
    """
    Validate that the uploaded file has an accepted extension.
    Accepted formats: JPEG, PNG, PDF, HEIC
    """
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.heic']
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f"File extension '{ext}' is not allowed. Allowed extensions: {', '.join(allowed_extensions)}")

def validate_document_file(file: UploadedFile):
    """
    Validate both file size and extension for document uploads.
    """
    validate_file_size(file)
    validate_file_extension(file)