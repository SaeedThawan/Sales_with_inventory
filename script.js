const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw2Qm1ErufxKqBZbLmQ3FKCI4wEUkqET0dGSzLjY3Se7p_wnkFzuMEBTpMSdPp1aKox/exec'; // تأكد أن هذا الرابط هو الصحيح لتطبيق الويب الخاص بك

// تعريف المتغيرات لتخزين البيانات المحملة
let productsData = [];
let inventoryProductsData = []; // بيانات منتجات الجرد
let salesRepresentatives = [];
let customersMain = [];
let visitOutcomes = [];
let visitPurposes = [];
let visitTypes = [];

// الحصول على عناصر DOM الأساسية
const visitForm = document.getElementById('visitForm');
const salesRepNameSelect = document.getElementById('salesRepName');
const customerNameInput = document.getElementById('customerName');
const customerListDatalist = document.getElementById('customerList');
const visitTypeSelect = document.getElementById('visitType');
const visitPurposeSelect = document.getElementById('visitPurpose');
const visitOutcomeSelect = document.getElementById('visitOutcome');
const productCategoriesDiv = document.getElementById('productCategories');
const productsDisplayDiv = document.getElementById('productsDisplay');
const submitBtn = document.getElementById('submitBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// عناصر DOM الخاصة بالأقسام الديناميكية
const normalVisitRelatedFieldsDiv = document.getElementById('normalVisitRelatedFields');
const normalProductSectionDiv = document.getElementById('normalProductSection');
const inventorySectionDiv = document.getElementById('inventorySection');
const inventoryItemsContainer = document.getElementById('inventoryItemsContainer');
const addInventoryItemBtn = document.getElementById('addInventoryItem');

// ---------------------------------------------------
// الدوال المساعدة
// ---------------------------------------------------

// دالة لجلب بيانات JSON
async function fetchJsonData(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`فشل في تحميل الملف: ${filename}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: 'error',
      title: 'خطأ في تحميل البيانات',
      text: `حدث خطأ أثناء تحميل ${filename}. يرجى التحقق من الملفات.`,
      confirmButtonText: 'حسنًا'
    });
    return []; // إرجاع مصفوفة فارغة لتجنب إيقاف الكود
  }
}

// دالة لتعبئة القوائم المنسدلة
function populateSelect(selectElement, data, valueKey, textKey) {
  // إزالة الخيارات السابقة باستثناء الخيار الأول (اختر...)
  while (selectElement.options.length > 1) {
    selectElement.remove(1);
  }

  if (Array.isArray(data)) {
    data.forEach(item => {
      const option = document.createElement('option');
      if (valueKey && textKey) {
        // إذا كانت البيانات كائنات
        option.value = item[valueKey];
        option.textContent = item[textKey];
      } else {
        // إذا كانت البيانات نصوصًا بسيطة
        option.value = item;
        option.textContent = item;
      }
      selectElement.appendChild(option);
    });
  }
}

// دالة لملء قائمة الاقتراحات (datalist)
function populateDatalist(datalistElement, data, key) {
  // إزالة الخيارات السابقة
  datalistElement.innerHTML = '';

  if (Array.isArray(data)) {
    data.forEach(item => {
      const option = document.createElement('option');
      option.value = item[key];
      datalistElement.appendChild(option);
    });
  }
}

// دالة لإظهار رسالة تحذير
function showWarningMessage(message) {
  Swal.fire({
    icon: 'warning',
    title: 'تنبيه',
    text: message,
    confirmButtonText: 'حسنًا'
  });
}

// دالة لإظهار/إخفاء أقسام النموذج بناءً على نوع الزيارة
function toggleVisitSections(visitType) {
  // إخفاء جميع الأقسام في البداية
  normalVisitRelatedFieldsDiv.classList.add('hidden');
  inventorySectionDiv.classList.add('hidden');

  if (visitType === 'جرد استثنائي') {
    inventorySectionDiv.classList.remove('hidden');
  } else {
    normalVisitRelatedFieldsDiv.classList.remove('hidden');
  }
}

// دالة لإعداد أقسام المنتجات
function setupProductCategories(data) {
  const categories = new Set(data.map(product => product.Category));
  productCategoriesDiv.innerHTML = '';
  categories.forEach(category => {
    const radioId = `category-${category.replace(/\s/g, '-')}`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'productCategory';
    radio.id = radioId;
    radio.value = category;
    radio.classList.add('hidden');

    const label = document.createElement('label');
    label.htmlFor = radioId;
    label.textContent = category;
    label.classList.add('product-category-label');

    productCategoriesDiv.appendChild(radio);
    productCategoriesDiv.appendChild(label);

    radio.addEventListener('change', () => {
      toggleProductsDisplay(category);
    });
  });
}


// دالة لعرض المنتجات بناءً على الفئة
function toggleProductsDisplay(category) {
  productsDisplayDiv.innerHTML = '';
  const filteredProducts = productsData.filter(p => p.Category === category);
  filteredProducts.forEach(product => {
    const productItem = document.createElement('div');
    productItem.className = 'product-item';
    productItem.innerHTML = `
      <h3 class="font-bold">${product.Product_Name_AR}</h3>
      <div class="product-status-options">
        <label>
          <input type="radio" name="status-${product.Product_Name_AR}" value="available" required>
          متوفر
        </label>
        <label>
          <input type="radio" name="status-${product.Product_Name_AR}" value="unavailable">
          غير متوفر
        </label>
      </div>
    `;
    productsDisplayDiv.appendChild(productItem);
  });
}

// دالة للتحقق من أن العميل موجود في القائمة
function validateCustomer() {
  const customerName = customerNameInput.value.trim();
  const customerExists = customersMain.some(c => c.Customer_Name_AR === customerName);
  if (!customerExists && customerName) {
    showWarningMessage('الرجاء اختيار اسم العميل من القائمة المحددة.');
    customerNameInput.value = '';
    return false;
  }
  return true;
}

// ---------------------------------------------------
// دالة إرسال النموذج
// ---------------------------------------------------

async function handleSubmit(event) {
  event.preventDefault();
  
  if (!validateCustomer()) {
    return;
  }

  // إخفاء زر الإرسال وإظهار السبينر
  submitBtn.disabled = true;
  loadingSpinner.classList.remove('hidden');

  const form = event.target;
  const formData = new FormData(form);
  const visitType = formData.get('Visit_Type_Name_AR');

  const customerName = formData.get('Customer_Name_AR');
  const customerCode = customersMain.find(c => c.Customer_Name_AR === customerName)?.Customer_Code;

  if (visitType === 'جرد استثنائي') {
    // معالجة بيانات الجرد
    const inventoryItems = document.querySelectorAll('.inventory-item');
    const inventoryData = [];

    inventoryItems.forEach((item, index) => {
      const productName = item.querySelector('[name="Inventory_Product_Name_AR"]').value;
      const product = inventoryProductsData.find(p => p.Product_Name_AR === productName);

      if (product) {
        const itemData = {
          'Inventory_ID': `INV-${Date.now()}-${index + 1}`,
          'Timestamp': new Date().toISOString(),
          'Entry_User_Name': formData.get('Entry_User_Name'),
          'Sales_Rep_Name_AR': formData.get('Sales_Rep_Name_AR'),
          'Customer_Name_AR': customerName,
          'Customer_Code': customerCode,
          'Product_Name_AR': productName,
          'Product_Code': product.Product_Code,
          'Quantity': item.querySelector('[name="Inventory_Quantity"]').value,
          'Expiration_Date': item.querySelector('[name="Expiration_Date"]').value,
          'Category': product.Category,
          'Package_Type': product.Package_Type,
          'Unit_Size': product.Unit_Size,
          'Unit_Label': item.querySelector('[name="Unit_Label"]').value,
          'Notes': ''
        };
        inventoryData.push(itemData);
      }
    });

    const payload = {
      sheetName: 'Inventory_Logs',
      data: inventoryData
    };
    sendDataToGoogleSheets(payload);

  } else {
    // معالجة بيانات الزيارات العادية
    const availableProducts = [];
    const unavailableProducts = [];
    document.querySelectorAll('.product-item').forEach(item => {
      const productName = item.querySelector('h3').textContent;
      const status = item.querySelector('input:checked')?.value;
      if (status === 'available') {
        availableProducts.push(productName);
      } else if (status === 'unavailable') {
        unavailableProducts.push(productName);
      }
    });

    const visitData = {
      'Visit_ID': `VISIT-${Date.now()}`,
      'Timestamp': new Date().toISOString(),
      'Entry_User_Name': formData.get('Entry_User_Name'),
      'Sales_Rep_Name_AR': formData.get('Sales_Rep_Name_AR'),
      'Customer_Name_AR': customerName,
      'Customer_Code': customerCode,
      'Visit_Type_Name_AR': visitType,
      'Visit_Purpose': formData.get('Visit_Purpose'),
      'Visit_Outcome': formData.get('Visit_Outcome'),
      'Available_Products_Names': availableProducts.join(', '),
      'Unavailable_Products_Names': unavailableProducts.join(', '),
      'Notes': ''
    };

    const payload = {
      sheetName: 'Visit_Logs',
      data: [visitData]
    };
    sendDataToGoogleSheets(payload);
  }
}

// دالة لإرسال البيانات إلى Google Apps Script
async function sendDataToGoogleSheets(payload) {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`فشل إرسال البيانات: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'تم الإرسال بنجاح!',
        text: 'تم إرسال البيانات بنجاح إلى جدول البيانات.',
        confirmButtonText: 'حسنًا'
      });
      // إعادة تعيين النموذج بعد الإرسال
      visitForm.reset();
      // إعادة ضبط القوائم المنسدلة
      loadAllData();
      // إعادة ضبط أقسام الزيارة
      toggleVisitSections(visitTypeSelect.value);
    } else {
      throw new Error('فشل في إرسال البيانات إلى جدول البيانات.');
    }
  } catch (error) {
    console.error('❌ خطأ في الإرسال:', error);
    Swal.fire({
      icon: 'error',
      title: 'خطأ في الإرسال',
      text: error.message,
      confirmButtonText: 'حسنًا'
    });
  } finally {
    // إظهار زر الإرسال وإخفاء السبينر
    submitBtn.disabled = false;
    loadingSpinner.classList.add('hidden');
  }
}

