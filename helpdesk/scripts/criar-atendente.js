import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createPool } from '../backend/database/connection.js';
import { hashPassword } from '../backend/security/password.js';
import { validateCredentials } from '../backend/validator/auth.js';
if (!process.stdin.isTTY) throw new Error('Execute em um terminal interativo.');
let muted = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
let pool;
try {
  const nome = await rl.question('Nome do atendente: ');
  const email = await rl.question('E-mail: ');
  process.stdout.write('Senha (não será exibida): ');
  muted = true;
  const senha = await rl.question('');
  muted = false;
  process.stdout.write('\nConfirme a senha (não será exibida): ');
  muted = true;
  const confirmar_senha = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  const data = validateCredentials({ nome, email, senha, confirmar_senha }, true);
  pool = createPool();
  await pool.query(`INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'atendente')`, [data.nome, data.email, await hashPassword(data.senha)]);
  console.log('Atendente criado. Nenhum usuário existente foi alterado.');
} catch {
  console.error('Não foi possível criar o atendente. Confira os campos, a conexão e se o e-mail já está cadastrado.');
  process.exitCode = 1;
} finally { muted = false; rl.close(); if (pool) await pool.end(); }
