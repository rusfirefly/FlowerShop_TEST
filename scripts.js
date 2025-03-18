const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Инициализация данных
const categories = [
    {id: 1, name: "Букеты"},
    {id: 2, name: "Комнатные растения"},
    {id: 3, name: "Подарки"}
];

const products = [
    {
        id: 1,
        name: "Розы",
        price: 2500,
        image: "images/flower.png",
        category: 1,
        description: "Букет из 11 алых роз"
    },
    {
        id: 2,
        name: "Тюльпаны",
        price: 1500,
        image: "images/flower.png",
        category: 1,
        description: "Весенний букет"
    },
    {
        id: 3,
        name: "Фикус",
        price: 3000,
        image: "images/flower.png",
        category: 2,
        description: "Комнатное растение в горшке"
    }
];

// Состояние приложения
let state = {
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    orders: JSON.parse(localStorage.getItem('orders')) || [],
    selectedCategory: null,
    searchQuery: ''
};

// Инициализация
function init() {
    setupEventListeners();
    renderCategories();
    renderProducts();
    renderCart();
    renderOrderHistory();
}

function setupEventListeners() {
    document.getElementById('delivery-type').addEventListener('change', function(e) {
        document.getElementById('delivery-address').style.display = 
            e.target.value === 'courier' ? 'block' : 'none';
    });

    document.querySelector('.search-box').addEventListener('input', function(e) {
        searchProducts(e.target.value);
    });

    document.getElementById('checkout-btn').addEventListener('click', checkout);
}

// Рендер категорий
function renderCategories() {
    const container = document.getElementById('categories');
    container.innerHTML = [
        {id: null, name: 'Все'},
        ...categories
    ].map(cat => `
        <button 
            onclick="selectCategory(${cat.id})" 
            style="${state.selectedCategory === cat.id ? 
                'background: #007bff; color: white;' : 
                'background: #f0f2f5;'}"
        >
            ${cat.name}
        </button>
    `).join('');
}

window.selectCategory = function(categoryId) {
    state.selectedCategory = categoryId;
    renderCategories();
    renderProducts();
}

// Поиск товаров
function searchProducts(query) {
    state.searchQuery = query.toLowerCase();
    renderProducts();
}

// Рендер товаров
function renderProducts() {
    const filteredProducts = products.filter(p => {
        const matchesCategory = !state.selectedCategory || p.category === state.selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(state.searchQuery) || 
                             p.description.toLowerCase().includes(state.searchQuery);
        return matchesCategory && matchesSearch;
    });

    const container = document.getElementById('products');
    container.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <img src="${product.image}" 
                 class="product-image" 
                 alt="${product.name}"
                 onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p>Цена: ${product.price.toLocaleString()} ₽</p>
            <button class="add-btn" data-id="${product.id}">
                ${state.cart.find(item => item.id === product.id) ? 
                  'Добавить еще' : 'В корзину'}
            </button>
        </div>
    `).join('');

    // Добавляем обработчики для кнопок
    document.querySelectorAll('.product-card button').forEach(button => {
        button.addEventListener('click', () => {
            addToCart(parseInt(button.dataset.id));
        });
    });
}

// Работа с корзиной
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = state.cart.find(item => item.id === productId);
    
    if(existingItem) {
        existingItem.quantity++;
    } else {
        state.cart.push({...product, quantity: 1});
    }
    
    updateCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    updateCart();
}

function changeQuantity(productId, delta) {
    const item = state.cart.find(item => item.id === productId);
    item.quantity += delta;
    
    if(item.quantity < 1) {
        removeFromCart(productId);
    } else {
        updateCart();
    }
}

function updateCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    renderProducts();
    renderCart();
}

// Рендер корзины
function renderCart() {
    const container = document.getElementById('cart-items');
    const total = calculateTotal();
    
    container.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <span>${item.name} x${item.quantity}</span>
            <div>
                <button onclick="changeQuantity(${item.id}, -1)">-</button>
                <button onclick="changeQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">×</button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('total').textContent = total.toLocaleString();
}

function calculateTotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// История заказов
function renderOrderHistory() {
    const container = document.getElementById('orders-list');
    container.innerHTML = state.orders.map((order, index) => `
        <div class="order-item">
            <h4>Заказ #${index + 1} (${new Date(order.date).toLocaleDateString()})</h4>
            <p>Статус: ${order.status}</p>
            <p>Сумма: ${order.total.toLocaleString()} ₽</p>
            <button data-index="${index}">Подробности</button>
        </div>
    `).join('');

    // Добавляем обработчики для кнопок подробностей
    document.querySelectorAll('#orders-list button').forEach(button => {
        button.addEventListener('click', () => {
            showOrderDetails(parseInt(button.dataset.index));
        });
    });
}

// Платежная система
async function checkout() {
    if(state.cart.length === 0) {
        tg.showAlert('Корзина пуста!');
        return;
    }

    const deliveryType = document.getElementById('delivery-type').value;
    const deliveryData = deliveryType === 'courier' ? {
        address: document.getElementById('address').value,
        date: document.getElementById('delivery-date').value
    } : null;

    const invoice = {
        title: "Оплата заказа",
        description: `Товаров: ${state.cart.length} шт.`,
        currency: "RUB",
        prices: [{ label: "Итого", amount: calculateTotal() * 100 }],
        payload: JSON.stringify({
            userId: tg.initDataUnsafe.user?.id,
            cart: state.cart,
            delivery: deliveryData
        })
    };

    try {
        tg.showAlert(invoice)
        const result = await tg.openInvoice(invoice);
        tg.showAlert(result)
        if(result.status === 'paid') {
            saveOrder(result);
            tg.showAlert('Оплата прошла успешно!');
            clearCart();
            tg.close();
        } else {
            tg.showAlert('Оплата не была завершена');
        }
    } catch (error) {
        tg.showAlert('Ошибка оплаты: ' + error.message);
    }
}

function saveOrder(paymentResult) {
    const newOrder = {
        date: new Date().toISOString(),
        items: state.cart,
        total: calculateTotal(),
        status: 'Оплачен',
        paymentData: paymentResult
    };
    
    state.orders.unshift(newOrder);
    localStorage.setItem('orders', JSON.stringify(state.orders));
    renderOrderHistory();
}

function clearCart() {
    state.cart = [];
    localStorage.removeItem('cart');
    updateCart();
}

// Вспомогательные функции
function showOrderDetails(orderIndex) {
    const order = state.orders[orderIndex];
    const items = order.items.map(item => 
        `${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} ₽`
    ).join('\n');
    
    tg.showAlert(`
        Детали заказа #${orderIndex + 1}:
        Дата: ${new Date(order.date).toLocaleString()}
        Статус: ${order.status}
        Товары:
        ${items}
        Итого: ${order.total.toLocaleString()} ₽
    `);
}

// Запуск приложения
init();