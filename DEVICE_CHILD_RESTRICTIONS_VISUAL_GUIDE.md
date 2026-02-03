# Device Child Restrictions - Visual Guide

## Feature Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   DEVICE CHILD RESTRICTIONS                  │
│            Control which children see on each device         │
└─────────────────────────────────────────────────────────────┘

PROBLEM SOLVED:
╔══════════════════════════════════════════════════════════════╗
║  Before: All children could access all devices               ║
║  ❌ Siblings could see each other's accounts on personal     ║
║     devices                                                  ║
║  ❌ No way to restrict access per device                     ║
╚══════════════════════════════════════════════════════════════╝

SOLUTION PROVIDED:
╔══════════════════════════════════════════════════════════════╗
║  After: Parents configure which children per device          ║
║  ✅ Personal devices: Show only that child                   ║
║  ✅ Shared devices: Show all children                        ║
║  ✅ Flexible configuration per device                        ║
╚══════════════════════════════════════════════════════════════╝
```

## UI Flow

### 1. Device Management Screen
```
┌────────────────────────────────────────────────────────────┐
│  Settings → Device Management                               │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  📱 Emma's iPad                    [Edit] [X]│           │
│  │  Last active: 5 minutes ago                 │           │
│  │  ───────────────────────────────────────    │           │
│  │  👤 Allowed Children (1)                    │           │
│  │     [Emma]                                  │           │
│  │  [Edit Restrictions]                        │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  📱 Kitchen Tablet               [Edit] [X] │           │
│  │  Last active: 2 hours ago                   │           │
│  │  ───────────────────────────────────────    │           │
│  │  👤 Allowed Children (All)                  │           │
│  │     All children can access this device     │           │
│  │  [Edit Restrictions]                        │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 2. Edit Restrictions Dialog
```
┌────────────────────────────────────────────────────────────┐
│  Manage Child Access                              [X]       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Check the children who should have access to this         │
│  device. Leave all unchecked to allow all children.        │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  ☑️  [🔵] Emma                               │           │
│  │  ☐  [🟢] Noah                                │           │
│  │  ☐  [🔴] Olivia                              │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ───────────────────────────────────────────────           │
│  How it works: Check specific children to restrict         │
│  this device to only those children. Leave all unchecked   │
│  to allow all children (recommended for shared devices).   │
│                                                             │
│              [Cancel]              [Save]                   │
└────────────────────────────────────────────────────────────┘
```

## Use Case Examples

### Example 1: Personal Device (Restricted)
```
DEVICE: Emma's iPad
┌────────────────────────────────────┐
│  Configuration:                     │
│  ☑️ Emma                            │
│  ☐ Noah                             │
│  ☐ Olivia                           │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  Child Selector Shows:              │
│                                     │
│  ┌──────────┐                       │
│  │   Emma   │                       │
│  │    ⭐    │                       │
│  └──────────┘                       │
│                                     │
│  (Noah and Olivia NOT visible)     │
└────────────────────────────────────┘
```

### Example 2: Shared Device (Unrestricted)
```
DEVICE: Kitchen Tablet
┌────────────────────────────────────┐
│  Configuration:                     │
│  ☐ Emma                             │
│  ☐ Noah                             │
│  ☐ Olivia                           │
│  (All unchecked = All allowed)     │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  Child Selector Shows:              │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Emma │ │ Noah │ │Olivia│        │
│  │  ⭐  │ │  ⭐  │ │  ⭐  │        │
│  └──────┘ └──────┘ └──────┘        │
│                                     │
│  (All children visible)             │
└────────────────────────────────────┘
```

## Family Configuration Examples

### Small Family (2 children)
```
┌─────────────────────────────────────────────────────────┐
│  Emma's iPad      → Shows: Emma only                    │
│  Noah's Tablet    → Shows: Noah only                    │
│  Kitchen Tablet   → Shows: Emma, Noah (both)            │
└─────────────────────────────────────────────────────────┘
```

### Medium Family (3 children)
```
┌─────────────────────────────────────────────────────────┐
│  Emma's Phone     → Shows: Emma only                    │
│  Noah's Phone     → Shows: Noah only                    │
│  Olivia's iPad    → Shows: Olivia only                  │
│  Kitchen Tablet   → Shows: Emma, Noah, Olivia (all)     │
│  Living Room TV   → Shows: Emma, Noah, Olivia (all)     │
└─────────────────────────────────────────────────────────┘
```

