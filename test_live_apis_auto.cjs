const http = require('http');
const https = require('https');

function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    
    const headers = options.headers || {};
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(urlStr, { ...options, headers, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout connecting to ${urlStr}`));
    });

    if (body) req.write(body);
    req.end();
  });
}

async function runAutomaticTests() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE AUTOMATED API TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const posId = '35935c74d14d449a9dbbdf301a641ee4';
  let rmsBaseUrl = 'https://rms.billmex.com/bhojrms/';
  let customerId = '';
  let authKey = '';
  let sampleItem = null;

  // Test 1: POS Data
  try {
    process.stdout.write('[TEST 1] Testing POS Data API... ');
    const res = await request(`http://billmex.in:8080/bhojmain/app/pos/posData/${posId}`);
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.posName) {
      rmsBaseUrl = res.data.response.publicUrl || rmsBaseUrl;
      console.log(`✅ PASSED (Outlet: "${res.data.response.posName}", Server: "${rmsBaseUrl}")`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 2: Customer Simreg (Registration)
  try {
    process.stdout.write('[TEST 2] Testing Customer Registration (Simreg) API... ');
    const payload = JSON.stringify({ fullName: 'Vishnu Automation', mobileNumber: '9669660675' });
    const res = await request('http://billmex.in:8080/bhojmain/app/customer/simreg/', { method: 'POST' }, payload);
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.id) {
      customerId = res.data.response.id;
      authKey = res.data.response.authkey;
      console.log(`✅ PASSED (CustomerID: ${customerId})`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 3: Customer Info by ID
  try {
    process.stdout.write('[TEST 3] Testing Customer Info API... ');
    const res = await request(`http://billmex.in:8080/bhojmain/app/customer/getCustomerInfoById/${customerId}`, {
      headers: { 'cAuthKey': authKey }
    });
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.mobileNumber === '9669660675') {
      console.log(`✅ PASSED (Name: ${res.data.response.fullName}, Email: ${res.data.response.email})`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 4: Live Item Master (Menu)
  try {
    process.stdout.write('[TEST 4] Testing Live Menu (Item Master) API on RMS... ');
    const res = await request(`${rmsBaseUrl}bhoj/itemMaster/${posId}`, {
      headers: { 'customerId': customerId, 'cAuthKey': authKey }
    });
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.categoryBeans?.length) {
      const catCount = res.data.response.categoryBeans.length;
      sampleItem = res.data.response.categoryBeans[0].subCategoryBeans[0].bhojItemMasterBeans[0];
      console.log(`✅ PASSED (${catCount} categories loaded, Sample dish: "${sampleItem.name}", Price: ₹${sampleItem.itemBeanList[0].price})`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 5: Live Bill Preview
  try {
    process.stdout.write('[TEST 5] Testing Real-Time Bill Preview API on RMS... ');
    const payload = JSON.stringify({
      posId: posId,
      customerId: customerId,
      orderRemark: '',
      paymentType: 'COD',
      transectionId: '',
      paymentId: '',
      orderTypeId: '01bd7374084811e6a93cc81f66433dc4',
      deliveryAddress: 'indore',
      orderDetailsBeanList: [{
        itemId: sampleItem ? sampleItem.itemBeanList[0].id : 'e1cb3bf9bc0b4b49a97fe8e0b5230c15',
        itemMasterId: sampleItem ? sampleItem.id : '10a44d4601fc4863899d25cb24ab9e1b',
        quantity: 2,
        splitValue: 1,
        baseTasteLevelId: [],
        addonList: []
      }]
    });
    const res = await request(`${rmsBaseUrl}bhoj/order/previewBill`, { method: 'POST', headers: { 'cAuthKey': authKey } }, payload);
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.billDetailsBeanList) {
      const bill = res.data.response.billDetailsBeanList;
      console.log(`✅ PASSED (Subtotal: ₹${bill['Sub Total']}, Total: ₹${bill['Grand Total']}, Discount: ₹${bill['Total Discount']})`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 6: Customer Notifications
  try {
    process.stdout.write('[TEST 6] Testing Customer Notification API... ');
    const res = await request('http://billmex.in:8080/bhojmain/custnotification?page=1', {
      headers: { 'cAuthKey': authKey }
    });
    if (res.status === 200 && res.data.status === 'success' && Array.isArray(res.data.response?.notificationList)) {
      console.log(`✅ PASSED (${res.data.response.notificationList.length} notifications loaded)`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 7: Real Order Status / Tracking by ID
  try {
    process.stdout.write('[TEST 7] Testing Order Details & Tracking API on RMS... ');
    const orderId = '96a588572e0647668f5edbfa4b8a60bc';
    const res = await request(`${rmsBaseUrl}bhoj/order/${orderId}`, {
      headers: { 'cAuthKey': authKey }
    });
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.id === orderId) {
      console.log(`✅ PASSED (Order Status: "${res.data.response.orderStatus}", Total: ₹${res.data.response.grandTotal})`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  // Test 8: Live Place Order API on RMS
  try {
    process.stdout.write('[TEST 8] Testing Live Order Placement (placeOrder) API on RMS... ');
    const placePayload = JSON.stringify({
      posId: posId,
      customerId: customerId,
      orderRemark: 'Automated test suite verification',
      paymentType: 'COD',
      transectionId: '',
      paymentId: '',
      no: 1,
      type: 'TABLE',
      paidAmount: 30,
      orderTypeId: '01bd7374084811e6a93cc81f66433dc4',
      deliveryAddress: 'indore',
      orderDetailsBeanList: [{
        itemId: sampleItem ? sampleItem.itemBeanList[0].id : 'e1cb3bf9bc0b4b49a97fe8e0b5230c15',
        itemMasterId: sampleItem ? sampleItem.id : '10a44d4601fc4863899d25cb24ab9e1b',
        quantity: 1,
        splitValue: 1,
        baseTasteLevelId: [],
        addonList: []
      }]
    });
    const res = await request(`${rmsBaseUrl}bhoj/order/placeOrder`, {
      method: 'POST',
      headers: { 'cAuthKey': authKey }
    }, placePayload);
    if (res.status === 200 && res.data.status === 'success' && res.data.response?.id) {
      console.log(`✅ PASSED (Created Live Order ID: ${res.data.response.id}, Token: #${res.data.response.parcel_no || res.data.response.parcelNo || 0})`);
      passed++;
    } else {
      throw new Error(JSON.stringify(res.data));
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 AUTOMATION SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runAutomaticTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
