---
title: Resource-Based API Design in RESTful Systems
description: A practical guide to understanding what resources are in RESTful APIs and how to design clean, consistent URLs based on resource-oriented principles.
tags: [rest, api-design, backend, architecture, resources]
draft: false
author: mxpadidar
---

This document explains what a **resource** is in REST, why resource modeling is the foundation of RESTful APIs, and how backend engineers should design URLs based on resources rather than actions.

The goal is to provide a clear mental model for designing APIs that scale cleanly as systems and workflows grow.

## What a Resource Is in REST

In REST, a resource is **any meaningful domain concept that can be identified, referenced, and manipulated**.

A resource is not a database table and not an API action. It is a _conceptual model_ exposed to clients.

Examples of resources:

- User
- Order
- Invoice
- Payment
- Approval
- Subscription

If you can:

- Give it an identity
- Retrieve its current state
- Change that state over time

then it is a resource.

## Resource Identity

Every resource must have a stable, unique identifier.

In HTTP APIs, this identity is represented as a URL.

```
/orders/123
/users/42
/approvals/987
```

The URL answers the question: _“What resource is this?”_ — not _“What should the server do?”_

## Collections vs Individual Resources

REST distinguishes between:

### Resource Collections

A collection represents multiple resources of the same type.

```
/orders
/users
/approvals
```

Common operations:

- `GET /orders` – list resources
- `POST /orders` – create a new resource

### Individual Resources

An individual resource is a single member of a collection.

```
/orders/{id}
```

Common operations:

- `GET /orders/{id}` – retrieve
- `PATCH /orders/{id}` – update
- `DELETE /orders/{id}` – remove

The URL structure remains consistent across resource types.

## Resources vs Actions

A common mistake is treating APIs as remote procedure calls.

Action-based URLs:

```
/approveOrder
/cancelSubscription
/updateUserStatus
```

These URLs describe _what to do_, not _what the resource is_.

REST instead models actions as **state changes on resources**.

Example:

```
PATCH /orders/{id}
{
  "status": "cancelled"
}
```

The client requests a new state; the server decides if it is valid.

## How to Discover Resources

A practical way to identify resources is to ask:

- Does this concept have a lifecycle?
- Can it exist independently?
- Can it be linked, queried, or audited?

If yes, it likely deserves its own resource.

For example:

- An approval is a resource
- An approval decision is not a separate resource
- A payment is a resource
- A payment execution is a state transition

## Designing URLs from Resources

Once resources are identified, URLs follow naturally.

Rules:

- Use nouns, not verbs
- Use plural names for collections
- Keep URLs predictable
- Avoid encoding business logic

Good examples:

```
/orders
/orders/{id}
/orders/{id}/items
/users/{id}/subscriptions
```

Bad examples:

```
/getOrders
/processPayment
/approve-fee
```

## Nested Resources

Nested URLs express relationships, not actions.

```
/orders/{order_id}/items
/users/{user_id}/orders
```

Use nesting when:

- The child resource cannot exist without the parent
- The relationship is important to the client

Avoid deep nesting beyond one or two levels.

## Resource State and URLs

State should not appear in URLs.

Avoid:

```
/orders/pending
/orders/approved
```

Instead:

- Represent state as a field
- Filter using query parameters

```
GET /orders?status=pending
```

The resource identity remains stable regardless of state.

## Backend Responsibility

The backend owns:

- Resource definitions
- Valid state transitions
- Business rules

The client:

- Selects a resource
- Submits a representation of desired state

The server enforces correctness.

## Why This Matters

Resource-based design:

- Keeps APIs consistent
- Prevents endpoint explosion
- Makes workflows extensible
- Aligns with HTTP semantics

APIs designed this way remain understandable even as complexity increases.

## Summary

RESTful APIs are built around **resources and their state**, not actions.

By:

- Clearly identifying resources
- Giving them stable URLs
- Using HTTP methods to express intent
- Modeling behavior as state changes

backend systems stay clean, predictable, and evolvable.
