import React, { useState, useEffect } from "react";
import {
  Flame, Target, Copy, Share2, ShieldCheck, Link2, Users,
  TrendingUp, CheckCircle2, ArrowRight, Lock, Menu, X, User, MessageSquare, Camera, UploadCloud, Video, ImageIcon, DollarSign, Wallet, Send,
  Mail, Phone, Clock, FileText, Globe
} from "lucide-react";
import {
  getUser, setUser, getAllUsers, findByReferralCode, getDailyLink, setDailyLink,
} from "./dataStore";

const COURSE_PRICE = 199; // Sirf combo pack ka unified price
const REFERRAL_BONUS = 99;
const RESELLER_REFERRAL_BONUS = 85; // Retailer/Reseller ko har referral par milega
const RESELLER_DISCOUNT = 20; // Retailer ke link se join karne wale ko itna off milega
const ADMIN_PASSCODE = "@sk804936"; 
const ADMIN_WALLET_PHONE = "__platform_admin_wallet__";

async function creditAdminWallet(amount, source, category = "platform") {
  const existing = await getUser(ADMIN_WALLET_PHONE);
  const base = existing || { phone: ADMIN_WALLET_PHONE, name: "Platform Wallet", transactions: [] };
  const newTx = { id: uid(), date: todayStr(), amount, type: "credit", category, source };
  const updated = { ...base, transactions: [...(base.transactions || []), newTx] };
  await setUser(ADMIN_WALLET_PHONE, updated);
  return updated;
}

// Updated Skill Images
// Updated Skill Images - Sabhi images load hongi
const SKILL_IMAGES = {
  video: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&auto=format&fit=crop&q=60",
  thumb: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop&q=60",
  script: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=500&auto=format&fit=crop&q=60" 
};






const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);
const genRefCode = (name) =>
  (name || "USER").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) +
  Math.floor(1000 + Math.random() * 9000);

