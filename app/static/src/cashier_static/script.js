// Consolidated DOMContentLoaded event listener for initialization
document.addEventListener("DOMContentLoaded", () => {
  // Load theme from localStorage or default to light
  const savedTheme = localStorage.getItem("theme") || "light";
  const themeIcon = document.getElementById("themeIcon");

  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    themeIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
    `;
  } else {
    themeIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
    `;
  }

  // Initialize with Menu section visible and set as active
  document.getElementById("menu").classList.remove("hidden");
  document.getElementById("menuLink").classList.add("active");

  // Fetch menu data when the page loads or "Menus" is active
  fetchMenuData();

  // Initialize totals on page load
  updateTotals();
});

// Function to fetch menu data from the API
async function fetchMenuData() {
  try {
    const response = await fetch("http://127.0.0.1:8000/products/");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const products = data.products; // Extract the products array from the JSON response

    // Update the menu items in the UI
    updateMenuItems(products);
  } catch (error) {
    console.error("Error fetching menu data:", error);
    alert("Failed to load menu data. Please try again later.");
  }
}

// Function to update menu items in the UI

// Function to update menu items in the UI
function updateMenuItems(products) {
  const menuItemsContainer = document.getElementById("menuItems");
  menuItemsContainer.innerHTML = ""; // Clear existing dummy data

  products.forEach(product => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow menu-item dark:bg-gray-800 dark:shadow-gray-700 flex flex-col w-full max-w-sm"; // Consistent card size
    itemDiv.setAttribute("data-name", product.name);
    itemDiv.setAttribute("data-price", product.price); // Use price directly, no division

    const priceDisplay = `$${product.price.toFixed(2)}`; // Format as dollars

    // Assuming the category is available in the product data (e.g., product.category)
    // If not, you can hardcode or fetch it differently—here I’ll assume it’s "category" in the product object
    const category = product.category || "Category"; // Default to "Category" if not available

    itemDiv.innerHTML = `
      <img src="${product.productImage}" alt="${product.name}" class="w-full h-56 object-cover rounded-t-lg" onerror="this.src='https://via.placeholder.com/150';">
      <div class="p-4 flex flex-col items-start w-full"> <!-- Left-aligned content -->
        <div class="flex flex-col space-y-1">
          <p class="text-sm font-medium text-red-500 dark:text-red-400">${category}</p> <!-- Red category text -->
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-200">${product.name}</h3> <!-- Product name -->
          <p class="text-gray-600 font-bold dark:text-gray-300">${priceDisplay}</p> <!-- Price in gray, not red -->
        </div>
        <button class="bg-red-500 p-2 rounded hover:bg-red-600 dark:bg-red-400 dark:hover:bg-red-500 add-to-order-btn flex items-center justify-center w-12 h-10 mt-4"> <!-- Wider button for cart icon -->
          <svg class="w-5 h-5" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-0.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-0.16.28-0.25.61-0.25.96 0 1.1.9 2 2 2h12v-2H7.42c-0.14 0-0.25-0.11-0.25-0.25l0.03-0.12.9-1.63h7.45c0.75 0 1.41-0.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-0.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    `;
    menuItemsContainer.appendChild(itemDiv);
    console.log(itemDiv.innerHTML);
  });

  // Reattach event listeners for new "Add to Order" buttons
  document.querySelectorAll(".add-to-order-btn").forEach((button) => {
    if (!button.listenerAttached) {
      button.listenerAttached = true;
      button.addEventListener("click", (e) => {
        const menuItem = e.target.closest(".menu-item");
        const name = menuItem.getAttribute("data-name");
        const price = parseFloat(menuItem.getAttribute("data-price"));
        addToOrder(name, price);
      });
    }
  });

  // Reattach search functionality for new menu items
  const searchInput = document.getElementById("searchMenu");
  const menuItems = document.querySelectorAll(".menu-item");
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    menuItems.forEach((item) => {
      const itemName = item.querySelector("h3").textContent.toLowerCase();
      if (itemName.includes(searchTerm)) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    });
  });
}
// Theme toggle functionality with single icon button
document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = document.documentElement.classList.toggle("dark");
  const themeIcon = document.getElementById("themeIcon");

  if (isDark) {
    // Moon icon for dark mode
    themeIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
    `;
  } else {
    // Sun icon for light mode
    themeIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
    `;
  }
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// SPA Navigation
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = link.getAttribute("data-section");

    // Remove active class from all nav links
    document.querySelectorAll(".nav-link").forEach((navLink) => {
      navLink.classList.remove("active");
    });

    // Add active class to the clicked link
    link.classList.add("active");

    // Show/hide sections
    document.querySelectorAll(".section-content").forEach((content) => {
      content.classList.add("hidden");
    });
    document.getElementById(section).classList.remove("hidden");

    // Fetch menu data only if "menu" section is active
    if (section === "menu") {
      fetchMenuData();
    }
  });
});