// ---------------------------------------------------
// تحميل البيانات عند بدء التشغيل
// ---------------------------------------------------

async function loadAllData() {
  try {
    const [
      products,
      inventoryProducts,
      salesReps,
      customers,
      visitOutcomesData,
      visitPurposesData,
      visitTypesData
    ] = await Promise.all([
      fetchJsonData('products.json'),
      fetchJsonData('inventory_products.json'),
      fetchJsonData('sales_representatives.json'),
      fetchJsonData('customers_main.json'),
      fetchJsonData('visit_outcomes.json'),
      fetchJsonData('visit_purposes.json'),
      fetchJsonData('visit_types.json')
    ]);

    productsData = products;
    inventoryProductsData = inventoryProducts;
    salesRepresentatives = salesReps;
    customersMain = customers;
    visitOutcomes = visitOutcomesData;
    visitPurposes = visitPurposesData;
    visitTypes = visitTypesData;

    // تعبئة القوائم المنسدلة وقائمة الاقتراحات
    populateSelect(visitTypeSelect, visitTypes, 'Visit_Type_Name_AR', 'Visit_Type_Name_AR');
    populateSelect(visitPurposeSelect, visitPurposes, 'Visit_Purpose_AR', 'Visit_Purpose_AR');
    populateSelect(visitOutcomeSelect, visitOutcomes, 'Visit_Outcome_AR', 'Visit_Outcome_AR');
    populateDatalist(customerListDatalist, customersMain, 'Customer_Name_AR');

    // ⛔️ هذا هو السطر الذي تم تعديله ليناسب صيغة ملفك `sales_representatives.json`
    populateSelect(salesRepNameSelect, salesRepresentatives);

    // إعداد قسم المنتجات
    setupProductCategories(productsData);

    // تعبئة قائمة منتجات الجرد
    populateSelect(document.querySelector('#inventoryItemsContainer select'), inventoryProductsData, 'Product_Name_AR', 'Product_Name_AR');

  } catch (error) {
    console.error('❌ فشل تحميل جميع البيانات:', error);
  }
}