function daysAgo(dateStr) {
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

function GoalRing({ value, max, size = 108, stroke = 10, color = "#B4FF39", label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#2A3430" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c - pct * c} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: "#F2F5F0" }}>{label}</span>
        <span style={{ fontSize: 10, color: "#8A9A94", marginTop: 2 }}>{sub}</span>
      </div>
    </div>
  );
}

function getEarnings(user, category) {
  if (!user) return { today: 0, weekly: 0, monthly: 0, total: 0 };
  const tx = (user.transactions || []).filter(t => t.category === category || (!t.category && category === "referral"));
  return {
    today: tx.filter((t) => t.date === todayStr()).reduce((s, t) => s + t.amount, 0),
    weekly: tx.filter((t) => daysAgo(t.date) < 7).reduce((s, t) => s + t.amount, 0),
    monthly: tx.filter((t) => daysAgo(t.date) < 30).reduce((s, t) => s + t.amount, 0),
    total: tx.reduce((s, t) => s + t.amount, 0),
  };
}

function getBalance(user) {
  if (!user) return 0;
  const tx = user.transactions || [];
  return tx.reduce((s, t) => s + (t.type === "debit" ? -t.amount : t.amount), 0);
}

/* ---- SEO HELPER (sets tab title + meta description per page) ---- */
function Seo({ title, description }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
  return null;
}

export default function App() {
  const [courseLinks, setCourseLinks] = useState({
    videoUrl: "",
    thumbUrl: "",
    scriptUrl: "",
  });
  
  const [currentPhone, setCurrentPhone] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminWallet, setAdminWallet] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [referralDownline, setReferralDownline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("landing");
  const [dashSubView, setDashSubView] = useState("dashboard"); 
  const [buyForm, setBuyForm] = useState({ name: '', phone: '', email: '', password: '', refCode: '' });
  const [buyStep, setBuyStep] = useState("form");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [toast, setToast] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pricingRows, setPricingRows] = useState([
    { service: "", price: "" },
    { service: "", price: "" },
    { service: "", price: "" },
    { service: "", price: "" },
    { service: "", price: "" },
  ]);

  useEffect(() => {
    if (currentUser) {
      const saved = currentUser.pricingList || [];
      const padded = Array.from({ length: 5 }, (_, i) => saved[i] || { service: "", price: "" });
      setPricingRows(padded);
    }
  }, [currentUser?.phone]);

  useEffect(() => {
    (async () => {
      if (dashSubView === "referral" && currentUser && currentUser.isReseller) {
        const dbUsers = await getAllUsers();
        const usersList = Array.isArray(dbUsers) ? dbUsers : Object.values(dbUsers || {});
        setReferralDownline(usersList.filter((u) => u.referredBy === currentUser.referralCode));
      }
    })();
  }, [dashSubView, currentUser?.phone, currentUser?.isReseller]);

  useEffect(() => {
    (async () => {
      const dl = await getDailyLink();
      if (dl) {
        setCourseLinks({
          videoUrl: dl.videoUrl || dl.videoMobileUrl || "",
          thumbUrl: dl.thumbUrl || dl.thumbMobileUrl || "",
          scriptUrl: dl.scriptUrl || "",
        });
      }

      const params = new URLSearchParams(window.location.search);
      const returnOrderId = params.get("order_id");

      if (returnOrderId) {
        window.history.replaceState({}, "", window.location.pathname);
        const pendingRaw = localStorage.getItem("craftskill_pending_order");
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

        if (pending && pending.order_id === returnOrderId) {
          try {
            const statusRes = await fetch("/api/zapupi-order-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order_id: returnOrderId }),
            });
            const statusData = await statusRes.json();

            if (statusData.verified) {
              await finalizePurchase(pending.name, pending.phone, pending.refCode, pending.email, pending.password, COURSE_PRICE);
              localStorage.removeItem("craftskill_pending_order");
              setView("dashboard");
              setDashSubView("dashboard");
              setLoading(false);
              return;
            } else if (statusData.status === "Failed") {
              showToast("Payment fail ho gaya");
              localStorage.removeItem("craftskill_pending_order");
            } else {
              showToast("Payment pending, thodi der baad check karein");
            }
          } catch (err) {
            showToast("Payment verification error");
          }
        }
      }

      const savedPhone = localStorage.getItem("craftskill_session");
      if (savedPhone) {
        const u = await getUser(savedPhone);
        if (u) {
          setCurrentPhone(savedPhone);
          setCurrentUser(u);
          setView("dashboard");
          setDashSubView("dashboard");
        }
      }
      setLoading(false);
    })();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  async function handlePurchase() {
    const { name, phone, refCode, email, password } = buyForm;
    if (!name.trim() || phone.trim().length < 8 || !email.trim() || !password.trim()) {
      showToast("Saari details sahi se bharein!");
      return;
    }
    
    setBuyStep("paying");

    try {
      const referrer = refCode.trim() ? await findByReferralCode(refCode.trim()) : null;
      const finalPrice = referrer && referrer.isReseller ? COURSE_PRICE - RESELLER_DISCOUNT : COURSE_PRICE;

      const orderRes = await fetch("/api/zapupi-create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          customer_mobile: phone.trim(),
          remark: `Craftskill | ${name.trim()} | Combo Pack`,
        }),
      });
      const order = await orderRes.json();

      if (!order.payment_url) {
        showToast(order.error || "Payment failed to initialize");
        setBuyStep("form");
        return;
      }

      localStorage.setItem(
        "craftskill_pending_order",
        JSON.stringify({
          order_id: order.order_id,
          name: name.trim(),
          phone: phone.trim(),
          refCode: refCode.trim(),
          email: email.trim(),
          password: password.trim(),
          price: finalPrice,
        })
      );

      window.location.href = order.payment_url;
    } catch (err) {
      showToast("Kuch galat hua, dobara try karein");
      setBuyStep("form");
    }
  }

  async function finalizePurchase(name, phone, refCode, email, password, price) {
    const existing = await getUser(phone);
    const referrer = refCode ? await findByReferralCode(refCode) : null;

    const userData = existing || {
      id: uid(),
      name,
      phone,
      email: email || "",
      password: password || "",
      referralCode: genRefCode(name),
      referredBy: referrer ? referrer.referralCode : null,
      isReseller: false,
      transactions: [],
      profilePic: "", 
      portfolio: [],
      selectedSkill: "combo",
    };
    userData.purchased = true;
    userData.purchaseDate = todayStr();
    
    if(email) userData.email = email;
    if(password) userData.password = password;
    if(price) userData.coursePrice = price;

    await setUser(phone, userData);

    if (referrer) {
      const bonus = referrer.isReseller ? RESELLER_REFERRAL_BONUS : REFERRAL_BONUS;
      const updatedReferrer = {
        ...referrer,
        transactions: [
          ...(referrer.transactions || []),
          { id: uid(), date: todayStr(), amount: bonus, type: "credit", category: "referral", source: `Referral: ${name} registered` },
        ],
      };
      await setUser(referrer.phone, updatedReferrer);
      await creditAdminWallet(bonus, `Referral signup: ${name}`, "referral");
    }

    localStorage.setItem("craftskill_session", phone);
    setCurrentPhone(phone);
    setCurrentUser(userData);
  }

  async function checkPendingPayment() {
    const pendingRaw = localStorage.getItem("craftskill_pending_order");
    if (!pendingRaw) {
      showToast("Koi pending payment nahi mila");
      return;
    }
    const pending = JSON.parse(pendingRaw);
    setBuyStep("paying");
    try {
      const statusRes = await fetch("/api/zapupi-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: pending.order_id }),
      });
      const statusData = await statusRes.json();

      if (statusData.verified) {
        await finalizePurchase(pending.name, pending.phone, pending.refCode, pending.email, pending.password, pending.price);
        localStorage.removeItem("craftskill_pending_order");
        setBuyStep("done");
      } else {
        showToast("Payment abhi tak receive nahi hua");
        setBuyStep("form");
      }
    } catch (err) {
      showToast("Error checking payment status");
      setBuyStep("form");
    }
  }

  async function handleLogin(email, password) {
    if (!email.trim() || !password.trim()) {
      showToast("Gmail aur Password dono bharein!");
      return;
    }
    try {
      const dbUsers = await getAllUsers();
      const usersList = Array.isArray(dbUsers) ? dbUsers : Object.values(dbUsers || {});
      const foundUser = usersList.find(
        (u) => u.email?.trim() === email.trim() && u.password?.trim() === password.trim()
      );

      if (foundUser && foundUser.purchased) {
        localStorage.setItem("craftskill_session", foundUser.phone);
        setCurrentPhone(foundUser.phone);
        setCurrentUser(foundUser);
        setView("dashboard");
        setDashSubView("dashboard");
        showToast("Welcome to Craftskill!");
      } else {
        showToast("Galat details ya course purchased nahi hai.");
      }
    } catch (err) {
      showToast("Login process error.");
    }
  }

  const handleDpUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const updatedUser = { ...currentUser, profilePic: event.target.result };
      await setUser(currentPhone, updatedUser);
      setCurrentUser(updatedUser);
      showToast("Profile Photo Update Ho Gayi!");
    };
    reader.readAsDataURL(file);
  };

  const handlePortfolioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast("File 5MB se choti honi chahiye test karne ke liye.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const isVideo = file.type.startsWith("video");
      const newItem = { id: uid(), data: event.target.result, type: isVideo ? 'video' : 'image' };
      const updatedUser = { ...currentUser, portfolio: [...(currentUser.portfolio || []), newItem] };
      
      await setUser(currentPhone, updatedUser);
      setCurrentUser(updatedUser);
      showToast("Aapka work upload ho gaya!");
    };
    reader.readAsDataURL(file);
  };

  function updatePricingRow(index, field, value) {
    setPricingRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function savePricing() {
    const cleaned = pricingRows.filter((r) => r.service.trim() || r.price.toString().trim());
    const updatedUser = { ...currentUser, pricingList: pricingRows };
    await setUser(currentPhone, updatedUser);
    setCurrentUser(updatedUser);
    showToast(cleaned.length ? "Pricing update ho gayi!" : "Pricing save ho gayi!");
  }

  async function handleWithdraw(upiId, amountStr) {
    const amt = Number(amountStr);
    if (!upiId || !upiId.trim()) {
      showToast("UPI ID dalein");
      return;
    }
    if (!amt || amt <= 0) {
      showToast("Sahi amount dalein");
      return;
    }
    const balance = getBalance(currentUser);
    if (amt > balance) {
      showToast("Balance kam hai, itna withdraw nahi kar sakte");
      return;
    }
    const newReq = { id: uid(), date: todayStr(), amount: amt, upiId: upiId.trim(), status: "pending" };
    const updatedUser = { ...currentUser, withdrawalRequests: [...(currentUser.withdrawalRequests || []), newReq] };
    await setUser(currentPhone, updatedUser);
    setCurrentUser(updatedUser);
    showToast(`\u20b9${amt} withdrawal request admin ko bhej diya gaya! Approval ke baad paisa milega.`);
  }

  async function approveWithdrawal(phone, requestId) {
    const dbUsers = await getAllUsers();
    const usersList = Array.isArray(dbUsers) ? dbUsers : Object.values(dbUsers || {});
    const targetUser = usersList.find((u) => u.phone === phone);
    if (!targetUser) return;
    const req = (targetUser.withdrawalRequests || []).find((r) => r.id === requestId);
    if (!req || req.status !== "pending") return;
    const debitTx = { id: uid(), date: todayStr(), amount: req.amount, type: "debit", category: "withdrawal", source: `Withdrawal paid \u2014 UPI: ${req.upiId}` };
    const updatedUser = {
      ...targetUser,
      transactions: [...(targetUser.transactions || []), debitTx],
      withdrawalRequests: targetUser.withdrawalRequests.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r)),
    };
    await setUser(phone, updatedUser);
    if (currentPhone === phone) setCurrentUser(updatedUser);
    loadAdminUsers();
    showToast(`₹${req.amount} withdrawal ${targetUser.name} ke liye paid mark ho gaya`);
  }

  async function rejectWithdrawal(phone, requestId) {
    const dbUsers = await getAllUsers();
    const usersList = Array.isArray(dbUsers) ? dbUsers : Object.values(dbUsers || {});
    const targetUser = usersList.find((u) => u.phone === phone);
    if (!targetUser) return;
    const req = (targetUser.withdrawalRequests || []).find((r) => r.id === requestId);
    if (!req || req.status !== "pending") return;
    const updatedUser = {
      ...targetUser,
      withdrawalRequests: targetUser.withdrawalRequests.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)),
    };
    await setUser(phone, updatedUser);
    if (currentPhone === phone) setCurrentUser(updatedUser);
    loadAdminUsers();
    showToast(`${targetUser.name} ka withdrawal request reject kar diya gaya`);
  }

  function handleLogout() {
    localStorage.removeItem("craftskill_session");
    setCurrentPhone(null);
    setCurrentUser(null);
    setView("landing");
  }

  function finishPurchaseFlow() {
    setView("dashboard");
    setDashSubView("dashboard");
    setBuyStep("form");
    setBuyForm({ name: "", phone: "", email: "", password: "", refCode: "" });
  }

  async function toggleReseller(phone, current) {
    await setUser(phone, { isReseller: !current });
    const users = await getAllUsers();
    setAllUsers(users);
  }
  
  async function addClientPayment(targetPhone, amountStr) {
    const amount = Number(amountStr);
    if (!amount) return;
    const dbUsers = await getAllUsers();
    const usersList = Array.isArray(dbUsers) ? dbUsers : Object.values(dbUsers || {});
    const targetUser = usersList.find(u => u.phone === targetPhone);
    if (targetUser) {
      const newTx = { id: uid(), date: todayStr(), amount, type: "credit", category: "client", source: "Client Payment Received" };
      const updatedUser = { ...targetUser, transactions: [...(targetUser.transactions || []), newTx] };
      await setUser(targetPhone, updatedUser);
      if (currentPhone === targetPhone) {
        setCurrentUser(updatedUser);
      }
      await creditAdminWallet(amount, `Client payment for ${targetUser.name}`, "client");
      loadAdminUsers();
      showToast(`₹${amount} Client payment added!`);
    }
  }

  async function loadAdminUsers() {
    const users = await getAllUsers();
    setAllUsers(users);
    const wallet = await getUser(ADMIN_WALLET_PHONE);
    setAdminWallet(wallet || { transactions: [] });
  }

  async function updateCourseLinks(newLinksObject) {
    setCourseLinks(newLinksObject);
    await setDailyLink(newLinksObject); // Backend ko same table me save karega
    showToast("Permanent Course Links update ho gaye!");
  }

  const fontLink = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
      body { background: #0F1513; overflow-x: hidden; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .ck-card { transition: transform 0.25s ease, box-shadow 0.25s ease; box-shadow: 0 2px 14px rgba(0,0,0,0.18); }
      .ck-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
      .ck-btn { transition: filter 0.2s ease, transform 0.15s ease; }
      .ck-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
      .ck-btn:active { transform: translateY(0); filter: brightness(0.96); }
    `}</style>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F1513", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F5F0" }}>
        {fontLink}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Flame color="#B4FF39" size={22} />
          <span>Craftskill loading...</span>
        </div>
      </div>
    );
  }

  const bg = "#0F1513", card = "#161F1C", cardBorder = "#243029";
  const lime = "#B4FF39", amber = "#FFB238", muted = "#8A9A94", text = "#F2F5F0";

  const clientEarnings = getEarnings(currentUser, "client");
  const referralEarnings = getEarnings(currentUser, "referral");

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, position: "relative" }}>
      {fontLink}
      
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: card, border: `1px solid ${lime}`, color: lime, padding: "10px 20px", borderRadius: 999, zIndex: 1100, fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Slide Out Navigation Sidebar */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 280, background: "#111816",
        borderRight: `1px solid ${cardBorder}`, zIndex: 1000, padding: 24, display: "flex", flexDirection: "column",
        transform: isMenuOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.4s cubic-bezier(0.1, 1, 0.1, 1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Target color={lime} size={20} />
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>CRAFTSKILL MENU</span>
          </div>
          <button onClick={() => setIsMenuOpen(false)} style={{ background: "transparent", border: "none", color: text, cursor: "pointer" }}><X size={20}/></button>
        </div>

        {currentUser && (
          <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 14, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <img src={currentUser.profilePic || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} 
                   alt="Profile" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${lime}`, objectFit: "cover", backgroundColor: "#0F1513" }} />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: text }}>{currentUser.name}</span>
            </div>
            <div style={{ fontSize: 11, color: muted }}>Works: <span style={{ color: amber, fontWeight: 700 }}>{(currentUser.portfolio || []).length} Uploads</span></div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          {currentUser ? (
            <>
              <button onClick={() => { setDashSubView("account"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(dashSubView === "account", lime, card)}><User size={16}/> Account & Profile</button>
              <button onClick={() => { setDashSubView("dashboard"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(dashSubView === "dashboard", lime, card)}><Target size={16}/> Dashboard</button>
              <button onClick={() => { setDashSubView("clientChat"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(dashSubView === "clientChat", lime, card)}><MessageSquare size={16}/> Client Chat / Links</button>
              <button onClick={() => { setDashSubView("referral"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(dashSubView === "referral", lime, card)}><Users size={16}/> Referral System</button>
              <button onClick={() => { setDashSubView("withdraw"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(dashSubView === "withdraw", lime, card)}><Wallet size={16}/> Withdraw Funds</button>
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} style={{ ...sideMenuBtnStyle(false, lime, card), color: "#FF6B6B", marginTop: 'auto' }}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => { setView("landing"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(view === "landing", lime, card)}>Home</button>
              <button onClick={() => { setView("login"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(view === "login", lime, card)}>Login</button>
              <button onClick={() => { setView("buy"); setIsMenuOpen(false); }} style={sideMenuBtnStyle(view === "buy", lime, card)}>Course Le Lein</button>
            </>
          )}
        </div>
      </div>

      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999 }} />}

      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setIsMenuOpen(true)} style={{ background: "transparent", border: "none", color: text, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Menu size={24} color={lime} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setView(currentUser ? "dashboard" : "landing")}>
            <Target color={lime} size={22} />
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, letterSpacing: 0.5 }}>CRAFTSKILL</span>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {currentUser && (
            <div
              onClick={() => { setView("dashboard"); setDashSubView("dashboard"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                background: "#0F1513", border: `1px solid ${lime}`, borderRadius: 999,
                padding: "6px 12px", boxShadow: `0 0 12px ${lime}22`
              }}
            >
              <Wallet size={14} color={lime} />
              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12.5, color: lime }}>
                ₹{getBalance(currentUser)}
              </span>
            </div>
          )}
          {!currentUser && (
            <button onClick={() => setView("buy")} style={{ background: lime, color: "#0F1513", border: "none", padding: "8px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Join Now</button>
          )}
          <button onClick={() => { setView("admin"); loadAdminUsers(); }} style={{ background: "transparent", border: "none", color: muted, cursor: "pointer" }}>
            <Lock size={16} />
          </button>
        </div>
      </nav>

      {view === "landing" && <Landing lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} onBuy={() => setView("buy")} />}
      {view === "about" && <AboutPage lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} onBuy={() => setView("buy")} />}
      {view === "contact" && <ContactPage lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} showToast={showToast} />}
      {view === "privacy" && <PrivacyPage lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />}
      {view === "terms" && <TermsPage lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />}
      {view === "refund" && <RefundPage lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />}
      {view === "login" && <LoginFlow onLogin={handleLogin} lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />}
      {view === "buy" && (
        <BuyFlow buyForm={buyForm} setBuyForm={setBuyForm} buyStep={buyStep} onPay={handlePurchase} onDone={finishPurchaseFlow} onCheckPending={checkPendingPayment}
          lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />
      )}

      {view === "dashboard" && currentUser && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px" }}>
          
          {/* ---- ACCOUNT & PROFILE SECTION ---- */}
          {dashSubView === "account" && (
            <div>
              <div className="ck-card" style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                  <div style={{ position: "relative" }}>
                    <img src={currentUser.profilePic || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} 
                         alt="DP" style={{ width: 80, height: 80, borderRadius: "50%", border: `2px solid ${lime}`, objectFit: "cover", backgroundColor: "#0F1513" }} />
                    <label style={{ position: "absolute", bottom: -5, right: -5, background: lime, padding: 6, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Camera size={14} color="#0F1513" />
                      <input type="file" accept="image/*" onChange={handleDpUpload} style={{ display: "none" }} />
                    </label>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 4 }}>{currentUser.name}</h2>
                    <div style={{ fontSize: 13, color: muted, marginBottom: 2 }}>📧 {currentUser.email || "Email not set"}</div>
                    <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>📞 {currentUser.phone}</div>
                    <div style={{ display: "inline-block", fontSize: 11, background: "#0F1513", border: `1px solid ${amber}`, color: amber, padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
                      Course: 🎁 Combo (All 3 Skills)
                    </div>
                  </div>
                </div>
              </div>

              <div className="ck-card" style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>My Portfolio / Works</div>
                  <label className="ck-btn" style={{ background: lime, color: "#0F1513", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <UploadCloud size={16} /> Upload Work
                    <input type="file" accept="image/*,video/*" onChange={handlePortfolioUpload} style={{ display: "none" }} />
                  </label>
                </div>
                
                <p style={{ color: muted, fontSize: 12.5, marginBottom: 16 }}>Apni best edited videos ya thumbnails yahan upload karein taaki clients dekh sakein.</p>

                {(!currentUser.portfolio || currentUser.portfolio.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "30px 10px", border: `1px dashed ${cardBorder}`, borderRadius: 12 }}>
                    <ImageIcon size={32} color={muted} style={{ marginBottom: 10, opacity: 0.5 }} />
                    <div style={{ color: muted, fontSize: 13 }}>Abhi tak koi work upload nahi kiya.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                    {currentUser.portfolio.map((item) => (
                      <div key={item.id} style={{ background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 8, overflow: "hidden", position: "relative", aspectRatio: "16/9" }}>
                        {item.type === 'video' ? (
                          <>
                            <video src={item.data} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                              <Video size={24} color="#FFF" />
                            </div>
                          </>
                        ) : (
                          <img src={item.data} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ck-card" style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <DollarSign size={16} color={amber} />
                  <div style={{ fontWeight: 700, fontSize: 15 }}>My Services & Pricing</div>
                </div>
                <p style={{ color: muted, fontSize: 12.5, marginBottom: 16 }}>
                  Apni service ka naam aur price yahan set karein — jab clients aapse contact karenge, unhe yeh pricing dikhayi jayegi.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pricingRows.map((row, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ width: 20, color: muted, fontSize: 12, fontWeight: 700 }}>{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder={`Service ${idx + 1} (jaise: Video Editing - 1 Reel)`}
                        value={row.service}
                        onChange={(e) => updatePricingRow(idx, "service", e.target.value)}
                        style={{ flex: 2, background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 8, padding: "10px 12px", color: "#F2F5F0", fontSize: 13, outline: "none" }}
                      />
                      <input
                        type="number"
                        placeholder="₹ Price"
                        value={row.price}
                        onChange={(e) => updatePricingRow(idx, "price", e.target.value)}
                        style={{ flex: 1, background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 8, padding: "10px 12px", color: amber, fontSize: 13, outline: "none" }}
                      />
                    </div>
                  ))}
                </div>

                <button
                  className="ck-btn"
                  onClick={savePricing}
                  style={{ width: "100%", background: amber, color: "#0F1513", border: "none", padding: "12px", borderRadius: 10, fontWeight: 800, cursor: "pointer", marginTop: 16 }}
                >
                  Save Pricing
                </button>
              </div>
            </div>
          )}

          {/* ---- MAIN DASHBOARD ---- */}
          {dashSubView === "dashboard" && (
            <Dashboard user={currentUser} earnings={clientEarnings} courseLinks={courseLinks} lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} showToast={showToast} />
          )}

          {/* ---- SKILL LINK & CLIENT DASHBOARD ---- */}
          {dashSubView === "clientChat" && (
            <div className="ck-card" style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 30 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Permanent Workspace Links</h3>
                <p style={{ color: muted, fontSize: 13.5, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
                  Aapke paas <span style={{ color: amber, fontWeight: 700 }}>Combo Pack</span> active hai. Niche diye gaye 3 alag-alag section se apni manpasand skill ke course link par click karein:
                </p>
              </div>

              {/* 3 Lines (Rows) for links with images */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <CourseRow title="🎬 Video Editing Course" img={SKILL_IMAGES.video} url={courseLinks.videoUrl} lime={lime} cardBorder={cardBorder} muted={muted} />
                <CourseRow title="🎨 Thumbnail Designing" img={SKILL_IMAGES.thumb} url={courseLinks.thumbUrl} lime={lime} cardBorder={cardBorder} muted={muted} amber={amber} />
                <CourseRow title="✍️ Script Writing Mastery" img={SKILL_IMAGES.script} url={courseLinks.scriptUrl} lime={lime} cardBorder={cardBorder} muted={muted} />
              </div>

              <hr style={{ border: "none", borderTop: `1px solid ${cardBorder}`, margin: "32px 0" }} />
              
              <div style={{ textAlign: "center" }}>
                <MessageSquare size={24} color={amber} style={{ marginBottom: 10 }} />
                <div style={{ display: "inline-block", background: "#2A2010", color: amber, fontSize: 11, padding: "4px 12px", borderRadius: 999, fontWeight: 700, marginBottom: 10 }}>CLIENT CONNECT STATUS: IN DEVELOPMENT</div>
                <p style={{ color: muted, fontSize: 12.5, maxWidth: 440, margin: "0 auto" }}>
                  Hum ek dedicated sub-platform ready kar rahe hain jahan international clients aakar editors se direct deal karenge.
                </p>
              </div>
            </div>
          )}

          {/* ---- REFERRAL PAGE ---- */}
          {dashSubView === "referral" && (
            <div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28, marginBottom: 20 }}>
                <GoalRing value={referralEarnings.today} max={Math.max(referralEarnings.monthly, 1)} color={lime} label={`₹${referralEarnings.total}`} sub="Referral Earned" />
              </div>
              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Share2 size={16} color={amber} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Apna Unique Invite Manage Karein</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: amber, flex: 1 }}>{currentUser.referralCode}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(currentUser.referralCode); showToast("Code copy ho gaya"); }}
                    style={{ background: "transparent", border: `1px solid ${cardBorder}`, color: muted, borderRadius: 8, padding: 6, cursor: "pointer" }}>
                    <Copy size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: muted, wordBreak: "break-all" }}>https://craftskill-learning.com/buy?ref={currentUser.referralCode}</div>
                <p style={{ fontSize: 12, color: muted, marginTop: 14 }}>
                  Har ek success purchase conversion par aapke wallet mein instant{" "}
                  <span style={{ color: lime, fontWeight: 700 }}>₹{currentUser.isReseller ? RESELLER_REFERRAL_BONUS : REFERRAL_BONUS}</span> add kiya jayega.
                  {currentUser.isReseller && <> Aapke link se join karne walon ko <span style={{ color: amber, fontWeight: 700 }}>₹{RESELLER_DISCOUNT} off</span> milega.</>}
                </p>
              </div>

              {currentUser.isReseller && (
                <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Users size={16} color={amber} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>🏪 Retailer Referrals ({referralDownline.length})</span>
                  </div>
                  {referralDownline.length === 0 && (
                    <div style={{ color: muted, fontSize: 12.5 }}>Abhi tak aapke link se koi join nahi hua hai.</div>
                  )}
                  {referralDownline.map((u) => (
                    <div key={u.phone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${cardBorder}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: muted }}>{u.purchaseDate || "—"}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#123A1E", color: lime }}>Joined ✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- WITHDRAW FUNDS (separate section) ---- */}
          {dashSubView === "withdraw" && (
            <div>
              <WithdrawalCard balance={getBalance(currentUser)} onWithdraw={handleWithdraw} lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />

              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Withdrawal History</div>
                {(currentUser.withdrawalRequests || []).length === 0 && (
                  <div style={{ color: muted, fontSize: 12.5 }}>Abhi tak koi withdrawal request nahi ki gayi.</div>
                )}
                {[...(currentUser.withdrawalRequests || [])].reverse().map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${cardBorder}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>₹{r.amount} <span style={{ color: muted, fontWeight: 400, fontSize: 11 }}>· {r.upiId}</span></div>
                      <div style={{ fontSize: 11, color: muted }}>{r.date}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                      background: r.status === "approved" ? "#123A1E" : r.status === "rejected" ? "#3A1414" : "#2A2010",
                      color: r.status === "approved" ? lime : r.status === "rejected" ? "#FF6B6B" : amber,
                    }}>
                      {r.status === "approved" ? "Paid ✓" : r.status === "rejected" ? "Rejected" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {view === "admin" && (
        <AdminPanel unlocked={adminUnlocked} pass={adminPass} setPass={setAdminPass}
          onUnlock={() => { if (adminPass === ADMIN_PASSCODE) { setAdminUnlocked(true); loadAdminUsers(); } else showToast("Galat passcode"); }}
          users={allUsers} courseLinks={courseLinks} onUpdateLink={updateCourseLinks} onToggleReseller={toggleReseller}
          onAddClientPayment={addClientPayment}
          platformBalance={getBalance(adminWallet)} onApproveWithdrawal={approveWithdrawal} onRejectWithdrawal={rejectWithdrawal}
          lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />
      )}

      <Footer lime={lime} amber={amber} muted={muted} cardBorder={cardBorder} setView={setView} />
    </div>
  );
}

function sideMenuBtnStyle(active, lime, card) {
  return { display: "flex", alignItems: "center", gap: 10, width: "100%", background: active ? lime : "transparent", color: active ? "#0F1513" : "#F2F5F0", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, textAlign: "left", cursor: "pointer", transition: "0.2s" };
}

/* ---- LANDING PAGE ---- */
function Landing({ lime, amber, muted, card, cardBorder, onBuy }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 16 }}>
        Build High-Income <span style={{ color: lime }}>Craft Skills</span>
      </h1>
      <p style={{ color: muted, marginBottom: 32, fontSize: 15, lineHeight: "1.6" }}>
        Ghar baithe aisi skills seekhein jo aapko sach me earn karke dein. No fluff, pure practical knowledge.
      </p>
      <button
        onClick={onBuy}
        style={{
          background: lime, color: "#0F1513", border: "none",
          padding: "14px 32px", borderRadius: 999, fontSize: 15,
          fontWeight: 800, cursor: "pointer", marginBottom: 48,
          boxShadow: `0 4px 20px ${lime}33`
        }}
      >
        Course Le Lein — ₹{COURSE_PRICE}
      </button>

      <div style={{ marginTop: 20, textAlign: "left" }}>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 24, textAlign: "center", color: "#F2F5F0" }}>
          Combo Pack Mein Aapko Kya Milega?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          
          <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
            <img src={SKILL_IMAGES.video} alt="Video Editing" style={{ width: "100%", height: "140px", objectFit: "cover" }} />
            <div style={{ padding: "16px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: lime, marginBottom: 6 }}>🎬 Video Editing</h3>
              <p style={{ color: muted, fontSize: 12, lineHeight: "1.4" }}>High-end transitions, sound design aur viral cutting techniques scratch se seekhein.</p>
            </div>
          </div>

          <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
            <img src={SKILL_IMAGES.thumb} alt="Thumbnail Design" style={{ width: "100%", height: "140px", objectFit: "cover" }} />
            <div style={{ padding: "16px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: amber, marginBottom: 6 }}>🎨 Thumbnail Designing</h3>
              <p style={{ color: muted, fontSize: 12, lineHeight: "1.4" }}>High-CTR click-worthy CTR layouts, color grading aur composition rules jo views badhayein.</p>
            </div>
          </div>

<div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
  <img 
    src={SKILL_IMAGES.script} 
    alt="Script Writing" 
    style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} 
  />
  <div style={{ padding: "16px" }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#38BDF8", marginBottom: 6 }}>✍️ Script Writing</h3>
    <p style={{ color: muted, fontSize: 12, lineHeight: "1.4" }}>Audience retention hooks, storytelling frameworks aur engaging content structures likhna seekhein.</p>
  </div>
</div>
          
          
          

        </div>
      </div>
    </div>
  );
}

/* ---- LOGIN FLOW ---- */
function LoginFlow({ onLogin, lime, amber, muted, card, cardBorder }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 8 }}>Craftskill Member Login</h2>
        <p style={{ color: muted, fontSize: 13.5, marginBottom: 20 }}>Apni secure Gmail ID aur password credentials dalkar continue karein.</p>
        <FieldInput label="Gmail ID Address" value={email} onChange={(v) => setEmail(v)} muted={muted} cardBorder={cardBorder} />
        <FieldInput label="Secure Account Password" type="password" value={password} onChange={(v) => setPassword(v)} muted={muted} cardBorder={cardBorder} />
        <button className="ck-btn" onClick={() => onLogin(email, password)} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "14px", borderRadius: 10, fontWeight: "bold", marginTop: 10, cursor: "pointer" }}>
          Verify & Open Dashboard
        </button>
      </div>
    </div>
  );
}

/* ---- BUY FLOW WITH COMBO PACK ONLY ---- */
function BuyFlow({ buyForm, setBuyForm, buyStep, onPay, onDone, onCheckPending, lime, amber, muted, card, cardBorder }) {
  const hasPending = typeof window !== "undefined" && localStorage.getItem("craftskill_pending_order");
  const [retailerInfo, setRetailerInfo] = useState(null);

  useEffect(() => {
    const code = (buyForm.refCode || "").trim();
    if (!code) {
      setRetailerInfo(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const referrer = await findByReferralCode(code);
      if (!cancelled) {
        setRetailerInfo(referrer && referrer.isReseller ? referrer : null);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [buyForm.refCode]);

  const finalPrice = retailerInfo ? COURSE_PRICE - RESELLER_DISCOUNT : COURSE_PRICE;

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28 }}>
        {buyStep === "form" && (
          <>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 20 }}>
              Setup Account — {retailerInfo ? (
                <><span style={{ textDecoration: "line-through", color: muted, fontSize: 16 }}>₹{COURSE_PRICE}</span> <span style={{ color: lime }}>₹{finalPrice}</span></>
              ) : (
                <>₹{COURSE_PRICE}</>
              )}
            </h2>
            {hasPending && (
              <div style={{ background: "#0F1513", border: `1px solid ${amber}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: amber, fontWeight: 700, marginBottom: 8 }}>Previous Payment Detected</div>
                <button onClick={onCheckPending} style={{ width: "100%", background: amber, color: "#0F1513", border: "none", padding: "10px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>
                  Verify Status Now
                </button>
              </div>
            )}
            
            <FieldInput label="Full Name" value={buyForm.name} onChange={(v) => setBuyForm({ ...buyForm, name: v })} muted={muted} cardBorder={cardBorder} />
            <FieldInput label="Active WhatsApp Phone" value={buyForm.phone} onChange={(v) => setBuyForm({ ...buyForm, phone: v })} muted={muted} cardBorder={cardBorder} />
            <FieldInput label="Gmail ID (For future Logins)" value={buyForm.email} onChange={(v) => setBuyForm({ ...buyForm, email: v })} muted={muted} cardBorder={cardBorder} />
            <FieldInput label="Set Secure Password" type="password" value={buyForm.password} onChange={(v) => setBuyForm({ ...buyForm, password: v })} muted={muted} cardBorder={cardBorder} />
            <FieldInput label="Referral Code (Optional)" value={buyForm.refCode} onChange={(v) => setBuyForm({ ...buyForm, refCode: v })} muted={muted} cardBorder={cardBorder} optional />
            {retailerInfo && (
              <div style={{ background: "#0F1F14", border: `1px solid ${lime}`, borderRadius: 10, padding: "10px 12px", marginTop: -6, marginBottom: 14, fontSize: 12, color: lime, fontWeight: 700 }}>
                🎉 Retailer code applied ({retailerInfo.name}) — ₹{RESELLER_DISCOUNT} off, ab pay karo sirf ₹{finalPrice}
              </div>
            )}

            <div style={{ background: "#0F1513", border: `2px solid ${lime}`, borderRadius: 12, padding: 16, marginTop: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: lime, marginBottom: 12, textAlign: "center" }}>🎁 CRAFTSKILL MASTER COMBO</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={SKILL_IMAGES.video} alt="Video" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#FFF", fontWeight: 600 }}>Video Editing</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={SKILL_IMAGES.thumb} alt="Thumb" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#FFF", fontWeight: 600 }}>Thumbnail</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={SKILL_IMAGES.script} alt="Script" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#FFF", fontWeight: 600 }}>Script Writing</div>
                </div>
              </div>
            </div>

            <button className="ck-btn" onClick={onPay} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>
              Secure Pay ₹{finalPrice}
            </button>
          </>
        )}
        {buyStep === "paying" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${cardBorder}`, borderTopColor: lime, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: muted, fontSize: 14 }}>Gateway redirection initiated...</div>
          </div>
        )}
        {buyStep === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle2 color={lime} size={40} style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Activation Done!</h3>
            <button onClick={onDone} style={{ background: lime, color: "#0F1513", border: "none", padding: "12px 24px", borderRadius: 999, fontWeight: 800, cursor: "pointer" }}>Go To Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}
function FieldInput({ label, value, onChange, muted, cardBorder, optional, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: muted, display: "block", marginBottom: 6 }}>{label}{optional && " (optional)"}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "11px 12px", color: "#F2F5F0", fontSize: 14, outline: "none" }} />
    </div>
  );
}

/* ---- DASHBOARD UI ---- */
function Dashboard({ user, earnings, courseLinks, lime, amber, muted, card, cardBorder }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: muted, fontSize: 13 }}>Logged in successfully,</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>{user.name}</div>
      </div>
      
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28, marginBottom: 20 }}>
        <GoalRing value={earnings.today} max={Math.max(earnings.monthly, 1)} color={lime} label={`₹${earnings.total}`} sub="Total Client Earnings" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label="Today Client Earn" value={earnings.today} muted={muted} card={card} cardBorder={cardBorder} amber={amber} />
        <StatCard label="Weekly Client Earn" value={earnings.weekly} muted={muted} card={card} cardBorder={cardBorder} amber={amber} />
        <StatCard label="Monthly Client Earn" value={earnings.monthly} muted={muted} card={card} cardBorder={cardBorder} amber={amber} />
      </div>

      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Link2 size={16} color={lime} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Aapke Permanent Course Links</span>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CourseRow title="🎬 Video Editing Course" img={SKILL_IMAGES.video} url={courseLinks.videoUrl} lime={lime} cardBorder={cardBorder} muted={muted} />
          <CourseRow title="🎨 Thumbnail Designing" img={SKILL_IMAGES.thumb} url={courseLinks.thumbUrl} lime={lime} cardBorder={cardBorder} muted={muted} amber={amber} />
          <CourseRow title="✍️ Script Writing Mastery" img={SKILL_IMAGES.script} url={courseLinks.scriptUrl} lime={lime} cardBorder={cardBorder} muted={muted} />
        </div>
      </div>
    </div>
  );
}

// 3 Lines (Rows) Rendering Component for Dashboard & Client Chat
function CourseRow({ title, img, url, lime, cardBorder, muted }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, border: `1px solid ${cardBorder}`, background: "#0F1513", borderRadius: 12 }}>
      <img src={img} alt={title} style={{ width: 70, height: 48, objectFit: "cover", borderRadius: 6 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: "#F2F5F0" }}>{title}</div>
        <div style={{ fontSize: 11, color: muted }}>Permanent Access Link</div>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="ck-btn" style={{ background: lime, color: "#0F1513", padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none", display: "inline-block" }}>Join Class</a>
      ) : (
        <span style={{ fontSize: 11, color: muted, padding: "8px 10px" }}>No Link Yet</span>
      )}
    </div>
  );
}

