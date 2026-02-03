---
title: Events and State Changes in CQRS
description: Understanding the role of events and state changes in CQRS.
tags: ["cqrs", "software-design"]
draft: true
author: mxpadidar
---

When building applications using the CQRS (Command Query Responsibility Segregation) pattern,
one of the most common questions developers face is:
**"Should my event handlers change state, or just perform side effects?"**

## Understanding the Players

Before we dive into state changes, let's clarify the key components:

### Commands

Commands represent **intentions** to change state. They're imperative instructions:

- `CreateOrder`
- `UpdateUserProfile`
- `CancelSubscription`

Commands can be **rejected** if business rules aren't satisfied.

### Events

Events represent **facts** about what already happened. They're past-tense notifications:

- `OrderCreated`
- `UserProfileUpdated`
- `SubscriptionCanceled`

Events cannot be rejected—they already occurred.

### Command Handlers

Code that validates and executes commands. They enforce business rules and coordinate state changes.

### Event Handlers

Code that reacts to events. They perform actions in response to things that happened.

## The Fundamental Question

When an event is raised, who is responsible for changing state?

Let's examine two different philosophies:

## Approach 1: Command Handlers Own State Changes

In this approach, **command handlers change state immediately**, and events notify interested parties about what happened.

```python
# Command Handler
async def handle_create_order(command: CreateOrderCommand):
    # Validate business rules
    if not command.items:
        raise ValidationError("Order must have items")

    # Create the aggregate
    order = Order(
        id=generate_id(),
        customer_id=command.customer_id,
        items=command.items,
        total=calculate_total(command.items),
        status=OrderStatus.PENDING
    )

    # ✅ STATE CHANGE HAPPENS HERE
    await order_repository.save(order)

    # Notify that it happened
    publish_event(OrderCreatedEvent(
        order_id=order.id,
        customer_id=order.customer_id,
        total=order.total,
        created_at=datetime.utcnow()
    ))

    return order
```

```python
# Event Handler - Side Effects Only
async def handle_order_created(event: OrderCreatedEvent):
    # Send confirmation email (side effect)
    await email_service.send_order_confirmation(
        customer_id=event.customer_id,
        order_id=event.order_id
    )

    # Notify inventory system (side effect)
    await inventory_service.notify_new_order(event.order_id)

    # Update analytics (side effect)
    await analytics. track_order_created(event)
```

### Characteristics

**Flow:**

1. Command arrives
2. Command handler validates
3. Command handler changes state
4. Command handler saves to database
5. Command handler publishes event
6. Event handlers react (send emails, call APIs, update caches, etc.)

**State is changed:** In the command handler (step 3-4)

**Events are used for:** Coordination and side effects

## Approach 2: Event Handlers Own State Changes

In this approach, **command handlers validate and raise events**, but the actual state changes happen in event handlers.

```python
# Command Handler - Validation Only
async def handle_create_order(command: CreateOrderCommand):
    # Validate business rules
    if not command.items:
        raise ValidationError("Order must have items")

    total = calculate_total(command.items)

    # Publish event (state hasn't changed yet!)
    publish_event(OrderCreatedEvent(
        order_id=generate_id(),
        customer_id=command.customer_id,
        items=command.items,
        total=total,
        created_at=datetime.utcnow()
    ))
```

```python
# Event Handler 1 - State Change
async def save_order(event: OrderCreatedEvent):
    # ✅ STATE CHANGE HAPPENS HERE
    order = Order(
        id=event.order_id,
        customer_id=event.customer_id,
        items=event.items,
        total=event.total,
        status=OrderStatus. PENDING
    )
    await order_repository.save(order)
```

```python
# Event Handler 2 - Another State Change
async def reserve_inventory(event: OrderCreatedEvent):
    # ✅ ANOTHER STATE CHANGE
    for item in event.items:
        await inventory_repository.reserve_stock(
            product_id=item.product_id,
            quantity=item.quantity
        )
```

```python
# Event Handler 3 - Side Effect
async def send_confirmation(event: OrderCreatedEvent):
    await email_service.send_order_confirmation(
        customer_id=event.customer_id,
        order_id=event.order_id
    )
```

