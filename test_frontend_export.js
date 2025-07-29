/**
 * Test script to debug ExportButtons data handling
 */

// Mock data matching backend structure
const mockIncomeExpenseData = {
  "success": true,
  "data": [
    {
      "period": "2023-09",
      "year": 2023,
      "month": 9,
      "income": 0.0,
      "expenses": 651.75,
      "net_balance": -651.75,
      "growth_rate": 0.0,
      "transaction_count": 3
    },
    {
      "period": "2023-10", 
      "year": 2023,
      "month": 10,
      "income": 0.0,
      "expenses": 12.50,
      "net_balance": -12.50,
      "growth_rate": 0.0,
      "transaction_count": 1
    }
  ],
  "summary": {
    "total_income": 0.0,
    "total_expenses": 664.25,
    "net_balance": -664.25,
    "total_count": 4
  }
};

// Extract ExportButtons CSV formatting logic
const formatDataForCSV = (data) => {
  if (!data) return [];
  
  const formatNumber = (value, defaultValue = 0) => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0%' : `${num}%`;
  };

  const safeString = (value, defaultValue = 'N/A') => {
    return value != null && value !== '' ? String(value) : defaultValue;
  };
  
  // Income-expense formatting
  return (data.data && Array.isArray(data.data) ? data.data : []).map(item => ({
    Period: safeString(item?.period),
    Year: safeString(item?.year),
    Month: safeString(item?.month),
    Income: formatNumber(item?.income),
    Expenses: formatNumber(item?.expenses),
    'Net Balance': formatNumber(item?.net_balance),
    'Growth Rate': formatPercentage(item?.growth_rate),
    'Transaction Count': formatNumber(item?.transaction_count)
  }));
};

// Test the formatting
console.log('🔍 Testing ExportButtons CSV formatting');
console.log('===========================================');

console.log('📊 Mock data structure:');
console.log(JSON.stringify(mockIncomeExpenseData, null, 2));

console.log('\n🔄 Formatted CSV data:');
const csvData = formatDataForCSV(mockIncomeExpenseData);
console.log(csvData);

console.log(`\n✅ CSV rows generated: ${csvData.length}`);
console.log(`📝 Will CSV export work? ${csvData.length > 0 ? 'YES' : 'NO'}`);

if (csvData.length === 0) {
  console.log('\n❌ Export would fail with "No data available for export"');
} else {
  console.log('\n✅ Export would succeed');
}
