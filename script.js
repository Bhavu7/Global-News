// Configuration
const API_KEYS = {
  newsapi: (typeof process !== 'undefined' && process.env && process.env.NEWSAPI_KEY) || "2bc8d27aae254aaca3ddbb7327c19dbd", // Fallback for local dev
  gnews: (typeof process !== 'undefined' && process.env && process.env.GNEWS_KEY) || "fef48df4fdad13f6c52033b4278515b4",
  mediastack: (typeof process !== 'undefined' && process.env && process.env.MEDIASTACK_KEY) || "71abb6c5fc1aebd57b299c8f12173d5f",
};
const API_URLS = {
  newsapi: "https://newsapi.org/v2/top-headlines",
  gnews: "https://gnews.io/api/v4/top-headlines",
  mediastack: "http://api.mediastack.com/v1/news",
};
const PAGE_SIZE = 9;
let currentPage = 1;
let currentCategory = "all";
let isLoading = false;
let currentApi = "newsapi";

// Determine if running locally
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// DOM Elements
const newsGrid = document.getElementById("news-grid");
const loader = document.getElementById("loader");
const categoryButtons = document.querySelectorAll(".category-btn");
const searchInput = document.getElementById("search");
const themeToggle = document.getElementById("theme-toggle");
const newsModal = document.getElementById("news-modal");
const modalContent = document.getElementById("modal-content");
const closeModal = document.getElementById("close-modal");
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");

// Category Mappings for APIs
const CATEGORY_MAPPINGS = {
  newsapi: {
    all: "",
    india: "country=in",
    world: "category=general",
    technology: "category=technology",
    business: "category=business",
    sports: "category=sports",
    health: "category=health",
    science: "category=science",
    entertainment: "category=entertainment",
  },
  gnews: {
    all: "lang=en",
    india: "country=in&lang=en",
    world: "topic=breaking-news&lang=en",
    technology: "topic=technology&lang=en",
    business: "topic=business&lang=en",
    sports: "topic=sports&lang=en",
    health: "topic=health&lang=en",
    science: "topic=science&lang=en",
    entertainment: "topic=entertainment&lang=en",
  },
  mediastack: {
    all: "languages=en",
    india: "countries=in&languages=en",
    world: "categories=general&languages=en",
    technology: "categories=technology&languages=en",
    business: "categories=business&languages=en",
    sports: "categories=sports&languages=en",
    health: "categories=health&languages=en",
    science: "categories=science&languages=en",
    entertainment: "categories=entertainment&languages=en",
  },
};

