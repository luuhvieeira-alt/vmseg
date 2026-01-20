
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { Venda, User, Meta, Indicacao, Empresa } from "../types";

const firebaseConfig = {
    apiKey: "AIzaSyDvlpoHOKyRXmNG3RVYiTspOQ3TxsHH03s",
    authDomain: "vm-seguros-crm.firebaseapp.com",
    projectId: "vm-seguros-crm",
    storageBucket: "vm-seguros-crm.firebasestorage.app",
    messagingSenderId: "420895990730",
    appId: "1:420895990730:web:f6c753d929d84b5330e533"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const cloud = {
    async salvarVenda(d: Venda) {
        const { id, ...data } = d;
        if (id) {
            await updateDoc(doc(db, "vendas", id), data as any);
        } else {
            await addDoc(collection(db, "vendas"), { ...data, dataCriacao: Date.now() });
        }
    },
    async salvarIndicacao(d: Indicacao) {
        const { id, ...data } = d;
        if (id) {
            await updateDoc(doc(db, "indicacoes", id), data as any);
        } else {
            await addDoc(collection(db, "indicacoes"), { ...data, dataCriacao: Date.now() });
        }
    },
    async salvarUsuario(d: User) {
        const { id, ...data } = d;
        if (id) {
            await updateDoc(doc(db, "usuarios", id), data as any);
        } else {
            await addDoc(collection(db, "usuarios"), data);
        }
    },
    async salvarMeta(d: Meta) {
        await setDoc(doc(db, "metas", d.vendedor), d);
    },
    async salvarEmpresa(d: Empresa) {
        const { id, ...data } = d;
        if (id) {
            await updateDoc(doc(db, "empresas", id), data as any);
        } else {
            await addDoc(collection(db, "empresas"), data);
        }
    },
    async apagar(col: string, id: string) {
        await deleteDoc(doc(db, col, id));
    },
    async updateStatus(col: string, id: string, s: string) {
        await updateDoc(doc(db, col, id), { status: s });
    },
    subscribeVendas(callback: (vendas: Venda[]) => void) {
        return onSnapshot(query(collection(db, "vendas"), orderBy("dataCriacao", "desc")), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Venda)));
        });
    },
    subscribeUsuarios(callback: (users: User[]) => void) {
        return onSnapshot(collection(db, "usuarios"), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        });
    },
    subscribeMetas(callback: (metas: Meta[]) => void) {
        return onSnapshot(collection(db, "metas"), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meta)));
        });
    },
    subscribeIndicacoes(callback: (indicacoes: Indicacao[]) => void) {
        return onSnapshot(query(collection(db, "indicacoes"), orderBy("dataCriacao", "desc")), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Indicacao)));
        });
    },
    subscribeEmpresas(callback: (empresas: Empresa[]) => void) {
        return onSnapshot(query(collection(db, "empresas"), orderBy("nome", "asc")), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
        });
    }
};
