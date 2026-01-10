# Export with Date Range Feature

## Overview

Added date range filtering to export functionality with default to current day.

## Features Added

### 1. Date Range Selector
- **Start Date** input field
- **End Date** input field
- **"วันนี้" (Today)** button to quickly reset to current day
- Date validation (start date cannot be after end date)

### 2. Default Behavior
- **Default**: Both dates set to today (current day)
- When page loads, date range is automatically set to today

### 3. Export Filtering
- Both CSV and XLSX exports now filter by selected date range
- Only donations within the selected date range are exported
- Alert shown if no donations found in selected date range

### 4. Smart Filename
- **Single day export**: `donations_2026-01-10.csv`
- **Date range export**: `donations_2026-01-01_to_2026-01-10.csv`

## Usage

### Export Today's Donations (Default)
1. Page loads with today's date already selected
2. Click "📊 Export CSV" or "📈 Export XLSX"
3. File downloads as `donations_2026-01-10.csv` (current date)

### Export Single Day
1. Click on Start Date input
2. Select desired date
3. Click on End Date input
4. Select the same date
5. Click export button

**OR use the "วันนี้" button** to quickly reset to today

### Export Date Range
1. Click on Start Date input
2. Select start date
3. Click on End Date input
4. Select end date
5. Click export button
6. File downloads as `donations_YYYY-MM-DD_to_YYYY-MM-DD.csv`

### Quick Actions
- **"วันนี้" button**: Instantly sets both dates to current day
- **Date validation**: End date cannot be before start date

## Code Changes

### Files Modified

1. **admin-panel/src/pages/DashboardPage.jsx**
   - Added state for startDate and endDate (default to today)
   - Added `getTodayDate()` helper function
   - Added `filterDonationsByDateRange()` function
   - Updated `exportToCSV()` to filter by date range
   - Updated `exportToXLSX()` to filter by date range
   - Added date range UI with inputs and "วันนี้" button
   - Smart filename generation based on date range

2. **admin-panel/src/pages/DashboardPage.css**
   - Added `.date-range-group` styles
   - Added `.date-inputs` styles
   - Added `.today-btn` styles
   - Styled date input fields with hover/focus states

## Technical Details

### Date Filtering Logic

```javascript
const filterDonationsByDateRange = () => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);  // Start of day
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);  // End of day

  return donations.filter(donation => {
    const donationDate = new Date(donation.created_at);
    return donationDate >= start && donationDate <= end;
  });
};
```

### Default Date Setup

```javascript
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];  // Returns YYYY-MM-DD
};

const [startDate, setStartDate] = useState(getTodayDate());
const [endDate, setEndDate] = useState(getTodayDate());
```

### Filename Generation

```javascript
const filename = startDate === endDate
  ? `donations_${startDate}.csv`
  : `donations_${startDate}_to_${endDate}.csv`;
```

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ Controls                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ กรองตามโปรเจกต์: [Dropdown ▼]                          │
│                                                         │
│ ช่วงวันที่ Export:                                      │
│ [2026-01-10] ถึง [2026-01-10]  [วันนี้]                │
│                                                         │
│                         [📊 Export CSV] [📈 Export XLSX]│
└─────────────────────────────────────────────────────────┘
```

## Benefits

1. **Easy to use**: Default to today, most common use case
2. **Flexible**: Can export any date range needed
3. **Quick access**: "วันนี้" button for instant reset
4. **Smart filenames**: Clear indication of date range in filename
5. **Validation**: Prevents invalid date ranges
6. **User feedback**: Alert when no data in selected range

## Examples

### Example 1: Export Today's Donations
- **Action**: Just click export (dates already set to today)
- **Result**: `donations_2026-01-10.csv` (all donations from today)

### Example 2: Export Last Week
- **Action**: Set start to 2026-01-03, end to 2026-01-10
- **Result**: `donations_2026-01-03_to_2026-01-10.csv`

### Example 3: Export Specific Day
- **Action**: Set both dates to 2026-01-05
- **Result**: `donations_2026-01-05.csv`

### Example 4: Export This Month
- **Action**: Set start to 2026-01-01, end to today
- **Result**: `donations_2026-01-01_to_2026-01-10.csv`

## Testing

### Test Cases

1. ✅ **Default behavior**: Dates set to today on page load
2. ✅ **Single day export**: Same start and end date
3. ✅ **Date range export**: Different start and end dates
4. ✅ **"วันนี้" button**: Resets to current day
5. ✅ **Empty result**: Alert shown when no donations found
6. ✅ **Filename format**: Correct format for single day vs range
7. ✅ **Date validation**: Cannot set end before start

### Manual Testing Steps

1. Access admin panel: https://donation.fastforwardssl.com/admin-panel
2. Login with admin credentials
3. Verify dates are set to today by default
4. Click "Export CSV" - should download today's donations
5. Change dates to a past date range
6. Click "Export XLSX" - should download that range
7. Click "วันนี้" button - should reset to today
8. Try exporting with no donations in range - should show alert

## Browser Compatibility

Date input type is supported in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (iOS/macOS)
- ✅ All modern browsers

## Future Enhancements

Possible improvements:
- Preset buttons (Yesterday, Last 7 days, Last 30 days)
- Calendar picker popup
- Remember last selected date range
- Export progress indicator for large ranges
- Scheduled exports
- Email delivery of exports

## Deployment

After updating:

```bash
# Rebuild admin panel
npm run build-admin-panel

# Restart server
npm run dev
```

Admin panel is now ready with date range export functionality!