### Characteristics

**Flow:**

1. Command arrives
2. Command handler validates
3. Command handler publishes event
4. Event handler 1 saves the order
5. Event handler 2 reserves inventory
6. Event handler 3 sends email

**State is changed:** In event handlers (steps 4-5)

**Events are used for:** Everything (state changes AND side effects)

## Comparing the Approaches

| Aspect                     | Approach 1 (Command Changes State)    | Approach 2 (Events Change State)  |
| -------------------------- | ------------------------------------- | --------------------------------- |
| **State consistency**      | Immediate                             | Eventually consistent             |
| **Command completion**     | State is saved before returning       | State saved after command returns |
| **Event handler failure**  | Side effects fail, core state is safe | Core state might not be saved     |
| **Debugging**              | Linear, easy to trace                 | Distributed across handlers       |
| **Transaction boundaries** | Clear (in command handler)            | Spread across event handlers      |
| **Use case**               | Traditional CQRS                      | Event Sourcing                    |

## When to Use Approach 1 (Command Changes State)

This is the **recommended approach for most CQRS implementations**.

### ✅ Use when:

- You need **immediate consistency** for core business operations
- You want **simple, predictable behavior**
- Event handlers should only perform **non-critical side effects**
- You're doing **CQRS without Event Sourcing**
- Failure of side effects shouldn't prevent the main operation

### Example: User Registration

```python
async def handle_register_user(command: RegisterUserCommand):
    # Validate
    if await user_repository.email_exists(command.email):
        raise ValidationError("Email already registered")

    # Create user
    user = User(
        id=generate_id(),
        email=command.email,
        password_hash=hash_password(command.password),
        created_at=datetime.utcnow()
    )

    # ✅ Save immediately
    await user_repository.save(user)

    # Notify (side effects happen asynchronously)
    publish_event(UserRegisteredEvent(
        user_id=user.id,
        email=user.email,
        registered_at=user.created_at
    ))

    return user
```

```python
# Event handlers perform non-critical side effects
async def send_welcome_email(event: UserRegisteredEvent):
    await email_service.send_welcome(event.email)

async def create_default_preferences(event: UserRegisteredEvent):
    await preferences_repository.create_defaults(event.user_id)

async def notify_marketing_team(event: UserRegisteredEvent):
    await slack. notify_channel(f"New user:  {event.email}")
```

**Key insight:** If the email fails to send, the user is still registered. The system is consistent.

## When to Use Approach 2 (Events Change State)

This approach is used in **Event Sourcing** architectures.

### ✅ Use when:

- You need a **complete audit trail** of all changes
- You want to **reconstruct state from history**
- Multiple aggregates need to react to the same event
- You're implementing **Event Sourcing**
- You need **temporal queries** (state at any point in time)

### Example: Banking Transaction

```python
async def handle_transfer_money(command: TransferMoneyCommand):
    # Load account from event stream
    account = await event_store.load_aggregate(f"account-{command.from_account}")

    # Validate
    if account.balance < command. amount:
        raise ValidationError("Insufficient funds")

    # Raise event (doesn't change state yet!)
    publish_event(MoneyTransferredEvent(
        from_account=command.from_account,
        to_account=command.to_account,
        amount=command.amount,
        timestamp=datetime.utcnow()
    ))
```

```python
# Event handler - Append to event store
async def store_transfer_event(event: MoneyTransferredEvent):
    # ✅ State change:  append event to stream
    await event_store.append(
        stream_id=f"account-{event.from_account}",
        event=event
    )
    await event_store.append(
        stream_id=f"account-{event.to_account}",
        event=event
    )
```

```python
# Event handler - Update read model
async def update_account_balance_view(event: MoneyTransferredEvent):
    # ✅ State change: update projection
    await read_db.execute("""
        UPDATE account_balances
        SET balance = balance - $1
        WHERE account_id = $2
    """, event.amount, event.from_account)

    await read_db.execute("""
        UPDATE account_balances
        SET balance = balance + $1
        WHERE account_id = $2
    """, event.amount, event.to_account)
```

**Key insight:** Events are the source of truth. Current state is derived from event history.

