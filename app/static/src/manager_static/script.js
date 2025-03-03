console.log("Script.js loaded successfully at ", new Date().toISOString());
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
  // AJAX for CSV Form Submission
const csvForm = document.getElementById("csvForm");
if (csvForm) {
  console.log("CSV form found:", csvForm);
  csvForm.addEventListener("submit", function(event) {
    event.preventDefault();
    console.log("Form submitted - starting AJAX at ", new Date().toISOString());

    const formData = new FormData(this);
    const resultsDiv = document.getElementById("results");
    const messagesDiv = document.getElementById("messages");

    if (messagesDiv) {
      messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg bg-yellow-100 text-yellow-800">Processing CSV...</div>';
    }
    if (resultsDiv) resultsDiv.classList.add("hidden");

    const url = window.MBA_URL || "/mba_recommendations/";
    console.log("Fetching from URL:", url);
    fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    })
    .then(response => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Data received:", data);
      if (data.success) {
        if (messagesDiv) {
          messagesDiv.innerHTML = `
            <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              ${data.message || "CSV analyzed successfully!"}
            </div>
          `;
        }
        populateResults(data.results);
        if (resultsDiv) resultsDiv.classList.remove("hidden");
      } else {
        if (messagesDiv) {
          messagesDiv.innerHTML = `
            <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
              ${data.message || "Error analyzing CSV"}
            </div>
          `;
        }
      }
    })
    .catch(error => {
      console.error("Fetch error:", error);
      if (messagesDiv) {
        messagesDiv.innerHTML = `
          <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            Failed to analyze CSV: ${error.message}
          </div>
        `;
      }
    });
  });
}
  

});


// Function to populate MBA results with bar graphs
function populateResults(results) {
  console.log("Populating results with:", results);
  const recommendationsTable = document.getElementById("recommendationsTable");
  const topSellingCanvas = document.getElementById("topSellingChart");
  const leastSellingCanvas = document.getElementById("leastSellingChart");

  // Log canvas availability
  console.log("Top selling canvas:", topSellingCanvas);
  console.log("Least selling canvas:", leastSellingCanvas);

  // Clear existing content
  if (recommendationsTable) recommendationsTable.innerHTML = "";

  // Populate Recommendations Table
  if (results.recommendations && results.recommendations.length > 0) {
    results.recommendations.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.antecedents}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.consequents}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.support.toFixed(4)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.confidence.toFixed(4)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.lift.toFixed(4)}</td>
      `;
      recommendationsTable.appendChild(row);
    });
  }

  // Destroy existing charts safely with detailed logging
  console.log("Top selling chart before destroy:", window.topSellingChart);
  if (window.topSellingChart && typeof window.topSellingChart.destroy === "function") {
    window.topSellingChart.destroy();
    console.log("Destroyed existing topSellingChart");
  } else {
    console.log("No valid topSellingChart to destroy or it’s not a Chart instance");
  }

  console.log("Least selling chart before destroy:", window.leastSellingChart);
  if (window.leastSellingChart && typeof window.leastSellingChart.destroy === "function") {
    window.leastSellingChart.destroy();
    console.log("Destroyed existing leastSellingChart");
  } else {
    console.log("No valid leastSellingChart to destroy or it’s not a Chart instance");
  }

  // Populate Top Selling Bar Graph
  if (results.top_selling && results.top_selling.length > 0 && topSellingCanvas) {
    try {
      const labels = results.top_selling.map(product => product.item);
      const data = results.top_selling.map(product => product.count);

      window.topSellingChart = new Chart(topSellingCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Sales Count",
            data: data,
            backgroundColor: "rgba(54, 162, 235, 0.8)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            hoverBackgroundColor: "rgba(54, 162, 235, 1)",
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: "Top 10 Best-Selling Products",
              font: { size: 16, weight: "bold" },
              color: "#333"
            }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Sales Count", font: { size: 14 } }, ticks: { color: "#666" } },
            x: {
              title: { display: true, text: "Product", font: { size: 14 } },
              ticks: {
                color: "#666",
                callback: function(value, index, values) {
                  const label = this.getLabelForValue(value);
                  return label.length > 10 ? label.substr(0, 10) + "..." : label;
                }
              }
            }
          },
          animation: { duration: 1000, easing: "easeOutBounce" }
        }
      });
      console.log("Top selling chart created successfully:", window.topSellingChart);
    } catch (error) {
      console.error("Error creating top selling chart:", error);
    }
  } else {
    console.log("Top selling chart not created: missing data or canvas");
  }

  // Populate Least Selling Bar Graph
  if (results.least_selling && results.least_selling.length > 0 && leastSellingCanvas) {
    try {
      const labels = results.least_selling.map(product => product.item);
      const data = results.least_selling.map(product => product.count);

      window.leastSellingChart = new Chart(leastSellingCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Sales Count",
            data: data,
            backgroundColor: "rgba(255, 99, 132, 0.8)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            hoverBackgroundColor: "rgba(255, 99, 132, 1)",
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: "Least 10 Selling Products",
              font: { size: 16, weight: "bold" },
              color: "#333"
            }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Sales Count", font: { size: 14 } }, ticks: { color: "#666" } },
            x: {
              title: { display: true, text: "Product", font: { size: 14 } },
              ticks: {
                color: "#666",
                callback: function(value, index, values) {
                  const label = this.getLabelForValue(value);
                  return label.length > 10 ? label.substr(0, 10) + "..." : label;
                }
              }
            }
          },
          animation: { duration: 1000, easing: "easeOutBounce" }
        }
      });
      console.log("Least selling chart created successfully:", window.leastSellingChart);
    } catch (error) {
      console.error("Error creating least selling chart:", error);
    }
  } else {
    console.log("Least selling chart not created: missing data or canvas");
  }
}


function getCSRFToken() {
  // Get the CSRF token from the cookie
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Look for the cookie named 'csrftoken'
      if (cookie.substring(0, 9) === 'csrftoken=') {
        cookieValue = decodeURIComponent(cookie.substring(9));
        break;
      }
    }
  }
  return cookieValue;
}
