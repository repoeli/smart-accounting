#!/bin/bash

# Fix all report components to use proper reportRef

files=(
  "frontend/src/components/reports/reports/VendorAnalysisReport.jsx"
  "frontend/src/components/reports/reports/TaxDeductibleReport.jsx"
  "frontend/src/components/reports/reports/AuditLogReport.jsx"
)

for file in "${files[@]}"; do
  echo "Fixing $file..."
  
  # Add useRef import
  sed -i '1s/import React, { useState, useEffect }/import React, { useState, useEffect, useRef }/' "$file"
  
  # Fix reportRef prop
  sed -i 's/reportRef={null}/reportRef={reportRef}/' "$file"
  
  # Add reportRef declaration after component start
  componentName=$(basename "$file" .jsx)
  sed -i "s/const ${componentName} = ({ onBack }) => {/const ${componentName} = ({ onBack }) => {\n  const reportRef = useRef(null);/" "$file"
  
  # Add ref to main Box (first occurrence)
  sed -i '0,/<Box>/s/<Box>/<Box ref={reportRef}>/' "$file"
  
  echo "Fixed $file"
done

echo "All report components fixed!"
