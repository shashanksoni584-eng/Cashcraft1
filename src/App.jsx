import React, { useState, useEffect, useCallback } from "react";
import {
  Flame, Target, Copy, Share2, ShieldCheck, Link2, Users,
  TrendingUp, CheckCircle2, ArrowRight, Lock,
} from "lucide-react";
import {
  getUser, setUser, getAllUsers, findByReferralCode, getDailyLink, setDailyLink,
} from "./dataStore";

const COURSE_PRICE = 199;
const REFERRAL_BONUS = 99;
const ADMIN_PASSCODE = "goal2026"; // isko badal dein deploy karne se pehle

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

export default function App() {
  const [dailyLink, setDailyLinkState] = useState({ url: "", label: "" });
  const [currentPhone, setCurrentPhone] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("landing");
  const [buyForm, setBuyForm] = useState({ name: "", phone: "", refCode: "" });
  const [buyStep, setBuyStep] = useState("form");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const dl = await getDailyLink();
      setDailyLinkState(dl);

      // Check if we're returning from a ZapUPI payment redirect
      const params = new URLSearchParams(window.location.search);
      const returnOrderId = params.get("order_id");
      const returnStatus = params.get("status");

      if (returnOrderId) {
        // Clean the URL so refreshing doesn't re-trigger this
        window.history.replaceState({}, "", window.location.pathname);

        const pendingRaw = localStorage.getItem("cashcraft_pending_order");
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

        if (pending && pending.order_id === returnOrderId) {
          // ZapUPI's redirect status can fire before their system fully
          // confirms the payment, so we always double-check the real
          // status via the API instead of trusting returnStatus alone.
          try {
            const statusRes = await fetch("/api/zapupi-order-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order_id: returnOrderId }),
            });
            const statusData = await statusRes.json();

            if (statusData.verified) {
              await finalizePurchase(pending.name, pending.phone, pending.refCode);
              localStorage.removeItem("cashcraft_pending_order");
              setView("dashboard");
              setLoading(false);
              return;
            } else if (statusData.status === "Failed") {
              showToast("Payment fail ho gaya");
              localStorage.removeItem("cashcraft_pending_order");
            } else {
              // Still pending on ZapUPI's side — keep the pending info
              // so the "Maine Payment Kar Diya" button can recheck later.
              showToast("Payment abhi confirm nahi hua, thodi der baad dobara check karein");
            }
          } catch (err) {
            showToast("Payment verify karne mein dikkat hui, dobara check karein");
          }
        }
      }

      const savedPhone = localStorage.getItem("cashcraft_session");
      if (savedPhone) {
        const u = await getUser(savedPhone);
        if (u) {
          setCurrentPhone(savedPhone);
          setCurrentUser(u);
          setView("dashboard");
        }
      }
      setLoading(false);
    })();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  async function refreshCurrentUser(phone) {
    const u = await getUser(phone);
    setCurrentUser(u);
  }

  async function handlePurchase() {
    const { name, phone, refCode } = buyForm;
    if (!name.trim() || phone.trim().length < 8) {
      showToast("Naam aur sahi phone number daalein");
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
          remark: `CashCraft | ${name.trim()}`,
        }),
      });
      const order = await orderRes.json();

      if (!order.payment_url) {
        showToast(order.error || "Payment start nahi ho paya, dobara try karein");
        setBuyStep("form");
        return;
      }

      // Save pending purchase info so we can finish it when the user
      // is redirected back from ZapUPI's payment page.
      localStorage.setItem(
        "cashcraft_pending_order",
        JSON.stringify({
          order_id: order.order_id,
          name: name.trim(),
          phone: phone.trim(),
          refCode: refCode.trim(),
        })
      );

      window.location.href = order.payment_url;
    } catch (err) {
      showToast("Kuch galat hua, dobara try karein");
      setBuyStep("form");
    }
  }

  async function finalizePurchase(name, phone, refCode) {
    const existing = await getUser(phone);
    const referrer = refCode ? await findByReferralCode(refCode) : null;

    const userData = existing || {
      id: uid(),
      name,
      phone,
      referralCode: genRefCode(name),
      referredBy: referrer ? referrer.referralCode : null,
      isReseller: false,
      transactions: [],
    };
    userData.purchased = true;
    userData.purchaseDate = todayStr();
    await setUser(phone, userData);

    if (referrer) {
      const updatedReferrer = {
        ...referrer,
        transactions: [
          ...(referrer.transactions || []),
          { id: uid(), date: todayStr(), amount: REFERRAL_BONUS, type: "credit", source: `Referral: ${name} ne course kharida` },
        ],
      };
      await setUser(referrer.phone, updatedReferrer);
    }

    localStorage.setItem("cashcraft_session", phone);
    setCurrentPhone(phone);
    setCurrentUser(userData);
  }

  async function checkPendingPayment() {
    const pendingRaw = localStorage.getItem("cashcraft_pending_order");
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
        await finalizePurchase(pending.name, pending.phone, pending.refCode);
        localStorage.removeItem("cashcraft_pending_order");
        setBuyStep("done");
      } else if (statusData.status === "Pending") {
        showToast("Payment abhi bhi pending hai, thodi der baad try karein");
        setBuyStep("form");
      } else {
        showToast("Payment successful nahi hua");
        localStorage.removeItem("cashcraft_pending_order");
        setBuyStep("form");
      }
    } catch (err) {
      showToast("Status check karne mein dikkat hui");
      setBuyStep("form");
    }
  }

  function finishPurchaseFlow() {
    setView("dashboard");
    setBuyStep("form");
    setBuyForm({ name: "", phone: "", refCode: "" });
  }

  function handleLogout() {
    localStorage.removeItem("cashcraft_session");
    setCurrentPhone(null);
    setCurrentUser(null);
    setView("landing");
  }

  async function toggleReseller(phone, current) {
    await setUser(phone, { isReseller: !current });
    const users = await getAllUsers();
    setAllUsers(users);
  }

  async function loadAdminUsers() {
    const users = await getAllUsers();
    setAllUsers(users);
  }

  async function updateDailyLink(url, label) {
    const data = { url, label };
    setDailyLinkState(data);
    await setDailyLink(data);
    showToast("Daily link update ho gaya");
  }

  function earningsFor(user) {
    if (!user) return { today: 0, weekly: 0, monthly: 0, total: 0 };
    const tx = user.transactions || [];
    return {
      today: tx.filter((t) => t.date === todayStr()).reduce((s, t) => s + t.amount, 0),
      weekly: tx.filter((t) => daysAgo(t.date) < 7).reduce((s, t) => s + t.amount, 0),
      monthly: tx.filter((t) => daysAgo(t.date) < 30).reduce((s, t) => s + t.amount, 0),
      total: tx.reduce((s, t) => s + t.amount, 0),
    };
  }

  const fontLink = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
      body { background: #0F1513; }
    `}</style>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F1513", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F5F0" }}>
        {fontLink}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Flame color="#B4FF39" size={22} />
          <span>Load ho raha hai...</span>
        </div>
      </div>
    );
  }

  const bg = "#0F1513", card = "#161F1C", cardBorder = "#243029";
  const lime = "#B4FF39", amber = "#FFB238", muted = "#8A9A94", text = "#F2F5F0";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text }}>
      {fontLink}
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: card, border: `1px solid ${lime}`, color: lime, padding: "10px 20px", borderRadius: 999, zIndex: 100, fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setView(currentUser ? "dashboard" : "landing")}>
          <Target color={lime} size={22} />
          <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, letterSpacing: 0.5 }}>CASHCRAFT</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {currentUser ? (
            <>
              <button onClick={() => setView("dashboard")} style={navBtnStyle(view === "dashboard", lime)}>Dashboard</button>
              <button onClick={handleLogout} style={{ ...navBtnStyle(false, lime), color: muted }}>Logout</button>
            </>
          ) : (
            <button onClick={() => setView("buy")} style={navBtnStyle(false, lime)}>Course Le Lein</button>
          )}
          <button onClick={() => { setView("admin"); loadAdminUsers(); }} style={{ background: "transparent", border: "none", color: muted, cursor: "pointer" }}>
            <Lock size={16} />
          </button>
        </div>
      </nav>

      {view === "landing" && <Landing lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} onBuy={() => setView("buy")} />}

      {view === "buy" && (
        <BuyFlow buyForm={buyForm} setBuyForm={setBuyForm} buyStep={buyStep} onPay={handlePurchase} onDone={finishPurchaseFlow}
          onCheckPending={checkPendingPayment}
          lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />
      )}

      {view === "dashboard" && currentUser && (
        <Dashboard user={currentUser} earnings={earningsFor(currentUser)} dailyLink={dailyLink}
          lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} showToast={showToast} />
      )}

      {view === "admin" && (
        <AdminPanel unlocked={adminUnlocked} pass={adminPass} setPass={setAdminPass}
          onUnlock={() => { if (adminPass === ADMIN_PASSCODE) { setAdminUnlocked(true); loadAdminUsers(); } else showToast("Galat passcode"); }}
          users={allUsers} dailyLink={dailyLink} onUpdateLink={updateDailyLink} onToggleReseller={toggleReseller}
          lime={lime} amber={amber} muted={muted} card={card} cardBorder={cardBorder} />
      )}

      <footer style={{ textAlign: "center", padding: "28px 16px", color: muted, fontSize: 12, borderTop: `1px solid ${cardBorder}`, marginTop: 40 }}>
        © CashCraft
      </footer>
    </div>
  );
}

function navBtnStyle(active, lime) {
  return { background: active ? lime : "transparent", color: active ? "#0F1513" : "#F2F5F0", border: `1px solid ${active ? lime : "#243029"}`, padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" };
}

function Landing({ lime, amber, muted, card, cardBorder, onBuy }) {
  return (
    <div>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "72px 24px 48px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: card, border: `1px solid ${cardBorder}`, padding: "6px 14px", borderRadius: 999, fontSize: 12, color: amber, marginBottom: 24 }}>
          <Flame size={14} /> Goal-based fitness system
        </div>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: "clamp(32px, 6vw, 56px)", lineHeight: 1.05, marginBottom: 20 }}>
          Apna <span style={{ color: lime }}>Goal Scale</span> hit karo.<br />Ek daily plan, poora saal.
        </h1>
        <p style={{ color: muted, fontSize: 16, maxWidth: 520, margin: "0 auto 32px" }}>
          Har din ek naya practical step. Structured plan, koi confusion nahi.
        </p>
        <button onClick={onBuy} style={{ background: lime, color: "#0F1513", border: "none", padding: "14px 32px", borderRadius: 999, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
          Course Shuru Kare — ₹{COURSE_PRICE} <ArrowRight size={16} />
        </button>
      </section>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 72px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { icon: Target, title: "Daily Goal Link", desc: "Har din naya session/link, seedha aapke dashboard mein." },
          { icon: TrendingUp, title: "Track Progress", desc: "Weekly aur monthly progress ek nazar mein." },
          { icon: Users, title: "Referral Wallet", desc: `Apna code share karo, referral se ₹${REFERRAL_BONUS} har purchase par.` },
        ].map((f, i) => (
          <div key={i} style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24 }}>
            <f.icon color={lime} size={22} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
            <div style={{ color: muted, fontSize: 13.5, lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function BuyFlow({ buyForm, setBuyForm, buyStep, onPay, onDone, onCheckPending, lime, amber, muted, card, cardBorder }) {
  const hasPending = typeof window !== "undefined" && localStorage.getItem("cashcraft_pending_order");
  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28 }}>
        {buyStep === "form" && (
          <>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 20 }}>Course Kharido — ₹{COURSE_PRICE}</h2>
            {hasPending && (
              <div style={{ background: "#0F1513", border: `1px solid ${amber}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: amber, fontWeight: 700, marginBottom: 8 }}>Pehle se ek payment pending hai</div>
                <div style={{ fontSize: 12.5, color: muted, marginBottom: 10 }}>Agar aapne UPI se payment kar diya hai, to yahan tap karke confirm karein.</div>
                <button onClick={onCheckPending} style={{ width: "100%", background: amber, color: "#0F1513", border: "none", padding: "10px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>
                  Maine Payment Kar Diya — Check Karein
                </button>
              </div>
            )}
            <FieldInput label="Naam" value={buyForm.name} onChange={(v) => setBuyForm({ ...buyForm, name: v })} muted={muted} cardBorder={cardBorder} />
            <FieldInput label="Phone Number" value={buyForm.phone} onChange={(v) => setBuyForm({ ...buyForm, phone: v })} muted={muted} cardBorder={cardBorder} />
            <FieldInput label="Referral Code (agar hai to)" value={buyForm.refCode} onChange={(v) => setBuyForm({ ...buyForm, refCode: v })} muted={muted} cardBorder={cardBorder} optional />
            <button onClick={onPay} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "14px", borderRadius: 12, fontWeight: 800, marginTop: 10, cursor: "pointer" }}>
              Pay ₹{COURSE_PRICE}
            </button>
          </>
        )}
        {buyStep === "paying" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${cardBorder}`, borderTopColor: lime, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: muted, fontSize: 14 }}>Payment page par le ja rahe hain...</div>
          </div>
        )}
        {buyStep === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle2 color={lime} size={40} style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Payment Successful!</h3>
            <p style={{ color: muted, fontSize: 13.5, marginBottom: 20 }}>Aapka course activate ho gaya.</p>
            <button onClick={onDone} style={{ background: lime, color: "#0F1513", border: "none", padding: "12px 24px", borderRadius: 999, fontWeight: 800, cursor: "pointer" }}>
              Dashboard Kholein
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, muted, cardBorder, optional }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: muted, display: "block", marginBottom: 6 }}>{label}{optional && " (optional)"}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "11px 12px", color: "#F2F5F0", fontSize: 14, outline: "none" }} />
    </div>
  );
}

function Dashboard({ user, earnings, dailyLink, lime, amber, muted, card, cardBorder, showToast }) {
  const shareUrl = `https://yourdomain.com/buy?ref=${user.referralCode}`;
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: muted, fontSize: 13 }}>Welcome back,</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>{user.name}</div>
        {user.isReseller && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#2A2418", color: amber, padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, marginTop: 8 }}>
            <ShieldCheck size={12} /> RESELLER
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", background: card, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28, marginBottom: 20 }}>
        <GoalRing value={earnings.today} max={Math.max(earnings.monthly, 1)} color={lime} label={`₹${earnings.total}`} sub="Pending" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label="Today's Earning" value={earnings.today} muted={muted} card={card} cardBorder={cardBorder} amber={amber} />
        <StatCard label="Weekly Earning" value={earnings.weekly} muted={muted} card={card} cardBorder={cardBorder} amber={amber} />
        <StatCard label="Monthly Earning" value={earnings.monthly} muted={muted} card={card} cardBorder={cardBorder} amber={amber} />
        <StatCard label="Total Earning" value={earnings.total} muted={muted} card={card} cardBorder={cardBorder} amber={amber} highlight />
      </div>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Link2 size={16} color={lime} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Aaj Ka Course Link</span>
        </div>
        {dailyLink.url ? (
          <a href={dailyLink.url} target="_blank" rel="noreferrer" style={{ color: lime, fontSize: 13.5, wordBreak: "break-all" }}>{dailyLink.label || dailyLink.url}</a>
        ) : (
          <div style={{ color: muted, fontSize: 13.5 }}>{dailyLink.label}</div>
        )}
      </div>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Share2 size={16} color={amber} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Apna Referral Code Share Karo</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: amber, flex: 1 }}>{user.referralCode}</span>
          <button onClick={() => { navigator.clipboard?.writeText(user.referralCode); showToast("Code copy ho gaya"); }}
            style={{ background: "transparent", border: `1px solid ${cardBorder}`, color: muted, borderRadius: 8, padding: 6, cursor: "pointer" }}>
            <Copy size={14} />
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: muted, wordBreak: "break-all" }}>{shareUrl}</div>
        <p style={{ fontSize: 11.5, color: muted, marginTop: 10 }}>Koi is code se course kharide to aapko ₹{REFERRAL_BONUS} credit hoga.</p>
      </div>
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

