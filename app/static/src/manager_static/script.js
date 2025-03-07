console.log("Script.js loaded successfully at ", new Date().toISOString());

// Global variable for the pie chart instance
let productSalesPieChart = null;
let csvUploaded = localStorage.getItem('csvUploaded') === 'true';  // Load from localStorage
let mbaData = JSON.parse(localStorage.getItem('mbaData'));  // Load mbaData if using client-side approach

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

            const url = window.MBA_URL || "/recommendations/";
            console.log("Fetching from URL:", url);
            fetch(url, {
                method: "POST",
                body: formData,
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRFToken": getCSRFToken() // Ensure CSRF token is included
                }
            })
            .then(response => {
                console.log("Response status:", response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Data received:", data);
                if (data.success) {
                    csvUploaded = true;
                    localStorage.setItem('csvUploaded', 'true');  // Persist to localStorage
                    if (data.df_dict) {
                        mbaData = data.df_dict;
                        localStorage.setItem('mbaData', JSON.stringify(mbaData));
                    }
                    if (messagesDiv) {
                        messagesDiv.innerHTML = `
                            <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                ${data.message || "CSV analyzed successfully!"}
                            </div>
                        `;
                    }
                    populateResults(data); // Ensure full data object is passed
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
                const messagesDiv = document.getElementById("messages");
                if (messagesDiv) {
                    messagesDiv.innerHTML = `
                        <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            Failed to analyze CSV: ${error.message}
                        </div>
                    `;
                }
                // Ensure resultsDiv is hidden on error
                const resultsDiv = document.getElementById("results");
                if (resultsDiv) resultsDiv.classList.add("hidden");
            });
        });
    }
});

// Function to populate MBA results with charts, prediction details, and predictive accuracy
function populateResults(data) {
    console.log("Populating results with:", data); // Log the full data object
    const recommendationsTable = document.getElementById("recommendationsTable");
    const topSellingCanvas = document.getElementById("topSellingChart");
    const leastSellingCanvas = document.getElementById("leastSellingChart");
    const productSalesPieCanvas = document.getElementById("productSalesPieChart");
    const predictionDetailsTable = document.getElementById("predictionDetailsTable");
    const predictiveAccuracyDiv = document.getElementById("predictiveAccuracy");

    // Log element availability
    console.log("Top selling canvas:", topSellingCanvas);
    console.log("Least selling canvas:", leastSellingCanvas);
    console.log("Product sales pie canvas:", productSalesPieCanvas);
    console.log("Prediction details table:", predictionDetailsTable);
    console.log("Predictive accuracy div:", predictiveAccuracyDiv);

    // Clear existing content
    if (recommendationsTable) recommendationsTable.innerHTML = "";
    if (predictionDetailsTable) predictionDetailsTable.querySelector("tbody").innerHTML = "";

    // Safely handle data.results being undefined
    if (!data || !data.results || typeof data.results !== 'object') {
        console.error("data or data.results is undefined or not an object:", data);
        const messagesDiv = document.getElementById("messages");
        if (messagesDiv) {
            messagesDiv.innerHTML = `
                <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    Error: No recommendation results available. Check the CSV or server logs.
                </div>
            `;
        }
        return; // Exit the function if results are invalid
    }

    // Populate Recommendations Table
    if (data.results.recommendations && data.results.recommendations.length > 0) {
        data.results.recommendations.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.antecedents || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.consequents || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.support ? item.support.toFixed(4) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.confidence ? item.confidence.toFixed(4) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.lift ? item.lift.toFixed(4) : 'N/A'}</td>
            `;
            recommendationsTable.appendChild(row);
        });
    } else {
        console.log("No recommendations data available");
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

    // Destroy existing pie chart
    if (productSalesPieChart && typeof productSalesPieChart.destroy === "function") {
        productSalesPieChart.destroy();
        console.log("Destroyed existing productSalesPieChart");
    } else {
        console.log("No valid productSalesPieChart to destroy or it’s not a Chart instance");
    }

    // Populate Top Selling Bar Graph
    if (data.results.top_selling && data.results.top_selling.length > 0 && topSellingCanvas) {
        try {
            const labels = data.results.top_selling.map(product => product.item);
            const dataValues = data.results.top_selling.map(product => product.count);

            window.topSellingChart = new Chart(topSellingCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Sales Count",
                        data: dataValues,
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
    if (data.results.least_selling && data.results.least_selling.length > 0 && leastSellingCanvas) {
        try {
            const labels = data.results.least_selling.map(product => product.item);
            const dataValues = data.results.least_selling.map(product => product.count);

            window.leastSellingChart = new Chart(leastSellingCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Sales Count",
                        data: dataValues,
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

    // Initialize Product Sales Pie Chart with default data (monthly)
    if (data.results.product_sales && data.results.product_sales.length > 0 && productSalesPieCanvas) {
        createProductSalesPieChart(data.results.product_sales, productSalesPieCanvas, "Monthly");
    } else {
        console.log("Product sales pie chart not created: missing data or canvas", {
            product_sales: data.results.product_sales,
            canvas: productSalesPieCanvas
        });
    }

    // Populate Prediction Details Table
    if (predictionDetailsTable) { // Check if the table element exists
        if (data.prediction_details && data.prediction_details.length > 0) {
            data.prediction_details.forEach(detail => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${detail.transaction || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${detail.rule_applied || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${detail.predicted_consequent || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${detail.actual_consequent || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${detail.correct !== undefined ? (detail.correct ? 'Yes' : 'No') : 'N/A'}</td>
                `;
                predictionDetailsTable.querySelector("tbody").appendChild(row);
            });
        } else {
            console.log("No prediction details to display");
        }
    } else {
        console.error("Prediction details table element not found in DOM");
    }

    // Populate Predictive Accuracy
    if (predictiveAccuracyDiv) {
        // Check if predictive_accuracy is a valid number
        if (typeof data.predictive_accuracy === 'number' && !isNaN(data.predictive_accuracy)) {
            if (data.predictive_accuracy === 0) {
                predictiveAccuracyDiv.textContent = "Predictive Accuracy: Insufficient data for prediction.";
            } else {
                predictiveAccuracyDiv.textContent = `Predictive Accuracy: ${data.predictive_accuracy.toFixed(2)}%`;
            }
        } else {
            console.warn("predictive_accuracy is not a valid number:", data.predictive_accuracy);
            predictiveAccuracyDiv.textContent = "Predictive Accuracy: Data unavailable.";
        }
    } else {
        console.error("Predictive accuracy div not found");
    }
}