// Fetch News from Multiple APIs
async function fetchNews(category = "all", page = 1, query = "") {
  if (isLoading) return [];
  isLoading = true;
  loader.classList.remove("hidden");

  let url,
    articles = [];
  try {
    console.log(`Attempting ${currentApi} for category: ${category}, page: ${page}, query: ${query}`);
    if (currentApi === "newsapi") {
      url = `${API_URLS.newsapi}?pageSize=${PAGE_SIZE}&page=${page}&apiKey=${API_KEYS.newsapi}&language=en`;
      const categoryParam = CATEGORY_MAPPINGS.newsapi[category] || "";
      if (categoryParam) url += `&${categoryParam}`;
      if (query) url += `&q=${encodeURIComponent(query)}`;
      console.log(`NewsAPI URL: ${url}`);
      const fetchUrl = isLocal ? url : `/api/proxy?api=newsapi&url=${encodeURIComponent(url)}`;
      const response = await fetch(fetchUrl);
      const text = await response.text();
      console.log(`NewsAPI response status: ${response.status}, body: ${text}`);
      if (!response.ok) {
        const errorData = JSON.parse(text);
        throw new Error(`NewsAPI request failed: ${errorData.message || response.statusText}`);
      }
      const data = JSON.parse(text);
      articles = data.articles || [];
      console.log(`NewsAPI articles: ${articles.length}`);
    } else if (currentApi === "gnews") {
      url = `${API_URLS.gnews}?max=${PAGE_SIZE}&page=${page}&token=${API_KEYS.gnews}`;
      const categoryParam = CATEGORY_MAPPINGS.gnews[category] || "";
      if (categoryParam) url += `&${categoryParam}`;
      if (query) url += `&q=${encodeURIComponent(query)}`;
      console.log(`GNews URL: ${url}`);
      const fetchUrl = isLocal ? url : `/api/proxy?api=gnews&url=${encodeURIComponent(url)}`;
      const response = await fetch(fetchUrl);
      const text = await response.text();
      console.log(`GNews response status: ${response.status}, body: ${text}`);
      if (!response.ok) {
        const errorData = JSON.parse(text);
        throw new Error(`GNews request failed: ${errorData.message || response.statusText}`);
      }
      const data = JSON.parse(text);
      articles = data.articles.map((article) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedAt: article.publishedAt,
      }));
      console.log(`GNews articles: ${articles.length}`);
    } else if (currentApi === "mediastack") {
      url = `${API_URLS.mediastack}?access_key=${
        API_KEYS.mediastack
      }&limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`;
      const categoryParam = CATEGORY_MAPPINGS.mediastack[category] || "";
      if (categoryParam) url += `&${categoryParam}`;
      if (query) url += `&keywords=${encodeURIComponent(query)}`;
      console.log(`Mediastack URL: ${url}`);
      const fetchUrl = isLocal ? url : `/api/proxy?api=mediastack&url=${encodeURIComponent(url)}`;
      const response = await fetch(fetchUrl);
      const text = await response.text();
      console.log(`Mediastack response status: ${response.status}, body: ${text}`);
      if (!response.ok) {
        const errorData = JSON.parse(text);
        throw new Error(`Mediastack request failed: ${errorData.message || response.statusText}`);
      }
      const data = JSON.parse(text);
      articles = data.data.map((article) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedAt: article.published_at,
      }));
      console.log(`Mediastack articles: ${articles.length}`);
    }
    return articles.filter((article) => article.title && article.url);
  } catch (error) {
    console.error(`Error fetching news from ${currentApi}: ${error.message}`);
    const apis = Object.keys(API_URLS);
    const currentIndex = apis.indexOf(currentApi);
    currentApi = apis[(currentIndex + 1) % apis.length];
    if (currentIndex < apis.length - 1) {
      isLoading = false;
      return await fetchNews(category, page, query);
    }
    newsGrid.innerHTML = `
      <p class="text-center col-span-full text-gray-500 dark:text-gray-400">
        Failed to load news for "${category}". Error: ${error.message}. Please check your API key or try again later.
      </p>
    `;
    return [];
  } finally {
    isLoading = false;
    loader.classList.add("hidden");
  }
}

// Display News
function displayNews(articles, append = false) {
  if (!append) newsGrid.innerHTML = "";
  if (articles.length === 0) {
    newsGrid.innerHTML = `
      <p class="text-center col-span-full text-gray-500 dark:text-gray-400">
        No news found for "${currentCategory}". Try another category or search term.
      </p>
    `;
    return;
  }

  articles.forEach((article, index) => {
    const card = document.createElement("div");
    card.className = "news-card animate";
    card.style.animationDelay = `${index * 0.1}s`;
    card.innerHTML = `
      <img src="${
        article.urlToImage ||
        "https://via.placeholder.com/300x200?text=No+Image"
      }" alt="${article.title}" class="rounded-t-lg" loading="lazy">
      <div class="news-card-content">
        <h3 class="text-xl font-semibold line-clamp-2 text-gray-900 dark:text-gray-100">${article.title}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${new Date(
          article.publishedAt
        ).toLocaleDateString()}</p>
        <p class="text-gray-600 dark:text-gray-300 mt-2 line-clamp-3 text-sm">${article.description || "No description available."}</p>
        <div class="flex items-center gap-2 mt-4">
          <button class="read-more text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors duration-200" data-url="${
            article.url
          }" data-title="${article.title}" data-description="${
      article.description || ""
    }" data-image="${article.urlToImage || ""}" data-date="${
      article.publishedAt
    }" aria-label="Read more about ${article.title}">Read more</button>
        </div>
      </div>
    `;
    newsGrid.appendChild(card);
  });

  setTimeout(() => {
    document.querySelectorAll(".animate").forEach((card) => {
      card.style.animation = "fadeIn 0.5s ease-out forwards";
    });
  }, 100);

  // Read More Handlers
  document.querySelectorAll(".read-more").forEach((button) => {
    button.addEventListener("click", () => {
      const { url, title, description, image, date } = button.dataset;
      modalContent.innerHTML = `
        <img src="${
          image || "https://via.placeholder.com/300x200?text=No+Image"
        }" alt="${title}" class="rounded-lg mb-4">
        <h2 class="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">${title}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${new Date(
          date
        ).toLocaleDateString()}</p>
        <p class="text-gray-700 dark:text-gray-300 mb-4">${description || "No description available."}</p>
        <a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200" aria-label="Visit original article">Visit original article</a>
      `;
      newsModal.classList.remove("hidden");
    });
  });
}

