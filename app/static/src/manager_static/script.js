console.log("Script.js loaded successfully at ", new Date().toISOString());

// Global variables
let productSalesPieChart = null;
let csvUploaded = localStorage.getItem('csvUploaded') === 'true' || false; // Default to false if not set
let mbaData = JSON.parse(localStorage.getItem('mbaData')) || {};
let predictiveAccuracy = 0;
let predictionDetails = [];

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

// Populate MBA results with charts
function populateResults(results, predictiveAccuracyParam, predictionDetailsParam) {
    console.log("Populating results with:", results);
    const recommendationsTable = document.getElementById("recommendationsTable");
    const topSellingCanvas = document.getElementById("topSellingChart");
    const leastSellingCanvas = document.getElementById("leastSellingChart");
    const predictionDetailsTable = document.getElementById("predictionDetailsTable");
    const predictiveAccuracyDiv = document.getElementById("predictiveAccuracy");
    const messagesDiv = document.getElementById("messages");

    // Log DOM element availability
    console.log("DOM elements:", { recommendationsTable, topSellingCanvas, leastSellingCanvas, predictionDetailsTable, predictiveAccuracyDiv, messagesDiv });

    // Update global variables
    predictiveAccuracy = (predictiveAccuracyParam !== undefined && typeof predictiveAccuracyParam === 'number' && !isNaN(predictiveAccuracyParam)) ? predictiveAccuracyParam : 0;
    predictionDetails = predictionDetailsParam || [];
    window.predictiveAccuracy = predictiveAccuracy;
    window.predictionDetails = predictionDetails;

    // Clear existing content
    if (recommendationsTable) recommendationsTable.innerHTML = "";
    if (predictionDetailsTable) predictionDetailsTable.querySelector("tbody").innerHTML = "";

    // Populate Recommendations Table (up to 15 rows)
    if (results.recommendations && results.recommendations.length > 0) {
        results.recommendations.slice(0, 15).forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.antecedents || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.consequents || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.support ? item.support.toFixed(4) : '0.0000'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.confidence ? item.confidence.toFixed(4) : '0.0000'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${item.lift ? item.lift.toFixed(4) : '0.0000'}</td>
            `;
            recommendationsTable.appendChild(row);
        });
    } else {
        if (messagesDiv) {
            messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">No recommendation results available. Check the CSV or server logs.</div>';
        }
        console.error("No recommendations available in results:", results);
    }

    // Safely destroy existing charts
    try {
        if (window.topSellingChart && typeof window.topSellingChart.destroy === "function") {
            window.topSellingChart.destroy();
            console.log("Destroyed existing topSellingChart");
        }
    } catch (error) {
        console.warn("Failed to destroy topSellingChart:", error);
    }
    try {
        if (window.leastSellingChart && typeof window.leastSellingChart.destroy === "function") {
            window.leastSellingChart.destroy();
            console.log("Destroyed existing leastSellingChart");
        }
    } catch (error) {
        console.warn("Failed to destroy leastSellingChart:", error);
    }

    // Populate Top Selling Bar Graph
    if (results.top_selling && results.top_selling.length > 0 && topSellingCanvas) {
        try {
            const labels = results.top_selling.map(product => product.item);
            const data = results.top_selling.map(product => product.count);
            window.topSellingChart = new Chart(topSellingCanvas.getContext("2d"), {
                type: "bar",
                data: { labels, datasets: [{ label: "Sales Count", data, backgroundColor: "rgba(54, 162, 235, 0.8)", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 1, hoverBackgroundColor: "rgba(54, 162, 235, 1)" }] },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: "Top 10 Best-Selling Products", font: { size: 16, weight: "bold" }, color: "#333" } }, scales: { y: { beginAtZero: true, title: { display: true, text: "Sales Count", font: { size: 14 } }, ticks: { color: "#666" } }, x: { title: { display: true, text: "Product", font: { size: 14 } }, ticks: { color: "#666", callback: function(value) { return this.getLabelForValue(value).length > 10 ? this.getLabelForValue(value).substr(0, 10) + "..." : this.getLabelForValue(value); } } } }, animation: { duration: 1000, easing: "easeOutBounce" } }
            });
            console.log("Top selling chart created successfully");
        } catch (error) {
            console.error("Error creating top selling chart:", error);
        }
    }

    // Populate Least Selling Bar Graph
    if (results.least_selling && results.least_selling.length > 0 && leastSellingCanvas) {
        try {
            const labels = results.least_selling.map(product => product.item);
            const data = results.least_selling.map(product => product.count);
            window.leastSellingChart = new Chart(leastSellingCanvas.getContext("2d"), {
                type: "bar",
                data: { labels, datasets: [{ label: "Sales Count", data, backgroundColor: "rgba(255, 99, 132, 0.8)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1, hoverBackgroundColor: "rgba(255, 99, 132, 1)" }] },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: "Least 10 Selling Products", font: { size: 16, weight: "bold" }, color: "#333" } }, scales: { y: { beginAtZero: true, title: { display: true, text: "Sales Count", font: { size: 14 } }, ticks: { color: "#666" } }, x: { title: { display: true, text: "Product", font: { size: 14 } }, ticks: { color: "#666", callback: function(value) { return this.getLabelForValue(value).length > 10 ? this.getLabelForValue(value).substr(0, 10) + "..." : this.getLabelForValue(value); } } } }, animation: { duration: 1000, easing: "easeOutBounce" } }
            });
            console.log("Least selling chart created successfully");
        } catch (error) {
            console.error("Error creating least selling chart:", error);
        }
    }

    // Populate Prediction Details Table
    if (predictionDetails && predictionDetails.length > 0 && predictionDetailsTable) {
        predictionDetailsTable.querySelector("tbody").innerHTML = "";
        predictionDetails.forEach(detail => {
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
        console.log("No prediction details to display or table not found");
    }

    // Populate Predictive Accuracy
    if (predictiveAccuracyDiv) {
        if (typeof predictiveAccuracy === 'number' && !isNaN(predictiveAccuracy)) {
            predictiveAccuracyDiv.textContent = predictiveAccuracy === 0 ? "Predictive Accuracy: Insufficient data for prediction." : `Predictive Accuracy: ${predictiveAccuracy.toFixed(2)}%`;
        } else {
            console.error("predictiveAccuracy is not a valid number:", predictiveAccuracy);
            predictiveAccuracyDiv.textContent = "Predictive Accuracy: Data unavailable.";
        }
    } else {
        console.error("Predictive accuracy div not found");
    }
}

// Populate Prediction Details
function populatePredictionDetails(predictionDetailsParam) {
    const predictionDetailsTable = document.getElementById("predictionDetailsTable");
    if (predictionDetailsTable) {
        predictionDetailsTable.querySelector("tbody").innerHTML = "";
        predictionDetails = predictionDetailsParam || [];
        window.predictionDetails = predictionDetails;
        if (predictionDetails.length > 0) {
            predictionDetails.forEach(detail => {
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
            console.log("No prediction details available to display");
        }
    } else {
        console.error("Prediction details table not found");
    }
}

// Populate Predictive Accuracy
function populatePredictiveAccuracy(predictiveAccuracyParam) {
    const predictiveAccuracyDiv = document.getElementById("predictiveAccuracy");
    if (predictiveAccuracyDiv) {
        predictiveAccuracy = (predictiveAccuracyParam !== undefined && typeof predictiveAccuracyParam === 'number' && !isNaN(predictiveAccuracyParam)) ? predictiveAccuracyParam : 0;
        window.predictiveAccuracy = predictiveAccuracy;
        predictiveAccuracyDiv.textContent = predictiveAccuracy === 0 ? "Predictive Accuracy: Insufficient data for prediction." : `Predictive Accuracy: ${predictiveAccuracy.toFixed(2)}%`;
    } else {
        console.error("Predictive accuracy div not found");
    }
}

// DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const themeIcon = document.getElementById("themeIcon");

    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    } else {
        themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    }

    // CSV Form Submission
    const csvForm = document.getElementById("csvForm");
    if (csvForm) {
        csvForm.addEventListener("submit", function(event) {
            event.preventDefault();
            console.log("Form submitted - starting AJAX at ", new Date().toISOString());

            const formData = new FormData(this);
            const resultsDiv = document.getElementById("results");
            const messagesDiv = document.getElementById("messages");

            if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg bg-yellow-100 text-yellow-800">Processing CSV...</div>';
            if (resultsDiv) resultsDiv.classList.add("hidden");

            const url = window.MBA_URL || "/mba_recommendations/";
            fetch(url, {
                method: "POST",
                body: formData,
                headers: { "X-Requested-With": "XMLHttpRequest", "X-CSRFToken": getCSRFToken() }
            })
            .then(response => {
                if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("Data received:", data);
                if (data.success) {
                    csvUploaded = true;
                    localStorage.setItem('csvUploaded', 'true');
                    if (data.df_dict) {
                        mbaData = data.df_dict;
                        localStorage.setItem('mbaData', JSON.stringify(mbaData));
                    }
                    if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">CSV analyzed successfully!</div>';
                    populateResults(data.results, data.predictive_accuracy, data.prediction_details);
                    if (resultsDiv) resultsDiv.classList.remove("hidden");
                } else {
                    csvUploaded = false;
                    localStorage.setItem('csvUploaded', 'false');
                    if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">' + (data.message || "Error analyzing CSV") + '</div>';
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
                csvUploaded = false;
                localStorage.setItem('csvUploaded', 'false');
                if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Failed to analyze CSV: ' + error.message + '</div>';
            });
        });

        // Check Validation Button
        const checkValidationBtn = document.getElementById('checkValidationBtn');
        if (checkValidationBtn) {
            checkValidationBtn.addEventListener('click', function() {
                const predictionDetailsContainer = document.getElementById('predictionDetailsContainer');
                const predictiveAccuracyContainer = document.getElementById('predictiveAccuracyContainer');
                const messagesDiv = document.getElementById('messages');

                if (!predictionDetailsContainer || !predictiveAccuracyContainer) {
                    console.error('Required containers not found');
                    if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg bg-red-100 text-red-800">Error: Validation containers missing.</div>';
                    return;
                }

                predictionDetailsContainer.classList.remove('hidden');
                predictiveAccuracyContainer.classList.remove('hidden');

                // Fetch fresh validation data
                fetch('/mba_recommendations/validate/', {
                    method: 'GET',
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCSRFToken() }
                })
                .then(response => {
                    if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        window.predictiveAccuracy = data.predictive_accuracy || 0;
                        window.predictionDetails = data.prediction_details || [];
                        populatePredictionDetails(window.predictionDetails);
                        populatePredictiveAccuracy(window.predictiveAccuracy);
                    } else {
                        if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">' + (data.message || 'Validation failed') + '</div>';
                    }
                })
                .catch(error => {
                    console.error('Validation fetch error:', error);
                    if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Validation failed: ' + error.message + '</div>';
                });
            });
        } else {
            console.error('Check validation button not found');
        }
    }
});

// Create or update Product Sales Pie Chart
function createProductSalesPieChart(data, canvas, periodLabel) {
    if (productSalesPieChart && typeof productSalesPieChart.destroy === "function") {
        productSalesPieChart.destroy();
        console.log("Destroyed existing productSalesPieChart");
    }

    const topN = 10;
    let topData = data.slice(0, topN);
    const othersCount = data.slice(topN).reduce((sum, item) => sum + item.count, 0);
    if (othersCount > 0) topData.push({ item: "Others", count: othersCount });

    const labels = topData.map(product => product.item);
    const values = topData.map(product => product.count);
    const total = values.reduce((sum, val) => sum + val, 0);
    const backgroundColors = labels.map((_, index) => index < topN ? `hsl(${index * 360 / topN}, 70%, 60%)` : 'hsl(0, 0%, 60%)');

    try {
        productSalesPieChart = new Chart(canvas.getContext("2d"), {
            type: "pie",
            data: { labels, datasets: [{ label: `Product Sales (${periodLabel})`, data: values, backgroundColor: backgroundColors, borderColor: "#fff", borderWidth: 1, hoverOffset: 20 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "right", labels: { font: { size: 14 }, color: "#333", boxWidth: 20, padding: 15, generateLabels: chart => chart.data.labels.map((label, i) => ({ text: `${label}: ${((chart.data.datasets[0].data[i] / total) * 100).toFixed(1)}% (${chart.data.datasets[0].data[i]} units)`, fillStyle: chart.data.datasets[0].backgroundColor[i], strokeStyle: chart.data.datasets[0].borderColor, lineWidth: chart.data.datasets[0].borderWidth, index: i })) } },
                    title: { display: true, text: `Product Sales Distribution (${periodLabel})`, font: { size: 20, weight: "bold" }, color: "#333", padding: 20 },
                    tooltip: { callbacks: { label: context => `${context.label}: ${context.raw} units (${((context.raw / total) * 100).toFixed(1)}%)` }, bodyFont: { size: 14 }, titleFont: { size: 16 } }
                },
                animation: { duration: 1000, easing: "easeOutBounce" },
                elements: { arc: { borderWidth: 2 } },
                layout: { padding: 30 }
            }
        });
        console.log(`Product sales pie chart created for ${periodLabel}`);
    } catch (error) {
        console.error(`Error creating pie chart for ${periodLabel}:`, error);
    }
}

// Update Product Sales Chart
function updateProductSalesChart(period) {
    const productSalesPieCanvas = document.getElementById("productSalesPieChart");
    if (!productSalesPieCanvas) {
        console.error("Product sales pie canvas not found");
        return;
    }

    if (!csvUploaded) {
        const messagesDiv = document.getElementById("messages");
        if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Please upload a CSV file before selecting a period.</div>';
        return;
    }

    const url = `/mba_product_sales/${period}/`;
    fetch(url, { method: "GET", headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': getCSRFToken() } })
    .then(response => {
        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            const messagesDiv = document.getElementById("messages");
            if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">' + data.error + '</div>';
            return;
        }
        if (data.product_sales && data.product_sales.length > 0) {
            createProductSalesPieChart(data.product_sales, productSalesPieCanvas, period.charAt(0).toUpperCase() + period.slice(1));
        } else {
            const messagesDiv = document.getElementById("messages");
            if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">No product sales data available for ' + period + '.</div>';
        }
    })
    .catch(error => {
        console.error(`Error fetching product sales for ${period}:`, error);
        const messagesDiv = document.getElementById("messages");
        if (messagesDiv) messagesDiv.innerHTML = '<div class="p-4 text-sm rounded-lg shadow-md animate-bounceIn bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Failed to load data for ' + period + ': ' + error.message + '</div>';
    });
}