// Function to update order totals
function updateTotals() {
  const orderItems = document.querySelectorAll(".order-item");
  let subtotal = 0;

  orderItems.forEach((item) => {
    const price = parseFloat(item.getAttribute("data-price"));
    const quantity = parseInt(item.querySelector(".quantity").textContent);
    subtotal += price * quantity;
  });

  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  document.querySelector(".subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.querySelector(".tax").textContent = `$${tax.toFixed(2)}`;
  document.querySelector(".total").textContent = `$${total.toFixed(2)}`;

  // Check if there are more than 7 items and add/remove scroll
  const orderItemsContainer = document.getElementById("orderItemsContainer");
  if (orderItems.length > 7) {
    orderItemsContainer.classList.add("overflow-y-auto", "max-h-[calc(100vh-300px)]");
  } else {
    orderItemsContainer.classList.remove("overflow-y-auto", "max-h-[calc(100vh-300px)]");
  }
}

// Function to add an item to the order
function addToOrder(name, price) {
  const orderItemsContainer = document.getElementById("orderItemsContainer");
  const existingItem = Array.from(
    orderItemsContainer.querySelectorAll(".order-item")
  ).find((item) => item.querySelector("h3").textContent === name);

  if (existingItem) {
    // If item exists, increase its quantity
    const quantityElement = existingItem.querySelector(".quantity");
    let quantity = parseInt(quantityElement.textContent);
    quantity++;
    quantityElement.textContent = quantity;
  } else {
    // If item doesn't exist, create a new order item
    const newItem = document.createElement("div");
    newItem.className = "order-item flex justify-between items-center mb-2";
    newItem.setAttribute("data-price", price);
    newItem.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold dark:text-gray-200">${name}</h3>
        <p class="text-gray-500 text-sm dark:text-gray-400">$${price}</p>
      </div>
      <div class="flex items-center space-x-2">
        <button class="bg-gray-200 p-1 rounded dark:bg-gray-700 minus-btn">-</button>
        <span class="mx-2 quantity dark:text-gray-200">1</span>
        <button class="bg-gray-200 p-1 rounded dark:bg-gray-700 plus-btn">+</button>
      </div>
    `;
    orderItemsContainer.appendChild(newItem);
  }

  // Reattach event listeners to new buttons
  document.querySelectorAll(".plus-btn, .minus-btn").forEach((button) => {
    if (!button.listenerAttached) {
      button.listenerAttached = true;
      button.addEventListener("click", (e) => {
        const item = e.target.closest(".order-item");
        const quantityElement = item.querySelector(".quantity");
        let quantity = parseInt(quantityElement.textContent);

        if (e.target.classList.contains("plus-btn")) {
          quantity++;
        } else if (e.target.classList.contains("minus-btn")) {
          if (quantity > 1) {
            quantity--;
          } else {
            // Remove the item if quantity reaches 0
            item.remove();
          }
        }

        if (quantity > 0) {
          quantityElement.textContent = quantity;
        }
        updateTotals();
      });
    }
  });

  updateTotals();
}

// Sidebar toggle functionality
document.getElementById("sidebarToggle").addEventListener("click", () => {
  const sidebar = document.getElementById("leftSidebar");
  const isCollapsed = sidebar.classList.toggle("w-16");
  const sidebarNav = document.getElementById("sidebarNav");
  const toggleIcon = document.getElementById("sidebarToggleIcon");
  const menuText = sidebar.querySelector("span");
  const sidebarTexts = document.querySelectorAll(".sidebar-text");

  if (isCollapsed) {
    sidebarNav.classList.add("justify-center");
    sidebarTexts.forEach((text) => text.classList.add("hidden"));
    menuText.classList.add("hidden");
    // Switch to close icon (X)
    toggleIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    `;
  } else {
    sidebarNav.classList.remove("justify-center");
    sidebarTexts.forEach((text) => text.classList.remove("hidden"));
    menuText.classList.remove("hidden");
    // Switch back to hamburger menu icon
    toggleIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
    `;
  }
});