function AdminPanel({ unlocked, pass, setPass, onUnlock, users, dailyLink, onUpdateLink, onToggleReseller, lime, amber, muted, card, cardBorder }) {
  const [urlInput, setUrlInput] = useState(dailyLink.url);
  const [labelInput, setLabelInput] = useState(dailyLink.label);

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 360, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <Lock color={lime} size={22} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Admin Access</div>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passcode"
            style={{ width: "100%", background: "#0F1513", border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "10px 12px", color: "#F2F5F0", marginBottom: 12 }} />
          <button onClick={onUnlock} style={{ width: "100%", background: lime, color: "#0F1513", border: "none", padding: "10px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 20 }}>Admin Panel</h2>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Daily Course Link Update Karein</div>
        <FieldInput label="Link URL" value={urlInput} onChange={setUrlInput} muted={muted} cardBorder={cardBorder} />
        <FieldInput label="Label / Description" value={labelInput} onChange={setLabelInput} muted={muted} cardBorder={cardBorder} optional />
        <button onClick={() => onUpdateLink(urlInput, labelInput)} style={{ background: lime, color: "#0F1513", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
          Update Link
        </button>
      </div>
      <div style={{ background: card, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Users ({users.length})</div>
        {users.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Abhi koi user nahi hai.</div>}
        {users.map((u) => (
          <div key={u.phone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${cardBorder}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name} <span style={{ color: muted, fontWeight: 400, fontSize: 12 }}>· {u.phone}</span></div>
              <div style={{ fontSize: 11.5, color: muted }}>Code: {u.referralCode} {u.referredBy && `· Ref by: ${u.referredBy}`}</div>
            </div>
            <button onClick={() => onToggleReseller(u.phone, u.isReseller)}
              style={{ background: u.isReseller ? amber : "transparent", color: u.isReseller ? "#0F1513" : muted, border: `1px solid ${u.isReseller ? amber : cardBorder}`, borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
              {u.isReseller ? "Reseller ✓" : "Make Reseller"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
