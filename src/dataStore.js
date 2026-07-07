import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export async function getUser(phone) {
  const snap = await getDoc(doc(db, "users", phone));
  return snap.exists() ? snap.data() : null;
}

export async function setUser(phone, data) {
  await setDoc(doc(db, "users", phone), data, { merge: true });
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data());
}

export async function findByReferralCode(code) {
  const users = await getAllUsers();
  return users.find(
    (u) => u.referralCode && u.referralCode.toLowerCase() === code.toLowerCase()
  );
}

export async function getDailyLink() {
  const snap = await getDoc(doc(db, "settings", "dailyLink"));
  return snap.exists()
    ? snap.data()
    : { url: "", label: "Aaj ka course link jaldi update hoga" };
}

export async function setDailyLink(data) {
  await setDoc(doc(db, "settings", "dailyLink"), data);
}
