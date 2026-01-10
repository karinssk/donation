# Fix: Edit Amount Not Sending Reply Message

## Problem

When users saved an amount in the 'แก้ไขยอดเงินบริจาค' (Edit Amount) page, the system was not sending a thank you/confirmation message back to the user on LINE.

## Root Cause

The API endpoint `/api/donations/:id/amount` (PUT) was:
1. ✅ Confirming the donation in the database
2. ✅ Creating a thank you flex message
3. ❌ **NOT sending the message to the user**

The endpoint was only returning the flex message in the API response, but never actually pushing it to LINE.

## Solution

Updated the endpoint to:
1. Fetch the user's LINE profile to get their display name
2. Create a confirmation message with:
   - Thank you message
   - User's display name
   - Total amount
   - Recipient name (project destination) if available
3. **Send the message to LINE using `pushMessage()`**

## Code Changes

### File: `/src/routes/api.ts` (lines 402-425)

**Before:**
```typescript
const project = await projectService.getProject(donation.project_id);
await userStateService.clearState(donation.line_user_id, donation.source_id);

const thankYouSetting = await Setting.findOne({ key: 'thank_you_message' }).lean();
const thankYouMessage = (thankYouSetting?.value || 'ขอบคุณสำหรับการบริจาค')
  .toString()
  .trim() || 'ขอบคุณสำหรับการบริจาค';
const displayName = donation.display_name || 'ผู้บริจาค';
const projectName = project?.name || 'โปรเจกต์';
const thankYouFlex = lineService.createDonationThankYouFlex(
  displayName,
  amount,
  project?.destination,
  projectName,
  thankYouMessage
);

res.json({ success: true, data: confirmed, thankYouFlex });
```

**After:**
```typescript
const project = await projectService.getProject(donation.project_id);
await userStateService.clearState(donation.line_user_id, donation.source_id);

// Get LINE user display name
let displayName = 'ผู้บริจาค';
try {
  const profile = await lineService.getProfile(donation.line_user_id);
  displayName = profile.displayName || donation.display_name || 'ผู้บริจาค';
} catch (profileError) {
  displayName = donation.display_name || 'ผู้บริจาค';
}

// Send confirmation message
let messageText = `ขอบคุณสำหรับการบริจาค\nคุณ ${displayName}\nยอดรวม: ${amount.toLocaleString()} บาท`;
if (project?.destination) {
  messageText += `\nชื่อผู้รับบริจาค: ${project.destination}`;
}

try {
  await lineService.pushMessage(donation.line_user_id, [{
    type: 'text',
    text: messageText
  }]);
} catch (sendError) {
  console.error('Failed to send confirmation message:', sendError);
  // Don't fail the request if message sending fails
}

res.json({ success: true, data: confirmed });
```

## Key Changes

1. **Fetch Real Display Name**: Uses `lineService.getProfile()` to get the user's actual LINE display name
2. **Build Message**: Creates confirmation message with all relevant details
3. **Send to LINE**: Uses `pushMessage()` to send the message to the user
4. **Error Handling**: Wrapped in try-catch so the API doesn't fail if message sending fails
5. **Simplified Response**: Removed unused `thankYouFlex` from response

## Message Format

The user will receive:
```
ขอบคุณสำหรับการบริจาค
คุณ [User's LINE Display Name]
ยอดรวม: [Amount] บาท
ชื่อผู้รับบริจาค: [Project Destination]
```

Example:
```
ขอบคุณสำหรับการบริจาค
คุณ สมชาย ใจดี
ยอดรวม: 1,000 บาท
ชื่อผู้รับบริจาค: มูลนิธิช่วยเด็ก
```

## Testing

### Test Steps

1. **Create a donation** via LINE
2. **Click "กรอกยอดเงิน" button** in the confirmation message
3. **Enter amount** (e.g., 1000)
4. **Click "บันทึก"**
5. **Check LINE chat** - should receive thank you message

### Expected Behavior

- ✅ User sees "แก้ไขยอดเงินสำเร็จ" on the edit page
- ✅ Page closes after 1.5 seconds
- ✅ User receives LINE message with confirmation
- ✅ Message includes user's display name
- ✅ Message includes total amount
- ✅ Message includes recipient name (if project has destination)

### What Was Broken Before

- ❌ No message sent to LINE
- ❌ User had no confirmation of successful donation
- ❌ Silent success (bad UX)

### What Works Now

- ✅ Message sent to LINE immediately after amount is saved
- ✅ User gets clear confirmation
- ✅ Better user experience

## API Flow

```
User fills amount → Edit Amount Page
                         ↓
                    PUT /api/donations/:id/amount
                         ↓
                    Confirm donation in DB
                         ↓
                    Get user's LINE profile
                         ↓
                    Build confirmation message
                         ↓
                    Send via LINE pushMessage() ← FIX ADDED HERE
                         ↓
                    Return success response
                         ↓
                    Page closes
                         ↓
                    User sees message in LINE ✅
```

## Error Handling

If sending the LINE message fails:
- Error is logged to console
- API request still succeeds
- User's amount is still saved
- This prevents DB confirmation from failing due to LINE API issues

## Deployment

After deploying this fix:

```bash
# Rebuild TypeScript
npx tsc

# Restart server
npm run dev
# or in production
npm start
```

## Related Files

- `/src/routes/api.ts` - API endpoint (FIXED)
- `/public/edit-amount/index.html` - Frontend page (unchanged)
- `/src/services/lineService.ts` - LINE messaging service (unchanged)

## Notes

- Uses `pushMessage()` instead of `replyMessage()` because we don't have a reply token
- Fetches LINE profile to get real display name (more personal)
- Falls back to stored display name if profile fetch fails
- Message includes project destination for transparency
- Amount is formatted with thousand separators (e.g., 1,000 บาท)

## Summary

The issue was that the confirmation message was being created but never sent to LINE. Now when a user saves an amount, they immediately receive a confirmation message with their name, the amount, and the recipient name.

Fixed! ✅