// Infinite Scroll
function handleInfiniteScroll() {
  if (
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
    !isLoading
  ) {
    currentPage++;
    fetchNews(currentCategory, currentPage, searchInput.value).then(
      (articles) => {
        displayNews(articles, true);
      }
    );
  }
}

// Category Filter
categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentCategory = button.dataset.category;
    currentPage = 1;
    currentApi = currentCategory === "india" ? "gnews" : "newsapi"; // Use GNews for India
    fetchNews(currentCategory, currentPage, searchInput.value).then(
      displayNews
    );
  });
});

// Search
searchInput.addEventListener(
  "input",
  debounce(() => {
    currentPage = 1;
    currentApi = "newsapi";
    fetchNews(currentCategory, currentPage, searchInput.value).then(
      displayNews
    );
  }, 500)
);

// Dark/Light Mode Toggle
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
});

// Modal Close
closeModal.addEventListener("click", () => {
  newsModal.classList.add("hidden");
});

// Click Outside to Close Modal
newsModal.addEventListener("click", (e) => {
  if (e.target === newsModal) {
    newsModal.classList.add("hidden");
  }
});

// Mobile Menu Toggle
menuToggle.addEventListener("click", () => {
  navMenu.classList.toggle("active");
});

// Debounce Utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Smooth Scroll for Logo
document.addEventListener('DOMContentLoaded', () => {
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});

// Newsletter Subscription
function initNewsletter() {
  const newsletterForm = document.getElementById('newsletter-form');
  const emailInput = document.getElementById('newsletter-email');
  const subscribeBtn = document.getElementById('subscribe-btn');
  const unsubscribeBtn = document.getElementById('unsubscribe-btn');

  // Load subscribed email from localStorage
  const subscribedEmail = localStorage.getItem('subscribedEmail');
  if (subscribedEmail) {
    emailInput.value = subscribedEmail;
    subscribeBtn.classList.add('hidden');
    unsubscribeBtn.classList.remove('hidden');
  }

  // Subscribe
  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return alert('Please enter a valid email.');

    try {
      // Fetch latest news
      const articles = await fetchNews(currentCategory, 1, '');
      const newsContent = articles.slice(0, 3).map(article => `
        <h3>${article.title}</h3>
        <p>${article.description || 'No description available.'}</p>
        <a href="${article.url}">Read more</a>
      `).join('<hr>');

      // Simulate email sending
      const emailParams = {
        to_email: email,
        subject: `Global News Hub - Latest ${currentCategory} News`,
        message: `
          <h2>Latest News Updates</h2>
          ${newsContent}
          <p><a href="https://yourwebsite.com/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>
        `
      };

      await emailjs.send('service_ulb02e1', 'template_9nbx0qd', emailParams);

      localStorage.setItem('subscribedEmail', email);
      subscribeBtn.classList.add('hidden');
      unsubscribeBtn.classList.remove('hidden');
      alert(`Subscribed! Latest ${currentCategory} news would be sent to ${email}. (Check console for demo output)`);
      console.log('Email content:', emailParams);
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to subscribe. Please try again.');
    }
  });

  // Unsubscribe
  unsubscribeBtn.addEventListener('click', () => {
    localStorage.removeItem('subscribedEmail');
    emailInput.value = '';
    subscribeBtn.classList.remove('hidden');
    unsubscribeBtn.classList.add('hidden');
    alert('Unsubscribed successfully.');
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
  fetchNews('all', 1).then(displayNews);
  window.addEventListener('scroll', handleInfiniteScroll);
  initNewsletter();

  // Category links in footer
  document.querySelectorAll('.category-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const category = link.dataset.category;
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelector(`.category-btn[data-category="${category}"]`)?.classList.add('active');
      currentCategory = category;
      currentPage = 1;
      currentApi = 'newsapi';
      fetchNews(currentCategory, currentPage, searchInput.value).then(displayNews);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Keyboard navigation for modal
  newsModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      newsModal.classList.add('hidden');
    }
  });
});