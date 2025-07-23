# Categorized Receipts Widget - Integration Guide

## Overview

The `CategorizedReceiptsWidget` is a self-contained, plug-and-play React component that provides comprehensive receipt management capabilities for your dashboard. It features real-time updates, category filtering, manual editing, and subscription-based access control.

## Features

### ✅ Core Functionality
- **Real-time Updates**: Configurable auto-refresh (default: 5 seconds)
- **Category Filtering**: Income vs Expense categorization with advanced filters
- **Manual Editing**: In-place editing with form validation
- **Search & Sort**: Text search, date ranges, category filtering
- **Export**: CSV export with filtered data
- **Responsive Design**: Mobile-friendly with accessibility features

### ✅ Subscription-Based Access Control
- **Basic Tier**: View-only access, limited to 50 receipts
- **Premium Tier**: Edit and filter capabilities, up to 1000 receipts
- **Enterprise Tier**: Full features including bulk operations and analytics

### ✅ Real-time & Performance
- **Independent Updates**: Uses polling mechanism (5-10 second intervals)
- **Background Refresh**: Updates without affecting other components
- **Optimized Rendering**: Skeleton loading and error boundaries
- **Memory Efficient**: Proper cleanup of intervals and listeners

## Installation & Setup

### 1. Install Dependencies
```bash
# Core dependencies should already be installed
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### 2. Import Components
```javascript
import CategorizedReceiptsWidget from '../components/dashboard/CategorizedReceiptsWidget';
```

### 3. Basic Usage
```javascript
function Dashboard() {
  return (
    <div>
      {/* Basic widget - shows all receipts */}
      <CategorizedReceiptsWidget />
      
      {/* Income-only widget */}
      <CategorizedReceiptsWidget
        title="Income Receipts"
        receiptType="income"
        compact={true}
      />
      
      {/* Expense-only widget */}
      <CategorizedReceiptsWidget
        title="Expense Receipts"
        receiptType="expense"
        compact={true}
      />
    </div>
  );
}
```

## Configuration Options

### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | "Categorized Receipts" | Widget title |
| `receiptType` | string | null | Filter by type: 'income', 'expense', or null for both |
| `autoRefresh` | boolean | true | Enable automatic updates |
| `refreshInterval` | number | 5000 | Update interval in milliseconds |
| `compact` | boolean | false | Compact layout mode |
| `maxHeight` | number | 600 | Maximum widget height in pixels |
| `showSummary` | boolean | true | Show summary cards with totals |
| `showFilters` | boolean | true | Show filtering controls |
| `showExport` | boolean | true | Show export button |
| `showAddButton` | boolean | true | Show add receipt button |
| `userTier` | string | 'basic' | Subscription tier: 'basic', 'premium', 'enterprise' |
| `canEdit` | boolean | true | Allow receipt editing |
| `canFilter` | boolean | true | Allow filtering (overridden by userTier) |
| `canExport` | boolean | true | Allow export (overridden by userTier) |
| `initialFilters` | object | {} | Initial filter values |
| `gridCols` | object | {xs:1, sm:2, md:3, lg:4} | Grid breakpoints |
| `onReceiptClick` | function | null | Callback for receipt clicks |
| `onReceiptUpdate` | function | null | Callback for receipt updates |
| `onExport` | function | null | Custom export handler |

### Example Configurations

#### 1. Compact Dashboard Widgets (Side-by-side)
```javascript
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
  <CategorizedReceiptsWidget
    title="Recent Income"
    receiptType="income"
    compact={true}
    maxHeight={400}
    showSummary={false}
    showFilters={false}
    gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
  />
  
  <CategorizedReceiptsWidget
    title="Recent Expenses"
    receiptType="expense"
    compact={true}
    maxHeight={400}
    showSummary={false}
    showFilters={false}
    gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
  />
</div>
```

#### 2. Full-Featured Management Widget
```javascript
<CategorizedReceiptsWidget
  title="Receipt Management Center"
  receiptType={null} // Show both income and expense
  autoRefresh={true}
  refreshInterval={5000}
  compact={false}
  maxHeight={800}
  showSummary={true}
  showFilters={true}
  showExport={true}
  userTier="enterprise"
  onReceiptUpdate={(id, data) => console.log('Updated:', id, data)}
  onExport={(receipts, filters) => console.log('Export:', receipts.length)}
  initialFilters={{
    category: 'Office Supplies',
    dateFrom: '2025-01-01'
  }}
/>
```

#### 3. Subscription-Aware Widgets
```javascript
function getWidgetProps(userSubscription) {
  switch (userSubscription) {
    case 'enterprise':
      return {
        userTier: 'enterprise',
        canEdit: true,
        canFilter: true,
        canExport: true,
        showFilters: true,
        showExport: true
      };
    case 'premium':
      return {
        userTier: 'premium',
        canEdit: true,
        canFilter: true,
        canExport: true,
        showFilters: true,
        showExport: false // Hide export for premium
      };
    default:
      return {
        userTier: 'basic',
        canEdit: false,
        canFilter: false,
        canExport: false,
        showFilters: false,
        showExport: false
      };
  }
}

// Usage
<CategorizedReceiptsWidget
  {...getWidgetProps(user.subscription)}
  title="My Receipts"
