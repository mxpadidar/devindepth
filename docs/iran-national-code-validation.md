# Demystifying the Iranian National Code (Kod-e-Melli) Validation Algorithm

A technical breakdown of the mathematical validation rules behind the Iranian National Identity Number.
Learn how to implement the modulo-11 checksum to ensure accurate data entry in your applications.

______________________________________________________________________

If you are building an application for the Iranian market, you will almost certainly need to collect
and validate user national codes (*Kod-e-Melli*). Unlike simple regular expressions, the Iranian national
code uses a specific mathematical algorithm to ensure the number is valid and hasn't been mistyped.

Here is a step-by-step breakdown of how the validation works.

## Basic Format Rules

Before doing any math, a valid national code must pass three structural checks:

- **Length:** It must be exactly $10$ numeric digits.
- **Type:** It must only contain digits ($0-9$).
- **Edge Case:** It cannot consist of $10$ identical digits (e.g., $1111111111$ or $0000000000$ are
  structurally invalid, even if they accidentally pass the math).

## The Checksum Mathematics

The core of the validation is a modulo-11 checksum. The $10$th digit (reading left to right) is the
"control digit" used to verify the first $9$ digits.

**Step A: Calculate the weighted sum**
Multiply each of the first $9$ digits by its position index (counting backward from $10$ down to $2$)
and sum the results.

Let the digits be $d_1, d_2, d_3, \\dots, d\_{10}$ (where $d\_{10}$ is the rightmost digit).
$$Sum = (d_1 \\times 10) + (d_2 \\times 9) + (d_3 \\times 8) + \\dots + (d_9 \\times 2)$$

**Step B: Calculate the remainder**
Divide the total sum by $11$ and find the remainder ($R$).
$$R = Sum \\pmod{11}$$

**Step C: Verify against the control digit**
Now, compare the remainder ($R$) to the $10$th digit ($d\_{10}$):

- If $R < 2$, then $d\_{10}$ must equal $R$.
- If $R \\ge 2$, then $d\_{10}$ must equal $11 - R$.

If the condition holds true, the national code is mathematically valid!

## Examples

**Example 1: A Valid Code ($0123456789$)**

1. Digits: `0, 1, 2, 3, 4, 5, 6, 7, 8` | Control digit: `9`
1. Calculate sum:
   $$Sum = (0 \\times 10) + (1 \\times 9) + (2 \\times 8) + (3 \\times 7) + (4 \\times 6) + (5 \\times 5) + (6 \\times 4) + (7 \\times 3) + (8 \\times 2)$$
   $$Sum = 0 + 9 + 16 + 21 + 24 + 25 + 24 + 21 + 16 = 156$$
1. Calculate remainder:
   $$R = 156 \\pmod{11} = 2$$
1. Check rule: Since $R \\ge 2$, the control digit must be $11 - 2 = 9$.
1. The $10$th digit is `9`, so this code is **valid**.

**Example 2: An Invalid Code ($0123456788$)**

1. Digits: `0, 1, 2, 3, 4, 5, 6, 7, 8` | Control digit: `8`
1. The sum for the first $9$ digits is still $156$.
1. The remainder $R$ is still $2$.
1. Check rule: Since $R \\ge 2$, the expected control digit is $11 - 2 = 9$.
1. The provided $10$th digit is `8` ($8 \\neq 9$), so this code is **invalid** (likely a typo).

Implementing this validation in your domain layer (for instance, as a Value Object in Python) ensures dirty data never reaches your database!
