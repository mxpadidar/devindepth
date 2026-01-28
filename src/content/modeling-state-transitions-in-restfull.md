---
title: State Transitions as First-Class Citizens in RESTful APIs
description: A practical guide to modeling workflow-driven systems in RESTful APIs using resource state transitions instead of action-based endpoints.
tags: [rest, api-design, architecture, backend]
draft: false
author: mxpadidar
---

This document explains a standard RESTful approach for handling **state transitions** on existing resources. While the examples use a _manager fee approval_ scenario, the principles apply broadly to REST API design in workflow-driven systems.

## Core REST Principle

In RESTful APIs, **endpoints represent resources, not actions**.

Operations such as approving, rejecting, publishing, cancelling, or archiving are not actions to be encoded in URLs. They are **changes to the state of an existing resource**.

When an API models behavior as state changes instead of commands, it becomes more consistent, extensible, and predictable.

## State as Part of the Resource

A resource that participates in a workflow should expose its current state explicitly.

Example (simplified):

- A fee request exists as a resource
- It has a lifecycle (`PENDING`, `APPROVED`, `REJECTED`)
- A manager decision moves it from one valid state to another

The decision does not create a new resource. It updates the existing one.

## Why PATCH Is the Correct Method

When a client changes only part of a resource — such as its status — the correct HTTP method is `PATCH`.

`PATCH` communicates intent clearly:

- The resource already exists
- Only specific fields are being modified
- The update may be conditional or validated by domain rules

This aligns naturally with workflow transitions.

## Example Resource Endpoint

```
PATCH /resources/{id}
```

The request body expresses _what the new state should be_, not _what action to execute_.

Example:

```json
{
  "status": "approved",
  "comment": "Approved within budget"
}
```

Or:

```json
{
  "status": "rejected",
  "comment": "Exceeds allowed limit"
}
```

The same endpoint supports multiple valid transitions, enforced by the domain.

## Domain-Driven Validation

REST does not remove business rules — it clarifies where they belong.

Typical rules enforced server-side:

- Only specific transitions are allowed (e.g. `PENDING` → `APPROVED`)
- Some transitions require additional data (e.g. rejection comment)
- Once a terminal state is reached, further updates are rejected

The API surface stays stable while the domain controls correctness.

## Why Action-Based URLs Are Discouraged

Endpoints like:

```
POST /approve
POST /reject
POST /resources/{id}/approve
```

introduce several long-term problems:

- URLs encode behavior instead of resource state
- Each new action creates a new endpoint
- Workflows become fragmented and harder to reason about
- Clients must learn verbs instead of resource models

These designs often start simple but scale poorly as requirements grow.

## Extensibility Benefit

A state-based design allows new transitions without changing the API structure.

For example:

- `ESCALATED`
- `CANCELLED`
- `EXPIRED`

All can be supported through the same endpoint and method, with no new URLs.

## Summary

State transitions are a natural fit for REST when they are modeled as **updates to existing resources**.

Using `PATCH` with explicit state fields:

- Keeps APIs resource-oriented
- Reduces endpoint proliferation
- Centralizes business rules
- Matches common REST tooling and expectations

The fee approval scenario demonstrates the pattern, but the approach applies to any workflow-driven RESTful system.
