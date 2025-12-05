import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  Coffee,
  Utensils,
  ClipboardList,
  BookOpen,
  PlusCircle,
  Trash2,
  User,
  Sun,
  Cloud,
  CloudRain,
  ShoppingBag,
  Home,
  ChefHat,
  History,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertTriangle,
  Settings,
  Edit2,
  X,
  RefreshCw,
} from "lucide-react";

// --- Firebase Initialization ---

// 1. まず、この画面（プレビュー）用の設定を読み込みます
let firebaseConfig;
let appId = "lantana";

try {
  // このチャット画面で動くための設定
  if (typeof __firebase_config !== "undefined") {
    firebaseConfig = JSON.parse(__firebase_config);
    if (typeof __app_id !== "undefined") appId = __app_id;
  }
} catch (e) {
  console.log("Environment config not found, using manual config.");
}

// 2. もし上の設定がない場合（CodeSandboxなど）、以下の手動設定を使います
if (!firebaseConfig) {
  firebaseConfig = {
    // ↓↓↓ 高橋さんの合鍵を入力済みです。そのまま使えます！ ↓↓↓
    apiKey: "AIzaSyD_0rHXb4wH9qQMtnTPdjoPapLijt0Zc8E",
    authDomain: "lantana-cafe-app.firebaseapp.com",
    projectId: "lantana-cafe-app",
    storageBucket: "lantana-cafe-app.firebasestorage.app",
    messagingSenderId: "723885922436",
    appId: "1:723885922436:web:0714741658799d30138ad1",
    // ↑↑↑ ここまで ↑↑↑
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Initial Data for Migration ---
const INITIAL_MENU_ITEMS = [
  {
    name: "牛スジと野菜ピュレのカレー",
    basePrice: 1000,
    type: "food",
    hasSets: true,
    priceSetA: 1300,
    priceSetB: 1700,
    canTakeout: true,
    imageColor: "bg-amber-100",
  },
  {
    name: "ほうとう",
    basePrice: 1000,
    type: "food",
    hasSets: true,
    priceSetA: 1300,
    priceSetB: 1700,
    canTakeout: false,
    imageColor: "bg-orange-100",
  },
  {
    name: "かぼちゃのポタージュ",
    basePrice: 900,
    type: "food",
    hasSets: true,
    priceSetA: 1200,
    priceSetB: 1600,
    canTakeout: false,
    imageColor: "bg-yellow-100",
  },
  {
    name: "よくばりセット",
    basePrice: 2000,
    type: "food",
    hasSets: false,
    canTakeout: false,
    imageColor: "bg-red-100",
  },
  {
    name: "COLDドリンク",
    basePrice: 400,
    type: "drink",
    hasSets: false,
    canTakeout: true,
    imageColor: "bg-blue-50",
  },
  {
    name: "HOTドリンク",
    basePrice: 400,
    type: "drink",
    hasSets: false,
    canTakeout: true,
    imageColor: "bg-red-50",
  },
  {
    name: "おおまさりのお汁粉",
    basePrice: 500,
    type: "dessert",
    hasSets: true,
    priceDessertSet: 800,
    canTakeout: false,
    imageColor: "bg-stone-100",
  },
  {
    name: "フルーツのコンポートゼリー",
    basePrice: 500,
    type: "dessert",
    hasSets: true,
    priceDessertSet: 800,
    canTakeout: false,
    imageColor: "bg-pink-100",
  },
  {
    name: "ルバーブのクランブルサンデー",
    basePrice: 500,
    type: "dessert",
    hasSets: true,
    priceDessertSet: 800,
    canTakeout: false,
    imageColor: "bg-rose-100",
  },
  {
    name: "自家製アイス各種",
    basePrice: 400,
    type: "dessert",
    hasSets: false,
    canTakeout: false,
    imageColor: "bg-cyan-50",
  },
];

const SET_OPTIONS = {
  single: { label: "単品" },
  setA: { label: "A set (+ドリンク)" },
  setB: { label: "B set (+ドリンク・デザート)" },
  setDessert: { label: "デザートセット (+ドリンク)" },
};

// --- Helper Components ---
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  onClick,
  variant = "primary",
  className = "",
  children,
  disabled = false,
  type = "button",
}) => {
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-md",
    secondary: "bg-stone-100 text-stone-700 hover:bg-stone-200",
    outline: "border-2 border-orange-600 text-orange-600 hover:bg-orange-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`${baseStyle} ${variants[variant]} ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </button>
  );
};

