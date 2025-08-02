const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw2Qm1ErufxKqBZbLmQ3FKCI4wEUkqET0dGSzLjY3Se7p_wnkFzuMEBTpMSdPp1aKox/exec';

let productsData = [];
let inventoryProductsData = [];
let salesRepresentatives = [];
let customersMain = [];
let visitOutcomes = [];
let visitPurposes = [];
let visitTypes = [];

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

const normalVisitRelatedFieldsDiv = document.getElementById('normalVisitRelatedFields');
const normalProductSectionDiv = document.getElementById('normalProductSection');
const inventorySectionDiv = document.getElementById('inventorySection');
const inventoryListDatalist = document.getElementById('inventoryList');
const inventoryItemsContainer = document.getElementById('inventoryItemsContainer');
const addInventoryItemBtn = document.getElementById('addInventoryItem');
const customerTypeSelect = document.getElementById('customerType');
const visitEntriesContainer = document.getElementById('visitEntriesContainer');
const addVisitEntryBtn = document.getElementById('addVisitEntry');

function showSuccessMessage() {
  Swal.fire({
    title: '✅ تم الإرسال!',
    text: 'تم إرسال النموذج بنجاح.',
    icon: 'success',
    confirmButtonText: 'ممتاز'
  });
}

function showErrorMessage(message) {
  Swal.fire({
    title: '❌ فشل الإرسال',
    text: message || 'حدث خطأ أثناء إرسال النموذج. حاول مجددًا.',
    icon: 'error',
    confirmButtonText: 'موافق'
  });
}

function showWarningMessage(message) {
  Swal.fire({
    title: '⚠️ تنبيه',
    text: message,
    icon: 'warning',
    confirmButtonText: 'موافق'
  });
}

function generateVisitID() {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `VISIT-${timestamp}-${randomString}`;
}