## The Special Case: Read Models in CQRS

There's one scenario where event handlers **should** change state, even in Approach 1: **updating read models**.

In CQRS, you separate:

- **Write Model** (optimized for commands)
- **Read Model** (optimized for queries)

```python
# Command handler changes write model
async def handle_update_product(command: UpdateProductCommand):
    product = await product_repository.get(command.product_id)
    product.update(
        name=command.name,
        price=command.price,
        description=command.description
    )

    # ✅ Save to write database
    await product_repository.save(product)

    publish_event(ProductUpdatedEvent(
        product_id=product. id,
        name=product. name,
        price=product. price,
        description=product. description
    ))
```

```python
# Event handler updates read model
async def update_product_search_index(event: ProductUpdatedEvent):
    # ✅ State change in READ model (this is OK!)
    await search_index.update({
        'id': event.product_id,
        'name': event.name,
        'price': event.price,
        'description': event. description,
        'searchable_text': f"{event.name} {event. description}"
    })
```

```python
# Another event handler updates different read model
async def update_product_catalog_cache(event: ProductUpdatedEvent):
    # ✅ State change in READ model (this is OK!)
    await cache.set(
        f"product:{event.product_id}",
        {
            'name': event.name,
            'price': event. price,
            'description': event.description
        },
        expire=3600
    )
```

**Why this is acceptable:**

- The write model is already saved (consistency guaranteed)
- Read models are **projections** of events
- Read models are **eventually consistent** by design
- If a read model update fails, you can rebuild it from events

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Splitting State Changes

Don't change state in both the command handler AND event handlers:

```python
# ❌ BAD
async def handle_create_user(command: CreateUserCommand):
    user = User(id=generate_id(), email=command.email)

    # State change 1
    await user_repository.save(user)

    publish_event(UserCreatedEvent(user_id=user.id, email=user.email))

async def handle_user_created(event: UserCreatedEvent):
    # State change 2 - DON'T DO THIS
    await user_stats_repository.increment_total_users()
    await user_preferences_repository.create(event.user_id)
```

**Problem:** State changes are scattered. Hard to maintain transactional consistency.

**Solution:** Do all write model changes in the command handler:

```python
# ✅ GOOD
async def handle_create_user(command: CreateUserCommand):
    user = User(id=generate_id(), email=command.email)

    # All state changes together
    async with transaction:
        await user_repository.save(user)
        await user_stats_repository.increment_total_users()
        await user_preferences_repository.create(user.id)

    publish_event(UserCreatedEvent(user_id=user.id, email=user.email))
```

### ❌ Anti-Pattern 2: Business Logic in Event Handlers

Don't put business logic and validation in event handlers:

```python
# ❌ BAD
async def handle_order_created(event: OrderCreatedEvent):
    # Business logic in event handler - DON'T DO THIS
    if event.total > 10000:
        await fraud_repository.flag_order(event.order_id)
        await order_repository.update_status(event.order_id, "REVIEW")
```

**Problem:** Business logic should be in command handlers where it can reject invalid commands.

**Solution:** Handle it in the command:

```python
# ✅ GOOD
async def handle_create_order(command: CreateOrderCommand):
    total = calculate_total(command.items)

    # Business logic here
    status = OrderStatus.PENDING
    if total > 10000:
        status = OrderStatus.REVIEW

    order = Order(
        id=generate_id(),
        items=command.items,
        total=total,
        status=status
    )

    await order_repository.save(order)

    if status == OrderStatus.REVIEW:
        publish_event(OrderFlaggedForReviewEvent(order_id=order.id, total=total))
    else:
        publish_event(OrderCreatedEvent(order_id=order.id, total=total))
```

### ❌ Anti-Pattern 3: Synchronous Event Handlers Changing Critical State

```python
# ❌ BAD
async def handle_payment_received(event: PaymentReceivedEvent):
    # If this fails, the payment event is already published!
    order = await order_repository.get(event.order_id)
    order.mark_as_paid()
    await order_repository.save(order)  # What if this fails?
```

**Problem:** The payment is recorded, but the order might not be marked as paid.

**Solution:** Change state in the command that processes the payment:

