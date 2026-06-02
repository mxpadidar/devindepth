## Demystifying the Event Bus: Collection, Dispatch, and Clean Dependency Injection

**Published:** 1405/01/13
**Description:** *Moving away from the generic "Unified Message Bus" to a dedicated Event Bus solves routing and type-hinting issues. But how do you actually implement the flow of events from Entities to Handlers, and more importantly, how do you manage Dependency Injection without turning your Event Bus into a messy Service Locator? Here is the complete implementation guide.*

______________________________________________________________________

As established, using a generic Message Bus to route both Commands and Events in Python is an anti-pattern. It destroys type hinting for your Commands and conflates $1:1$ operations (Commands) with $1:N$ side effects (Events).

The superior architecture is: **Call your Command Handlers directly as standard functions, and use an Event Bus strictly to publish background side-effects.**

But implementing this requires answering three critical questions:

1. How do we store and collect events without polluting our Domain Entities with infrastructure?
1. How does the Event Bus actually dispatch them?
1. **How does Dependency Injection (DI) work**, both for the Command Handler and the hidden Event Handlers?

Here is the step-by-step implementation.

______________________________________________________________________

### 1. Storing Events: The Entity's Memory

Domain Entities must be pure. They cannot import an Event Bus, and they certainly cannot dispatch events directly, because doing so before a database commit guarantees inconsistent data if the transaction rolls back.

Instead, Entities simply "remember" what happened.

```python
from pydantic import BaseModel, Field

class DomainEvent(BaseModel):
    pass

class TenantCreatedEvent(DomainEvent):
    tenant_uid: str
    owner_uid: str

class BaseEntity:
    def __init__(self):
        self._domain_events: list[DomainEvent] = []

    def queue_event(self, event: DomainEvent):
        self._domain_events.append(event)

    @property
    def domain_events(self) -> list[DomainEvent]:
        return self._domain_events
    
    def clear_events(self):
        self._domain_events.clear()
```

When you create a Tenant, it just queues the event internally:

```python
class Tenant(BaseEntity):
    # ... attributes ...

    @classmethod
    def register_new(cls, name: str, creator_uid: str) -> 'Tenant':
        tenant = cls(name=name)
        tenant.queue_event(TenantCreatedEvent(
            tenant_uid=tenant.uid, 
            owner_uid=creator_uid
        ))
        return tenant
```

### 2. Collecting Events: The Unit of Work

The Unit of Work (UoW) manages your database transaction. Because the UoW knows about the Repositories, and Repositories track which Entities they have loaded or saved, the UoW is the perfect place to harvest events right after a successful commit.

```python
class UnitOfWork:
    # ... session and repo initialization ...

    async def commit(self):
        await self.session.commit()

    def collect_new_events(self) -> list[DomainEvent]:
        events = []
        # Assume self.tenants.seen is a set of all Entities interacted with
        for entity in self.tenants.seen: 
            while entity.domain_events:
                events.append(entity.domain_events.pop(0))
        return events
```

### 3. The Event Bus Implementation

The Event Bus itself should be incredibly dumb. It is a simple dictionary mapping Event types to a list of callable async functions.

```python
from collections import defaultdict
from typing import Callable, Type, Any

class EventBus:
    def __init__(self):
        self._subscribers: dict[Type[DomainEvent], list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: Type[DomainEvent], handler: Callable):
        self._subscribers[event_type].append(handler)

    async def publish(self, event: DomainEvent):
        handlers = self._subscribers.get(type(event), [])
        for handler in handlers:
            # Simple sequential execution (Await and Wait)
            await handler(event) 
```

### 4. The Dependency Injection Challenge

This is where most architectures fall apart.
If `EventBus.publish` just calls `await handler(event)`, how does the handler get its database connection, its UoW, or its email client?

**The Anti-Pattern:** Passing a massive DI container into the Event Bus, or having the Event Bus magically inspect function signatures. This turns the Bus into a "Service Locator."

**The Solution:** Inject dependencies *during registration*, not during dispatch. The Event Bus should remain completely ignorant of what a handler needs.

We achieve this using class-based handlers or `functools.partial`.

#### Injecting into Event Handlers (Configuration Phase)

When you wire up your application (usually at startup), you instantiate your handlers with their required factories, then register the bound method to the bus.

*Note: Event Handlers must receive a UoW Factory (like `sessionmaker`), not an active UoW instance, because they run independently and need their own isolated database transactions.*

```python
# 1. Define the Handler as a class requiring dependencies
class SendWelcomeEmailHandler:
    def __init__(self, email_client: EmailClient, uow_factory: Callable[[], UnitOfWork]):
        self.email_client = email_client
        self.uow_factory = uow_factory

    async def __call__(self, event: TenantCreatedEvent):
        # Create a fresh, isolated UoW for this side-effect
        async with self.uow_factory() as uow:
            user = await uow.users.get(event.owner_uid)
            await self.email_client.send(user.email, "Welcome!")

# 2. Bootstrapping / Dependency Injection Configuration
def bootstrap_event_bus(email_client: EmailClient, uow_factory: Callable) -> EventBus:
    bus = EventBus()
    
    # Inject dependencies at instantiation
    welcome_handler = SendWelcomeEmailHandler(email_client, uow_factory)
    
    # The bus only sees a callable that accepts an event
    bus.subscribe(TenantCreatedEvent, welcome_handler) 
    
    return bus
```

#### Injecting into the Command Handler

Finally, the Command Handler needs access to the Event Bus to publish the harvested events. We inject it directly as an argument, just like the UoW. No magic.

```python
# domain/handlers.py
async def handle_tenant_register_command(
    cmd: TenantRegisterCommand, 
    *, # Force keyword arguments for dependencies
    uow: UnitOfWork,
    event_bus: EventBus
) -> Tenant:

    async with uow:
        # ... core domain logic ...
        tenant = Tenant.register_new(name=cmd.name, creator_uid=cmd.user_uid)
        await uow.tenants.add(tenant)
        
        await uow.commit() # 100% data consistency guaranteed here

        # Harvest and publish
        # event_bus is explicitly injected, not globally imported
        for event in uow.collect_new_events():
            await event_bus.publish(event)

    return tenant
```

At the API framework level (e.g., FastAPI), your dependency injection container resolves the UoW and the globally bootstrapped Event Bus, passing them directly into the function:

```python
# api/endpoints.py
@app.post("/tenants")
async def create_tenant(
    request: TenantRequest, 
    uow: UnitOfWork = Depends(get_uow),
    event_bus: EventBus = Depends(get_event_bus)
):
    cmd = TenantRegisterCommand(name=request.name, user_uid=request.user_uid)
    return await handle_tenant_register_command(cmd, uow=uow, event_bus=event_bus)
```

### Summary

By ditching the unified message bus, you regain strict $1:1$ type-safety and IDE traceability for your Commands. By utilizing a simple Event Bus, harvesting events from your UoW, and injecting dependencies into handlers *at registration time*, you create a robust, decoupled DDD architecture that is actually pleasant to maintain.