function generateInventoryID() {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${randomString}`;
}

function formatTimestamp(date) {
  return date.toLocaleString('ar-SA', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

async function fetchJsonData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`خطأ في تحميل ${url}:`, error);
    showErrorMessage(`فشل تحميل البيانات من ${url}`);
    return [];
  }
}

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

    // ⛔️ تم إصلاح هذا السطر ليعمل مع صيغة ملفك `sales_representatives.json`
    populateSelect(salesRepNameSelect, salesRepresentatives);
    
    populateCustomerDatalist();
    populateSelect(visitTypeSelect, visitTypes, 'Visit_Type_Name_AR', 'Visit_Type_Name_AR');
    populateSelect(visitPurposeSelect, visitPurposes, 'Visit_Purpose_AR', 'Visit_Purpose_AR');
    populateSelect(visitOutcomeSelect, visitOutcomes, 'Visit_Outcome_AR', 'Visit_Outcome_AR');
    setupProductCategories();
    populateInventoryDatalist();

  } catch (error) {
    console.error('❌ فشل تحميل جميع البيانات:', error);
  }
}

function populateSelect(selectElement, dataArray, valueKey, textKey) {
  while (selectElement.children.length > 1) selectElement.removeChild(selectElement.lastChild);
  dataArray.forEach(item => {
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

function populateCustomerDatalist() {
  customerListDatalist.innerHTML = '';
  customersMain.forEach(customer => {
    const option = document.createElement('option');
    option.value = customer.Customer_Name_AR;
    customerListDatalist.appendChild(option);
  });
}

function populateInventoryDatalist() {
  inventoryListDatalist.innerHTML = '';
  inventoryProductsData.forEach(product => {
    const option = document.createElement('option');
    option.value = product.Product_Name_AR;
    for (const key in product) {
      if (Object.hasOwnProperty.call(product, key)) {
        const camelCaseKey = key.replace(/_(\w)/g, (match, p1) => p1.toUpperCase());
        option.dataset[camelCaseKey] = product[key];
      }
    }
    inventoryListDatalist.appendChild(option);
  });
}

function setupProductCategories() {
  const categories = new Set(productsData.map(product => product.Category));
  productCategoriesDiv.innerHTML = '';
  categories.forEach(category => {
    const radioId = `category-${category.replace(/\s/g, '-')}`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'productCategory';
    radio.id = radioId;
    radio.value = category;
    radio.classList.add('hidden');
    radio.addEventListener('change', () => displayProductsByCategory(category));

    const label = document.createElement('label');
    label.htmlFor = radioId;
    label.textContent = category;
    label.classList.add('product-category-label');

    productCategoriesDiv.appendChild(radio);
    productCategoriesDiv.appendChild(label);
  });
}

function displayProductsByCategory(category) {
  productsDisplayDiv.innerHTML = '';
  const filteredProducts = productsData.filter(p => p.Category === category);
  filteredProducts.forEach(product => {
    const productItem = document.createElement('div');
    productItem.className = 'product-item bg-white p-4 rounded-lg shadow flex items-center justify-between';
    const uniqueId = `product-${product.Product_Name_AR.replace(/\s/g, '-')}`;
    productItem.innerHTML = `
      <span class="font-medium text-gray-800">${product.Product_Name_AR}</span>
      <div class="product-status-radios flex items-center space-x-4 space-x-reverse">
        <label class="inline-flex items-center">
          <input type="radio" class="form-radio text-green-600" name="product-${uniqueId}" value="متوفر" required>
          <span class="mr-2">متوفر</span>
        </label>
        <label class="inline-flex items-center">
          <input type="radio" class="form-radio text-red-600" name="product-${uniqueId}" value="غير متوفر">
          <span class="mr-2">غير متوفر</span>
        </label>
      </div>
    `;
    productsDisplayDiv.appendChild(productItem);
  });
}

function validateProductStatuses() {
  if (normalProductSectionDiv.classList.contains('hidden')) {
    return true;
  }
  const items = productsDisplayDiv.querySelectorAll('.product-item');
  if (items.length === 0) {
    return true;
  }

  let allValid = true;
  items.forEach(div => {
    const radios = div.querySelectorAll('input[type="radio"]');
    const checked = [...radios].some(r => r.checked);
    if (!checked) {
      allValid = false;
      div.classList.add('border-red-500', 'ring-2', 'ring-red-500');
      div.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => div.classList.remove('border-red-500', 'ring-2', 'ring-red-500'), 3000);
    }
  });
  if (!allValid) {
    showWarningMessage('يرجى تحديد حالة التوفر لكل المنتجات الظاهرة.');
  }
  return allValid;
}

async function handleSubmit(event) {
  event.preventDefault();
  submitBtn.disabled = true;
  loadingSpinner.classList.remove('hidden');

  const formData = new FormData(visitForm);
  const now = new Date();
  const selectedVisitType = visitTypeSelect.value;
  let payload = {};

  if (!salesRepNameSelect.value || !customerNameInput.value || !visitTypeSelect.value) {
    showWarningMessage('الرجاء تعبئة حقول "مندوب المبيعات", "اسم العميل", و "نوع الزيارة".');
    submitBtn.disabled = false;
    loadingSpinner.classList.add('hidden');
    return;
  }

  if (selectedVisitType !== 'جرد استثنائي' && (!visitPurposeSelect.value || !visitOutcomeSelect.value || !customerTypeSelect.value)) {
    showWarningMessage('الرجاء تعبئة حقول "الغرض من الزيارة", "نتيجة الزيارة", و "نوع العميل" للزيارات العادية.');
    submitBtn.disabled = false;
    loadingSpinner.classList.add('hidden');
    return;
  }

  if (selectedVisitType === 'جرد استثنائي') {
    const inventoryItems = document.querySelectorAll('.inventory-item');
    const inventoryData = [];
    inventoryItems.forEach((item, index) => {
      const productName = item.querySelector('[name="Inventory_Product_Name_AR"]').value;
      const product = inventoryProductsData.find(p => p.Product_Name_AR === productName);
      if (product) {
        const itemData = {
          'Inventory_ID': `INV-${Date.now()}-${index + 1}`,
          'Timestamp': formatTimestamp(new Date()),
          'Entry_User_Name': formData.get('Entry_User_Name'),
          'Sales_Rep_Name_AR': formData.get('Sales_Rep_Name_AR'),
          'Customer_Name_AR': formData.get('Customer_Name_AR'),
          'Customer_Code': customersMain.find(c => c.Customer_Name_AR === formData.get('Customer_Name_AR'))?.Customer_Code || '',
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

    if (inventoryData.length === 0) {
      showWarningMessage('الرجاء إضافة منتج واحد على الأقل لعملية الجرد.');
      submitBtn.disabled = false;
      loadingSpinner.classList.add('hidden');
      return;
    }

    payload = {
      sheetName: 'Inventory_Logs',
      data: inventoryData
    };
  } else {
    if (!validateProductStatuses()) {
      submitBtn.disabled = false;
      loadingSpinner.classList.add('hidden');
      return;
    }

    const available = [];
    const unavailable = [];
    document.querySelectorAll('.product-item').forEach(item => {
      const name = item.querySelector('span').textContent;
      const selected = item.querySelector('input[type="radio"]:checked');
      if (selected) {
        selected.value === 'متوفر' ? available.push(name) : unavailable.push(name);
      }
    });

    const dataToSubmit = {
      'Visit_ID': generateVisitID(),
      'Timestamp': formatTimestamp(now),
      'Entry_User_Name': formData.get('Entry_User_Name'),
      'Sales_Rep_Name_AR': formData.get('Sales_Rep_Name_AR'),
      'Customer_Name_AR': formData.get('Customer_Name_AR'),
      'Customer_Code': customersMain.find(c => c.Customer_Name_AR === formData.get('Customer_Name_AR'))?.Customer_Code || '',
      'Visit_Type_Name_AR': selectedVisitType,
      'Visit_Purpose': formData.get('Visit_Purpose'),
      'Visit_Outcome': formData.get('Visit_Outcome'),
      'Customer_Type': formData.get('Customer_Type'),
      'Available_Products_Names': available.join(', '),
      'Unavailable_Products_Names': unavailable.join(', '),
      'Notes': formData.get('Notes') || ''
    };

    payload = {
      sheetName: 'Visit_Logs',
      data: [dataToSubmit]
    };
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      // ⛔️ تم تغيير `no-cors` إلى `cors` للسماح بقراءة الاستجابة
      mode: 'cors', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      showSuccessMessage();
      visitForm.reset();
      productsDisplayDiv.innerHTML = '';
      inventoryItemsContainer.innerHTML = '';
      addInitialInventoryItem();
      toggleVisitSections(visitTypeSelect.value);
    } else {
      showErrorMessage('حدث خطأ في تطبيق Google Apps Script.');
    }
  } catch (error) {
    console.error('فشل الإرسال:', error);
    showErrorMessage('فشل في الاتصال بخادم Google.');
  } finally {
    submitBtn.disabled = false;
    loadingSpinner.classList.add('hidden');
  }
}

function toggleVisitSections(selectedType) {
  normalVisitRelatedFieldsDiv.classList.add('hidden');
  normalProductSectionDiv.classList.add('hidden');
  inventorySectionDiv.classList.add('hidden');

  if (selectedType === 'جرد استثنائي') {
    inventorySectionDiv.classList.remove('hidden');
    customerTypeSelect.removeAttribute('required');
    visitPurposeSelect.removeAttribute('required');
    visitOutcomeSelect.removeAttribute('required');
    productsDisplayDiv.innerHTML = '';
    document.querySelectorAll('#productCategories input[type="radio"]').forEach(radio => radio.checked = false);
  } else {
    normalVisitRelatedFieldsDiv.classList.remove('hidden');
    normalProductSectionDiv.classList.remove('hidden');
    customerTypeSelect.setAttribute('required', 'required');
    visitPurposeSelect.setAttribute('required', 'required');
    visitOutcomeSelect.setAttribute('required', 'required');
    inventoryItemsContainer.innerHTML = '';
    addInitialInventoryItem();
  }
}

function addInventoryItem() {
  const template = `
    <div class="inventory-item border border-yellow-200 p-4 rounded-lg bg-white relative">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label>البحث عن المنتج</label>
          <input type="text" name="Inventory_Product_Name_AR" list="inventoryList" placeholder="ابحث..." />
        </div>
        <div class="form-group">
          <label>الكمية</label>
          <input type="number" name="Inventory_Quantity" min="0" placeholder="أدخل الكمية" />
        </div>
        <div class="form-group">
          <label>تاريخ الانتهاء</label>
          <input type="date" name="Expiration_Date" />
        </div>
        <div class="form-group">
          <label>الوحدة</label>
          <select name="Unit_Label">
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
}

function addInitialInventoryItem() {
  if (inventoryItemsContainer.children.length === 0) {
    addInventoryItem();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  addInitialInventoryItem();

  visitForm.addEventListener('submit', handleSubmit);

  visitTypeSelect.addEventListener('change', (event) => {
    toggleVisitSections(event.target.value);
  });

  addInventoryItemBtn.addEventListener('click', addInventoryItem);

  inventoryItemsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('removeInventoryItem')) {
      if (inventoryItemsContainer.children.length > 1) {
        event.target.closest('.inventory-item').remove();
      } else {
        showWarningMessage('يجب أن يحتوي قسم الجرد على منتج واحد على الأقل.');
      }
    }
  });

  toggleVisitSections(visitTypeSelect.value);
});