// ---------------------------------------------------
// وظائف إدارة قسم الجرد
// ---------------------------------------------------

function addInventoryItem() {
  const template = `
    <div class="inventory-item border p-4 rounded-lg mb-4 bg-gray-50 relative">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label>اسم المنتج</label>
          <input type="text" name="Inventory_Product_Name_AR" list="inventoryProductList" placeholder="ابحث عن المنتج..." required />
          <datalist id="inventoryProductList">
            </datalist>
        </div>
        <div class="form-group">
          <label>الكمية</label>
          <input type="number" name="Inventory_Quantity" min="1" placeholder="أدخل الكمية" required />
        </div>
        <div class="form-group">
          <label>تاريخ الانتهاء</label>
          <input type="date" name="Expiration_Date" />
        </div>
        <div class="form-group">
          <label>الوحدة</label>
          <select name="Unit_Label" required>
            <option value="">اختر الوحدة</option>
            <option value="علبة">علبة</option>
            <option value="شد">شد</option>
            <option value="باكت">باكت</option>
          </select>
        </div>
      </div>
      <button type="button" class="removeInventoryItem absolute top-2 left-2 text-red-600 text-sm">❌ حذف</button>
    </div>
  `;
  const newInventoryItem = document.createRange().createContextualFragment(template);
  inventoryItemsContainer.appendChild(newInventoryItem);

  const newSelect = inventoryItemsContainer.lastElementChild.querySelector('input');
  // تعبئة قائمة الاقتراحات للمنتج الجديد
  if (inventoryProductsData.length > 0) {
    newSelect.setAttribute('list', 'inventoryProductList');
    populateDatalist(document.getElementById('inventoryProductList'), inventoryProductsData, 'Product_Name_AR');
  }
}

