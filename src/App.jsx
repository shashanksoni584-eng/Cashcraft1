import React, { useState, useEffect } from "react";
import {
  Flame, Target, Copy, Share2, ShieldCheck, Link2, Users,
  TrendingUp, CheckCircle2, ArrowRight, Lock, Menu, X, User, MessageSquare, Camera, UploadCloud, Video, ImageIcon, DollarSign
} from "lucide-react";
import {
  getUser, setUser, getAllUsers, findByReferralCode, getDailyLink, setDailyLink,
} from "./dataStore";

const COURSE_PRICE = 199; // Sirf combo pack ka unified price
const REFERRAL_BONUS = 99;
const ADMIN_PASSCODE = "@sk804936"; 

// Images for 3 skills
const SKILL_IMAGES = {
  video: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&auto=format&fit=crop&q=60",
  thumb: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop&q=60",
  script: "https://images.unsplash.com/photo-1512046011337-41a5c7275ba1?w=500&auto=format&fit=crop&q=60"
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

export default function App() {
  const [courseLinks, setCourseLinks] = useState({
    videoUrl: "",
    thumbUrl: "",
    scriptUrl: "",
  });
  
  const [currentPhone, setCurrentPhone] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("landing");
  const [dashSubView, setDashSubView] = useState("dashboard"); 
  const [buyForm, setBuyForm] = useState({ name: '', phone: '', email: '', password: '', refCode: '' });
  const [buyStep, setBuyStep] = useState("form");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [toast, setToast] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      const orderRes = await fetch("/api/zapupi-create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: COURSE_PRICE,
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
          price: COURSE_PRICE,
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
      const updatedReferrer = {
        ...referrer,
        transactions: [
          ...(referrer.transactions || []),
          { id: uid(), date: todayStr(), amount: REFERRAL_BONUS, type: "credit", category: "referral", source: `Referral: ${name} registered` },
        ],
      };
      await setUser(referrer.phone, updatedReferrer);
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
      loadAdminUsers();
      showToast(`₹${amount} Client payment added!`);
    }
  }

  async function loadAdminUsers() {
    const users = await getAllUsers();
    setAllUsers(users);
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
          {!currentUser && (
            <button onClick={() => setView("buy")} style={{ background: lime, color: "#0F1513", border: "none", padding: "8px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Join Now</button>
          )}
          <button onClick={() => { setView("admin"); loadAdminUsers(); }} style={{ background: "transparent", border: "none", color: muted, cursor: "pointer" }}>
            <Lock size={16} />
          </button>
        </div>
      </nav>

      {view === "landing" && <Landing lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} onBuy={() => setView("buy")} />}
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
              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
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

              <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>My Portfolio / Works</div>
                  <label style={{ background: lime, color: "#0F1513", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
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
            </div>
          )}

          {/* ---- MAIN DASHBOARD ---- */}
          {dashSubView === "dashboard" && (
            <Dashboard user={currentUser} earnings={clientEarnings} courseLinks={courseLinks} lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} showToast={showToast} />
          )}

          {/* ---- SKILL LINK & CLIENT DASHBOARD ---- */}
          {dashSubView === "clientChat" && (
            <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 30 }}>
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
                <p style={{ fontSize: 12, color: muted, marginTop: 14 }}>Har ek success purchase conversion par aapke wallet mein instant <span style={{ color: lime, fontWeight: 700 }}>₹{REFERRAL_BONUS}</span> add kiya jayega.</p>
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
          lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />
      )}

      <footer style={{ textAlign: "center", padding: "28px 16px", color: muted, fontSize: 12, borderTop: `1px solid ${cardBorder}`, marginTop: 40 }}>
        © Craftskill Learning Environment
      </footer>
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
            <img src={SKILL_IMAGES.script} alt="Script Writing" style={{ width: "100%", height: "140px", objectFit: "cover" }} />
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
        <button onClick={() => onLogin(email, password)} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "14px", borderRadius: 10, fontWeight: "bold", marginTop: 10, cursor: "pointer" }}>
          Verify & Open Dashboard
        </button>
      </div>
    </div>
  );
}

/* ---- BUY FLOW WITH COMBO PACK ONLY ---- */
function BuyFlow({ buyForm, setBuyForm, buyStep, onPay, onDone, onCheckPending, lime, amber, muted, card, cardBorder }) {
  const hasPending = typeof window !== "undefined" && localStorage.getItem("craftskill_pending_order");

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28 }}>
        {buyStep === "form" && (
          <>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 20 }}>Setup Account — ₹{COURSE_PRICE}</h2>
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

            {/* Displaying Combo Pack Details visually */}
            <div style={{ background: "#0F1513", border: `2px solid ${lime}`, borderRadius: 12, padding: 16, marginTop: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: lime, marginBottom: 12, textAlign: "center" }}>🎁 CRAFTSKILL MASTER COMBO</div>
              <p style={{ color: muted, fontSize: 11.5, textAlign: "center", marginBottom: 12 }}>Is plan mein aapko ye teeno courses ka permanent access milega.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={SKILL_IMAGES.video} alt="Video" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#FFF", fontWeight: 600 }}>Video Editing</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={SKILL_IMAGES.thumb} alt="Thumb" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#FFF", fontWeight: 600 }}>Thumbnail Design</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={SKILL_IMAGES.script} alt="Script" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#FFF", fontWeight: 600 }}>Script Writing</div>
                </div>
              </div>
            </div>

            <button onClick={onPay} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "14px", borderRadius: 12, fontWeight: 800, marginTop: 10, cursor: "pointer" }}>
              Secure Pay ₹{COURSE_PRICE}
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
        <a href={url} target="_blank" rel="noreferrer" style={{ background: lime, color: "#0F1513", padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none", display: "inline-block" }}>Join Class</a>
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

/* ---- ADMIN PANEL MANAGING PERMANENT LINKS ---- */
function AdminPanel({ unlocked, pass, setPass, onUnlock, users, courseLinks, onUpdateLink, onToggleReseller, onAddClientPayment, lime, amber, muted, card, cardBorder }) {
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

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 20 }}>Craftskill Management Console</h2>
      
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
