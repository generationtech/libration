# Cursor Workflow

## Core Principle

All rendering logic must be expressed via RenderPlan builders.

Backend is mechanical only.

---

## Responsibilities

Cursor:
- implement plan builders
- maintain separation of concerns

ChatGPT:
- architecture decisions

---

## Critical Rules

DO:
- resolve all semantics in plan builders

DO NOT:
- put logic in backend
- introduce hidden rendering paths

---

## Rendering Rule

Everything must follow:

Plan → Executor

No exceptions.

---

## Primitives

Use existing primitives.
Only add new ones when necessary and minimal.

---

## Current State

Renderer-agnostic refactor is complete.

Focus is now feature development.
