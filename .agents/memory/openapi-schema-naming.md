---
name: OpenAPI request schema naming
description: Prevents Orval-generated API type collisions in the shared OpenAPI contract.
---

Request and update components in `lib/api-spec/openapi.yaml` must use entity-style names such as `UserProfileUpdate` or `FbCampaignUpdate`, not names shaped like generated operation schemas such as `UpdateProfileBody`.

**Why:** Orval creates operation Zod schemas with names like `UpdateProfileBody`. Reusing that name for a referenced component also creates a TypeScript interface with the same name, causing duplicate-export failures during the shared-library typecheck.

**How to apply:** Before adding or renaming a request body, check that its component name cannot equal `<OperationIdPascal>Body`; run the API codegen command and shared-library typecheck immediately after contract changes.