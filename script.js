/* ==========================================================================
   CABI SNACK - BUYER SCRIPT (SHOWCASE CAROUSEL & ATOMIC CHECKOUT STOCK REDUCTION)
   ========================================================================== */

   import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
   import { 
       getFirestore, collection, doc, onSnapshot, setDoc, writeBatch, serverTimestamp 
   } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
   
   // Konfigurasi Firebase Firestore
   const firebaseConfig = {
       apiKey: "AIzaSyCXfUeDRhVa-3SRDugQ03dLv5y58dG2l5s",
       authDomain: "cabi-1767e.firebaseapp.com",
       projectId: "cabi-1767e",
       storageBucket: "cabi-1767e.firebasestorage.app",
       messagingSenderId: "611248514505",
       appId: "1:611248514505:web:2d869a7d3ab193ff497418"
   };
   
   // Inisialisasi Firebase
   const app = initializeApp(firebaseConfig);
   const db = getFirestore(app);
   
   // Catalog Default jika Database Masih Kosong
   const DEFAULT_PRODUCTS = [
       { id: 'cilok-isi', name: 'Cilok Isi Frozen', price: 23000, img: 'images/cilok-isi-frozen.jpg', desc: 'Cilok beku isi daging & bumbu gurih lumer.', stock: 15 },
       { id: 'cilok-keju', name: 'Cilok Kuah Keju', price: 22000, img: 'images/cilok-kuah-keju-frozen.jpg', desc: 'Cilok kuah keju rich, creamy, dan gurih mantap.', stock: 12 },
       { id: 'og', name: 'Cabin The OG', price: 22000, img: 'images/Cabin-the-OG.jpg', desc: 'Varian original favorit dengan renyah gurih khas.', stock: 10 },
       { id: 'lava', name: 'Cabin Lava Bites', price: 25000, img: 'images/Cabin-Lava-Bites.jpg', desc: 'Sensasi pedas lumer melimpah menggugah selera.', stock: 8 },
       { id: 'diy-keju', name: 'Cabi DIY Keju', price: 28000, img: 'images/Cabi-DIY-Keju.jpg', desc: 'Set snack DIY dengan taburan bubuk keju melimpah.', stock: 5 },
       { id: 'dim-boom', name: 'Dim Boom Classic', price: 24000, img: 'images/Dim-Boom.jpg', desc: 'Dimsum gurih padat isi daging khas Binus.', stock: 20 },
       { id: 'milky-boom', name: 'Milky Boom', price: 18000, img: 'images/Milky-Boom.jpg', desc: 'Minuman olahan susu creamy penawar pedas.', stock: 15 },
       { id: 'teh-manis', name: 'Cabi Teh Manis', price: 8000, img: 'images/cabi-teh-manis.png', desc: 'Es teh manis dingin segar racikan otentik.', stock: 25 }
   ];
   
   const TARGET_WA_NUMBER = "62895346019419";
   
   // State Aplikasi
   let liveProducts = [];
   let orderCart = {};
   let isStoreOpen = true;
   let carouselIndex = 0;
   let carouselInterval = null;
   
   // INISIALISASI AMAN UNTUK ES MODULES
   function initApp() {
       init3DHeroParallax();
       listenToStoreStatus();
       listenToLiveProducts();
   
       const orderForm = document.getElementById('full-order-form');
       if (orderForm) {
           orderForm.addEventListener('submit', handleOrderSubmit);
       }
   }
   
   if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', initApp);
   } else {
       initApp();
   }
   
   // 1. LISTEN STATUS OPERASIONAL TOKO REAL-TIME
   function listenToStoreStatus() {
       const storeDocRef = doc(db, 'settings', 'store');
       onSnapshot(storeDocRef, (docSnap) => {
           if (docSnap.exists()) {
               isStoreOpen = docSnap.data().isOpen ?? true;
           } else {
               setDoc(storeDocRef, { isOpen: true });
               isStoreOpen = true;
           }
           updateStoreStatusUI();
       });
   }
   
   function updateStoreStatusUI() {
       const banner = document.getElementById('store-closed-banner');
       const submitBtn = document.getElementById('submit-wa-btn');
       const mobileSubmitBtn = document.getElementById('mobile-submit-wa-btn');
   
       if (!isStoreOpen) {
           banner?.classList.remove('hidden');
   
           if (submitBtn) {
               submitBtn.disabled = true;
               submitBtn.className = "w-full bg-gray-400 cursor-not-allowed text-white font-heading font-bold py-4 rounded-xl text-sm sm:text-base shadow-lg transition-all flex items-center justify-center space-x-2";
               submitBtn.innerHTML = '<span>Toko Sedang Tutup - Tidak Bisa Memesan</span>';
           }
   
           if (mobileSubmitBtn) {
               mobileSubmitBtn.disabled = true;
               mobileSubmitBtn.className = "w-full bg-gray-400 cursor-not-allowed text-white font-heading font-bold py-3 rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2";
               mobileSubmitBtn.innerHTML = '<span>Toko Sedang Tutup - Tidak Bisa Memesan</span>';
           }
       } else {
           banner?.classList.add('hidden');
   
           if (submitBtn) {
               submitBtn.disabled = false;
               submitBtn.className = "w-full bg-green-600 hover:bg-green-700 text-white font-heading font-bold py-4 rounded-xl text-sm sm:text-base shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center space-x-2";
               submitBtn.innerHTML = '<i class="fa-brands fa-whatsapp text-xl"></i><span>Kirim Pesanan via WhatsApp</span>';
           }
   
           if (mobileSubmitBtn) {
               mobileSubmitBtn.disabled = false;
               mobileSubmitBtn.className = "w-full bg-green-600 hover:bg-green-700 text-white font-heading font-bold py-3 rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2";
               mobileSubmitBtn.innerHTML = '<i class="fa-brands fa-whatsapp text-lg"></i><span>Kirim Pesanan via WhatsApp</span>';
           }
       }
   
       renderMenuCatalog();
       updateShowcaseCarousel();
   }
   
   // 2. LISTEN KATALOG PRODUK REAL-TIME
   function listenToLiveProducts() {
       const productsColRef = collection(db, 'products');
       onSnapshot(productsColRef, (snapshot) => {
           if (snapshot.empty) {
               DEFAULT_PRODUCTS.forEach(item => {
                   setDoc(doc(db, 'products', item.id), item);
               });
               return;
           }
   
           liveProducts = [];
           snapshot.forEach(docSnap => {
               liveProducts.push({ id: docSnap.id, ...docSnap.data() });
           });
   
           renderMenuCatalog();
           calculateTotals();
           startShowcaseCarousel();
       });
   }
   
   // 3. LIVE SHOWCASE CAROUSEL DI HERO SECTION (3.5s ROTATING BANNER)
   function startShowcaseCarousel() {
       if (carouselInterval) clearInterval(carouselInterval);
       updateShowcaseCarousel();
   
       carouselInterval = setInterval(() => {
           if (liveProducts.length > 0) {
               carouselIndex = (carouselIndex + 1) % liveProducts.length;
               updateShowcaseCarousel();
           }
       }, 3500);
   }
   
   function updateShowcaseCarousel() {
       const badgeCard = document.getElementById('floating-badge');
       const imgEl = document.getElementById('carousel-img');
       const titleEl = document.getElementById('carousel-title');
       const badgeEl = document.getElementById('carousel-badge');
       const subEl = document.getElementById('carousel-subtitle');
       const checkEl = document.getElementById('carousel-check');
   
       if (!badgeCard || liveProducts.length === 0) return;
   
       badgeCard.classList.add('opacity-0');
   
       setTimeout(() => {
           const prod = liveProducts[carouselIndex] || liveProducts[0];
           const stock = prod.stock ?? 0;
   
           if (imgEl) {
               imgEl.src = prod.img || 'images/logo-cabi.png';
               imgEl.onerror = () => { imgEl.src = 'images/logo-cabi.png'; };
           }
           if (titleEl) titleEl.innerText = prod.name || 'Cabi Snack';
   
           if (!isStoreOpen) {
               if (badgeEl) {
                   badgeEl.innerText = 'Toko Tutup';
                   badgeEl.className = 'text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap';
               }
               if (subEl) subEl.innerText = 'Pre-Order Ditutup';
               if (checkEl) {
                   checkEl.innerText = '✖';
                   checkEl.className = 'absolute -bottom-1 -right-1 z-20 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white';
               }
           } else if (stock > 5) {
               if (badgeEl) {
                   badgeEl.innerText = 'Stok Aman';
                   badgeEl.className = 'text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap';
               }
               if (subEl) subEl.innerText = `Tersedia ${stock} Porsi`;
               if (checkEl) {
                   checkEl.innerText = '✔';
                   checkEl.className = 'absolute -bottom-1 -right-1 z-20 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white';
               }
           } else if (stock >= 1) {
               if (badgeEl) {
                   badgeEl.innerText = 'Hampir Habis 🔥';
                   badgeEl.className = 'text-[9px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap';
               }
               if (subEl) subEl.innerText = `Sisa ${stock} Porsi Lagi!`;
               if (checkEl) {
                   checkEl.innerText = '⚡';
                   checkEl.className = 'absolute -bottom-1 -right-1 z-20 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white';
               }
           } else {
               if (badgeEl) {
                   badgeEl.innerText = 'Habis';
                   badgeEl.className = 'text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap';
               }
               if (subEl) subEl.innerText = 'Stok Porsi Habis';
               if (checkEl) {
                   checkEl.innerText = '✖';
                   checkEl.className = 'absolute -bottom-1 -right-1 z-20 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white';
               }
           }
   
           badgeCard.classList.remove('opacity-0');
       }, 250);
   }
   
   // 4. RENDER KATALOG MENU LENGKAP
   function renderMenuCatalog() {
       const container = document.getElementById('full-menu-container');
       if (!container) return;
   
       if (liveProducts.length === 0) {
           container.innerHTML = `<div class="text-center py-8 text-gray-500 text-xs">Belum ada menu yang tersedia.</div>`;
           return;
       }
   
       container.innerHTML = liveProducts.map(p => {
           const qty = orderCart[p.id] || 0;
           const isSoldOut = (p.stock || 0) <= 0;
   
           const isPlusDisabled = !isStoreOpen || isSoldOut || qty >= p.stock;
           const isMinusDisabled = qty <= 0;
   
           return `
               <div class="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-orange-200 bg-white transition-all shadow-sm ${isSoldOut ? 'opacity-60 bg-gray-50' : ''}">
                   <div class="flex items-center space-x-3.5">
                       <div class="relative">
                           <img src="${p.img}" alt="${p.name}" class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl bg-gray-100 flex-shrink-0" onerror="this.src='images/logo-cabi.png'">
                           ${isSoldOut ? '<span class="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">Habis</span>' : ''}
                       </div>
                       <div>
                           <h3 class="font-heading font-bold text-sm sm:text-base text-cabi-dark">${p.name}</h3>
                           <p class="text-[11px] sm:text-xs text-gray-500 line-clamp-1 mb-1">${p.desc}</p>
                           <div class="flex items-center space-x-2">
                               <span class="font-bold text-xs sm:text-sm text-cabi-orange">Rp ${(p.price || 0).toLocaleString('id-ID')}</span>
                               <span class="text-[10px] text-gray-400 font-semibold">Stok: ${p.stock || 0}</span>
                           </div>
                       </div>
                   </div>
   
                   <!-- Quantity Selector -->
                   <div class="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 flex-shrink-0">
                       <button type="button" onclick="updateItemQty('${p.id}', -1)" ${isMinusDisabled ? 'disabled' : ''} class="qty-btn w-7 h-7 sm:w-8 sm:h-8 bg-white text-gray-700 font-bold text-xs sm:text-sm rounded-lg shadow-sm hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center transition">
                           -
                       </button>
                       <span class="text-xs sm:text-sm font-bold w-6 text-center text-gray-800">${qty}</span>
                       <button type="button" onclick="updateItemQty('${p.id}', 1)" ${isPlusDisabled ? 'disabled' : ''} class="qty-btn w-7 h-7 sm:w-8 sm:h-8 bg-cabi-orange text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm hover:bg-orange-600 disabled:opacity-40 flex items-center justify-center transition">
                           +
                       </button>
                   </div>
               </div>
           `;
       }).join('');
   }
   
   // 5. PEMBARUAN KERANJANG DAN BIAYA (BEBAS BIAYA LAYANAN)
   window.updateItemQty = function(productId, delta) {
       if (!isStoreOpen && delta > 0) return;
   
       const prod = liveProducts.find(p => p.id === productId);
       if (!prod) return;
   
       const currentQty = orderCart[productId] || 0;
       const newQty = Math.max(0, currentQty + delta);
   
       if (newQty > prod.stock) {
           alert(`Maaf, stok ${prod.name} tersisa ${prod.stock} porsi.`);
           return;
       }
   
       orderCart[productId] = newQty;
       renderMenuCatalog();
       calculateTotals();
   };
   
   function calculateTotals() {
       let subtotal = 0;
       let totalItems = 0;
   
       liveProducts.forEach(p => {
           const qty = orderCart[p.id] || 0;
           if (qty > 0) {
               subtotal += (p.price || 0) * qty;
               totalItems += qty;
           }
       });
   
       const total = subtotal;
   
       const subtotalEl = document.getElementById('summary-subtotal');
       if (subtotalEl) subtotalEl.innerText = 'Rp ' + subtotal.toLocaleString('id-ID');
   
       const totalEl = document.getElementById('summary-total');
       if (totalEl) totalEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
   
       const mobileTotalEl = document.getElementById('mobile-sticky-total');
       if (mobileTotalEl) mobileTotalEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
   
       const countEl = document.getElementById('selected-items-count');
       if (countEl) countEl.innerText = `${totalItems} Porsi Dipilih`;
   }
   
   // 6. NAVIGASI LAYAR PEMESANAN (SPA DOM TOGGLE)
   window.showOrderPage = function() {
       document.getElementById('landing-page-view').classList.add('hidden');
       document.getElementById('order-page-view').classList.remove('hidden');
       window.scrollTo({ top: 0, behavior: 'smooth' });
   };
   
   window.showLandingPage = function() {
       document.getElementById('order-page-view').classList.add('hidden');
       document.getElementById('landing-page-view').classList.remove('hidden');
       window.scrollTo({ top: 0, behavior: 'smooth' });
   };
   
   // Menutup Modal Sukses & Kembali ke Menu Utama
   window.closeSuccessModal = function() {
       const modal = document.getElementById('order-success-modal');
       if (modal) modal.classList.add('hidden');
       window.showLandingPage();
   };
   
   // 7. EFEK 3D MOUSE PARALLAX HERO SECTION
   function init3DHeroParallax() {
       const heroSection = document.getElementById('hero-section');
       const phoneMockup = document.getElementById('phone-mockup');
       const floatingBadge = document.getElementById('floating-badge');
   
       if (!heroSection || !phoneMockup) return;
   
       heroSection.addEventListener('mousemove', (e) => {
           const rect = heroSection.getBoundingClientRect();
           const mouseX = e.clientX - rect.left;
           const mouseY = e.clientY - rect.top;
           const centerX = rect.width / 2;
           const centerY = rect.height / 2;
   
           const rotateX = -((mouseY - centerY) / centerY) * 14;
           const rotateY = ((mouseX - centerX) / centerX) * 14;
   
           phoneMockup.style.transition = 'transform 0.1s ease-out';
           phoneMockup.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
   
           if (floatingBadge) {
               const badgeX = ((mouseX - centerX) / centerX) * 20;
               const badgeY = ((mouseY - centerY) / centerY) * 20;
               floatingBadge.style.transition = 'transform 0.12s ease-out';
               floatingBadge.style.transform = `translate3d(${badgeX.toFixed(2)}px, ${badgeY.toFixed(2)}px, 35px)`;
           }
       });
   
       heroSection.addEventListener('mouseleave', () => {
           phoneMockup.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
           phoneMockup.style.transform = 'rotateX(0deg) rotateY(0deg)';
   
           if (floatingBadge) {
               floatingBadge.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
               floatingBadge.style.transform = 'translate3d(0px, 0px, 0px)';
           }
       });
   }
   
   // 8. CHECKOUT ATOMIK (SIMPAN PESANAN, LACAK GA4, & POTONG STOK OTOMATIS)
   window.triggerOrderSubmit = function() {
       const form = document.getElementById('full-order-form');
       if (form.reportValidity()) {
           form.requestSubmit();
       }
   };
   
   async function handleOrderSubmit(event) {
       event.preventDefault();
   
       if (!isStoreOpen) {
           alert('Toko sedang TUTUP. Tidak dapat memproses pemesanan saat ini.');
           return;
       }
   
       const name = document.getElementById('order-cust-name').value.trim();
       const phone = document.getElementById('order-cust-phone').value.trim();
       const method = document.getElementById('order-cust-method').value.trim();
       const time = document.getElementById('order-cust-time').value.trim();
       const notes = document.getElementById('order-cust-location').value.trim();
   
       let itemsArray = [];
       let itemsText = "";
       let subtotal = 0;
       let totalItems = 0;
   
       // 1. Pengecekan stok terakhir sebelum proses pemesanan
       for (const [prodId, qty] of Object.entries(orderCart)) {
           if (qty > 0) {
               const prod = liveProducts.find(p => p.id === prodId);
               if (!prod) continue;
   
               const currentStock = prod.stock ?? 0;
               if (qty > currentStock) {
                   alert(`Stok untuk menu "${prod.name}" tidak mencukupi!\n\nSisa stok: ${currentStock}\nJumlah dipesan: ${qty}\n\nSilakan kurangi jumlah porsi pesanan Anda.`);
                   return;
               }
   
               totalItems += qty;
               const itemTotal = prod.price * qty;
               subtotal += itemTotal;
               itemsText += `- ${prod.name} x${qty} = Rp ${itemTotal.toLocaleString('id-ID')}\n`;
   
               itemsArray.push({
                   id: prod.id,
                   name: prod.name,
                   qty: qty,
                   price: prod.price
               });
           }
       }
   
       if (totalItems === 0) {
           alert('Silakan pilih minimal 1 porsi menu sebelum mengirim pesanan.');
           return;
       }
   
       const grandTotal = subtotal;
   
       // 2. Operasi Atomik: Simpan Dokumen Pesanan (PENDING) & Potong Stok Produk di Firestore
       const newOrderRef = doc(collection(db, 'orders'));
       const orderDocId = newOrderRef.id;
       const shortId = `#${orderDocId.substring(0, 6).toUpperCase()}`;
   
       try {
           const batch = writeBatch(db);
   
           // Simpan data pesanan baru berstatus PENDING (tanpa biaya layanan)
           const orderData = {
               name: name,
               phone: phone,
               method: method,
               time: time,
               notes: notes ? notes : '-',
               items: itemsArray,
               subtotal: subtotal,
               serviceFee: 0,
               totalPrice: grandTotal,
               status: "PENDING",
               createdAt: serverTimestamp()
           };
           batch.set(newOrderRef, orderData);
   
           // Kurangi stok setiap produk yang dipesan di koleksi products
           for (const item of itemsArray) {
               const prod = liveProducts.find(p => p.id === item.id);
               const currentStock = prod ? (prod.stock ?? 0) : 0;
               const prodRef = doc(db, 'products', item.id);
               batch.update(prodRef, { stock: Math.max(0, currentStock - item.qty) });
           }
   
           await batch.commit();
       } catch (err) {
           console.error("Gagal memproses pesanan dan pemotongan stok:", err);
           alert("Terjadi ralat saat mengirim data pesanan ke database. Silakan coba lagi.");
           return;
       }
   
       // 3. Susun Draf Pesan WhatsApp Bersih & Sederhana
       let message = "Halo Admin Cabi Snack, saya ingin memesan:\n\n";
       message += `ID Order: ${shortId}\n\n`;
       message += "Data Pemesan:\n";
       message += `Nama: ${name}\n`;
       message += `No. WhatsApp: ${phone}\n`;
       message += `Metode: ${method}\n`;
       message += `Jam Ambil: ${time}\n`;
       message += `Catatan: ${notes ? notes : '-'}\n\n`;
       message += "Detail Pesanan:\n";
       message += itemsText.trimEnd() + "\n\n";
       message += `Total Pembayaran: Rp ${grandTotal.toLocaleString('id-ID')}\n\n`;
       message += "Mohon diproses ya. Terima kasih!";
   
       const encodedMessage = encodeURIComponent(message);
       const waUrl = `https://wa.me/${TARGET_WA_NUMBER}?text=${encodedMessage}`;
   
       // 4. Lacak Event Konversi Checkout ke Google Analytics 4 (GA4)
       if (typeof gtag === 'function') {
           gtag('event', 'generate_lead', {
               event_category: 'Checkout',
               event_label: 'Tombol WhatsApp Diklik',
               value: grandTotal,
               currency: 'IDR',
               order_id: shortId
           });
       }
   
       // 5. Buka WhatsApp
       window.open(waUrl, '_blank');
   
       // 6. Tampilkan Modal Pop-up Sukses
       const successModal = document.getElementById('order-success-modal');
       const successIdEl = document.getElementById('success-order-id');
       if (successIdEl) successIdEl.innerText = shortId;
       if (successModal) successModal.classList.remove('hidden');
   
       // 7. Reset Formulir & Kosongkan Keranjang Belanja
       const form = document.getElementById('full-order-form');
       if (form) {
           form.reset();
           const methodSelect = document.getElementById('order-cust-method');
           const timeSelect = document.getElementById('order-cust-time');
           if (methodSelect) methodSelect.value = 'Pick up di Kampus';
           if (timeSelect) timeSelect.value = '12:00 WIB';
       }
   
       orderCart = {};
       renderMenuCatalog();
       calculateTotals();
   }
