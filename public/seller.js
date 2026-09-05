// seller.js (copy-paste this entire file)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    serverTimestamp,
    query,
    where,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ========== CONFIG ========== */
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

/* ========== STATE ========== */
let currentUser = null;
let unsubProducts = null;
let unsubOrdersPrimary = null;
let unsubOrdersFallback = null;

/* ========== DOM refs (grab after DOM ready) ========== */
window.addEventListener("DOMContentLoaded", () => {
    // required elements (warn if missing)
    const productListEl = document.getElementById("productList");
    const ordersListEl = document.getElementById("orders-list");
    const apEl = document.getElementById("ap");
    const aoEl = document.getElementById("ao");
    const feedbackModal = document.getElementById("feedbackModal");
    const productModal = document.getElementById("productModal");
    const profileCircle = document.getElementById("profileCircle");

    if (!productListEl) console.warn("Missing #productList element");
    if (!ordersListEl) console.warn("Missing #orders-list element");
    if (!apEl) console.warn("Missing #ap element (products count)");
    if (!aoEl) console.warn("Missing #ao element (orders count)");
    if (!feedbackModal) console.warn("Missing #feedbackModal");
    if (!productModal) console.warn("Missing #productModal");
    if (!profileCircle) console.warn("Missing #profileCircle");

    // Auth watcher
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            console.log("Not logged in — redirecting to login.html");
            window.location.href = "login.html";
            return;
        }
        currentUser = user;
        console.log("Logged in as:", user.uid, user.email);

        // unsubscribe previous listeners (if any)
        if (unsubProducts) unsubProducts();
        if (unsubOrdersPrimary) unsubOrdersPrimary();
        if (unsubOrdersFallback) unsubOrdersFallback();

        // start listeners
        unsubProducts = listenProducts();
        // primary: try direct sellerUid query; if that snapshot is empty, fallback to full-collection filter
        unsubOrdersPrimary = listenOrdersPrimary();
    });

    /* ---------- PRODUCTS ---------- */
    window.addProduct = async function () {
        try {
            const name = document.getElementById("productName").value.trim();
            const price = parseFloat(document.getElementById("productPrice").value);
            const stock = parseInt(document.getElementById("productStock").value);
            const type = document.getElementById("productType").value.trim();
            const description = document.getElementById("productDescription").value.trim();
            const imageInput = document.getElementById("productImage");

            if (!name || isNaN(price) || isNaN(stock) || !type || !description || !imageInput || imageInput.files.length === 0) {
                alert("Please fill all fields and select an image.");
                return;
            }

            const file = imageInput.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageUrl = e.target.result; // Base64 (ok for small images / POC)
                await addDoc(collection(db, "products"), {
                    name,
                    price,
                    stock,
                    type,
                    description,
                    imageUrl,
                    sellerUid: currentUser.uid,
                    createdAt: serverTimestamp()
                });
                closeModal();
                resetProductForm();
                console.log("Product added:", name);
            };
            reader.onerror = (err) => {
                console.error("File read error", err);
                alert("Failed to read image file.");
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("addProduct error:", err);
            alert("Failed to add product. See console.");
        }
    };

    window.deleteProduct = async function (productId) {
        try {
            if (!confirm("Delete this product?")) return;
            await deleteDoc(doc(db, "products", productId));
            console.log("Deleted product:", productId);
        } catch (err) {
            console.error("deleteProduct error:", err);
            alert("Failed to delete product.");
        }
    };

    function listenProducts() {
        try {
            const productQuery = query(collection(db, "products"), where("sellerUid", "==", currentUser.uid));
            return onSnapshot(productQuery, (snap) => {
                // update UI
                if (!productListEl) return;
                productListEl.innerHTML = "";
                snap.forEach((ds) => {
                    const p = ds.data();
                    const div = document.createElement("div");
                    div.className = "product-item";
                    div.innerHTML = `
            <img src="${p.imageUrl || ''}" alt="${p.name || ''}">
            <div class="product-details">
              <h3>${p.name || 'Untitled'}</h3>
              <p><strong>Type:</strong> ${p.type || '-'}</p>
              <p><strong>Price:</strong> ₹${p.price ?? 0}</p>
              <p><strong>Stock:</strong> ${p.stock ?? 0}</p>
              <p>${p.description ?? ''}</p>
              <button style="background:red;color:white;" onclick="deleteProduct('${ds.id}')">Delete</button>
            </div>`;
                    productListEl.appendChild(div);
                });
                if (apEl) apEl.innerText = snap.size;
                console.log("Products snapshot size:", snap.size);
            }, (err) => {
                console.error("listenProducts onSnapshot error:", err);
            });
        } catch (err) {
            console.error("listenProducts error:", err);
            return () => { };
        }
    }

    /* ---------- ORDERS (robust) ---------- */
    // Primary: try query by sellerUid
    function listenOrdersPrimary() {
        try {
            const q = query(collection(db, "orders"), where("sellerUid", "==", currentUser.uid));
            return onSnapshot(q, (snap) => {
                if (!ordersListEl) return;
                if (!snap.empty) {
                    // got direct sellerUid orders
                    renderOrdersFromDocs(snap);
                    // if we previously had a fallback listener, unsubscribe it
                    if (unsubOrdersFallback) { unsubOrdersFallback(); unsubOrdersFallback = null; }
                } else {
                    // empty — try fallback (some apps store items inside orders without top-level sellerUid)
                    console.log("Primary orders query empty — installing fallback (scanning all orders client-side).");
                    if (!unsubOrdersFallback) unsubOrdersFallback = listenOrdersFallback();
                    // still show empty message until fallback returns
                    ordersListEl.innerHTML = "<div>Loading orders...</div>";
                }
            }, (err) => {
                console.error("listenOrdersPrimary onSnapshot error:", err);
                if (ordersListEl) ordersListEl.innerHTML = "<div>Error loading orders (see console).</div>";
            });
        } catch (err) {
            console.error("listenOrdersPrimary error:", err);
            return () => { };
        }
    }

    // Fallback: listen to all orders and filter client-side for items belonging to this seller
    function listenOrdersFallback() {
        try {
            const colRef = collection(db, "orders");
            return onSnapshot(colRef, (snap) => {
                if (!ordersListEl) return;
                const matched = [];
                snap.forEach((ds) => {
                    const data = ds.data();
                    // CASE A: top-level sellerUid on the order
                    if (data.sellerUid && data.sellerUid === currentUser.uid) {
                        matched.push({ id: ds.id, type: "order", data });
                        return;
                    }
                    // CASE B: order contains items array; we will pick items that belong to this seller
                    if (Array.isArray(data.items)) {
                        const myItems = data.items.filter(it => it && it.sellerUid === currentUser.uid);
                        if (myItems.length) {
                            // keep only relevant info so we can render
                            matched.push({ id: ds.id, type: "items", data: { ...data, items: myItems } });
                        }
                    }
                });

                if (matched.length === 0) {
                    ordersListEl.innerHTML = "<div>No orders yet.</div>";
                    if (aoEl) aoEl.innerText = 0;
                    console.log("Fallback scan: 0 matched orders.");
                    return;
                }

                // render matched orders
                ordersListEl.innerHTML = "";
                matched.forEach((m) => {
                    if (m.type === "order") {
                        // order with top-level sellerUid
                        const o = m.data;
                        const el = document.createElement("div");
                        el.className = "card";
                        el.style.marginBottom = "8px";
                        el.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <b>${o.productName || "Untitled"}</b><br>
                  <div style="font-size:13px;color:#666">Qty: ${o.quantity ?? o.qty ?? 1}</div>
                  <div style="font-weight:700">${o.status || "Pending"}</div>
                  <div style="font-size:12px;color:#444">OrderId: ${m.id}</div>
                </div>
                <div style="text-align:right">
                  <div>₹ ${o.total ?? o.price ?? 0}</div>
                </div>
              </div>
            `;
                        ordersListEl.appendChild(el);
                    } else if (m.type === "items") {
                        // order with multiple items — render each item that belongs to this seller
                        const orderDoc = m.data;
                        orderDoc.items.forEach(item => {
                            const el = document.createElement("div");
                            el.className = "card";
                            el.style.marginBottom = "8px";
                            el.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <b>${item.productName || item.name || "Untitled"}</b><br>
                    <div style="font-size:13px;color:#666">Qty: ${item.quantity ?? item.qty ?? 1}</div>
                    <div style="font-weight:700">${item.status || orderDoc.status || "Pending"}</div>
                    <div style="font-size:12px;color:#444">OrderId: ${m.id}</div>
                  </div>
                  <div style="text-align:right">
                    <div>₹ ${ (item.total ?? (item.price && item.quantity ? item.price * item.quantity : item.price)) ?? 0}</div>
                  </div>
                </div>
              `;
                            ordersListEl.appendChild(el);
                        });
                    }
                });

                if (aoEl) aoEl.innerText = matched.length;
                console.log("Fallback matched orders:", matched.length);
            }, (err) => {
                console.error("listenOrdersFallback onSnapshot error:", err);
                if (ordersListEl) ordersListEl.innerHTML = "<div>Error loading orders (see console).</div>";
            });
        } catch (err) {
            console.error("listenOrdersFallback error:", err);
            return () => { };
        }
    }

    // Helper: render snapshot with top-level sellerUid orders
    function renderOrdersFromDocs(snap) {
        if (!ordersListEl) return;
        ordersListEl.innerHTML = "";
        let count = 0;
        snap.forEach((ds) => {
            count++;
            const o = ds.data();
            const el = document.createElement("div");
            el.className = "card";
            el.style.marginBottom = "8px";
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
        if (aoEl) aoEl.innerText = count;
        if (count === 0) ordersListEl.innerHTML = "<div>No orders yet.</div>";
        console.log("Primary orders snapshot size:", snap.size);
    }

    /* ---------- PROFILE & FEEDBACK UI ---------- */
    window.openModal = function () { if (productModal) productModal.style.display = "block"; };
    window.closeModal = function () { if (productModal) productModal.style.display = "none"; };
    window.openFeedback = function () { if (feedbackModal) feedbackModal.style.display = "flex"; };
    window.closeFeedback = function () { if (feedbackModal) feedbackModal.style.display = "none"; };

    window.sendFeedback = async function () {
        try {
            const name = document.getElementById("feedbackName").value.trim();
            const email = document.getElementById("feedbackEmail").value.trim();
            const message = document.getElementById("feedbackMessage").value.trim();
            if (!name || !email || !message) { alert("Please fill all fields."); return; }
            await addDoc(collection(db, "feedbacks"), { name, email, message, timestamp: serverTimestamp() });
            alert("Feedback submitted! Thank you.");
            document.getElementById("feedbackName").value = "";
            document.getElementById("feedbackEmail").value = "";
            document.getElementById("feedbackMessage").value = "";
            closeFeedback();
        } catch (err) {
            console.error("sendFeedback error:", err);
            alert("Failed to submit feedback.");
        }
    };

    // profile circle menu
    let profileMenuVisible = false;
    if (profileCircle) {
        profileCircle.addEventListener("click", () => {
            if (!profileMenuVisible) {
                const menu = document.createElement("div");
                menu.id = "profileMenu";
                menu.style.position = "absolute";
                menu.style.right = "20px";
                menu.style.top = "60px";
                menu.style.background = "white";
                menu.style.border = "1px solid #ccc";
                menu.style.borderRadius = "8px";
                menu.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
                menu.style.padding = "10px";
                menu.style.width = "150px";
                menu.innerHTML = `
          <p style="margin:5px;cursor:pointer;" onclick="profile()">Profile</p>
          <p style="margin:5px;cursor:pointer;" onclick="logout()">Logout</p>
          <p style="margin:5px;cursor:pointer;" onclick="openFeedback()">Feedback</p>
        `;
                document.body.appendChild(menu);
                profileMenuVisible = true;
            } else {
                const menu = document.getElementById("profileMenu");
                if (menu) menu.remove();
                profileMenuVisible = false;
            }
        });
    }

    window.profile = function () {
        window.location.href = "profile.html";
    };

    window.logout = async function () {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    // close modals on outside click
    window.addEventListener("click", (ev) => {
        if (ev.target === feedbackModal) closeFeedback();
        if (ev.target === productModal) closeModal();
    });
}); // DOMContentLoaded end