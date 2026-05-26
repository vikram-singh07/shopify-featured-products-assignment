document.addEventListener('DOMContentLoaded', () => {

  const productGrid = document.querySelector('#product-grid');
  const renderedProductIds = new Set();

  if (!productGrid) return;

  const featuredData = document.querySelector('#featured-products-data');
  const normalData = document.querySelector('#normal-products-data');

  if (!featuredData || !normalData) return;

  const featuredProducts = JSON.parse(featuredData.textContent);
  const normalProducts = JSON.parse(normalData.textContent);

  const initialProducts = [
    ...featuredProducts,
    ...normalProducts
  ];

  let currentPage = 2;
let isLoading = false;
let hasMoreProducts = true;

  productGrid.innerHTML = '';

  initialProducts.forEach(product => {

    
    const item = document.createElement('li');
    
    renderedProductIds.add(String(product.id));

    item.className = 'grid__item';

    item.innerHTML = `
  <div class="card-wrapper featured-card">

    ${product.isFeatured ? `
      <span class="featured-badge">Featured</span>
    ` : ''}

    <a href="${product.url}">
      <img src="${product.image}" alt="${product.title}" style="width:100%;">
      <h3>${product.title}</h3>
      <p>${product.price}</p>
    </a>

  </div>
`;

    productGrid.appendChild(item);

  });


  async function loadMoreProducts() {

  if (isLoading || !hasMoreProducts) return;

  isLoading = true;

  try {

    const response = await fetch(
      `${window.location.pathname}?view=ajax&page=${currentPage}`
    );

    const html = await response.text();

    const parser = new DOMParser();

    const doc = parser.parseFromString(html, 'text/html');

    const products = doc.querySelectorAll('.ajax-product-card');

    if (products.length === 0) {
      hasMoreProducts = false;
      return;
    }

    let addedCount = 0;

    products.forEach(product => {

      const productId = product.dataset.productId;

      if (renderedProductIds.has(productId)) return;

      renderedProductIds.add(productId);

      const item = document.createElement('li');

      item.className = 'grid__item';

      item.innerHTML = product.innerHTML;

      productGrid.appendChild(item);

      addedCount++;

    });

    if (addedCount === 0) {
      hasMoreProducts = false;
    }

    currentPage++;

  } catch (error) {

    console.error('Infinite scroll error:', error);

  } finally {

    isLoading = false;

  }

}


window.addEventListener('scroll', () => {

  const scrollPosition =
    window.innerHeight + window.scrollY;

  const pageHeight =
    document.body.offsetHeight;

  if (scrollPosition >= pageHeight - 500) {

    loadMoreProducts();

  }

});

});