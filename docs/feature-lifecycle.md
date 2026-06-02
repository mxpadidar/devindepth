### **From "I Want" to "It Works": User Stories, Flows, and Use Cases for Backend Developers**

A ticket lands on your board. It reads: "Add feature to invite users."

You're a backend developer. Your mind immediately jumps to the implementation. *Okay, I'll need a `/invitations` endpoint. It'll be a `POST` request. I need a new table with a foreign key to `users` and `tenants`. I'll need a unique token...*

Stop. You're already on the path to failure.

You've skipped the two most important translation steps that turn a vague business idea into a concrete, robust piece of software. If you don't know the difference between a User Story, a User Flow, and a Use Case, you are essentially trying to build a house by looking at a napkin sketch.

Let's fix that. We'll follow the "Invite User" feature from its inception to your code editor.

#### **Step 1: The User Story - The "What" and "Why"**

A feature begins its life as a **User Story**. This is a simple, non-technical sentence written from the user's perspective. It has a strict format:

`As a [Type of User], I want to [Perform an Action], so that [I can achieve a Goal].`

For our feature, the User Story would be:

> **"As a** Tenant Owner, **I want to** invite new team members by email, **so that** they can join my workspace and start logging their time."

**What this is for you, the backend developer:**
This is the **contract of intent**. It is intentionally vague on the *how*. Its only job is to tell you **who** cares about this feature and **why** they care. The "so that" part is the most critical. If your final implementation doesn't allow users to "start logging their time," you have failed, no matter how elegant your database schema is. The User Story is your north star for the business value.

**What it is NOT:** It is not a spec. It does not mention modals, buttons, database tables, or API responses. Asking a product manager to add API specs to a User Story is a misunderstanding of its purpose.

#### **Step 2: The User Flow - The Map of the Clicks**

Once the business agrees on the User Story, the UX/UI designers and frontend developers step in. They create a **User Flow**. This is the visual or written path the user will take through the interface to accomplish the goal from the User Story.

For our feature, the User Flow might look like this:

1. User is on the `Tenant Dashboard`.
1. User clicks on the "Team" navigation link.
1. User clicks the "Invite Member" button.
1. A modal appears with fields for `Email` and `Role`.
1. User fills in the form and clicks "Send Invitation".
1. The modal closes, and a "Pending" invitation appears in the team list.

**What this is for you, the backend developer:**
This is the **sequence of API calls**. The User Flow dictates the *shape* and *order* of the endpoints you need to build.

- "User is on the `Team` navigation link" -> This implies a `GET /tenants/{tenantId}/members` endpoint is needed to display the current team list.
- "User clicks 'Send Invitation'" -> This explicitly requires a `POST /tenants/{tenantId}/invitations` endpoint.
- "'Pending' invitation appears" -> This means your `GET` endpoint must be able to return a list that includes pending members, or you need a separate `GET /tenants/{tenantId}/invitations` endpoint.

Suddenly, the vague "invite feature" has a concrete structure. You now know what endpoints the frontend will be calling and in what order.

#### **Step 3: The Use Case - The Backend Blueprint**

This is where you live. This is your domain. A **Use Case** is the detailed, technical, step-by-step description of how the *system* responds to a user action defined in the User Flow. It has no UI. It is pure logic. It is the blueprint for your service classes, your command handlers, and your domain models.

For the `POST /tenants/{tenantId}/invitations` call, the **Use Case** is: `InviteUserToTenant`.

Here’s what it contains:

- **Name:** `InviteUserToTenant`
- **Actor:** An authenticated `User` who is an `Employee` of the `Tenant`.
- **Trigger:** The actor sends a `POST` request to `/tenants/{tenantId}/invitations` with a payload containing `email` and `roleId`.
- **Preconditions (The Guards):**
  1. The system must verify the actor has the `OWNER` or `ADMIN` role within the specified tenant. If not, return `403 Forbidden`.
  1. The system must validate that the `email` is a valid format and the `roleId` exists. If not, return `422 Unprocessable Entity`.
  1. The system must check if an active `Employee` or a pending `Invitation` with this email already exists for this tenant. If yes, return `409 Conflict`.
- **Main Success Scenario (The Happy Path):**
  1. Generate a cryptographically secure, unique invitation token.
  1. Create a new `Invitation` record in the database with the `tenantId`, `email`, `roleId`, `token`, and a status of `PENDING`.
  1. Dispatch a job to a queue to send an invitation email to the provided address.
  1. Return a `201 Created` response with the data for the new invitation resource.
- **Error Scenarios:**
  1. If the database write fails, roll back the transaction and return `500 Internal Server Error`.
  1. If the email service is down and fails to queue, the transaction should still succeed, but the error should be logged.

**What this is for you, the backend developer:**
This is your **TODO list**. Every point in the Preconditions, Main Scenario, and Error Scenarios translates directly into code you need to write. It forces you to think about authorization, validation, race conditions, and transactional integrity *before* you write a single line of code.

### **Summary: From Vague to Concrete**

| Concept | Purpose | Owned By | Example |
| :------------ | :--------------------------------------------------------- | :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Story**| Defines the business value (**WHAT** & **WHY**) | Product Manager | "As an Owner, I want to invite users so they can log time." |
| **User Flow** | Maps the user's path through the UI (**HOW** for the user) | UX/UI Designer, Frontend | Click "Team" -> Click "Invite" -> Fill modal -> Click "Send". |
| **Use Case** | Details the system's internal logic (**HOW** for the system) | Backend Developer, Architect | `InviteUserToTenant` class: Check permissions, validate input, create DB record, dispatch email job, handle errors. |

A User Story is a request for a conversation. A User Flow is the map of the interface. **A Use Case is the architectural plan for your code.**

Next time a ticket lands on your board, don't jump to the code. Ask for the User Flow. Then, write the Use Case. If you can't write the Use Case, you are not ready to build the feature.