/>
```

## Real-time Updates

### How It Works
1. **Polling Mechanism**: Uses `useInterval` hook for background updates
2. **Independent State**: Widget maintains its own data state
3. **Silent Refresh**: Updates data without showing loading spinners
4. **Error Handling**: Retries failed requests automatically

### Configuration
```javascript
<CategorizedReceiptsWidget
  autoRefresh={true}           // Enable auto-refresh
  refreshInterval={10000}      // Update every 10 seconds
  onReceiptUpdate={(id, data) => {
    // Handle receipt updates
    console.log('Receipt updated:', id, data);
    // Optionally trigger other dashboard updates
  }}
/>
```

### Manual Refresh
Users can manually refresh by clicking the refresh button, which will:
- Show a loading indicator
- Fetch fresh data
- Display success/error message

## Filtering & Search

### Available Filters
- **Text Search**: Search across merchant names and receipt content
- **Category**: Predefined categories (Food & Dining, Transportation, etc.)
- **Receipt Type**: Income vs Expense
- **Business Type**: Business vs Personal
- **Date Range**: From/To date selection

### Custom Filter Logic
```javascript
// Set initial filters
const initialFilters = {
  category: 'Food & Dining',
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31',
  receiptType: 'expense',
  businessType: 'business'
};

<CategorizedReceiptsWidget
  initialFilters={initialFilters}
  onFiltersChange={(newFilters) => {
    console.log('Filters changed:', newFilters);
  }}
/>
```

## Editing & Manual Correction

### Edit Capabilities
- **Merchant Name**: Text field editing
- **Amount**: Numeric input with currency formatting
- **Category**: Dropdown with predefined options
- **Receipt Type**: Income vs Expense toggle
- **Business Type**: Business vs Personal toggle
- **Date**: Date picker
- **Notes**: Multi-line text area

### Quick Actions
- **Category Assignment**: Right-click menu for quick categorization
- **Business Type Toggle**: One-click business/personal marking
- **Bulk Operations**: (Enterprise tier only)

## Performance & Best Practices

### 1. Memory Management
```javascript
// Widget automatically handles cleanup
useEffect(() => {
  return () => {
    // Cleanup intervals, listeners, etc.
  };
}, []);
```

### 2. Optimization Tips
- Use `compact={true}` for smaller widgets
- Limit `maxHeight` for better performance
- Set appropriate `refreshInterval` (not too frequent)
- Use `gridCols` to control responsive layout

### 3. Error Handling
- Built-in retry mechanisms
- User-friendly error messages
- Graceful degradation for network issues

## Integration Examples

### 1. Dashboard Integration
```javascript
// src/pages/dashboard/DashboardPage.js
import CategorizedReceiptsWidget from '../../components/dashboard/CategorizedReceiptsWidget';

function DashboardPage() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      {/* Other dashboard content */}
      
      {/* Categorized Receipts */}
      <CategorizedReceiptsWidget
        title="Receipt Overview"
        userTier={user.subscription_tier}
        onReceiptUpdate={handleReceiptUpdate}
        onExport={handleExport}
      />
    </div>
  );
}
```

### 2. Standalone Page
```javascript
// src/pages/receipts/CategorizedReceiptsPage.js
function CategorizedReceiptsPage() {
  return (
    <div className="container mx-auto p-4">
      <CategorizedReceiptsWidget
        title="All Receipts"
        compact={false}
        maxHeight={null} // No height limit
        userTier="enterprise"
        gridCols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
      />
    </div>
  );
}
```

### 3. Modal Integration
```javascript
function ReceiptModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent>
        <CategorizedReceiptsWidget
          title="Select Receipt"
          compact={true}
          maxHeight={500}
          showAddButton={false}
          onReceiptClick={(receipt) => {
            onReceiptSelected(receipt);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Security & Access Control

### 1. Token Authentication
- Automatically uses existing token from auth context
- Handles token refresh automatically
- Respects user permissions

### 2. Subscription Enforcement
```javascript
// Backend API should also enforce these limits
const getFeatureAvailability = (userTier) => {
  switch (userTier) {
    case 'enterprise':
      return { canEdit: true, canFilter: true, canExport: true, maxReceipts: null };
    case 'premium':
      return { canEdit: true, canFilter: true, canExport: true, maxReceipts: 1000 };
    case 'basic':
    default:
      return { canEdit: false, canFilter: false, canExport: false, maxReceipts: 50 };
  }
};
```

## Troubleshooting

### Common Issues

1. **Widget not updating**
   - Check `autoRefresh` is enabled
   - Verify API endpoints are responding
   - Check browser console for errors

2. **Permission denied errors**
   - Verify `userTier` prop matches user's subscription
   - Check backend permissions
   - Ensure tokens are valid

3. **Performance issues**
   - Reduce `refreshInterval`
   - Enable `compact` mode
   - Limit `maxHeight`

### Debug Mode
```javascript
<CategorizedReceiptsWidget
  onError={(error) => console.error('Widget error:', error)}
  onDataUpdate={(data) => console.log('Data updated:', data)}
/>
```

## Future Enhancements

### Planned Features
- **WebSocket Support**: Real-time updates without polling
- **Bulk Operations**: Multi-select and batch editing
- **Advanced Analytics**: Charts and reporting
- **Custom Categories**: User-defined category management
- **Mobile App Integration**: React Native compatibility

## Support

For issues, feature requests, or integration help:
1. Check the troubleshooting section above
2. Review browser console logs
3. Verify API endpoint responses
4. Contact development team with specific error messages

---

**Version**: 1.0.0  
**Last Updated**: July 21, 2025  
**Compatibility**: React 18+, Material-UI 5+
