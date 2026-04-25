import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import * as xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Database Setup
const db = new Database('travel_info.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT,
    description TEXT,
    bg_image TEXT,
    show_transport BOOLEAN,
    show_pickup BOOLEAN,
    pickup_locations TEXT,
    max_companions INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    id_type TEXT,
    id_number TEXT,
    phone TEXT,
    birth_date TEXT,
    transport_type TEXT,
    car_number TEXT,
    pickup_location TEXT,
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
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  );
`);

// Initialize or Force Update default config for the new airport theme
const defaultConfig = {
  title: '呼和浩特盛乐国际机场 · 启航体验',
  description: '<h2>盛乐启程 · 预见未来</h2><p>欢迎参与呼和浩特盛乐国际机场（Hohhot Shengle International Airport）开通体验活动。作为首批“盛乐体验官”，您将深度参与新机场的值机流程测试、候机楼智慧设施体验及航站楼转运模拟。</p><ul><li>活动时间：2026年6月15日 - 6月20日</li><li>报到地点：盛乐国际机场 T1航站楼 2号值机岛</li><li>注意事项：请务必携带二代身份证原件，录入信息需与证件严格一致。</li></ul>',
  bg_image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=1200',
  pickup_locations: '航站楼P1停车场,机场大巴换乘中心,地铁盛乐机场站',
  show_transport: 1,
  show_pickup: 1,
  max_companions: 3
};

// We use INSERT OR REPLACE to force the update of the first config entry
db.prepare(`
  INSERT OR REPLACE INTO config (id, title, description, bg_image, show_transport, show_pickup, pickup_locations, max_companions)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?)
`).run(
  defaultConfig.title, 
  defaultConfig.description, 
  defaultConfig.bg_image, 
  defaultConfig.show_transport, 
  defaultConfig.show_pickup, 
  defaultConfig.pickup_locations, 
  defaultConfig.max_companions
);

app.use(express.json({ limit: '10mb' }));

// API Routes
app.get('/api/config', (req, res) => {
  const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { title, description, bg_image, show_transport, show_pickup, pickup_locations, max_companions } = req.body;
  db.prepare(`
    UPDATE config SET 
      title = ?, description = ?, bg_image = ?, 
      show_transport = ?, show_pickup = ?, 
      pickup_locations = ?, max_companions = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(title, description, bg_image, show_transport ? 1 : 0, show_pickup ? 1 : 0, pickup_locations, max_companions);
  res.json({ success: true });
});

app.post('/api/enroll', (req, res) => {
  const { 
    name, id_type, id_number, phone, birth_date, 
    transport_type, car_number, pickup_location, luggage_confirmed,
    companions 
  } = req.body;

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO entries (
        name, id_type, id_number, phone, birth_date,
        transport_type, car_number, pickup_location, luggage_confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, id_type, id_number, phone, birth_date, transport_type, car_number, pickup_location, luggage_confirmed ? 1 : 0);

    const entryId = result.lastInsertRowid;

    if (companions && Array.isArray(companions)) {
      const companionStmt = db.prepare(`
        INSERT INTO companions (entry_id, name, id_type, id_number, phone, birth_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const comp of companions) {
        companionStmt.run(entryId, comp.name, comp.id_type, comp.id_number, comp.phone, comp.birth_date);
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
      '证件类型': entry.id_type,
      '证件号': entry.id_number,
      '手机号': entry.phone,
      '出生日期': entry.birth_date,
      '交通方式': entry.transport_type,
      '车牌号': entry.car_number || '无',
      '上车地点': entry.pickup_location,
      '提交时间': entry.created_at,
      '关联主填报人': '-'
    });

    // Companion rows
    for (const comp of companions as any[]) {
      data.push({
        '类型': '同行人',
        '姓名': comp.name,
        '证件类型': comp.id_type,
        '证件号': comp.id_number,
        '手机号': comp.phone,
        '出生日期': comp.birth_date,
        '交通方式': '-',
        '车牌号': '-',
        '上车地点': '-',
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
