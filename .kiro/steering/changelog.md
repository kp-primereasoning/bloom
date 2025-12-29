---
inclusion: always
---

# Changelog Tracking

When you build, create, or implement something new (features, components, infrastructure, files, etc.), you MUST update the `CHANGELOG.md` file in the project root.

## Required Entry Format

Add a new row to the table with:
- **Date**: Current date (YYYY-MM-DD format)
- **What Was Built**: Brief name/description of what was created
- **What It Does**: Short explanation of the purpose/functionality

## Example Entry

```markdown
| 2025-12-28 | User Authentication API | Handles login, logout, and session management via AWS Cognito |
```

## When to Update

- After creating new files or components
- After implementing new features
- After setting up infrastructure
- After adding integrations
- After any significant code addition

Always add entries at the top of the log table (newest first).
