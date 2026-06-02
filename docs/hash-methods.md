# A Developer's Guide to Hashing Algorithms

Not all hashes are created equal. Some are designed to be blazingly fast, while others are intentionally
slow to thwart hackers. Here is a breakdown of the most important hashing algorithms and exactly when you
should use them in your projects.

______________________________________________________________________

Hashing is a fundamental concept in software engineering. At its core, a hash function takes input data
of any size and spits out a fixed-size string of characters. But picking the *wrong* algorithm can lead
to massive security vulnerabilities or crippling performance bottlenecks.

Let's cut through the noise and look at the most important hashing methods you actually need to know.

## The Speed Demons: Non-Cryptographic Hashes

**Important Algorithms:** MurmurHash, CityHash, xxHash
**Primary Goal:** Speed and even distribution.

These algorithms are built for pure performance. They don't care about security; they care about taking
a piece of data and turning it into a short identifier as fast as physically possible.

- **What they are useful for:** Hash tables (like Python's dictionaries, which rely on $O(1)$ lookups),
  database indexing, caching systems (like Redis), and load balancing.
- **When NOT to use them:** Never use these for passwords, digital signatures, or anything involving security.
  They are susceptible to deliberate collisions (where two different inputs produce the same hash).

## The Fort Knox Guards: Cryptographic Hashes

**Important Algorithms:** SHA-256, SHA-3
**Primary Goal:** Uniqueness, unpredictability, and collision resistance.

The Secure Hash Algorithm (SHA) family, particularly SHA-256, is the gold standard for data integrity.
They are computationally fast, but mathematically complex enough that it is practically impossible to
reverse-engineer the input from the hash, or to find two files that produce the exact same hash.

- **What they are useful for:** Digital signatures, SSL/TLS certificates, validating downloaded files
  to ensure they haven't been tampered with, and blockchain technologies (Bitcoin uses SHA-256 extensively).
- **When NOT to use them:** Do not use them for storing user passwords. Because they are designed to be fast,
  a hacker with a modern GPU can guess billions of SHA-256 combinations per second in a brute-force attack.

## The Deliberate Snails: Key Derivation Functions (KDFs)

**Important Algorithms:** Argon2, Bcrypt, PBKDF2, Scrypt
**Primary Goal:** Being intentionally slow and resource-heavy.

When a user creates an account, you need to hash their password before saving it to the database. If a
hacker steals your database, you want to make it as hard as possible for them to guess the original passwords.
Algorithms like Bcrypt and Argon2 use "salting" (adding random data) and high iteration counts to intentionally
slow down the hashing process.

- **What they are useful for:** Hashing passwords and generating encryption keys. **Argon2** is currently the top
  recommendation by security professionals, as it is designed to be memory-hard (meaning it requires a lot of RAM,
  which ruins the efficiency of GPU-based hacking rigs).
- **When NOT to use them:** Do not use them for checking file integrity or hashing keys in a database. Their
  intentional slowness will bring your system to a halt.

## The Retired Veterans: Legacy Hashes

**Important Algorithms:** MD5, SHA-1
**Primary Goal:** Historical file checking.

You will see MD5 and SHA-1 everywhere in legacy systems. However, both have been "broken" cryptographically.
With modern computers, it is trivial to create malicious files that yield the exact same MD5 or SHA-1 hash
as a legitimate file.

- **What they are useful for:** Basic checksums to verify that a file didn't corrupt during a network transfer
  (accidental corruption, not malicious tampering).
- **When NOT to use them:** Anything security-related. Treat them as obsolete for cryptography.

## The Golden Rule

When choosing a hash:

- Need to secure a **password**? Use **Argon2** or **Bcrypt**.
- Need to secure a **document or transaction**? Use **SHA-256**.
- Need to build a **cache or hash table**? Use **xxHash** or **MurmurHash**.