### Large Family (5 children)
```
┌─────────────────────────────────────────────────────────┐
│  Emma's Device    → Shows: Emma only                    │
│  Noah's Device    → Shows: Noah only                    │
│  Olivia's Device  → Shows: Olivia only                  │
│  Twins' Tablet    → Shows: Liam, Sophia only            │
│  Kitchen Tablet   → Shows: All 5 children               │
│  Playroom Tablet  → Shows: All 5 children               │
└─────────────────────────────────────────────────────────┘
```

## Technical Flow

### Backend Data Flow
```
┌──────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│  ┌────────────────────────────────────────────────┐          │
│  │  devices table                                 │          │
│  │  ─────────────────────────────────────────     │          │
│  │  id: "device-123"                              │          │
│  │  device_name: "Emma's iPad"                    │          │
│  │  allowed_children_ids: ["child-emma"]          │          │
│  │  tenant_id: "family-456"                       │          │
│  └────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                      BACKEND API                             │
│  GET /api/devices                                            │
│  ├─ Returns all devices with allowedChildrenIds              │
│  └─ Filters by tenant                                        │
│                                                              │
│  PATCH /api/devices/:id                                      │
│  ├─ Updates allowedChildrenIds for device                    │
│  └─ Validates tenant ownership                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                       FRONTEND                               │
│  App.tsx                                                     │
│  ├─ Fetches device config on load                            │
│  ├─ Gets current device's allowedChildrenIds                 │
│  ├─ Filters childrenList based on restrictions               │
│  └─ Passes filtered list to ChildSelector                    │
│                                                              │
│  ChildSelector.tsx                                           │
│  ├─ Receives filtered childrenList                           │
│  ├─ Displays only allowed children                           │
│  └─ User selects child → normal flow continues               │
└──────────────────────────────────────────────────────────────┘
```

## Configuration Matrix

```
┌─────────────────┬─────────────────┬──────────────────────────┐
│  Configuration  │   Array Value   │      Result              │
├─────────────────┼─────────────────┼──────────────────────────┤
│ All unchecked   │  []  (empty)    │  All children visible    │
│ Emma checked    │  ["emma"]       │  Only Emma visible       │
│ Emma + Noah     │  ["emma",       │  Only Emma & Noah        │
│                 │   "noah"]       │  visible                 │
│ All checked     │  ["emma",       │  All children visible    │
│                 │   "noah",       │  (same as unchecked)     │
│                 │   "olivia"]     │                          │
└─────────────────┴─────────────────┴──────────────────────────┘
```

## Key Concepts

### Default Behavior
```
NEW DEVICE LINKED
       ↓
   allowed_children_ids: []
       ↓
   ALL CHILDREN VISIBLE
   (Perfect for shared devices)
```

### Restricted Behavior
```
PARENT CONFIGURES
       ↓
   Checks specific children
       ↓
   allowed_children_ids: ["child-id-1", "child-id-2"]
       ↓
   ONLY THOSE CHILDREN VISIBLE
   (Perfect for personal devices)
```

## Security Model

```
┌──────────────────────────────────────────────────────────┐
│  AUTHENTICATION LAYERS                                    │
├──────────────────────────────────────────────────────────┤
│  1. Device linking (via 6-char code)                     │
│     └─ Tenant-based isolation                            │
│                                                           │
│  2. Device child restrictions (NEW)                      │
│     └─ Per-device child filtering                        │
│                                                           │
│  3. Parent Mode PIN                                      │
│     └─ Protects sensitive operations                     │
│                                                           │
│  4. Optional IP restrictions                             │
│     └─ Network-level access control                      │
└──────────────────────────────────────────────────────────┘
```

## Benefits Summary

```
╔════════════════════════════════════════════════════════════╗
║  FOR PARENTS                                               ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Full control over device access                        ║
║  ✅ Reduce sibling conflicts                               ║
║  ✅ Easy to configure per device                           ║
║  ✅ Flexible for different scenarios                       ║
║  ✅ Visual feedback on restrictions                        ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║  FOR CHILDREN                                              ║
╠════════════════════════════════════════════════════════════╣
║  ✅ See only their profile on personal devices             ║
║  ✅ Less confusion, simpler selection                      ║
║  ✅ Privacy from siblings                                  ║
║  ✅ Clear which device is theirs                           ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║  FOR FAMILIES                                              ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Personal + shared device flexibility                   ║
║  ✅ Works for any family size                              ║
║  ✅ No changes needed for existing shared devices          ║
║  ✅ Scales from 1 to many devices                          ║
╚════════════════════════════════════════════════════════════╝
```
