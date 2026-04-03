// Lightweight local storage shim that implements a small subset
// of the Firestore API used by the app. Data is persisted to
// `localStorage` under a single key so the app can run fully offline.

const STORAGE_KEY = 'nurseflow_local_db_v1';

type Path = string[];

function pathKey(path: Path) {
  return path.join('/');
}

function readDb(): Record<string, Record<string, any>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeDb(db: Record<string, Record<string, any>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to write local DB', e);
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizePathArgs(args: IArguments | any[]): Path {
  const arr = Array.from(args as any[]);
  // If first arg is a collection/doc ref, return its path
  if (arr.length >= 1 && arr[0] && typeof arr[0] === 'object' && arr[0]._path) return arr[0]._path;
  // If first arg is a db object (our placeholder), drop it
  if (arr.length >= 1 && typeof arr[0] === 'object' && !arr[0]._path && arr.length > 1) {
    arr.shift();
  }
  return arr.map(String);
}

function deepGet(obj: any, field: string) {
  if (!obj) return undefined;
  const parts = field.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function reviveDates(obj: any) {
  // Keep simple: return object as-is. We store timestamps as numbers.
  return obj;
}

// --- API surface ---

export function collection(...args: any[]) {
  const path = normalizePathArgs(args);
  return { _path: path, type: 'collection' };
}

export function doc(...args: any[]) {
  // doc(collectionRef) -> new doc with generated id
  if (args.length === 1 && args[0] && args[0]._path) {
    const collectionRef = args[0];
    const id = generateId();
    return { _path: [...collectionRef._path, id], id, type: 'doc' };
  }
  // doc(collectionRef, id)
  if (args.length === 2 && args[0] && args[0]._path) {
    const collectionRef = args[0];
    const id = String(args[1]);
    return { _path: [...collectionRef._path, id], id, type: 'doc' };
  }
  // doc(db, 'col', 'id', ...)
  const parts = Array.from(args).slice(1).map(String);
  const id = parts[parts.length - 1];
  return { _path: parts, id, type: 'doc' };
}

export async function getDocFromServer(docRef: any) {
  return getDoc(docRef);
}

export async function getDoc(docRef: any) {
  const pathParts: Path = docRef._path;
  const collectionPath = pathParts.slice(0, -1);
  const id = pathParts[pathParts.length - 1];
  const db = readDb();
  const key = pathKey(collectionPath);
  const collection = db[key] || {};
  const data = collection[id];
  const exists = !!data;
  return {
    id,
    exists: () => exists,
    data: () => (data ? reviveDates(deepClone(data)) : undefined),
  };
}

export async function getDocs(queryRef: any) {
  let collectionRef: any;
  let clauses: any[] = [];
  if (queryRef && queryRef.collectionRef) {
    collectionRef = queryRef.collectionRef;
    clauses = queryRef.clauses || [];
  } else if (queryRef && queryRef._path) {
    collectionRef = queryRef;
  } else {
    collectionRef = queryRef;
  }

  const pathParts: Path = collectionRef._path;
  const db = readDb();
  const key = pathKey(pathParts);
  const collection = db[key] || {};
  let docs = Object.keys(collection).map(id => ({ id, data: reviveDates(deepClone(collection[id])) }));

  for (const clause of clauses) {
    if (clause.type === 'where') {
      const { field, op, value } = clause;
      if (op === '==') {
        docs = docs.filter(d => deepGet(d.data, field) === value);
      }
    }
    if (clause.type === 'orderBy') {
      const { field, direction } = clause;
      docs.sort((a, b) => {
        const av = deepGet(a.data, field);
        const bv = deepGet(b.data, field);
        if (av == null && bv == null) return 0;
        if (av == null) return direction === 'asc' ? -1 : 1;
        if (bv == null) return direction === 'asc' ? 1 : -1;
        if (av < bv) return direction === 'asc' ? -1 : 1;
        if (av > bv) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    if (clause.type === 'limit') {
      docs = docs.slice(0, clause.count);
    }
  }

  return {
    docs: docs.map(d => ({ id: d.id, data: () => d.data }))
  };
}

export function query(collectionRef: any, ...clauses: any[]) {
  return { collectionRef, clauses: clauses.flat() };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number) {
  return { type: 'limit', count };
}

export async function setDoc(docRef: any, data: any) {
  const pathParts: Path = docRef._path;
  const collectionPath = pathParts.slice(0, -1);
  const id = pathParts[pathParts.length - 1];
  const db = readDb();
  const key = pathKey(collectionPath);
  const collection = db[key] || {};
  collection[id] = deepClone(data);
  db[key] = collection;
  writeDb(db);
}

export async function updateDoc(docRef: any, data: any) {
  const pathParts: Path = docRef._path;
  const collectionPath = pathParts.slice(0, -1);
  const id = pathParts[pathParts.length - 1];
  const db = readDb();
  const key = pathKey(collectionPath);
  const collection = db[key] || {};
  const existing = collection[id] || {};
  const merged = { ...existing, ...deepClone(data) };
  collection[id] = merged;
  db[key] = collection;
  writeDb(db);
}

export function serverTimestamp() {
  return Date.now();
}

// export default to make some imports easier if needed
export default {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDocFromServer
};
