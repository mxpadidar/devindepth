---
title: "Why python 3.13's uuidv7 is a better primary key for postgresql"
description: "Learn why UUIDv4 can hurt PostgreSQL performance and what makes a better alternative."
tags: ["python", "postgresql", "database", "performance", "uuid", "backend"]
draft: false
author: mxpadidar
publishedAt: 2026-06-04
---

Random UUIDs solve many problems, but they can quietly slow down your PostgreSQL database as it grows.
Python 3.13 now includes UUIDv7, giving you the benefits of UUIDs without most of the database performance drawbacks.

For years, developers have argued about one question:

**Should your database use auto-incrementing integers or UUIDs as primary keys?**

Integers are simple and fast.

UUIDs are great for distributed systems, microservices, APIs, and security because you can generate them
anywhere without asking the database for the next ID.

Because of these advantages, many teams switched to UUIDs.

Unfortunately, most of them chose the wrong UUID version.

If you're using `uuid.uuid4()` as your PostgreSQL primary key, your database may be doing a lot more
work than necessary.

The good news is that Python 3.13 now provides a built-in solution: `uuid.uuid7()`.

## Why Random UUIDs Hurt PostgreSQL

Let's start with a simple example.

Imagine a table containing millions of users.

With auto-incrementing integers, new IDs look like this:

```text
999998
999999
1000000
```

Each new row gets added to the end.

This is easy for PostgreSQL to handle because it always knows where the next record belongs.

Now look at UUIDv4:

```text
f73a3f5f...
1a9c8d2e...
8d42b1c7...
```

These values are completely random.

Every time PostgreSQL inserts a new row, it has to find a different place in the index.

Instead of writing to one area repeatedly, it has to jump all over the place.

You can think of it like adding pages to a book.

With integer IDs, you're always adding pages at the end.

With UUIDv4, you're constantly opening the book and inserting pages somewhere in the middle.

That creates extra work.

As your tables grow, this can lead to:

- More index fragmentation
- More page splits
- More disk activity
- Less efficient caching
- Slower inserts

For small applications, you may never notice.

For tables with millions or hundreds of millions of rows, the difference can become significant.

## What Makes UUIDv7 Different?

UUIDv7 was designed to solve this exact problem.

A UUIDv7 contains two important parts:

- A timestamp at the beginning
- Random data after it

Because the timestamp comes first, newer UUIDs naturally sort after older UUIDs.

For example:

```text
2025-01-01 -> UUID A
2025-01-02 -> UUID B
2025-01-03 -> UUID C
```

The actual UUID values look random, but their ordering follows time.

That means PostgreSQL can insert new rows near the end of the index instead of constantly jumping to random locations.

Visually:

```text
UUIDv4

[Index]
 ↑   ↑      ↑   ↑
Writes happen everywhere


UUIDv7

[Index]
                ↑
Most writes happen near the end
```

You still get globally unique IDs, but PostgreSQL can manage them much more efficiently.

## Python 3.13 Makes It Easy

Before Python 3.13, generating UUIDv7 values usually required a third-party package.

Now it's built directly into the standard library.

Creating a UUIDv7 is as simple as:

```python
import uuid

uid = uuid.uuid7()
```

Or inside a dataclass:

```python
import dataclasses
import datetime
import uuid


@dataclasses.dataclass
class Member:
    uid: uuid.UUID = dataclasses.field(
        default_factory=uuid.uuid7
    )

    user_uid: uuid.UUID
    tenant_uid: uuid.UUID

    start_date: datetime.date
    end_date: datetime.date | None = None
```

No extra packages.

No custom implementation.

Just use the standard library.

## Should You Replace Every UUIDv4?

Probably not.

If you already have large production tables using UUIDv4, migrating them can be expensive and risky.

The biggest win comes from:

- New projects
- New tables
- New services
- New microservices

For those cases, UUIDv7 is usually the better default choice.

## The Takeaway

For a long time, developers had to choose between:

- Fast database inserts with sequential integers
- Globally unique UUIDs that work well in distributed systems

UUIDv7 brings those two worlds much closer together.

You keep the benefits of UUIDs:

- No database-generated IDs
- Better support for distributed systems
- Harder-to-guess identifiers
- Easier data merging between services

At the same time, PostgreSQL gets IDs that are much friendlier to its indexes.

And thanks to Python 3.13, making the switch is often as simple as changing:

```python
uuid.uuid4()
```

to:

```python
uuid.uuid7()
```

Sometimes a one-character change can save your database a lot of work.
