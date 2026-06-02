# Stop Over-Engineering RBAC: A Pragmatic, Code-First Approach in Python

If you have ever built a Role-Based Access Control (RBAC) system, you have probably fallen into the traditional relational database trap. You create a `roles` table, a `permissions` table, and a `role_permissions` many-to-many join table.

Then the nightmare begins.

Your codebase needs to know about these permissions to enforce them. You end up writing code like `if user.can("edit_article")`, hoping that the string `"edit_article"` perfectly matches a row in your database across your local, staging, and production environments. When a developer adds a new feature, they have to write a database migration just to insert a new permission row before the code can even be tested.

This architecture fundamentally misunderstands what a permission is. **Permissions are a code-level concern, not dynamic database entities.**

Your database doesn't know what "editing an article" means. Only your code does. Therefore, the codebase should be the absolute Source of Truth for what permissions exist. The database's only job is to record which users hold which permission strings.

Here is a pragmatic, scalable, and highly explicit way to implement RBAC in modern Python.

---

### Step 1: Define Permissions as `StrEnum` (The Source of Truth)

Instead of scattering magic strings across your application or building complex base classes that rely on dictionary iteration, use Python's built-in `enum.StrEnum` (introduced in Python 3.11).

Enums provide static type checking, IDE autocomplete, and native iterability. We organize permissions into logical namespaces.

```python
from enum import StrEnum

class ArticlePerm(StrEnum):
    ALL = "article:all"
    CREATE = "article:create"
    READ = "article:read"
    UPDATE = "article:update"
    DELETE = "article:delete"

class UserPerm(StrEnum):
    ALL = "user:all"
    INVITE = "user:invite"
    DEACTIVATE = "user:deactivate"
```

**Why this is powerful:**

1. **No Magic:** You know exactly what string evaluates to what value.
2. **Type Safety:** You can type-hint function arguments to require an `ArticlePerm`, preventing developers from accidentally passing `UserPerm.INVITE` into an article-handling function.
3. **Discoverability:** A new developer can see every permission in the system just by looking at this one module.

### Step 2: The Role Entity

If permissions are just static strings defined in code, how do we store them in the database?

Simple: as a list or set of strings. In modern databases like PostgreSQL, you can store this in a `JSONB` array or an `ARRAY` column. This completely eliminates the need for complex, heavy JOIN operations.

Here is how your Domain Model represents a Role:

```python
class Role:
    def __init__(self, role_id: int, name: str, permissions: list[str]):
        self.id = role_id
        self.name = name
        # We convert to a set in memory for extremely fast lookups
        self._permissions: set[str] = set(permissions)

    @property
    def permissions(self) -> set[str]:
        return self._permissions

    def grant(self, perm: StrEnum) -> None:
        """Grants a new permission to this role."""
        self._permissions.add(perm.value)

    def revoke(self, perm: StrEnum) -> None:
        """Revokes a permission if it exists."""
        self._permissions.discard(perm.value)
```

### Step 3: Fast, $O(1)$ Authorization Checks

Because our permissions are stored as a Python `set` in memory, checking if a role has access is an $O(1)$ operation. It is virtually instantaneous.

We can also add a small piece of business logic here to support namespace wildcards (e.g., if a user has `"article:all"`, they automatically have `"article:create"`).

```python
    # Inside the Role class...

    def has_permission(self, required_perm: StrEnum) -> bool:
        """
        Checks if the role possesses the required permission.
        Evaluates in $O(1)$ time complexity.
        """
        # 1. Exact match check
        if required_perm.value in self._permissions:
            return True

        # 2. Wildcard check ("namespace:all")
        # Extract the namespace before the colon
        namespace = required_perm.value.split(":")[0]
        wildcard = f"{namespace}:all"

        if wildcard in self._permissions:
            return True

        return False
```

### Step 4: Usage in the Application Layer

When building your Application Services or API endpoints, the security check becomes incredibly clean, explicit, and resistant to typos.

```python
class ArticleService:
    def __init__(self, article_repo):
        self.repo = article_repo

    def update_article(self, user: User, article_id: int, new_content: str):
        # Strict, type-hinted, auto-completable permission check
        if not user.role.has_permission(ArticlePerm.UPDATE):
            raise UnauthorizedException("You cannot edit articles.")

        article = self.repo.get(article_id)
        article.content = new_content
        self.repo.save(article)
```

### Handling the "Super Admin" Bootstrap

A common question with this architecture is: _"How do I create a Super Admin role that automatically has all permissions?"_

Because Enums are native Python iterables, aggregating every permission in the system for a bootstrapping script is trivial:

```python
from itertools import chain

# A registry of all permission enums in your system
SYSTEM_PERMISSIONS = [ArticlePerm, UserPerm]

def get_all_permissions() -> list[str]:
    """Returns a flat list of every permission string in the application."""
    # chain.from_iterable flattens the enums into a single iterator of strings
    return [perm.value for perm in chain.from_iterable(SYSTEM_PERMISSIONS)]

# In your bootstrap/setup script:
super_admin_role = Role(name="Super Admin", permissions=get_all_permissions())
```

### Conclusion

By moving the definition of permissions out of database rows and into Python `StrEnum` classes, we solve several major architectural headaches at once.

We eliminate database JOINs for authorization queries, gaining $O(1)$ lookup performance. We gain strict type-hinting and IDE support, preventing spelling mistakes in magic strings. Finally, we decouple feature development from database migrations, allowing developers to add new permissions purely in code.

Keep your relational database for relational data. For your security definitions, trust your code.
