# When to Fire a Domain Event (And When to Hold Your Fire)

**A short guide to understanding the nature of Domain Events, helping you decide when they are the
right tool for the job and when they're an anti-pattern in disguise.**

Domain Events are a cornerstone of modern, decoupled architectures like DDD and microservices. They
promise loose coupling, improved resilience, and a clear audit trail of what's happening in your system.
But this power comes with a cost: using them incorrectly leads to tangled logic, "event-driven spaghetti
code," and brittle systems that are a nightmare to debug.

This post cuts through the noise to define what a domain event truly is, providing a clear litmus test
for when you should—and absolutely should not—publish one. We're not talking about message buses or
outbox patterns today; we're talking about the fundamental nature of the event itself.

## What Exactly *is* a Domain Event?

Before you can know *when* to use an event, you must know *what* it is. A Domain Event is not just a
message or a callback. It is a statement of fact about something significant that has already occurred
in your business domain.

A proper Domain Event has four key characteristics:

- It's in the Past Tense: This is non-negotiable. An event is a record of something that *happened*.
  **Good:** `OrderShipped`, `PasswordResetRequested`, `TenantDeactivated`
  **Bad:** `ShipOrder`, `ResetPassword`, `DeactivateTenant` (These are Commands)

- It's Immutable: You cannot change the past. An event, once created, is a fact. If that fact was wrong,
  you don't delete or edit the original event. You publish a *new* compensating event, like
  `OrderShippingAddressCorrected`.

- It Speaks the Business Language: An event must be meaningful to the business, not just to the system.
  **Good:** `UserUpgradedToPremiumPlan`
  **Bad:** `UserRowUpdatedInSubscriptionTable`

- It Carries Data: An event should be a self-contained package of information. It should provide enough
  context for listeners to act without having to immediately query the original system for basic details.

```python
@dataclass(frozen=True, slots=True)
class OrderShipped:
    """A perfect domain event.
    - Past tense: "Shipped"
    - Immutable: frozen=True, slots=True
    - Carries data: order_id, shipped_at, tracking_number
    """
    order_id: UUID
    shipped_at: datetime
    tracking_number: str
```

## The Litmus Test: When Should You Publish an Event?

Ask yourself these three questions. If the answer to all three is "yes," you almost certainly have a
valid use case for a Domain Event.

### Question 1: Does the business care that this happened?

This is the most important filter. Is this change a significant milestone in a business process? Would
a product manager or a business analyst understand and care about this event's name?

- **YES:** `UserPasswordChanged`. This is a critical security event. The business absolutely cares.
- **NO:** `UserRecordLoadedIntoCache`. This is a technical implementation detail. The business does
  not care. This is a log entry or a metric, not a domain event.

### Question 2: Do other parts of the system need to react to this change?

The primary purpose of events is to enable decoupling. When one part of your system (e.g., the `Ordering`
service) makes a change, do other, separate parts (`Billing`, `Shipping`, `Notifications`) need to know
about it without the `Ordering` service having to know they exist?

- **YES:** When an `OrderIsPlaced`, the `Notifications` context needs to send a confirmation email,
  and the `Inventory` context needs to decrement stock. The `Ordering` context shouldn't be responsible
  for calling those other services directly.
- **NO:** If you're simply updating a user's `last_login_at` timestamp, it's unlikely any other part
  of the system needs to trigger a complex process in reaction. A simple database update is sufficient.

### Question 3: Is this a side-effect, not part of the main transaction's success?

This is the crucial distinction between immediate and eventual consistency. Is the action you want to
trigger essential for the original operation to be considered successful?

- **YES (It's a side-effect):** After a `UserRegistered`, you need to send a welcome email. The user
  registration is successful even if the email service is down. This is a perfect use for an event.
- **NO (It's part of the core transaction):** When a `Tenant` is registered, you must create an `Owner`
  role and assign it to the creator. The tenant is unusable without this. If you fire an event to do this,
  you risk creating an orphaned tenant if the event handler fails. This logic belongs in the same, single
  atomic transaction as the tenant creation.

## The Danger Zone: When NOT to Publish an Event

Recognizing anti-patterns is as important as recognizing good patterns. Hold your fire if you find
yourself doing the following:

### Anti-Pattern 1: Events as a Flow-Control Mechanism (RPC over a Bus)

If you have a chain like:
`OrderReceivedEvent` -> triggers `ProcessOrderCommand` -> emits `OrderProcessedEvent` -> triggers `BillOrderCommand`,
you have not decoupled your system. You have built a slow, brittle, and hard-to-debug remote procedure call.
A command should encapsulate a full business operation. Events are for *reactions* to a completed operation,
not for orchestrating the steps *within* one.

### Anti-Pattern 2: Events to Split a Single Atomic Transaction

This is the "tenant without an owner" problem described above. If the system must be in a consistent
state *immediately* after an operation, do not split that operation across a command and an event handler.
The risk of the event handler failing and leaving your data in an inconsistent state is too high.
**Transactional integrity trumps decoupling for core business rules.**

### Anti-Pattern 3: Anemic "CRUD" Events

Avoid generic events like `EntityUpdated`. An event like `OrderUpdated(order_id=123)` is useless. It
forces every single listener to query the database to figure out *what* changed. Was it the shipping
address? The price? The status? This creates high database load and couples all your listeners to the
`Order` table's schema. Be specific: `OrderShippingAddressChanged`, `OrderItemPriceAdjusted`.

## Conclusion

Domain Events are a powerful tool for modeling the behavior of a complex system. They are not a silver
bullet. Before you `event_bus.publish()`, pause and run through the litmus test:

- **Does the business care?**
- **Do other contexts need to react?**
- **Is it a true side-effect?**

Treat events as the public, historical record of your business. If it's not a significant, historical
business fact, it's not a domain event.