// --- Main Application Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [activeTab, setActiveTab] = useState("pos");
  const [staffName, setStaffName] = useState("高橋");
  const [expandedDate, setExpandedDate] = useState(null);

  // Tailwind Loading
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  // Data States
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reports, setReports] = useState([]);

  // Modal States
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);

  // Helper to calculate price
  const getPrice = (item, setType) => {
    if (setType === "single") return item.basePrice;
    if (setType === "setA") return item.priceSetA || item.basePrice + 300;
    if (setType === "setB") return item.priceSetB || item.basePrice + 700;
    if (setType === "setDessert")
      return item.priceDessertSet || item.basePrice + 300;
    return item.basePrice;
  };

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setAuthError(err.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch Menu Items (Sorted by Newest First)
    const qMenu = query(
      collection(db, "artifacts", appId, "public", "data", "menu_items"),
      orderBy("createdAt", "desc")
    );
    const unsubMenu = onSnapshot(qMenu, async (snapshot) => {
      // Data Migration
      if (snapshot.empty) {
        const batch = writeBatch(db);
        INITIAL_MENU_ITEMS.forEach((item) => {
          const docRef = doc(
            collection(db, "artifacts", appId, "public", "data", "menu_items")
          );
          batch.set(docRef, { ...item, createdAt: serverTimestamp() });
        });
        await batch.commit();
      } else {
        setMenuItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      }
    });

    const qOrders = query(
      collection(db, "artifacts", appId, "public", "data", "orders"),
      orderBy("createdAt", "desc")
    );
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const qExpenses = query(
      collection(db, "artifacts", appId, "public", "data", "expenses"),
      orderBy("date", "desc")
    );
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const qReports = query(
      collection(db, "artifacts", appId, "public", "data", "reports"),
      orderBy("date", "desc")
    );
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMenu();
      unsubOrders();
      unsubExpenses();
      unsubReports();
    };
  }, [user]);

  // --- Logic: Menu Management ---
  const saveMenuItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      basePrice: Number(formData.get("basePrice")),
      type: formData.get("type"),
      hasSets: formData.get("hasSets") === "on",
      priceSetA: formData.get("priceSetA")
        ? Number(formData.get("priceSetA"))
        : null,
      priceSetB: formData.get("priceSetB")
        ? Number(formData.get("priceSetB"))
        : null,
      priceDessertSet: formData.get("priceDessertSet")
        ? Number(formData.get("priceDessertSet"))
        : null,
      canTakeout: formData.get("canTakeout") === "on",
      imageColor: formData.get("imageColor"),
    };

    if (!data.imageColor) {
      if (data.type === "food") data.imageColor = "bg-orange-100";
      if (data.type === "drink") data.imageColor = "bg-blue-50";
      if (data.type === "dessert") data.imageColor = "bg-pink-100";
    }

    try {
      if (editingMenu?.id) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "menu_items",
            editingMenu.id
          ),
          data
        );
      } else {
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "menu_items"),
          {
            ...data,
            createdAt: serverTimestamp(),
          }
        );
      }
      setEditingMenu(null);
      alert("メニューを保存しました！");
    } catch (err) {
      alert("エラー: " + err.message);
    }
  };

  const deleteMenuItem = async (id) => {
    if (confirm("本当に削除しますか？")) {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "menu_items", id)
      );
    }
  };

  // --- Logic: POS ---
  const addToCart = (item, setType = "single", isTakeout = false) => {
    const price = getPrice(item, setType);
    const newItem = {
      tempId: Date.now(),
      itemId: item.id,
      name: item.name,
      setType: setType,
      setLabel: SET_OPTIONS[setType]?.label || "",
      isTakeout: isTakeout,
      price: price,
    };
    setCart([...cart, newItem]);
    setSelectedItem(null);
  };

  const removeFromCart = (tempId) => {
    setCart(cart.filter((c) => c.tempId !== tempId));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !user) return;

    const orderData = {
      items: cart,
      total: calculateTotal(),
      createdAt: serverTimestamp(),
      date: new Date().toISOString().split("T")[0],
      staff: staffName,
      status: "completed",
    };

    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "orders"),
        orderData
      );
      setCart([]);
      setIsCheckoutModalOpen(false);
    } catch (error) {
      console.error("Error saving order:", error);
      alert("保存に失敗しました: " + error.message);
    }
  };

  // --- Logic: Expenses ---
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    item: "",
    amount: "",
    payer: "高橋",
    category: "仕入",
  });
  const submitExpense = async (e) => {
    e.preventDefault();
    if (!user || !expenseForm.amount) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "expenses"),
        {
          ...expenseForm,
          amount: Number(expenseForm.amount),
          createdAt: serverTimestamp(),
        }
      );
      setExpenseForm({ ...expenseForm, item: "", amount: "" });
    } catch (err) {
      console.error(err);
    }
  };

  // --- Logic: Reports ---
  const [reportForm, setReportForm] = useState({
    date: new Date().toISOString().split("T")[0],
    weather: "晴れ",
    customerCount: "",
    note: "",
  });
  const submitReport = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "reports"),
        {
          ...reportForm,
          customerCount: Number(reportForm.customerCount),
          createdAt: serverTimestamp(),
        }
      );
      alert("日報を保存しました");
      setReportForm({ ...reportForm, note: "", customerCount: "" });
    } catch (err) {
      console.error(err);
    }
  };

  // --- Logic: Aggregation ---
  const getAggregatedData = () => {
    const dataByDate = {};
    orders.forEach((order) => {
      const d = order.date;
      if (!dataByDate[d])
        dataByDate[d] = {
          date: d,
          sales: 0,
          expenses: 0,
          takahashiPay: 0,
          hamadaPay: 0,
          cashPay: 0,
          itemCounts: {},
          orderCount: 0,
          expenseDetails: [],
        };
      dataByDate[d].sales += order.total;
      dataByDate[d].orderCount += 1;
      if (order.items)
        order.items.forEach((item) => {
          const key =
            item.name +
            (item.setType !== "single" ? ` (${item.setLabel})` : "");
          if (!dataByDate[d].itemCounts[key])
            dataByDate[d].itemCounts[key] = {
              count: 0,
              amount: 0,
              isTakeout: item.isTakeout,
            };
          dataByDate[d].itemCounts[key].count += 1;
          dataByDate[d].itemCounts[key].amount += item.price;
        });
    });
    expenses.forEach((exp) => {
      const d = exp.date;
      if (!dataByDate[d])
        dataByDate[d] = {
          date: d,
          sales: 0,
          expenses: 0,
          takahashiPay: 0,
          hamadaPay: 0,
          cashPay: 0,
          itemCounts: {},
          orderCount: 0,
          expenseDetails: [],
        };
      dataByDate[d].expenses += exp.amount;
      dataByDate[d].expenseDetails.push(exp);
      if (exp.payer === "高橋") dataByDate[d].takahashiPay += exp.amount;
      if (exp.payer === "浜田") dataByDate[d].hamadaPay += exp.amount;
    });
    return Object.values(dataByDate).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  };
  const aggregatedData = useMemo(() => getAggregatedData(), [orders, expenses]);

  // --- Render Functions (Complete) ---

  const renderExpenses = () => (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-stone-700 mb-6 flex items-center gap-2">
          <DollarSign className="text-orange-600" /> 経費の入力
        </h2>
        <form onSubmit={submitExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">
                日付
              </label>
              <input
                type="date"
                required
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="w-full p-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">
                金額
              </label>
              <input
                type="number"
                required
                placeholder="¥0"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                className="w-full p-2 border border-stone-300 rounded-lg font-mono text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              支払った人（財布）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["高橋", "浜田"].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setExpenseForm({ ...expenseForm, payer: p })}
                  className={`p-2 rounded-lg text-sm border ${
                    expenseForm.payer === p
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white text-stone-600 border-stone-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              分類
            </label>
            <select
              value={expenseForm.category}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, category: e.target.value })
              }
              className="w-full p-2 border border-stone-300 rounded-lg bg-white"
            >
              <option>仕入</option>
              <option>消耗品</option>
              <option>人件費</option>
              <option>委託費</option>
              <option>その他</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              品目・詳細
            </label>
            <input
              type="text"
              placeholder="例：玉ねぎ、洗剤など"
              value={expenseForm.item}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, item: e.target.value })
              }
              className="w-full p-2 border border-stone-300 rounded-lg"
            />
          </div>

          <Button type="submit" className="w-full py-3 mt-4">
            <PlusCircle size={18} /> 経費を登録
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h3 className="font-bold text-stone-500 text-sm pl-2">最近の経費</h3>
        {expenses.slice(0, 5).map((exp) => (
          <div
            key={exp.id}
            className="bg-white p-3 rounded-lg border border-stone-200 flex justify-between items-center text-sm"
          >
            <div>
              <div className="font-bold text-stone-700">
                {exp.item || exp.category}
              </div>
              <div className="text-xs text-stone-400">
                {exp.date} / {exp.payer}払
              </div>
            </div>
            <div className="font-mono font-bold text-stone-600">
              ¥{Number(exp.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReport = () => (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-stone-700 mb-6 flex items-center gap-2">
          <BookOpen className="text-orange-600" /> 今日の日報
        </h2>
        <form onSubmit={submitReport} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">
                日付
              </label>
              <input
                type="date"
                required
                value={reportForm.date}
                onChange={(e) =>
                  setReportForm({ ...reportForm, date: e.target.value })
                }
                className="w-full p-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">
                天気
              </label>
              <div className="flex bg-stone-100 rounded-lg p-1">
                {["晴れ", "曇り", "雨"].map((w) => (
                  <button
                    type="button"
                    key={w}
                    onClick={() => setReportForm({ ...reportForm, weather: w })}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                      reportForm.weather === w
                        ? "bg-white shadow text-orange-600 font-bold"
                        : "text-stone-400"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              来店数（組/人）
            </label>
            <input
              type="number"
              value={reportForm.customerCount}
              onChange={(e) =>
                setReportForm({ ...reportForm, customerCount: e.target.value })
              }
              className="w-full p-2 border border-stone-300 rounded-lg"
              placeholder="人数を入力"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              業務メモ・日記
            </label>
            <textarea
              value={reportForm.note}
              onChange={(e) =>
                setReportForm({ ...reportForm, note: e.target.value })
              }
              className="w-full p-2 border border-stone-300 rounded-lg h-32"
              placeholder="試作の感想、お客様の様子など..."
            />
          </div>

          <Button type="submit" className="w-full">
            日報を保存
          </Button>
        </form>
      </Card>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold text-stone-700 mb-4 flex items-center gap-2">
        <History className="text-orange-600" /> 帳簿（売上・経費集計）
      </h2>

      {/* Simulating the Notebook Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="p-3 whitespace-nowrap">日付</th>
                <th className="p-3 whitespace-nowrap text-right">売上</th>
                <th className="p-3 whitespace-nowrap text-right text-orange-700">
                  高橋払
                </th>
                <th className="p-3 whitespace-nowrap text-right text-blue-700">
                  浜田払
                </th>
                <th className="p-3 whitespace-nowrap text-right">経費計</th>
                <th className="p-3 whitespace-nowrap text-right font-bold">
                  収支
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {aggregatedData.map((row) => {
                const profit = row.sales - row.expenses;
                const isExpanded = expandedDate === row.date;

                return (
                  <React.Fragment key={row.date}>
                    <tr
                      onClick={() =>
                        setExpandedDate(isExpanded ? null : row.date)
                      }
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? "bg-orange-50" : "hover:bg-stone-50"
                      }`}
                    >
                      <td className="p-3 font-mono text-stone-500 flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-orange-600" />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                        {row.date.slice(5)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        ¥{row.sales.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-700">
                        {row.takahashiPay > 0
                          ? `¥${row.takahashiPay.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-700">
                        {row.hamadaPay > 0
                          ? `¥${row.hamadaPay.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-stone-400">
                        ¥{row.expenses.toLocaleString()}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          profit >= 0 ? "text-stone-800" : "text-red-500"
                        }`}
                      >
                        ¥{profit.toLocaleString()}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-stone-50">
                        <td colSpan={6} className="p-4">
                          <div className="bg-white rounded-lg border border-stone-200 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Sales Breakdown */}
                              <div>
                                <h4 className="font-bold text-stone-700 mb-3 flex items-center gap-2 text-sm border-b border-stone-100 pb-2">
                                  <Receipt
                                    size={16}
                                    className="text-orange-500"
                                  />{" "}
                                  本日の販売内訳
                                </h4>
                                {Object.keys(row.itemCounts).length === 0 ? (
                                  <p className="text-stone-400 text-xs">
                                    データなし
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {Object.entries(row.itemCounts)
                                      .sort(([, a], [, b]) => b.count - a.count)
                                      .map(([name, data]) => (
                                        <div
                                          key={name}
                                          className="flex justify-between items-center text-sm border-b border-stone-100 pb-1 border-dashed last:border-0"
                                        >
                                          <span className="text-stone-600">
                                            {name}
                                            {data.isTakeout && (
                                              <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                Takeout
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex gap-4">
                                            <span className="font-bold text-stone-800">
                                              x{data.count}
                                            </span>
                                            <span className="font-mono text-stone-400 w-16 text-right">
                                              ¥{data.amount.toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>

                              {/* Expenses Breakdown */}
                              <div>
                                <h4 className="font-bold text-stone-700 mb-3 flex items-center gap-2 text-sm border-b border-stone-100 pb-2">
                                  <DollarSign
                                    size={16}
                                    className="text-red-500"
                                  />{" "}
                                  本日の経費詳細
                                </h4>
                                {row.expenseDetails.length === 0 ? (
                                  <p className="text-stone-400 text-xs">
                                    経費なし
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {row.expenseDetails.map((exp, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center text-sm border-b border-stone-100 pb-1 border-dashed last:border-0"
                                      >
                                        <div className="flex gap-2 items-center">
                                          <span
                                            className={`text-[10px] px-1.5 rounded text-white font-bold ${
                                              exp.payer === "高橋"
                                                ? "bg-orange-400"
                                                : exp.payer === "浜田"
                                                ? "bg-blue-400"
                                                : "bg-stone-400"
                                            }`}
                                          >
                                            {exp.payer.charAt(0)}
                                          </span>
                                          <span className="text-stone-600">
                                            {exp.item || exp.category}
                                          </span>
                                        </div>
                                        <span className="font-mono text-stone-600">
                                          ¥{exp.amount.toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-4">
        <h3 className="font-bold text-orange-800 mb-2 text-sm">
          💡 使い方メモ
        </h3>
        <p className="text-xs text-orange-700 leading-relaxed">
          ・表の「日付」の部分をタップすると、内訳（売上メニューと経費の詳細）がパカッと開きます。
          <br />
          ・経費の横にあるオレンジの「高」や青い「浜」マークで、誰が支払ったかも一目で分かります。
        </p>
      </div>
    </div>
  );

  const renderPOS = () => (
    <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <h2 className="text-xl font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Utensils className="text-orange-600" /> メニュー
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* New items first due to sort order */}
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.hasSets) {
                  setSelectedItem(item);
                } else {
                  addToCart(item, item.isFixedSet ? "setB" : "single", false);
                }
              }}
              className={`p-4 rounded-xl text-left transition-all active:scale-95 shadow-sm border border-stone-100 flex flex-col justify-between h-32 ${item.imageColor}`}
            >
              <span className="font-bold text-stone-800 leading-tight">
                {item.name}
              </span>
              <span className="font-mono text-stone-600 bg-white/50 px-2 py-1 rounded w-fit text-sm">
                ¥{item.basePrice.toLocaleString()}~
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setActiveTab("menu");
              setEditingMenu({});
            }}
            className="p-4 rounded-xl flex flex-col justify-center items-center h-32 border-2 border-dashed border-stone-300 text-stone-400 hover:bg-stone-50 hover:border-orange-300 hover:text-orange-500 transition-colors"
          >
            <PlusCircle size={24} />{" "}
            <span className="text-xs font-bold mt-2">メニュー追加</span>
          </button>
        </div>
      </div>
      {/* Sidebar Cart */}
      <div className="md:w-80 bg-stone-50 border-t md:border-l border-stone-200 flex flex-col h-1/3 md:h-full fixed bottom-0 left-0 right-0 md:relative z-10 shadow-xl md:shadow-none">
        <div className="p-4 bg-orange-600 text-white flex justify-between items-center">
          <span className="font-bold flex items-center gap-2">
            <ShoppingBag size={18} /> 注文リスト
          </span>
          <span className="font-mono text-xl">
            ¥{calculateTotal().toLocaleString()}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-stone-50">
          {cart.length === 0 ? (
            <div className="text-stone-400 text-center py-8 text-sm">
              注文はまだありません
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.tempId}
                className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-start border border-stone-100"
              >
                <div>
                  <div className="font-bold text-stone-800 text-sm">
                    {item.name}
                  </div>
                  <div className="text-xs text-stone-500 flex gap-2 mt-1">
                    {item.setType !== "single" && (
                      <span className="bg-orange-100 text-orange-700 px-1 rounded">
                        {item.setLabel}
                      </span>
                    )}
                    {item.isTakeout ? (
                      <span className="bg-blue-100 text-blue-700 px-1 rounded flex items-center gap-1">
                        <ShoppingBag size={10} /> Takeout
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-1 rounded flex items-center gap-1">
                        <Home size={10} /> 店内
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm">¥{item.price}</span>
                  <button
                    onClick={() => removeFromCart(item.tempId)}
                    className="text-stone-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 bg-white border-t border-stone-200">
          <Button
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full py-3 text-lg shadow-orange-200"
            disabled={cart.length === 0}
          >
            お会計へ進む
          </Button>
        </div>
      </div>

      {/* Options Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div
              className={`p-4 ${selectedItem.imageColor} font-bold text-lg flex justify-between items-center`}
            >
              {selectedItem.name}{" "}
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 bg-white/50 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-bold text-stone-500 mb-2 block">
                  セットを選んでください
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => addToCart(selectedItem, "single", false)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-stone-50 flex justify-between"
                  >
                    <span>単品</span>{" "}
                    <span className="font-mono">
                      ¥{getPrice(selectedItem, "single")}
                    </span>
                  </button>
                  {selectedItem.type === "food" && (
                    <>
                      <button
                        onClick={() => addToCart(selectedItem, "setA", false)}
                        className="w-full text-left p-3 border rounded-lg hover:bg-orange-50 border-orange-200 flex justify-between"
                      >
                        <div>
                          <span className="block font-bold text-orange-700">
                            A Set
                          </span>
                          <span className="text-xs text-stone-500">
                            お好きなドリンク
                          </span>
                        </div>
                        <span className="font-mono">
                          ¥{getPrice(selectedItem, "setA")}
                        </span>
                      </button>
                      <button
                        onClick={() => addToCart(selectedItem, "setB", false)}
                        className="w-full text-left p-3 border rounded-lg hover:bg-orange-50 border-orange-200 flex justify-between"
                      >
                        <div>
                          <span className="block font-bold text-orange-700">
                            B Set
                          </span>
                          <span className="text-xs text-stone-500">
                            ドリンク ＋ デザート
                          </span>
                        </div>
                        <span className="font-mono">
                          ¥{getPrice(selectedItem, "setB")}
                        </span>
                      </button>
                    </>
                  )}
                  {selectedItem.type === "dessert" && (
                    <button
                      onClick={() =>
                        addToCart(selectedItem, "setDessert", false)
                      }
                      className="w-full text-left p-3 border rounded-lg hover:bg-pink-50 border-pink-200 flex justify-between"
                    >
                      <div>
                        <span className="block font-bold text-pink-700">
                          デザートセット
                        </span>
                        <span className="text-xs text-stone-500">
                          お好きなドリンク
                        </span>
                      </div>
                      <span className="font-mono">
                        ¥{getPrice(selectedItem, "setDessert")}
                      </span>
                    </button>
                  )}
                </div>
              </div>
              {selectedItem.canTakeout && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs text-center text-stone-400 mb-2">
                    単品でのテイクアウトはこちら
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => addToCart(selectedItem, "single", true)}
                  >
                    <ShoppingBag size={18} /> テイクアウト (単品)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center space-y-6">
            <h3 className="text-xl font-bold text-stone-800">お会計確定</h3>
            <div className="py-4 bg-stone-50 rounded-lg">
              <p className="text-sm text-stone-500">合計金額</p>
              <p className="text-4xl font-mono font-bold text-orange-600">
                ¥{calculateTotal().toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsCheckoutModalOpen(false)}
              >
                戻る
              </Button>
              <Button className="flex-1" onClick={handleCheckout}>
                確定する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMenuSettings = () => (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-stone-700 flex items-center gap-2">
          <Settings className="text-orange-600" /> メニュー管理
        </h2>
        <Button onClick={() => setEditingMenu({})} className="text-sm">
          <PlusCircle size={16} /> 新規追加
        </Button>
      </div>
      <div className="space-y-3">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl border border-stone-200 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg ${item.imageColor} flex items-center justify-center text-stone-500`}
              >
                {item.type === "food" && <Utensils size={20} />}{" "}
                {item.type === "drink" && <Coffee size={20} />}{" "}
                {item.type === "dessert" && <ChefHat size={20} />}
              </div>
              <div>
                <div className="font-bold text-stone-800">{item.name}</div>
                <div className="text-xs text-stone-500">
                  ¥{item.basePrice.toLocaleString()}{" "}
                  {item.hasSets &&
                    item.type === "food" &&
                    `(A:¥${getPrice(item, "setA")}/B:¥${getPrice(
                      item,
                      "setB"
                    )})`}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingMenu(item)}
                className="p-2 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => deleteMenuItem(item.id)}
                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingMenu && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200 h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">
                {editingMenu.id ? "メニュー編集" : "新規メニュー追加"}
              </h3>
              <button
                onClick={() => setEditingMenu(null)}
                className="p-1 hover:bg-stone-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={saveMenuItem}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <input
                type="hidden"
                name="imageColor"
                value={editingMenu.imageColor || ""}
              />
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  メニュー名
                </label>
                <input
                  name="name"
                  defaultValue={editingMenu.name}
                  required
                  className="w-full p-2 border rounded-lg"
                  placeholder="例：季節のパスタ"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    単品価格 (円)
                  </label>
                  <input
                    name="basePrice"
                    type="number"
                    defaultValue={editingMenu.basePrice}
                    required
                    className="w-full p-2 border rounded-lg"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    種類
                  </label>
                  <select
                    name="type"
                    defaultValue={editingMenu.type || "food"}
                    className="w-full p-2 border rounded-lg bg-white"
                    onChange={(e) =>
                      setEditingMenu({ ...editingMenu, type: e.target.value })
                    } // Force update to show/hide fields
                  >
                    <option value="food">食事</option>
                    <option value="drink">ドリンク</option>
                    <option value="dessert">デザート</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-stone-100">
                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    name="hasSets"
                    defaultChecked={editingMenu.hasSets}
                    className="w-4 h-4 text-orange-600 rounded"
                    onChange={(e) =>
                      setEditingMenu({
                        ...editingMenu,
                        hasSets: e.target.checked,
                      })
                    }
                  />
                  セット販売を有効にする
                </label>

                {/* Dynamic Price Inputs for Sets */}
                {(editingMenu.hasSets || !editingMenu.id) &&
                  (editingMenu.type === "food" || !editingMenu.type) && (
                    <div className="pl-6 space-y-3 bg-stone-50 p-3 rounded-lg">
                      <div>
                        <label className="block text-xs font-bold text-orange-600 mb-1">
                          Aセット価格 (ドリンク付)
                        </label>
                        <input
                          name="priceSetA"
                          type="number"
                          defaultValue={editingMenu.priceSetA}
                          placeholder={`自動計算: ¥${
                            (editingMenu.basePrice || 0) + 300
                          }`}
                          className="w-full p-2 border border-orange-200 rounded-lg bg-white"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">
                          ※空欄の場合は自動で +300円 になります
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-orange-600 mb-1">
                          Bセット価格 (ドリンク・デザート付)
                        </label>
                        <input
                          name="priceSetB"
                          type="number"
                          defaultValue={editingMenu.priceSetB}
                          placeholder={`自動計算: ¥${
                            (editingMenu.basePrice || 0) + 700
                          }`}
                          className="w-full p-2 border border-orange-200 rounded-lg bg-white"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">
                          ※空欄の場合は自動で +700円 になります
                        </p>
                      </div>
                    </div>
                  )}

                {(editingMenu.hasSets || !editingMenu.id) &&
                  editingMenu.type === "dessert" && (
                    <div className="pl-6 bg-pink-50 p-3 rounded-lg">
                      <label className="block text-xs font-bold text-pink-600 mb-1">
                        デザートセット価格 (ドリンク付)
                      </label>
                      <input
                        name="priceDessertSet"
                        type="number"
                        defaultValue={editingMenu.priceDessertSet}
                        placeholder={`自動計算: ¥${
                          (editingMenu.basePrice || 0) + 300
                        }`}
                        className="w-full p-2 border border-pink-200 rounded-lg bg-white"
                      />
                    </div>
                  )}

                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    name="canTakeout"
                    defaultChecked={editingMenu.canTakeout}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  テイクアウト可能にする
                </label>
              </div>

              <div className="pt-4 flex gap-3 shrink-0">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingMenu(null)}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1">
                  保存する
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (authError)
    return (
      <div className="h-screen flex items-center justify-center bg-red-50 text-red-600 p-8 text-center">
        <div>
          <AlertTriangle size={48} className="mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-2">認証エラー</h2>
          <p className="text-sm">{authError}</p>
          <p className="text-xs mt-4 text-stone-500">
            Firebaseコンソールの「Authentication」で
            <br />
            「匿名ログイン」が有効になっているか確認してください。
          </p>
        </div>
      </div>
    );

  if (!user)
    return (
      <div className="h-screen flex items-center justify-center bg-stone-100 text-stone-400">
        Loading...
      </div>
    );

  return (
    <div className="h-screen w-full bg-stone-100 text-stone-800 font-sans flex flex-col md:flex-row">
      <div className="bg-stone-800 text-white p-3 flex md:flex-col justify-between items-center md:w-20 md:h-full z-20 shadow-lg shrink-0">
        <div className="font-bold text-xl tracking-tighter text-orange-400 md:mb-6">
          <span className="md:hidden">畑Cafe</span>
          <span className="hidden md:block text-2xl">
            <ChefHat />
          </span>
        </div>
        <nav className="flex md:flex-col gap-1 md:gap-4 flex-1 justify-center md:justify-start w-full">
          {[
            { id: "pos", icon: Coffee, label: "注文" },
            { id: "expenses", icon: DollarSign, label: "経費" },
            { id: "report", icon: ClipboardList, label: "日報" },
            { id: "history", icon: TrendingUp, label: "帳簿" },
            { id: "menu", icon: Settings, label: "メニュー" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-2 md:p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-900/50"
                  : "text-stone-400 hover:bg-stone-700 hover:text-stone-200"
              }`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] md:text-xs font-bold">
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
        <button
          onClick={() => setStaffName(staffName === "高橋" ? "浜田" : "高橋")}
          className="md:mt-auto bg-stone-700 p-2 rounded-lg text-xs flex flex-col items-center gap-1 border border-stone-600"
        >
          <User size={16} />
          {staffName}
        </button>
      </div>
      <main className="flex-1 h-full overflow-hidden relative">
        <header className="h-14 bg-white border-b border-stone-200 flex items-center px-4 justify-between md:hidden">
          <span className="font-bold text-stone-700">
            {activeTab === "pos" && "注文入力"}
            {activeTab === "expenses" && "経費精算"}
            {activeTab === "report" && "日報・メモ"}
            {activeTab === "history" && "売上帳簿"}
            {activeTab === "menu" && "メニュー管理"}
          </span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
            担当: {staffName}
          </span>
        </header>
        <div className="h-full overflow-y-auto p-3 md:p-6 bg-stone-100">
          {activeTab === "pos" && renderPOS()}{" "}
          {activeTab === "expenses" && renderExpenses()}{" "}
          {activeTab === "report" && renderReport()}{" "}
          {activeTab === "history" && renderHistory()}{" "}
          {activeTab === "menu" && renderMenuSettings()}
        </div>
      </main>
    </div>
  );
}