function StatCard({ label, value, muted, card, cardBorder, amber, highlight }) {
  return (
    <div style={{ background: card, border: `1px solid ${highlight ? amber : cardBorder}`, borderRadius: 14, padding: "16px 14px" }}>
      <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: highlight ? amber : "#F2F5F0" }}>₹{value}</div>
    </div>
  );
}

/* ---- WITHDRAWAL CARD (Balance + UPI Withdraw) ---- */
function WithdrawalCard({ balance = 0, onWithdraw, lime, amber, muted, card, cardBorder }) {
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");

  const quickAmounts = [100, 200, 500];

  function pick(val) {
    setAmount(String(val));
  }

  function pickFull() {
    setAmount(balance > 0 ? String(balance) : "");
  }

  function submit() {
    onWithdraw(upiId, amount);
    setAmount("");
  }

  return (
    <div className="ck-card" style={{ background: card, border: `2px solid ${lime}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wallet size={18} color={lime} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Account Balance</span>
        </div>
      </div>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: lime, marginBottom: 18 }}>₹{balance}</div>

      <div style={{ borderTop: `1px solid ${cardBorder}`, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Send size={14} color={amber} />
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>Withdraw Funds</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: muted, display: "block", marginBottom: 6 }}>UPI ID</label>
          <input
            type="text"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "11px 12px", color: "#F2F5F0", fontSize: 14, outline: "none" }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: muted, display: "block", marginBottom: 6 }}>Amount</label>
          <input
            type="number"
            placeholder="Amount type karein"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "11px 12px", color: amber, fontSize: 14, outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {quickAmounts.map((val) => (
            <button
              key={val}
              className="ck-btn"
              onClick={() => pick(val)}
              style={{ flex: "1 1 70px", background: amount === String(val) ? amber : "#0F1513", color: amount === String(val) ? "#0F1513" : muted, border: `1px solid ${cardBorder}`, borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ₹{val}
            </button>
          ))}
          <button
            className="ck-btn"
            onClick={pickFull}
            style={{ flex: "1 1 90px", background: amount !== "" && amount === String(balance) ? amber : "#0F1513", color: amount !== "" && amount === String(balance) ? "#0F1513" : muted, border: `1px solid ${cardBorder}`, borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Total (₹{balance})
          </button>
        </div>

        <button
          className="ck-btn"
          onClick={submit}
          style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "13px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}
        >
          Withdraw Request Bhejein
        </button>
        <p style={{ fontSize: 11, color: muted, marginTop: 10, textAlign: "center" }}>Withdrawal 24-48 hours mein aapke UPI account mein process ho jayega.</p>
      </div>
    </div>
  );
}

/* ---- ADMIN PANEL MANAGING PERMANENT LINKS ---- */
function AdminPanel({ unlocked, pass, setPass, onUnlock, users, courseLinks, onUpdateLink, onToggleReseller, onAddClientPayment, platformBalance = 0, onApproveWithdrawal, onRejectWithdrawal, lime, amber, muted, card, cardBorder }) {
  const [videoInput, setVideoInput] = useState(courseLinks.videoUrl || "");
  const [thumbInput, setThumbInput] = useState(courseLinks.thumbUrl || "");
  const [scriptInput, setScriptInput] = useState(courseLinks.scriptUrl || "");
  const [paymentAmount, setPaymentAmount] = useState({});

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 360, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <Lock color={lime} size={22} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Admin Controller Gate</div>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passcode"
            style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "10px 12px", color: "#F2F5F0", marginBottom: 12 }} />
          <button onClick={onUnlock} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "10px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Unlock</button>
        </div>
      </div>
    );
  }

  const normalizedUsers = Array.isArray(users) ? users : Object.values(users || {});
  const pendingWithdrawals = [];
  normalizedUsers.forEach((u) => {
    (u.withdrawalRequests || []).forEach((r) => {
      if (r.status === "pending") pendingWithdrawals.push({ ...r, userPhone: u.phone, userName: u.name });
    });
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 20 }}>Craftskill Management Console</h2>

      {/* Platform Balance */}
      <div style={{ background: card, border: `2px solid ${lime}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Wallet size={16} color={lime} />
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>My Platform Balance</span>
        </div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: lime }}>₹{platformBalance}</div>
        <div style={{ fontSize: 11.5, color: muted, marginTop: 4 }}>Har client payment aur referral conversion ka credit yahan aata hai.</div>
      </div>

      {/* Pending Withdrawal Requests */}
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Send size={16} color={amber} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Withdrawal Requests ({pendingWithdrawals.length} pending)</span>
        </div>
        {pendingWithdrawals.length === 0 && (
          <div style={{ color: muted, fontSize: 12.5 }}>Abhi koi pending withdrawal request nahi hai.</div>
        )}
        {pendingWithdrawals.map((r) => (
          <div key={r.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${cardBorder}`, gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.userName} <span style={{ color: muted, fontWeight: 400, fontSize: 12 }}>· {r.userPhone}</span></div>
              <div style={{ fontSize: 13, color: amber, fontWeight: 700, marginTop: 2 }}>₹{r.amount} → {r.upiId}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.date}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onApproveWithdrawal(r.userPhone, r.id)} className="ck-btn"
                style={{ background: lime, color: "#0F1513", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                Paid ✓
              </button>
              <button onClick={() => onRejectWithdrawal(r.userPhone, r.id)} className="ck-btn"
                style={{ background: "transparent", color: "#FF6B6B", border: "1px solid #FF6B6B", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Permanent Links Configuration */}
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, color: lime }}>🌐 Permanent Course Links Configuration</div>

        <FieldInput label="🎬 Video Editing — Course Link" value={videoInput} onChange={setVideoInput} muted={muted} cardBorder={cardBorder} />
        <FieldInput label="🎨 Thumbnail Designing — Course Link" value={thumbInput} onChange={setThumbInput} muted={muted} cardBorder={cardBorder} />
        <FieldInput label="✍️ Script Writing — Course Link" value={scriptInput} onChange={setScriptInput} muted={muted} cardBorder={cardBorder} />
        
        <button 
          onClick={() => onUpdateLink({
            videoUrl: videoInput,
            thumbUrl: thumbInput,
            scriptUrl: scriptInput,
          })} 
          className="ck-btn"
          style={{ background: lime, color: "#0F1513", border: "none", padding: "11px 22px", borderRadius: 10, fontWeight: 800, cursor: "pointer", marginTop: 6 }}
        >
          Push Links to All Users
        </button>
      </div>

      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Registered Active Learners ({normalizedUsers.length})</div>
        {normalizedUsers.map((u) => (
          <div key={u.phone} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${cardBorder}`, gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name} <span style={{ color: muted, fontWeight: 400, fontSize: 12 }}>· {u.phone}</span></div>
              <div style={{ fontSize: 11.5, color: lime, fontWeight: 600, marginTop: 2 }}>
                Active: Combo Pack
                {u.coursePrice ? ` · ₹${u.coursePrice}` : ""}
              </div>
              <div style={{ fontSize: 11.5, color: muted, marginTop: 2 }}>Code: {u.referralCode} · Works: {(u.portfolio||[]).length}</div>
              {u.isReseller && (() => {
                const downline = normalizedUsers.filter((x) => x.referredBy === u.referralCode);
                return (
                  <div style={{ fontSize: 11.5, color: amber, marginTop: 2 }}>
                    🏪 Retailer Referrals ({downline.length}){downline.length ? `: ${downline.map((d) => d.name).join(", ")}` : ""}
                  </div>
                );
              })()}
            </div>
            
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", background: "#0F1513", borderRadius: 6, border: `1px solid ${cardBorder}` }}>
                <input 
                  type="number" 
                  placeholder="₹ Amount" 
                  value={paymentAmount[u.phone] || ""} 
                  onChange={(e) => setPaymentAmount({...paymentAmount, [u.phone]: e.target.value})}
                  style={{ width: 80, background: "transparent", border: "none", color: "#F2F5F0", fontSize: 12, padding: "6px 8px", outline: "none" }} 
                />
                <button onClick={() => { onAddClientPayment(u.phone, paymentAmount[u.phone]); setPaymentAmount({...paymentAmount, [u.phone]: ""}); }} 
                  style={{ background: lime, color: "#0F1513", border: "none", padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: "0 5px 5px 0" }}>
                  <DollarSign size={12} />
                </button>
              </div>

              <button onClick={() => onToggleReseller(u.phone, u.isReseller)}
                style={{ background: u.isReseller ? amber : "transparent", color: u.isReseller ? "#0F1513" : muted, border: `1px solid ${u.isReseller ? amber : cardBorder}`, borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                {u.isReseller ? "Reseller ✓" : "Make Reseller"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* ---- STATIC INFO PAGES: About / Contact / Privacy / Terms / Refund ---- */
/* ==================================================================== */

function FeatureCard({ icon, title, desc, accent, card, cardBorder, muted }) {
  return (
    <div className="ck-card" style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <h3 style={{ fontSize: 14.5, fontWeight: 700, color: accent, marginBottom: 6 }}>{title}</h3>
      <p style={{ color: muted, fontSize: 12.5, lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

/* ---- ABOUT US ---- */
function AboutPage({ lime, amber, muted, card, cardBorder, onBuy }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 64px" }}>
      <Seo
        title="About Us | CraftSkill — Practical Digital Skills for Beginners & Freelancers"
        description="CraftSkill is an online learning platform teaching Video Editing, Thumbnail Designing and Script Writing to teenagers, college students, beginners and aspiring freelancers."
      />
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, marginBottom: 14, lineHeight: 1.3 }}>
        About <span style={{ color: lime }}>CraftSkill</span>
      </h1>
      <p style={{ color: muted, fontSize: 14.5, lineHeight: 1.75, marginBottom: 32 }}>
        CraftSkill is an online learning platform designed for teenagers, college students, beginners and aspiring
        freelancers who want to build real, income-generating digital skills — without wasting years on theory.
        Every course on CraftSkill is built around one goal: helping you learn something practical enough to
        start earning from it.
      </p>

      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 16 }}>What We Teach</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 36 }}>
        <FeatureCard icon="🎬" title="Video Editing" desc="Transitions, cuts and sound design that turn raw footage into scroll-stopping content." accent={lime} card={card} cardBorder={cardBorder} muted={muted} />
        <FeatureCard icon="🎨" title="Thumbnail Designing" desc="High-CTR layouts, color grading and composition rules that get the click." accent={amber} card={card} cardBorder={cardBorder} muted={muted} />
        <FeatureCard icon="✍️" title="Script Writing" desc="Retention hooks and storytelling frameworks that keep viewers watching." accent="#38BDF8" card={card} cardBorder={cardBorder} muted={muted} />
      </div>

      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 14 }}>What You Can Do With CraftSkill</h2>
      <ul style={{ color: muted, fontSize: 13.5, lineHeight: 2, marginBottom: 36, paddingLeft: 20 }}>
        <li>Learn practical, job-ready digital skills</li>
        <li>Build a real portfolio of your own work</li>
        <li>Start freelancing and taking on paid clients</li>
        <li>Earn online from home, on your own schedule</li>
        <li>Grow your income further with our referral program</li>
      </ul>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 40 }}>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: lime, marginBottom: 8 }}>Our Mission</h2>
          <p style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>
            To make practical digital education affordable and accessible for everyone.
          </p>
        </div>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: amber, marginBottom: 8 }}>Our Vision</h2>
          <p style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>
            To empower millions of learners with high-income digital skills and real career opportunities.
          </p>
        </div>
      </div>

      <button className="ck-btn" onClick={onBuy} style={{ background: lime, color: "#0F1513", border: "none", padding: "14px 30px", borderRadius: 999, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
        Start Learning — ₹{COURSE_PRICE}
      </button>
    </div>
  );
}

