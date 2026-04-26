import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import * as xlsx from 'xlsx';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

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
    show_transport BOOLEAN,
    show_pickup BOOLEAN,
    pickup_locations TEXT,
    max_companions INTEGER,
    start_date DATE,
    end_date DATE,
    max_registrations INTEGER,
    min_age INTEGER DEFAULT 18,
    max_age INTEGER DEFAULT 60,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    id_type TEXT,
    id_number TEXT,
    phone TEXT,
    birth_date TEXT,
    gender TEXT,
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

addColumn('config', 'start_date', 'DATE');
addColumn('config', 'end_date', 'DATE');
addColumn('config', 'max_registrations', 'INTEGER');
addColumn('config', 'min_age', 'INTEGER DEFAULT 18');
addColumn('config', 'max_age', 'INTEGER DEFAULT 60');
addColumn('entries', 'gender', 'TEXT');
addColumn('entries', 'remarks', 'TEXT');
addColumn('companions', 'gender', 'TEXT');

// Initialize or Force Update default config for the new airport theme
const defaultConfig = {
  title: '呼和浩特盛乐国际机场 · 启航体验',
  description: '<h2>盛乐启程 · 预见未来</h2><p>欢迎参与呼和浩特盛乐国际机场（Hohhot Shengle International Airport）开通体验活动。作为首批“盛乐体验官”，您将深度参与新机场的值机流程测试、候机楼智慧设施体验及航站楼转运模拟。</p><ul><li>活动时间：2026年6月15日 - 6月20日</li><li>报到地点：盛乐国际机场 T1航站楼 2号值机岛</li><li>注意事项：请务必携带二代身份证原件，录入信息需与证件严格一致。</li></ul>',
  bg_image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=1200',
  pickup_locations: '航站楼P1停车场,机场大巴换乘中心,地铁盛乐机场站',
  show_transport: 1,
  show_pickup: 1,
  max_companions: 3,
  start_date: '2026-06-01',
  end_date: '2026-12-31',
  max_registrations: 9999,
  min_age: 18,
  max_age: 60
};

// We use INSERT OR REPLACE to force the update of the first config entry
db.prepare(`
  INSERT OR REPLACE INTO config (id, title, description, bg_image, show_transport, show_pickup, pickup_locations, max_companions, start_date, end_date, max_registrations, min_age, max_age)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  defaultConfig.title, 
  defaultConfig.description, 
  defaultConfig.bg_image, 
  defaultConfig.show_transport, 
  defaultConfig.show_pickup, 
  defaultConfig.pickup_locations, 
  defaultConfig.max_companions,
  defaultConfig.start_date,
  defaultConfig.end_date,
  defaultConfig.max_registrations,
  defaultConfig.min_age,
  defaultConfig.max_age
);

app.use(express.json({ limit: '10mb' }));

// API Routes
app.post('/api/ocr', async (req: any, res: any) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    // 1. Data preprocessing: convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 2. Image optimization for OCR
    const optimizedBuffer = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(140) // Make text pop
      .toBuffer();

    // 3. Tesseract Recognition
    const worker = await createWorker('chi_sim+eng');
    const { data: { text } } = await worker.recognize(optimizedBuffer);
    await worker.terminate();

    const cleanText = text.replace(/\s+/g, '');
    
    // Extraction: ID Number
    const idMatch = cleanText.match(/(\d{17}[\dXx])/);
    const idNumber = idMatch ? idMatch[0].toUpperCase() : '';
    
    // Extraction: Name (Improved logic)
    let name = '';
    const nameMatch = cleanText.match(/(?:姓名|姓夕|名|姓)[:：]?([\u4e00-\u9fa5]{2,4})/);
    const genderAnchorMatch = cleanText.match(/([\u4e00-\u9fa5]{2,4})(?=性别|男|女|民族)/);
    
    if (nameMatch) {
      name = nameMatch[1];
    } else if (genderAnchorMatch) {
      name = genderAnchorMatch[1];
    } else {
      // Fallback: first 2-4 CJK characters
      const fallback = cleanText.match(/[\u4e00-\u9fa5]{2,4}/);
      if (fallback) name = fallback[0];
    }

    // Extraction: Birth Date from ID (Most reliable)
    let birthDate = '';
    if (idNumber.length === 18) {
      birthDate = `${idNumber.substring(6, 10)}-${idNumber.substring(10, 12)}-${idNumber.substring(12, 14)}`;
    }

    res.json({
      success: true,
      name: name.trim(),
      idNumber: idNumber,
      birthDate: birthDate
    });
  } catch (error) {
    console.error('Local OCR Error:', error);
    res.status(500).json({ error: '本地识别失败，请尝试拍照更清晰' });
  }
});

app.get('/api/config', (req, res) => {
  const config = db.prepare('SELECT * FROM config WHERE id = 1').get();
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { title, description, bg_image, show_transport, show_pickup, pickup_locations, max_companions, start_date, end_date, max_registrations, min_age, max_age } = req.body;
  db.prepare(`
    UPDATE config SET 
      title = ?, description = ?, bg_image = ?, 
      show_transport = ?, show_pickup = ?, 
      pickup_locations = ?, max_companions = ?,
      start_date = ?, end_date = ?, max_registrations = ?,
      min_age = ?, max_age = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(title, description, bg_image, show_transport ? 1 : 0, show_pickup ? 1 : 0, pickup_locations, max_companions, start_date, end_date, max_registrations, min_age, max_age);
  res.json({ success: true });
});

app.post('/api/enroll', (req, res) => {
  const { 
    name, id_type, id_number, phone, birth_date, gender, remarks,
    transport_type, car_number, pickup_location, luggage_confirmed,
    companions 
  } = req.body;

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO entries (
        name, id_type, id_number, phone, birth_date, gender, remarks,
        transport_type, car_number, pickup_location, luggage_confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, id_type, id_number, phone, birth_date, gender, remarks || '', transport_type, car_number, pickup_location, luggage_confirmed ? 1 : 0);

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
      '证件类型': entry.id_type,
      '证件号': entry.id_number,
      '手机号': entry.phone,
      '出生日期': entry.birth_date,
      '交通方式': entry.transport_type,
      '车牌号': entry.car_number || '无',
      '上车地点': entry.pickup_location,
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
