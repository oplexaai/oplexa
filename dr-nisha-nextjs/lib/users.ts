import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface UsersData {
  users: User[];
}

const USERS_FILE = path.join(process.cwd(), ".oplexa-users.json");

function read(): UsersData {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch {}
  return { users: [] };
}

function save(data: UsersData) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

export function findUserByEmail(email: string): User | null {
  const data = read();
  return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserById(id: string): User | null {
  const data = read();
  return data.users.find((u) => u.id === id) || null;
}

export async function createUser(email: string, username: string, password: string): Promise<User> {
  const data = read();
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  save(data);
  return user;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
