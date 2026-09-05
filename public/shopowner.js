import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, addDoc, doc, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ---------- Firebase config (from your snippet) ----------
const firebaseConfig = {
  apiKey: "AIzaSyCF5UAd7gRtnVr9AcQLGFDcYicopiLs5Fg",
  authDomain: "organic-fertilizer-deller.firebaseapp.com",
  projectId: "organic-fertilizer-deller",
  storageBucket: "organic-fertilizer-deller.firebasestorage.app",
  messagingSenderId: "238320479281",
  appId: "1:238320479281:web:17d5a09ed2bdd86e873910",
  measurementId: "G-BDK5S74XTR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    // UI refs
    const sellersEl = document.getElementById('sellers');
    const productsListEl = document.getElementById('products-list');
    const productsTitleEl = document.getElementById('products-title');
    const searchEl = document.getElementById('search');
    const btnShowAll = document.getElementById('btn-show-all');
    const btnMyOrders = document.getElementById('btn-my-orders');
    const btnLogout = document.getElementById('btn-logout');
    const ordersView = document.getElementById('orders-view');
    const productsView = document.getElementById('products-view');
    const contactView = document.getElementById('contact-view');
    const ordersListEl = document.getElementById('orders-list');
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');
    const messageModal = document.getElementById('messageModal');
    const msgToSeller = document.getElementById('msg-to-seller');
    const msgSubject = document.getElementById('msg-subject');
    const msgBody = document.getElementById('msg-body');
    const sendToSellerBtn = document.getElementById('send-to-seller');

    const cardMessage = document.getElementById('card-message');
    const feedbackModal = document.getElementById('feedbackModal');
    const feedbackSubmit = document.getElementById('feedbackSubmit');

    let currentUser = null;
    let currentSellerFilter = null;

    // AUTH UI (logout)
    if (btnLogout) btnLogout.addEventListener('click', async () => {
        try { await signOut(auth); alert('Signed out'); }
        catch (e) { console.error(e); }
    });

    onAuthStateChanged(auth, async user => {
        currentUser = user;
        if (user) {
            // show logout
            if (btnLogout) btnLogout.style.display = 'inline-block';
            loadMyOrders();
        } else {
            if (btnLogout) btnLogout.style.display = 'none';
            if (ordersListEl) ordersListEl.innerHTML = '<div>Please login to view orders</div>';
        }
    });

    // LOAD SELLERS
    async function loadSellers() {
        if (!sellersEl) return;
        sellersEl.innerHTML = '<li>Loading...</li>';
        try {
            const snap = await getDocs(collection(db, 'sellers'));
            sellersEl.innerHTML = '';
            let count = 0;
            snap.forEach(s => {
                count++;
                const data = s.data();
                const li = document.createElement('li');
                li.innerHTML = `<div style="font-weight:600">${data.name || 'Unnamed'}</div>
                            <div style="font-size:12px;color:#666">${data.city || ''}</div>`;
                li.addEventListener('click', () => { currentSellerFilter = s.id; showProductsBySeller(s.id, data.name); });
                sellersEl.appendChild(li);
            });
            const cardSellers = document.getElementById('card-sellers');
            if (cardSellers) cardSellers.textContent = count;
        } catch (err) {
            console.error('loadSellers err', err);
            sellersEl.innerHTML = '<li>Error loading sellers</li>';
        }
    }

    // SHOW PRODUCTS
    if (btnShowAll) btnShowAll.addEventListener('click', () => { currentSellerFilter = null; showAllProducts(); });
    async function showAllProducts() {
        if (productsTitleEl) productsTitleEl.textContent = 'All Products';
        if (productsView) productsView.classList.remove('hidden');
        if (ordersView) ordersView.classList.add('hidden');
        if (contactView) contactView.classList.add('hidden');
        try {
            const snap = await getDocs(collection(db, 'products'));
            renderProducts(snap);
        } catch (e) { console.error(e); productsListEl.innerHTML = '<div>Error loading products</div>'; }
    }

    async function showProductsBySeller(sellerId, sellerName) {
        if (productsTitleEl) productsTitleEl.textContent = `Products by ${sellerName || sellerId}`;
        if (productsView) productsView.classList.remove('hidden');
        if (ordersView) ordersView.classList.add('hidden');
        if (contactView) contactView.classList.add('hidden');
        try {
            const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
            const snap = await getDocs(q);
            renderProducts(snap);
        } catch (e) { console.error(e); productsListEl.innerHTML = '<div>Error loading products</div>'; }
    }

    window.renderProducts = function (snap) {
        if (!productsListEl) return;
        productsListEl.innerHTML = '';
        let count = 0;

        snap.forEach(docSnap => {
            count++;
            const data = docSnap.data();

            // match fields from addProduct
            const productName = data.name || 'Unnamed';
            const productPrice = data.price || 0;
            const productDescription = data.description || '';
            const productImage = data.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image';
            const stock = data.stock;

            const div = document.createElement('div');
            div.className = 'product';
            div.innerHTML = `
                <img src="${productImage}" alt="${productName}" />
                <div class="meta">
                  <h3>${productName}</h3>
                  <p>${productDescription.substring(0, 180)}</p>
                  <div style="margin-top:8px;font-size:13px;color:#555">Stock: ${stock}</div>
                </div>
                <div class="actions">
                  <div style="font-weight:700;font-size:18px">₹ ${productPrice}</div>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    <button class="add-button btn-buy">Buy</button>
                  </div>
                </div>
            `;
            productsListEl.appendChild(div);

            const buyBtn = div.querySelector('.btn-buy');
            if (buyBtn) {
                buyBtn.addEventListener('click', () => buyProduct(docSnap.id, data));
            }
        });

        const cardProducts = document.getElementById('card-products');
        if (cardProducts) cardProducts.textContent = count;
    };

    async function buyProduct(productId, productData) {
        // Ask quantity from user
        const qty = parseInt(prompt(`Enter quantity for ${productData.name || 'this product'}:`), 10);

        if (!qty || qty <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        // Calculate total price
        const totalPrice = (productData.price || 0) * qty;

        try {
            await addDoc(collection(db, 'orders'), {
                productId: productId,
                productName: productData.name || 'Unnamed',
                price: productData.price || 0,
                quantity: qty,
                total: totalPrice,
                buyerUid: currentUser.uid, // logged-in buyer
                sellerUid: productData.sellerUid || null,
                createdAt: serverTimestamp()
            });

            alert(`Order placed! Total ₹${totalPrice}`);
        } catch (err) {
            console.error("Error placing order:", err);
            alert("Something went wrong while placing the order.");
        }
    }




    // LOAD ORDERS
    let ordersUnsubscribe = null;

    function loadMyOrders() {
        if (!ordersListEl) return;

        if (!currentUser) {
            if (ordersUnsubscribe) { ordersUnsubscribe(); ordersUnsubscribe = null; }
            ordersListEl.innerHTML = '<div>Please login to see your orders.</div>';
            const cardOrders = document.getElementById('card-orders');
            if (cardOrders) cardOrders.textContent = 0;
            return;
        }

        const q = query(collection(db, 'orders'), where('buyerUid', '==', currentUser.uid));

        // stop old listener
        if (ordersUnsubscribe) {
            ordersUnsubscribe();
            ordersUnsubscribe = null;
        }

        ordersUnsubscribe = onSnapshot(q, (snap) => {
            ordersListEl.innerHTML = '';
            let count = 0;
            snap.forEach(docSnap => {
                count++;
                const o = docSnap.data();

                const el = document.createElement('div');
                el.className = 'card';
                el.style.marginBottom = '8px';
                el.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <b>${o.productName || 'Untitled'}</b>
                  </br>
                  <div style="font-size:13px;color:#666">Qty: ${o.quantity || 1}</div>
                  </br>
                  <div style="font-weight:700">${'Status'}</div>
                </div>
                </br>
                <div style="text-align:right">
                  <div>₹ ${o.total ?? o.price ?? 0}</div>

                </div>
              </div>`;
                ordersListEl.appendChild(el);
            });

            const cardOrders = document.getElementById('card-orders');
            if (cardOrders) cardOrders.textContent = count;
        }, (err) => {
            console.error('Error loading orders:', err);
            ordersListEl.innerHTML = '<div>Error loading orders</div>';
        });
        if (ordersView) ordersView.classList.remove('hidden');
        //if (contactView) contactView.classList.add('hidden');
        loadMyOrders();
    }


    // CONTACT (Message Us card opens feedback modal)
    if (cardMessage) {
        cardMessage.addEventListener('click', () => {
            // show contact-view modal area OR show feedback modal
            // We'll open feedback modal (popup)
            openFeedback();
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) { contactStatus.textContent = 'Please login first.'; return; }
            const subject = document.getElementById('contact-subject').value.trim();
            const message = document.getElementById('contact-message').value.trim();
            if (!subject || !message) { contactStatus.textContent = 'Subject & message required.'; return; }
            try {
                await addDoc(collection(db, 'messages'), { uid: currentUser.uid, subject, message, createdAt: serverTimestamp() });
                contactStatus.textContent = 'Message sent. We will reply soon.';
                contactForm.reset();
            } catch (err) { console.error(err); contactStatus.textContent = 'Send failed.'; }
        });
    }

    // MESSAGE MODAL
    window.openMessageModal = function (productId, sellerName) {
        if (!messageModal || !msgToSeller) return;
        messageModal.style.display = 'flex';
        msgToSeller.value = sellerName || '';
        msgSubject.value = '';
        msgBody.value = '';
        document.getElementById('msg-status').textContent = '';
        sendToSellerBtn.dataset.productId = productId;
    };
    window.closeMessageModal = function () {
        if (!messageModal) return;
        messageModal.style.display = 'none';
        sendToSellerBtn.dataset.productId = '';
    };
    if (sendToSellerBtn) {
        sendToSellerBtn.addEventListener('click', async () => {
            const productId = sendToSellerBtn.dataset.productId;
            const subject = msgSubject.value.trim();
            const body = msgBody.value.trim();
            if (!subject || !body) { document.getElementById('msg-status').textContent = 'Subject & message required'; return; }
            try {
                await addDoc(collection(db, 'sellerMessages'), {
                    productId,
                    fromUid: currentUser ? currentUser.uid : null,
                    subject,
                    body,
                    createdAt: serverTimestamp()
                });
                document.getElementById('msg-status').textContent = 'Message sent to seller.';
                msgSubject.value = ''; msgBody.value = '';
                setTimeout(() => closeMessageModal(), 1200);
            } catch (e) { console.error(e); document.getElementById('msg-status').textContent = 'Send failed.'; }
        });
    }



    // QUICK NAV
    // if (btnMyOrders) btnMyOrders.addEventListener('click', () => {
    //     //if (productsView) productsView.classList.add('hidden');
    //     if (ordersView) ordersView.classList.remove('hidden');
    //     //if (contactView) contactView.classList.add('hidden');
    //     loadMyOrders();
    // });
    if (btnShowAll) btnShowAll.addEventListener('click', () => {
        if (productsView) productsView.classList.remove('hidden');
        if (ordersView) ordersView.classList.add('hidden');
        if (contactView) contactView.classList.add('hidden');
        showAllProducts();
    });

    // PROFILE MENU (uses currentUser)
    const profileCircle = document.getElementById('profileCircle');
    let profileMenuVisible = false;
    profileCircle.addEventListener('click', () => {
        if (!profileMenuVisible) {
            const menu = document.createElement('div');
            menu.id = 'profileMenu';
            menu.style.position = 'absolute';
            menu.style.right = '20px';
            menu.style.top = '60px';
            menu.style.background = 'white';
            menu.style.border = '1px solid #ccc';
            menu.style.borderRadius = '8px';
            menu.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            menu.style.padding = '10px';
            menu.style.width = '150px';
            menu.innerHTML = `
            <p style="margin:5px;cursor:pointer;" id="menuProfile">Profile</p>
            <p style="margin:5px;cursor:pointer;" id="menuLogout">Logout</p>
            <p style="margin:5px;cursor:pointer;" id="menuFeedback">Feedback</p>
          `;
            document.body.appendChild(menu);
            profileMenuVisible = true;

            document.getElementById('menuProfile').addEventListener('click', () => {
                window.location.href = "profile.html";
            });
            document.getElementById('menuLogout').addEventListener('click', async () => {
                try { await signOut(auth); window.location.href = "index.html"; } catch (e) { console.error(e); }
            });
            document.getElementById('menuFeedback').addEventListener('click', () => {
                openFeedback();
            });

        } else {
            const menu = document.getElementById('profileMenu'); if (menu) menu.remove(); profileMenuVisible = false;
        }
    });

    // FEEDBACK modal open/close + submit
    window.openFeedback = function () {
        if (!feedbackModal) return;
        feedbackModal.style.display = 'flex';
    };
    window.closeFeedback = function () {
        if (!feedbackModal) return;
        feedbackModal.style.display = 'none';
    };
    if (feedbackSubmit) {
        feedbackSubmit.addEventListener('click', async () => {
            const name = document.getElementById('feedbackName').value.trim();
            const email = document.getElementById('feedbackEmail').value.trim();
            const message = document.getElementById('feedbackMessage').value.trim();
            if (!name || !email || !message) { alert('Please fill all fields.'); return; }
            try {
                await addDoc(collection(db, "feedbacks"), { name, email, message, timestamp: serverTimestamp() });
                alert('Feedback submitted! Thank you.');
                document.getElementById('feedbackName').value = '';
                document.getElementById('feedbackEmail').value = '';
                document.getElementById('feedbackMessage').value = '';
                closeFeedback();
            } catch (err) { console.error(err); alert('Failed to submit feedback.'); }
        });
    }

    // hide modals on click outside
    window.addEventListener('click', (e) => {
        if (e.target === messageModal) closeMessageModal();
        if (e.target === feedbackModal) closeFeedback();
    });

    // INITIAL LOAD
    loadSellers();
    showAllProducts();
});