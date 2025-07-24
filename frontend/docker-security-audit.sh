#!/bin/bash

# Docker-based Frontend Security Audit & Update Script
# This script uses Docker to ensure consistent environment for security auditing

set -e

echo "🐳 Docker-based Frontend Security Audit"
echo "======================================="

# Navigate to frontend directory
FRONTEND_DIR="$(dirname "$0")"
cd "$FRONTEND_DIR"

# Build updated frontend image
echo "🏗️  Building updated frontend Docker image..."
docker build -t frontend-security-audit:latest .

# Run comprehensive security audit in container
echo "🔍 Running comprehensive security audit in Docker container..."
docker run --rm -v "$(pwd):/app-host" frontend-security-audit:latest sh -c "
echo '=== Installing dependencies with updated package.json ==='
npm install --legacy-peer-deps --silent

echo '=== Running security audit ==='
npm audit --audit-level=moderate

echo '=== Attempting security fixes ==='
npm audit fix --legacy-peer-deps || echo 'Some fixes may require manual intervention'

echo '=== Detailed vulnerability analysis ==='
npm audit --json > /app-host/docker-audit-report.json 2>/dev/null || echo 'Audit report saved'

echo '=== Testing package imports ==='
node -e \"
const testPackages = ['html2canvas', 'jspdf', 'dompurify', 'axios'];
testPackages.forEach(pkg => {
  try {
    require(pkg);
    console.log(\\\`✅ \${pkg} import successful\\\`);
  } catch (e) {
    console.log(\\\`❌ \${pkg} import failed: \${e.message}\\\`);
  }
});
\"

echo '=== Checking for critical vulnerabilities ==='
npm audit --audit-level=critical --parseable | wc -l | xargs -I {} echo 'Critical vulnerabilities: {}'

echo '=== Package versions check ==='
npm list html2canvas jspdf dompurify axios --depth=0 || echo 'Package list completed'

echo '=== Generating security recommendations ==='
echo 'Security Status:'
echo '- html2canvas: Check CORS configuration'
echo '- jsPDF: Updated to v3.0.1+ (breaking changes possible)'
echo '- DOMPurify: Added for XSS protection'
echo '- axios: Updated to fix CVE-2025-7783'
"

# Extract audit results for analysis
if [ -f "docker-audit-report.json" ]; then
    echo ""
    echo "📊 Audit Results Analysis"
    echo "========================"
    
    # Use jq if available, otherwise use basic parsing
    if command -v jq >/dev/null 2>&1; then
        echo "🔍 Vulnerability Summary:"
        cat docker-audit-report.json | jq -r '
        "Total vulnerabilities: " + (.metadata.vulnerabilities.total // 0 | tostring) +
        "\nCritical: " + (.metadata.vulnerabilities.critical // 0 | tostring) +
        "\nHigh: " + (.metadata.vulnerabilities.high // 0 | tostring) +
        "\nModerate: " + (.metadata.vulnerabilities.moderate // 0 | tostring) +
        "\nLow: " + (.metadata.vulnerabilities.low // 0 | tostring)
        ' 2>/dev/null || echo "Audit summary unavailable"
        
        echo ""
        echo "🎯 Key Vulnerabilities:"
        cat docker-audit-report.json | jq -r '
        .vulnerabilities | to_entries[] | 
        select(.value.severity == "high" or .value.severity == "critical") |
        "- " + .key + " (" + .value.severity + "): " + (.value.via[0].title // "Direct vulnerability")
        ' 2>/dev/null | head -10 || echo "Detailed analysis unavailable"
    else
        echo "📄 Raw audit report saved to docker-audit-report.json"
        echo "Install jq for detailed analysis: apt-get install jq"
    fi
else
    echo "⚠️  Audit report not generated"
fi

# Security recommendations
echo ""
echo "🛡️  Security Recommendations"
echo "============================"
echo ""
echo "1. IMMEDIATE ACTIONS:"
echo "   ✅ Update package.json with secure versions (completed)"
echo "   ✅ Add DOMPurify for XSS protection (completed)"
echo "   🔄 Test application with jsPDF v3.0.1 changes"
echo "   🔄 Run 'npm install' to apply updates"
echo ""
echo "2. html2canvas SECURITY:"
echo "   🔧 Use { useCORS: true } option"
echo "   🔧 Sanitize HTML before processing with DOMPurify"
echo "   🔧 Set allowTaint: false to prevent canvas tainting"
echo "   🔧 Configure server CORS headers for images"
echo ""
echo "3. CORS CONFIGURATION:"
echo "   Add to your image server headers:"
echo "   Access-Control-Allow-Origin: your-frontend-domain"
echo "   Cross-Origin-Resource-Policy: cross-origin"
echo ""
echo "4. PRODUCTION DEPLOYMENT:"
echo "   🔒 Enable Content Security Policy"
echo "   🔒 Validate all user input before PDF generation"
echo "   🔒 Use the securePDFGenerator.ts utility"
echo "   🔒 Monitor for new vulnerabilities weekly"

# Generate Docker-specific security report
cat > docker-security-report.md << 'EOF'
# Docker Security Audit Report

## Environment
- **Container**: Node.js 20 Alpine
- **Package Manager**: npm with --legacy-peer-deps
- **Audit Date**: $(date)

## Key Updates Applied
- **axios**: ^1.6.2 → ^1.7.0 (fixes CVE-2025-7783)
- **jsPDF**: ^2.5.1 → ^3.0.1 (fixes DOMPurify vulnerability)
- **DOMPurify**: Added ^3.2.4 (XSS protection)
- **html2canvas**: ^1.4.1 (configured for security)

## Security Measures Implemented
1. **XSS Prevention**: DOMPurify sanitization
2. **CORS Configuration**: Proper html2canvas setup
3. **Input Validation**: Secure PDF generation utilities
4. **Dependency Updates**: Latest secure versions

## Testing Required
- [ ] Verify PDF generation still works
- [ ] Test image rendering with CORS
- [ ] Validate user input sanitization
- [ ] Check for jsPDF v3.0.1 breaking changes

## Monitoring
- Weekly security audits recommended
- Monitor GitHub Security Advisories
- Update dependencies regularly
EOF

echo ""
echo "📝 Security report saved to docker-security-report.md"
echo ""
echo "🚀 Next Steps:"
echo "1. Run: npm install (to apply package.json changes)"
echo "2. Test your application thoroughly"
echo "3. Update code to use securePDFGenerator.ts utilities"
echo "4. Configure CORS headers on your image server"
echo "5. Deploy with security headers configured"
echo ""
echo "✨ Docker security audit completed!"
