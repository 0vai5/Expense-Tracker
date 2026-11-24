const STORAGE_KEY = "expenseTrackerTransactions";
const CATEGORIES = {
    income: { label: "Income", sign: "+", cls: "plus" },
    necessities: { label: "Necessities", sign: "-", cls: "minus" },
    desires: { label: "Desires", sign: "-", cls: "minus" },
    savings: { label: "Savings", sign: "+", cls: "plus" },
    liabilities: { label: "Liabilities", sign: "-", cls: "minus" }
};
const DESCRIPTION_PATTERN = /^[\p{L}\p{N} .,'&()\-_/]{2,60}$/u;
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

let transactions = [];
let activeFilter = "all";

const $ = (id) => document.getElementById(id);
const form = $("transactionForm");
const descriptionInput = $("description");
const amountInput = $("amount");
const listEl = $("transactionList");
const filtersEl = $("filters");

const formatMoney = (v) => (v < 0 ? "-Rs " : "Rs ") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function isValidTransaction(i) {
    return i && typeof i.id === "number" && typeof i.description === "string" && typeof i.amount === "number" && isFinite(i.amount) && i.amount > 0 && i.category in CATEGORIES;
}

function loadFromLocalStorage() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(parsed) ? parsed.filter(isValidTransaction) : [];
    } catch (error) {
        return [];
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
        alert("Could not save to browser storage. Data may be lost on reload.");
    }
}

function calculateTotals() {
    const t = { income: 0, necessities: 0, desires: 0, savings: 0, liabilities: 0 };
    transactions.forEach((i) => (t[i.category] += i.amount));
    t.expenses = t.necessities + t.desires;
    t.net = t.income + t.savings - (t.expenses + t.liabilities);
    return t;
}

function renderSummary(t) {
    $("netBalance").textContent = formatMoney(t.net);
    $("netBalance").classList.toggle("negative", t.net < 0);
    $("totalIncome").textContent = formatMoney(t.income);
    $("totalExpenses").textContent = formatMoney(t.expenses);
    $("totalLiabilities").textContent = formatMoney(t.liabilities);
    $("sumNecessities").textContent = formatMoney(t.necessities);
    $("sumDesires").textContent = formatMoney(t.desires);
    $("sumSavings").textContent = formatMoney(t.savings);
    $("sumLiabilities").textContent = formatMoney(t.liabilities);
}

function createTransactionElement(item) {
    const meta = CATEGORIES[item.category];
    const li = document.createElement("li");
    li.className = "tx-item";
    li.innerHTML = '<div class="tx-info"><p class="tx-desc"></p><p class="tx-meta"></p></div><span class="tx-amount ' + meta.cls + '"></span><button type="button" class="tx-delete">Delete</button>';
    li.querySelector(".tx-desc").textContent = item.description;
    li.querySelector(".tx-meta").textContent = meta.label + " · " + formatDate(item.id);
    li.querySelector(".tx-amount").textContent = meta.sign + " " + formatMoney(item.amount);
    li.querySelector(".tx-delete").dataset.id = item.id;
    return li;
}

function renderUI() {
    const visible = transactions.filter((i) => activeFilter === "all" || i.category === activeFilter).sort((a, b) => b.id - a.id);
    listEl.replaceChildren(...visible.map(createTransactionElement));
    $("emptyState").classList.toggle("show", !visible.length);
    renderSummary(calculateTotals());
}

function setFieldError(input, message) {
    $(input.id + "Error").textContent = message;
    input.classList.toggle("invalid", Boolean(message));
}

function validateForm(description, amountText) {
    let descriptionError = "";
    let amountError = "";
    if (!description) descriptionError = "Please enter a description.";
    else if (!DESCRIPTION_PATTERN.test(description)) descriptionError = "Use 2 to 60 letters, numbers or basic punctuation.";
    if (!amountText) amountError = "Please enter an amount.";
    else if (!AMOUNT_PATTERN.test(amountText) || !(parseFloat(amountText) > 0)) amountError = "Enter a positive number, up to 2 decimals (e.g. 1500.50).";
    setFieldError(descriptionInput, descriptionError);
    setFieldError(amountInput, amountError);
    return !descriptionError && !amountError;
}

function addTransaction(e) {
    e.preventDefault();
    const description = descriptionInput.value.trim().replace(/\s+/g, " ");
    const amountText = amountInput.value.trim().replace(/,/g, "");
    const category = $("category").value;
    if (!validateForm(description, amountText)) return;
    let id = Date.now();
    while (transactions.some((i) => i.id === id)) id++;
    transactions.push({ id, description, amount: Math.round(parseFloat(amountText) * 100) / 100, category });
    saveToLocalStorage();
    descriptionInput.value = "";
    amountInput.value = "";
    if (activeFilter !== "all" && activeFilter !== category) setActiveFilter("all");
    renderUI();
    descriptionInput.focus();
}

function deleteTransaction(id) {
    transactions = transactions.filter((i) => i.id !== id);
    saveToLocalStorage();
    renderUI();
}

function setActiveFilter(filter) {
    activeFilter = filter;
    filtersEl.querySelectorAll(".filter").forEach((b) => b.classList.toggle("active", b.dataset.filter === filter));
}

function init() {
    transactions = loadFromLocalStorage();
    form.addEventListener("submit", addTransaction);
    filtersEl.addEventListener("click", (e) => {
        const button = e.target.closest(".filter");
        if (!button) return;
        setActiveFilter(button.dataset.filter);
        renderUI();
    });
    listEl.addEventListener("click", (e) => {
        const button = e.target.closest(".tx-delete");
        if (button) deleteTransaction(Number(button.dataset.id));
    });
    $("clearAllBtn").addEventListener("click", () => {
        if (!transactions.length || !confirm("Remove all transactions? This cannot be undone.")) return;
        transactions = [];
        saveToLocalStorage();
        setActiveFilter("all");
        renderUI();
    });
    descriptionInput.addEventListener("input", () => setFieldError(descriptionInput, ""));
    amountInput.addEventListener("input", () => setFieldError(amountInput, ""));
    renderUI();
}

init();