// Function to create or update the Product Sales Pie Chart
function createProductSalesPieChart(data, canvas, periodLabel) {
    // Destroy existing chart if it exists
    if (productSalesPieChart && typeof productSalesPieChart.destroy === "function") {
        productSalesPieChart.destroy();
        console.log("Destroyed existing productSalesPieChart");
    }

    // Limit to top 10 products, group the rest into "Others"
    const topN = 10;
    let topData = data.slice(0, topN);
    const othersCount = data.slice(topN).reduce((sum, item) => sum + item.count, 0);
    if (othersCount > 0) {
        topData.push({ item: "Others", count: othersCount });
    }

    try {
        const labels = topData.map(product => product.item);
        const values = topData.map(product => product.count);
        const total = values.reduce((sum, val) => sum + val, 0);
        // Simplified color scheme for top 10 + Others
        const backgroundColors = labels.map((_, index) => {
            const hue = (index * 360 / topN) % 360; // Evenly spaced hues
            return index < topN ? `hsl(${hue}, 70%, 60%)` : 'hsl(0, 0%, 60%)'; // Grey for "Others"
        });

        productSalesPieChart = new Chart(canvas.getContext("2d"), {
            type: "pie",
            data: {
                labels: labels,
                datasets: [{
                    label: `Product Sales (${periodLabel})`,
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: "#fff",
                    borderWidth: 1,
                    hoverOffset: 20,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow chart to fill container
                plugins: {
                    legend: {
                        position: "right", // Move legend to the right for better visibility
                        labels: {
                            font: { size: 14 }, // Larger font for legend
                            color: "#333",
                            boxWidth: 20,
                            padding: 15,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label}: ${percentage}% (${value} units)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth,
                                        hidden: isNaN(data.datasets[0].data[i]) || data.datasets[0].data[i] === null,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Product Sales Distribution (${periodLabel})`,
                        font: { size: 20, weight: "bold" }, // Larger title
                        color: "#333",
                        padding: 20
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} units (${percentage}%)`;
                            }
                        },
                        bodyFont: { size: 14 },
                        titleFont: { size: 16 }
                    }
                },
                animation: { duration: 1000, easing: "easeOutBounce" },
                elements: {
                    arc: {
                        borderWidth: 2,
                    }
                },
                layout: {
                    padding: 30,
                }
            }
        });
        console.log(`Product sales pie chart created successfully for ${periodLabel}:`, productSalesPieChart);
    } catch (error) {
        console.error(`Error creating product sales pie chart for ${periodLabel}:`, error);
    }
}

// Function to update the Product Sales Pie Chart based on the selected period
function updateProductSalesChart(period) {
    const productSalesPieCanvas = document.getElementById("productSalesPieChart");
    if (!productSalesPieCanvas) {
        console.error("Product sales pie canvas not found");
        return;
    }

    // Check if CSV has been uploaded
    if (!csvUploaded) {
        console.error("No CSV has been uploaded yet");
        const messagesDiv = document.getElementById("messages");
        if (messagesDiv) {
            messagesDiv.innerHTML = `
                <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    Please upload a CSV file before selecting a period.
                </div>
            `;
        }
        return;
    }

    const url = `/mba_product_sales/${period}/`;
    console.log(`Fetching from URL: ${url}`);
    fetch(url, {
        method: "GET",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": getCSRFToken() // Ensure CSRF token is included
        }
    })
    .then(response => {
        console.log(`Response status for ${period}:`, response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`Product sales data for ${period}:`, data);
        if (data.error) {
            console.error("Error fetching product sales data:", data.error);
            const messagesDiv = document.getElementById("messages");
            if (messagesDiv) {
                messagesDiv.innerHTML = `
                    <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        ${data.error}
                    </div>
                `;
            }
            return;
        }

        if (data.product_sales && data.product_sales.length > 0) {
            createProductSalesPieChart(data.product_sales, productSalesPieCanvas, period.charAt(0).toUpperCase() + period.slice(1));
        } else {
            console.log(`No product sales data for ${period}`);
            const messagesDiv = document.getElementById("messages");
            if (messagesDiv) {
                messagesDiv.innerHTML = `
                    <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        No product sales data available for ${period}.
                    </div>
                `;
            }
        }
    })
    .catch(error => {
        console.error(`Error fetching product sales data for ${period}:`, error);
        const messagesDiv = document.getElementById("messages");
        if (messagesDiv) {
            messagesDiv.innerHTML = `
                <div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    Failed to load product sales data for ${period}: ${error.message}
                </div>
            `;
        }
    });
}

function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 9) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(9));
                break;
            }
        }
    }
    return cookieValue;
}