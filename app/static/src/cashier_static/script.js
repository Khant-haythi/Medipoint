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
  
    // Initialize totals on page load
    updateTotals();
  });
  
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
    });
  });
  
  // Search Functionality (for Menu section only)
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
  
  // Function to update order totals
  function updateTotals() {
    const orderItems = document.querySelectorAll(".order-item");
    let subtotal = 0;
  
    orderItems.forEach((item) => {
      const price = parseFloat(item.getAttribute("data-price"));
      const quantity = parseInt(
        item.querySelector(".quantity").textContent
      );
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
  
  // Handle add to order buttons
  document.querySelectorAll(".add-to-order-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const menuItem = e.target.closest(".menu-item");
      const name = menuItem.getAttribute("data-name");
      const price = parseFloat(menuItem.getAttribute("data-price"));
      addToOrder(name, price);
    });
  });
  
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