/* ---- CONTACT US ---- */
function ContactPage({ lime, amber, muted, card, cardBorder, showToast }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      showToast("Please fill in your name, email and message");
      return;
    }
    const subject = encodeURIComponent(form.subject.trim() || "CraftSkill Support Query");
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:support@craftskill.in?subject=${subject}&body=${body}`;
    showToast("Opening your email app to send the message...");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 64px" }}>
      <Seo
        title="Contact Us | CraftSkill Support"
        description="Get in touch with CraftSkill. Email support@craftskill.in, reach us on WhatsApp, or send a message using our contact form. We're here Monday–Saturday, 10 AM–7 PM IST."
      />
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, marginBottom: 10 }}>Contact Us</h1>
      <p style={{ color: muted, fontSize: 14, lineHeight: 1.7, marginBottom: 30 }}>
        Have a question about a course, a payment, or your account? Our support team is happy to help — reach out
        using any of the options below.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 36 }}>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18 }}>
          <Mail size={18} color={lime} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Email</div>
          <a href="mailto:support@craftskill.in" style={{ color: "#F2F5F0", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>support@craftskill.in</a>
        </div>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18 }}>
          <Globe size={18} color={amber} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Website</div>
          <a href="https://craftskill.in" target="_blank" rel="noreferrer" style={{ color: "#F2F5F0", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>craftskill.in</a>
        </div>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18 }}>
          <MessageSquare size={18} color="#38BDF8" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>WhatsApp Support</div>
          <div style={{ color: "#F2F5F0", fontSize: 13.5, fontWeight: 700 }}>Coming Soon</div>
        </div>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18 }}>
          <Clock size={18} color={lime} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Business Hours</div>
          <div style={{ color: "#F2F5F0", fontSize: 13.5, fontWeight: 700 }}>Mon – Sat, 10 AM – 7 PM (IST)</div>
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, marginBottom: 16 }}>Send Us a Message</h2>
        <form onSubmit={submit}>
          <FieldInput label="Name" value={form.name} onChange={(v) => updateField("name", v)} muted={muted} cardBorder={cardBorder} />
          <FieldInput label="Email" value={form.email} onChange={(v) => updateField("email", v)} muted={muted} cardBorder={cardBorder} />
          <FieldInput label="Subject" value={form.subject} onChange={(v) => updateField("subject", v)} muted={muted} cardBorder={cardBorder} optional />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: muted, display: "block", marginBottom: 6 }}>Message</label>
            <textarea
              rows={5}
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "11px 12px", color: "#F2F5F0", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <button type="submit" className="ck-btn" style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "14px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>
            Send Message
          </button>
        </form>
      </div>

      <p style={{ color: muted, fontSize: 12.5, lineHeight: 1.7, marginTop: 20, textAlign: "center" }}>
        Our support team typically responds within 24–48 business hours. For urgent payment issues, please include
        your registered phone number in your message.
      </p>
    </div>
  );
}

/* ---- SHARED LEGAL PAGE LAYOUT ---- */
function LegalPage({ title, updated, muted, children }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 64px" }}>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, marginBottom: 6 }}>{title}</h1>
      <div style={{ color: muted, fontSize: 12, marginBottom: 30 }}>Last updated: {updated}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>{children}</div>
    </div>
  );
}

function LegalSection({ heading, cardBorder, children }) {
  return (
    <section style={{ borderTop: `1px solid ${cardBorder}`, paddingTop: 18 }}>
      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15.5, marginBottom: 10 }}>{heading}</h2>
      <div style={{ fontSize: 13.5, lineHeight: 1.75, color: "#C7D0CB" }}>{children}</div>
    </section>
  );
}

/* ---- PRIVACY POLICY ---- */
function PrivacyPage({ lime, muted, cardBorder }) {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026" muted={muted}>
      <Seo
        title="Privacy Policy | CraftSkill"
        description="Read CraftSkill's Privacy Policy to understand what information we collect, how we use it, how we keep it secure, and your rights as a user."
      />
      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: muted }}>
        This Privacy Policy explains how CraftSkill ("we", "us", "our") collects, uses, and protects the
        information of learners who use our website and courses (craftskill.in). By using CraftSkill, you agree to
        the collection and use of information as described here.
      </p>

      <LegalSection heading="1. Information We Collect" cardBorder={cardBorder}>
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li><strong>Personal Information:</strong> your name, email address and phone number when you register or purchase a course.</li>
          <li><strong>Email:</strong> used for login, order confirmations, and course-related communication.</li>
          <li><strong>Phone Number:</strong> used to identify your account and for WhatsApp support.</li>
          <li><strong>Payment Information:</strong> processed securely by our third-party payment gateway. CraftSkill does not store your card, UPI, or banking credentials on its own servers.</li>
          <li><strong>Cookies:</strong> small files used to keep you logged in and remember your preferences.</li>
          <li><strong>Analytics:</strong> anonymised usage data (pages visited, device/browser type) to help us improve the platform.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How We Use Information" cardBorder={cardBorder}>
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>To create and manage your CraftSkill account and course access.</li>
          <li>To process payments and send purchase confirmations.</li>
          <li>To calculate and pay referral program earnings.</li>
          <li>To respond to support requests and improve our services.</li>
          <li>To send important updates about your courses, account, or policies.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Data Security" cardBorder={cardBorder}>
        We use industry-standard measures — including encrypted connections and access-controlled databases — to
        protect your information from unauthorised access, alteration, or disclosure. No online platform can
        guarantee 100% security, but we work to keep your data as safe as possible.
      </LegalSection>

      <LegalSection heading="4. User Rights" cardBorder={cardBorder}>
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>You may request a copy of the personal information we hold about you.</li>
          <li>You may request correction of inaccurate information.</li>
          <li>You may request deletion of your account, subject to any legal or financial record-keeping requirements.</li>
        </ul>
        To exercise any of these rights, contact us at <span style={{ color: lime, fontWeight: 700 }}>support@craftskill.in</span>.
      </LegalSection>

      <LegalSection heading="5. Third-Party Services" cardBorder={cardBorder}>
        We use trusted third-party services for payment processing, hosting, and analytics. These providers only
        receive the information necessary to perform their function and are required to handle it securely. We do
        not sell your personal information to third parties.
      </LegalSection>

      <LegalSection heading="6. Contact Information" cardBorder={cardBorder}>
        If you have questions about this Privacy Policy or how your data is handled, contact us at{" "}
        <span style={{ color: lime, fontWeight: 700 }}>support@craftskill.in</span> or visit{" "}
        <span style={{ color: lime, fontWeight: 700 }}>craftskill.in</span>.
      </LegalSection>
    </LegalPage>
  );
}

/* ---- TERMS & CONDITIONS ---- */
function TermsPage({ lime, muted, cardBorder }) {
  return (
    <LegalPage title="Terms & Conditions" updated="July 2026" muted={muted}>
      <Seo
        title="Terms & Conditions | CraftSkill"
        description="Read the Terms & Conditions for using CraftSkill, including account usage, course access, referral program rules, payments, and community guidelines."
      />
      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: muted }}>
        These Terms & Conditions govern your use of CraftSkill (craftskill.in) and all courses, tools and features
        provided on the platform. By registering or purchasing a course, you agree to these terms in full.
      </p>

      <LegalSection heading="1. User Responsibilities" cardBorder={cardBorder}>
        You are responsible for providing accurate registration details and for all activity that occurs under
        your account. You agree to use CraftSkill only for lawful, personal learning and freelancing purposes.
      </LegalSection>

      <LegalSection heading="2. Account Usage" cardBorder={cardBorder}>
        Each account is for individual use only. Sharing login credentials, reselling access, or allowing multiple
        unrelated users on a single account is not permitted and may lead to suspension.
      </LegalSection>

      <LegalSection heading="3. Course Access Rules" cardBorder={cardBorder}>
        Course access is granted upon successful payment and is linked to your registered account. Access is for
        personal learning use and may not be redistributed, resold, or shared publicly.
      </LegalSection>

      <LegalSection heading="4. Referral Program Rules" cardBorder={cardBorder}>
        Referral bonuses are credited only for genuine, successful course purchases made using your unique referral
        code. Fraudulent referrals, self-referrals, or fake sign-ups will be void, and any credited amount may be
        reversed. Reseller pricing and bonus rates may be updated at CraftSkill's discretion.
      </LegalSection>

      <LegalSection heading="5. Payments" cardBorder={cardBorder}>
        All payments are processed through our secure third-party payment gateway. Prices shown at checkout,
        including any referral discount applied, are final at the time of purchase.
      </LegalSection>

      <LegalSection heading="6. Intellectual Property" cardBorder={cardBorder}>
        All course content, videos, graphics, and materials provided on CraftSkill are the intellectual property of
        CraftSkill or its licensors and are protected under applicable copyright law.
      </LegalSection>

      <LegalSection heading="7. Copyright" cardBorder={cardBorder}>
        You may not copy, reproduce, distribute, or publicly share any CraftSkill course material without prior
        written permission. Unauthorised use may result in legal action.
      </LegalSection>

      <LegalSection heading="8. Community Guidelines" cardBorder={cardBorder}>
        Be respectful in all interactions with CraftSkill staff and fellow learners. Harassment, spam, or abusive
        behaviour is not tolerated.
      </LegalSection>

      <LegalSection heading="9. Prohibited Activities" cardBorder={cardBorder}>
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>Sharing or reselling course content or account access</li>
          <li>Attempting to bypass payment or referral systems</li>
          <li>Uploading harmful, offensive, or infringing content to your portfolio</li>
          <li>Any activity that disrupts or compromises the platform's security</li>
        </ul>
      </LegalSection>

      <LegalSection heading="10. Account Suspension" cardBorder={cardBorder}>
        CraftSkill reserves the right to suspend or terminate accounts that violate these Terms, without refund,
        where the violation involves fraud, abuse, or unauthorised redistribution of content.
      </LegalSection>

      <LegalSection heading="11. Changes to Terms" cardBorder={cardBorder}>
        We may update these Terms from time to time. Continued use of CraftSkill after changes are posted
        constitutes acceptance of the revised Terms. For questions, contact{" "}
        <span style={{ color: lime, fontWeight: 700 }}>support@craftskill.in</span>.
      </LegalSection>
    </LegalPage>
  );
}

/* ---- REFUND POLICY ---- */
function RefundPage({ lime, muted, cardBorder }) {
  return (
    <LegalPage title="Refund Policy" updated="July 2026" muted={muted}>
      <Seo
        title="Refund Policy | CraftSkill"
        description="Learn about CraftSkill's refund policy for digital courses, including eligibility, the review process, and processing timelines."
      />
      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: muted }}>
        This Refund Policy applies to all digital courses purchased on CraftSkill (craftskill.in).
      </p>

      <LegalSection heading="1. General Policy" cardBorder={cardBorder}>
        Digital courses are generally <strong>non-refundable</strong> once payment is successfully completed and
        course access has been granted, as the content is instantly accessible and consumable.
      </LegalSection>

      <LegalSection heading="2. Exceptions" cardBorder={cardBorder}>
        Refunds may be considered only in the following cases:
        <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
          <li>A verified technical issue prevented you from accessing your purchased course</li>
          <li>A duplicate or incorrect payment was charged</li>
          <li>Refund is required under applicable consumer protection law</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How to Request a Refund" cardBorder={cardBorder}>
        Contact our support team at <span style={{ color: lime, fontWeight: 700 }}>support@craftskill.in</span> within
        7 days of your purchase with your registered phone number, payment reference, and a description of the
        issue.
      </LegalSection>

      <LegalSection heading="4. Review Process" cardBorder={cardBorder}>
        Every refund request is reviewed individually by our support team. We may request additional information
        or payment proof to verify the issue before approving a refund.
      </LegalSection>

      <LegalSection heading="5. Processing Timeline" cardBorder={cardBorder}>
        Approved refunds are processed within 7–10 business days to the original payment method, subject to
        processing times of the payment gateway or bank.
      </LegalSection>
    </LegalPage>
  );
}

/* ---- FOOTER ---- */
function Footer({ lime, amber, muted, cardBorder, setView }) {
  const links = [
    { label: "Home", view: "landing" },
    { label: "About Us", view: "about" },
    { label: "Contact Us", view: "contact" },
    { label: "Privacy Policy", view: "privacy" },
    { label: "Terms & Conditions", view: "terms" },
    { label: "Refund Policy", view: "refund" },
  ];
  return (
    <footer style={{ borderTop: `1px solid ${cardBorder}`, marginTop: 40, padding: "32px 20px 26px" }}>
      <nav
        aria-label="Footer navigation"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginBottom: 18 }}
      >
        {links.map((l) => (
          <button
            key={l.view}
            onClick={() => { setView(l.view); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ background: "transparent", border: "none", color: muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = lime)}
            onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
          >
            {l.label}
          </button>
        ))}
      </nav>
      <div style={{ textAlign: "center", fontSize: 12.5, color: muted, marginBottom: 6 }}>
        <a href="mailto:support@craftskill.in" style={{ color: amber, textDecoration: "none", fontWeight: 600 }}>
          support@craftskill.in
        </a>
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, color: muted }}>
        © 2026 CraftSkill. All Rights Reserved.
      </div>
    </footer>
  );
}
