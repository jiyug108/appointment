import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import * as xlsx from 'xlsx';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Database Setup
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const db = new Database(path.join(dataDir, 'travel_info.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT,
    description TEXT,
    bg_image TEXT,
    transport_config TEXT DEFAULT 'both',
    show_pickup BOOLEAN,
    pickup_locations TEXT,
    show_referrer BOOLEAN DEFAULT 0,
    referrer_config TEXT DEFAULT 'none',
    max_companions INTEGER,
    start_date DATE,
    end_date DATE,
    max_registrations INTEGER,
    min_age INTEGER DEFAULT 18,
    max_age INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    id_type TEXT,
    id_number TEXT UNIQUE,
    phone TEXT,
    birth_date TEXT,
    gender TEXT,
    first_time_flying BOOLEAN DEFAULT 0,
    transport_type TEXT,
    car_number TEXT,
    pickup_location TEXT,
    referrer_type TEXT,
    referrer_name TEXT,
    referrer_dept TEXT,
    referrer_phone TEXT,
    luggage_confirmed BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS companions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER,
    name TEXT,
    id_type TEXT,
    id_number TEXT,
    phone TEXT,
    birth_date TEXT,
    gender TEXT,
    remarks TEXT,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  );
`);

// Migration: Add columns to existing tables if they don't exist
const addColumn = (table: string, column: string, type: string) => {
  const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!tableInfo.find(col => col.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  }
};

addColumn('config', 'transport_config', 'TEXT DEFAULT "both"');
addColumn('config', 'start_date', 'DATE');
addColumn('config', 'end_date', 'DATE');
addColumn('config', 'max_registrations', 'INTEGER');
addColumn('config', 'min_age', 'INTEGER DEFAULT 18');
addColumn('config', 'max_age', 'INTEGER DEFAULT 60');
addColumn('config', 'show_referrer', 'BOOLEAN DEFAULT 0');
addColumn('config', 'referrer_config', 'TEXT DEFAULT "none"');
addColumn('config', 'is_active', 'BOOLEAN DEFAULT 1');
addColumn('entries', 'gender', 'TEXT');
addColumn('entries', 'first_time_flying', 'BOOLEAN DEFAULT 0');
addColumn('entries', 'remarks', 'TEXT');
addColumn('entries', 'referrer_type', 'TEXT');
addColumn('entries', 'referrer_name', 'TEXT');
addColumn('entries', 'referrer_dept', 'TEXT');
addColumn('entries', 'referrer_phone', 'TEXT');
addColumn('companions', 'gender', 'TEXT');

// Initialize or Force Update default config for the new airport theme
const defaultConfig = {
  title: '呼和浩特盛乐国际机场 · 启航体验',
  description: '<h2>盛乐启程 · 预见未来</h2><p>欢迎参与呼和浩特盛乐国际机场（Hohhot Shengle International Airport）开通体验活动。作为首批“盛乐体验官”，您将深度参与新机场的值机流程测试、候机楼智慧设施体验及航站楼转运模拟。</p><ul><li>活动时间：2026年6月15日 - 6月20日</li><li>报到地点：盛乐国际机场 T1航站楼 2号值机岛</li><li>注意事项：请务必携带二代身份证原件，录入信息需与证件严格一致。</li></ul>',
  bg_image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=1200',
  pickup_locations: '航站楼P1停车场,机场大巴换乘中心,地铁盛乐机场站',
  transport_config: 'both',
  referrer_config: 'none',
  show_pickup: 1,
  is_active: 1,
  max_companions: 3,
  start_date: '2026-06-01',
  end_date: '2026-12-31',
  max_registrations: 9999,
  min_age: 18,
  max_age: 60
};

// We use INSERT OR IGNORE to only insert the default config if it doesn't already exist
db.prepare(`
  INSERT OR IGNORE INTO config (id, title, description, bg_image, transport_config, show_pickup, pickup_locations, show_referrer, referrer_config, is_active, max_companions, start_date, end_date, max_registrations, min_age, max_age)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  defaultConfig.title, 
  defaultConfig.description, 
  defaultConfig.bg_image, 
  defaultConfig.transport_config, 
  defaultConfig.show_pickup, 
  defaultConfig.pickup_locations, 
  0,
  defaultConfig.referrer_config,
  defaultConfig.is_active,
  defaultConfig.max_companions,
  defaultConfig.start_date,
  defaultConfig.end_date,
  defaultConfig.max_registrations,
  defaultConfig.min_age,
  defaultConfig.max_age
);

app.use(express.json({ limit: '10mb' }));

