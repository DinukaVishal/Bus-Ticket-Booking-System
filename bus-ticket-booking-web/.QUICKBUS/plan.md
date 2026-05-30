
# A/C Bus Types System Plan - Sri Lankan Bus Configuration

## Overview
This plan updates the bus booking system to support three distinct Sri Lankan A/C bus types with accurate seat layouts matching real-world configurations:

1. **Rosa/Coaster (Small Type)** - 26 seats, 2x2 layout
2. **Luxury A/C (Standard)** - 45 seats, 2x2 layout with 5-seat back row  
3. **Super Long (Long Chassis)** - 54 seats, 2x2 layout with 6-seat back row

## Visual Reference (Based on User's Image)

```text
Rosa/Coaster (26)     Luxury A/C (45)        Super Long (54)
+----------------+    +----------------+     +----------------+
| DOOR    DRVR   |    | DOOR    DRVR   |     | DOOR    DRVR   |
+----------------+    +----------------+     +----------------+
| 1  2    3  4   |    | 1  2    3  4   |     | 1  2    3  4   |
| 5  6    7  8   |    | 5  6    7  8   |     | 5  6    7  8   |
| 9  10   11 12  |    | 9  10   11 12  |     | 9  10   11 12  |
| 13 14   15 16  |    | 13 14   15 16  |     | 13 14   15 16  |
| 17 18   19 20  |    | 17 18   19 20  |     | 17 18   19 20  |
| 22 23 24 25 26 |    | 21 22   23 24  |     | 21 22   23 24  |
+----------------+    | 25 26   27 28  |     | 25 26   27 28  |
   Small Type         | 29 30   31 32  |     | 29 30   31 32  |
                      | 33 34   35 36  |     | 33 34   35 36  |
                      | 37 38   39 40  |     | 37 38   39 40  |
                      |41 42 43 44 45  |     | 41 42   43 44  |
                      +----------------+     | 45 46   47 48  |
                         Standard A/C        |49 50 51 52 53 54|
                                            +----------------+
                                               Long Chassis
```

## Changes Summary

### 1. Database Schema Update
- Modify `bus_type` column to support new values: `rosa`, `luxury_ac`, `super_long`, `normal`

### 2. Type Definitions Update
- Update `BusType` to include all four bus types
- Add bus type configuration interface for seat layout details

### 3. Seat Layout Component Overhaul
- Complete rewrite of `SeatLayout.tsx` to handle three A/C bus configurations
- Each type has its own rendering logic based on the reference image
- Window seat indicators for positions 1 and 4 (left window, right window)
- Back row handling for each type

### 4. Admin Panel Updates
- Update bus type selector with all four options
- Auto-populate correct seat counts for each type
- Display appropriate icons and labels

### 5. Route Card Component Updates
- Update to display new bus type labels correctly

---

## Technical Details

### Phase 1: Database Migration

Update the `bus_type` column to accept new values:
- `rosa` - Rosa/Coaster (26 seats)
- `luxury_ac` - Luxury A/C (45 seats)  
- `super_long` - Super Long (54 seats)
- `normal` - Normal Non-A/C (54 seats, 2+3 layout - existing)

### Phase 2: Type System Updates

**File: `src/types/booking.ts`**

```typescript
export type BusType = 'rosa' | 'luxury_ac' | 'super_long' | 'normal';

export interface BusTypeConfig {
  type: BusType;
  name: string;
  sinhalaName: string;
  defaultSeats: number;
  layout: '2x2' | '2x3';
  isAC: boolean;
  backRowSeats: number;
}

export const BUS_TYPE_CONFIGS: Record<BusType, BusTypeConfig> = {
  rosa: {
    type: 'rosa',
    name: 'Rosa / Coaster',
    sinhalaName: 'රෝසා / කෝස්ටර්',
    defaultSeats: 26,
    layout: '2x2',
    isAC: true,
    backRowSeats: 5,
  },
  luxury_ac: {
    type: 'luxury_ac', 
    name: 'Luxury A/C',
    sinhalaName: 'ලක්ෂරි ඒසී',
    defaultSeats: 45,
    layout: '2x2',
    isAC: true,
    backRowSeats: 5,
  },
  super_long: {
    type: 'super_long',
    name: 'Super Long',
    sinhalaName: 'සුපර් ලෝන්ග්',
    defaultSeats: 54,
    layout: '2x2',
    isAC: true,
    backRowSeats: 6,
  },
  normal: {
    type: 'normal',
    name: 'Normal Bus',
    sinhalaName: 'සාමාන්‍ය බස්',
    defaultSeats: 54,
    layout: '2x3',
    isAC: false,
    backRowSeats: 6,
  },
};
```

### Phase 3: Seat Layout Component

**File: `src/components/booking/SeatLayout.tsx`**

The seat layout will be completely rewritten with:

1. **Type-specific row calculation**
   - Rosa: 6 rows (5 regular + 1 back row with 5 seats)
   - Luxury A/C: 11 rows (10 regular + 1 back row with 5 seats)
   - Super Long: 13 rows (12 regular + 1 back row with 6 seats)

2. **Dynamic seat rendering**
   - Regular rows: 2 left + aisle + 2 right
   - Back row: 5 or 6 seats spanning full width

3. **Visual indicators**
   - A/C badge with Snowflake icon
   - Window seat markers
   - Door and driver positions

4. **Bus type display**
   - Show both English and Sinhala names
   - Color-coded badges for each type

### Phase 4: Admin Panel Updates

**File: `src/pages/Admin.tsx`**

Update the Add Route dialog:
- Replace simple A/C/Normal selector with four bus type options
- Auto-set `totalSeats` based on selected type
- Show seat count as editable for flexibility

**File: `src/components/admin/RouteCard.tsx`**

Update the Edit Route dialog:
- Same bus type selector with four options
- Update badge display for all bus types

### Phase 5: Hooks Update

**File: `src/hooks/useRoutes.ts`**

Update type casting to handle new `BusType` values correctly.

---

## Migration Strategy

1. **Backward Compatibility**: Existing routes with `bus_type = 'ac'` will be treated as `luxury_ac`
2. **No Data Loss**: The migration adds new enum values without removing existing ones
3. **Default Values**: New routes default to `normal` bus type

---

## Files to Modify

| File | Action |
|------|--------|
| `src/types/booking.ts` | Add new bus types and configurations |
| `src/components/booking/SeatLayout.tsx` | Complete rewrite for multi-type support |
| `src/pages/Admin.tsx` | Update bus type selector (Add Route) |
| `src/components/admin/RouteCard.tsx` | Update bus type selector (Edit Route) |
| `src/hooks/useRoutes.ts` | Update type handling for new bus types |
| Database Migration | Add new bus_type enum values |

---

## User Experience

After implementation:
- Admin can select from 4 bus types when adding/editing routes
- Each type auto-fills correct seat count
- Booking page shows accurate seat layout for the selected route's bus type
- Visual distinction between A/C and non-A/C buses
- Window seats clearly marked for customer preference
