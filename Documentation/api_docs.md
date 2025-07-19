# API Documentation (Starter)

## Overview
This project uses Django REST Framework with automatic OpenAPI/Swagger documentation generation.

- Interactive API docs are available at `/api/docs/` or `/swagger/` when the backend is running.
- For external integrations, a Postman collection can be exported from the Swagger UI.

## How to Enable/Update
- Ensure `drf-yasg` or `drf-spectacular` is installed and configured in your Django settings.
- Example (drf-yasg):
  ```python
  # settings.py
  INSTALLED_APPS += ["drf_yasg"]
  # urls.py
  from drf_yasg.views import get_schema_view
  from drf_yasg import openapi
  schema_view = get_schema_view(
      openapi.Info(
          title="Smart Accounts API",
          default_version='v1',
      ),
      public=True,
  )
  urlpatterns += [
      path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
  ]
  ```

## Best Practices
- Keep docstrings and serializer field help_text up to date for best auto-generated docs.
- Use tags and descriptions for grouping endpoints.

---
For more, see Django REST Framework and drf-yasg/drf-spectacular documentation.