// API Routes
app.get('/api/config', (req, res) => {
  const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { title, description, bg_image, transport_config, show_pickup, pickup_locations, show_referrer, referrer_config, is_active, max_companions, start_date, end_date, max_registrations, min_age, max_age } = req.body;
  db.prepare(`
    UPDATE config SET 
      title = ?, description = ?, bg_image = ?, 
      transport_config = ?, show_pickup = ?, 
      pickup_locations = ?, show_referrer = ?, 
      referrer_config = ?,
      is_active = ?, max_companions = ?,
      start_date = ?, end_date = ?, max_registrations = ?,
      min_age = ?, max_age = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(title, description, bg_image, transport_config, show_pickup ? 1 : 0, pickup_locations, show_referrer ? 1 : 0, referrer_config || 'none', is_active ? 1 : 0, max_companions, start_date, end_date, max_registrations, min_age, max_age);
  res.json({ success: true });
});

app.post('/api/enroll', (req, res) => {
  const { 
    name, id_type, id_number, phone, birth_date, gender, remarks,
    first_time_flying,
    transport_type, car_number, pickup_location, luggage_confirmed,
    referrer_type, referrer_name, referrer_dept, referrer_phone,
    companions 
  } = req.body;

  // Duplicate check (Check both main entries and companions)
  const idNumbers = [id_number, ...(companions?.map((c: any) => c.id_number) || [])];
  
  for (const id of idNumbers) {
    const mainDuplicate = db.prepare('SELECT id FROM entries WHERE id_number=?').get(id);
    const compDuplicate = db.prepare('SELECT id FROM companions WHERE id_number=?').get(id);
    if (mainDuplicate || compDuplicate) {
      return res.status(400).json({ error: `证件号 ${id} 已报名，请勿重复提交` });
    }
  }

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO entries (
        name, id_type, id_number, phone, birth_date, gender, remarks,
        first_time_flying,
        transport_type, car_number, pickup_location, luggage_confirmed,
        referrer_type, referrer_name, referrer_dept, referrer_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, id_type, id_number, phone, birth_date, gender, remarks || '', 
      first_time_flying ? 1 : 0,
      transport_type, car_number, pickup_location, luggage_confirmed ? 1 : 0,
      referrer_type, referrer_name, referrer_dept, referrer_phone
    );

    const entryId = result.lastInsertRowid;

    if (companions && Array.isArray(companions)) {
      const companionStmt = db.prepare(`
        INSERT INTO companions (entry_id, name, id_type, id_number, phone, birth_date, gender)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const comp of companions) {
        companionStmt.run(entryId, comp.name, comp.id_type, comp.id_number, comp.phone, comp.birth_date, comp.gender);
      }
    }
    return entryId;
  });

  try {
    const entryId = transaction();
    res.json({ success: true, id: entryId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '保存失败' });
  }
});

app.post('/api/clear-data', (req, res) => {
  const { password } = req.body;
  if (password !== 'admin123') { // Simple password check, can be configured
    return res.status(403).json({ error: '密码错误' });
  }
  db.prepare('DELETE FROM entries').run();
  db.prepare('DELETE FROM companions').run();
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as total FROM entries').get() as { total: number };
  res.json(count);
});

app.get('/api/entries', (req, res) => {
  const entries = db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all();
  // Join companions (optional: could do separate query or nested)
  const results = entries.map((entry: any) => {
    const comps = db.prepare('SELECT * FROM companions WHERE entry_id = ?').all(entry.id);
    return { ...entry, companions: comps };
  });
  res.json(results);
});

app.get('/api/export', (req, res) => {
  const entries = db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all();
  const data = [];
  
  for (const entry of entries as any[]) {
    const companions = db.prepare('SELECT * FROM companions WHERE entry_id = ?').all(entry.id);
    
    // Main person row
    data.push({
      '类型': '主填报人',
      '姓名': entry.name,
      '性别': entry.gender || '-',
      '是否第一次乘坐飞机': entry.first_time_flying ? '是' : '否',
      '证件类型': entry.id_type,
      '证件号': entry.id_number,
      '手机号': entry.phone,
      '出生日期': entry.birth_date,
      '交通方式': entry.transport_type,
      '车牌号': entry.car_number || '无',
      '上车地点': entry.pickup_location,
      '推荐人类型': entry.referrer_type || '-',
      '推荐人姓名': entry.referrer_name || '-',
      '推荐人部门': entry.referrer_dept || '-',
      '推荐人联系方式': entry.referrer_phone || '-',
      '备注': entry.remarks || '-',
      '提交时间': entry.created_at,
      '关联主填报人': '-'
    });

    // Companion rows
    for (const comp of companions as any[]) {
      data.push({
        '类型': '同行人',
        '姓名': comp.name,
        '性别': comp.gender || '-',
        '证件类型': comp.id_type,
        '证件号': comp.id_number,
        '手机号': comp.phone,
        '出生日期': comp.birth_date,
        '交通方式': '-',
        '车牌号': '-',
        '上车地点': '-',
        '备注': entry.remarks || '-',
        '提交时间': '-',
        '关联主填报人': entry.name
      });
    }
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, '出行信息');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=travel_export.xlsx');
  res.send(buffer);
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
