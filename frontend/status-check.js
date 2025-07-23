#!/usr/bin/env node

/**
 * System Status Check
 * Comprehensive check of backend and frontend status
 */

const http = require('http');
const https = require('https');

console.log('🔍 Smart Accounting System Status Check\n');

// Check backend health
function checkBackend() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/health/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Backend: Running (Port 8000)');
          console.log(`   Response: ${data.substring(0, 100)}...`);
        } else {
          console.log(`⚠️  Backend: Responded with status ${res.statusCode}`);
        }
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log('❌ Backend: Not accessible');
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Backend: Timeout after 5 seconds');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Check database connection
function checkDatabase() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1/accounts/health/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Database: Connected');
      } else {
        console.log(`⚠️  Database: Issue detected (Status: ${res.statusCode})`);
      }
      resolve(true);
    });

    req.on('error', () => {
      console.log('❌ Database: Cannot verify connection');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Database: Health check timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Check authentication endpoint
function checkAuth() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: 'superuser@test.com',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1/accounts/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.tokens) {
            console.log('✅ Authentication: Working');
            console.log('   Tokens: Access and Refresh tokens generated');
          } else {
            console.log('⚠️  Authentication: Unexpected response format');
          }
        } else {
          console.log(`❌ Authentication: Failed (Status: ${res.statusCode})`);
          console.log(`   Response: ${data}`);
        }
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log('❌ Authentication: Request failed');
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Authentication: Timeout');
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Check frontend build
function checkFrontendBuild() {
  const fs = require('fs');
  const path = require('path');
  
  const buildPath = path.join(__dirname, 'build');
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
    console.log('✅ Frontend: Build exists');
    
    // Check build size
    const stats = fs.statSync(indexPath);
    console.log(`   Index.html: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Check for main assets
    const staticPath = path.join(buildPath, 'static');
    if (fs.existsSync(staticPath)) {
      const jsFiles = fs.readdirSync(path.join(staticPath, 'js')).filter(f => f.endsWith('.js'));
      const cssFiles = fs.readdirSync(path.join(staticPath, 'css')).filter(f => f.endsWith('.css'));
      console.log(`   Assets: ${jsFiles.length} JS files, ${cssFiles.length} CSS files`);
    }
  } else {
    console.log('❌ Frontend: Build not found');
    console.log('   Run "npm run build" to create production build');
  }
}

// Check enhanced components
function checkEnhancedComponents() {
  const fs = require('fs');
  const path = require('path');
  
  const componentsPath = path.join(__dirname, 'src', 'components', 'receipts');
  const requiredComponents = [
    'EnhancedReceiptUpload.jsx',
    'EnhancedReceiptDetails.jsx',
    'EnhancedReceiptList.jsx'
  ];
  
  let foundComponents = 0;
  
  requiredComponents.forEach(component => {
    const componentPath = path.join(componentsPath, component);
    if (fs.existsSync(componentPath)) {
      foundComponents++;
    }
  });
  
  if (foundComponents === requiredComponents.length) {
    console.log('✅ Enhanced Components: All present');
    console.log(`   Found: ${foundComponents}/${requiredComponents.length} components`);
  } else {
    console.log(`⚠️  Enhanced Components: ${foundComponents}/${requiredComponents.length} found`);
  }
}

async function runStatusCheck() {
  console.log('Backend Services:');
  await checkBackend();
  await checkDatabase();
  await checkAuth();
  
  console.log('\nFrontend Status:');
  checkFrontendBuild();
  checkEnhancedComponents();
  
  console.log('\n📋 Status Check Complete!');
  console.log('\nNext Steps:');
  console.log('1. If backend issues: Check docker-compose logs backend');
  console.log('2. If frontend issues: Run npm run build');
  console.log('3. If auth issues: Verify user credentials in Django admin');
  console.log('4. Test login at: http://localhost:3000/login');
  console.log('   - Email: superuser@test.com');
  console.log('   - Password: admin123');
}

runStatusCheck().catch(console.error);