function addInitialInventoryItem() {
  const template = `
    <div class="inventory-item border p-4 rounded-lg mb-4 bg-gray-50 relative">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label>اسم المنتج</label>
          <input type="text" name="Inventory_Product_Name_AR" list="inventoryProductList" placeholder="ابحث عن المنتج..." required />
          <datalist id="inventoryProductList">
            </datalist>
        </div>
        <div class="form-group">
          <label>الكمية</label>
          <input type="number" name="Inventory_Quantity" min="1" placeholder="أدخل الكمية" required />
        </div>
        <div class="form-group">
          <label>تاريخ الانتهاء</label>
          <input type="date" name="Expiration_Date" />
        </div>
        <div class="form-group">
          <label>الوحدة</label>
          <select name="Unit_Label" required>
            <option value="">اختر الوحدة</option>
            <option value="علبة">علبة</option>
            <option value="شد">شد</option>
            <option value="باكت">باكت</option>
          </select>
        </div>
      </div>
      <button type="button" class="removeInventoryItem absolute top-2 left-2 text-red-600 text-sm">❌ حذف</button>
    </div>
  `;
  const initialItem = document.createRange().createContextualFragment(template);
  inventoryItemsContainer.appendChild(initialItem);
}


// ---------------------------------------------------
// الأحداث عند تحميل الصفحة
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  loadAllData(); // تحميل جميع البيانات الأولية
  addInitialInventoryItem(); // إضافة أول حقل لمنتج الجرد

  visitForm.addEventListener('submit', handleSubmit); // ربط دالة الإرسال بحدث submit للنموذج

  // ربط حدث التغيير لنوع الزيارة لتبديل الأقسام
  visitTypeSelect.addEventListener('change', (event) => {
    toggleVisitSections(event.target.value);
  });

  addInventoryItemBtn.addEventListener('click', addInventoryItem); // ربط زر إضافة منتج جرد

  // تفويض الأحداث لأزرار الحذف لمنتجات الجرد (لأنها تُضاف ديناميكياً)
  inventoryItemsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('removeInventoryItem')) {
      // السماح بالحذف فقط إذا كان هناك أكثر من عنصر جرد واحد
      if (inventoryItemsContainer.children.length > 1) { 
        event.target.closest('.inventory-item').remove();
      } else {
        showWarningMessage('يجب أن يحتوي قسم الجرد على منتج واحد على الأقل.');
      }
    }
  });

});