```python
# ✅ GOOD
async def handle_process_payment(command: ProcessPaymentCommand):
    # Charge the payment
    payment_result = await payment_gateway.charge(command.amount, command.card)

    # Update order status atomically
    async with transaction:
        order = await order_repository.get(command. order_id)
        order.mark_as_paid(payment_id=payment_result.id)
        await order_repository.save(order)

    # Now notify
    publish_event(PaymentReceivedEvent(
        order_id=command.order_id,
        payment_id=payment_result.id,
        amount=command.amount
    ))
```

## Decision Framework

Use this simple test to decide where state changes should happen:

### The Consistency Test

**Ask yourself:** _"If this command succeeds but the event handler fails, is my system still in a valid state?"_

- **YES** → Event handlers are doing side effects (correct for Approach 1)
- **NO** → Event handlers are changing critical state (you might need Approach 2 or Event Sourcing)

### Examples

**Scenario:** User registration

- Command succeeds: User saved to database ✅
- Event handler fails: Welcome email not sent ❌
- **System valid? ** YES (user can still log in)
- **Conclusion:** Use Approach 1

**Scenario:** Money transfer

- Command succeeds: Event published ✅
- Event handler fails: Balance not updated ❌
- **System valid?** NO (money disappeared!)
- **Conclusion:** Use Approach 2 (Event Sourcing) or change state in command

## Best Practices

### 1. Be Explicit About Side Effects

```python
# ✅ Name clearly indicates side effect
async def send_order_confirmation_email(event: OrderCreatedEvent):
    await email_service.send(...)

# ✅ Name clearly indicates state change
async def update_order_search_index(event: OrderCreatedEvent):
    await search.index(...)
```

### 2. Make Event Handlers Idempotent

Event handlers might be called multiple times (retries, replays). Make them safe:

```python
async def send_welcome_email(event: UserRegisteredEvent):
    # Check if already sent
    if await email_log.exists(event.user_id, "welcome"):
        return  # Already sent, skip

    await email_service.send_welcome(event.user_id)

    # Record that we sent it
    await email_log.record(event.user_id, "welcome")
```

### 3. Keep Events Focused

```python
# ✅ GOOD - Focused event
@dataclass
class OrderCreatedEvent:
    order_id: str
    customer_id: str
    total:  Decimal
    created_at: datetime

# ❌ BAD - Event doing too much
@dataclass
class OrderCreatedEvent:
    order_id: str
    customer_id:  str
    should_send_email: bool  # ❌ Control flow
    email_template: str      # ❌ Implementation detail
    apply_discount: bool     # ❌ Business logic
```

### 4. Use Sagas for Complex Workflows

When multiple state changes need to be coordinated across services:

```python
# Saga coordinates multiple commands
class OrderFulfillmentSaga:
    async def handle_order_created(self, event: OrderCreatedEvent):
        # Step 1: Reserve inventory
        await command_bus.send(ReserveInventoryCommand(
            order_id=event.order_id,
            items=event.items
        ))

    async def handle_inventory_reserved(self, event: InventoryReservedEvent):
        # Step 2: Charge payment
        await command_bus. send(ChargePaymentCommand(
            order_id=event.order_id,
            amount=event.total
        ))

    async def handle_payment_charged(self, event: PaymentChargedEvent):
        # Step 3: Schedule shipping
        await command_bus.send(ScheduleShippingCommand(
            order_id=event.order_id
        ))
```

## Conclusion

The choice between having command handlers or event handlers change state depends on your architecture:

**For most CQRS applications (Approach 1):**

- ✅ Command handlers change the write model
- ✅ Event handlers perform side effects
- ✅ Event handlers update read models
- ✅ Simple, predictable, immediately consistent

**For Event Sourcing (Approach 2):**

- ✅ Events are the source of truth
- ✅ Event handlers change state by appending events
- ✅ Current state is derived from event history
- ✅ Complete audit trail, eventually consistent

**The golden rule:** Be consistent within your bounded context. Don't mix approaches randomly—it leads to confusion and bugs.

Remember: **Events tell you what happened. Commands tell the system what to do. ** Keep this distinction clear, and your event-driven architecture will be maintainable and robust.
